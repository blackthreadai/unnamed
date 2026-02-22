const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { kv } = require('@vercel/kv');

// Disable body parsing — Stripe needs the raw body for signature verification
module.exports.config = {
  api: { bodyParser: false }
};

function buffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on('data', (chunk) => chunks.push(chunk));
    readable.on('end', () => resolve(Buffer.concat(chunks)));
    readable.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const submissionId = session.metadata?.submissionId;

    if (submissionId) {
      // Update submission status to paid
      await kv.hset(`submission:${submissionId}`, {
        status: 'paid',
        paidAt: new Date().toISOString(),
        stripePaymentIntent: session.payment_intent,
        amountPaid: session.amount_total
      });

      console.log(`✅ Submission ${submissionId} marked as paid`);

      // TODO: Send email notification via Resend (resend.com)
      // Example:
      // const { Resend } = require('resend');
      // const resend = new Resend(process.env.RESEND_API_KEY);
      // await resend.emails.send({
      //   from: 'BuildMyIdea <noreply@yourdomain.com>',
      //   to: [session.customer_email, 'you@yourdomain.com'],
      //   subject: 'Build My Idea — Payment Received',
      //   html: `<p>Your idea is in the queue! We'll be in touch within 24 hours.</p>`
      // });
    }
  }

  return res.status(200).json({ received: true });
};
