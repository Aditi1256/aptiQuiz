import { prisma } from '../prisma.js';

export class GameState {
  constructor({ room, io }) {
    this.room = room;
    this.io = io;
    this.questions = [];
    this.currentQuestionIndex = -1;
    this.activeQuestion = null;
    this.roundDurationMs = 20000; // 20 seconds per question
    this.evaluationDurationMs = 6000; // 6 seconds for leaderboard review
    this.roundExpiresAt = null;
    this.roundTimer = null;
    this.answers = new Map(); // playerId -> { selectedOptionId, receivedAt, isCorrect, pointsEarned, timeRemainingMs }
    this.scores = new Map(); // playerId -> totalScore
    this.cumulativeSpeedMs = new Map(); // playerId -> total response time (for tie-breaking)
    this.previousRanks = new Map(); // playerId -> rank (for delta calculation)
    this.roundLogs = []; // Stores complete logs for Replay Intelligence (Section 5)
  }

  // Load questions for the room's question set
  async initialize() {
    const questionSet = await prisma.questionSet.findUnique({
      where: { id: this.room.questionSetId },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (!questionSet || questionSet.questions.length === 0) {
      throw new Error('Question set has no questions to play.');
    }

    this.questions = questionSet.questions;

    // Initialize player score maps
    for (const player of this.room.players.values()) {
      this.scores.set(player.id, 0);
      this.cumulativeSpeedMs.set(player.id, 0);
      this.previousRanks.set(player.id, 1);
    }
  }

  // Start the entire match
  start() {
    this.room.status = 'STARTING';
    this.io.to(this.room.roomCode).emit('game_starting', {
      countdownSeconds: 3,
      totalQuestions: this.questions.length
    });

    console.log(`[Game] Room ${this.room.roomCode} starting in 3 seconds...`);
    setTimeout(() => {
      this.nextQuestion();
    }, 3000);
  }

  // Transition to next question
  nextQuestion() {
    this.currentQuestionIndex++;

    if (this.currentQuestionIndex >= this.questions.length) {
      this.finishGame();
      return;
    }

    this.room.status = 'QUESTION_ACTIVE';
    this.activeQuestion = this.questions[this.currentQuestionIndex];
    this.answers.clear();

    const now = Date.now();
    this.roundExpiresAt = now + this.roundDurationMs;

    // PRD NR-05 & Anti-Cheat: Shuffled options per player session
    for (const player of this.room.players.values()) {
      if (player.socketId) {
        const shuffledOptions = this.shuffleArray([...this.activeQuestion.options]);
        
        // Anti-Cheat: Withhold correctOptionId and correct flags until round evaluation
        this.io.to(player.socketId).emit('question_active', {
          questionIndex: this.currentQuestionIndex,
          totalQuestions: this.questions.length,
          questionId: this.activeQuestion.id,
          text: this.activeQuestion.text,
          topic: this.activeQuestion.topic,
          subTopic: this.activeQuestion.subTopic,
          difficulty: this.activeQuestion.difficulty,
          options: shuffledOptions,
          durationMs: this.roundDurationMs,
          expiresAt: this.roundExpiresAt
        });
      }
    }

    console.log(`[Game] Room ${this.room.roomCode} Q${this.currentQuestionIndex + 1}/${this.questions.length} active. Expires in ${this.roundDurationMs}ms`);

    // Set server-authoritative timer
    if (this.roundTimer) clearTimeout(this.roundTimer);
    this.roundTimer = setTimeout(() => {
      this.evaluateRound();
    }, this.roundDurationMs);
  }

  // Submit Answer from a player
  submitAnswer({ playerId, questionId, selectedOptionId }) {
    const serverReceivedAt = Date.now();

    if (this.room.status !== 'QUESTION_ACTIVE' || !this.activeQuestion) {
      return { success: false, error: 'Question is not currently active' };
    }

    if (this.activeQuestion.id !== questionId) {
      return { success: false, error: 'Invalid question ID' };
    }

    // 250ms Bounded TCP grace period (PRD Section 14)
    if (serverReceivedAt > this.roundExpiresAt + 250) {
      return { success: false, error: 'Submission rejected: Round timer expired' };
    }

    // Anti-Cheat: Reject duplicate submissions in same round
    if (this.answers.has(playerId)) {
      return { success: false, error: 'Duplicate submission rejected' };
    }

    const timeRemainingMs = Math.max(0, this.roundExpiresAt - serverReceivedAt);
    const isCorrect = selectedOptionId === this.activeQuestion.correctOptionId;

    // PRD FR-04 Speed-and-Accuracy Scoring Formula:
    // Score = BasePoints + ceil((TimeRemaining / TotalTime) * TimeBonusMax)
    // BasePoints = 100, TimeBonusMax = 100. Incorrect = 0.
    let pointsEarned = 0;
    if (isCorrect) {
      const timeFraction = timeRemainingMs / this.roundDurationMs;
      const speedBonus = Math.ceil(timeFraction * 100);
      pointsEarned = 100 + speedBonus; // 100 - 200 points
    }

    const responseDurationMs = this.roundDurationMs - timeRemainingMs;
    const currentCumulative = this.cumulativeSpeedMs.get(playerId) || 0;
    this.cumulativeSpeedMs.set(playerId, currentCumulative + responseDurationMs);

    this.answers.set(playerId, {
      selectedOptionId,
      receivedAt: serverReceivedAt,
      isCorrect,
      pointsEarned,
      timeRemainingMs,
      responseDurationMs
    });

    console.log(`[Game] Answer from player ${playerId}: correct=${isCorrect}, pts=${pointsEarned}, timeRem=${timeRemainingMs}ms`);

    // If all active connected players have submitted, evaluate round early without waiting for full timer
    const activePlayerCount = Array.from(this.room.players.values()).filter(p => !p.isDisconnected).length;
    if (this.answers.size >= activePlayerCount) {
      if (this.roundTimer) clearTimeout(this.roundTimer);
      // Small 300ms pause for smoother animation transition
      setTimeout(() => {
        this.evaluateRound();
      }, 300);
    }

    return { success: true, pointsEarned, isCorrect };
  }

  // Evaluate Round & Broadcast Results
  evaluateRound() {
    if (this.room.status === 'ROUND_EVALUATION') return;
    this.room.status = 'ROUND_EVALUATION';

    // 1. Update total scores
    for (const [playerId, answer] of this.answers.entries()) {
      const currentScore = this.scores.get(playerId) || 0;
      this.scores.set(playerId, currentScore + answer.pointsEarned);

      // Update in player obj too
      const p = this.room.players.get(playerId);
      if (p) p.score = this.scores.get(playerId);
    }

    // 2. Compute sorted leaderboard & rank deltas (PRD FR-05)
    // Ties resolved by cumulative prior speed (least total response time)
    const leaderboard = Array.from(this.room.players.values()).map(player => {
      const totalScore = this.scores.get(player.id) || 0;
      const roundAnswer = this.answers.get(player.id);
      const cumulativeSpeed = this.cumulativeSpeedMs.get(player.id) || 0;

      return {
        playerId: player.id,
        displayName: player.displayName,
        isHost: player.isHost,
        totalScore,
        roundPoints: roundAnswer ? roundAnswer.pointsEarned : 0,
        isCorrect: roundAnswer ? roundAnswer.isCorrect : false,
        selectedOptionId: roundAnswer ? roundAnswer.selectedOptionId : null,
        cumulativeSpeed
      };
    }).sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return a.cumulativeSpeed - b.cumulativeSpeed; // Lower speed ms wins tie
    });

    // Assign ranks and calculate rank deltas (↑, ↓, ⇄)
    const formattedLeaderboard = leaderboard.map((item, index) => {
      const currentRank = index + 1;
      const prevRank = this.previousRanks.get(item.playerId) || currentRank;
      let delta = 'same';
      let deltaAmount = 0;

      if (currentRank < prevRank) {
        delta = 'up';
        deltaAmount = prevRank - currentRank;
      } else if (currentRank > prevRank) {
        delta = 'down';
        deltaAmount = currentRank - prevRank;
      }

      this.previousRanks.set(item.playerId, currentRank);

      return {
        ...item,
        rank: currentRank,
        delta,
        deltaAmount
      };
    });

    // 3. Record round log for Replay Intelligence (Section 5)
    this.roundLogs.push({
      questionIndex: this.currentQuestionIndex,
      questionId: this.activeQuestion.id,
      questionText: this.activeQuestion.text,
      topic: this.activeQuestion.topic,
      subTopic: this.activeQuestion.subTopic,
      difficulty: this.activeQuestion.difficulty,
      correctOptionId: this.activeQuestion.correctOptionId,
      explanation: this.activeQuestion.explanation,
      playerAnswers: Array.from(this.answers.entries()).map(([pId, ans]) => ({
        playerId: pId,
        displayName: this.room.players.get(pId)?.displayName,
        ...ans
      }))
    });

    // 4. Broadcast round_result with correctOptionId and leaderboard (PRD Section 13)
    this.io.to(this.room.roomCode).emit('round_result', {
      questionIndex: this.currentQuestionIndex,
      totalQuestions: this.questions.length,
      correctOptionId: this.activeQuestion.correctOptionId,
      explanation: this.activeQuestion.explanation,
      leaderboard: formattedLeaderboard,
      nextInMs: this.evaluationDurationMs
    });

    console.log(`[Game] Room ${this.room.roomCode} Q${this.currentQuestionIndex + 1} evaluated. Correct: ${this.activeQuestion.correctOptionId}`);

    // Schedule next question or finish
    this.roundTimer = setTimeout(() => {
      this.nextQuestion();
    }, this.evaluationDurationMs);
  }

