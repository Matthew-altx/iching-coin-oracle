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

const homepage = await read(`${baseUrl}/`);
const englishPage = await read(`${baseUrl}/en.html`);
const config = await read(`${baseUrl}/monetization.config.js`);
const app = await read(`${baseUrl}/app.js`);
const hexagram64 = await read(`${baseUrl}/hexagrams/64`);
const sitemap = await read(`${baseUrl}/sitemap.xml`);

const checkoutUrl = extractConfigValue(config.text, "checkoutUrl");
const whatsappNumber = extractConfigValue(config.text, "whatsappNumber");
const unlockCodeHash = extractConfigValue(config.text, "unlockCodeHash");

const checks = {
  homepage200: homepage.ok,
  englishPage200: englishPage.ok,
  config200: config.ok,
  configMustRevalidate: config.headers["cache-control"]?.includes("must-revalidate") || false,
  hasVersionedConfigScript: homepage.text.includes("monetization.config.js?v="),
  hasBilingualNavigation: homepage.text.includes('href="./en.html"')
    && englishPage.text.includes('lang="en"')
    && englishPage.text.includes('href="./"')
    && englishPage.text.includes("I Ching Coin Oracle")
    && englishPage.text.includes("Start Casting"),
  hasEnglishPromptSupport: app.ok
    && app.text.includes("UI_LANG")
    && app.text.includes("Please answer in English")
    && app.text.includes("Pro advanced requirements"),
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
