import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting AptiQuiz database seeding...');

  // 1. Seed Sample Colleges for College League
  const collegesData = [
    { name: 'Indian Institute of Technology, Bombay', domain: 'iitb.ac.in', totalScore: 3450 },
    { name: 'Birla Institute of Technology and Science, Pilani', domain: 'bits-pilani.ac.in', totalScore: 2890 },
    { name: 'National Institute of Technology, Trichy', domain: 'nitt.edu', totalScore: 2420 },
    { name: 'Delhi Technological University', domain: 'dtu.ac.in', totalScore: 1980 },
    { name: 'Vellore Institute of Technology', domain: 'vit.ac.in', totalScore: 1750 }
  ];

  const colleges = [];
  for (const c of collegesData) {
    const college = await prisma.college.upsert({
      where: { domain: c.domain },
      update: {},
      create: c
    });
    colleges.push(college);
  }
  console.log(`✅ Seeded ${colleges.length} Colleges for College League`);

  // 2. Create Default Host User
  const defaultHost = await prisma.user.upsert({
    where: { guestToken: 'host-default-token-001' },
    update: {},
    create: {
      displayName: 'Placement Coordinator',
      guestToken: 'host-default-token-001',
      collegeId: colleges[0].id
    }
  });

  // 3. Question Sets & Questions
  // Set 1: Quantitative Aptitude Mastery
  const quantSet = await prisma.questionSet.create({
    data: {
      title: 'Quantitative Aptitude Placement Sprint',
      description: 'High-frequency speed & numerical questions covering Work, Time, Speed, and Probability.',
      topic: 'Quantitative',
      questions: {
        create: [
          {
            text: 'A can complete a piece of work in 12 days and B in 18 days. If they work together for 4 days, what fraction of work is left?',
            options: [
              { id: 'opt-1', text: '5/9' },
              { id: 'opt-2', text: '4/9' },
              { id: 'opt-3', text: '1/3' },
              { id: 'opt-4', text: '2/5' }
            ],
            correctOptionId: 'opt-2',
            difficulty: 'Medium',
            topic: 'Quantitative',
            subTopic: 'Time & Work',
            explanation: 'Combined rate per day = 1/12 + 1/18 = 5/36. In 4 days, work completed = 4 * (5/36) = 20/36 = 5/9. Work left = 1 - 5/9 = 4/9.',
            orderIndex: 0
          },
          {
            text: 'Two cards are drawn at random from a pack of 52 cards without replacement. What is the probability that both are aces?',
            options: [
              { id: 'opt-1', text: '1/221' },
              { id: 'opt-2', text: '1/169' },
              { id: 'opt-3', text: '4/663' },
              { id: 'opt-4', text: '1/13' }
            ],
            correctOptionId: 'opt-1',
            difficulty: 'Hard',
            topic: 'Quantitative',
            subTopic: 'Probability',
            explanation: 'P(First ace) = 4/52 = 1/13. P(Second ace) = 3/51 = 1/17. Combined probability = (1/13) * (1/17) = 1/221.',
            orderIndex: 1
          },
          {
            text: 'A train 180 meters long running at 54 km/hr passes a platform in 20 seconds. What is the length of the platform?',
            options: [
              { id: 'opt-1', text: '100 meters' },
              { id: 'opt-2', text: '120 meters' },
              { id: 'opt-3', text: '140 meters' },
              { id: 'opt-4', text: '150 meters' }
            ],
            correctOptionId: 'opt-2',
            difficulty: 'Easy',
            topic: 'Quantitative',
            subTopic: 'Speed & Distance',
            explanation: 'Speed in m/s = 54 * (5/18) = 15 m/s. Total distance in 20s = 15 * 20 = 300m. Length of platform = 300 - 180 = 120m.',
            orderIndex: 2
          },
          {
            text: 'A shopkeeper marks an article 40% above cost price and allows a discount of 20% on the marked price. What is his profit percentage?',
            options: [
              { id: 'opt-1', text: '10%' },
              { id: 'opt-2', text: '12%' },
              { id: 'opt-3', text: '15%' },
              { id: 'opt-4', text: '20%' }
            ],
            correctOptionId: 'opt-2',
            difficulty: 'Medium',
            topic: 'Quantitative',
            subTopic: 'Profit & Loss',
            explanation: 'Let CP = 100. MP = 140. SP = 140 * 0.80 = 112. Profit = 112 - 100 = 12%.',
            orderIndex: 3
          },
          {
            text: 'If 3 coins are tossed simultaneously, what is the probability of getting at least two heads?',
            options: [
              { id: 'opt-1', text: '1/4' },
              { id: 'opt-2', text: '3/8' },
              { id: 'opt-3', text: '1/2' },
              { id: 'opt-4', text: '5/8' }
            ],
            correctOptionId: 'opt-3',
            difficulty: 'Medium',
            topic: 'Quantitative',
            subTopic: 'Probability',
            explanation: 'Total outcomes = 2^3 = 8. Favorable outcomes (HHH, HHT, HTH, THH) = 4. Probability = 4/8 = 1/2.',
            orderIndex: 4
          }
        ]
      }
    }
  });

  // Set 2: Logical Reasoning & Critical Deduction
  const logicSet = await prisma.questionSet.create({
    data: {
      title: 'Logical Reasoning & Deduction Drill',
      description: 'Pattern matching, syllogisms, relational deductions, and analytical series.',
      topic: 'Logical Reasoning',
      questions: {
        create: [
          {
            text: 'Statements: 1. All cats are pets. 2. Some pets are loyal. Conclusions: I. Some cats are loyal. II. Some pets are cats.',
            options: [
              { id: 'opt-1', text: 'Only I follows' },
              { id: 'opt-2', text: 'Only II follows' },
              { id: 'opt-3', text: 'Both I and II follow' },
              { id: 'opt-4', text: 'Neither follows' }
            ],
            correctOptionId: 'opt-2',
            difficulty: 'Medium',
            topic: 'Logical Reasoning',
            subTopic: 'Syllogisms',
            explanation: 'From "All cats are pets", it logically converts to "Some pets are cats" (Conclusion II). Conclusion I cannot be definitely inferred.',
            orderIndex: 0
          },
          {
            text: 'Find the missing number in the series: 3, 7, 15, 31, 63, ?',
            options: [
              { id: 'opt-1', text: '95' },
              { id: 'opt-2', text: '127' },
              { id: 'opt-3', text: '125' },
              { id: 'opt-4', text: '119' }
            ],
            correctOptionId: 'opt-2',
            difficulty: 'Easy',
            topic: 'Logical Reasoning',
            subTopic: 'Number Series',
            explanation: 'Pattern: Each term = (Previous term * 2) + 1. Next term = (63 * 2) + 1 = 127.',
            orderIndex: 1
          },
          {
            text: 'Pointing to a photograph, Ramesh said, "His mother is the only daughter of my mother." How is Ramesh related to the person in photograph?',
            options: [
              { id: 'opt-1', text: 'Father' },
              { id: 'opt-2', text: 'Maternal Uncle' },
              { id: 'opt-3', text: 'Brother' },
              { id: 'opt-4', text: 'Grandfather' }
            ],
            correctOptionId: 'opt-2',
            difficulty: 'Medium',
            topic: 'Logical Reasoning',
            subTopic: 'Blood Relations',
            explanation: 'Only daughter of Ramesh\'s mother = Ramesh\'s sister. Her son\'s maternal uncle is Ramesh.',
            orderIndex: 2
          },
          {
            text: 'In a code language, if SYSTEM is coded as SYSMET and NEARER is coded as AENRER, then how is FRACTION coded?',
            options: [
              { id: 'opt-1', text: 'CARFNOIT' },
              { id: 'opt-2', text: 'NOITCARF' },
              { id: 'opt-3', text: 'CARFTION' },
              { id: 'opt-4', text: 'ARFCNOIT' }
            ],
            correctOptionId: 'opt-1',
            difficulty: 'Hard',
            topic: 'Logical Reasoning',
            subTopic: 'Coding-Decoding',
            explanation: 'The word is divided into two halves. First half (FRAC) reversed is CARF, second half (TION) reversed is NOIT. Combined = CARFNOIT.',
            orderIndex: 3
          }
        ]
      }
    }
  });

  // Set 3: Verbal Ability & Placement English
  const verbalSet = await prisma.questionSet.create({
    data: {
      title: 'Verbal Ability & Grammar Accuracy',
      description: 'Sentence corrections, vocabulary contexts, and vocabulary antonyms.',
      topic: 'Verbal Ability',
      questions: {
        create: [
          {
            text: 'Choose the antonym of the word "EPHEMERAL":',
            options: [
              { id: 'opt-1', text: 'Transient' },
              { id: 'opt-2', text: 'Permanent' },
              { id: 'opt-3', text: 'Fleeting' },
              { id: 'opt-4', text: 'Fragile' }
            ],
            correctOptionId: 'opt-2',
            difficulty: 'Easy',
            topic: 'Verbal Ability',
            subTopic: 'Vocabulary',
            explanation: 'Ephemeral means lasting for a very short time. Permanent means lasting indefinitely.',
            orderIndex: 0
          },
          {
            text: 'Identify the error segment: "Neither of the two candidates (A) / have submitted their credentials (B) / before the deadline (C) / No error (D)"',
            options: [
              { id: 'opt-1', text: 'A' },
              { id: 'opt-2', text: 'B' },
              { id: 'opt-3', text: 'C' },
              { id: 'opt-4', text: 'D' }
            ],
            correctOptionId: 'opt-2',
            difficulty: 'Medium',
            topic: 'Verbal Ability',
            subTopic: 'Sentence Correction',
            explanation: '"Neither" is singular, so it takes a singular verb: "has submitted his credentials", not "have submitted".',
            orderIndex: 1
          },
          {
            text: 'Select the most appropriate word to fill in the blank: "The CEO was known for her _____ demeanor, remaining calm even during severe crises."',
            options: [
              { id: 'opt-1', text: 'equanimous' },
              { id: 'opt-2', text: 'bellicose' },
              { id: 'opt-3', text: 'precarious' },
              { id: 'opt-4', text: 'turbulent' }
            ],
            correctOptionId: 'opt-1',
            difficulty: 'Hard',
            topic: 'Verbal Ability',
            subTopic: 'Vocabulary',
            explanation: 'Equanimous means calm, composed, and even-tempered especially in difficult circumstances.',
            orderIndex: 2
          }
        ]
      }
    }
  });

  // Set 4: Data Interpretation Rapid Sprint
  const diSet = await prisma.questionSet.create({
    data: {
      title: 'Data Interpretation Rapid Sprint',
      description: 'Charts, percentages, tables, and comparative business data analysis.',
      topic: 'Data Interpretation',
      questions: {
        create: [
          {
            text: 'A company reports sales: Q1: $400k, Q2: $500k, Q3: $450k, Q4: $600k. What is the percentage increase in sales from Q1 to Q4?',
            options: [
              { id: 'opt-1', text: '33.33%' },
              { id: 'opt-2', text: '50.00%' },
              { id: 'opt-3', text: '66.67%' },
              { id: 'opt-4', text: '45.00%' }
            ],
            correctOptionId: 'opt-2',
            difficulty: 'Easy',
            topic: 'Data Interpretation',
            subTopic: 'Growth & Percentages',
            explanation: 'Increase = 600 - 400 = 200k. Percentage increase = (200 / 400) * 100 = 50.00%.',
            orderIndex: 0
          },
          {
            text: 'In an exam, 40% of candidates failed in Physics, 30% failed in Chemistry, and 15% failed in both. What percentage of candidates passed in both subjects?',
            options: [
              { id: 'opt-1', text: '35%' },
              { id: 'opt-2', text: '45%' },
              { id: 'opt-3', text: '50%' },
              { id: 'opt-4', text: '55%' }
            ],
            correctOptionId: 'opt-2',
            difficulty: 'Medium',
            topic: 'Data Interpretation',
            subTopic: 'Set Theory & Venn Diagrams',
            explanation: 'Total failed in at least one = 40 + 30 - 15 = 55%. Candidates who passed in both = 100 - 55 = 45%.',
            orderIndex: 1
          }
        ]
      }
    }
  });

  console.log(`✅ Seeded 4 Curated Question Sets:
  1. ${quantSet.title}
  2. ${logicSet.title}
  3. ${verbalSet.title}
  4. ${diSet.title}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
