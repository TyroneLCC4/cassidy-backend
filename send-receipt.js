// api/send-receipt.js
export default async function handler(req, res) {
  const { to, name, amount, orderId } = req.body;

  const message = `Cassidy Prime Tech

Thank you, ${name}!

Your luxury order #${orderId.substring(8)} has been confirmed!

Total Paid: R${amount}
VIP Status: ACTIVE (30% off forever)

We are preparing your exclusive items with gold-embossed packaging.

Track: https://cassidyprime.store/track/${orderId}

Support: +27 60 559 3244 (WhatsApp)`;

  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(process.env.TWILIO_SID + ':' + process.env.TWILIO_TOKEN),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      To: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
      From: 'whatsapp:+14155238886',
      Body: message
    })
  });

  res.json({ success: true });
}