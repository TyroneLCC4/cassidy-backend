const twilio = require("twilio");
const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

// Simple in-memory stores (only for demo/dev). Use Redis or DB in production.
const emailOtps = new Map(); // key: email, value: { code, expiresAt, attempts }
const rateLimits = new Map(); // key: ip or identifier, value: { count, resetAt }

const EMAIL_OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 10; // max requests per window per IP

function normalizePhone(contact) {
  // Accepts +country, 0-prefixed SA numbers, or plain SA local numbers
  let v = contact.trim();
  if (v.startsWith("+")) return v;
  // If looks like '0...' convert to +27...
  if (/^0\d+/.test(v)) return "+27" + v.replace(/^0/, "");
  // If just digits and 9 or 10 digits, assume South Africa
  if (/^\d{9,10}$/.test(v)) return "+27" + v.replace(/^0/, "");
  // fallback: return as-is (Twilio may reject invalid formats)
  return v;
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
}

function isRateLimited(key) {
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || entry.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count += 1;
  return false;
}

module.exports = async (req, res) => {
  // CORS - restrict in production
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  const origin = req.headers.origin || req.headers.referer || "*";
  if (allowedOrigins.length) {
    if (allowedOrigins.includes(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
    else return res.status(403).json({ success: false, error: "CORS origin not allowed" });
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*"); // DEV fallback
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // Simple env checks
    const requiredEnvs = ["TWILIO_SID", "TWILIO_TOKEN", "TWILIO_VERIFY_SID"];
    for (const v of requiredEnvs) {
      if (!process.env[v]) return res.status(500).json({ success: false, error: `Missing env ${v}` });
    }
    if (!process.env.SENDGRID_API_KEY) {
      // We'll still allow Twilio workflows; just warn in logs for email path
      // console.warn("SENDGRID_API_KEY missing; email sending will fail");
    }

    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    if (isRateLimited(ip)) return res.status(429).json({ success: false, error: "Too many requests" });

    const { contact, method } = req.body || {};
    if (!contact || !method) return res.status(400).json({ success: false, error: "Contact and method are required" });

    if (method !== "whatsapp" && method !== "sms" && method !== "email") {
      return res.status(400).json({ success: false, error: "Method must be one of: whatsapp, sms, email" });
    }

    if (method === "whatsapp" || method === "sms") {
      const phone = normalizePhone(contact);
      const channel = method === "whatsapp" ? "whatsapp" : "sms";

      // create verification via Twilio Verify
      await client.verify.v2
        .services(process.env.TWILIO_VERIFY_SID)
        .verifications.create({ to: phone, channel });

      return res.json({ success: true, method: channel });
    }

    // Email path: generate code, store it, send via SendGrid
    if (!process.env.SENDGRID_API_KEY) {
      return res.status(500).json({ success: false, error: "Email service not configured" });
    }

    const email = contact.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, error: "Invalid email address" });

    // Throttle per email too (simple)
    const existing = emailOtps.get(email);
    if (existing && existing.expiresAt > Date.now()) {
      // prevent resending too often
      const resendDelayMs = 60 * 1000; // 1 minute
      if (Date.now() - (existing.createdAt || 0) < resendDelayMs) {
        return res.status(429).json({ success: false, error: "OTP recently sent. Please wait before requesting again" });
      }
    }

    const code = generateOtp();
    const now = Date.now();
    emailOtps.set(email, { code, expiresAt: now + EMAIL_OTP_TTL_MS, createdAt: now, attempts: 0 });

    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM || "no-reply@example.com",
      subject: "Your verification code",
      text: `Your verification code is ${code}. It expires in 5 minutes.`,
      html: `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in 5 minutes.</p>`,
    };

    await sgMail.send(msg);
    return res.json({ success: true, method: "email" });
  } catch (err) {
    console.error("Send Error:", err && err.message ? err.message : err);
    return res.status(500).json({ success: false, error: "Failed to send OTP" });
  }
};

// Helper: verify email OTP (example endpoint you should add)
// POST /verify-email { email, code }
module.exports.verifyEmailOtp = (req, res) => {
  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ success: false, error: "Email and code required" });
  const entry = emailOtps.get(email.toLowerCase());
  if (!entry || entry.expiresAt < Date.now()) {
    emailOtps.delete(email.toLowerCase());
    return res.status(400).json({ success: false, error: "Code expired or not found" });
  }
  if (entry.attempts >= 5) {
    emailOtps.delete(email.toLowerCase());
    return res.status(429).json({ success: false, error: "Too many attempts" });
  }
  if (entry.code !== String(code)) {
    entry.attempts += 1;
    return res.status(400).json({ success: false, error: "Invalid code" });
  }
  emailOtps.delete(email.toLowerCase());
  return res.json({ success: true });
};
