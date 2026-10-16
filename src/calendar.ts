import { courseErrors, type Course, type Settings } from './model';
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
function parseDate(s: string) {
  if (!datePattern.test(s)) throw new Error('請填寫完整的學期日期。');
  const d = new Date(`${s}T00:00:00Z`);
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0,10)!==s) throw new Error('學期日期無效。');
  return d;
}
export function firstDate(start: string, weekday: number): string {
  const d = parseDate(start); d.setUTCDate(d.getUTCDate()+(weekday%7-d.getUTCDay()+7)%7);
  return d.toISOString().slice(0,10);
}
export function validateExport(courses: Course[], settings: Settings): string[] {
  const errors:string[]=[];
  if(!courses.length) errors.push('請先新增或匯入至少一筆課程。');
  if(!settings.name.trim()) errors.push('請填寫行事曆名稱。');
  try { parseDate(settings.start); parseDate(settings.end); if(settings.end<settings.start) errors.push('學期結束日期不得早於開始日期。'); }
  catch(e) { errors.push((e as Error).message); }
  if(![-1,5,10,15,30].includes(settings.reminder)) errors.push('請選擇有效的課前提醒。');
  courses.forEach(c=>{
    const errs = courseErrors(c);
    if(errs.length) errors.push(`${c.courseName || '未命名課程'}：${errs.join('、')}。`);
    if(c.needsReview) errors.push(`${c.courseName || '未命名課程'}：請先檢查並確認匯入資料。`);
    if(!errs.length && !errors.some(e=>e.includes('日期'))) {
      if(firstDate(settings.start,c.weekday)>settings.end) errors.push(`${c.courseName}：學期範圍內沒有符合的上課日。`);
    }
  });
  return [...new Set(errors)];
}
export function escapeICS(text: string) { return text.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,'); }
// RFC 5545: fold at 75 UTF-8 octets, never through a multibyte character.
export function foldLine(line: string): string {
  const encoder=new TextEncoder(); let out='',segment='',size=0;
  for(const char of line) { const len=encoder.encode(char).length; if(size+len>75){out+=segment+'\r\n';segment=' ';size=1;} segment+=char;size+=len; }
  return out+segment;
}
export function buildICS(courses:Course[],settings:Settings, now=new Date()):string {
  const errors=validateExport(courses,settings); if(errors.length) throw new Error(errors.join('\n'));
  const stamp=now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z');
  const until=settings.end.replace(/-/g,'')+'T155959Z'; // 23:59:59 in Taipei
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//TTU Timetable//Student Project//ZH-TW','CALSCALE:GREGORIAN',`X-WR-CALNAME:${escapeICS(settings.name)}`,'X-WR-TIMEZONE:Asia/Taipei',
    'BEGIN:VTIMEZONE','TZID:Asia/Taipei','BEGIN:STANDARD','DTSTART:19700101T000000','TZOFFSETFROM:+0800','TZOFFSETTO:+0800','TZNAME:CST','END:STANDARD','END:VTIMEZONE'];
  courses.forEach(c=>{
    const day=firstDate(settings.start,c.weekday).replace(/-/g,'');
    lines.push('BEGIN:VEVENT',`UID:${c.id}@ttu-timetable.local`,`DTSTAMP:${stamp}`,`DTSTART;TZID=Asia/Taipei:${day}T${c.startTime.replace(':','')}00`,`DTEND;TZID=Asia/Taipei:${day}T${c.endTime.replace(':','')}00`,`RRULE:FREQ=WEEKLY;BYDAY=${['MO','TU','WE','TH','FR','SA','SU'][c.weekday-1]};UNTIL=${until}`,`SUMMARY:${escapeICS(c.courseName)}`,`LOCATION:${escapeICS(c.location)}`,`DESCRIPTION:${escapeICS(c.courseCode ? '課程代碼：'+c.courseCode : '由大同課表轉換器建立')}`);
    if(settings.reminder>=0) lines.push('BEGIN:VALARM',`TRIGGER:-PT${settings.reminder}M`,'ACTION:DISPLAY',`DESCRIPTION:${escapeICS('上課提醒：'+c.courseName)}`,'END:VALARM');
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');return lines.map(foldLine).join('\r\n')+'\r\n';
}
