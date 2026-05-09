const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['chat', 'voice', 'interview'], default: 'chat' },
  title: { type: String, default: 'New Session' },
  document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  messages: [{
    role: { type: String, enum: ['user', 'assistant', 'system'] },
    content: { type: String },
    timestamp: { type: Date, default: Date.now },
    audioUrl: { type: String }
  }],
  durationMinutes: { type: Number, default: 0 },
  subject: { type: String, default: 'General' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Session', sessionSchema);
