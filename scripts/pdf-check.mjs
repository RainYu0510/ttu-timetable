import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1100}});
page.on('pageerror',e=>console.log('PAGEERROR',e.message));page.on('console',m=>console.log('CONSOLE',m.type(),m.text()));
try{await page.goto('http://127.0.0.1:5173/');await page.locator('input[type=file]').setInputFiles(process.env.TEST_PDF);
await page.waitForFunction(()=>!document.querySelector('.progress-box'),{},{timeout:30000});
console.log('AFTER_UPLOAD',await page.locator('main').innerText());await page.screenshot({path:'test-output/pdf-upload.png',fullPage:true});
if(await page.getByRole('button',{name:'開始辨識課表'}).count()) {
await page.getByRole('button',{name:'開始辨識課表'}).click();
await page.waitForFunction(()=>!document.querySelector('.progress-box'),{},{timeout:240000});
console.log('AFTER_OCR',await page.locator('main').innerText());
await page.screenshot({path:'test-output/ocr.png',fullPage:true});
if(await page.getByRole('button',{name:'課程清單',exact:true}).count()){
await page.getByRole('button',{name:'課程清單',exact:true}).click();const rows=await page.locator('.course-row').allTextContents();console.log('OCR_ROWS',JSON.stringify(rows));await writeFile('test-output/ocr-result.json',JSON.stringify(rows,null,2));}
}
}finally{await browser.close();}
