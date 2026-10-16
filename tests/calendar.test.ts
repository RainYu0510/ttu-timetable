import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildICS, firstDate, foldLine, validateExport } from '../src/calendar.ts';
import { mergeCells, conflicts, type Course } from '../src/model.ts';
const base:Course={id:'course-1',courseName:'演算法',courseCode:'I3400B',weekday:3,startTime:'09:10',endTime:'12:00',location:'A3-105',needsReview:false};
const settings={start:'2026-09-07',end:'2027-01-15',reminder:10,name:'大同大學課表'};
test('first occurrence handles midweek start, Sunday and year boundary',()=>{
  assert.equal(firstDate('2026-09-07',3),'2026-09-09');
  assert.equal(firstDate('2026-10-16',1),'2026-10-19');
  assert.equal(firstDate('2026-10-18',7),'2026-10-18');
  assert.equal(firstDate('2026-12-31',1),'2027-01-04');
});
test('ICS preserves Taipei times, inclusive semester end and notification',()=>{
  const text=buildICS([base],settings,new Date('2026-10-16T00:00:00Z'));
  assert.ok(text.includes('DTSTART;TZID=Asia/Taipei:20260909T091000\r\n'));
  assert.ok(text.includes('DTEND;TZID=Asia/Taipei:20260909T120000\r\n'));
  assert.ok(text.includes('RRULE:FREQ=WEEKLY;BYDAY=WE;UNTIL=20270115T155959Z'));
  assert.ok(text.includes('TRIGGER:-PT10M'));assert.ok(text.endsWith('END:VCALENDAR\r\n'));
  assert.ok(!buildICS([base],{...settings,reminder:-1}).includes('VALARM'));
});
test('invalid data and unconfirmed import must block export',()=>{
  assert.throws(()=>buildICS([{...base,needsReview:true}],settings),/確認/);
  assert.throws(()=>buildICS([{...base,endTime:'08:00'}],settings),/晚於/);
  assert.throws(()=>buildICS([base],{...settings,start:'2027-02-30'}),/日期/);
  assert.ok(validateExport([base],{...settings,start:'2026-10-15',end:'2026-10-16'}).some(e=>e.includes('沒有符合')));
  assert.throws(()=>buildICS([],{...settings,end:'2026-01-01'}),/至少|早於/);
});
test('ICS text escapes injection and folds Chinese at UTF-8 byte boundaries',()=>{
  const value='課程測試名稱'.repeat(30)+',;\\\nEND:VEVENT';
  const text=buildICS([{...base,courseName:value}],settings);
  assert.equal(text.split('\r\n').filter(l=>l==='END:VEVENT').length,1);
  assert.ok(text.replace(/\r\n /g,'').includes('\\,\\;\\\\\\nEND:VEVENT'));
  for(const line of foldLine('SUMMARY:'+value).split('\r\n')) assert.ok(new TextEncoder().encode(line).length<=75);
});
test('merge adjacent identical cells including evening row, keep gaps and room changes',()=>{
  const cells=[0,1,2].map(n=>({...base,id:String(n),startRow:n,endRow:n,startTime:['16:10','17:10','18:20'][n],endTime:['17:00','18:00','19:10'][n]}));
  const merged=mergeCells(cells);assert.equal(merged.length,1);assert.equal(merged[0].startTime,'16:10');assert.equal(merged[0].endTime,'19:10');
  assert.equal(mergeCells([cells[0],cells[2]]).length,2);
  assert.equal(mergeCells([cells[0],{...cells[1],location:'A3-106'}]).length,2);
  assert.equal(mergeCells([cells[0],{...cells[1],weekday:4}]).length,2);
  assert.equal(mergeCells([cells[0],{...cells[1],courseCode:'I3400C'}]).length,2,'different course codes must not merge');
});
test('conflicts detect overlap and allow back-to-back or different days',()=>{
  assert.equal(conflicts([base,{...base,id:'2',startTime:'11:00'}]).size,2);
  assert.equal(conflicts([base,{...base,id:'2',startTime:'12:00',endTime:'13:00'}]).size,0);
  assert.equal(conflicts([base,{...base,id:'2',weekday:2}]).size,0);
});
