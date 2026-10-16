# 大同課表轉換器

大同大學參考版型 PDF 課表轉 ICS 的互動網頁。React、TypeScript、PDF.js 與 Tesseract.js 實作，無帳號與應用程式後端。

## 啟動

需要 Node.js 22.13 以上或相容的新版 Node.js。

```sh
npm install
node scripts/prepare-assets.mjs
npm run dev
```

開啟終端機顯示的本機網址。請使用 HTTP 網址，不要直接雙擊 index.html。

```sh
npm test
npm run build
npm run preview
```

## 操作

1. 上傳 PDF（20 MB 以下），預設辨識所有非空白頁，也可指定單頁。跨頁課程會合併。
2. 開始辨識。首次需要載入本機網站提供的中英文模型；依裝置效能可能需要數分鐘。
3. 點選每筆課程，對照原始 PDF，修正後按「確認並儲存」。可新增、刪除或按指定時間拆分。
4. 填入實際學期起訖日期及提醒時間。
5. 下載 ICS，依畫面說明匯入行事曆。建議使用獨立日曆，避免重複匯入造成重複事件。

也可使用明確標示的虛構示範資料，或手動建立課表。

## 隱私與限制

- 原始 PDF、圖片與辨識文字只在使用者瀏覽器記憶體處理，不送往伺服器。
- OCR Worker、WebAssembly 及語言模型由同一網站提供。Google Fonts 僅用來載入字型；封鎖時會使用系統字型。
- 課表不預設永久保存，重新整理或離開前會提醒未匯出的修改。
- 目前以大同大學藍色表格課表為參考，尚不支援任意 PDF 版型。
- 辨識可能有誤，所有辨識課程都必須逐筆確認，不能保證自動辨識準確率。
- 使用 PDF 上的時間欄辨識上課時間，讀不到時留白，需手動補齊。
- 不自動排除假日、停課、補課及單雙週課程。
- 下載 ICS 不等於已同步到行事曆。請實際匯入後核對日期、時間及提醒。
- 示範資料為虛構，沒有把使用者的個人課表納入網站。

## 主要檔案

- `src/main.tsx`：互動介面、課程編輯與操作流程。
- `src/recognition.ts`：PDF 預覽、格線偵測、逐格 OCR。
- `src/model.ts`：課程驗證、連堂合併、重疊檢查。
- `src/calendar.ts`：ICS 產生、時區、每週重複及 UTF-8 換行。
- `tests/calendar.test.ts`：日期、重複、提醒、文字逃脫及連堂合併測試。
- `scripts/prepare-assets.mjs`：準備瀏覽器內 OCR 所需的資源。

## 其他驗證

`scripts/browser-check.mjs` 使用 Playwright 與已安裝的 Chrome，檢查上傳、真空白頁、編輯、拆分、下載、手機排版及網路請求。需另備 Playwright；可用環境變數 `PLAYWRIGHT_MODULE` 指向既有套件，`TEST_PDF` 指向私人參考 PDF。測試結果寫入已排除版本控制的 `test-output/`，請勿發布個人課表或測試截圖。

圖片文字辨識會保留原始文字，並將常見代碼誤讀與教室破折號差異用於連堂比對；合併後仍須逐筆核對，不將 OCR 猜測當成已確認資料。

學生作業作品，非大同大學官方服務。


## GitHub 與公開網站

- 原始碼：https://github.com/RainYu0510/ttu-timetable
- GitHub Pages：https://rainyu0510.github.io/ttu-timetable/

### 自動部署

推送到 main 分支後，GitHub Actions 會依序安裝套件、執行測試、準備 OCR 引擎與中英文模型、編譯並發布網站。部署狀態可在儲存庫的 Actions 頁查看。Pages 的發布來源設定為 GitHub Actions。

部署時會依 Pages 的 base_path 設定網站路徑，OCR 模型、圖示及程式檔皆可在儲存庫子路徑載入。本機開發仍使用根路徑。

### 更新網站（PowerShell）

```powershell
cd "D:\NCCU_AI_Lecture\Week5\ttu-timetable"
git status
git add src public scripts tests index.html package.json package-lock.json tsconfig.json vite.config.mjs README.md .gitignore .github
git commit -m "Update timetable website"
git push origin main
```

若有新增檔案，先檢查 git status，僅加入預計公開的專案內容。原始個人 PDF、測試輸出、登入憑證及 node_modules 不納入儲存庫；網站建置時自動準備 OCR 資源。

技術參考：[Vite 靜態部署](https://vite.dev/guide/static-deploy.html#github-pages)、[GitHub Pages 自訂工作流程](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。
