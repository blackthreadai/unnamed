const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getRedis } = require('./_redis');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { idea, email, paymentMethod } = req.body;

    if (!idea || !email) {
      return res.status(400).json({ error: 'Idea and email are required' });
    }

    const kv = getRedis();
    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Store submission
    await kv.hset(`submission:${submissionId}`, {
      id: submissionId,
      idea,
      email,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    // Add to submissions index
    await kv.lpush('submissions:list', submissionId);

    // Crypto payment — just store and confirm
    if (paymentMethod === 'crypto') {
      await kv.hset(`submission:${submissionId}`, {
        status: 'pending_crypto',
        paymentMethod: 'crypto'
      });
      return res.status(200).json({ success: true, message: 'Crypto submission received' });
    }

    const siteUrl = process.env.SITE_URL || 'https://unnamed-mocha.vercel.app';

    const sessionParams = {
      payment_method_types: ['card'],
      customer_email: email,
      metadata: {
        submissionId,
        idea: idea.substring(0, 500)
      },
      success_url: `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cancel.html`,
      mode: 'payment'
    };

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
            name: 'BlackThread AI — 7-Day AI Build',
            description: 'Custom AI-powered product build. Code, IP, everything — yours.'
          },
          unit_amount: 150000
        },
        quantity: 1
      }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    await kv.hset(`submission:${submissionId}`, { stripeSessionId: session.id });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
};
