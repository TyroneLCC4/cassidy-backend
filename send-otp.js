const twilio = require("twilio");
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc } = require("firebase/firestore");

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
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: "Phone number required." });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in Firestore with expiry timestamp
    await setDoc(doc(db, "otps", phone), {
      otp,
      time: Date.now(),
    });

    const twilioPhone = phone.startsWith("+") ? phone : "+27" + phone.replace(/^0/, "");
    await client.messages.create({
      body: `Cassidy Prime Tech VIP OTP: ${otp} (valid 5 mins)`,
      from: "whatsapp:+14155238886",
      to: `whatsapp:${twilioPhone}`,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Twilio Error:", err.message);
    return res.status(500).json({ success: false, error: "Failed to send OTP." });
  }
};
