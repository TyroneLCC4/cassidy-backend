// api/verify-otp.js
import twilio from "twilio";
import sgMail from "@sendgrid/mail";
import admin from "firebase-admin";

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Initialize Twilio
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "https://www.cassidyprime.store");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { contact, otp } = req.body;
    if (!contact || !otp) {
      return res.status(400).json({ success: false, error: "Contact and OTP required" });
    }

    // Normalize phone number
    const to = contact.includes("@")
      ? contact
      : contact.startsWith("+")
      ? contact
      : "+27" + contact.replace(/^0/, "");

    // Verify OTP using Twilio Verify
    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verificationChecks.create({ to, code: otp });

    if (verificationCheck.status !== "approved") {
      return res.status(401).json({ success: false, error: "Invalid or expired OTP" });
    }

    // Generate Firebase Custom Token with VIP claim
    const uid = to.replace(/\D/g, ""); // Simple UID from phone/email
    const customToken = await admin.auth().createCustomToken(uid, {
      vip: true,
      contact: to,
      verifiedAt: Date.now(),
    });

    // Send discount code
    const discountCode = "VIP20OFF";
    const message = `Congratulations! VIP Verified.\nYour 20% discount code is ${discountCode}\nUse it on your first bulk order at Cassidy Prime.`;

    if (!contact.includes("@")) {
      // WhatsApp
      await client.messages.create({
        body: message,
        from: "whatsapp:+14155238886",
        to: `whatsapp:${to}`,
      });
    } else {
      // Email
      await sgMail.send({
        to: contact,
        from: process.env.SENDGRID_FROM_EMAIL || "info@cassidyprime.store",
        subject: "Your VIP Discount Code – Cassidy Prime",
        text: message,
      });
    }

    return res.json({ success: true, customToken });
  } catch (error) {
    console.error("Verify OTP Error:", error.message);
    return res.status(500).json({ success: false, error: "Verification failed" });
  }
}
