// --- CRITICAL PERSISTENCE WARNING ---
// As mentioned, this Map is independent of the one in send-otp.js and 
// will be empty. The verification will fail until a database is used.
const otps = new Map(); 

module.exports = async (req, res) => {
    // 1. Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
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