  // Finish Match and save to DB
  async finishGame() {
    this.room.status = 'GAME_OVER';

    // Compute final analytics
    const finalLeaderboard = Array.from(this.room.players.values()).map(player => {
      const totalScore = this.scores.get(player.id) || 0;
      const answersForPlayer = this.roundLogs.flatMap(r => r.playerAnswers.filter(a => a.playerId === player.id));
      const correctCount = answersForPlayer.filter(a => a.isCorrect).length;
      const totalAnswered = answersForPlayer.length;
      const accuracy = this.questions.length > 0 ? Math.round((correctCount / this.questions.length) * 100) : 0;
      const avgSpeedMs = totalAnswered > 0 
        ? Math.round(answersForPlayer.reduce((s, a) => s + a.responseDurationMs, 0) / totalAnswered)
        : 0;

      return {
        playerId: player.id,
        displayName: player.displayName,
        isHost: player.isHost,
        collegeId: player.collegeId,
        totalScore,
        correctCount,
        totalQuestions: this.questions.length,
        accuracy,
        avgSpeedSeconds: (avgSpeedMs / 1000).toFixed(1),
        cumulativeSpeed: this.cumulativeSpeedMs.get(player.id) || 0
      };
    }).sort((a, b) => b.totalScore - a.totalScore)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    // Persist Session & Player Scores to PostgreSQL (PRD Section 12)
    try {
      const session = await prisma.gameSession.create({
        data: {
          roomId: this.room.id,
          totalRounds: this.questions.length,
          endedAt: new Date(),
          playerScores: {
            create: finalLeaderboard.map(p => ({
              userId: p.playerId,
              totalScore: p.totalScore,
              correctCount: p.correctCount,
              totalAnswered: this.questions.length,
              speedAvgMs: parseFloat(p.avgSpeedSeconds) * 1000,
              answerLogs: this.roundLogs.map(r => {
                const ans = r.playerAnswers.find(a => a.playerId === p.playerId);
                return {
                  questionId: r.questionId,
                  topic: r.topic,
                  subTopic: r.subTopic,
                  isCorrect: ans ? ans.isCorrect : false,
                  pointsEarned: ans ? ans.pointsEarned : 0,
                  responseDurationMs: ans ? ans.responseDurationMs : this.roundDurationMs
                };
              })
            }))
          }
        }
      });

      console.log(`[Game] Persisted GameSession ${session.id} to PostgreSQL`);

      // Accumulate College League Points (PRD FR-07)
      for (const p of finalLeaderboard) {
        if (p.collegeId && p.totalScore > 0) {
          await prisma.college.update({
            where: { id: p.collegeId },
            data: { totalScore: { increment: p.totalScore } }
          }).catch(e => console.error('[Game] Error incrementing college score:', e.message));
        }
      }
    } catch (err) {
      console.error('[Game] Error saving game session to DB:', err);
    }

    this.io.to(this.room.roomCode).emit('game_over', {
      finalLeaderboard,
      roundLogs: this.roundLogs
    });

    console.log(`[Game] Room ${this.room.roomCode} GAME_OVER. Final standings broadcasted.`);
  }

  // Utility: Fisher-Yates array shuffle for option shuffling (PRD NR-05)
  shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
