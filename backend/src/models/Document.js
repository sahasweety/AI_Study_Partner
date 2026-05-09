const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  path: { type: String, required: true },
  size: { type: Number },
  pages: { type: Number, default: 0 },
  extractedText: { type: String, default: '' },
  summary: { type: String, default: '' },
  examPoints: [{ type: String }],
  flashcards: [{
    question: String,
    answer: String
  }],
  keywords: [{ type: String }],
  processed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Document', documentSchema);
