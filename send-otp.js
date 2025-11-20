// pages/api/send-otp.js (or your serverless route)
import twilio from "twilio";
import sgMail from "@sendgrid/mail";

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://www.cassidyprime.store";

// Validate env early and lazily init clients to avoid crashes at import time
function initClients() {
  const sendGridKey = process.env.SENDGRID_API_KEY;
  const twilioSid = process.env.TWILIO_SID;
  const twilioToken = process.env.TWILIO_TOKEN;
  const twilioVerifySid = process.env.TWILIO_VERIFY_SID;

  if (!twilioSid || !twilioToken || !twilioVerifySid) {
    throw new Error("Missing Twilio configuration (TWILIO_SID, TWILIO_TOKEN, TWILIO_VERIFY_SID)");
  }
  if (!sendGridKey) {
    console.warn("SENDGRID_API_KEY not set — email fallback won't work");
  }

  sgMail.setApiKey(sendGridKey || "");
  const client = twilio(twilioSid, twilioToken);
  return { client, twilioVerifySid };
}

function normalizePhoneForSA(input) {
  // Accept formats: +2770..., 072..., 727..., etc.
  if (!input) return "";
  let p = String(input).trim();
  // if already starts with + keep it
  if (p.startsWith("+")) return p;
  // remove non-digits
  p = p.replace(/\D/g, "");
  // if starts with 0, replace leading zero with 27
  if (p.startsWith("0")) p = "27" + p.slice(1);
  // ensure leading + for Twilio
  return p.length ? `+${p}` : "";
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use POST." });
  }

  // parse body safely (Next.js provides parsed body; this is defensive)
  const body = req.body && Object.keys(req.body).length ? req.body : await new Promise((resolve) => {
    let data = "";
    req.on("data", chunk => data += chunk);
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
    });
    req.on("error", () => resolve({}));
  });

  const contact = body?.contact && String(body.contact).trim();
  const method = body?.method && String(body.method).trim().toLowerCase();

  if (!contact || !method || !["whatsapp", "email"].includes(method)) {
    return res.status(400).json({ success: false, error: "Invalid payload. Provide { contact, method: 'whatsapp'|'email' }" });
  }

  // Init clients (throws if Twilio config missing)
  let client, twilioVerifySid;
  try {
    ({ client, twilioVerifySid } = initClients());
  } catch (err) {
    console.error("Init error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }

  // Determine destination and channel
  const channel = method === "whatsapp" ? "whatsapp" : "sms";
  const to = method === "whatsapp"
    ? normalizePhoneForSA(contact) // twilio expects +<country><number> with whatsapp: prefix not needed for verify
    : contact; // for email we keep as provided

  if (method === "whatsapp" && !/^\+\d{8,15}$/.test(to)) {
    return res.status(400).json({ success: false, error: "Invalid phone format for WhatsApp. Use +2770... or 072..." });
  }
  if (method === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return res.status(400).json({ success: false, error: "Invalid email format." });
  }

  try {
    if (method === "whatsapp" || method === "sms") {
      // Use Twilio Verify to send OTP via chosen channel
      await client.verify.v2.services(twilioVerifySid)
        .verifications.create({ to, channel }); // channel: 'sms' or 'whatsapp'
      return res.status(200).json({ success: true });
    }

    // Email fallback (if you want to send OTP via email instead of Twilio Verify)
    // This path will send a simple message; OTP generation/verification must be implemented separately.
    if (method === "email") {
      if (!process.env.SENDGRID_API_KEY) {
        return res.status(500).json({ success: false, error: "SendGrid not configured on server." });
      }
      // Create a short-lived OTP on the server and send via SendGrid (example only)
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const msg = {
        to,
        from: process.env.SENDGRID_FROM || "no-reply@cassidyprime.store",
        subject: "Your Cassidy Prime OTP",
        text: `Your verification code is: ${otp}. It expires in 5 minutes.`,
        html: `<p>Your verification code is: <strong>${otp}</strong></p><p>It expires in 5 minutes.</p>`
      };
      await sgMail.send(msg);
      // Persist OTP mapping on server-side store (Firestore/Redis/DB) so verify endpoint can validate it.
      return res.status(200).json({ success: true, debugOtp: process.env.NODE_ENV !== "production" ? otp : undefined });
    }

    return res.status(400).json({ success: false, error: "Unsupported method" });
  } catch (err) {
    console.error("Send OTP error:", err);
    // Twilio errors often include .code and .message
    const message = (err && err.message) ? err.message : "Failed to send OTP";
    return res.status(500).json({ success: false, error: message });
  }
}
