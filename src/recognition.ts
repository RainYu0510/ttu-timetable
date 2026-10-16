import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createWorker, PSM, type Worker } from 'tesseract.js';
import { mergeCells, uid, type Course } from './model';
pdfjs.GlobalWorkerOptions.workerSrc=pdfWorker;
export interface PagePreview { number:number; url:string; blank:boolean }
export interface LoadedPDF { document:pdfjs.PDFDocumentProxy; pages:PagePreview[] }
export type Progress = (percent:number,message:string)=>void;
export async function loadPDF(file:File,onProgress:Progress):Promise<LoadedPDF> {
  if(!/\.pdf$/i.test(file.name)) throw new Error('請選擇 PDF 格式的課表。');
  if(file.size>20*1024*1024) throw new Error('檔案超過 20 MB，請先縮小檔案。');
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(!new TextDecoder().decode(bytes.slice(0,1024)).includes('%PDF-')) throw new Error('檔案不是有效的 PDF。');
  let doc:pdfjs.PDFDocumentProxy;
  try { doc=await pdfjs.getDocument({data:bytes}).promise; }
  catch(e) { if((e as Error).name==='PasswordException') throw new Error('此 PDF 受密碼保護，請改用未加密的課表。');throw new Error('無法讀取 PDF，檔案可能損壞。'); }
  if(doc.numPages>30) { await doc.loadingTask.destroy(); throw new Error('頁數超過 30 頁，請只保留課表相關頁面。'); }
  const pages:PagePreview[]=[];
  try {
    for(let i=1;i<=doc.numPages;i++) {
      onProgress(i/doc.numPages*100,`正在預覽第 ${i}／${doc.numPages} 頁`);
      const canvas=await renderPage(doc,i,1);
      const {data}=canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height);
      let dark=0;for(let j=0;j<data.length;j+=16) if(data[j]<225 || data[j+1]<225 || data[j+2]<225) dark++;
      const blank=dark/(data.length/16)<0.002;
      pages.push({number:i,url:canvas.toDataURL('image/png'),blank});
    }
    return {document:doc,pages};
  } catch(e) { await doc.loadingTask.destroy(); throw e; }
}
export async function renderPage(doc:pdfjs.PDFDocumentProxy,pageNumber:number,scale:number) {
  const page=await doc.getPage(pageNumber);const viewport=page.getViewport({scale});
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  await page.render({canvas,viewport}).promise;return canvas;
}
function groups(values:number[]):number[][] { const out:number[][]=[];for(const n of values) { const last=out.at(-1);if(last && n-last.at(-1)!<=2)last.push(n);else out.push([n]); }return out; }
export interface Grid { xs:number[]; ys:number[] }
export function detectGrid(image:ImageData):Grid {
  const {width:w,height:h,data}=image;const blue=(i:number)=>data[i+2]>95 && data[i+2]>data[i]*1.5 && data[i+2]>data[i+1]*1.15;
  const rows:number[]=[];
  for(let y=0;y<h;y++){let n=0;for(let x=0;x<w;x++)if(blue((y*w+x)*4))n++;if(n>w*.55)rows.push(y);}
  // The filled blue weekday header belongs to one thick group; its bottom is the first data boundary.
  const ys=groups(rows).map(g=>g.at(-1)!);
  if(ys.length<4) throw new Error('找不到參考版型的藍色課表格線。請選擇正確頁面，或使用手動新增課程。');
  const cols:number[]=[];for(let x=0;x<w;x++){let n=0;for(let y=ys[0];y<=ys.at(-1)!;y++)if(blue((y*w+x)*4))n++;if(n>(ys.at(-1)!-ys[0])*.65)cols.push(x);}
  const xs=groups(cols).map(g=>Math.round((g[0]+g.at(-1)!)/2));
  if(xs.length<7 || xs.length>9 || ys.length>22) throw new Error('表格版型與目前支援的大同課表不同。你仍可手動建立課程。');
  return {xs,ys};
}
function cropCell(canvas:HTMLCanvasElement,x:number,y:number,w:number,h:number) {
  const out=document.createElement('canvas');out.width=Math.max(1,Math.floor(w));out.height=Math.max(1,Math.floor(h));
  const ctx=out.getContext('2d')!;ctx.drawImage(canvas,x,y,w,h,0,0,out.width,out.height);
  const pixels=ctx.getImageData(0,0,out.width,out.height);let count=0;
  for(let i=0;i<pixels.data.length;i+=4){const [r,g,b]=pixels.data.slice(i,i+3); const ink=r<155&&g<155&&b<155; if(ink) count++;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=ink?0:255;pixels.data[i+3]=255;}
  ctx.putImageData(pixels,0,0);return {canvas:out,ink:count/(out.width*out.height)};
}
export function parseCourseText(text:string) {
  const lines=text.normalize('NFKC').replace(/[—–－﹣]/g,'-').split(/\n/).map(s=>s.trim()).filter(Boolean);
  let courseCode='',location='';const name:string[]=[];
  for(const line of lines){
    let compact=line.replace(/\s/g,'');
    const code=compact.match(/^(?:[A-Z1|\[]\d{3,5}[A-Z0-9]*)/i);
    if(!courseCode&&code) {courseCode=code[0];compact=compact.slice(code[0].length);}
    if(!compact)continue;
    const room=compact.search(/[A-Z]\d?-[A-Z]?\d{2,4}/i);
    if(room>=0){if(room>0)name.push(compact.slice(0,room));location+=compact.slice(room);}
    else if(/教室|樓|地下/.test(compact)||compact==='-'||/^\(?[地下一二三四五六七八九十]+\)?$/.test(compact)) location+=compact;
    else name.push(compact);
  }
  return {courseName:name.join(''),courseCode,location,rawText:text};
}
export function parseTimeText(text:string):[string,string] | null {
  const cleaned=text.replace(/[OoＯ]/g,'0').replace(/[Il|]/g,'1').replace(/[：.]/g,':');
  const matches=[...cleaned.matchAll(/([012]?\d)\s*:\s*([0-5]\d)/g)].map(m=>`${m[1].padStart(2,'0')}:${m[2]}`).filter(t=>Number(t.slice(0,2))<=23);
  if(matches.length>=2 && matches[0]<matches[1])return [matches[0],matches[1]];
  return null;
}
export async function recognizePDF(doc:pdfjs.PDFDocumentProxy,pageNumber:number,signal:AbortSignal,onProgress:Progress):Promise<{courses:Course[];rowCount:number}> {
  let worker:Worker|undefined;
  const abort=()=>{if(worker)void worker.terminate();};signal.addEventListener('abort',abort);
  try {
    onProgress(2,'正在分析課表格線…');const canvas=await renderPage(doc,pageNumber,3);
    if(signal.aborted)throw new Error('已取消辨識。');
    const grid=detectGrid(canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height));
    onProgress(5,'正在載入中英文辨識模型，首次使用需要一些時間…');
    // Model assets only. The PDF and its pixels never leave this browser.
    const pending=createWorker(['chi_tra','eng'],1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr/core',langPath:'/ocr/lang',logger:()=>{}});
    worker=await pending;
    if(signal.aborted)throw new Error('已取消辨識。');
    const jobs:{row:number;day:number;canvas:HTMLCanvasElement}[]=[];
    const times:([string,string]|null)[]=[];
    for(let row=0;row<grid.ys.length-1;row++) {
      const y=grid.ys[row]+5,h=grid.ys[row+1]-y-5;
      const timeCanvas=document.createElement('canvas');timeCanvas.width=grid.xs[1]-grid.xs[0]-10;timeCanvas.height=h;
      const ctx=timeCanvas.getContext('2d')!;ctx.drawImage(canvas,grid.xs[0]+5,y,timeCanvas.width,h,0,0,timeCanvas.width,h);
      // White text on the coloured time column: isolate it and invert to black.
      const pixels=ctx.getImageData(0,0,timeCanvas.width,h);
      for(let k=0;k<pixels.data.length;k+=4){const white=pixels.data[k]>175&&pixels.data[k+1]>175&&pixels.data[k+2]>175;pixels.data[k]=pixels.data[k+1]=pixels.data[k+2]=white?0:255;}
      ctx.putImageData(pixels,0,0);
      await worker.setParameters({tessedit_pageseg_mode:PSM.SINGLE_BLOCK,tessedit_char_whitelist:'0123456789:'});
      if(signal.aborted)throw new Error('已取消辨識。');
      times.push(parseTimeText((await worker.recognize(timeCanvas)).data.text));
      for(let col=1;col<grid.xs.length-1;col++) {
        const cell=cropCell(canvas,grid.xs[col]+5,y,grid.xs[col+1]-grid.xs[col]-10,h);
        if(cell.ink>.009) jobs.push({row,day:col,canvas:cell.canvas});
      }
      onProgress(7+(row+1)/(grid.ys.length-1)*25,`正在讀取第 ${row+1} 個時段…`);
    }
    await worker.setParameters({tessedit_pageseg_mode:PSM.SINGLE_BLOCK,tessedit_char_whitelist:'',preserve_interword_spaces:'1'});
    const courses:Course[]=[];
    for(let i=0;i<jobs.length;i++) {
      if(signal.aborted)throw new Error('已取消辨識。');
      const j=jobs[i];onProgress(32+i/Math.max(jobs.length,1)*65,`正在辨識課程 ${i+1}／${jobs.length}…`);
      const result=await worker.recognize(j.canvas);const parsed=parseCourseText(result.data.text);
      if(!result.data.text.trim()) continue;
      courses.push({id:uid(),...parsed,weekday:j.day,startTime:times[j.row]?.[0]??'',endTime:times[j.row]?.[1]??'',needsReview:true,sourcePage:pageNumber,startRow:j.row,endRow:j.row});
    }
    onProgress(100,'辨識完成，請對照原始課表確認內容。');
    return {courses:mergeCells(courses),rowCount:grid.ys.length-1};
  } catch(e) {if(signal.aborted)throw new Error('已取消辨識。');throw e;}
  finally {signal.removeEventListener('abort',abort);if(worker)await worker.terminate().catch(()=>{});}
}

