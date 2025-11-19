const twilio = require('twilio');

// Initialize the client globally using Vercel Environment Variables.
// CRITICAL: Ensure your Vercel secrets are named TWILIO_SID and TWILIO_TOKEN
// to match this code, or change the code to match your secret names (e.g., TWILIO_ACCOUNT_SID).
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

// --- CRITICAL PERSISTENCE WARNING ---
// This temporary Map will ONLY hold the OTP in memory for the duration of the
// *single* serverless invocation. It will be empty when the verification
// request comes in. THIS MUST BE REPLACED WITH A DATABASE (like Redis/KV)
// FOR PRODUCTION RELIABILITY.
const otps = new Map(); 

module.exports = async (req, res) => {
    // 1. Set CORS headers (needed for the frontend to communicate with this function)
    res.setHeader('Access-Control-Allow-Origin', '[https://www.cassidyprime.store](https://www.cassidyprime.store)');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle OPTIONS pre-flight request
    if (req.method === 'OPTIONS') {
       res.status(200).send();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ success: false, error: 'Phone number required.' });
        }

        // 2. OTP Generation and Storage (NON-PERSISTENT!)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otps.set(phone, { otp, time: Date.now() });

        // Normalize phone number (assumes South African client (+27) if no '+' prefix)
        const twilioPhone = phone.startsWith('+') ? phone : '+27' + phone.replace(/^0/, '');

        // 3. Twilio API Call
        await client.messages.create({
            body: `Cassidy Prime Tech VIP OTP: ${otp} (valid 5 mins)`,
            from: 'whatsapp:+14155238886', // Your Twilio sandbox or registered number
            to: `whatsapp:${twilioPhone}`
        });

        res.status(200).json({ success: true });

    } catch (err) {
        console.error('Twilio Error:', err.message);
        // Return a generic 500 failure if the API call or logic fails
        res.status(500).json({ success: false, error: 'Failed to send OTP. Check logs.' });
    }
};
