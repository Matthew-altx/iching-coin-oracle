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

export async function onRequestGet({ env }) {
  const amount = Number.parseInt(env.STRIPE_PRO_AMOUNT || "", 10);
  return jsonResponse({
    ok: true,
    stripeSecretConfigured: Boolean(String(env.STRIPE_SECRET_KEY || "").trim()),
    amount: Number.isFinite(amount) && amount > 0 ? amount : DEFAULT_AMOUNT,
    currency: String(env.STRIPE_PRO_CURRENCY || DEFAULT_CURRENCY).trim().toLowerCase() || DEFAULT_CURRENCY,
  });
}
