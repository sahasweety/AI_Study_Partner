const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  subject: { type: String, required: true },
  description: { type: String, default: '' },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  repeat: { type: String, enum: ['none', 'daily', 'weekly'], default: 'none' },
  reminderMinutesBefore: { type: Number, default: 15 },
  notifyPhone: { type: String, default: '' },
  notifyEmail: { type: Boolean, default: true },
  color: { type: String, default: '#8b5cf6' },
  completed: { type: Boolean, default: false },
  notificationSent: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Schedule', scheduleSchema);
