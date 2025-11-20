// Updated verify-otp.js using Twilio Verify
const admin = require("firebase-admin");
const twilio = require("twilio");
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

// Initialize Firebase Admin SDK (for custom token only)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "https://www.cassidyprime.store");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  try {
    const { contact, otp } = req.body;

    // Verify OTP with Twilio Verify
    const check = await client.verify.v2.services(process.env.TWILIO_VERIFY_SID).verificationChecks.create({
      code: otp,
      to: contact.includes('@') ? contact : (contact.startsWith("+") ? contact : "+27" + contact.replace(/^0/, ""))
    });

    if (check.status !== 'approved') {
      return res.status(401).json({ success: false, error: "Invalid or expired OTP." });
    }

    // Generate custom Firebase token with claims
    const uid = contact.replace(/\D/g, ''); // Example: strip non-digits for UID
    const additionalClaims = {
      vip: true, // Add VIP claim
      contact: contact, // Optional: store contact in claims
      verifiedAt: Date.now()
    };
    const customToken = await admin.auth().createCustomToken(uid, additionalClaims);

    // Determine method based on contact format
    const method = contact.includes('@') ? 'email' : 'whatsapp';
    const discountCode = "VIP20OFF";

    // Send discount code
    if (method === 'whatsapp') {
      const twilioPhone = contact.startsWith("+") ? contact : "+27" + contact.replace(/^0/, "");
      await client.messages.create({
        body: `Congratulations! VIP Verified. Your 20% discount code is ${discountCode} - apply on your first bulk order at Cassidy Prime.`,
        from: "whatsapp:+14155238886",
        to: `whatsapp:${twilioPhone}`,
      });
    } else if (method === 'email') {
      await sgMail.send({
        to: contact,
        from: process.env.SENDGRID_FROM_EMAIL || 'info@cassidyprime.store',
        subject: 'Your VIP Discount Code for Cassidy Prime',
        text: `Congratulations! VIP Verified. Your 20% discount code is ${discountCode} - apply on your first bulk order at Cassidy Prime.`,
      });
    }

    return res.status(200).json({ success: true, customToken });
  } catch (err) {
    console.error("Verification Error:", err.message);
    return res.status(500).json({ success: false, error: "Verification failed." });
  }
};
