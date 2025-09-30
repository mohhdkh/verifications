// server.js
import express from 'express';
import fetch from 'node-fetch';
import crypto from 'crypto';

const app = express();
app.use(express.json());

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const APPS_SCRIPT_SECRET = process.env.APPS_SCRIPT_SECRET;

// تخزين مؤقت للـ OTPs في الذاكرة
const otpStore = new Map(); // key: email:purpose => { otp, expiresAt }

// توليد OTP عشوائي 6 أرقام
function generateOTP() {
  return String(crypto.randomInt(100000, 1000000));
}

function key(email, purpose) {
  return `${email}:${purpose}`;
}

// صحة السيرفر
app.get('/', (_, res) => res.send('OTP Service running ✅'));

// إرسال OTP
app.post('/send-otp', async (req, res) => {
  try {
    const { email, purpose } = req.body || {};
    if (!email || !purpose) {
      return res.status(400).json({ success: false, message: 'missing email/purpose' });
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // صلاحية 10 دقائق
    otpStore.set(key(email, purpose), { otp, expiresAt });

    // إرسال OTP عبر Apps Script
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: APPS_SCRIPT_SECRET,
        email,
        code: otp,
        purpose
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!data || data.ok !== true) {
      return res.status(500).json({
        success: false,
        message: data?.error || 'Failed to send email via Apps Script',
      });
    }

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// التحقق من OTP
app.post('/verify-otp', (req, res) => {
  try {
    const { email, otp, purpose } = req.body || {};
    if (!email || !otp || !purpose) {
      return res.status(400).json({ success: false, message: 'missing email/otp/purpose' });
    }

    const record = otpStore.get(key(email, purpose));
    if (!record) return res.status(400).json({ success: false, message: 'OTP not found' });
    if (Date.now() > record.expiresAt) {
      otpStore.delete(key(email, purpose));
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }
    if (otp !== record.otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });

    otpStore.delete(key(email, purpose));
    res.json({ success: true, message: 'OTP verified' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
