const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// ============================================================
// AI helper — calls OpenAI or returns demo data
// ============================================================
async function callAI(messages, maxTokens = 1500) {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  const baseURL = (process.env.OPENAI_BASE_URL || '').trim();
  const isDemo = !apiKey || apiKey.startsWith('sk-demo') || apiKey.includes('replace') || apiKey.length < 20;

  if (isDemo) return getDemoResponse(messages);

  const { OpenAI } = require('openai');
  const openai = new OpenAI({
    apiKey,
    baseURL: baseURL || undefined,  // e.g. https://openrouter.ai/api/v1
    defaultHeaders: baseURL ? {
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Study Partner'
    } : {}
  });

  // OpenRouter model names (prefixed with provider/)
  // If using standard OpenAI, use unprefixed names
  const isOpenRouter = baseURL.includes('openrouter.ai');
  const models = isOpenRouter
    ? ['openai/gpt-4o-mini', 'openai/gpt-3.5-turbo', 'meta-llama/llama-3.1-8b-instruct:free']
    : ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'];

  let lastErr;
  for (const model of models) {
    try {
      const resp = await openai.chat.completions.create({ model, messages, max_tokens: maxTokens });
      return resp.choices[0].message.content;
    } catch (err) {
      lastErr = err;
      if (err.status === 404) continue;
      if (err.status === 429) throw new Error('Rate limit reached. Please wait a moment and try again.');
      if (err.status === 401) throw new Error('Invalid API key. Please check OPENAI_API_KEY in backend/.env');
      if (err.status === 402 || err.status === 403) throw new Error('Billing/quota issue. Check your account credits.');
      throw err;
    }
  }
  throw lastErr;
}

function getDemoResponse(messages) {
  const last = messages[messages.length - 1]?.content || '';
  const lower = last.toLowerCase();

  if (lower.includes('flashcard') || lower.includes('flash card')) {
    return JSON.stringify([
      { question: 'What is a Data Structure?', answer: 'A way to organize and store data so it can be accessed and modified efficiently.' },
      { question: 'What is Big O Notation?', answer: 'A mathematical notation that describes the performance/complexity of an algorithm.' },
      { question: 'What is a Stack?', answer: 'A LIFO (Last In First Out) data structure. Think of a stack of plates.' },
      { question: 'What is a Queue?', answer: 'A FIFO (First In First Out) data structure. Think of a ticket line.' },
      { question: 'What is Binary Search?', answer: 'An efficient algorithm to find an element in a sorted array by halving the search space each step. O(log n).' },
    ]);
  }
  if (lower.includes('quiz') || lower.includes('question')) {
    return JSON.stringify([
      { question: 'What is the time complexity of Binary Search?', options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], answer: 'O(log n)', explanation: 'Binary Search halves the search space each iteration, giving logarithmic complexity.' },
      { question: 'Which data structure uses LIFO order?', options: ['Queue', 'Array', 'Stack', 'Linked List'], answer: 'Stack', explanation: 'Stack = Last In First Out, like a stack of plates.' },
    ]);
  }
  if (lower.includes('interview')) {
    return JSON.stringify([
      { question: 'Tell me about yourself and your background.', category: 'Introduction' },
      { question: 'What are your technical skills relevant to this role?', category: 'Technical' },
      { question: 'Describe a challenging problem you solved.', category: 'Behavioral' },
      { question: 'Where do you see yourself in 5 years?', category: 'Career Goals' },
      { question: 'Do you have any questions for us?', category: 'General' },
    ]);
  }
  if (lower.includes('summarize') || lower.includes('summary')) {
    return '📝 **Summary** (Demo Mode)\n\nThis document covers key academic concepts. Add your OpenAI API key to `backend/.env` to get real AI-powered summaries.\n\n**Main Topics:** Core concepts, theoretical framework, practical applications.\n\n**Key Points:**\n- Systematic understanding is essential\n- Evidence-based reasoning drives conclusions\n- Practical application reinforces learning';
  }
  if (lower.includes('exam')) {
    return '🎯 **Exam Points** (Demo Mode)\n\n1. Core concept — foundational principle of the subject\n2. Key definitions — memorize exact terminology\n3. Formula/rule — applied in calculation questions\n4. Common mistakes — frequently tested edge cases\n5. Historical context — background often appears in essays\n\n*Add your OpenAI API key to get real exam points from your document.*';
  }

  return `🤖 **Demo Mode** — I'm your AI Study Partner!\n\nTo get real AI responses for any subject (DSA, engineering, medicine, law, competitive exams, etc.), add your OpenAI API key to \`backend/.env\`:\n\`\`\`\nOPENAI_API_KEY=sk-your-key-here\n\`\`\`\nThen restart the backend.\n\nYou asked: *"${last.substring(0, 100)}"* — With a real API key I can explain any topic at any level, from school basics to PhD-level research! 🎓`;
}

