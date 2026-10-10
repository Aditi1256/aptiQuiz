/**
 * AptiQuiz Replay Intelligence - Mistake-to-Mastery Engine (PRD Section 9: IN-01)
 * Performs deterministic, rule-based relational analysis on answer logs.
 * No mandatory external AI API dependency required.
 */

export function generateReplayIntelligence({ answerLogs, totalQuestions }) {
  if (!answerLogs || answerLogs.length === 0) {
    return {
      summary: 'No answer logs available for this session.',
      weakTopics: [],
      behavioralInsights: [],
      mistakeCards: [],
      recommendedActions: []
    };
  }

  const mistakes = answerLogs.filter(log => !log.isCorrect);
  const correctCount = answerLogs.length - mistakes.length;
  const overallAccuracy = Math.round((correctCount / answerLogs.length) * 100);

  // 1. Group mistakes by Sub-Topic (PRD Section 9 Rule: fails >= 2 questions in a topic)
  const topicStats = {};
  answerLogs.forEach(log => {
    const key = log.subTopic || log.topic || 'General Aptitude';
    if (!topicStats[key]) {
      topicStats[key] = {
        name: key,
        topic: log.topic,
        total: 0,
        wrong: 0,
        correct: 0,
        avgLatencyMs: 0,
        latencies: []
      };
    }
    topicStats[key].total++;
    if (log.isCorrect) {
      topicStats[key].correct++;
    } else {
      topicStats[key].wrong++;
    }
    if (log.responseDurationMs) {
      topicStats[key].latencies.push(log.responseDurationMs);
    }
  });

  // Calculate averages & identify weak topics
  const weakTopics = [];
  Object.values(topicStats).forEach(stat => {
    stat.avgLatencyMs = stat.latencies.length > 0 
      ? Math.round(stat.latencies.reduce((a, b) => a + b, 0) / stat.latencies.length) 
      : 0;

    // PRD Rule: >= 2 mistakes OR wrong rate >= 50%
    if (stat.wrong >= 2 || (stat.total >= 2 && (stat.wrong / stat.total) >= 0.5)) {
      weakTopics.push({
        topicName: stat.name,
        category: stat.topic,
        failureCount: stat.wrong,
        totalAttempts: stat.total,
        accuracy: Math.round((stat.correct / stat.total) * 100),
        severity: stat.wrong >= 2 ? 'HIGH_PRIORITY' : 'MODERATE_REVIEW',
        advice: getSubTopicAdvice(stat.name)
      });
    }
  });

  // 2. Behavioral Insights: Impulsive vs Hesitation Analysis
  const behavioralInsights = [];
  let rushErrors = 0;
  let hesitationErrors = 0;

  mistakes.forEach(log => {
    const duration = log.responseDurationMs || 0;
    if (duration < 3500) {
      rushErrors++;
    } else if (duration > 15000) {
      hesitationErrors++;
    }
  });

  if (rushErrors >= 1) {
    behavioralInsights.push({
      type: 'IMPULSIVE_RUSH',
      title: 'Premature Lock-in Detected',
      description: `You answered ${rushErrors} question(s) in under 3.5 seconds but made errors. In placement tests, taking 2 extra seconds to verify prevents careless slip-ups.`
    });
  }

  if (hesitationErrors >= 1) {
    behavioralInsights.push({
      type: 'CONCEPT_STALL',
      title: 'Time Pressure Stall',
      description: `You spent over 15 seconds on ${hesitationErrors} question(s). Developing rapid elimination heuristics will help you maintain momentum.`
    });
  }

  // 3. Structured Mistake-to-Mastery Cards
  const mistakeCards = mistakes.map((m, index) => {
    return {
      id: m.questionId || `mistake-${index}`,
      questionText: m.questionText || 'Aptitude Question',
      subTopic: m.subTopic || m.topic,
      difficulty: m.difficulty || 'Medium',
      selectedOption: m.selectedOptionText || 'Your Option',
      correctOption: m.correctOptionText || 'Correct Option',
      explanation: m.explanation || 'Review the core formula and algebraic deduction steps.',
      takeaway: getTakeawaySummary(m.subTopic, m.explanation)
    };
  });

  // 4. Recommended Action Modules
  const recommendedActions = [];
  if (weakTopics.length > 0) {
    weakTopics.forEach(wt => {
      recommendedActions.push({
        action: `Practice 10 Targeted Drills in "${wt.topicName}"`,
        topic: wt.topicName,
        difficultyFocus: wt.severity === 'HIGH_PRIORITY' ? 'Fundamental (Easy & Medium)' : 'Advanced (Medium & Hard)'
      });
    });
  } else {
    recommendedActions.push({
      action: 'Great mastery demonstrated! Step up to Advanced Mock Sprinters.',
      topic: 'Mixed Aptitude',
      difficultyFocus: 'Hard'
    });
  }

  return {
    accuracy: overallAccuracy,
    totalMistakes: mistakes.length,
    totalAnswered: answerLogs.length,
    weakTopics,
    behavioralInsights,
    mistakeCards,
    recommendedActions
  };
}

function getSubTopicAdvice(subTopic) {
  const map = {
    'Probability': 'Focus on independent vs dependent events and combination formulas (nCr).',
    'Time & Work': 'Use the unitary method or LCM method to establish working rates per unit time.',
    'Speed & Distance': 'Double-check unit conversions between km/hr and m/s (multiply by 5/18).',
    'Profit & Loss': 'Always anchor calculations to Cost Price (CP) unless explicitly specified otherwise.',
    'Syllogisms': 'Draw minimal Venn diagrams to avoid assuming unstated intermediate conditions.',
    'Number Series': 'Check for secondary differences (differences of differences) or alternating square/cube steps.',
    'Blood Relations': 'Map relationships generation by generation from the point of reference.',
    'Sentence Correction': 'Check subject-verb agreement first, especially with distributive pronouns like "neither/either".',
    'Vocabulary': 'Pay close attention to word roots, prefixes, and sentence contextual tone.'
  };
  return map[subTopic] || 'Review fundamental definitions and step-by-step worked examples.';
}

function getTakeawaySummary(subTopic, explanation) {
  if (explanation && explanation.length < 100) {
    return explanation;
  }
  return `Master the core formula for ${subTopic || 'this topic'} and check boundary conditions before locking in.`;
}
