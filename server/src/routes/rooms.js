import express from 'express';
import { z } from 'zod';
import { roomManager } from '../game/roomManager.js';

const router = express.Router();

const CreateRoomSchema = z.object({
  hostName: z.string().min(2, 'Host name must be at least 2 characters'),
  questionSetId: z.string().uuid('Valid Question Set ID is required'),
  collegeId: z.string().uuid().optional().nullable(),
  guestToken: z.string().optional()
});

// POST /api/rooms - Create a new multiplayer room
router.post('/', async (req, res) => {
  try {
    const validation = CreateRoomSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.format()
      });
    }

    const { hostName, questionSetId, collegeId, guestToken } = validation.data;
    const { room, hostUser } = await roomManager.createRoom({
      hostName,
      questionSetId,
      collegeId,
      guestToken
    });

    res.status(201).json({
      success: true,
      data: {
        roomCode: room.roomCode,
        hostId: hostUser.id,
        hostToken: hostUser.guestToken,
        room: roomManager.serializeRoom(room)
      }
    });
  } catch (err) {
    console.error('Error creating room:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to create room' });
  }
});

// GET /api/rooms/:roomCode - Get room details prior to joining
router.get('/:roomCode', (req, res) => {
  try {
    const { roomCode } = req.params;
    const room = roomManager.getRoom(roomCode);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: `Room code "${roomCode.toUpperCase()}" not found or expired.`
      });
    }

    res.json({
      success: true,
      data: roomManager.serializeRoom(room)
    });
  } catch (err) {
    console.error('Error fetching room info:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch room info' });
  }
});

export default router;