// ============================================================
// In-memory document store (fallback when MongoDB is offline)
// ============================================================
const docStore = new Map();

// ============================================================
// CHAT
// ============================================================
router.post('/chat', auth, async (req, res) => {
  try {
    const { message, documentId, conversationHistory = [], level = 'any' } = req.body;

    let context = '';
    if (documentId) {
      // Try MongoDB first
      let doc = null;
      try { const Document = require('../models/Document'); doc = await Document.findById(documentId); } catch(e) {}
      // Then in-memory store
      if (!doc) doc = docStore.get(documentId);
      if (doc && doc.extractedText) context = `\n\nDocument context (use this to answer):\n${doc.extractedText.substring(0, 4000)}`;
    }

    const systemPrompt = `You are an expert AI Study Partner who can teach ANY subject at ANY level — school, undergraduate, postgraduate, competitive exams (GATE, JEE, UPSC, GRE, GMAT), DSA, coding interviews, professional certifications, and more. 

You adapt your explanation depth based on the question. Always:
- Explain concepts clearly with examples
- Use analogies for complex ideas
- Provide exam tips when relevant
- Format answers with headers and bullet points for readability
- Be encouraging and supportive${context}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-12),
      { role: 'user', content: message }
    ];

    const response = await callAI(messages, 2000);
    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: err.message, response: `⚠️ AI Error: ${err.message}\n\nPlease check your OpenAI API key in \`backend/.env\` and restart the backend.` });
  }
});

