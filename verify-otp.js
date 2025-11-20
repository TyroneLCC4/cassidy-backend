// Updated verify-otp.js
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc, deleteDoc } = require("firebase/firestore");
const twilio = require("twilio");

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

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
    const { phone, otp } = req.body;
    const recordRef = doc(db, "otps", phone);
    const recordSnap = await getDoc(recordRef);

    if (recordSnap.exists()) {
      const record = recordSnap.data();
      if (record.otp === otp && (Date.now() - record.time) < 300000) {
        await deleteDoc(recordRef); // remove OTP after successful verification
        
        // Send discount code via WhatsApp
        const discountCode = "VIP20OFF";
        const twilioPhone = phone.startsWith("+") ? phone : "+27" + phone.replace(/^0/, "");
        await client.messages.create({
          body: `Congratulations! VIP Verified. Your 20% discount code is ${discountCode} - apply on your first bulk order at Cassidy Prime.`,
          from: "whatsapp:+14155238886",
          to: `whatsapp:${twilioPhone}`,
        });

        return res.status(200).json({ success: true });
      }
    }
    return res.status(401).json({ success: false, error: "Invalid or expired OTP." });
  } catch (err) {
    console.error("Verification Error:", err.message);
    return res.status(500).json({ success: false, error: "Verification failed." });
  }
};
