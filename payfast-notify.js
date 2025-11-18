export default function handler(req, res) {
    if (req.method === 'POST') {
        console.log("Payment confirmed:", req.body);
        // Here: Send WhatsApp confirmation, update stock, mark as VIP forever
        res.status(200).send("OK");
    }
}
