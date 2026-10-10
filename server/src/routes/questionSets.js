import express from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';

const router = express.Router();

// Zod Validation Schemas
const OptionSchema = z.object({
  id: z.string().min(1, 'Option ID is required'),
  text: z.string().min(1, 'Option text cannot be empty')
});

const CreateQuestionSchema = z.object({
  questionSetId: z.string().uuid('Valid Question Set ID is required'),
  text: z.string().min(3, 'Question text must be at least 3 characters'),
  options: z.array(OptionSchema).length(4, 'Exactly 4 options are required'),
  correctOptionId: z.string().min(1, 'Designated correct option is required'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  topic: z.enum(['Quantitative', 'Logical Reasoning', 'Verbal Ability', 'Data Interpretation']),
  subTopic: z.string().optional(),
  explanation: z.string().optional()
}).refine(data => {
  return data.options.some(opt => opt.id === data.correctOptionId);
}, {
  message: 'correctOptionId must match one of the 4 provided options',
  path: ['correctOptionId']
});

const CreateQuestionSetSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  topic: z.enum(['Quantitative', 'Logical Reasoning', 'Verbal Ability', 'Data Interpretation'])
});

// GET /api/question-sets - List all question sets with question counts
router.get('/', async (req, res) => {
  try {
    const sets = await prisma.questionSet.findMany({
      include: {
        _count: {
          select: { questions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: sets.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
        topic: s.topic,
        questionCount: s._count.questions,
        createdAt: s.createdAt
      }))
    });
  } catch (err) {
    console.error('Error fetching question sets:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch question sets' });
  }
});

// GET /api/question-sets/:id - Get a question set and its questions
// Includes query param `includeAnswers=true` for Host authoring view
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const includeAnswers = req.query.includeAnswers === 'true';

    const questionSet = await prisma.questionSet.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (!questionSet) {
      return res.status(404).json({ success: false, error: 'Question set not found' });
    }

    // Mask correctOptionId and explanations if not requested with host permissions
    const sanitizedQuestions = questionSet.questions.map(q => {
      const base = {
        id: q.id,
        text: q.text,
        options: q.options,
        difficulty: q.difficulty,
        topic: q.topic,
        subTopic: q.subTopic,
        orderIndex: q.orderIndex
      };

      if (includeAnswers) {
        return {
          ...base,
          correctOptionId: q.correctOptionId,
          explanation: q.explanation
        };
      }

      return base;
    });

    res.json({
      success: true,
      data: {
        ...questionSet,
        questions: sanitizedQuestions
      }
    });
  } catch (err) {
    console.error('Error fetching question set:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch question set details' });
  }
});

// POST /api/question-sets - Create a new question set
router.post('/', async (req, res) => {
  try {
    const validation = CreateQuestionSetSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.format()
      });
    }

    const newSet = await prisma.questionSet.create({
      data: validation.data
    });

    res.status(201).json({
      success: true,
      message: 'Question set created successfully',
      data: newSet
    });
  } catch (err) {
    console.error('Error creating question set:', err);
    res.status(500).json({ success: false, error: 'Failed to create question set' });
  }
});

// POST /api/questions - Add a question to an existing set
router.post('/questions', async (req, res) => {
  try {
    const validation = CreateQuestionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.format()
      });
    }

    const { questionSetId, text, options, correctOptionId, difficulty, topic, subTopic, explanation } = validation.data;

    // Check if question set exists
    const setExists = await prisma.questionSet.findUnique({
      where: { id: questionSetId }
    });

    if (!setExists) {
      return res.status(404).json({ success: false, error: 'Target question set does not exist' });
    }

    // Get current max orderIndex
    const lastQuestion = await prisma.question.findFirst({
      where: { questionSetId },
      orderBy: { orderIndex: 'desc' }
    });
    const orderIndex = lastQuestion ? lastQuestion.orderIndex + 1 : 0;

    const newQuestion = await prisma.question.create({
      data: {
        questionSetId,
        text,
        options,
        correctOptionId,
        difficulty,
        topic,
        subTopic: subTopic || null,
        explanation: explanation || null,
        orderIndex
      }
    });

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: newQuestion
    });
  } catch (err) {
    console.error('Error creating question:', err);
    res.status(500).json({ success: false, error: 'Failed to create question' });
  }
});

// DELETE /api/questions/:id - Remove a question
router.delete('/questions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.question.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting question:', err);
    res.status(500).json({ success: false, error: 'Failed to delete question' });
  }
});

export default router;
