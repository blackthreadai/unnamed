const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { idea, email } = req.body;

    if (!idea || !email) {
      return res.status(400).json({ error: 'Idea and email are required' });
    }

    // Generate a submission ID
    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Store submission in Vercel KV
    await kv.hset(`submission:${submissionId}`, {
      id: submissionId,
      idea,
      email,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    // Add to submissions index
    await kv.lpush('submissions:list', submissionId);

    const siteUrl = process.env.SITE_URL || 'https://unnamed-mocha.vercel.app';

    // Create Stripe Checkout session
    const sessionParams = {
      payment_method_types: ['card'],
      customer_email: email,
      metadata: {
        submissionId,
        idea: idea.substring(0, 500) // Stripe metadata limit
      },
      success_url: `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cancel.html`,
      mode: 'payment'
    };

    // Use STRIPE_PRICE_ID if set, otherwise create a one-time price
    if (process.env.STRIPE_PRICE_ID) {
      sessionParams.line_items = [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1
      }];
    } else {
      sessionParams.line_items = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Build My Idea — 7-Day AI Build',
            description: 'Custom AI-powered product build. Code, IP, everything — yours.'
          },
          unit_amount: 150000 // $1,500.00
        },
        quantity: 1
      }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Store Stripe session ID on submission
    await kv.hset(`submission:${submissionId}`, {
      stripeSessionId: session.id
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
};
