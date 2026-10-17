import {FileCheck2,RotateCcw} from 'lucide-react';
import type {HTMLTimetable} from './html';
export function SourcePreview({source,fileName,onReplace}:{source:HTMLTimetable;fileName:string;onReplace:()=>void}) {
  return <div className="html-source"><div className="file-strip"><span className="file-symbol"><FileCheck2 size={23}/></span><div><strong>{fileName}</strong><small>已讀取 {source.cellCount} 筆節次，合併為 {source.courses.length} 個上課時段</small></div><button className="button secondary" onClick={onReplace}><RotateCcw size={14}/> 更換 HTML</button></div></div>;
}
