import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles
} from 'lucide-react';

export default function CollegeLeagueModal({ isOpen, onClose }) {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchStandings();
    }
  }, [isOpen]);

  const fetchStandings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/league/standings');
      const data = await res.json();
      if (data.success) {
        setStandings(data.data.standings || []);
      } else {
        setError(data.error || 'Failed to load standings');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="relative w-full max-w-3xl max-h-[88vh] bg-[#0c272e] border border-[#143a43] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-modal-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#143a43] flex items-center justify-between bg-[#081d22]/40">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Campus league standings
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Aggregated institutional standings across all live quiz battles.
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
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Info callout */}
          <div className="p-3.5 rounded-xl bg-[#081d22] border border-[#17434d] flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                Scores from all live matches automatically contribute to your campus score.
              </span>
            </div>
          </div>

          {/* Standings List */}
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Loading campus standings...
            </div>
          ) : error ? (
            <div className="text-center py-12 text-rose-400 text-xs">
              Error: {error}
            </div>
          ) : standings.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No campus records registered yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {standings.map((col) => {
                const isTop1 = col.rank === 1;
                const isTop2 = col.rank === 2;
                const isTop3 = col.rank === 3;

                return (
                  <div
                    key={col.id}
                    className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isTop1 
                        ? 'bg-[#102d35] border-amber-500/40' 
                        : isTop2
                          ? 'bg-[#0e2c33] border-[#17434d]'
                          : isTop3
                            ? 'bg-[#0d2930] border-[#143a43]'
                            : 'bg-[#081d22] border-[#143a43]'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {/* Rank Indicator */}
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 ${
                        isTop1 ? 'bg-amber-400 text-slate-950 font-black' :
                        isTop2 ? 'bg-slate-300 text-slate-950 font-bold' :
                        isTop3 ? 'bg-[#9a5b1c] text-white font-bold' :
                        'bg-[#12363e] text-slate-300'
                      }`}>
                        #{col.rank}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-white">{col.name}</h4>
                          {col.domain && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#081d22] text-slate-400 font-mono">
                              {col.domain}
                            </span>
                          )}
                        </div>

                        {/* Top contributors */}
                        {col.topContributors && col.topContributors.length > 0 ? (
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 flex-wrap">
                            <span className="text-slate-500">Top participants:</span>
                            {col.topContributors.map((c, i) => (
                              <span key={i} className="text-slate-300">
                                {c.displayName} ({c.contributedPoints} pts){i < col.topContributors.length - 1 ? ',' : ''}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {col.registeredStudents} participants
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Total Score Badge */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#143a43]">
                      <div className="text-right">
                        <div className="font-mono text-base font-bold text-amber-400">
                          {col.totalScore.toLocaleString()}
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                          League points
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
