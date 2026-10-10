import React, { useState, useEffect } from 'react';
import { 
  X, 
  AlertCircle, 
  ArrowRight
} from 'lucide-react';

export default function CreateRoomModal({ isOpen, onClose, onRoomCreated }) {
  const [hostName, setHostName] = useState(() => localStorage.getItem('aptiquiz_user_name') || '');
  const [questionSets, setQuestionSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [colleges, setColleges] = useState([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadFormData();
    }
  }, [isOpen]);

  const loadFormData = async () => {
    setError('');
    try {
      const [setsRes, colRes] = await Promise.all([
        fetch('/api/question-sets'),
        fetch('/api/colleges')
      ]);

      const setsData = await setsRes.json();
      const colData = await colRes.json();

      if (setsData.success && setsData.data.length > 0) {
        setQuestionSets(setsData.data);
        if (!selectedSetId) {
          setSelectedSetId(setsData.data[0].id);
        }
      }

      if (colData.success) {
        setColleges(colData.data);
      }
    } catch (err) {
      setError('Failed to load room options: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!hostName.trim()) {
      setError('Please enter your name.');
      return;
    }

    if (!selectedSetId) {
      setError('Please select a question set.');
      return;
    }

    setLoading(true);
    try {
      localStorage.setItem('aptiquiz_user_name', hostName.trim());

      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName: hostName.trim(),
          questionSetId: selectedSetId,
          collegeId: selectedCollegeId || null
        })
      });

      const data = await res.json();
      if (data.success) {
        onRoomCreated({
          roomCode: data.data.roomCode,
          hostToken: data.data.hostToken,
          hostName: hostName.trim(),
          collegeId: selectedCollegeId || null,
          isHost: true,
          initialRoom: data.data.room
        });
        onClose();
      } else {
        setError(data.error || 'Failed to create room');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="relative w-full max-w-lg bg-[#0c272e] border border-[#143a43] rounded-2xl shadow-2xl p-6 sm:p-7 overflow-hidden animate-modal-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#143a43]">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Create live room
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Launch a live multiplayer battle with a 6-character room code.
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
          {/* Host Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Host / Coordinator Name
            </label>
            <input
              type="text"
              required
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#081d22] border border-[#17434d] text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          {/* Question Set Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Select Question Set</span>
              <span className="text-[11px] text-amber-400 font-normal">
                {questionSets.length} sets available
              </span>
            </label>
            <select
              value={selectedSetId}
              onChange={(e) => setSelectedSetId(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#081d22] border border-[#17434d] text-white focus:outline-none focus:border-amber-400 transition"
            >
              {questionSets.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#081d22] text-white">
                  [{s.topic}] {s.title} ({s.questionCount} Qs)
                </option>
              ))}
            </select>
          </div>

          {/* College League Selection (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>College Affiliation (Optional)</span>
              <span className="text-[11px] text-emerald-400 font-normal">Campus League ranking</span>
            </label>
            <select
              value={selectedCollegeId}
              onChange={(e) => setSelectedCollegeId(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#081d22] border border-[#17434d] text-white focus:outline-none focus:border-amber-400 transition"
            >
              <option value="" className="bg-[#081d22] text-white">Open Play (No specific college)</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#081d22] text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Room Specs Highlights */}
          <div className="p-3 rounded-xl bg-[#081d22] border border-[#143a43] text-[11px] text-slate-400 space-y-1.5">
            <div className="flex items-center justify-between">
              <span>Capacity limit:</span>
              <span className="text-white font-medium">50 simultaneous players</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Room code:</span>
              <span className="text-amber-400 font-medium">6-character code</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Clock synchronization:</span>
              <span className="text-emerald-400 font-medium">Server UTC timestamp</span>
            </div>
          </div>

          {/* Action Buttons */}
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
              {loading ? 'Creating...' : 'Create room & open lobby'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
