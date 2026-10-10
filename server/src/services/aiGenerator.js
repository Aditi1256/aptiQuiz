import dotenv from 'dotenv';
dotenv.config();

/**
 * Generate Aptitude Questions using OpenRouter AI (DeepSeek / Llama)
 * @param {Object} params
 * @param {string} params.topic - "Quantitative" | "Logical Reasoning" | "Verbal Ability" | "Data Interpretation"
 * @param {string} [params.subTopic] - Specific topic (e.g. "Time & Work", "Syllogisms", "Percentages")
 * @param {string} [params.difficulty] - "Easy" | "Medium" | "Hard"
 * @param {number} [params.count] - Number of questions (default: 5)
 */
export async function generateAptitudeQuestions({
  topic = 'Quantitative',
  subTopic = '',
  difficulty = 'Medium',
  count = 5
}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured in environment variables.');
  }

  const prompt = `You are a premier aptitude test author for top campus recruitment tests (TCS, Infosys, Wipro, CAT, Bank PO).
Generate exactly ${count} multiple-choice question(s) for:
- Main Topic: ${topic}
${subTopic ? `- Specific Sub-Topic: ${subTopic}` : ''}
- Difficulty Level: ${difficulty}

Rules:
1. Every question must have exactly 4 plausible, distinct options.
2. Calculations in mathematical questions must be 100% accurate.
3. Include a comprehensive, step-by-step logical explanation.
4. Output MUST be ONLY valid raw JSON without conversational filler or Markdown formatting, matching this exact structure:
[
  {
    "text": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "topic": "${topic}",
    "subTopic": "${subTopic || topic}",
    "difficulty": "${difficulty}",
    "explanation": "Clear step-by-step explanation"
  }
]`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'AptiQuiz',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek/deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are an aptitude question generator. You ALWAYS output strictly valid JSON matching the requested schema. Never output markdown fences or conversational text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2500
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `OpenRouter API responded with status ${response.status}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content?.trim() || '';

  // Clean any markdown fences if present
  let cleaned = rawContent;
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    // Attempt fallback extraction with regex if extra tokens wrapped it
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse AI output as JSON: ' + err.message);
    }
  }

  if (!Array.isArray(parsed)) {
    parsed = [parsed];
  }

  // Format into AptiQuiz standard format with options IDs and correctOptionId
  return parsed.map((q, idx) => {
    const optionsArray = Array.isArray(q.options) ? q.options : ['A', 'B', 'C', 'D'];
    const formattedOptions = optionsArray.slice(0, 4).map((optText, oIdx) => ({
      id: `opt-${oIdx + 1}`,
      text: String(optText)
    }));

    const correctIdx = typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 4 
      ? q.correctIndex 
      : 0;

    return {
      id: `ai-gen-${Date.now()}-${idx + 1}`,
      text: q.text || 'Question text',
      options: formattedOptions,
      correctOptionId: `opt-${correctIdx + 1}`,
      topic: q.topic || topic,
      subTopic: q.subTopic || subTopic || topic,
      difficulty: q.difficulty || difficulty,
      explanation: q.explanation || 'Step-by-step logic.'
    };
  });
}
