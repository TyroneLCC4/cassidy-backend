const twilio = require('twilio');

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

// Temporary in-memory store (NOT persistent across invocations!)
const otps = new Map();

module.exports = async (req, res) => {
  // Always set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "https://www.cassidyprime.store");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const { phone, otp } = req.body;

    // ⚠️ This will fail on Vercel because otps is empty on each invocation
    const record = otps.get(phone);

    if (record && record.otp === otp && (Date.now() - record.time) < 300000) {
      otps.delete(phone);
      return res.status(200).json({ success: true });
    } else {
      return res.status(401).json({ success: false, error: "Invalid or expired OTP." });
    }
  } catch (err) {
    console.error("Verification Error:", err.message);
    return res.status(500).json({ success: false, error: "Verification failed." });
  }
};
