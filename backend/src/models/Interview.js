const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: String, required: true },
  role: { type: String, required: true },
  jobDescription: { type: String, default: '' },
  resumeText: { type: String, default: '' },
  resumeFile: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
  questions: [{
    question: String,
    userAnswer: String,
    feedback: String,
    score: Number,
    category: String
  }],
  overallScore: { type: Number, default: 0 },
  overallFeedback: { type: String, default: '' },
  strengths: [{ type: String }],
  improvements: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Interview', interviewSchema);
