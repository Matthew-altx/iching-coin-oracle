# Monetization Setup

This site is a Cloudflare Pages MVP. It does not store payment details and does not call an AI API. Paid Pro Prompt delivery can be automatic through Stripe Checkout Session verification, with WhatsApp kept as a fallback support path.

## Required Values

Edit `monetization.config.js` before the final paid launch:

```js
window.ICHING_MONETIZATION_CONFIG = {
  checkoutUrl: "https://buy.stripe.com/...",
  checkoutEndpoint: "/api/create-checkout-session",
  whatsappNumber: "852XXXXXXXX",
  proPrice: "HK$28",
  consultLabel: "六爻解卦委託",
  unlockCodeHash: "SHA256_HASH_OF_UNLOCK_CODE",
};
```

## Automatic Stripe Delivery

The primary paid flow is:

1. Frontend POSTs to `/api/create-checkout-session`.
2. Cloudflare Pages Function creates a Stripe Checkout Session for HK$28.
3. Stripe redirects to `/success?session_id={CHECKOUT_SESSION_ID}`.
4. `success.js` calls `/api/verify-checkout-session`.
5. If Stripe confirms `paid`, `complete`, `HKD`, and `2800`, this browser unlocks Pro Prompt through localStorage.

Set this Cloudflare Pages environment variable or secret:

```text
STRIPE_SECRET_KEY=sk_live_...
```

Optional environment variables:

```text
STRIPE_PRO_AMOUNT=2800
STRIPE_PRO_CURRENCY=hkd
STRIPE_PRO_PRODUCT_NAME=I Ching Coin Oracle Pro Prompt
```

Do not put `STRIPE_SECRET_KEY` in any public file.

If you keep using a no-code Stripe Payment Link directly, configure its after-payment redirect URL in Stripe Dashboard as:

```text
https://iching-coin-oracle.pages.dev/success?session_id={CHECKOUT_SESSION_ID}
```

Without that redirect, the Payment Link still works, but automatic browser unlock cannot happen immediately.

## Generate A New Unlock Code Hash

Run this locally, replacing `YOUR_CODE` with the code you will send after payment:

```bash
node -e "const crypto=require('node:crypto'); console.log(crypto.createHash('sha256').update('YOUR_CODE'.trim().toUpperCase()).digest('hex'))"
```

Put the printed value into `unlockCodeHash`. Do not put the plain unlock code in the public config file. This manual unlock code is now a fallback path; automatic Stripe verification is the preferred HK$28 delivery flow.

## Verify Before Launch

```bash
node scripts/verify-production.mjs https://iching-coin-oracle.pages.dev
```

The verifier should report `readyForPaidLaunch: true` after both the Stripe Payment Link and WhatsApp number are configured and deployed.

## Deploy

```bash
pnpm dlx wrangler pages deploy . --project-name iching-coin-oracle
```
