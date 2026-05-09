const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  avatar: { type: String, default: '' },
  studyGoal: { type: String, default: 'General Learning' },
  streak: { type: Number, default: 0 },
  lastStudyDate: { type: Date },
  totalStudyMinutes: { type: Number, default: 0 },
  notificationsEnabled: { type: Boolean, default: true },
  preferredStudyTime: { type: String, default: '09:00' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
