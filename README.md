# I Ching Coin Oracle / 六爻銅錢占筮

An open-source static website for learning and experimenting with the I Ching six-line three-coin casting method. It casts six lines in the browser, organizes the primary hexagram, changed hexagram and moving lines, then generates a high-quality prompt that users can paste into an external AI such as ChatGPT, Claude or Gemini.

本專案以推廣易經文化為目的：用三枚銅錢擲六次起卦，在瀏覽器內整理本卦、變卦、動爻，再生成可貼去外部 AI 的解卦 prompt。介面提供繁體中文及英文版本，方便香港及海外用戶理解。

## Live Demo

- Traditional Chinese: https://iching-coin-oracle.pages.dev/
- English: https://iching-coin-oracle.pages.dev/en.html

## Features

- Six-line three-coin casting method, built from the first line upward.
- Primary hexagram, changed hexagram and moving-line summary.
- Free prompt and Pro prompt generator for external AI.
- Traditional Chinese and English UI.
- Experimental camera + audio snap detection for ritual-style casting.
- Local browser history, up to 30 records.
- Static 64-hexagram library for cultural discovery and SEO.
- Optional Stripe Checkout auto-unlock flow, Payment Link fallback and WhatsApp support configuration.

## Tech Stack

- Static HTML, CSS and vanilla JavaScript.
- Cloudflare Pages hosting.
- Browser-only casting logic and localStorage history.
- No backend database. Cloudflare Pages Functions are used only for Stripe Checkout Session creation and payment verification.
- No built-in AI API call. Users copy the generated prompt into their preferred external AI.
- Optional public monetization values are configured in `monetization.config.js`; Stripe secrets stay in Cloudflare environment variables.

## Responsible Use

This tool is a reflection and prompting framework. It does not guarantee outcomes and does not replace qualified legal, medical, investment, debt, safety or major life decision advice.

All free casting data stays in the browser unless the user actively copies it, pays through Stripe, or contacts through WhatsApp.

## Local Development

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173/
http://localhost:4173/en.html
```

## Deployment

Cloudflare Pages deploy command:

```bash
pnpm dlx wrangler pages deploy . --project-name iching-coin-oracle
```

Production verification:

```bash
node scripts/verify-production.mjs https://iching-coin-oracle.pages.dev
```

The deployment is ready for paid launch only when the script returns:

```json
{ "readyForPaidLaunch": true }
```

## Monetization Setup

Edit `monetization.config.js` for public payment settings:

- `checkoutUrl`: Stripe Payment Link.
- `checkoutEndpoint`: Cloudflare Pages Function endpoint, normally `/api/create-checkout-session`.
- `whatsappNumber`: WhatsApp number in international format, for example `85265784837`.
- `unlockCodeHash`: SHA-256 hash of the Pro unlock code.

Set `STRIPE_SECRET_KEY` in Cloudflare Pages for automatic Pro Prompt delivery. Do not put a plaintext unlock code or Stripe secret key into public files.

## Project Files

- `index.html`: Traditional Chinese homepage.
- `en.html`: English homepage.
- `styles.css`: Shared design system and responsive layout.
- `app.js`: Casting logic, prompt generation, gesture/audio mode and local history.
- `monetization.config.js`: Public monetization configuration.
- `functions/api/create-checkout-session.js`: Server-side Stripe Checkout Session creation.
- `functions/api/verify-checkout-session.js`: Server-side Checkout Session verification for automatic unlock.
- `success.html` / `success.js`: Stripe success page that unlocks Pro Prompt after verification.
- `hexagrams/`: Static 64-hexagram library.
- `scripts/verify-production.mjs`: Production readiness checks.

## License

MIT License. See `LICENSE`.
