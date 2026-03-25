// server/services/prompts.js

// ── Difficulty configurations ──────────────────────────────
const DIFFICULTY_CONFIG = {
  easy: {
    label:       'Easy',
    description: 'Beginner-friendly — definitions, basic facts, recognition',
    flashcard: {
      count:       '8 to 12',
      questionStyle: 'straightforward factual recall — "What is X?", "Define X", "Name the X of Y"',
      answerStyle:   'direct single-sentence answers, no jargon, plain everyday language',
      focus:         'key terms, definitions, and basic facts only. Avoid multi-step reasoning.',
      difficulty:    '"easy" for all cards',
    },
    summary: {
      count:   '4 to 8',
      depth:   'brief overviews — 3 to 4 key points per card, focus on what things are rather than how or why',
      language: 'simple, clear language accessible to a complete beginner',
    },
    quiz: {
      count:       '8 to 12',
      questionStyle: 'straightforward recall — "What is...", "Which of the following is..."',
      distractors:   'clearly wrong but plausible — do not require deep analysis to eliminate',
      focus:         'basic factual knowledge only',
    },
  },

  medium: {
    label:       'Medium',
    description: 'Standard depth — understanding, application, comparison',
    flashcard: {
      count:       '12 to 18',
      questionStyle: 'conceptual understanding — "How does X work?", "Why does X cause Y?", "Compare X and Y"',
      answerStyle:   '1 to 3 sentences, accurate and complete, some technical vocabulary where appropriate',
      focus:         'core concepts, relationships between ideas, and practical applications',
      difficulty:    'mix of "easy", "medium", and "hard" reflecting actual complexity',
    },
    summary: {
      count:   '6 to 12',
      depth:   '4 to 6 key points per card, covering what, how, and why',
      language: 'clear academic language, introduce key terms with brief explanations',
    },
    quiz: {
      count:       '12 to 18',
      questionStyle: 'conceptual — "Why does...", "What would happen if...", "Which best describes..."',
      distractors:   'plausible and require understanding to eliminate — not just guessable',
      focus:         'understanding of concepts and their relationships',
    },
  },

  hard: {
    label:       'Hard',
    description: 'Advanced — analysis, synthesis, edge cases',
    flashcard: {
      count:       '15 to 22',
      questionStyle: 'analytical and evaluative — "Analyze X in the context of Y", "What are the implications of X?", "Critique the approach of X", "Under what conditions does X fail?"',
      answerStyle:   '2 to 4 sentences with nuanced, precise answers that acknowledge complexity and caveats',
      focus:         'deep analysis, mechanisms, edge cases, tradeoffs, and connections between distant concepts',
      difficulty:    'majority "hard", some "medium" — no "easy" cards',
    },
    summary: {
      count:   '8 to 15',
      depth:   '5 to 7 key points per card going deep into mechanisms, tradeoffs, limitations, and interconnections',
      language: 'technical academic language, assume reader has prior domain knowledge',
    },
    quiz: {
      count:       '15 to 22',
      questionStyle: 'applied and analytical — scenario-based, "Which of the following would be most likely to...", multi-step reasoning required',
      distractors:   'highly plausible, only distinguishable through careful analysis — all options should look reasonable at first glance',
      focus:         'application of knowledge to novel situations, analysis of tradeoffs',
    },
  },

  expert: {
    label:       'Expert',
    description: 'Mastery level — synthesis, critique, research-grade depth',
    flashcard: {
      count:       '18 to 25',
      questionStyle: 'synthesis and critique — "Evaluate the strengths and weaknesses of X", "How would you reconcile X with Y?", "What assumptions underlie X and when do they break down?", "Design a solution to X using principles Y and Z"',
      answerStyle:   '3 to 5 sentences with expert-level precision, cite specific mechanisms, acknowledge genuine uncertainty, reference counterarguments',
      focus:         'expert-level synthesis — connect concepts across sections, evaluate approaches critically, surface non-obvious implications and failure modes',
      difficulty:    '"hard" for all cards — this is graduate/professional level',
    },
    summary: {
      count:   '10 to 15',
      depth:   '6 to 8 key points per card with expert-level depth: assumptions, limitations, debates in the field, connections to broader theory, open questions',
      language: 'graduate-level academic language with domain-specific precision',
    },
    quiz: {
      count:       '18 to 25',
      questionStyle: 'mastery — complex scenario-based questions requiring synthesis of multiple concepts, "A researcher observes X — what is the most likely explanation given Y and Z constraints?", case analysis',
      distractors:   'expert-level distractors — each option represents a defensible position that only fails on one subtle but important point',
      focus:         'synthesis, critical evaluation, and application in complex or ambiguous situations',
    },
  },
};

