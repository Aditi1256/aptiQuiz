import express from 'express';
import { prisma } from '../prisma.js';
import { generateAptitudeQuestions } from '../services/aiGenerator.js';

const router = express.Router();

/**
 * POST /api/ai/generate
 * Generates aptitude questions via OpenRouter AI on demand
 */
router.post('/generate', async (req, res) => {
  try {
    const { topic, subTopic, difficulty, count } = req.body;

    const numQuestions = Math.min(Math.max(parseInt(count, 10) || 5, 1), 10);
    const questions = await generateAptitudeQuestions({
      topic: topic || 'Quantitative',
      subTopic: subTopic || '',
      difficulty: difficulty || 'Medium',
      count: numQuestions
    });

    return res.json({
      success: true,
      count: questions.length,
      data: questions
    });
  } catch (err) {
    console.error('[AI Route Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate questions with AI'
    });
  }
});

/**
 * POST /api/ai/add-to-set
 * Adds an AI generated question into an existing Question Set in Prisma DB
 */
router.post('/add-to-set', async (req, res) => {
  try {
    const { questionSetId, question } = req.body;

    if (!questionSetId) {
      return res.status(400).json({ success: false, error: 'questionSetId is required' });
    }
    if (!question || !question.text || !question.options || !question.correctOptionId) {
      return res.status(400).json({ success: false, error: 'Invalid question object' });
    }

    // Get current question count in the set for orderIndex
    const currentCount = await prisma.question.count({
      where: { questionSetId }
    });

    const saved = await prisma.question.create({
      data: {
        questionSetId,
        text: question.text,
        options: question.options,
        correctOptionId: question.correctOptionId,
        difficulty: question.difficulty || 'Medium',
        topic: question.topic || 'Quantitative',
        subTopic: question.subTopic || null,
        explanation: question.explanation || null,
        orderIndex: currentCount
      }
    });

    return res.json({
      success: true,
      data: saved
    });
  } catch (err) {
    console.error('[AI Add to Set Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to save question to set'
    });
  }
});

/**
 * POST /api/ai/batch-add-to-set
 * Adds multiple AI generated questions to a set at once
 */
router.post('/batch-add-to-set', async (req, res) => {
  try {
    const { questionSetId, questions } = req.body;

    if (!questionSetId || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, error: 'questionSetId and questions array required' });
    }

    const currentCount = await prisma.question.count({
      where: { questionSetId }
    });

    const createdList = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const saved = await prisma.question.create({
        data: {
          questionSetId,
          text: q.text,
          options: q.options,
          correctOptionId: q.correctOptionId,
          difficulty: q.difficulty || 'Medium',
          topic: q.topic || 'Quantitative',
          subTopic: q.subTopic || null,
          explanation: q.explanation || null,
          orderIndex: currentCount + i
        }
      });
      createdList.push(saved);
    }

    return res.json({
      success: true,
      addedCount: createdList.length,
      data: createdList
    });
  } catch (err) {
    console.error('[AI Batch Add Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to batch add questions'
    });
  }
});

export default router;
