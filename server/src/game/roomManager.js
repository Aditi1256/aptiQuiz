import crypto from 'crypto';
import { prisma } from '../prisma.js';

// Alphabet excluding ambiguous characters (0, O, 1, I)
const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = crypto.randomInt(0, CODE_CHARS.length);
    code += CODE_CHARS[randomIndex];
  }
  return code;
}

class RoomManager {
  constructor() {
    /**
     * Map of roomCode -> RoomState
     * RoomState: {
     *   id: string (DB id),
     *   roomCode: string,
     *   hostId: string,
     *   hostSocketId: string,
     *   hostName: string,
     *   questionSetId: string,
     *   questionSetTitle: string,
     *   status: 'LOBBY' | 'STARTING' | 'QUESTION_ACTIVE' | 'ROUND_EVALUATION' | 'GAME_OVER',
     *   maxPlayers: 50,
     *   players: Map<playerId, PlayerObj>,
     *   socketToPlayer: Map<socketId, playerId>,
     *   game: GameObject | null,
     *   createdAt: number
     * }
     */
    this.rooms = new Map();
  }

  // Create Room (Host)
  async createRoom({ hostName, guestToken, questionSetId, collegeId }) {
    // 1. Verify or create Host user in DB
    const token = guestToken || crypto.randomUUID();
    const hostUser = await prisma.user.upsert({
      where: { guestToken: token },
      update: { displayName: hostName, collegeId: collegeId || undefined },
      create: {
        displayName: hostName,
        guestToken: token,
        collegeId: collegeId || null
      }
    });

    // 2. Fetch Question Set
    const qSet = await prisma.questionSet.findUnique({
      where: { id: questionSetId },
      include: {
        _count: { select: { questions: true } }
      }
    });

    if (!qSet) {
      throw new Error('Selected question set does not exist');
    }

    // 3. Generate unique 6-character room code
    let roomCode = generateRoomCode();
    while (this.rooms.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    // 4. Save Room to PostgreSQL
    const dbRoom = await prisma.gameRoom.create({
      data: {
        roomCode,
        hostId: hostUser.id,
        questionSetId: qSet.id,
        status: 'LOBBY',
        maxPlayers: 50
      }
    });

    // 5. Initialize in-memory fast room state
    const roomState = {
      id: dbRoom.id,
      roomCode,
      hostId: hostUser.id,
      hostToken: token,
      hostName: hostUser.displayName,
      hostSocketId: null,
      questionSetId: qSet.id,
      questionSetTitle: qSet.title,
      questionCount: qSet._count.questions,
      status: 'LOBBY',
      maxPlayers: 50,
      players: new Map(), // playerId -> Player
      socketToPlayer: new Map(), // socketId -> playerId
      createdAt: Date.now()
    };

    this.rooms.set(roomCode, roomState);
    return { room: roomState, hostUser };
  }

  // Join Room (Guest Player or Host connecting socket)
  async joinRoom({ roomCode, displayName, guestToken, socketId, collegeId, isHost = false }) {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) {
      throw new Error(`Room with code "${roomCode}" does not exist.`);
    }

    // Capacity Check (PRD Section 5 & 8)
    if (room.players.size >= room.maxPlayers && !room.socketToPlayer.has(socketId)) {
      throw new Error(`Room is at maximum capacity (50 players limit reached).`);
    }

    // Check game state: cannot join fresh if game already active unless reconnecting
    const token = guestToken || crypto.randomUUID();
    let existingPlayer = Array.from(room.players.values()).find(p => p.guestToken === token);

    if (room.status !== 'LOBBY' && !existingPlayer) {
      throw new Error(`Game has already started in room ${roomCode}. Cannot join as new participant.`);
    }

    // If reconnecting player
    if (existingPlayer) {
      // Update socket ID and reconnect flag
      room.socketToPlayer.delete(existingPlayer.socketId);
      existingPlayer.socketId = socketId;
      existingPlayer.isDisconnected = false;
      existingPlayer.lastSeen = Date.now();
      room.socketToPlayer.set(socketId, existingPlayer.id);

      if (isHost || existingPlayer.id === room.hostId) {
        room.hostSocketId = socketId;
      }

      return { room, player: existingPlayer, isReconnection: true };
    }

    // New Player Joining: Deduplicate Display Name (e.g. Rahul -> Rahul_2)
    let sanitizedName = displayName.trim();
    if (!sanitizedName) sanitizedName = 'Anonymous';

    let uniqueName = sanitizedName;
    let suffix = 2;
    const currentNames = new Set(Array.from(room.players.values()).map(p => p.displayName.toLowerCase()));

    while (currentNames.has(uniqueName.toLowerCase())) {
      uniqueName = `${sanitizedName}_${suffix}`;
      suffix++;
    }

    // Create / find User in DB
    const dbUser = await prisma.user.upsert({
      where: { guestToken: token },
      update: { displayName: uniqueName, collegeId: collegeId || undefined },
      create: {
        displayName: uniqueName,
        guestToken: token,
        collegeId: collegeId || null
      }
    });

    const playerId = dbUser.id;
    const playerObj = {
      id: playerId,
      guestToken: token,
      displayName: uniqueName,
      socketId,
      collegeId: collegeId || null,
      isHost: isHost || playerId === room.hostId,
      score: 0,
      joinedAt: Date.now(),
      isDisconnected: false,
      lastSeen: Date.now()
    };

    if (playerObj.isHost) {
      room.hostSocketId = socketId;
    }

    room.players.set(playerId, playerObj);
    room.socketToPlayer.set(socketId, playerId);

    return { room, player: playerObj, isReconnection: false };
  }

