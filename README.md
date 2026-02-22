# Build My Idea

AI-powered product builds in 7 days. Submit your idea, pay $1,500, and we build it.

**Live:** [unnamed-mocha.vercel.app](https://unnamed-mocha.vercel.app)

## Architecture

```
public/
  index.html      — Landing page with submission form
  success.html    — Post-payment confirmation
  cancel.html     — Payment cancelled
  admin.html      — Admin dashboard (password protected)
api/
  create-checkout.js  — Creates Stripe Checkout session, stores submission in KV
  webhook.js          — Stripe webhook, marks submissions as paid
  submissions.js      — Returns all submissions (admin, password-protected)
```

## Setup

### 1. Stripe

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Optionally create a Product + Price for $1,500 (or leave `STRIPE_PRICE_ID` unset to use dynamic pricing)
3. Get your **Secret Key** from Dashboard → Developers → API Keys
4. After deploying, set up a webhook endpoint:
   - URL: `https://your-domain.vercel.app/api/webhook`
   - Events: `checkout.session.completed`
   - Copy the **Webhook Signing Secret**

### 2. Vercel KV

1. In your Vercel project dashboard, go to **Storage** → **Create Database** → **KV**
2. Connect it to your project — this auto-sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`

### 3. Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

| Variable | Description |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |
| `STRIPE_PRICE_ID` | *(Optional)* Stripe Price ID. If unset, creates a $1,500 line item dynamically |
| `KV_REST_API_URL` | Auto-set when you connect Vercel KV |
| `KV_REST_API_TOKEN` | Auto-set when you connect Vercel KV |
| `ADMIN_PASSWORD` | Password for the admin dashboard |
| `SITE_URL` | Your deployed URL, e.g. `https://unnamed-mocha.vercel.app` |

### 4. Deploy

```bash
git add -A
git commit -m "Add Stripe payment flow + admin dashboard"
git push
```

Vercel auto-deploys from the connected repo.

### 5. Test

1. Use Stripe test mode keys
2. Submit an idea on the landing page
3. Complete payment with test card `4242 4242 4242 4242`
4. Check `/admin.html` to see the submission

## Email Notifications (TODO)

The webhook has a TODO for email integration via [Resend](https://resend.com). To enable:

1. Sign up at resend.com
2. Add `RESEND_API_KEY` env var
3. Install: `npm i resend`
4. Uncomment the email section in `api/webhook.js`
