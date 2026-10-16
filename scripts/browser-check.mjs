import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
await mkdir('test-output',{recursive:true});
const page=await browser.newPage({viewport:{width:1440,height:1100},acceptDownloads:true});
const testURL=process.env.TEST_URL||'http://127.0.0.1:5173/';
const errors=[], requests=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{requests.push({url:r.url(),method:r.method(),hasBody:!!r.postData()});});
page.on('console',m=>{if(m.type()==='error')console.log('BROWSER_ERROR',m.text());});
try {
  const res=await page.goto(testURL);assert.equal(res.status(),200);
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:'test-output/desktop.png',fullPage:true});
  await page.locator('input[type=file]').setInputFiles({name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('not a PDF')});
  await page.getByRole('alert').filter({hasText:'PDF 格式'}).waitFor();
  await page.getByRole('button',{name:'關閉錯誤訊息'}).click();
  // A genuine empty PDF is different from the user's second continuation page.
  let blank='%PDF-1.4\n';const offsets=[0];
  for(const [i,body] of ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << >> >>'].entries()){offsets.push(Buffer.byteLength(blank));blank+=`${i+1} 0 obj\n${body}\nendobj\n`;}
  const xref=Buffer.byteLength(blank);blank+='xref\n0 4\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  await page.locator('input[type=file]').setInputFiles({name:'blank.pdf',mimeType:'application/pdf',buffer:Buffer.from(blank)});
  await page.getByText('1 頁・已略過 1 個空白頁').waitFor();
  assert.ok(await page.getByRole('button',{name:'開始辨識課表'}).isDisabled());
  await page.goto(testURL);
  await page.getByRole('button',{name:'使用說明'}).click();await page.getByRole('button',{name:'了解，開始安排'}).click();
  await page.getByRole('button',{name:'先用示範課表試試'}).click();
  await page.getByRole('button',{name:'課程清單',exact:true}).click();assert.equal(await page.locator('.course-row').count(),6);
  await page.getByRole('button',{name:'新增課程',exact:true}).click();
  await page.getByLabel('課程名稱').fill('測試課程');await page.getByLabel('上課地點').fill('TEST-101');
  await page.getByRole('button',{name:'確認並儲存'}).click();assert.equal(await page.locator('.course-row').count(),7);
  await page.locator('.course-row').filter({hasText:'測試課程'}).click();
  await page.getByRole('button',{name:'拆分時段'}).click();await page.getByLabel('在此時間拆成兩段').fill('09:30');
  await page.getByRole('button',{name:'確認拆分',exact:true}).click();assert.equal(await page.locator('.course-row').count(),8);
  // Delete both test pieces. Native confirmation is intentionally exercised.
  page.on('dialog',d=>d.accept());
  for(let i=0;i<2;i++){await page.locator('.course-row').filter({hasText:'測試課程'}).first().click();await page.getByRole('button',{name:'刪除時段'}).click();}
  assert.equal(await page.locator('.course-row').count(),6);
  await page.getByRole('button',{name:'每週課表',exact:true}).click();
  await page.screenshot({path:'test-output/editor.png',fullPage:true});
  await page.getByRole('button',{name:'設定學期',exact:true}).click();
  await page.getByLabel('學期開始日期').fill('2026-09-07');await page.getByLabel('學期結束日期').fill('2027-01-15');
  const dl=page.waitForEvent('download');await page.getByRole('button',{name:'下載行事曆',exact:true}).click();
  const download=await dl;await download.saveAs('test-output/demo.ics');
  await page.getByRole('heading',{name:'課表就位，出發吧！'}).waitFor();
  await page.screenshot({path:'test-output/download.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.goto(testURL);
  await page.screenshot({path:'test-output/mobile.png',fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  await page.getByRole('button',{name:'先用示範課表試試'}).click();
  await page.getByRole('button',{name:'課程清單',exact:true}).click();
  await page.screenshot({path:'test-output/mobile-editor.png',fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  console.log('PASS: demo, CRUD, split, date settings, download, mobile layout.');
  if(process.env.TEST_PDF) {
    await page.setViewportSize({width:1440,height:1100});await page.goto(testURL);
    await page.locator('input[type=file]').setInputFiles(process.env.TEST_PDF);
    await page.getByText('2 頁・已略過 0 個空白頁').waitFor({timeout:30000});
    console.log('PASS: both real PDF pages retained, including continuation page.');
    await page.getByRole('button',{name:'開始辨識課表'}).click();
    await page.getByRole('heading',{name:'每一堂課，都安排好了嗎？'}).waitFor({timeout:240000});
    await page.getByRole('button',{name:'課程清單',exact:true}).click();
    const rows=await page.locator('.course-row').allTextContents();console.log('OCR_COURSES',JSON.stringify(rows));
    await writeFile('test-output/ocr-result.json',JSON.stringify(rows,null,2));
    assert.equal(rows.length,10,'Reference PDF should yield ten weekly time blocks');
    assert.ok(rows.some(r=>r.includes('週六')&&r.includes('18:20 – 20:05')),'Saturday course must continue onto page two');
    assert.ok(rows.some(r=>r.includes('16:10 – 19:10')),'Evening row must remain in merged class');
    await page.screenshot({path:'test-output/ocr.png',fullPage:true});
    await page.getByRole('button',{name:'設定學期',exact:true}).click();await page.getByRole('alert').waitFor();
    console.log('PASS: real PDF recognition and pending-review export block.');
  }
  assert.deepEqual(errors,[],'No JavaScript errors');
  const posted=requests.filter(r=>r.method!=='GET'&&r.method!=='HEAD');
  assert.deepEqual(posted,[],'No file or OCR data is sent over the network');
  await writeFile('test-output/network.json',JSON.stringify(requests,null,2));
  console.log('PASS: no JavaScript errors; only GET requests observed.');
} finally {await browser.close();}
