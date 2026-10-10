import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  ArrowRight, 
  AlertCircle,
  Zap,
  BookOpen
} from 'lucide-react';

export default function SoloPracticeModal({ isOpen, onClose, onStartSoloGame }) {
  const [topic, setTopic] = useState('Quantitative');
  const [subTopic, setSubTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const quickTopics = {
    'Quantitative': ['Percentages', 'Time & Work', 'Speed & Distance', 'Profit & Loss', 'Probability'],
    'Logical Reasoning': ['Syllogisms', 'Blood Relations', 'Seating Arrangement', 'Number Series', 'Coding Decoding'],
    'Verbal Ability': ['Reading Comprehension', 'Sentence Correction', 'Synonyms & Antonyms', 'Para Jumbles'],
    'Data Interpretation': ['Bar Charts', 'Pie Charts', 'Table Analysis', 'Line Graphs']
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          subTopic: subTopic.trim() || undefined,
          difficulty,
          count
        })
      });

      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        onStartSoloGame({
          topic,
          subTopic: subTopic.trim() || 'Comprehensive',
          difficulty,
          questions: data.data
        });
        onClose();
      } else {
        setError(data.error || 'Failed to generate quiz. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Network error generating quiz');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="relative w-full max-w-lg bg-[#0c272e] border border-[#143a43] rounded-2xl shadow-2xl p-6 sm:p-7 overflow-hidden animate-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#143a43]">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Practise solo
              <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                AI Generated
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Instant adaptive quiz with solutions and mistake-to-mastery review.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#11343c] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Main Topic */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Topic
            </label>
            <select
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                setSubTopic('');
              }}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#081d22] border border-[#17434d] text-white focus:outline-none focus:border-amber-400 transition"
            >
              <option value="Quantitative" className="bg-[#081d22]">Quantitative Aptitude</option>
              <option value="Logical Reasoning" className="bg-[#081d22]">Logical Reasoning</option>
              <option value="Verbal Ability" className="bg-[#081d22]">Verbal Ability</option>
              <option value="Data Interpretation" className="bg-[#081d22]">Data Interpretation</option>
            </select>
          </div>

          {/* Quick Sub-Topic Chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Sub-Topic (Pick or type your own)
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(quickTopics[topic] || []).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSubTopic(t)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                    subTopic === t
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                      : 'bg-[#081d22] border-[#143a43] text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={subTopic}
              onChange={(e) => setSubTopic(e.target.value)}
              placeholder="e.g. Permutations, Blood Relations, or leave blank for mixed"
              className="w-full text-xs px-3.5 py-2 rounded-xl bg-[#081d22] border border-[#17434d] text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          {/* Difficulty & Count */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl bg-[#081d22] border border-[#17434d] text-white focus:outline-none focus:border-amber-400 transition"
              >
                <option value="Easy" className="bg-[#081d22]">Easy</option>
                <option value="Medium" className="bg-[#081d22]">Medium</option>
                <option value="Hard" className="bg-[#081d22]">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Number of Questions
              </label>
              <select
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value, 10))}
                className="w-full text-xs px-3 py-2.5 rounded-xl bg-[#081d22] border border-[#17434d] text-white focus:outline-none focus:border-amber-400 transition"
              >
                <option value={3} className="bg-[#081d22]">3 Questions (Quick)</option>
                <option value={5} className="bg-[#081d22]">5 Questions (Standard)</option>
                <option value={10} className="bg-[#081d22]">10 Questions (Full Drill)</option>
              </select>
            </div>
          </div>

          {/* Practice Perks */}
          <div className="p-3 rounded-xl bg-[#081d22] border border-[#143a43] text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Instant step-by-step logic after each question</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full Replay Intelligence error breakdown when finished</span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="btn-petrol"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-amber flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? 'AI generating quiz...' : 'Start solo practice'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
