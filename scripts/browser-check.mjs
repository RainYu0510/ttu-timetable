import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
await mkdir('test-output',{recursive:true});
const page=await browser.newPage({viewport:{width:1440,height:1100},acceptDownloads:true});
const testURL=process.env.TEST_URL||'http://127.0.0.1:5173/';
const errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
const metricFields=new Set(['startTime','pageloadId','eventType','nt','location','versions','bi','memory','firstPaint','firstContentfulPaint','timingsV2','siteToken','st','dt']);
page.on('request',r=>{
  let telemetryOnly=false;
  if(r.method()==='POST'&&new URL(r.url()).origin===new URL(testURL).origin&&new URL(r.url()).pathname==='/cdn-cgi/rum'){
    try{const data=JSON.parse(r.postData());telemetryOnly=Object.keys(data).every(k=>metricFields.has(k))&&!/courseName|rawText|data:image|<table|%3Ctable|&lt;table|%PDF-|JVBERi0|課表\.html/.test(JSON.stringify(data));}catch{}
  }
  requests.push({url:r.url(),method:r.method(),telemetryOnly});
});
const upload=async(name,html)=>page.locator('input[type=file]').setInputFiles({name,mimeType:'text/html',buffer:Buffer.from(html)});
const startAgain=async()=>{await page.goto(testURL);await page.getByRole('heading',{name:'課表 HTML 轉行事曆',exact:true}).waitFor();};
async function settingsAndDownload(file,reminder='10'){
  if(await page.getByRole('heading',{name:'我的課表',exact:true}).count())await page.getByRole('button',{name:'設定學期',exact:true}).click();
  await page.getByLabel('學期開始日期').fill('2026-09-07');await page.getByLabel('學期結束日期').fill('2027-01-15');
  await page.getByLabel('課前提醒').selectOption(reminder);
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'下載行事曆',exact:true}).click();
  const dl=await pending;await dl.saveAs(file);await page.getByRole('heading',{name:'課表就位，出發吧！'}).waitFor();
  return readFile(file,'utf8');
}
try {
  const res=await page.goto(testURL);assert.equal(res.status(),200);await page.getByRole('heading',{name:'課表 HTML 轉行事曆',exact:true}).waitFor();
  await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'test-output/desktop.png',fullPage:true});
  await upload('wrong.pdf','%PDF-');await page.getByRole('alert').filter({hasText:'HTML 格式'}).waitFor();
  await page.getByRole('button',{name:'關閉錯誤訊息'}).click();
  await upload('login.html','<h1>請登入</h1>');await page.getByRole('alert').filter({hasText:'找不到課表'}).waitFor();
  await page.getByRole('button',{name:'關閉錯誤訊息'}).click();
  const hostile=`<script>window.__HTML_EXECUTED=true</script><img src="https://html-resource.invalid/photo.png" onerror="window.__HTML_EXECUTED=true"><iframe src="https://html-resource.invalid/frame"></iframe><link rel="stylesheet" href="https://html-resource.invalid/style.css"><table><tr><td>節次</td><td>星期六</td><td>星期一</td></tr><tr><td>第十節<br>19:15<br>20:05</td><td>C1001<br>範例課程<br>A3-101<script>bad()</script></td><td></td></tr></table>`;
  await upload('safe-test.htm',hostile);await page.getByRole('heading',{name:'為這學期，畫好時間線。'}).waitFor();
  assert.equal(await page.getByText(/待確認|確認全部課程/).count(),0);
  assert.equal(await page.locator('.steps li').count(),3);
  const direct=await settingsAndDownload('test-output/direct.ics');assert.ok(direct.includes('SUMMARY:範例課程'));
  await page.getByRole('button',{name:'返回修改課表'}).click();
  await page.getByRole('button',{name:'課程清單',exact:true}).click();
  assert.equal(await page.locator('.course-row').count(),1);
  assert.ok((await page.locator('.course-row').innerText()).includes('週六'));
  assert.equal(await page.evaluate(()=>window.__HTML_EXECUTED),undefined);
  assert.ok(!requests.some(r=>r.url.includes('html-resource.invalid')),'Saved HTML must not fetch any external resources');
  await page.getByRole('button',{name:/上傳課表/}).click();
  await page.getByRole('button',{name:'使用說明'}).click();await page.getByRole('button',{name:'了解，開始安排'}).click();
  await page.getByRole('button',{name:'先用示範課表試試'}).click();await page.getByRole('button',{name:'查看／修改課表',exact:true}).click();
  await page.getByRole('button',{name:'課程清單',exact:true}).click();assert.equal(await page.locator('.course-row').count(),6);
  await page.getByRole('button',{name:'新增課程',exact:true}).click();
  await page.getByLabel('課程名稱').fill('測試課程');await page.getByLabel('上課地點').fill('TEST-101');
  await page.getByRole('button',{name:'儲存',exact:true}).click();assert.equal(await page.locator('.course-row').count(),7);
  await page.locator('.course-row').filter({hasText:'測試課程'}).click();await page.getByRole('button',{name:'拆分時段'}).click();
  await page.getByLabel('在此時間拆成兩段').fill('09:30');await page.getByRole('button',{name:'確認拆分',exact:true}).click();assert.equal(await page.locator('.course-row').count(),8);
  for(let i=0;i<2;i++){await page.locator('.course-row').filter({hasText:'測試課程'}).first().click();await page.getByRole('button',{name:'刪除時段'}).click();}
  await page.getByRole('button',{name:'每週課表',exact:true}).click();await page.screenshot({path:'test-output/editor.png',fullPage:true});
  const demo=await settingsAndDownload('test-output/demo.ics');assert.equal(demo.split('BEGIN:VEVENT').length-1,6);
  await page.screenshot({path:'test-output/download.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await startAgain();await page.screenshot({path:'test-output/mobile.png',fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  await page.getByRole('button',{name:'先用示範課表試試'}).click();await page.getByRole('button',{name:'查看／修改課表',exact:true}).click();await page.getByRole('button',{name:'課程清單',exact:true}).click();
  await page.screenshot({path:'test-output/mobile-editor.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  console.log('PASS: invalid files, inert HTML scripts/resources, weekday headers, direct export without review, demo, CRUD, split, ICS and mobile layout.');
  if(process.env.TEST_HTML){
    await page.setViewportSize({width:1440,height:1100});await startAgain();await page.locator('input[type=file]').setInputFiles(process.env.TEST_HTML);
    await page.getByRole('heading',{name:'為這學期，畫好時間線。'}).waitFor();
    assert.equal(await page.getByText(/待確認|確認全部課程/).count(),0);
    await page.screenshot({path:'test-output/direct-settings.png',fullPage:true});
    const quick=await settingsAndDownload('test-output/quick-imported.ics','15');assert.equal(quick.split('BEGIN:VEVENT').length-1,10);
    await page.getByRole('button',{name:'返回修改課表'}).click();await page.getByText('已讀取 25 筆節次，合併為 10 個上課時段').waitFor();
    await page.getByRole('button',{name:'課程清單',exact:true}).click();
    const rows=await page.locator('.course-row').allTextContents();assert.equal(rows.length,10);
    assert.ok(rows.some(r=>r.includes('演算法')&&r.includes('I3400B')));assert.ok(rows.some(r=>r.includes('影像處理')&&r.includes('I5560')));
    assert.ok(rows.some(r=>r.includes('週六')&&r.includes('18:20 – 20:05')));assert.ok(rows.some(r=>r.includes('16:10 – 19:10')));
    await page.locator('.source-details summary').click();assert.equal(await page.locator('.source-table-scroll tbody tr').count(),14);
    await page.screenshot({path:'test-output/html-import.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    await page.screenshot({path:'test-output/mobile-import.png',fullPage:true});await page.setViewportSize({width:1440,height:1100});
    // A rejected replacement must keep the imported courses intact.
    await upload('not-timetable.html','<h1>登入</h1>');await page.getByRole('alert').waitFor();assert.equal(await page.locator('.course-row').count(),10);
    await page.getByRole('button',{name:'關閉錯誤訊息'}).click();
    const ics=(await settingsAndDownload('test-output/imported.ics','15')).replace(/\r\n /g,'');
    assert.equal(ics.split('BEGIN:VEVENT').length-1,10);assert.ok(ics.includes('SUMMARY:影像處理'));assert.ok(ics.includes('課程代碼：I3400B'));
    assert.ok(ics.includes('DTSTART;TZID=Asia/Taipei:20260912T182000'));assert.ok(ics.includes('DTEND;TZID=Asia/Taipei:20260912T200500'));
    assert.ok(ics.includes('DTSTART;TZID=Asia/Taipei:20260908T161000'));assert.ok(ics.includes('TRIGGER:-PT15M'));
    console.log('PASS: personal HTML gives 9 courses / 10 weekly blocks; exact codes, evening, Saturday, source preview, preserved data and ICS content.');
  }
  assert.deepEqual(errors,[],'No JavaScript errors');
  assert.deepEqual(requests.filter(r=>!['GET','HEAD'].includes(r.method)&&!r.telemetryOnly),[],'No document uploads or unexpected POST requests');
  assert.ok(!requests.some(r=>/\/ocr\/|traineddata|pdf\.worker|tesseract/i.test(r.url)),'No PDF/OCR assets should be requested');
  await writeFile('test-output/network.json',JSON.stringify(requests,null,2));
  console.log('PASS: no script execution, external saved-page assets, document uploads or OCR model requests.');
} finally {await browser.close();}
