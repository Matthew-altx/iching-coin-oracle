#!/usr/bin/env node

const baseUrl = (process.argv[2] || "https://iching-coin-oracle.pages.dev").replace(/\/$/, "");

async function read(url) {
  const response = await fetch(url);
  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    text,
    headers: Object.fromEntries(response.headers.entries()),
  };
}

function extractConfigValue(configText, key) {
  const match = configText.match(new RegExp(`${key}:\\s*["']([^"']*)["']`));
  return match ? match[1].trim() : "";
}

function getHeader(headers, key) {
  return headers[key.toLowerCase()] || "";
}

function headerIncludes(headers, key, fragments) {
  const value = getHeader(headers, key);
  return fragments.every((fragment) => value.includes(fragment));
}

const homepage = await read(`${baseUrl}/`);
const englishPage = await read(`${baseUrl}/en.html`);
const config = await read(`${baseUrl}/monetization.config.js`);
const app = await read(`${baseUrl}/app.js`);
const hexagram64 = await read(`${baseUrl}/hexagrams/64`);
const sitemap = await read(`${baseUrl}/sitemap.xml`);

const checkoutUrl = extractConfigValue(config.text, "checkoutUrl");
const whatsappNumber = extractConfigValue(config.text, "whatsappNumber");
const unlockCodeHash = extractConfigValue(config.text, "unlockCodeHash");

const cspRequiredFragments = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://cdn.jsdelivr.net https://storage.googleapis.com",
  "frame-src 'none'",
  "upgrade-insecure-requests",
];
const permissionsRequiredFragments = [
  "camera=(self)",
  "microphone=(self)",
  "geolocation=()",
  "payment=()",
  "usb=()",
  "serial=()",
  "bluetooth=()",
  "browsing-topics=()",
];

