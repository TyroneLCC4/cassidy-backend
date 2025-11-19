require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const app = express();
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json());

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
const otps = new Map(); // Better than object for production

app.post('/send-otp', (req, res) => {
  const { phone } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otps.set(phone, { otp, time: Date.now() });

  client.messages.create({
    body: `Cassidy Prime Tech VIP OTP: ${otp} (valid 5 mins)`,
    from: 'whatsapp:+14155238886', // Twilio sandbox
    to: `whatsapp:${phone.startsWith('+') ? phone : '+27' + phone.replace(/^0/, '')}`
  })
  .then(() => res.json({ success: true }))
  .catch(err => {
    console.error(err);
    res.json({ success: false, error: err.message });
  });
});

app.post('/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  const record = otps.get(phone);
  if (record && record.otp === otp && (Date.now() - record.time) < 300000) {
    otps.delete(phone);
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Backend live on port ${port}`));

app.post('/save-vip', (req, res) => {
  const { phone } = req.body;
  // Save to Supabase or local DB here
  res.json({ success: true });
});
