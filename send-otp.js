const twilio = require("twilio");

// Initialize Twilio client with Vercel environment variables
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

// Temporary in-memory store (NOT persistent across invocations!)
const otps = new Map();

module.exports = async (req, res) => {
  // Always set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "https://www.cassidyprime.store");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: "Phone number required." });
    }

    // Generate OTP and store temporarily
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otps.set(phone, { otp, time: Date.now() });

    // Normalize phone number (assumes South African client if no '+' prefix)
    const twilioPhone = phone.startsWith("+") ? phone : "+27" + phone.replace(/^0/, "");

    // Send OTP via Twilio WhatsApp
    await client.messages.create({
      body: `Cassidy Prime Tech VIP OTP: ${otp} (valid 5 mins)`,
      from: "whatsapp:+14155238886", // Twilio sandbox or registered number
      to: `whatsapp:${twilioPhone}`,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Twilio Error:", err.message);
    return res.status(500).json({ success: false, error: "Failed to send OTP. Check logs." });
  }
};
