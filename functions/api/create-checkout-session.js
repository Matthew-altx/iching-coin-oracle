const STRIPE_API_VERSION = "2026-02-25.clover";
const DEFAULT_AMOUNT = 2800;
const DEFAULT_CURRENCY = "hkd";
const DEFAULT_PRODUCT_NAME = "I Ching Coin Oracle Pro Prompt";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function cleanText(value, maxLength = 240) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function getAmount(env) {
  const amount = Number.parseInt(env.STRIPE_PRO_AMOUNT || "", 10);
  return Number.isFinite(amount) && amount > 0 ? amount : DEFAULT_AMOUNT;
}

function getCurrency(env) {
  return cleanText(env.STRIPE_PRO_CURRENCY || DEFAULT_CURRENCY, 12).toLowerCase() || DEFAULT_CURRENCY;
}

function getProductName(env) {
  return cleanText(env.STRIPE_PRO_PRODUCT_NAME || DEFAULT_PRODUCT_NAME, 120) || DEFAULT_PRODUCT_NAME;
}

function appendFormValue(form, key, value) {
  if (value === undefined || value === null || value === "") return;
  form.append(key, value);
}

async function parsePayload(request) {
  try {
    const payload = await request.json();
    return payload && typeof payload === "object" ? payload : {};
  } catch {
    return {};
  }
}

function assertSameOrigin(requestUrl, request) {
  const origin = request.headers.get("origin");
  return !origin || origin === requestUrl.origin;
}

export async function onRequestGet() {
  return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
}

export async function onRequestPost({ request, env }) {
  const requestUrl = new URL(request.url);
  if (!assertSameOrigin(requestUrl, request)) {
    return jsonResponse({ ok: false, error: "origin_not_allowed" }, 403);
  }

  const secretKey = String(env.STRIPE_SECRET_KEY || "").trim();
  if (!secretKey) {
    return jsonResponse({ ok: false, error: "stripe_secret_missing" }, 503);
  }

  const payload = await parsePayload(request);
  const lang = cleanText(payload.lang, 8) === "en" ? "en" : "zh";
  const sourcePath = lang === "en" ? "/en.html" : "/";
  const successUrl = `${requestUrl.origin}/success?session_id={CHECKOUT_SESSION_ID}&lang=${lang}`;
  const cancelUrl = `${requestUrl.origin}${sourcePath}?checkout=cancelled`;
  const form = new URLSearchParams();
  form.append("mode", "payment");
  form.append("client_reference_id", `iching_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`);
  form.append("success_url", successUrl);
  form.append("cancel_url", cancelUrl);
  form.append("line_items[0][quantity]", "1");
  form.append("line_items[0][price_data][currency]", getCurrency(env));
  form.append("line_items[0][price_data][unit_amount]", String(getAmount(env)));
  form.append("line_items[0][price_data][product_data][name]", getProductName(env));
  form.append("metadata[source]", "iching_coin_oracle");
  form.append("metadata[lang]", lang);
  appendFormValue(form, "metadata[prompt_pack]", cleanText(payload.promptPack, 40));
  appendFormValue(form, "metadata[prompt_style]", cleanText(payload.promptStyle, 40));
  appendFormValue(form, "metadata[question]", cleanText(payload.question, 240));
  appendFormValue(form, "metadata[primary_hexagram]", cleanText(payload.primaryHexagram, 80));
  appendFormValue(form, "metadata[changed_hexagram]", cleanText(payload.changedHexagram, 80));
  appendFormValue(form, "metadata[moving_lines]", cleanText(payload.movingLines, 40));

  const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${secretKey}`,
      "content-type": "application/x-www-form-urlencoded",
      "stripe-version": STRIPE_API_VERSION,
    },
    body: form,
  });
  const data = await stripeResponse.json().catch(() => ({}));
  if (!stripeResponse.ok || !data.url) {
    return jsonResponse({ ok: false, error: "stripe_checkout_failed" }, 502);
  }

  return jsonResponse({
    ok: true,
    url: data.url,
    sessionId: data.id,
  });
}
