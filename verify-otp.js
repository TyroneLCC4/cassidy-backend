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
        return; // Important!
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    try {
        const { phone, otp } = req.body;
        
        // 2. Verification Logic
        const record = otps.get(phone); // <-- THIS IS THE LINE THAT CAUSES THE LOGIC FAILURE
        
        // Check if record exists, OTP matches, and is within the 5-minute (300,000 ms) window
        if (record && record.otp === otp && (Date.now() - record.time) < 300000) {
            otps.delete(phone);
            res.status(200).json({ success: true });
        } else {
            res.status(401).json({ success: false, error: 'Invalid or expired OTP.' });
        }
    } catch (err) {
        console.error('Verification Error:', err.message);
        res.status(500).json({ success: false, error: 'Verification failed.' });
    }
};
