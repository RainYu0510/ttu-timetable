import {ChevronDown,FileCheck2,RotateCcw} from 'lucide-react';
import type {HTMLTimetable} from './html';
import {weekdays} from './model';
export function SourcePreview({source,fileName,onReplace}:{source:HTMLTimetable;fileName:string;onReplace:()=>void}) {
  return <div className="html-source"><div className="file-strip"><span className="file-symbol"><FileCheck2 size={23}/></span><div><strong>{fileName}</strong><small>已讀取 {source.cellCount} 筆節次，合併為 {source.courses.length} 個上課時段</small></div><button className="button secondary" onClick={onReplace}><RotateCcw size={14}/> 更換 HTML</button></div><details className="source-details"><summary>對照原始課表資料 <ChevronDown size={15}/></summary><p>以下僅顯示讀取到的表格文字，不執行原始網頁。</p><div className="source-table-scroll"><table><thead><tr><th>節次與時間</th>{source.weekdays.map(day=><th key={day}>星期{weekdays[day-1]}</th>)}</tr></thead><tbody>{source.rows.map((row,i)=><tr key={i}><th>{row.label}<small>{row.startTime} – {row.endTime}</small></th>{row.cells.map((cell,j)=><td key={j}>{cell||'—'}</td>)}</tr>)}</tbody></table></div></details></div>;
}
