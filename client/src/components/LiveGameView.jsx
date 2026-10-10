import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../services/socket';
import confetti from 'canvas-confetti';
import ReplayIntelligenceModal from './ReplayIntelligenceModal';
import { 
  Timer, 
  CheckCircle2, 
  XCircle, 
  Award, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Zap, 
  Crown, 
  BookOpen, 
  Home, 
  BrainCircuit
} from 'lucide-react';

export default function LiveGameView({ room, currentUser, onReturnHome }) {
  // Game states: 'STARTING' | 'QUESTION_ACTIVE' | 'ROUND_EVALUATION' | 'GAME_OVER'
  const [gameState, setGameState] = useState('STARTING');
  const [startCountdown, setStartCountdown] = useState(3);

  // Active question payload
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(20);
  const [timeProgressPercent, setTimeProgressPercent] = useState(100);

  // Round evaluation payload
  const [roundResult, setRoundResult] = useState(null);
  const [myRoundEarned, setMyRoundEarned] = useState(null);
  const [evalNextSeconds, setEvalNextSeconds] = useState(6);

  // Game over payload
  const [gameOverData, setGameOverData] = useState(null);

  // Replay Intelligence Modal State
  const [showReplayModal, setShowReplayModal] = useState(false);
  const [replayData, setReplayData] = useState(null);
  const [replayLoading, setReplayLoading] = useState(false);

  const timerIntervalRef = useRef(null);

  useEffect(() => {
    function onGameStarting({ countdownSeconds }) {
      setGameState('STARTING');
      setStartCountdown(countdownSeconds || 3);
    }

    function onQuestionActive(payload) {
      setGameState('QUESTION_ACTIVE');
      setActiveQuestion(payload);
      setSelectedOptionId(null);
      setIsAnswerLocked(false);
      setRoundResult(null);

      startSynchronizedTimer(payload.expiresAt, payload.durationMs);
    }

    function onRoundResult(payload) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      setGameState('ROUND_EVALUATION');
      setRoundResult(payload);

      const myStat = payload.leaderboard.find(p => p.playerId === currentUser?.id);
      if (myStat) {
        setMyRoundEarned({
          points: myStat.roundPoints,
          isCorrect: myStat.isCorrect
        });
      }

      let nextLeft = Math.ceil((payload.nextInMs || 6000) / 1000);
      setEvalNextSeconds(nextLeft);
      const evalInterval = setInterval(() => {
        nextLeft--;
        setEvalNextSeconds(Math.max(0, nextLeft));
        if (nextLeft <= 0) clearInterval(evalInterval);
      }, 1000);
    }

    function onGameOver(payload) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setGameState('GAME_OVER');
      setGameOverData(payload);

      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    }

    socket.on('game_starting', onGameStarting);
    socket.on('question_active', onQuestionActive);
    socket.on('round_result', onRoundResult);
    socket.on('game_over', onGameOver);

    return () => {
      socket.off('game_starting', onGameStarting);
      socket.off('question_active', onQuestionActive);
      socket.off('round_result', onRoundResult);
      socket.off('game_over', onGameOver);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [currentUser]);

  const startSynchronizedTimer = (expiresAt, totalDurationMs) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    const updateTimer = () => {
      const now = Date.now();
      const remainingMs = Math.max(0, expiresAt - now);
      const remSec = Math.ceil(remainingMs / 1000);
      const progress = (remainingMs / totalDurationMs) * 100;

      setTimeRemainingSeconds(remSec);
      setTimeProgressPercent(progress);

      if (remainingMs <= 0) {
        clearInterval(timerIntervalRef.current);
      }
    };

    updateTimer();
    timerIntervalRef.current = setInterval(updateTimer, 100);
  };

  const handleSelectOption = (optionId) => {
    if (isAnswerLocked || gameState !== 'QUESTION_ACTIVE') return;

    setSelectedOptionId(optionId);
    setIsAnswerLocked(true);

    socket.emit('submit_answer', {
      roomCode: room.roomCode,
      questionId: activeQuestion.questionId,
      selectedOptionId: optionId
    }, (res) => {
      if (res?.success) {
        setMyRoundEarned({
          points: res.pointsEarned,
          isCorrect: res.isCorrect
        });
      }
    });
  };

  const handleOpenReplay = async () => {
    setReplayLoading(true);
    try {
      const myAnswers = (gameOverData?.roundLogs || []).map(r => {
        const ans = r.playerAnswers?.find(a => a.playerId === currentUser?.id);
        return {
          questionId: r.questionId,
          questionText: r.questionText,
          topic: r.topic,
          subTopic: r.subTopic,
          difficulty: r.difficulty,
          explanation: r.explanation,
          isCorrect: ans ? ans.isCorrect : false,
          responseDurationMs: ans ? ans.responseDurationMs : 20000,
          selectedOptionText: ans ? `Option ${ans.selectedOptionId}` : 'Unanswered',
          correctOptionText: `Option ${r.correctOptionId}`
        };
      });

      const res = await fetch('/api/analytics/replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalQuestions: myAnswers.length,
          answerLogs: myAnswers
        })
      });

      const d = await res.json();
      if (d.success) {
        setReplayData(d.data);
        setShowReplayModal(true);
      }
    } catch (err) {
      console.error('Failed to generate replay:', err);
    } finally {
      setReplayLoading(false);
    }
  };

  const getTimerBarColor = () => {
    if (timeProgressPercent > 50) return 'bg-emerald-400';
    if (timeProgressPercent > 20) return 'bg-amber-400';
    return 'bg-rose-500 animate-pulse';
  };

  // -------------------------------------------------------------
  // STATE 1: STARTING COUNTDOWN SCREEN
  // -------------------------------------------------------------
  if (gameState === 'STARTING') {
    return (
      <div className="max-w-xl mx-auto w-full px-4 py-16 text-center flex flex-col items-center justify-center animate-fade-in">
        <div className="petrol-card p-10 rounded-2xl w-full flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-[#081d22] border border-[#17434d] text-amber-400 flex items-center justify-center mb-5">
            <Zap className="w-6 h-6" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-1.5">
            Match starting
          </h2>
          <p className="text-xs text-slate-300 mb-8">
            Synchronizing questions across all participants.
          </p>

          <div className="w-20 h-20 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-4xl font-extrabold font-mono shadow-md">
            {startCountdown}
          </div>
          <span className="text-xs text-slate-400 font-medium mt-4 uppercase tracking-widest">
            Get Ready
          </span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STATE 2: ACTIVE QUESTION SCREEN
  // -------------------------------------------------------------
  if (gameState === 'QUESTION_ACTIVE' && activeQuestion) {
    return (
      <div className="max-w-4xl mx-auto w-full px-4 py-6 flex flex-col gap-4 animate-fade-in">
        {/* Top Info & Synchronized Timer Bar */}
        <div className="petrol-card p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-[#081d22] text-amber-400 font-bold font-mono">
                Q{activeQuestion.questionIndex + 1} of {activeQuestion.totalQuestions}
              </span>
              <span className={`px-2 py-0.5 rounded font-medium text-[10px] ${
                activeQuestion.difficulty === 'Easy' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20' :
                activeQuestion.difficulty === 'Hard' ? 'bg-rose-950/60 text-rose-400 border border-rose-500/20' :
                'bg-amber-950/60 text-amber-400 border border-amber-500/20'
              }`}>
                {activeQuestion.difficulty}
              </span>
              {activeQuestion.subTopic && (
                <span className="text-slate-400 hidden sm:inline">
                  &bull; {activeQuestion.subTopic}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-white">
              <Timer className="w-4 h-4 text-amber-400" />
              <span className={timeRemainingSeconds <= 5 ? 'text-rose-400 animate-pulse' : 'text-slate-200'}>
                {timeRemainingSeconds}s
              </span>
            </div>
          </div>

          {/* Synchronized Progress Countdown Bar */}
          <div className="w-full h-2 bg-[#081d22] rounded-full overflow-hidden p-0.5 border border-[#143a43]">
            <div 
              className={`h-full rounded-full transition-all duration-100 ${getTimerBarColor()}`}
              style={{ width: `${Math.max(0, Math.min(100, timeProgressPercent))}%` }}
            ></div>
          </div>
        </div>

        {/* Question Text Box */}
        <div className="petrol-card p-6 sm:p-7 rounded-2xl">
          <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed">
            {activeQuestion.text}
          </h2>
        </div>

        {/* 4 Shuffled Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {activeQuestion.options.map((opt, idx) => {
            const isSelected = selectedOptionId === opt.id;
            const letters = ['A', 'B', 'C', 'D'];

            return (
              <button
                key={opt.id}
                onClick={() => handleSelectOption(opt.id)}
                disabled={isAnswerLocked}
                className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition ${
                  isSelected 
                    ? 'bg-[#10343e] border-amber-400 text-white'
                    : isAnswerLocked
                      ? 'bg-[#081d22] border-[#143a43] opacity-50 cursor-not-allowed text-slate-400'
                      : 'bg-[#0c272e] border-[#143a43] hover:border-amber-400/50 hover:bg-[#0f2e37] text-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                    isSelected 
                      ? 'bg-amber-400 text-slate-950' 
                      : 'bg-[#081d22] text-slate-300 border border-[#17434d]'
                  }`}>
                    {letters[idx] || (idx + 1)}
                  </span>
                  <span className="text-xs sm:text-sm font-medium leading-snug">
                    {opt.text}
                  </span>
                </div>

                {isSelected && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono font-bold">
                    Selected
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Status Notice */}
        <div className="text-center text-xs text-slate-400 py-1">
          {isAnswerLocked ? (
            <span className="text-amber-400 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Answer locked in. Evaluating round results...
            </span>
          ) : (
            <span>Speed bonus: Faster correct answers earn up to 100 extra points.</span>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STATE 3: ROUND EVALUATION & LIVE LEADERBOARD
  // -------------------------------------------------------------
  if (gameState === 'ROUND_EVALUATION' && roundResult) {
    return (
      <div className="max-w-4xl mx-auto w-full px-4 py-6 flex flex-col gap-5 animate-fade-in">
        {/* Banner: Round Performance Summary */}
        <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
          myRoundEarned?.isCorrect 
            ? 'bg-[#0a2e23] border-emerald-500/40' 
            : 'bg-[#2b1016] border-rose-500/40'
        }`}>
          <div className="flex items-center space-x-3.5">
            <div className={`p-2.5 rounded-xl ${
              myRoundEarned?.isCorrect 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-rose-500/20 text-rose-400'
            }`}>
              {myRoundEarned?.isCorrect ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {myRoundEarned?.isCorrect ? 'Correct answer' : 'Incorrect answer'}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {myRoundEarned?.isCorrect 
                  ? `Earned +${myRoundEarned?.points} points (Speed + Base points)`
                  : '0 points this round.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Next question in</span>
            <div className="px-3 py-1 rounded-lg bg-[#081d22] border border-[#143a43] font-mono font-bold text-xs text-amber-400">
              {evalNextSeconds}s
            </div>
          </div>
        </div>

        {/* Explanation */}
        {roundResult.explanation && (
          <div className="petrol-card p-4 rounded-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Solution logic
            </h4>
            <p className="text-xs text-slate-200 leading-relaxed">
              {roundResult.explanation}
            </p>
          </div>
        )}

        {/* Live Leaderboard Table */}
        <div className="petrol-card p-5 rounded-2xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#143a43]">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white">Live match leaderboard</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Round {roundResult.questionIndex + 1} of {roundResult.totalQuestions}
            </span>
          </div>

          <div className="space-y-2">
            {roundResult.leaderboard.map((item) => {
              const isCurrent = item.playerId === currentUser?.id;

              return (
                <div
                  key={item.playerId}
                  className={`p-3 rounded-xl border flex items-center justify-between transition ${
                    isCurrent 
                      ? 'bg-[#10343e] border-amber-500/50' 
                      : 'bg-[#081d22] border-[#143a43]'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    {/* Rank Badge */}
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                      item.rank === 1 ? 'bg-amber-400 text-slate-950 font-black' :
                      item.rank === 2 ? 'bg-slate-300 text-slate-950' :
                      item.rank === 3 ? 'bg-[#9a5b1c] text-white' :
                      'bg-[#0c272e] text-slate-300 border border-[#17434d]'
                    }`}>
                      #{item.rank}
                    </span>

                    {/* Rank Delta Indicator */}
                    <div className="flex items-center">
                      {item.delta === 'up' && (
                        <span className="flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded">
                          <TrendingUp className="w-3 h-3 mr-0.5" /> +{item.deltaAmount}
                        </span>
                      )}
                      {item.delta === 'down' && (
                        <span className="flex items-center text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1 py-0.2 rounded">
                          <TrendingDown className="w-3 h-3 mr-0.5" /> -{item.deltaAmount}
                        </span>
                      )}
                      {item.delta === 'same' && (
                        <span className="flex items-center text-[10px] text-slate-500">
                          <Minus className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    <div className="truncate">
                      <span className="text-xs sm:text-sm font-semibold text-white truncate">
                        {item.displayName}
                      </span>
                      {isCurrent && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold">
                          YOU
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {item.roundPoints > 0 && (
                      <span className="text-xs text-emerald-400 font-mono hidden sm:inline">
                        +{item.roundPoints}
                      </span>
                    )}
                    <span className="text-sm font-bold font-mono text-amber-400">
                      {item.totalScore} <span className="text-[10px] text-slate-400 font-normal">pts</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STATE 4: GAME OVER & PODIUM
  // -------------------------------------------------------------
  if (gameState === 'GAME_OVER' && gameOverData) {
    const finalBoard = gameOverData.finalLeaderboard || [];
    const myFinal = finalBoard.find(p => p.playerId === currentUser?.id);
    const top3 = finalBoard.slice(0, 3);

    return (
      <div className="max-w-4xl mx-auto w-full px-4 py-8 flex flex-col gap-6 text-center animate-fade-in">
        <div>
          <span className="text-xs px-2.5 py-0.5 rounded bg-[#081d22] border border-[#17434d] text-amber-400 font-medium">
            Match finished
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2">
            Final standings & scores
          </h2>
        </div>

        {/* Podium */}
        <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto w-full items-end pt-4">
          {/* 2nd Place */}
          {top3[1] && (
            <div className="petrol-card p-4 rounded-xl flex flex-col items-center">
              <Crown className="w-5 h-5 text-slate-300 mb-1.5" />
              <div className="text-xs font-bold text-white truncate max-w-full">
                {top3[1].displayName}
              </div>
              <div className="text-xs font-mono text-slate-400 font-bold my-1">
                {top3[1].totalScore} pts
              </div>
              <div className="w-full h-14 bg-[#081d22] rounded-lg flex items-center justify-center font-bold text-slate-300 text-base">
                #2
              </div>
            </div>
          )}

          {/* 1st Place */}
          {top3[0] && (
            <div className="petrol-card p-5 rounded-2xl flex flex-col items-center border-amber-500/50 -translate-y-2">
              <Crown className="w-7 h-7 text-amber-400 mb-1.5" />
              <div className="text-xs sm:text-sm font-bold text-white truncate max-w-full">
                {top3[0].displayName}
              </div>
              <div className="text-xs sm:text-sm font-mono text-amber-400 font-bold my-1">
                {top3[0].totalScore} pts
              </div>
              <div className="w-full h-20 bg-[#163a2c] border border-amber-500/30 rounded-xl flex items-center justify-center font-bold text-amber-300 text-xl">
                #1
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {top3[2] && (
            <div className="petrol-card p-4 rounded-xl flex flex-col items-center">
              <Crown className="w-5 h-5 text-[#9a5b1c] mb-1.5" />
              <div className="text-xs font-bold text-white truncate max-w-full">
                {top3[2].displayName}
              </div>
              <div className="text-xs font-mono text-slate-400 font-bold my-1">
                {top3[2].totalScore} pts
              </div>
              <div className="w-full h-10 bg-[#081d22] rounded-lg flex items-center justify-center font-bold text-[#9a5b1c] text-sm">
                #3
              </div>
            </div>
          )}
        </div>

        {/* Personal Summary Card */}
        {myFinal && (
          <div className="petrol-card p-5 rounded-2xl max-w-2xl mx-auto w-full text-left">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Your match summary
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-[#081d22] rounded-xl border border-[#143a43]">
                <span className="text-[11px] text-slate-400">Final rank</span>
                <div className="text-lg font-bold text-white font-mono mt-0.5">#{myFinal.rank}</div>
              </div>
              <div className="p-3 bg-[#081d22] rounded-xl border border-[#143a43]">
                <span className="text-[11px] text-slate-400">Total score</span>
                <div className="text-lg font-bold text-amber-400 font-mono mt-0.5">{myFinal.totalScore}</div>
              </div>
              <div className="p-3 bg-[#081d22] rounded-xl border border-[#143a43]">
                <span className="text-[11px] text-slate-400">Accuracy</span>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{myFinal.accuracy}%</div>
              </div>
              <div className="p-3 bg-[#081d22] rounded-xl border border-[#143a43]">
                <span className="text-[11px] text-slate-400">Avg speed</span>
                <div className="text-lg font-bold text-slate-200 font-mono mt-0.5">{myFinal.avgSpeedSeconds}s</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={handleOpenReplay}
            disabled={replayLoading}
            className="btn-amber flex items-center gap-1.5"
          >
            <BrainCircuit className="w-4 h-4" />
            <span>{replayLoading ? 'Analyzing...' : 'Replay intelligence review'}</span>
          </button>

          <button
            onClick={onReturnHome}
            className="btn-petrol flex items-center gap-1.5"
          >
            <Home className="w-4 h-4" />
            <span>Return to dashboard</span>
          </button>
        </div>

        {/* Replay Intelligence Modal */}
        <ReplayIntelligenceModal
          isOpen={showReplayModal}
          onClose={() => setShowReplayModal(false)}
          data={replayData}
        />
      </div>
    );
  }

  return null;
}
