import express from 'express';
import { prisma } from '../prisma.js';

const router = express.Router();

// GET /api/colleges - Fetch all colleges for league affiliation dropdown
router.get('/', async (req, res) => {
  try {
    const colleges = await prisma.college.findMany({
      orderBy: { totalScore: 'desc' }
    });
    res.json({ success: true, data: colleges });
  } catch (err) {
    console.error('Error fetching colleges:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch colleges' });
  }
});

export default router;
