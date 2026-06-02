# AGENTS.md

## 核心原則
- 使用第一性原理思考：先釐清目標、約束、可驗證證據，再做最小改動。
- 目標用戶是香港人：預設使用繁體中文（香港語境）、HKD 價格與 `852` WhatsApp 號碼格式。

## 目前倉庫事實（以實際檔案為準）
- 這是 Cloudflare Pages 靜態站，主要檔案：`index.html`、`styles.css`、`app.js`。
- 變現設定集中在 `monetization.config.js`；部署前檢查腳本是 `scripts/verify-production.mjs`。
- 部署命令已在 `MONETIZATION_SETUP.md`：`pnpm dlx wrangler pages deploy . --project-name iching-coin-oracle`。

## 變更流程（最小且可驗證）
1. 先改對應來源檔（UI/文案/邏輯只改 `index.html`、`styles.css`、`app.js` 或設定檔）。
2. 牽涉收費時，只在 `monetization.config.js` 填入真實值：`checkoutUrl`、`whatsappNumber`、`unlockCodeHash`。
3. 不可把明文解鎖碼放入公開檔案；只存 SHA-256 hash（見 `MONETIZATION_SETUP.md`）。
4. 上線前執行：`node scripts/verify-production.mjs <baseUrl>`，以 `readyForPaidLaunch: true` 作為完成標準。

## Guardrails
- 保持修改最少；不要重構無關模組。
- 未有明確需要時，不要改動 `hexagrams/` 內容。
- 如果需求資訊不足，優先加 `TODO` 註記（含簡短原因），不要自行假設。

## TODO
- 確認 `hexagrams/` 是否有對應生成流程與來源腳本；未確認前視作內容資料檔，不批量改寫。
