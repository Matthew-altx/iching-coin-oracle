# Monetization Setup

This site is a static Cloudflare Pages MVP. It does not store payment details and does not call an AI API. Paid conversion is handled through external checkout and WhatsApp.

## Required Values

Edit `monetization.config.js` before the final paid launch:

```js
window.ICHING_MONETIZATION_CONFIG = {
  checkoutUrl: "https://buy.stripe.com/...",
  whatsappNumber: "852XXXXXXXX",
  proPrice: "HK$28",
  consultLabel: "六爻解卦委託",
  unlockCodeHash: "SHA256_HASH_OF_UNLOCK_CODE",
};
```

## Generate A New Unlock Code Hash

Run this locally, replacing `YOUR_CODE` with the code you will send after payment:

```bash
node -e "const crypto=require('node:crypto'); console.log(crypto.createHash('sha256').update('YOUR_CODE'.trim().toUpperCase()).digest('hex'))"
```

Put the printed value into `unlockCodeHash`. Do not put the plain unlock code in the public config file.

## Verify Before Launch

```bash
node scripts/verify-production.mjs https://iching-coin-oracle.pages.dev
```

The verifier should report `readyForPaidLaunch: true` after both the Stripe Payment Link and WhatsApp number are configured and deployed.

## Deploy

```bash
pnpm dlx wrangler pages deploy . --project-name iching-coin-oracle
```
