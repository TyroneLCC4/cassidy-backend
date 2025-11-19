module.exports = async (req, res) => {
    // 1. Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // We expect a POST request from the front-end
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    try {
        const clientData = req.body;
        
        // --- CRITICAL PERSISTENCE WARNING ---
        // IN A REAL APP: You would replace this console.log with a database write
        // to Firestore, MongoDB, or Vercel KV/Redis to save the order details.
        
        console.log("--- Quote Details Logged ---");
        console.log("Client:", clientData.name, "Email:", clientData.email);
        console.log("Items:", clientData.items.map(i => `${i.name} (x${i.qty})`));
        console.log("Total:", clientData.cart_total);
        console.log("----------------------------");

        // Respond successfully so the front-end can continue its flow
        res.status(200).json({ success: true, message: "Client and order details logged." });

    } catch (err) {
        // Log the error but still try to return a success to the client
        // to prevent the front-end flow from halting completely.
        console.error('Save Client Error:', err.message);
        res.status(500).json({ success: false, error: 'Internal logging failed.' });
    }
};
