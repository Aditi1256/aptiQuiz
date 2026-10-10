import React, { useState, useEffect } from 'react';
import { 
  X, 
  AlertCircle, 
  ArrowRight,
  Hash
} from 'lucide-react';

export default function JoinRoomModal({ isOpen, onClose, onJoinRoom, prefilledCode = '' }) {
  const [roomCode, setRoomCode] = useState(prefilledCode);
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('aptiquiz_user_name') || '');
  const [colleges, setColleges] = useState([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (prefilledCode) {
      setRoomCode(prefilledCode.toUpperCase());
    }
  }, [prefilledCode]);

  useEffect(() => {
    if (isOpen) {
      fetchColleges();
    }
  }, [isOpen]);

  const fetchColleges = async () => {
    try {
      const res = await fetch('/api/colleges');
      const data = await res.json();
      if (data.success) {
        setColleges(data.data);
      }
    } catch (err) {
      console.error('Failed to load colleges:', err);
    }
  };

  const handleCodeChange = (e) => {
    const clean = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
    setRoomCode(clean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanCode = roomCode.trim().toUpperCase();
    if (cleanCode.length !== 6) {
      setError('Please enter a valid 6-character room code.');
      return;
    }

    if (!displayName.trim()) {
      setError('Please enter your display name.');
      return;
    }

    setLoading(true);
    try {
      localStorage.setItem('aptiquiz_user_name', displayName.trim());

      const checkRes = await fetch(`/api/rooms/${cleanCode}`);
      const checkData = await checkRes.json();

      if (!checkData.success) {
        setError(checkData.error || 'Room not found.');
        setLoading(false);
        return;
      }

      if (checkData.data.status !== 'LOBBY') {
        setError(`Game is already in progress (${checkData.data.status}).`);
        setLoading(false);
        return;
      }

      if (checkData.data.playerCount >= checkData.data.maxPlayers) {
        setError('Room is full (50/50 players).');
        setLoading(false);
        return;
      }

      onJoinRoom({
        roomCode: cleanCode,
        displayName: displayName.trim(),
        collegeId: selectedCollegeId || null,
        isHost: false,
        initialRoom: checkData.data
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Network validation error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="relative w-full max-w-md bg-[#0c272e] border border-[#143a43] rounded-2xl shadow-2xl p-6 sm:p-7 overflow-hidden animate-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#143a43]">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Join battle
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter room code to join live session.
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
          {/* Room Code */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              6-character room code
            </label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={6}
                value={roomCode}
                onChange={handleCodeChange}
                placeholder="A7X9K2"
                className="w-full text-center tracking-[0.3em] font-mono text-xl uppercase font-bold py-3 rounded-xl bg-[#081d22] border border-[#17434d] text-amber-400 placeholder-slate-600 focus:outline-none focus:border-amber-400 transition"
              />
              <Hash className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Your name
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Rahul, Priya"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#081d22] border border-[#17434d] text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Duplicate names in the room will automatically be suffixed (e.g. Rahul_2).
            </p>
          </div>

          {/* College League Selection (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>College affiliation (Optional)</span>
              <span className="text-[11px] text-emerald-400 font-normal">Campus League points</span>
            </label>
            <select
              value={selectedCollegeId}
              onChange={(e) => setSelectedCollegeId(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#081d22] border border-[#17434d] text-white focus:outline-none focus:border-amber-400 transition"
            >
              <option value="" className="bg-[#081d22] text-white">Independent participant</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#081d22] text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

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
              disabled={loading || roomCode.length !== 6 || !displayName.trim()}
              className="btn-amber flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Enter lobby'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
