import { parse, type DefaultTreeAdapterMap } from 'parse5';
import { mergeCells, uid, validTime, type Course } from './model';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];
export interface SourceRow { label: string; startTime: string; endTime: string; cells: string[] }
export interface HTMLTimetable { courses: Course[]; weekdays: number[]; rows: SourceRow[]; cellCount: number }
export const MAX_HTML_BYTES = 5 * 1024 * 1024;
const element = (n: Node): n is Element => 'tagName' in n;
const children = (n: Node): Node[] => 'childNodes' in n ? n.childNodes : [];
const attr = (n: Element, key: string) => n.attrs.find(a => a.name === key)?.value;
const ignored = new Set(['script', 'style', 'template', 'noscript', 'iframe', 'object', 'embed', 'svg', 'button', 'input']);

// parse5 creates plain data, not live DOM: scripts, images and links cannot run or fetch.
function text(n: Node): string {
  if (n.nodeName === '#text') return (n as DefaultTreeAdapterMap['textNode']).value;
  if (element(n) && ignored.has(n.tagName)) return '';
  if (element(n) && n.tagName === 'br') return '\n';
  const content = children(n).map(text).join('');
  return element(n) && ['div', 'p', 'li'].includes(n.tagName) ? '\n' + content + '\n' : content;
}
const lines = (n: Node) => text(n).split(/\r?\n/).map(s => s.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim()).filter(Boolean);
function tables(root: Node): Element[] {
  const result: Element[] = [], stack: Node[] = [root];
  while (stack.length) { const n=stack.pop()!; if(element(n)&&n.tagName==='table') result.push(n); stack.push(...children(n)); }
  return result;
}
function rows(table: Element): Element[] {
  return children(table).flatMap(n => {
    if(!element(n)) return [];
    if(n.tagName==='tr') return [n];
    if(['thead','tbody','tfoot'].includes(n.tagName)) return children(n).filter((c):c is Element=>element(c)&&c.tagName==='tr');
    return [];
  });
}
function expand(table: Element): Element[][] {
  const result: Element[][]=[];
  const source=rows(table);
  if(source.length>200) throw new Error('課表列數過多，請只保留一份個人課表。');
  source.forEach((row,r)=>{
    result[r]??=[]; let col=0;
    for(const cell of children(row).filter((n):n is Element=>element(n)&&['td','th'].includes(n.tagName))) {
      while(result[r][col]) col++;
      const span=(key:string,maximum:number)=>{
        const raw=attr(cell,key)??'1';
        if(!/^\d+$/.test(raw)||Number(raw)<1||Number(raw)>maximum) throw new Error('課表的合併儲存格超出支援範圍。');
        return Number(raw);
      };
      const width=span('colspan',8), height=span('rowspan',source.length-r);
      if(col+width>8) throw new Error('課表欄數超出支援範圍。');
      for(let y=r;y<r+height;y++) {
        result[y]??=[];
        for(let x=col;x<col+width;x++) { if(result[y][x])throw new Error('課表的合併儲存格互相重疊。');result[y][x]=cell; }
      }
      col+=width;
    }
  });
  return result;
}
function weekday(n: Node): number | undefined {
  const m=text(n).replace(/\s/g,'').match(/^(?:星期|週|周|禮拜)([一二三四五六日天1-7])(?:$|[A-Za-z])/);
  if(!m)return;
  const d=m[1];return /[1-7]/.test(d)?Number(d):d==='天'?7:'一二三四五六日'.indexOf(d)+1;
}
function header(table:Element): {index:number;days:{col:number;day:number}[]} | null {
  const source=rows(table);
  for(let i=0;i<Math.min(source.length,5);i++) {
    const cells=children(source[i]).filter((n):n is Element=>element(n)&&['td','th'].includes(n.tagName));
    const days=cells.flatMap((n,col)=>{const day=weekday(n);return day?[{col,day}]:[];});
    if(days.length>=2&&days.every(d=>d.col>0))return {index:i,days};
  }
  return null;
}
export function decodeHTML(bytes:Uint8Array):string {
  const prefix=new TextDecoder('windows-1252').decode(bytes.slice(0,4096));
  let encoding=prefix.match(/charset\s*=\s*["']?\s*([\w-]+)/i)?.[1]??'utf-8';
  if(bytes[0]===0xff&&bytes[1]===0xfe)encoding='utf-16le';
  else if(bytes[0]===0xfe&&bytes[1]===0xff)encoding='utf-16be';
  try { return new TextDecoder(encoding,{fatal:true}).decode(bytes); }
  catch { throw new Error('無法讀取 HTML 文字編碼，請從學校網頁重新另存為 UTF-8 的 HTML。'); }
}
export function parseTimetableHTML(html:string):HTMLTimetable {
  if(new TextEncoder().encode(html).length>MAX_HTML_BYTES)throw new Error('HTML 檔案超過 5 MB，請只保留課表頁面。');
  const document=parse(html);
  const candidates=tables(document).flatMap(table=>{const h=header(table);return h?[{table,header:h}]:[];});
  if(!candidates.length)throw new Error('找不到課表表格。請另存大同大學「本人功課表」的 HTML，而不是登入頁或圖片。');
  if(candidates.length>1)throw new Error('找到多張課表，請另存只包含一份課表的 HTML。');
  const selected=candidates[0], grid=expand(selected.table), days=selected.header.days;
  if(new Set(days.map(d=>d.day)).size!==days.length)throw new Error('星期欄位重複，請檢查課表版型。');
  const courses:Course[]=[], sourceRows:SourceRow[]=[];let lastEnd='';
  for(let row=selected.header.index+1;row<grid.length;row++) {
    const cells=grid[row];
    if(!cells[0])throw new Error(`第 ${row+1} 列缺少時間欄位。`);
    const slot=lines(cells[0]);
    const times=[...slot.join(' ').normalize('NFKC').matchAll(/\b\d{1,2}:\d{2}\b/g)].map(m=>m[0].padStart(5,'0'));
    const content=days.map(d=>cells[d.col]?lines(cells[d.col]):[]);
    if(!times.length&&content.every(c=>!c.length))continue;
    if(times.length!==2||!times.every(validTime)||times[0]>=times[1]||(lastEnd&&times[0]<lastEnd))throw new Error(`第 ${row+1} 列的時間不完整或順序錯誤，請檢查原始課表。`);
    lastEnd=times[1];
    sourceRows.push({label:slot[0]?.replace(/\s/g,'')||`時段 ${sourceRows.length+1}`,startTime:times[0],endTime:times[1],cells:content.map(c=>c.join('\n'))});
    days.forEach((d,i)=>{
      if(!cells[d.col])throw new Error(`第 ${row+1} 列缺少星期欄位，請檢查課表版型。`);
      const original=content[i];if(!original.length)return;
      const pieces=[...original];
      const courseCode=/^[A-Z]\d{3,6}[A-Z0-9]*$/i.test(pieces[0])?pieces.shift()!:'';
      const courseName=pieces.shift()??'';
      const room=pieces.join(' ');
      courses.push({id:uid(),courseName,courseCode,weekday:d.day,startTime:times[0],endTime:times[1],location:room==='-'?'':room,startRow:row,endRow:row,rawText:original.join('\n')});
    });
  }
  if(!courses.length)throw new Error('課表內沒有課程。請確認已完成選課，或手動新增課程。');
  return {courses:mergeCells(courses),weekdays:days.map(d=>d.day),rows:sourceRows,cellCount:courses.length};
}
export async function loadHTML(file:File):Promise<HTMLTimetable> {
  if(!/\.html?$/i.test(file.name))throw new Error('請選擇 HTML 格式的課表（.html 或 .htm），不支援 PDF。');
  if(file.size>MAX_HTML_BYTES)throw new Error('HTML 檔案超過 5 MB，請只保留課表頁面。');
  return parseTimetableHTML(decodeHTML(new Uint8Array(await file.arrayBuffer())));
}
