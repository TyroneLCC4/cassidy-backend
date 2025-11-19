// NOTE: This endpoint is called by PayFast's server, NOT by your front-end.
module.exports = async (req, res) => {
    // PayFast uses POST requests for notifications
    if (req.method !== 'POST') {
        return res.status(405).end();
    }

    try {
        const pfData = req.body;

        // --- CRITICAL SECURITY WARNING ---
        // IN A REAL APP: You MUST validate the payment signature (pf_signature) 
        // to ensure the request is genuinely from PayFast and hasn't been tampered with.
        
        console.log("--- PayFast Notification Received ---");
        console.log("Payment ID (m_payment_id):", pfData.m_payment_id);
        console.log("Payment Status:", pfData.payment_status);
        console.log("Amount Paid:", pfData.amount_gross);
        console.log("-------------------------------------");

        // PayFast requires a simple 200 OK response to confirm successful receipt of the notification
        res.status(200).end(); 

    } catch (err) {
        console.error('PayFast Notify Error:', err.message);
        res.status(500).end();
    }
};
