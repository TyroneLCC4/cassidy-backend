const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc, deleteDoc } = require("firebase/firestore");

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
        return res.status(200).json({ success: true });
      }
    }
    return res.status(401).json({ success: false, error: "Invalid or expired OTP." });
  } catch (err) {
    console.error("Verification Error:", err.message);
    return res.status(500).json({ success: false, error: "Verification failed." });
  }
};
