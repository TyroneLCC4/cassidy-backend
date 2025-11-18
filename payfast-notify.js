// api/payfast-notify.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://your-supabase-url.supabase.co',
  'your-anon-key'
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = req.body;
  if (body.payment_status === 'COMPLETE') {
    const orderId = body.m_payment_id;
    const isVIP = body.custom_str1 === 'VIP';

    // 1. Mark as permanent VIP
    if (isVIP) {
      await supabase.from('vips').upsert({ phone: body.cell_number || body.email_address, vip_until: '2099-12-31' });
    }

    // 2. Send WhatsApp Receipt
    await fetch('https://cassidy-backend.vercel.app/send-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: body.cell_number || `whatsapp:+27${body.email_address.split('@')[0]}`,
        name: `${body.name_first} ${body.name_last}`,
        amount: body.amount,
        orderId: orderId
      })
    });

    // 3. Update stock
    const items = JSON.parse(body.item_description.match(/\{.*\}/)?.[0] || '[]');
    for (let item of items) {
      await supabase.rpc('decrement_stock', { product_id: item.id, qty: item.qty });
    }
  }

  res.status(200).send('OK');
}