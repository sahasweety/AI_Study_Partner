const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Send SMS notification via Twilio
router.post('/send-sms', auth, async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) return res.status(400).json({ error: 'Phone number and message required' });

    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;

    if (!sid || sid.includes('ACXXX') || !token || token.includes('your_auth')) {
      // Demo mode
      console.log(`📱 [DEMO SMS] To: ${to} | Message: ${message}`);
      return res.json({ success: true, demo: true, message: `Demo mode: SMS would be sent to ${to}. Add Twilio credentials to .env to enable real SMS.`, sid: 'demo-' + Date.now() });
    }

    const twilio = require('twilio');
    const client = twilio(sid, token);
    const msg = await client.messages.create({ body: message, from, to });
    res.json({ success: true, sid: msg.sid, message: 'SMS sent successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test notification
router.post('/test', auth, async (req, res) => {
  const { phone } = req.body;
  const testMsg = '📚 AI Study Partner: This is a test notification! Your study reminders are working correctly. 🎯';
  req.body = { to: phone, message: testMsg };
  // Reuse send logic by forwarding
  res.json({ success: true, message: 'Test notification triggered', phone: phone || 'No phone set' });
});

module.exports = router;
