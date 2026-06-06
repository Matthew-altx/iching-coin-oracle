const PRO_UNLOCK_KEY = "iching.coin.pro.v1";
const params = new URLSearchParams(location.search);
const lang = params.get("lang") === "en" ? "en" : "zh";
const sessionId = params.get("session_id") || "";
const config = globalThis.ICHING_MONETIZATION_CONFIG || {};

function ui(zh, en) {
  return lang === "en" ? en : zh;
}

const els = {
  mark: document.querySelector("#successMark"),
  kicker: document.querySelector("#successKicker"),
  title: document.querySelector("#successTitle"),
  copy: document.querySelector("#successCopy"),
  status: document.querySelector("#successStatus"),
  note: document.querySelector("#successNote"),
  returnLink: document.querySelector("#returnLink"),
  supportLink: document.querySelector("#supportLink"),
};

function setText() {
  document.documentElement.lang = lang === "en" ? "en" : "zh-Hant";
  document.title = ui("Pro Prompt 付款核對 · 六爻銅錢占筮", "Pro Prompt Payment Verification · I Ching Coin Oracle");
  els.kicker.textContent = "Stripe Verification";
  els.title.textContent = ui("正在核對付款", "Verifying payment");
  els.copy.textContent = ui(
    "正在向 Stripe 確認付款狀態。成功後，此瀏覽器會自動解鎖 Pro Prompt。",
    "Checking the payment status with Stripe. Once verified, this browser unlocks the Pro Prompt automatically."
  );
  els.status.textContent = ui("核對中...", "Verifying...");
  els.note.textContent = ui(
    "此頁只會向 Stripe 查詢付款狀態，不會接觸或儲存你的卡資料。",
    "This page only checks the payment status with Stripe. It never touches or stores your card details."
  );
  els.returnLink.href = lang === "en" ? "./en.html#pro" : "./#pro";
  els.returnLink.textContent = ui("回到起卦頁複製 Pro Prompt", "Return and copy the Pro Prompt");
  els.supportLink.textContent = ui("WhatsApp 後備支援", "WhatsApp fallback support");
}

function getSupportUrl() {
  const phone = String(config.whatsappNumber || "85265784837").replace(/\D/g, "");
  const message = ui(
    `我已完成 Stripe 付款，但成功頁未能自動解鎖 Pro Prompt。Session ID：${sessionId || "未有"}`,
    `I completed Stripe payment, but the success page could not unlock the Pro Prompt automatically. Session ID: ${sessionId || "missing"}`
  );
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function renderSuccess(data) {
  localStorage.setItem(PRO_UNLOCK_KEY, "unlocked");
  els.mark.textContent = "解";
  els.title.textContent = ui("Pro Prompt 已自動解鎖", "Pro Prompt unlocked");
  els.copy.textContent = ui(
    "付款已核對。回到起卦頁後，Pro Prompt 會保持解鎖，可以直接複製完整版本。",
    "Payment verified. Return to the oracle page and the Pro Prompt will stay unlocked for direct copying."
  );
  els.status.textContent = ui(
    `已確認付款：${String(data.currency || "hkd").toUpperCase()} ${(Number(data.amountTotal || 0) / 100).toFixed(2)}`,
    `Payment confirmed: ${String(data.currency || "hkd").toUpperCase()} ${(Number(data.amountTotal || 0) / 100).toFixed(2)}`
  );
}

function renderFailure(message) {
  els.mark.textContent = "!";
  els.title.textContent = ui("暫時未能自動解鎖", "Automatic unlock unavailable");
  els.copy.textContent = ui(
    "付款可能尚未完成，或 Stripe 未能即時回傳狀態。你可以稍後重新整理此頁，或用 WhatsApp 發送付款資料作後備處理。",
    "The payment may not be complete yet, or Stripe could not return the status immediately. Refresh this page later, or use WhatsApp fallback support."
  );
  els.status.textContent = message;
}

async function verifySession() {
  setText();
  els.supportLink.href = getSupportUrl();
  if (!sessionId) {
    renderFailure(ui("網址缺少 Stripe session_id。", "The Stripe session_id is missing from the URL."));
    return;
  }

  try {
    const response = await fetch(`/api/verify-checkout-session?session_id=${encodeURIComponent(sessionId)}`, {
      headers: { accept: "application/json" },
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.unlocked) {
      renderSuccess(data);
      return;
    }
    renderFailure(ui(
      "Stripe 尚未確認這筆 HK$28 Pro Prompt 付款。",
      "Stripe has not verified this HK$28 Pro Prompt payment yet."
    ));
  } catch {
    renderFailure(ui(
      "網絡或伺服端驗證暫時失敗。",
      "Network or server-side verification failed."
    ));
  }
}

void verifySession();
