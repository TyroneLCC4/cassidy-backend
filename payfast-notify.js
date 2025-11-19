// api/payfast-notify.js
const crypto = require('crypto');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const pfData = req.body; // Vercel parses JSON/UrlEncoded automatically usually
    const pfParamString = req.body.toString(); // Raw body might be needed depending on setup
    
    console.log("PayFast ITN Received:", pfData);

    // 1. VALIDATE SIGNATURE
    // We must recreate the signature to ensure this request actually came from PayFast
    // and wasn't faked by a hacker.
    const pfPassphrase = "AuTiSmPOWeR852"; // MUST match your frontend/PayFast account
    
    let pfOutput = "";
    for (let key in pfData) {
        if (key !== 'signature') {
            // PayFast expects spaces to be + in the signature generation
            pfOutput += `${key}=${encodeURIComponent(pfData[key].trim()).replace(/%20/g, "+")}&`;
        }
    }
    // Remove last &
    pfOutput = pfOutput.slice(0, -1);
    if (pfPassphrase) {
        pfOutput += `&passphrase=${encodeURIComponent(pfPassphrase).replace(/%20/g, "+")}`;
    }

    const signature = crypto.createHash('md5').update(pfOutput).digest('hex');

    if (pfData.signature !== signature) {
        console.error("Invalid Signature - Possible Hack Attempt");
        return res.status(400).send('Invalid Signature');
    }

    // 2. CHECK PAYMENT STATUS
    if (pfData.payment_status === "COMPLETE") {
        console.log(`Payment Successful! Order ID: ${pfData.m_payment_id}`);
        
        // TODO: SAVE TO DATABASE
        // await db.collection('orders').doc(pfData.m_payment_id).update({ status: 'paid', amount: pfData.amount_gross });
        
        // TODO: EMAIL CUSTOMER
        // sendConfirmationEmail(pfData.email_address);
    }

    // 3. ALWAYS RETURN 200 OK
    // If you don't return 200, PayFast will keep retrying the request for days.
    res.status(200).send('OK');
};