// ── Prompt builders ────────────────────────────────────────
const flashcardSystemPrompt = (difficulty = 'medium') => {
  const cfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medium;
  const fc  = cfg.flashcard;
  return `
You are an expert educational content creator calibrated to ${cfg.label.toUpperCase()} difficulty.
Your task is to create high-quality flashcards from the provided document content.

DIFFICULTY LEVEL: ${cfg.label.toUpperCase()} — ${cfg.description}

RULES:
1. Generate ${fc.count} flashcards
2. Question style: ${fc.questionStyle}
3. Answer style: ${fc.answerStyle}
4. Focus: ${fc.focus}
5. Difficulty values: ${fc.difficulty}
6. Cover the most important concepts for this difficulty level
7. Every question must be answerable purely from the document content
8. Do not repeat the same concept twice
9. Group related cards under chapter headings that reflect sections of the document. Use 2 to 5 chapters. Assign every card a "chapter" field matching the chapter title. Include a top-level "chapters" array listing all chapter titles in order.

OUTPUT FORMAT — Your ENTIRE response must be a single JSON object. Do not write any text before or after the JSON. Do not use markdown. Begin your response with { and end with }

{
  "type": "flashcard",
  "difficulty_level": "${difficulty}",
  "chapters": ["Chapter 1 title", "Chapter 2 title"],
  "cards": [
    {
      "id": 1,
      "question": "...",
      "answer": "...",
      "difficulty": "easy|medium|hard",
      "chapter": "Chapter 1 title"
    }
  ]
}
`.trim();
};

const summarySystemPrompt = (difficulty = 'medium') => {
  const cfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medium;
  const sm  = cfg.summary;
  return `
You are an expert at summarizing educational content calibrated to ${cfg.label.toUpperCase()} difficulty.
Create structured summary cards from the provided document.

DIFFICULTY LEVEL: ${cfg.label.toUpperCase()} — ${cfg.description}

RULES:
1. Generate ${sm.count} summary cards, one per major topic or section
2. Depth: ${sm.depth}
3. Language: ${sm.language}
4. Each summary paragraph: 2 to 3 sentences
5. Organize cards in logical reading order
6. Focus on concepts appropriate for ${cfg.label.toLowerCase()} level learners

OUTPUT FORMAT — Your ENTIRE response must be a single JSON object. Do not write any text before or after the JSON. Do not use markdown. Begin your response with { and end with }

{
  "type": "summary",
  "difficulty_level": "${difficulty}",
  "chapters": ["Chapter 1 title", "Chapter 2 title"],
  "cards": [
    {
      "id": 1,
      "title": "...",
      "keyPoints": ["...", "...", "..."],
      "summary": "...",
      "chapter": "Chapter 1 title"
    }
  ]
}
`.trim();
};

const quizSystemPrompt = (difficulty = 'medium') => {
  const cfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medium;
  const qz  = cfg.quiz;
  return `
You are an expert exam creator calibrated to ${cfg.label.toUpperCase()} difficulty.
Generate multiple-choice quiz questions from the provided document content.

DIFFICULTY LEVEL: ${cfg.label.toUpperCase()} — ${cfg.description}

RULES:
1. Generate ${qz.count} questions
2. Question style: ${qz.questionStyle}
3. Distractors (wrong answers): ${qz.distractors}
4. Focus: ${qz.focus}
5. Each question has exactly 4 options (A, B, C, D) — only one correct
6. Include a brief explanation for the correct answer (1 to 2 sentences)
7. Avoid trick questions or ambiguous wording
8. Group questions under chapter headings reflecting document sections. Use 2 to 5 chapters. Assign every card a "chapter" field. Include a top-level "chapters" array listing all chapter titles in order.

OUTPUT FORMAT — Your ENTIRE response must be a single JSON object. Do not write any text before or after the JSON. Do not use markdown. Begin your response with { and end with }

{
  "type": "quiz",
  "difficulty_level": "${difficulty}",
  "chapters": ["Chapter 1 title", "Chapter 2 title"],
  "cards": [
    {
      "id": 1,
      "question": "...",
      "options": [
        { "label": "A", "text": "...", "isCorrect": false },
        { "label": "B", "text": "...", "isCorrect": true },
        { "label": "C", "text": "...", "isCorrect": false },
        { "label": "D", "text": "...", "isCorrect": false }
      ],
      "explanation": "...",
      "chapter": "Chapter 1 title"
    }
  ]
}
`.trim();
};

const buildUserPrompt = (text, cardType, difficulty = 'medium') => {
  const cfg   = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medium;
  const label = { flashcard: 'flashcards', summary: 'summary cards', quiz: 'quiz questions' }[cardType] || cardType;
  return `Please create ${label} at ${cfg.label.toUpperCase()} difficulty from the following document content:\n\n---\n${text}\n---\n\nRespond only with the JSON output as specified. Remember: ${cfg.label.toUpperCase()} level — ${cfg.description}`;
};

const getSystemPrompt = (cardType, difficulty = 'medium') => {
  const d = ['easy','medium','hard','expert'].includes(difficulty) ? difficulty : 'medium';
  switch (cardType) {
    case 'flashcard': return flashcardSystemPrompt(d);
    case 'summary':   return summarySystemPrompt(d);
    case 'quiz':      return quizSystemPrompt(d);
    default: throw new Error(`Unknown card type: ${cardType}`);
  }
};

module.exports = { getSystemPrompt, buildUserPrompt, DIFFICULTY_CONFIG };