  // Kick Player (Host Control)
  kickPlayer({ roomCode, hostSocketId, targetPlayerId }) {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) throw new Error('Room not found');

    if (room.hostSocketId !== hostSocketId) {
      throw new Error('Only the room host has permission to kick participants');
    }

    const target = room.players.get(targetPlayerId);
    if (!target) throw new Error('Target player not in room');
    if (target.isHost) throw new Error('Host cannot kick themselves');

    room.players.delete(targetPlayerId);
    if (target.socketId) {
      room.socketToPlayer.delete(target.socketId);
    }

    return { room, kickedPlayer: target };
  }

  // Handle Socket Disconnect
  handleDisconnect(socketId) {
    for (const [roomCode, room] of this.rooms.entries()) {
      if (room.socketToPlayer.has(socketId)) {
        const playerId = room.socketToPlayer.get(socketId);
        const player = room.players.get(playerId);
        room.socketToPlayer.delete(socketId);

        if (player) {
          player.isDisconnected = true;
          player.lastSeen = Date.now();
        }

        // If in LOBBY mode, remove completely after 5s or right away
        if (room.status === 'LOBBY' && player) {
          room.players.delete(playerId);
        }

        return { room, player };
      }
    }
    return null;
  }

  // Get Room by Code
  getRoom(roomCode) {
    if (!roomCode) return null;
    return this.rooms.get(roomCode.toUpperCase()) || null;
  }

  // Format Room Public View for Lobby UI
  serializeRoom(room) {
    if (!room) return null;
    return {
      roomCode: room.roomCode,
      status: room.status,
      hostId: room.hostId,
      hostName: room.hostName,
      questionSetTitle: room.questionSetTitle,
      questionCount: room.questionCount,
      playerCount: room.players.size,
      maxPlayers: room.maxPlayers,
      players: Array.from(room.players.values()).map(p => ({
        id: p.id,
        displayName: p.displayName,
        isHost: p.isHost,
        collegeId: p.collegeId,
        score: p.score || 0,
        isDisconnected: p.isDisconnected
      }))
    };
  }
}

export const roomManager = new RoomManager();
export default roomManager;
