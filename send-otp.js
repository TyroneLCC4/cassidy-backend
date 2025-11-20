// Updated send-otp.js using Twilio Verify (no Firebase for OTP)
const twilio = require("twilio");
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

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

    // Send OTP via Twilio Verify
    const channel = method === 'whatsapp' ? 'whatsapp' : 'email';
    const to = method === 'whatsapp' ? (contact.startsWith("+") ? contact : "+27" + contact.replace(/^0/, "")) : contact;
    await client.verify.v2.services(process.env.TWILIO_VERIFY_SID).verifications.create({
      channel,
      to
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Send Error:", err.message);
    return res.status(500).json({ success: false, error: "Failed to send OTP." });
  }
};
