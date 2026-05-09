const cron = require('node-cron');

let Schedule, twilioClient;
try { Schedule = require('../models/Schedule'); } catch(e) {}

function setupTwilio() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (sid && token && !sid.includes('ACXXX')) {
    try {
      const twilio = require('twilio');
      twilioClient = twilio(sid, token);
    } catch(e) {}
  }
}

async function sendSMS(to, message) {
  if (!twilioClient) {
    console.log(`📱 [SMS Reminder] To: ${to} | ${message}`);
    return;
  }
  try {
    await twilioClient.messages.create({ body: message, from: process.env.TWILIO_PHONE_NUMBER, to });
    console.log(`✅ SMS sent to ${to}`);
  } catch(e) {
    console.error('SMS error:', e.message);
  }
}

// Run every minute to check upcoming study sessions
cron.schedule('* * * * *', async () => {
  if (!Schedule) return;
  try {
    const now = new Date();
    const checkWindow = new Date(now.getTime() + 16 * 60 * 1000); // 16 minutes ahead

    const upcoming = await Schedule.find({
      startTime: { $gte: now, $lte: checkWindow },
      notificationSent: false,
      notifyPhone: { $ne: '' }
    }).populate('user');

    for (const sched of upcoming) {
      const minutesLeft = Math.round((new Date(sched.startTime) - now) / 60000);
      const msg = `📚 AI Study Partner Reminder:\n\nTime to study: "${sched.title}" (${sched.subject})\nStarting in ${minutesLeft} minute(s)\n\nYou've got this! 💪`;
      await sendSMS(sched.notifyPhone, msg);
      await Schedule.findByIdAndUpdate(sched._id, { notificationSent: true });
    }
  } catch(e) {
    // Silent fail - DB may not be connected
  }
});

setupTwilio();
console.log('⏰ Study reminder scheduler started (runs every minute)');
