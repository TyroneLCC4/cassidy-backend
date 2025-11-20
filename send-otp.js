// Updated send-otp.js
const twilio = require("twilio");
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc } = require("firebase/firestore");
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

// Firebase config (use environment variables for secrets)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  projectId: process.env.FIREBASE_PROJECT_ID,
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "https://www.cassidyprime.store");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  try {
    const { contact, method } = req.body;
    if (!contact || !method) return res.status(400).json({ success: false, error: "Contact and method required." });
    if (!['whatsapp', 'email'].includes(method)) return res.status(400).json({ success: false, error: "Invalid method." });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in Firestore with expiry timestamp and method
    await setDoc(doc(db, "otps", contact), {
      otp,
      time: Date.now(),
      method
    });

    if (method === 'whatsapp') {
      const twilioPhone = contact.startsWith("+") ? contact : "+27" + contact.replace(/^0/, "");
      await client.messages.create({
        body: `Cassidy Prime Tech VIP OTP: ${otp} (valid 5 mins)`,
        from: "whatsapp:+14155238886",
        to: `whatsapp:${twilioPhone}`,
      });
    } else if (method === 'email') {
      await sgMail.send({
        to: contact,
        from: process.env.SENDGRID_FROM_EMAIL || 'info@cassidyprime.store',
        subject: 'Your OTP for Cassidy Prime VIP',
        text: `Cassidy Prime Tech VIP OTP: ${otp} (valid 5 mins)`,
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Send Error:", err.message);
    return res.status(500).json({ success: false, error: "Failed to send OTP." });
  }
};
