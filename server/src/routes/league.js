import express from 'express';
import { prisma } from '../prisma.js';

const router = express.Router();

// GET /api/league/standings - Fetch institutional college league rankings (PRD Section 7 & 13)
router.get('/standings', async (req, res) => {
  try {
    const colleges = await prisma.college.findMany({
      include: {
        users: {
          select: {
            id: true,
            displayName: true,
            playerScores: {
              select: { totalScore: true }
            }
          }
        }
      },
      orderBy: { totalScore: 'desc' }
    });

    const standings = colleges.map((college, idx) => {
      // Calculate top student contributors for this institution
      const contributors = college.users.map(u => {
        const studentTotal = u.playerScores.reduce((sum, s) => sum + s.totalScore, 0);
        return {
          id: u.id,
          displayName: u.displayName,
          contributedPoints: studentTotal
        };
      })
      .filter(u => u.contributedPoints > 0)
      .sort((a, b) => b.contributedPoints - a.contributedPoints)
      .slice(0, 3); // top 3 contributors

      return {
        id: college.id,
        rank: idx + 1,
        name: college.name,
        domain: college.domain,
        totalScore: college.totalScore,
        registeredStudents: college.users.length,
        topContributors: contributors
      };
    });

    res.json({
      success: true,
      data: {
        totalInstitutions: standings.length,
        standings
      }
    });
  } catch (err) {
    console.error('Error fetching league standings:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch league standings' });
  }
});

export default router;
