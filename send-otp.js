import twilio from "twilio";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://www.cassidyprime.store");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { contact, method } = req.body;

    const channel = method === "whatsapp" ? "whatsapp" : "email";
    const to = method === "whatsapp" 
      ? (contact.startsWith("+") ? contact : "+27" + contact.replace(/^0/, ""))
      : contact;

    try {
      await client.verify.v2
        .services(process.env.TWILIO_VERIFY_SID)
        .verifications.create({ to, channel });

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "Failed to send OTP" });
    }
  }
}
