export interface Course {
  id: string;
  courseName: string;
  courseCode: string;
  weekday: number;
  startTime: string;
  endTime: string;
  location: string;
  startRow?: number;
  endRow?: number;
  rawText?: string;
}
export interface Settings { start: string; end: string; reminder: number; name: string }
export const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
export const uid = () => crypto.randomUUID();
export const timeMinutes = (t: string) => { const [h,m] = t.split(':').map(Number); return h*60+m; };
export const validTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
export function courseErrors(c: Course): string[] {
  const out: string[] = [];
  if (!c.courseName.trim()) out.push('請填寫課程名稱');
  if (!Number.isInteger(c.weekday) || c.weekday<1 || c.weekday>7) out.push('請選擇星期');
  if (!validTime(c.startTime) || !validTime(c.endTime)) out.push('請填寫正確的上課時間');
  else if(c.endTime<=c.startTime) out.push('結束時間必須晚於開始時間');
  return out;
}
export function conflicts(courses: Course[]): Set<string> {
  const ids = new Set<string>();
  courses.forEach((a,i) => courses.slice(i+1).forEach(b => {
    if (a.weekday===b.weekday && !courseErrors(a).length && !courseErrors(b).length && a.startTime<b.endTime && b.startTime<a.endTime) { ids.add(a.id); ids.add(b.id); }
  }));
  return ids;
}
export function mergeCells(courses: Course[]): Course[] {
  const result: Course[] = [];
  const normalized = (s:string) => s.replace(/\s/g,'');
  [...courses].sort((a,b) => a.weekday-b.weekday || (a.startRow??0)-(b.startRow??0)).forEach(c => {
    const prev = result.at(-1);
    const sameCode=prev&&normalized(prev.courseCode)===normalized(c.courseCode);
    const sameName=prev&&normalized(prev.courseName)===normalized(c.courseName);
    if(prev && prev.weekday===c.weekday && prev.endRow!==undefined && c.startRow===prev.endRow+1 && sameCode && sameName && normalized(prev.location)===normalized(c.location) && !!prev.courseName.trim() && validTime(prev.startTime) && validTime(c.endTime)) {
      prev.endRow = c.endRow; prev.endTime = c.endTime;
      prev.rawText = `${prev.rawText??''}\n${c.rawText??''}`;
    } else result.push({...c});
  });
  return result;
}
export const palette = ['mint','blue','peach','lavender','yellow','pink'];
export function courseColor(c: Course) {
  let h=0; for (const ch of c.courseCode || c.courseName || c.id) h=(h*31+ch.charCodeAt(0))>>>0;
  return palette[h%palette.length];
}
export function demoCourses(): Course[] {
  // Fictional data. Never derived from the user's personal timetable.
  return [
    ['程式設計','DEMO01',1,'09:10','12:00','教學大樓 201'],
    ['設計思考','DEMO02',2,'13:10','15:00','創意教室 302'],
    ['資料結構','DEMO03',3,'09:10','12:00','教學大樓 305'],
    ['程式設計','DEMO01',4,'13:10','15:00','教學大樓 201'],
    ['大學英文','DEMO04',5,'10:10','12:00','語言教室 102'],
    ['數位攝影','DEMO05',2,'16:10','19:10','攝影教室 101'],
  ].map(([courseName,courseCode,weekday,startTime,endTime,location]) => ({id:uid(),courseName:String(courseName),courseCode:String(courseCode),weekday:Number(weekday),startTime:String(startTime),endTime:String(endTime),location:String(location)}));
}
