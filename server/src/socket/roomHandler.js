import { roomManager } from '../game/roomManager.js';
import { GameState } from '../game/gameState.js';

export function registerRoomHandlers(io, socket) {
  // Event: join_room
  socket.on('join_room', async (payload, callback) => {
    try {
      const { roomCode, displayName, guestToken, collegeId, isHost } = payload || {};

      if (!roomCode || !displayName) {
        const err = 'Room code and display name are required.';
        if (typeof callback === 'function') callback({ success: false, error: err });
        socket.emit('error_message', { message: err });
        return;
      }

      const cleanCode = roomCode.trim().toUpperCase();
      const { room, player, isReconnection } = await roomManager.joinRoom({
        roomCode: cleanCode,
        displayName,
        guestToken,
        socketId: socket.id,
        collegeId,
        isHost: !!isHost
      });

      // Join Socket.io room channel
      socket.join(cleanCode);
      socket.data.roomCode = cleanCode;
      socket.data.playerId = player.id;
      socket.data.guestToken = player.guestToken;

      const serialized = roomManager.serializeRoom(room);

      // Reply to joining player
      if (typeof callback === 'function') {
        callback({
          success: true,
          player,
          room: serialized,
          isReconnection
        });
      }

      // Broadcast updated room state to all in the room
      io.to(cleanCode).emit('room_state_update', serialized);
      socket.to(cleanCode).emit('player_joined', { player });

      console.log(`[Lobby] Player "${player.displayName}" joined room ${cleanCode} (${room.players.size}/50)`);
    } catch (err) {
      console.error('[Lobby] join_room error:', err.message);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
      socket.emit('error_message', { message: err.message });
    }
  });

  // Event: kick_player (Host Only)
  socket.on('kick_player', (payload, callback) => {
    try {
      const { roomCode, targetPlayerId } = payload || {};
      const cleanCode = (roomCode || socket.data.roomCode || '').trim().toUpperCase();

      const { room, kickedPlayer } = roomManager.kickPlayer({
        roomCode: cleanCode,
        hostSocketId: socket.id,
        targetPlayerId
      });

      // Notify the kicked player
      if (kickedPlayer && kickedPlayer.socketId) {
        const targetSocket = io.sockets.sockets.get(kickedPlayer.socketId);
        if (targetSocket) {
          targetSocket.leave(cleanCode);
          targetSocket.emit('player_kicked', {
            message: 'You were removed from the room by the host.'
          });
        }
      }

      const serialized = roomManager.serializeRoom(room);
      io.to(cleanCode).emit('room_state_update', serialized);
      io.to(cleanCode).emit('player_left', {
        playerId: targetPlayerId,
        displayName: kickedPlayer.displayName,
        reason: 'kicked'
      });

      if (typeof callback === 'function') callback({ success: true });
      console.log(`[Lobby] Host kicked "${kickedPlayer.displayName}" from ${cleanCode}`);
    } catch (err) {
      console.error('[Lobby] kick_player error:', err.message);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
      socket.emit('error_message', { message: err.message });
    }
  });

  // Event: start_game (Host Only)
  socket.on('start_game', async (payload, callback) => {
    try {
      const roomCode = (payload?.roomCode || socket.data.roomCode || '').trim().toUpperCase();
      const room = roomManager.getRoom(roomCode);

      if (!room) throw new Error('Room not found');
      if (room.hostSocketId !== socket.id) {
        throw new Error('Only the room host can start the game.');
      }
      if (room.players.size < 2) {
        throw new Error('Minimum 2 participants are required to start the game.');
      }
      if (room.status !== 'LOBBY') {
        throw new Error(`Game cannot be started (Current status: ${room.status}).`);
      }

      const game = new GameState({ room, io });
      await game.initialize();
      room.game = game;
      game.start();

      if (typeof callback === 'function') callback({ success: true });
    } catch (err) {
      console.error('[Game] start_game error:', err.message);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
      socket.emit('error_message', { message: err.message });
    }
  });

  // Event: submit_answer (Player)
  socket.on('submit_answer', (payload, callback) => {
    try {
      const { questionId, selectedOptionId } = payload || {};
      const roomCode = (payload?.roomCode || socket.data.roomCode || '').trim().toUpperCase();
      const playerId = socket.data.playerId;

      const room = roomManager.getRoom(roomCode);
      if (!room || !room.game) {
        throw new Error('No active game found in this room.');
      }

      const result = room.game.submitAnswer({
        playerId,
        questionId,
        selectedOptionId
      });

      if (typeof callback === 'function') callback(result);
    } catch (err) {
      console.error('[Game] submit_answer error:', err.message);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
      socket.emit('error_message', { message: err.message });
    }
  });

  // Event: leave_room
  socket.on('leave_room', () => {
    handlePlayerLeaving(io, socket, 'voluntary');
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    handlePlayerLeaving(io, socket, 'disconnected');
  });
}

function handlePlayerLeaving(io, socket, reason) {
  const result = roomManager.handleDisconnect(socket.id);
  if (result) {
    const { room, player } = result;
    const cleanCode = room.roomCode;
    socket.leave(cleanCode);

    const serialized = roomManager.serializeRoom(room);
    io.to(cleanCode).emit('room_state_update', serialized);
    io.to(cleanCode).emit('player_left', {
      playerId: player.id,
      displayName: player.displayName,
      reason
    });

    console.log(`[Lobby] Player "${player.displayName}" left ${cleanCode} (${reason})`);
  }
}