const checks = {
  homepage200: homepage.ok,
  englishPage200: englishPage.ok,
  config200: config.ok,
  configMustRevalidate: config.headers["cache-control"]?.includes("must-revalidate") || false,
  hasContentSecurityPolicy: headerIncludes(homepage.headers, "content-security-policy", cspRequiredFragments),
  appHasContentSecurityPolicy: headerIncludes(app.headers, "content-security-policy", cspRequiredFragments),
  hasXContentTypeOptions: getHeader(homepage.headers, "x-content-type-options") === "nosniff",
  hasReferrerPolicy: getHeader(homepage.headers, "referrer-policy") === "strict-origin-when-cross-origin",
  hasPermissionsPolicy: headerIncludes(homepage.headers, "permissions-policy", permissionsRequiredFragments),
  hasFrameProtection: getHeader(homepage.headers, "x-frame-options") === "DENY",
  hasModernXssPolicy: getHeader(homepage.headers, "x-xss-protection") === "0",
  hasStrictTransportSecurity: headerIncludes(homepage.headers, "strict-transport-security", ["max-age=31536000", "includeSubDomains"]),
  hasVersionedConfigScript: homepage.text.includes("monetization.config.js?v="),
  hasBilingualNavigation: homepage.text.includes('href="./en.html"')
    && englishPage.text.includes('lang="en"')
    && englishPage.text.includes('href="./"')
    && englishPage.text.includes("I Ching Coin Oracle")
    && englishPage.text.includes("Start Casting"),
  hasEnglishPromptSupport: app.ok
    && app.text.includes("UI_LANG")
    && app.text.includes("Answer in simple everyday English")
    && app.text.includes("Pro plain-language deepening"),
  hasPlainLanguagePrompt: app.ok
    && app.text.includes("白話要求")
    && app.text.includes("假設讀者完全不懂《易經》")
    && app.text.includes("不要拋書面字、古文或玄學術語")
    && app.text.includes("One-sentence answer")
    && app.text.includes("Do not use jargon")
    && homepage.text.includes("白話提問框架")
    && englishPage.text.includes("plain-language prompting framework"),
  hasFiveFingerFullCast: homepage.text.includes("五指合攏一手成卦")
    && homepage.text.includes("命運皆掌控在你手")
    && englishPage.text.includes("Close Five Fingers for a Full Cast")
    && englishPage.text.includes("destiny remains in your hands")
    && app.text.includes("FIVE_FINGER_CAST_HOLD_MS")
    && app.text.includes("triggerFullHandCast")
    && app.text.includes("一手出六爻"),
  hasPrepEntry: homepage.text.includes('id="prepare"')
    && homepage.text.includes("靜心")
    && homepage.text.includes("開始占卜")
    && homepage.text.includes('href="#oracle"')
    && homepage.text.includes("prep-bagua")
    && homepage.text.includes("prep-coin-row"),
  hasQuestionGuide: homepage.text.includes('id="question-guide"')
    && homepage.text.includes("先問準，再起卦")
    && homepage.text.includes("問法參考"),
  hasProPromptSurface: homepage.text.includes("proPromptOutput"),
  hasPromptPack: homepage.text.includes("promptPack"),
  hasShareCanvas: homepage.text.includes("shareCanvas"),
  hasConversionPath: homepage.text.includes("免費複製 Prompt")
    && homepage.text.includes("HK$28 解鎖白話 Pro Prompt")
    && homepage.text.includes("WhatsApp 真人簡批")
    && englishPage.text.includes("Copy the Free Prompt")
    && englishPage.text.includes("Unlock the Plain Pro Prompt")
    && englishPage.text.includes("WhatsApp Human Quick Reading"),
  hasResultCtaBar: homepage.text.includes("resultBarProCheckout")
    && homepage.text.includes("resultBarDeliveryWhatsApp")
    && homepage.text.includes("resultBarConsult")
    && englishPage.text.includes("Cast complete")
    && englishPage.text.includes("WhatsApp for Code"),
  hasPromptDeliveryStrip: homepage.text.includes("付款後點拎？")
    && homepage.text.includes("WhatsApp 發收據")
    && homepage.text.includes("收解鎖碼")
    && englishPage.text.includes("Send receipt on WhatsApp")
    && englishPage.text.includes("Receive unlock code"),
  appRendersConversionLinks: app.ok
    && app.text.includes("resultCopyButton")
    && app.text.includes("resultProCheckout")
    && app.text.includes("resultBarDeliveryWhatsApp")
    && app.text.includes("已起卦，")
    && app.text.includes("Cast complete: unlock plain Pro Prompt"),
  hasPromptClosingCall: app.ok
    && app.text.includes("卦示機緣，人行方成。多行善事，自得善果。未來所有命運仍掌握在你的手上。")
    && hexagram64.text.includes("卦示機緣，人行方成。多行善事，自得善果。未來所有命運仍掌握在你的手上。"),
  hasFulfillmentFlow: homepage.text.includes("付款後如何取得 Pro Prompt") && homepage.text.includes("deliveryWhatsApp"),
  hasPaymentChecklist: homepage.text.includes("付款前後準備好三樣資料")
    && homepage.text.includes("Stripe 收據截圖或付款 email"),
  hasProComparison: homepage.text.includes("Free 與 Pro 對照") && homepage.text.includes("顧問式拆局"),
  hasTrustStatement: homepage.text.includes("不替代法律、醫療、投資") && homepage.text.includes("不儲存卡資料"),
  hasResponsibleUse: homepage.text.includes('id="boundaries"')
    && homepage.text.includes("不鼓勵監控或操控他人")
    && homepage.text.includes("不保證結果，只整理方向"),
  hasTierCtas: homepage.text.includes("HK$188") && homepage.text.includes("HK$1680 起") && homepage.text.includes("找大師父協助") && homepage.text.includes("tierDeepConsult"),
  hasMethodFactCheck: homepage.text.includes("字=陰=2，背=陽=3") && homepage.text.includes("上三爻為外卦"),
  hasWhatsAppCta: homepage.text.includes("whatsappConsult"),
  hasSeoLibrary: homepage.text.includes("hexagram-library"),
  hexagram64Ok: hexagram64.ok && hexagram64.text.includes("第 64 卦《火水未濟》AI Prompt"),
  sitemapOk: sitemap.ok && sitemap.text.includes(`${baseUrl}/en.html`) && sitemap.text.includes(`${baseUrl}/hexagrams/64`),
  checkoutConfigured: checkoutUrl.startsWith("https://"),
  whatsappConfigured: /^\d{8,15}$/.test(whatsappNumber.replace(/\D/g, "")),
  unlockHashConfigured: /^[a-f0-9]{64}$/i.test(unlockCodeHash),
};

const readyForPaidLaunch = Object.values(checks).every(Boolean);

console.log(JSON.stringify({
  baseUrl,
  readyForPaidLaunch,
  checkoutUrl: checkoutUrl ? "[configured]" : "",
  whatsappNumber: whatsappNumber ? "[configured]" : "",
  checks,
}, null, 2));

process.exitCode = readyForPaidLaunch ? 0 : 1;
