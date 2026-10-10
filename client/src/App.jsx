import React, { useState, useEffect } from 'react';
import { socket } from './services/socket';
import QuestionBankModal from './components/QuestionBankModal';
import CreateRoomModal from './components/CreateRoomModal';
import JoinRoomModal from './components/JoinRoomModal';
import LobbyView from './components/LobbyView';
import LiveGameView from './components/LiveGameView';
import CollegeLeagueModal from './components/CollegeLeagueModal';
import SoloPracticeModal from './components/SoloPracticeModal';
import SoloGameView from './components/SoloGameView';
import { ArrowRight } from 'lucide-react';

export default function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [socketId, setSocketId] = useState(socket.id || '');
  const [latency, setLatency] = useState(null);

  // Modals & Navigation State
  const [isQuestionBankOpen, setIsQuestionBankOpen] = useState(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isJoinRoomOpen, setIsJoinRoomOpen] = useState(false);
  const [isLeagueModalOpen, setIsLeagueModalOpen] = useState(false);
  const [isSoloModalOpen, setIsSoloModalOpen] = useState(false);

  // Solo Practice Session State
  const [soloSession, setSoloSession] = useState(null);

  // Active Multiplayer Session State
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [questionSets, setQuestionSets] = useState([]);
  const [isGameActive, setIsGameActive] = useState(false);

  // Local Device Progress State (Persisted in localStorage)
  const [deviceStats, setDeviceStats] = useState(() => {
    try {
      const saved = localStorage.getItem('aptiquiz_device_stats');
      return saved ? JSON.parse(saved) : { level: 1, xp: 55, maxXp: 300, streak: 1, bestScore: 146, matches: 1 };
    } catch {
      return { level: 1, xp: 55, maxXp: 300, streak: 1, bestScore: 146, matches: 1 };
    }
  });

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      setSocketId(socket.id || '');
      measurePing();
    }

    function onDisconnect() {
      setIsConnected(false);
      setSocketId('');
      setLatency(null);
    }

    function onRoomStateUpdate(updatedRoom) {
      setCurrentRoom(updatedRoom);
    }

    function onPlayerKicked(data) {
      alert(data?.message || 'You have been removed from the room.');
      setCurrentRoom(null);
      setCurrentUser(null);
      setIsGameActive(false);
    }

    function onGameStarting() {
      setIsGameActive(true);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room_state_update', onRoomStateUpdate);
    socket.on('player_kicked', onPlayerKicked);
    socket.on('game_starting', onGameStarting);

    if (socket.connected) {
      onConnect();
    }

    fetchQuestionSetsSummary();

    // Reload device stats on focus
    const handleFocus = () => {
      try {
        const saved = localStorage.getItem('aptiquiz_device_stats');
        if (saved) setDeviceStats(JSON.parse(saved));
      } catch (e) {}
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room_state_update', onRoomStateUpdate);
      socket.off('player_kicked', onPlayerKicked);
      socket.off('game_starting', onGameStarting);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const measurePing = () => {
    if (!socket.connected) return;
    const start = Date.now();
    socket.emit('client_ping', { sentAt: start }, () => {
      const rtt = Date.now() - start;
      setLatency(rtt);
    });
  };

  const fetchQuestionSetsSummary = async () => {
    try {
      const res = await fetch('/api/question-sets');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setQuestionSets(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to load sets summary:', err);
    }
  };

  const handleRoomCreated = ({ roomCode, hostToken, hostName, collegeId, initialRoom }) => {
    socket.emit('join_room', {
      roomCode,
      displayName: hostName,
      guestToken: hostToken,
      collegeId,
      isHost: true
    }, (res) => {
      if (res?.success) {
        setCurrentUser(res.player);
        setCurrentRoom(res.room);
      }
    });
  };

  const handleJoinRoom = ({ roomCode, displayName, collegeId }) => {
    socket.emit('join_room', {
      roomCode,
      displayName,
      collegeId,
      isHost: false
    }, (res) => {
      if (res?.success) {
        setCurrentUser(res.player);
        setCurrentRoom(res.room);
      }
    });
  };

  const handleLeaveRoom = () => {
    socket.emit('leave_room');
    setCurrentRoom(null);
    setCurrentUser(null);
    setIsGameActive(false);
  };

  const handleStartGame = () => {
    if (!currentRoom) return;
    socket.emit('start_game', { roomCode: currentRoom.roomCode }, (res) => {
      if (!res?.success) {
        alert(res?.error || 'Failed to start game');
      }
    });
  };

  const handleStartSoloGame = (sessionData) => {
    setSoloSession(sessionData);
    setIsSoloModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#081d22] text-slate-100 font-sans flex flex-col justify-between selection:bg-amber-500 selection:text-black">
      {/* Top Navbar: Clean, Professional */}
      <header className="border-b border-[#143a43]/70 bg-[#081d22]/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Left Brand + Nav Links */}
          <div className="flex items-center space-x-6 sm:space-x-8">
            <button 
              onClick={() => { 
                setIsGameActive(false); 
                setCurrentRoom(null);
                setSoloSession(null); 
              }}
              className="text-lg font-bold tracking-tight text-white hover:text-amber-400 transition"
            >
              AptiQuiz
            </button>

            <nav className="hidden sm:flex items-center space-x-5 text-xs font-medium text-slate-300">
              <button 
                onClick={() => setIsQuestionBankOpen(true)}
                className="hover:text-amber-400 transition"
              >
                Quizzes
              </button>
              <button 
                onClick={() => setIsJoinRoomOpen(true)}
                className="hover:text-amber-400 transition"
              >
                Join
              </button>
              <button 
                onClick={() => setIsSoloModalOpen(true)}
                className="hover:text-amber-400 transition"
              >
                Practice
              </button>
              <button 
                onClick={() => setIsLeagueModalOpen(true)}
                className="hover:text-amber-400 transition"
              >
                League
              </button>
              {currentRoom && (
                <button 
                  onClick={() => {}}
                  className="text-amber-400 font-semibold flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  Live room
                </button>
              )}
            </nav>
          </div>

          {/* Right Status */}
          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Online</span>
              {latency !== null && (
                <span className="text-slate-400 font-mono text-[11px] ml-1">({latency}ms)</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow flex flex-col justify-center w-full">
        {soloSession ? (
          /* Solo AI Practice Quiz Mode */
          <SoloGameView
            session={soloSession}
            onReturnHome={() => setSoloSession(null)}
            onPlayAgain={() => {
              setSoloSession(null);
              setIsSoloModalOpen(true);
            }}
          />
        ) : isGameActive ? (
          /* Live Synchronized Multiplayer Game View */
          <LiveGameView
            room={currentRoom}
            currentUser={currentUser}
            onReturnHome={() => {
              setIsGameActive(false);
              handleLeaveRoom();
            }}
          />
        ) : currentRoom ? (
          /* Real-Time Multiplayer Lobby View */
          <LobbyView
            room={currentRoom}
            currentUser={currentUser}
            onLeaveRoom={handleLeaveRoom}
            onStartGame={handleStartGame}
          />
        ) : (
          /* Landing Screen */
          <div className="space-y-8 animate-fade-in">
            {/* Hero Left-Aligned Typography */}
            <div className="max-w-2xl space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-white tracking-tight leading-[1.15]">
                Battle your campus. Beat the <br />
                clock.
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                Live aptitude quizzes where speed and accuracy both count. Join with a code, climb the leaderboard, or drill topics solo with instant AI generation.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => setIsJoinRoomOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition active:scale-98"
                >
                  Join a battle
                </button>

                <button
                  onClick={() => setIsCreateRoomOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#0e2c33] hover:bg-[#12363e] border border-[#17434d] text-slate-200 font-semibold text-xs transition active:scale-98"
                >
                  Host a quiz
                </button>

                <button
                  onClick={() => setIsSoloModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#0e2c33] hover:bg-[#12363e] border border-[#17434d] text-slate-200 font-semibold text-xs transition active:scale-98"
                >
                  Practise solo
                </button>
              </div>

              {/* Notification Banner if User was in a Room */}
              {currentRoom && (
                <div className="mt-4 p-3 rounded-xl bg-[#0e2c33] border border-[#17434d] text-xs text-slate-300 flex items-center justify-between">
                  <span>
                    You are in room <strong className="text-white font-mono">{currentRoom.roomCode}</strong> as {currentUser?.displayName}.
                  </span>
                  <button 
                    onClick={() => {}}
                    className="text-amber-400 font-semibold underline hover:text-amber-300 ml-2"
                  >
                    Return to the room
                  </button>
                </div>
              )}
            </div>

            {/* 4 Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
              {/* Card 1: Quiz creator */}
              <div 
                onClick={() => setIsQuestionBankOpen(true)}
                className="petrol-card-hover p-4 rounded-xl cursor-pointer"
              >
                <h3 className="text-sm font-bold text-white mb-1.5">Quiz creator</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Write questions or generate instantly with AI. Save sets and reuse them for live sessions.
                </p>
              </div>

              {/* Card 2: Join battle */}
              <div 
                onClick={() => setIsJoinRoomOpen(true)}
                className="petrol-card-hover p-4 rounded-xl cursor-pointer"
              >
                <h3 className="text-sm font-bold text-white mb-1.5">Join battle</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enter a short 6-character room code on your phone or laptop and wait in the lobby.
                </p>
              </div>

              {/* Card 3: Adaptive practice / Solo mode */}
              <div 
                onClick={() => setIsSoloModalOpen(true)}
                className="petrol-card-hover p-4 rounded-xl cursor-pointer"
              >
                <h3 className="text-sm font-bold text-white mb-1.5">Adaptive practice</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pick any aptitude topic and drill it with AI generation and mistake-to-mastery review.
                </p>
              </div>

              {/* Card 4: Campus league */}
              <div 
                onClick={() => setIsLeagueModalOpen(true)}
                className="petrol-card-hover p-4 rounded-xl cursor-pointer"
              >
                <h3 className="text-sm font-bold text-white mb-1.5">Campus league</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Colleges earn season points from every completed match across institutions.
                </p>
              </div>
            </div>

            {/* Bottom Card: Your Progress on this Device */}
            <div className="petrol-card p-5 rounded-xl space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Your progress on this device
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <div className="text-lg font-bold text-amber-400">Level {deviceStats.level}</div>
                  <div className="text-[11px] text-slate-400">{deviceStats.xp} / {deviceStats.maxXp} XP</div>
                </div>

                <div>
                  <div className="text-lg font-bold text-amber-400">{deviceStats.streak}</div>
                  <div className="text-[11px] text-slate-400">day streak</div>
                </div>

                <div>
                  <div className="text-lg font-bold text-amber-400">{deviceStats.bestScore}</div>
                  <div className="text-[11px] text-slate-400">best score</div>
                </div>

                <div>
                  <div className="text-lg font-bold text-amber-400">{deviceStats.matches}</div>
                  <div className="text-[11px] text-slate-400">matches played</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-[#081d22] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.round((deviceStats.xp / deviceStats.maxXp) * 100))}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#143a43]/60 py-4 text-center text-xs text-slate-500">
        AptiQuiz &bull; Live Multiplayer & Solo AI Aptitude Platform
      </footer>

      {/* Modals with smooth pop-up animations */}
      <QuestionBankModal
        isOpen={isQuestionBankOpen}
        onClose={() => setIsQuestionBankOpen(false)}
        onSelectSetForGame={() => {
          setIsQuestionBankOpen(false);
          setIsCreateRoomOpen(true);
        }}
      />

      <CreateRoomModal
        isOpen={isCreateRoomOpen}
        onClose={() => setIsCreateRoomOpen(false)}
        onRoomCreated={handleRoomCreated}
      />

      <JoinRoomModal
        isOpen={isJoinRoomOpen}
        onClose={() => setIsJoinRoomOpen(false)}
        onJoinRoom={handleJoinRoom}
      />

      <CollegeLeagueModal
        isOpen={isLeagueModalOpen}
        onClose={() => setIsLeagueModalOpen(false)}
      />

      <SoloPracticeModal
        isOpen={isSoloModalOpen}
        onClose={() => setIsSoloModalOpen(false)}
        onStartSoloGame={handleStartSoloGame}
      />
    </div>
  );
}