// ============================================================
// SUMMARIZE
// ============================================================
router.post('/summarize', auth, async (req, res) => {
  try {
    const { documentId, text, mode = 'general' } = req.body;
    let content = text || '';

    if (documentId && !content) {
      let doc = null;
      try { const Document = require('../models/Document'); doc = await Document.findById(documentId); } catch(e) {}
      if (!doc) doc = docStore.get(documentId);
      if (doc) content = doc.extractedText || '';
    }

    if (!content) return res.status(400).json({ error: 'Document text is empty or could not be read. The file may not have extractable text (e.g. scanned images).' });

    const modePrompts = {
      general: 'Create a clear, well-structured summary with main ideas, key points, and conclusions.',
      exam: 'Create an exam-focused summary. List the most important facts, definitions, formulas, theorems, and concepts that are likely to appear in exams. Use bullet points. Mark critical items with ⭐.',
      brief: 'Create a concise 5-point summary of the absolute most important takeaways.',
      detailed: 'Create a detailed chapter-by-chapter breakdown explaining every concept thoroughly.',
    };

    const messages = [
      { role: 'system', content: 'You are an expert academic summarizer who helps students of all levels — school, undergraduate, postgraduate, professional.' },
      { role: 'user', content: `${modePrompts[mode] || modePrompts.general}\n\nDocument content:\n${content.substring(0, 10000)}` }
    ];

    const summary = await callAI(messages, 2500);
    if (documentId) {
      try { const Document = require('../models/Document'); await Document.findByIdAndUpdate(documentId, { summary }); } catch(e) {}
      const cached = docStore.get(documentId);
      if (cached) docStore.set(documentId, { ...cached, summary });
    }
    res.json({ summary, mode, wordCount: content.split(/\s+/).length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// FLASHCARDS
// ============================================================
router.post('/flashcards', auth, async (req, res) => {
  try {
    const { documentId, text, topic, count = 10 } = req.body;
    let content = text || topic || '';

    if (documentId && !content) {
      let doc = null;
      try { const Document = require('../models/Document'); doc = await Document.findById(documentId); } catch(e) {}
      if (!doc) doc = docStore.get(documentId);
      if (doc) content = doc.extractedText || '';
    }

    if (!content) return res.status(400).json({ error: 'Please provide a topic or document to generate flashcards from.' });

    const messages = [
      { role: 'system', content: 'You are an expert educator. Create effective study flashcards. Respond ONLY with a JSON array, no extra text.' },
      { role: 'user', content: `Generate exactly ${count} flashcards for: "${content.substring(0, 6000)}"\n\nReturn ONLY a JSON array: [{"question": "...", "answer": "..."}, ...]\nMake questions clear and answers concise but complete. Cover the most important concepts.` }
    ];

    let flashcards = [];
    try {
      const raw = await callAI(messages, 2500);
      const match = raw.match(/\[[\s\S]*\]/);
      flashcards = JSON.parse(match ? match[0] : raw);
    } catch(e) {
      flashcards = [{ question: 'Error parsing flashcards', answer: 'Please try again' }];
    }

    if (documentId) {
      try { const Document = require('../models/Document'); await Document.findByIdAndUpdate(documentId, { flashcards }); } catch(e) {}
      const cached = docStore.get(documentId);
      if (cached) docStore.set(documentId, { ...cached, flashcards });
    }
    res.json({ flashcards, count: flashcards.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// QUIZ
// ============================================================
router.post('/quiz', auth, async (req, res) => {
  try {
    const { documentId, text, topic, count = 5, difficulty = 'medium' } = req.body;
    let content = text || topic || '';

    if (documentId && !content) {
      let doc = null;
      try { const Document = require('../models/Document'); doc = await Document.findById(documentId); } catch(e) {}
      if (!doc) doc = docStore.get(documentId);
      if (doc) content = doc.extractedText || '';
    }

    if (!content) return res.status(400).json({ error: 'Please provide a topic to generate quiz from.' });

    const messages = [
      { role: 'system', content: 'You are an expert quiz creator. Respond ONLY with a valid JSON array.' },
      { role: 'user', content: `Create ${count} ${difficulty} multiple-choice questions about: "${content.substring(0, 6000)}"\n\nReturn ONLY JSON: [{"question":"...","options":["A","B","C","D"],"answer":"exact option text","explanation":"..."}]` }
    ];

    let questions = [];
    try {
      const raw = await callAI(messages, 2500);
      const match = raw.match(/\[[\s\S]*\]/);
      questions = JSON.parse(match ? match[0] : raw);
    } catch(e) {
      questions = [{ question: 'Error generating quiz.', options: ['Try again'], answer: 'Try again', explanation: '' }];
    }
    res.json({ questions, difficulty, count: questions.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// KNOWLEDGE MAP
// ============================================================
router.post('/knowledge-map', auth, async (req, res) => {
  try {
    const { topic, documentId, text } = req.body;
    let content = text || topic || '';
    if (documentId && !content) {
      let doc = null;
      try { const Document = require('../models/Document'); doc = await Document.findById(documentId); } catch(e) {}
      if (!doc) doc = docStore.get(documentId);
      if (doc) content = doc.extractedText?.substring(0, 2000) || '';
    }

    const messages = [
      { role: 'system', content: 'You are an expert at creating knowledge maps. Respond ONLY with valid JSON.' },
      { role: 'user', content: `Create a knowledge map for: "${content.substring(0, 500)}"\n\nReturn JSON: {"nodes":[{"id":1,"label":"...","type":"main|subtopic|concept"}],"edges":[{"from":1,"to":2,"label":"relates to"}]}\nCreate 10-15 nodes with meaningful connections.` }
    ];

    let map = {};
    try {
      const raw = await callAI(messages, 1500);
      const match = raw.match(/\{[\s\S]*\}/);
      map = JSON.parse(match ? match[0] : raw);
    } catch(e) {
      map = {
        nodes: [
          { id: 1, label: topic || 'Main Topic', type: 'main' },
          { id: 2, label: 'Core Concepts', type: 'subtopic' },
          { id: 3, label: 'Applications', type: 'subtopic' },
          { id: 4, label: 'Theory', type: 'concept' },
          { id: 5, label: 'Examples', type: 'concept' },
        ],
        edges: [
          { from: 1, to: 2, label: 'includes' },
          { from: 1, to: 3, label: 'applied in' },
          { from: 2, to: 4, label: 'based on' },
          { from: 2, to: 5, label: 'illustrated by' },
        ]
      };
    }
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// TEXT TO SPEECH
// ============================================================
router.post('/tts', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });
    const apiKey = (process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey || apiKey.length < 20) {
      return res.json({ audioUrl: null, message: 'TTS: use browser speech synthesis (no API key)' });
    }
    const { OpenAI } = require('openai');
    const openai = new OpenAI({ apiKey });
    const mp3 = await openai.audio.speech.create({ model: 'tts-1', voice: 'nova', input: text.substring(0, 1000) });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': buffer.length });
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// EXAM POINTS
// ============================================================
router.post('/exam-points', auth, async (req, res) => {
  try {
    const { documentId, text } = req.body;
    let content = text || '';
    if (documentId && !content) {
      let doc = null;
      try { const Document = require('../models/Document'); doc = await Document.findById(documentId); } catch(e) {}
      if (!doc) doc = docStore.get(documentId);
      if (doc) content = doc.extractedText || '';
    }
    if (!content) return res.status(400).json({ error: 'No document content found. Please upload a PDF first.' });

    const messages = [
      { role: 'system', content: 'You are an exam preparation expert for all levels of students.' },
      { role: 'user', content: `Extract the top 20 most important exam-focused points from this content. Format as numbered list with: point number, the key fact, and why it matters for exams.\n\nContent:\n${content.substring(0, 8000)}` }
    ];
    const examPoints = await callAI(messages, 2000);
    if (documentId) {
      try { const Document = require('../models/Document'); await Document.findByIdAndUpdate(documentId, { examPoints: [examPoints] }); } catch(e) {}
      const cached = docStore.get(documentId);
      if (cached) docStore.set(documentId, { ...cached, examPoints });
    }
    res.json({ examPoints, generatedAt: new Date() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Export docStore so documents.js can use it
// ============================================================
router.docStore = docStore;
module.exports = router;
