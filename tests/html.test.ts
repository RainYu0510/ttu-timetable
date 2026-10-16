import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decodeHTML,loadHTML,parseTimetableHTML} from '../src/html.ts';
const cell='C1001<br>程式設計<br>A3-101';
const wrap=(body:string,heading='<td>節次</td><td>星期一</td><td>星期六</td>')=>`<!doctype html><meta charset="UTF-8"><table class="mistab"><tr>${heading}</tr>${body}</table>`;
const row=(label:string,start:string,end:string,left:string,right='')=>`<tr><td>${label}<br>${start}<br>${end}</td><td>${left}</td><td>${right}</td></tr>`;
test('HTML reads exact Chinese and codes, merges evening periods, preserves gaps',()=>{
  const html=wrap(row('第八節','16:10','17:00',cell)+row('傍晚','17:10','18:00',cell)+row('第九節','18:20','19:10',cell)+row('第十節','19:15','20:05','',cell));
  const result=parseTimetableHTML(html);
  assert.equal(result.cellCount,4);assert.equal(result.courses.length,2);
  assert.equal(result.courses[0].courseName,'程式設計');assert.equal(result.courses[0].courseCode,'C1001');
  assert.equal(result.courses[0].startTime,'16:10');assert.equal(result.courses[0].endTime,'19:10');
  assert.equal(result.courses[1].weekday,6);assert.ok(result.courses.every(c=>c.needsReview));
  const gap=parseTimetableHTML(wrap(row('1','09:00','10:00',cell)+row('2','10:10','11:00','')+row('3','11:10','12:00',cell)));
  assert.equal(gap.courses.length,2);
});
test('HTML reads weekday headers rather than assuming column order',()=>{
  const result=parseTimetableHTML(wrap(row('1','09:00','10:00',cell),' <th>節次</th><th>星期日</th><th>星期二</th>'));
  assert.equal(result.courses[0].weekday,7);
});
test('rowspan and colspan expand to correct days and time intervals',()=>{
  const result=parseTimetableHTML(wrap(`<tr><td>1<br>09:00<br>10:00</td><td rowspan="2">${cell}</td><td></td></tr><tr><td>2<br>10:10<br>11:00</td><td></td></tr>`));
  assert.equal(result.courses.length,1);assert.equal(result.courses[0].endTime,'11:00');
  const across=parseTimetableHTML(wrap(`<tr><td>1<br>09:00<br>10:00</td><td colspan="2">${cell}</td></tr>`));
  assert.deepEqual(across.courses.map(c=>c.weekday),[1,6]);
});
test('external resources, scripts, handlers and navigation are inert data',()=>{
  const html=`<script>throw new Error('executed')</script><img src="https://invalid.test/private"><iframe src="https://invalid.test/"></iframe>`+wrap(row('1','09:00','10:00',`<script>bad()</script><img src=x onerror=bad()>C1001<br>程式&amp;設計<br>A3-101<button>退選</button>`));
  const result=parseTimetableHTML(html);
  assert.equal(result.courses[0].courseName,'程式&設計');assert.equal(result.courses[0].location,'A3-101');
  assert.ok(!result.courses[0].rawText?.includes('bad'));
});
test('reject missing, empty, ambiguous or malformed timetable instead of inventing data',()=>{
  assert.throws(()=>parseTimetableHTML('<h1>登入</h1>'),/找不到/);
  assert.throws(()=>parseTimetableHTML(wrap(row('1','09:00','10:00',''))),/沒有課程/);
  assert.throws(()=>parseTimetableHTML(wrap(row('1','12:00','10:00',cell))),/時間/);
  assert.throws(()=>parseTimetableHTML(wrap(row('1','09:00','10:00',cell))+wrap(row('1','09:00','10:00',cell))),/多張/);
  assert.throws(()=>parseTimetableHTML(wrap(`<tr><td>1<br>09:00<br>10:00</td><td rowspan="999999">${cell}</td><td></td></tr>`)),/合併/);
});
test('preserve missing fields for review and literal digits in course codes',()=>{
  const result=parseTimetableHTML(wrap(row('1','09:00','10:00','程式設計')));
  assert.equal(result.courses[0].courseCode,'');assert.equal(result.courses[0].location,'');
  assert.ok(result.courses[0].needsReview);
  const a=parseTimetableHTML(wrap(row('1','09:00','10:00','I1001<br>甲課<br>A3-101')+row('2','10:10','11:00','I1001B<br>甲課<br>A3-101')));
  assert.equal(a.courses.length,2);
});
test('decode UTF-8 and declared Big5, reject invalid encoding and PDF uploads',async()=>{
  const utf='<meta charset="UTF-8">程式設計';assert.equal(decodeHTML(new TextEncoder().encode(utf)),utf);
  const prefix=new TextEncoder().encode('<meta charset="Big5">');const big5=new Uint8Array([...prefix,0xa4,0xa4]);
  assert.ok(decodeHTML(big5).endsWith('中'));
  assert.throws(()=>decodeHTML(new Uint8Array([0xff,0xff])),/編碼/);
  await assert.rejects(()=>loadHTML(new File(['%PDF-'],'課表.pdf')),/HTML/);
  await assert.rejects(()=>loadHTML(new File([new Uint8Array(5*1024*1024+1)],'大檔案.html')),/5 MB/);
});
