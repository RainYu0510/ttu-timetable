# 大同課表轉換器｜HTML 轉 ICS

直接讀取大同大學「本人功課表」另存的 HTML，合併連堂並匯出整學期的 ICS 行事曆。React、TypeScript 與 parse5 實作；檔案只在使用者瀏覽器內處理。

- 公開網站：https://rainyu.dev/ttu-timetable/
- GitHub：https://github.com/RainYu0510/ttu-timetable
- GitHub 原生網址：https://rainyu0510.github.io/ttu-timetable/ （沿用帳號的自訂網域，會重新導向）

## 本機啟動

需要 Node.js 22.13 以上或相容新版。在含有 package.json 的專案資料夾執行：

```powershell
cd "D:\NCCU_AI_Lecture\Week5\ttu-timetable"
npm install
npm run dev
```

開啟終端機顯示的網址，保持終端機開啟。停止時按 Ctrl + C。本版本不需要準備辨識模型。

```sh
npm test
npm run build
npm run preview
```

## 使用方式

1. 登入大同大學選課系統，開啟「本人功課表」。
2. 在電腦瀏覽器按 Ctrl + S（Mac：⌘ + S），另存為 HTML 網頁。不是列印成 PDF。
3. 上傳 .html 或 .htm（5 MB 以下），不需要旁邊的 _files 資料夾。
4. 系統直接讀取表格文字，依星期標題、時間欄與儲存格位置建立課程，合併連堂。
5. 對照原始資料、修改課程，逐筆儲存或按「確認全部課程」。
6. 設定學期起訖日期、行事曆名稱及課前提醒。
7. 下載 ICS，依畫面指引匯入 Google 日曆、Apple 行事曆或 Outlook。

建議先建立專用日曆再匯入，避免重複匯入產生重複事件。也可使用虛構示範課表或手動新增課程。

## 資料解析與隱私

- 使用 parse5 將 HTML 轉為普通資料樹，不建立可執行的原始網頁。
- 不執行 HTML 內的 JavaScript，不載入其中的圖片、樣式、iframe 或連結，不使用登入帳密。
- 原始 HTML 與課程資料不會上傳，也不會預設永久儲存。離開前會提醒未匯出的修改。
- 預覽由 React 以文字重新呈現，不直接插入使用者 HTML。
- 支援 UTF-8，以及明確宣告的 Big5 等瀏覽器支援編碼；無法解碼時顯示錯誤。
- 原始課表的姓名標題、導覽選單與退選按鈕不納入課程或 ICS。
- 公開自訂網域可能加入載入速度等代管平台統計；驗收會區分統計與文件上傳。Google Fonts 僅載入字型。
- 示範資料與自動測試資料皆為虛構；個人 HTML、PDF、測試截圖及登入憑證不應提交至儲存庫。

## 支援範圍與限制

- 支援大同大學參考版型的 HTML 表格，包含中午、傍晚、晚間課程。
- 依實際星期標題定位，支援標準 rowspan / colspan 合併儲存格。
- 僅合併相鄰、同星期、同代碼、同名稱、同教室的時段；不套用圖片辨識的模糊比對。
- 不支援 PDF、圖片、登入頁或任意網站。若學校更改版型，可能需要更新解析規則。
- 缺少課程代碼或教室時保留空白，仍需使用者核對。沒有課程、時間錯誤或多張課表時會提示。
- 未自動處理國定假日、停課、補課及單雙週課程，請匯入後自行調整。
- 下載 ICS 不等於已同步行事曆，請在實際日曆中核對日期、時間與提醒。

## 主要檔案

- `src/html.ts`：HTML 解碼、表格結構解析、星期與時間讀取。
- `src/SourcePreview.tsx`：以純文字呈現原始課表資料。
- `src/main.tsx`：上傳、課程編輯、確認及下載流程。
- `src/model.ts`：課程資料、嚴格連堂合併、時間重疊檢查。
- `src/calendar.ts`：ICS、台北時區、每週重複及提醒。
- `tests/html.test.ts`：HTML 解析、合併儲存格、異常輸入與腳本隔離測試。
- `tests/calendar.test.ts`：ICS 日期、時間、提醒及文字格式測試。
- `.github/workflows/deploy-pages.yml`：推送到 main 後自動測試、編譯及部署 GitHub Pages。

## 瀏覽器驗收

`scripts/browser-check.mjs` 需要另備 Playwright 與已安裝的 Chrome。可透過 `PLAYWRIGHT_MODULE` 指定既有套件，`TEST_URL` 指定測試網址，`TEST_HTML` 指向私人參考 HTML。結果寫入不納入版本控制的 `test-output/`。

驗收包含示範資料、新增修改刪除、時段拆分、全部確認、學期設定、ICS 下載、手機排版、惡意腳本與外部資源不執行，以及沒有文件上傳或辨識模型請求。

## 更新公開網站

```powershell
git status
git add src public scripts tests index.html package.json package-lock.json tsconfig.json vite.config.mjs README.md .gitignore .github
git commit -m "Update timetable website"
git push origin main
```

GitHub Actions 會自動安裝套件、執行測試並發布 dist。Vite 依 Pages 的 base_path 設定子路徑，本機開發仍使用根路徑。

學生作業作品，非大同大學官方服務。
