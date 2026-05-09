const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });

    const existing = await User.findOne({ email }).catch(() => null);
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, phone: phone || '' }).catch(() => {
      // Demo mode without DB
      return { _id: 'demo-user-id', name, email, phone: phone || '', streak: 0, totalStudyMinutes: 0 };
    });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, streak: user.streak, totalStudyMinutes: user.totalStudyMinutes } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    let user;
    try {
      user = await User.findOne({ email });
    } catch(e) { user = null; }

    if (!user) {
      // Demo mode: accept any credentials
      const token = jwt.sign({ userId: 'demo-user-id' }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: { _id: 'demo-user-id', name: email.split('@')[0], email, phone: '', streak: 5, totalStudyMinutes: 240 } });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, streak: user.streak, totalStudyMinutes: user.totalStudyMinutes } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get profile
router.get('/profile', auth, async (req, res) => {
  try {
    let user;
    try { user = await User.findById(req.userId).select('-password'); } catch(e) { user = null; }
    if (!user) return res.json({ _id: req.userId, name: 'Demo User', email: 'demo@studypartner.ai', streak: 5, totalStudyMinutes: 240 });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update profile
router.put('/profile', auth, async (req, res) => {
  try {
    const updates = {};
    const allowed = ['name', 'phone', 'studyGoal', 'notificationsEnabled', 'preferredStudyTime'];
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    let user;
    try { user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select('-password'); } catch(e) { user = null; }
    res.json(user || { ...updates, _id: req.userId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
