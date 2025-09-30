// server.js
import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

// استخدم متغيرات البيئة فقط، لا تضع الرابط أو السر مباشرة
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const APPS_SCRIPT_SECRET = process.env.APPS_SCRIPT_SECRET;

app.post('/send-otp', async (req, res) => {
  try {
    const { email, code, purpose } = req.body;
    if (!email || !code) return res.status(400).json({ ok: false, error: 'Missing email/code' });

    if (!APPS_SCRIPT_URL || !APPS_SCRIPT_SECRET) {
      return res.status(500).json({ ok: false, error: 'Server not configured properly' });
    }

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: APPS_SCRIPT_SECRET, email, code, purpose })
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/', (req, res) => res.send('OTP Service running ✅'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
