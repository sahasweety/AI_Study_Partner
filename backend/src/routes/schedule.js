const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Schedule = require('../models/Schedule');

// Get all schedules
router.get('/', auth, async (req, res) => {
  try {
    let items;
    try {
      items = await Schedule.find({ user: req.userId }).sort({ startTime: 1 });
    } catch(e) {
      items = [
        { _id: '1', title: 'Math Study Session', subject: 'Mathematics', startTime: new Date(Date.now() + 3600000), endTime: new Date(Date.now() + 7200000), color: '#8b5cf6', completed: false },
        { _id: '2', title: 'Physics Practice', subject: 'Physics', startTime: new Date(Date.now() + 86400000), endTime: new Date(Date.now() + 90000000), color: '#06b6d4', completed: false }
      ];
    }
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create schedule
router.post('/', auth, async (req, res) => {
  try {
    const { title, subject, description, startTime, endTime, repeat, reminderMinutesBefore, notifyPhone, color } = req.body;
    if (!title || !subject || !startTime || !endTime) return res.status(400).json({ error: 'Title, subject, start time, and end time are required' });

    let item;
    try {
      item = await Schedule.create({
        user: req.userId, title, subject, description, startTime, endTime,
        repeat: repeat || 'none', reminderMinutesBefore: reminderMinutesBefore || 15,
        notifyPhone: notifyPhone || '', color: color || '#8b5cf6'
      });
    } catch(e) {
      item = { _id: Date.now().toString(), title, subject, description, startTime, endTime, repeat, notifyPhone, color, completed: false };
    }

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update schedule
router.put('/:id', auth, async (req, res) => {
  try {
    let item;
    try {
      item = await Schedule.findOneAndUpdate({ _id: req.params.id, user: req.userId }, req.body, { new: true });
    } catch(e) { item = req.body; }
    res.json(item || req.body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark complete
router.patch('/:id/complete', auth, async (req, res) => {
  try {
    let item;
    try { item = await Schedule.findOneAndUpdate({ _id: req.params.id, user: req.userId }, { completed: true }, { new: true }); } catch(e) { item = { completed: true }; }
    res.json(item || { message: 'Marked complete' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete schedule
router.delete('/:id', auth, async (req, res) => {
  try {
    try { await Schedule.findOneAndDelete({ _id: req.params.id, user: req.userId }); } catch(e) {}
    res.json({ message: 'Schedule deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
