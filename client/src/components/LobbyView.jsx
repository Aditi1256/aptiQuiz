import React, { useState, useEffect } from 'react';
import { socket } from '../services/socket';
import { 
  Users, 
  Crown, 
  Copy, 
  Check, 
  Play, 
  LogOut, 
  UserX, 
  Sparkles, 
  Zap,
  Activity
} from 'lucide-react';

export default function LobbyView({ 
  room, 
  currentUser, 
  onLeaveRoom, 
  onStartGame 
}) {
  const [copied, setCopied] = useState(false);
  const [kickLoading, setKickLoading] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);

  const isHost = currentUser?.isHost || room?.hostId === currentUser?.id;
  const players = room?.players || [];
  const minPlayersMet = players.length >= 2;

  useEffect(() => {
    function onPlayerJoined({ player }) {
      addLog(`${player.displayName} joined the lobby`);
    }

    function onPlayerLeft({ displayName, reason }) {
      if (reason === 'kicked') {
        addLog(`${displayName} was removed by the host`);
      } else {
        addLog(`${displayName} left the lobby`);
      }
    }

    socket.on('player_joined', onPlayerJoined);
    socket.on('player_left', onPlayerLeft);

    return () => {
      socket.off('player_joined', onPlayerJoined);
      socket.off('player_left', onPlayerLeft);
    };
  }, []);

  const addLog = (text) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setActivityLogs(prev => [{ id: Date.now() + Math.random(), time, text }, ...prev.slice(0, 7)]);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room?.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKick = (targetPlayerId, targetName) => {
    if (!isHost) return;
    if (window.confirm(`Kick ${targetName} from the room?`)) {
      setKickLoading(targetPlayerId);
      socket.emit('kick_player', {
        roomCode: room.roomCode,
        targetPlayerId
      }, () => {
        setKickLoading(null);
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-4 flex flex-col gap-6 animate-fade-in">
      {/* Top Banner: Room Info & Code */}
      <div className="petrol-card p-6 sm:p-7 rounded-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#081d22] border border-[#17434d] text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Waiting in lobby
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {players.length}/{room?.maxPlayers || 50} players
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {room?.questionSetTitle || 'Aptitude Quiz Battle'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Host: <span className="text-slate-200 font-semibold">{room?.hostName}</span> &bull; {room?.questionCount || 0} questions
            </p>
          </div>

          {/* Room Code Display */}
          <div className="flex flex-col items-center sm:items-end">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
              Room Code
            </span>
            <div className="flex items-center gap-2">
              <div className="px-5 py-2.5 rounded-xl bg-[#081d22] border border-[#17434d] text-amber-400 font-mono font-bold text-3xl tracking-[0.25em]">
                {room?.roomCode}
              </div>
              <button
                onClick={copyRoomCode}
                title="Copy Room Code"
                className="p-3 rounded-xl bg-[#0e2c33] hover:bg-[#12363e] border border-[#17434d] text-amber-400 transition"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            {copied && (
              <span className="text-[11px] text-emerald-400 font-medium mt-1">
                Code copied to clipboard!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Player Roster & Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Player Cards Roster */}
        <div className="lg:col-span-2 petrol-card p-6 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#143a43]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                Connected players ({players.length})
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Max 50 players
            </span>
          </div>

          {/* Players Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
            {players.map((p) => {
              const isCurrent = p.id === currentUser?.id;
              const isPlayerHost = p.isHost || p.id === room?.hostId;

              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-xl border transition flex items-center justify-between ${
                    isCurrent 
                      ? 'bg-[#10343e] border-amber-500/50' 
                      : 'bg-[#081d22] border-[#143a43]'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    {/* Avatar Initials */}
                    <div className="w-8 h-8 rounded-lg bg-[#0e2c33] border border-[#17434d] flex items-center justify-center text-amber-400 font-bold text-xs">
                      {p.displayName.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-semibold text-white truncate">
                          {p.displayName}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold">
                            YOU
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400">
                        {isPlayerHost ? (
                          <span className="text-amber-400 flex items-center gap-1 font-semibold">
                            <Crown className="w-3 h-3" /> Host
                          </span>
                        ) : (
                          <span>Participant</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Kick Button (Host Only) */}
                  {isHost && !isPlayerHost && (
                    <button
                      onClick={() => handleKick(p.id, p.displayName)}
                      disabled={kickLoading === p.id}
                      title="Remove participant"
                      className="p-1 rounded text-slate-400 hover:text-rose-400 transition text-xs"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Bar */}
          <div className="mt-6 pt-4 border-t border-[#143a43] flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={onLeaveRoom}
              className="btn-petrol flex items-center gap-1.5 text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave room</span>
            </button>

            {isHost ? (
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {!minPlayersMet && (
                  <span className="text-xs text-amber-400 font-medium">
                    At least 2 players needed to start
                  </span>
                )}
                <button
                  onClick={onStartGame}
                  disabled={!minPlayersMet}
                  className="btn-amber flex items-center justify-center gap-2 flex-1 sm:flex-none disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>Start live battle</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-amber-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Waiting for host to start the game...</span>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Activity Feed & Room Rules */}
        <div className="space-y-4">
          {/* Activity Feed */}
          <div className="petrol-card p-5 rounded-2xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              Lobby updates
            </h4>
            <div className="space-y-2 min-h-[140px]">
              {activityLogs.length > 0 ? (
                activityLogs.map((log) => (
                  <div key={log.id} className="text-xs text-slate-300 flex items-center justify-between bg-[#081d22] px-3 py-1.5 rounded-lg border border-[#143a43]">
                    <span className="truncate">{log.text}</span>
                    <span className="text-[10px] text-slate-500 font-mono ml-2">{log.time}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-500">
                  Waiting for players to join...
                </div>
              )}
            </div>
          </div>

          {/* Rules Preview */}
          <div className="petrol-card p-5 rounded-2xl space-y-2 text-xs text-slate-400">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Match rules
            </h4>
            <ul className="space-y-1 text-[11px] list-disc list-inside">
              <li><strong className="text-slate-300">Synchronized delivery:</strong> All players get questions at the same second.</li>
              <li><strong className="text-slate-300">Speed bonus:</strong> Faster correct answers earn up to 100 extra points.</li>
              <li><strong className="text-slate-300">Option shuffle:</strong> Options are shuffled per player.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
