const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const Interview = require('../models/Interview');

const uploadsDir = path.join(__dirname, '../../uploads/resumes');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `resume-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

async function callAI(messages, maxTokens = 1500) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes('demo-key') || apiKey.includes('replace')) {
    const last = messages[messages.length-1]?.content || '';
    if (last.includes('Generate interview questions')) {
      return JSON.stringify([
        { question: 'Tell me about yourself and why you\'re interested in this role.', category: 'Introduction' },
        { question: 'What are your key technical skills relevant to this position?', category: 'Technical' },
        { question: 'Describe a challenging project and how you handled it.', category: 'Behavioral' },
        { question: 'How do you prioritize tasks when working on multiple projects?', category: 'Behavioral' },
        { question: 'What do you know about our company and why do you want to work here?', category: 'Company Fit' }
      ]);
    }
    return '**Feedback**: Good answer! You covered the key points clearly. Focus on providing specific examples with measurable outcomes (STAR method). Score: 8/10. Strengths: Clear communication. Improvement: Add quantified results.';
  }
  const { OpenAI } = require('openai');
  const openai = new OpenAI({ apiKey });
  const resp = await openai.chat.completions.create({ model: 'gpt-4o', messages, max_tokens: maxTokens });
  return resp.choices[0].message.content;
}

// Create interview session
router.post('/start', auth, upload.single('resume'), async (req, res) => {
  try {
    const { company, role, jobDescription, resumeText } = req.body;
    if (!company || !role) return res.status(400).json({ error: 'Company and role required' });

    let extractedResume = resumeText || '';
    if (req.file) {
      try {
        const pdfParse = require('pdf-parse');
        const buf = fs.readFileSync(req.file.path);
        const data = await pdfParse(buf);
        extractedResume = data.text;
      } catch(e) { extractedResume = `Resume uploaded: ${req.file.originalname}`; }
    }

    const messages = [
      { role: 'system', content: 'You are an expert technical interviewer. Return JSON only.' },
      { role: 'user', content: `Generate interview questions for ${role} at ${company}.\nJob Description: ${jobDescription || 'Not provided'}\nResume: ${extractedResume.substring(0, 2000) || 'Not provided'}\n\nReturn JSON array with 5 objects having "question" and "category" fields.` }
    ];

    const aiResponse = await callAI(messages, 1000);
    let questions = [];
    try {
      const match = aiResponse.match(/\[[\s\S]*\]/);
      questions = JSON.parse(match ? match[0] : aiResponse);
    } catch(e) {
      questions = [
        { question: 'Tell me about yourself.', category: 'Introduction' },
        { question: 'What are your technical strengths?', category: 'Technical' },
        { question: 'Describe a challenging project.', category: 'Behavioral' }
      ];
    }

    let interview;
    try {
      interview = await Interview.create({
        user: req.userId, company, role, jobDescription: jobDescription || '',
        resumeText: extractedResume, resumeFile: req.file?.filename || '',
        status: 'in-progress',
        questions: questions.map(q => ({ ...q, userAnswer: '', feedback: '', score: 0 }))
      });
    } catch(e) {
      interview = { _id: Date.now().toString(), company, role, status: 'in-progress', questions: questions.map(q => ({ ...q, userAnswer: '', feedback: '', score: 0 })) };
    }

    res.status(201).json(interview);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit answer to a question
router.post('/:id/answer', auth, async (req, res) => {
  try {
    const { questionIndex, answer } = req.body;

    let interview;
    try { interview = await Interview.findById(req.params.id); } catch(e) { interview = null; }

    const question = interview?.questions?.[questionIndex];
    const qText = question?.question || req.body.question || 'General question';

    const messages = [
      { role: 'system', content: 'You are an expert interviewer providing constructive feedback.' },
      { role: 'user', content: `Question: ${qText}\nCandidate's Answer: ${answer}\n\nProvide feedback in this format:\n**Score**: X/10\n**Feedback**: [2-3 sentences]\n**Strengths**: [1-2 points]\n**Improvement**: [1-2 specific suggestions]` }
    ];

    const feedback = await callAI(messages, 500);
    const scoreMatch = feedback.match(/Score.*?(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 7;

    if (interview) {
      try {
        interview.questions[questionIndex].userAnswer = answer;
        interview.questions[questionIndex].feedback = feedback;
        interview.questions[questionIndex].score = score;
        await interview.save();
      } catch(e) {}
    }

    res.json({ feedback, score, questionIndex });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Complete interview with overall feedback
router.post('/:id/complete', auth, async (req, res) => {
  try {
    let interview;
    try { interview = await Interview.findById(req.params.id); } catch(e) { interview = null; }

    const avgScore = interview?.questions?.length > 0
      ? Math.round(interview.questions.reduce((sum, q) => sum + (q.score || 0), 0) / interview.questions.length)
      : 7;

    const messages = [
      { role: 'system', content: 'You are an expert career coach.' },
      { role: 'user', content: `The candidate completed a mock interview for ${interview?.role || 'Software Engineer'} at ${interview?.company || 'Tech Company'}. Average score: ${avgScore}/10. Provide: overall feedback, top 3 strengths, top 3 areas for improvement. Format clearly with headers.` }
    ];

    const overallFeedback = await callAI(messages, 600);

    if (interview) {
      try {
        interview.status = 'completed';
        interview.overallScore = avgScore;
        interview.overallFeedback = overallFeedback;
        await interview.save();
      } catch(e) {}
    }

    res.json({ overallScore: avgScore, overallFeedback, status: 'completed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List interviews
router.get('/', auth, async (req, res) => {
  try {
    let items;
    try { items = await Interview.find({ user: req.userId }).select('-resumeText').sort({ createdAt: -1 }); } catch(e) { items = []; }
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
