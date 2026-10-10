import express from 'express';
import { prisma } from '../prisma.js';
import { generateReplayIntelligence } from '../analytics/replayIntelligence.js';

const router = express.Router();

// POST /api/analytics/replay - Run Replay Intelligence on match logs
router.post('/replay', (req, res) => {
  try {
    const { answerLogs, totalQuestions } = req.body;
    const insights = generateReplayIntelligence({ answerLogs, totalQuestions });
    res.json({ success: true, data: insights });
  } catch (err) {
    console.error('Error generating replay intelligence:', err);
    res.status(500).json({ success: false, error: 'Failed to generate insights' });
  }
});

// GET /api/analytics/:userId - Comprehensive player performance analytics (PRD Section 13)
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Find user by ID or guestToken
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: userId }, { guestToken: userId }]
      },
      include: {
        college: true,
        playerScores: {
          include: {
            session: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const scores = user.playerScores || [];
    const gamesPlayed = scores.length;

    let totalPoints = 0;
    let highestScore = 0;
    let totalCorrect = 0;
    let totalQuestions = 0;
    let totalSpeedMs = 0;
    const allAnswerLogs = [];

    scores.forEach(s => {
      totalPoints += s.totalScore;
      if (s.totalScore > highestScore) highestScore = s.totalScore;
      totalCorrect += s.correctCount;
      totalQuestions += s.totalAnswered;
      totalSpeedMs += s.speedAvgMs;

      if (Array.isArray(s.answerLogs)) {
        allAnswerLogs.push(...s.answerLogs);
      }
    });

    const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const avgScore = gamesPlayed > 0 ? Math.round(totalPoints / gamesPlayed) : 0;
    const avgSpeedSeconds = gamesPlayed > 0 ? ((totalSpeedMs / gamesPlayed) / 1000).toFixed(1) : '0.0';

    // Topic-wise breakdown (Quant, Logic, Verbal, DI)
    const topicBreakdown = {
      'Quantitative': { total: 0, correct: 0, accuracy: 0 },
      'Logical Reasoning': { total: 0, correct: 0, accuracy: 0 },
      'Verbal Ability': { total: 0, correct: 0, accuracy: 0 },
      'Data Interpretation': { total: 0, correct: 0, accuracy: 0 }
    };

    allAnswerLogs.forEach(ans => {
      const topic = ans.topic;
      if (topicBreakdown[topic]) {
        topicBreakdown[topic].total++;
        if (ans.isCorrect) topicBreakdown[topic].correct++;
      }
    });

    Object.keys(topicBreakdown).forEach(t => {
      const item = topicBreakdown[t];
      item.accuracy = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0;
    });

    // Run Replay Intelligence across user history
    const historicalReplay = generateReplayIntelligence({
      answerLogs: allAnswerLogs,
      totalQuestions
    });

    res.json({
      success: true,
      data: {
        userId: user.id,
        displayName: user.displayName,
        college: user.college ? user.college.name : null,
        metrics: {
          gamesPlayed,
          totalPoints,
          highestScore,
          avgScore,
          overallAccuracy,
          avgSpeedSeconds
        },
        topicBreakdown,
        replayIntelligence: historicalReplay,
        recentSessions: scores.slice(0, 5).map(s => ({
          sessionId: s.sessionId,
          date: s.createdAt,
          score: s.totalScore,
          correct: s.correctCount,
          total: s.totalAnswered
        }))
      }
    });
  } catch (err) {
    console.error('Error fetching user analytics:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

export default router;
