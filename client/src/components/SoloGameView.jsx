import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import ReplayIntelligenceModal from './ReplayIntelligenceModal';
import { 
  Timer, 
  CheckCircle2, 
  XCircle, 
  BookOpen, 
  ArrowRight, 
  Home, 
  RotateCcw,
  BrainCircuit,
  Zap
} from 'lucide-react';

export default function SoloGameView({ session, onReturnHome, onPlayAgain }) {
  const { topic, subTopic, difficulty, questions = [] } = session;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [roundPoints, setRoundPoints] = useState(0);

  // Timer per question (25 seconds)
  const TOTAL_TIME = 25;
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);

  // History tracking for Replay Intelligence & device stats
  const [answerLogs, setAnswerLogs] = useState([]);
  const [isGameOver, setIsGameOver] = useState(false);

  // Replay Intelligence Modal
  const [showReplayModal, setShowReplayModal] = useState(false);
  const [replayData, setReplayData] = useState(null);
  const [replayLoading, setReplayLoading] = useState(false);

  const currentQ = questions[currentIndex];
  const timerRef = useRef(null);

  useEffect(() => {
    // Reset timer on question change
    setTimeLeft(TOTAL_TIME);
    setSelectedOptionId(null);
    setIsSubmitted(false);
    setRoundPoints(0);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex]);

  const handleTimeOut = () => {
    if (isSubmitted) return;
    setIsSubmitted(true);
    recordAnswer(null, false, 0, TOTAL_TIME * 1000);
  };

  const handleSelectOption = (optId) => {
    if (isSubmitted) return;

    if (timerRef.current) clearInterval(timerRef.current);
    setSelectedOptionId(optId);
    setIsSubmitted(true);

    const isCorrect = optId === currentQ.correctOptionId;
    const timeTakenMs = (TOTAL_TIME - timeLeft) * 1000;

    // Formula: 100 base + speed bonus up to 100
    let points = 0;
    if (isCorrect) {
      const speedBonus = Math.ceil((timeLeft / TOTAL_TIME) * 100);
      points = 100 + speedBonus;
      setScore(prev => prev + points);
    }
    setRoundPoints(points);

    recordAnswer(optId, isCorrect, points, timeTakenMs);
  };

  const recordAnswer = (optId, isCorrect, earnedPoints, timeTakenMs) => {
    const selectedText = currentQ.options.find(o => o.id === optId)?.text || 'Timed out / Unanswered';
    const correctText = currentQ.options.find(o => o.id === currentQ.correctOptionId)?.text || 'Correct Option';

    setAnswerLogs(prev => [
      ...prev,
      {
        questionId: currentQ.id || `q-${currentIndex + 1}`,
        questionText: currentQ.text,
        topic: currentQ.topic || topic,
        subTopic: currentQ.subTopic || subTopic,
        difficulty: currentQ.difficulty || difficulty,
        explanation: currentQ.explanation,
        isCorrect,
        responseDurationMs: timeTakenMs,
        selectedOptionText: selectedText,
        correctOptionText: correctText
      }
    ]);
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      finishGame();
    }
  };

  const finishGame = () => {
    setIsGameOver(true);

    // Update device stats in localStorage
    try {
      const saved = localStorage.getItem('aptiquiz_device_stats');
      const stats = saved ? JSON.parse(saved) : { level: 1, xp: 55, maxXp: 300, streak: 1, bestScore: 0, matches: 0 };
      
      const newScore = score + roundPoints;
      const newXp = stats.xp + 45;
      let newLevel = stats.level;
      let newMaxXp = stats.maxXp;

      if (newXp >= newMaxXp) {
        newLevel += 1;
        newMaxXp += 200;
      }

      const updated = {
        level: newLevel,
        xp: newXp,
        maxXp: newMaxXp,
        streak: stats.streak || 1,
        bestScore: Math.max(stats.bestScore || 0, newScore),
        matches: (stats.matches || 0) + 1
      };

      localStorage.setItem('aptiquiz_device_stats', JSON.stringify(updated));
    } catch (e) {}

    // Confetti on good score
    try {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    } catch (e) {}
  };

  const handleOpenReplay = async () => {
    setReplayLoading(true);
    try {
      const res = await fetch('/api/analytics/replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalQuestions: answerLogs.length,
          answerLogs
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

  // -----------------------------------------------------------------
  // VIEW: GAME OVER SCREEN
  // -----------------------------------------------------------------
  if (isGameOver) {
    const totalQ = questions.length;
    const correctCount = answerLogs.filter(a => a.isCorrect).length;
    const accuracy = Math.round((correctCount / totalQ) * 100);

    return (
      <div className="max-w-2xl mx-auto w-full px-4 py-8 flex flex-col gap-6 text-center animate-fade-in">
        <div>
          <span className="text-xs px-2.5 py-0.5 rounded bg-[#081d22] border border-[#17434d] text-amber-400 font-medium">
            Solo Practice Complete
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2">
            Practice Performance Summary
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {topic} &bull; {subTopic} ({difficulty})
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="petrol-card p-4 rounded-xl text-center">
            <span className="text-[11px] text-slate-400">Total Score</span>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">{score}</div>
          </div>
          <div className="petrol-card p-4 rounded-xl text-center">
            <span className="text-[11px] text-slate-400">Accuracy</span>
            <div className={`text-xl font-bold font-mono mt-1 ${
              accuracy >= 70 ? 'text-emerald-400' : accuracy >= 40 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {accuracy}%
            </div>
          </div>
          <div className="petrol-card p-4 rounded-xl text-center">
            <span className="text-[11px] text-slate-400">Correct Qs</span>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {correctCount} / {totalQ}
            </div>
          </div>
          <div className="petrol-card p-4 rounded-xl text-center">
            <span className="text-[11px] text-slate-400">XP Earned</span>
            <div className="text-xl font-bold font-mono text-cyan-400 mt-1">+45 XP</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <button
            onClick={handleOpenReplay}
            disabled={replayLoading}
            className="btn-amber flex items-center gap-1.5"
          >
            <BrainCircuit className="w-4 h-4" />
            <span>{replayLoading ? 'Analyzing...' : 'Replay Intelligence Review'}</span>
          </button>

          <button
            onClick={onPlayAgain}
            className="btn-petrol flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Practise Another Topic</span>
          </button>

          <button
            onClick={onReturnHome}
            className="btn-petrol flex items-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Dashboard</span>
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

  // -----------------------------------------------------------------
  // VIEW: ACTIVE QUESTION SCREEN
  // -----------------------------------------------------------------
  const isCorrectAnswer = selectedOptionId === currentQ.correctOptionId;
  const timeProgress = (timeLeft / TOTAL_TIME) * 100;

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-6 flex flex-col gap-4 animate-fade-in">
      {/* Top Banner & Timer */}
      <div className="petrol-card p-4 rounded-xl">
        <div className="flex items-center justify-between mb-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-[#081d22] text-amber-400 font-bold font-mono">
              Q{currentIndex + 1} of {questions.length}
            </span>
            <span className="text-xs text-slate-300 font-medium">
              {currentQ.subTopic || subTopic}
            </span>
            <span className="text-[10px] px-2 py-0.2 rounded bg-[#081d22] text-slate-400 border border-[#143a43]">
              {currentQ.difficulty || difficulty}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-mono font-bold text-amber-400">
              Score: {score}
            </div>
            <div className="flex items-center gap-1 font-mono text-xs font-bold">
              <Timer className="w-3.5 h-3.5 text-amber-400" />
              <span className={timeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-slate-200'}>
                {timeLeft}s
              </span>
            </div>
          </div>
        </div>

        {/* Timer Countdown Bar */}
        <div className="w-full h-1.5 bg-[#081d22] rounded-full overflow-hidden border border-[#143a43]">
          <div 
            className={`h-full transition-all duration-300 ${
              timeLeft > 10 ? 'bg-amber-400' : 'bg-rose-500 animate-pulse'
            }`}
            style={{ width: `${timeProgress}%` }}
          ></div>
        </div>
      </div>

      {/* Question Card */}
      <div className="petrol-card p-6 sm:p-7 rounded-2xl">
        <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed">
          {currentQ.text}
        </h2>
      </div>

      {/* 4 Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {currentQ.options.map((opt, idx) => {
          const isSelected = selectedOptionId === opt.id;
          const isCorrect = opt.id === currentQ.correctOptionId;
          const letters = ['A', 'B', 'C', 'D'];

          let buttonStyle = 'bg-[#0c272e] border-[#143a43] text-slate-100 hover:border-amber-400/50';

          if (isSubmitted) {
            if (isCorrect) {
              buttonStyle = 'bg-[#0b3327] border-emerald-500 text-white font-medium ring-1 ring-emerald-500/50';
            } else if (isSelected && !isCorrect) {
              buttonStyle = 'bg-[#331118] border-rose-500 text-rose-200';
            } else {
              buttonStyle = 'bg-[#081d22] border-[#143a43] opacity-50 text-slate-400';
            }
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleSelectOption(opt.id)}
              disabled={isSubmitted}
              className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition ${buttonStyle}`}
            >
              <div className="flex items-center space-x-3">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                  isSubmitted && isCorrect ? 'bg-emerald-500 text-slate-950 font-black' :
                  isSubmitted && isSelected ? 'bg-rose-500 text-white' :
                  'bg-[#081d22] text-slate-300 border border-[#17434d]'
                }`}>
                  {letters[idx] || (idx + 1)}
                </span>
                <span className="text-xs sm:text-sm font-medium leading-snug">
                  {opt.text}
                </span>
              </div>

              {isSubmitted && isCorrect && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              )}
              {isSubmitted && isSelected && !isCorrect && (
                <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Answer Explanation & Next Button */}
      {isSubmitted && (
        <div className="petrol-card p-4 rounded-xl space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isCorrectAnswer ? (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Correct (+{roundPoints} pts)
                </span>
              ) : (
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                  <XCircle className="w-4 h-4" /> Incorrect (0 pts)
                </span>
              )}
            </div>

            <button
              onClick={handleNext}
              className="btn-amber flex items-center gap-1.5"
            >
              <span>{currentIndex + 1 < questions.length ? 'Next Question' : 'View Results'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {currentQ.explanation && (
            <div className="pt-2 border-t border-[#143a43] text-xs text-slate-300 leading-relaxed">
              <span className="font-semibold text-amber-400">Step-by-step logic: </span>
              {currentQ.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
