import React from 'react';
import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  Clock, 
  Target
} from 'lucide-react';

export default function ReplayIntelligenceModal({ isOpen, onClose, data }) {
  if (!isOpen || !data) return null;

  const {
    accuracy = 0,
    totalMistakes = 0,
    totalAnswered = 0,
    weakTopics = [],
    behavioralInsights = [],
    mistakeCards = [],
    recommendedActions = []
  } = data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0c272e] border border-[#143a43] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-modal-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#143a43] flex items-center justify-between bg-[#081d22]/40">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Replay intelligence & analysis
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Post-game cognitive breakdown of mistakes and timing patterns.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#11343c] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Quick Performance Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#081d22] border border-[#143a43] text-center">
              <span className="text-[11px] text-slate-400">Match Accuracy</span>
              <div className={`text-xl font-bold font-mono mt-0.5 ${
                accuracy >= 70 ? 'text-emerald-400' : accuracy >= 40 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {accuracy}%
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#081d22] border border-[#143a43] text-center">
              <span className="text-[11px] text-slate-400">Errors Identified</span>
              <div className="text-xl font-bold font-mono text-rose-400 mt-0.5">
                {totalMistakes} / {totalAnswered}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#081d22] border border-[#143a43] text-center">
              <span className="text-[11px] text-slate-400">Weak Topics Flagged</span>
              <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                {weakTopics.length}
              </div>
            </div>
          </div>

          {/* Weak Topics Callout */}
          {weakTopics.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Detected Weak Sub-Topics (&ge; 2 Errors)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {weakTopics.map((wt, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-[#081d22] border border-[#17434d] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-amber-400">{wt.topicName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-[#0c272e] text-slate-300 border border-[#143a43]">
                          {wt.severity === 'HIGH_PRIORITY' ? 'HIGH PRIORITY' : 'REVIEW'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed mb-2">
                        {wt.advice}
                      </p>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {wt.failureCount} missed of {wt.totalAttempts} attempts ({wt.accuracy}% accuracy)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Behavioral Timing Heuristics */}
          {behavioralInsights.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Pacing & Behavioral Patterns
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {behavioralInsights.map((b, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-[#081d22] border border-[#143a43]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-semibold text-white">{b.title}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {b.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Mistake-to-Mastery Review Cards */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Question Breakdown ({mistakeCards.length} mistakes)
            </h3>

            {mistakeCards.length > 0 ? (
              <div className="space-y-3">
                {mistakeCards.map((m, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-[#081d22] border border-[#143a43] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-[#0c272e] border border-[#17434d] text-rose-400 text-xs font-bold flex items-center justify-center font-mono">
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-slate-200">
                          {m.subTopic}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0c272e] text-slate-400">
                          {m.difficulty}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-100 font-medium">
                      {m.questionText}
                    </p>

                    {/* Answer Comparison */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/30 flex items-center justify-between text-rose-300">
                        <span>Your answer: <strong>{m.selectedOption}</strong></span>
                        <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      </div>
                      <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-emerald-300">
                        <span>Correct answer: <strong>{m.correctOption}</strong></span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="p-2.5 rounded-lg bg-[#0c272e] border border-[#143a43] text-xs text-slate-300 leading-relaxed">
                      <strong className="text-amber-400">Logic:</strong> {m.explanation}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-[#081d22] border border-emerald-500/30 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-white">Flawless Accuracy</h4>
                <p className="text-xs text-slate-400 mt-0.5">Zero mistakes in this game round.</p>
              </div>
            )}
          </div>

          {/* Recommended Practice Plan */}
          {recommendedActions.length > 0 && (
            <div className="p-4 rounded-xl bg-[#081d22] border border-[#17434d]">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                Recommended Focus Areas
              </h4>
              <div className="space-y-1.5">
                {recommendedActions.map((act, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-[#0c272e] border border-[#143a43] text-xs">
                    <span className="text-slate-200">{act.action}</span>
                    <span className="px-2 py-0.5 rounded bg-[#081d22] text-amber-400 font-mono text-[10px]">
                      {act.difficultyFocus}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
