import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Check,
  ArrowRight
} from 'lucide-react';

export default function QuestionBankModal({ isOpen, onClose, onSelectSetForGame }) {
  const [sets, setSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state for creating a new set
  const [showCreateSet, setShowCreateSet] = useState(false);
  const [newSetTitle, setNewSetTitle] = useState('');
  const [newSetDesc, setNewSetDesc] = useState('');
  const [newSetTopic, setNewSetTopic] = useState('Quantitative');

  // Form state for manual question creation
  const [showCreateQuestion, setShowCreateQuestion] = useState(false);
  const [qText, setQText] = useState('');
  const [qSubTopic, setQSubTopic] = useState('');
  const [qDifficulty, setQDifficulty] = useState('Medium');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [opt3, setOpt3] = useState('');
  const [opt4, setOpt4] = useState('');
  const [correctOptIndex, setCorrectOptIndex] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // AI Question Generator for Host state
  const [showAiFinder, setShowAiFinder] = useState(false);
  const [aiSubTopic, setAiSubTopic] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState('Medium');
  const [aiCount, setAiCount] = useState(3);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState([]);
  const [addedIds, setAddedIds] = useState(new Set());

  useEffect(() => {
    if (isOpen) {
      fetchQuestionSets();
    }
  }, [isOpen]);

  const fetchQuestionSets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/question-sets');
      const data = await res.json();
      if (data.success) {
        setSets(data.data);
        if (data.data.length > 0 && !selectedSet) {
          fetchSetDetails(data.data[0].id);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSetDetails = async (setId) => {
    try {
      const res = await fetch(`/api/question-sets/${setId}?includeAnswers=true`);
      const data = await res.json();
      if (data.success) {
        setSelectedSet(data.data);
      }
    } catch (err) {
      console.error('Failed to load set details:', err);
    }
  };

  const handleCreateSet = async (e) => {
    e.preventDefault();
    if (!newSetTitle.trim()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/question-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSetTitle,
          description: newSetDesc,
          topic: newSetTopic
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewSetTitle('');
        setNewSetDesc('');
        setShowCreateSet(false);
        await fetchQuestionSets();
        fetchSetDetails(data.data.id);
      } else {
        setFormError(data.error || 'Failed to create set');
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!qText.trim()) {
      setFormError('Question text cannot be empty.');
      return;
    }
    if (!opt1.trim() || !opt2.trim() || !opt3.trim() || !opt4.trim()) {
      setFormError('Exactly 4 options are required.');
      return;
    }

    const options = [
      { id: 'opt-1', text: opt1 },
      { id: 'opt-2', text: opt2 },
      { id: 'opt-3', text: opt3 },
      { id: 'opt-4', text: opt4 }
    ];

    const correctOptionId = options[correctOptIndex].id;

    setSaving(true);
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionSetId: selectedSet.id,
          text: qText,
          options,
          correctOptionId,
          difficulty: qDifficulty,
          topic: selectedSet.topic,
          subTopic: qSubTopic || undefined,
          explanation: explanation || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setQText('');
        setOpt1('');
        setOpt2('');
        setOpt3('');
        setOpt4('');
        setQSubTopic('');
        setExplanation('');
        setShowCreateQuestion(false);
        fetchSetDetails(selectedSet.id);
        fetchQuestionSets();
      } else {
        setFormError(data.error || 'Failed to add question');
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Host: Generate Questions via AI
  const handleGenerateAiQuestions = async (e) => {
    e.preventDefault();
    setAiError('');
    setAiLoading(true);
    setAddedIds(new Set());

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedSet?.topic || 'Quantitative',
          subTopic: aiSubTopic.trim() || undefined,
          difficulty: aiDifficulty,
          count: aiCount
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        setAiGeneratedQuestions(data.data);
      } else {
        setAiError(data.error || 'Failed to generate questions');
      }
    } catch (err) {
      setAiError(err.message || 'Network error');
    } finally {
      setAiLoading(false);
    }
  };

  // Host: Add single AI question to current set
  const handleAddAiQuestionToSet = async (q) => {
    if (!selectedSet || addedIds.has(q.id)) return;

    try {
      const res = await fetch('/api/ai/add-to-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionSetId: selectedSet.id,
          question: q
        })
      });

      const data = await res.json();
      if (data.success) {
        setAddedIds(prev => new Set([...prev, q.id]));
        fetchSetDetails(selectedSet.id);
        fetchQuestionSets();
      } else {
        alert(data.error || 'Failed to add question');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Host: Add all AI questions to current set
  const handleAddAllAiQuestions = async () => {
    if (!selectedSet || aiGeneratedQuestions.length === 0) return;

    const unadded = aiGeneratedQuestions.filter(q => !addedIds.has(q.id));
    if (unadded.length === 0) return;

    try {
      const res = await fetch('/api/ai/batch-add-to-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionSetId: selectedSet.id,
          questions: unadded
        })
      });

      const data = await res.json();
      if (data.success) {
        const newAdded = new Set(addedIds);
        unadded.forEach(q => newAdded.add(q.id));
        setAddedIds(newAdded);
        fetchSetDetails(selectedSet.id);
        fetchQuestionSets();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="relative w-full max-w-5xl h-[88vh] bg-[#0c272e] border border-[#143a43] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-modal-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#143a43] flex items-center justify-between bg-[#081d22]/40">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Question creator & library
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Review, author, and generate verified questions with DeepSeek AI.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#11343c] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Split Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Sets List */}
          <div className="w-80 border-r border-[#143a43] bg-[#081d22]/40 p-4 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Question Sets ({sets.length})
                </span>
                <button
                  onClick={() => setShowCreateSet(!showCreateSet)}
                  className="px-2 py-1 rounded-lg bg-[#0e2c33] border border-[#17434d] text-amber-400 hover:text-amber-300 text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>New</span>
                </button>
              </div>

              {/* Create Set Form Dropdown */}
              {showCreateSet && (
                <form onSubmit={handleCreateSet} className="mb-4 p-3 bg-[#081d22] border border-[#17434d] rounded-xl space-y-2">
                  <div className="text-xs font-bold text-amber-400">New Set</div>
                  <input
                    type="text"
                    placeholder="Title..."
                    value={newSetTitle}
                    onChange={(e) => setNewSetTitle(e.target.value)}
                    required
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[#0c272e] border border-[#143a43] text-white focus:outline-none focus:border-amber-400"
                  />
                  <select
                    value={newSetTopic}
                    onChange={(e) => setNewSetTopic(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[#0c272e] border border-[#143a43] text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Quantitative">Quantitative</option>
                    <option value="Logical Reasoning">Logical Reasoning</option>
                    <option value="Verbal Ability">Verbal Ability</option>
                    <option value="Data Interpretation">Data Interpretation</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Short description..."
                    value={newSetDesc}
                    onChange={(e) => setNewSetDesc(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[#0c272e] border border-[#143a43] text-white focus:outline-none focus:border-amber-400"
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-1 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateSet(false)}
                      className="px-2 py-1 text-xs bg-[#0e2c33] hover:bg-[#12363e] border border-[#17434d] text-slate-300 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Set Cards */}
              <div className="space-y-2">
                {sets.map((s) => {
                  const isSelected = selectedSet?.id === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        fetchSetDetails(s.id);
                        setShowAiFinder(false);
                        setShowCreateQuestion(false);
                      }}
                      className={`p-3 rounded-xl cursor-pointer border transition text-left ${
                        isSelected 
                          ? 'bg-[#10343e] border-amber-500/50' 
                          : 'bg-[#0c272e] border-[#143a43] hover:border-[#1c4e5b]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#081d22] text-slate-300">
                          {s.topic}
                        </span>
                        <span className="text-xs text-amber-400 font-mono font-medium">
                          {s.questionCount} Qs
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-white truncate">{s.title}</div>
                      {s.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{s.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-[#143a43] text-[11px] text-slate-500">
              Deterministic question repository
            </div>
          </div>

          {/* Right Main Panel */}
          <div className="flex-1 p-6 overflow-y-auto bg-[#0c272e]">
            {selectedSet ? (
              <div>
                {/* Set Banner & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-[#143a43] gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#081d22] text-amber-400 border border-[#17434d]">
                        {selectedSet.topic}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {selectedSet.questions?.length || 0} questions
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white">{selectedSet.title}</h3>
                    <p className="text-xs text-slate-300 mt-0.5">{selectedSet.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Button 1: AI Question Generator */}
                    <button
                      onClick={() => {
                        setShowAiFinder(!showAiFinder);
                        setShowCreateQuestion(false);
                      }}
                      className={`btn-petrol flex items-center gap-1.5 ${
                        showAiFinder ? 'border-amber-400 text-amber-300' : ''
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Generate with AI</span>
                    </button>

                    {/* Button 2: Manual Add */}
                    <button
                      onClick={() => {
                        setShowCreateQuestion(!showCreateQuestion);
                        setShowAiFinder(false);
                      }}
                      className="btn-petrol flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-300" />
                      <span>Manual Add</span>
                    </button>

                    {onSelectSetForGame && (
                      <button
                        onClick={() => onSelectSetForGame(selectedSet)}
                        className="btn-amber"
                      >
                        Select for live room
                      </button>
                    )}
                  </div>
                </div>

                {/* AI QUESTION GENERATOR PANEL (Feature 1: Host Search & Click + Add) */}
                {showAiFinder && (
                  <div className="mb-6 p-5 rounded-xl bg-[#081d22] border border-amber-500/30 space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          AI Question Generator & Browser
                        </h4>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setShowAiFinder(false)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Close
                      </button>
                    </div>

                    <form onSubmit={handleGenerateAiQuestions} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Sub-Topic / Keyword
                        </label>
                        <input
                          type="text"
                          value={aiSubTopic}
                          onChange={(e) => setAiSubTopic(e.target.value)}
                          placeholder="e.g. Time and Work, Probability, Syllogisms"
                          className="w-full text-xs px-3 py-2 rounded-lg bg-[#0c272e] border border-[#143a43] text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Difficulty
                        </label>
                        <select
                          value={aiDifficulty}
                          onChange={(e) => setAiDifficulty(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded-lg bg-[#0c272e] border border-[#143a43] text-white focus:outline-none focus:border-amber-400"
                        >
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      </div>

                      <div>
                        <button
                          type="submit"
                          disabled={aiLoading}
                          className="w-full btn-amber text-xs py-2 disabled:opacity-50"
                        >
                          {aiLoading ? 'Generating...' : 'Generate Questions'}
                        </button>
                      </div>
                    </form>

                    {aiError && (
                      <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{aiError}</span>
                      </div>
                    )}

                    {/* AI Generated Results with "+ Add" buttons */}
                    {aiGeneratedQuestions.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-300 font-semibold">
                            Generated {aiGeneratedQuestions.length} Questions (Click "+ Add" to save to set)
                          </span>
                          <button
                            onClick={handleAddAllAiQuestions}
                            className="btn-petrol text-xs py-1 px-3 border-amber-500/40 text-amber-300"
                          >
                            + Add All to Set
                          </button>
                        </div>

                        <div className="space-y-3">
                          {aiGeneratedQuestions.map((q, idx) => {
                            const isAdded = addedIds.has(q.id);
                            return (
                              <div key={q.id} className="p-3.5 rounded-xl bg-[#0c272e] border border-[#143a43] space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded bg-[#081d22] text-amber-400 font-mono text-[11px] font-bold flex items-center justify-center">
                                      {idx + 1}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.2 rounded bg-[#081d22] text-slate-300">
                                      {q.subTopic}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.2 rounded bg-amber-500/10 text-amber-400">
                                      {q.difficulty}
                                    </span>
                                  </div>

                                  {/* CLICK + ADD BUTTON */}
                                  <button
                                    onClick={() => handleAddAiQuestionToSet(q)}
                                    disabled={isAdded}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                                      isAdded 
                                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 cursor-default'
                                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm active:scale-95'
                                    }`}
                                  >
                                    {isAdded ? (
                                      <>
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Added to Set</span>
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>+ Add to Set</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                <p className="text-xs text-white font-medium">{q.text}</p>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {q.options.map(opt => {
                                    const isCorrect = opt.id === q.correctOptionId;
                                    return (
                                      <div 
                                        key={opt.id}
                                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center justify-between ${
                                          isCorrect 
                                            ? 'bg-[#0f3427] border-emerald-500/40 text-emerald-300 font-semibold' 
                                            : 'bg-[#081d22] border-[#143a43] text-slate-300'
                                        }`}
                                      >
                                        <span>{opt.text}</span>
                                        {isCorrect && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                                      </div>
                                    );
                                  })}
                                </div>

                                {q.explanation && (
                                  <div className="p-2 rounded-lg bg-[#081d22] text-[11px] text-slate-400">
                                    <strong className="text-amber-400">Logic:</strong> {q.explanation}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Form to Manual Add New Question */}
                {showCreateQuestion && (
                  <form onSubmit={handleCreateQuestion} className="mb-6 p-4 rounded-xl bg-[#081d22] border border-[#17434d] space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-amber-400" />
                        Manual Question Add
                      </h4>
                      <button 
                        type="button" 
                        onClick={() => setShowCreateQuestion(false)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>

                    {formError && (
                      <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{formError}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Question text</label>
                      <textarea
                        rows={2}
                        value={qText}
                        onChange={(e) => setQText(e.target.value)}
                        placeholder="e.g. A train travels 360 km in 4 hours..."
                        className="w-full text-xs p-2.5 rounded-xl bg-[#0c272e] border border-[#143a43] text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Sub-topic</label>
                        <input
                          type="text"
                          value={qSubTopic}
                          onChange={(e) => setQSubTopic(e.target.value)}
                          placeholder="e.g. Speed & Distance"
                          className="w-full text-xs p-2.5 rounded-xl bg-[#0c272e] border border-[#143a43] text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Difficulty</label>
                        <select
                          value={qDifficulty}
                          onChange={(e) => setQDifficulty(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl bg-[#0c272e] border border-[#143a43] text-white focus:outline-none focus:border-amber-400"
                        >
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      </div>
                    </div>

                    {/* 4 Options */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">
                        Options (Select the correct option)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          { val: opt1, set: setOpt1, label: 'Option A', idx: 0 },
                          { val: opt2, set: setOpt2, label: 'Option B', idx: 1 },
                          { val: opt3, set: setOpt3, label: 'Option C', idx: 2 },
                          { val: opt4, set: setOpt4, label: 'Option D', idx: 3 },
                        ].map((opt) => (
                          <div 
                            key={opt.idx}
                            onClick={() => setCorrectOptIndex(opt.idx)}
                            className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition ${
                              correctOptIndex === opt.idx 
                                ? 'bg-[#0f3427] border-emerald-500/50' 
                                : 'bg-[#0c272e] border-[#143a43]'
                            }`}
                          >
                            <input
                              type="radio"
                              name="correctOpt"
                              checked={correctOptIndex === opt.idx}
                              onChange={() => setCorrectOptIndex(opt.idx)}
                              className="accent-emerald-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={opt.val}
                              onChange={(e) => opt.set(e.target.value)}
                              placeholder={opt.label}
                              className="w-full text-xs bg-transparent text-white focus:outline-none"
                              required
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Step-by-step explanation</label>
                      <input
                        type="text"
                        value={explanation}
                        onChange={(e) => setExplanation(e.target.value)}
                        placeholder="Explanation displayed during round review..."
                        className="w-full text-xs p-2.5 rounded-xl bg-[#0c272e] border border-[#143a43] text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowCreateQuestion(false)}
                        className="btn-petrol"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="btn-amber"
                      >
                        {saving ? 'Adding...' : 'Save question'}
                      </button>
                    </div>
                  </form>
                )}

                {/* List of Questions in Set */}
                <div className="space-y-3">
                  {selectedSet.questions && selectedSet.questions.length > 0 ? (
                    selectedSet.questions.map((q, qIndex) => (
                      <div key={q.id} className="p-4 rounded-xl bg-[#081d22] border border-[#143a43] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-[#0c272e] border border-[#17434d] text-amber-400 font-mono text-[11px] font-bold flex items-center justify-center">
                              {qIndex + 1}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.2 rounded ${
                              q.difficulty === 'Easy' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20' :
                              q.difficulty === 'Hard' ? 'bg-rose-950/60 text-rose-400 border border-rose-500/20' :
                              'bg-amber-950/60 text-amber-400 border border-amber-500/20'
                            }`}>
                              {q.difficulty}
                            </span>
                            {q.subTopic && (
                              <span className="text-[11px] text-slate-400">
                                &bull; {q.subTopic}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-100 font-medium">{q.text}</p>

                        {/* Options Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options && q.options.map((opt) => {
                            const isCorrect = q.correctOptionId === opt.id;
                            return (
                              <div
                                key={opt.id}
                                className={`px-3 py-2 rounded-lg text-xs flex items-center justify-between border ${
                                  isCorrect 
                                    ? 'bg-[#0c2d25] border-emerald-500/40 text-emerald-300 font-medium' 
                                    : 'bg-[#0c272e] border-[#143a43] text-slate-300'
                                }`}
                              >
                                <span>{opt.text}</span>
                                {isCorrect && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {q.explanation && (
                          <div className="p-2.5 rounded-lg bg-[#0c272e] border border-[#143a43] text-[11px] text-slate-400">
                            <span className="font-semibold text-amber-400">Explanation:</span> {q.explanation}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      No questions in this set yet. Click "Generate with AI" above to import with one click!
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Select a question set from the left sidebar to view its details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
