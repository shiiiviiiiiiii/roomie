// In-app notifications, persisted to the Firestore `notifications`
// collection. Fire-and-forget safe: failures are logged, never thrown.
const store = require('../store');

async function notify(userId, { type, title, body, link }) {
  try {
    await store.addNotification(userId, { type, title, body, link });
  } catch (e) {
    console.error('notify failed:', e.message);
  }
}

// ---------------------------------------------------------------------------
// STUB: email sending. Wire a real provider (SMTP / Resend / SES) by setting
// SMTP_HOST etc. in .env and implementing sendMail() below. Until then every
// call is logged and reported as stubbed — nothing is sent.
// ---------------------------------------------------------------------------
async function sendMail({ to, subject, text }) {
  console.log(`[mail-stub] to=${to} subject=${subject}`);
  return { sent: false, stub: true, reason: 'Email provider not configured (see .env.example)' };
}

// ---------------------------------------------------------------------------
// STUB: SMS sending (e.g. Twilio / MSG91). Set TWILIO_* in .env and implement.
// ---------------------------------------------------------------------------
async function sendSms({ to, text }) {
  console.log(`[sms-stub] to=${to} text=${text}`);
  return { sent: false, stub: true, reason: 'SMS provider not configured (see .env.example)' };
}

// ---------------------------------------------------------------------------
// STUB: push notifications (e.g. Web Push / FCM). Set VAPID_* / FCM_* in .env.
// ---------------------------------------------------------------------------
async function sendPush({ userId, title, body }) {
  console.log(`[push-stub] user=${userId} title=${title}`);
  return { sent: false, stub: true, reason: 'Push provider not configured (see .env.example)' };
}

module.exports = { notify, sendMail, sendSms, sendPush };
