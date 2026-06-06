const STRIPE_API_VERSION = "2026-02-25.clover";
const DEFAULT_AMOUNT = 2800;
const DEFAULT_CURRENCY = "hkd";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function getAmount(env) {
  const amount = Number.parseInt(env.STRIPE_PRO_AMOUNT || "", 10);
  return Number.isFinite(amount) && amount > 0 ? amount : DEFAULT_AMOUNT;
}

function getCurrency(env) {
  return String(env.STRIPE_PRO_CURRENCY || DEFAULT_CURRENCY).trim().toLowerCase() || DEFAULT_CURRENCY;
}

function isValidSessionId(sessionId) {
  return /^cs_(test_)?[A-Za-z0-9_]+$/.test(sessionId);
}

export async function onRequestPost() {
  return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
}

export async function onRequestGet({ request, env }) {
  const requestUrl = new URL(request.url);
  const sessionId = requestUrl.searchParams.get("session_id") || "";
  if (!isValidSessionId(sessionId)) {
    return jsonResponse({ ok: false, error: "session_id_required" }, 400);
  }

  const secretKey = String(env.STRIPE_SECRET_KEY || "").trim();
  if (!secretKey) {
    return jsonResponse({ ok: false, error: "stripe_secret_missing" }, 503);
  }

  const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: {
      authorization: `Bearer ${secretKey}`,
      "stripe-version": STRIPE_API_VERSION,
    },
  });
  const session = await stripeResponse.json().catch(() => ({}));
  if (!stripeResponse.ok) {
    return jsonResponse({ ok: false, error: "stripe_session_lookup_failed" }, 502);
  }

  const expectedAmount = getAmount(env);
  const expectedCurrency = getCurrency(env);
  const amountMatches = session.amount_total === expectedAmount;
  const currencyMatches = String(session.currency || "").toLowerCase() === expectedCurrency;
  const paid = session.payment_status === "paid" && session.status === "complete";
  const paymentMode = session.mode === "payment";
  const unlocked = Boolean(paid && amountMatches && currencyMatches && paymentMode);

  return jsonResponse({
    ok: true,
    unlocked,
    paymentStatus: session.payment_status || "",
    sessionStatus: session.status || "",
    amountTotal: session.amount_total || 0,
    currency: session.currency || "",
    created: session.created || null,
  }, unlocked ? 200 : 402);
}
