import { TypingTitle } from './TypingTitle';

interface HomeHeroProps {
  busy:boolean;
  dragging:boolean;
  onUpload:()=>void;
  onFile:(file?:File)=>void;
  onDragChange:(dragging:boolean)=>void;
  onDemo:()=>void;
  onManual:()=>void;
}
export function HomeHero({busy,dragging,onUpload,onFile,onDragChange,onDemo,onManual}:HomeHeroProps) {
  return <section className={'home-hero '+(dragging?'dragging':'')} onDragOver={e=>{e.preventDefault();onDragChange(true);}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))onDragChange(false);}} onDrop={e=>{e.preventDefault();onDragChange(false);onFile(e.dataTransfer.files[0]);}} aria-labelledby="hero-heading">
 <article className="floating featured" aria-hidden="true"><div className="drawing" aria-hidden="true"><svg viewBox="0 0 120 120" fill="none"><path d="M19 31Q40 22 60 33Q80 22 101 31V91Q79 84 60 95Q40 85 19 91Z" stroke="#252820" strokeWidth="2"/><path d="M25 24Q42 21 60 31V88Q42 80 25 83Z" fill="#e6bc9f"/><path d="M60 31Q79 21 95 24V83Q79 80 60 88Z" fill="#efd1b9"/><path d="M60 31V89" stroke="#252820" strokeWidth="2"/><path d="M39 102Q51 100 60 106Q70 100 83 102" stroke="#252820" strokeWidth="2" strokeLinecap="round"/></svg></div><div className="card-body"><div className="card-meta"><span className="kind"><span className="small-symbol">▤</span> 課程</span><span>週一 · 09:10</span></div><div className="card-content"><h3>程式設計<br/>從想法到第一行程式</h3><div className="card-foot">⌖ 教學大樓 201 <span>→</span></div></div></div></article>
 <article className="floating top-right" aria-hidden="true"><div className="card-meta"><span className="kind">◷ 社團</span><span>週二 · 18:30</span></div><div className="card-content"><h3>開源社聚<br/>一起做點有趣的事</h3><div className="card-foot">⌖ 社團教室</div></div></article>
 <article className="floating left-edge" aria-hidden="true"><div className="card-meta">個人 · 週三</div><div className="card-content"><h3>晨間跑步</h3><div className="card-foot">07:00 · 操場</div></div></article>
 <article className="floating right-edge" aria-hidden="true"><div className="card-meta">課程 · 週四</div><div className="card-content"><h3>大學英文</h3><div className="card-foot">10:10 · 語言教室</div></div></article>
 <div className="home-intro"><div className="eyebrow">TTU TIMETABLE · HTML TO ICS</div><TypingTitle/><p className="home-description">上傳大同課表 HTML，轉成整學期的行事曆。</p><button className="home-upload" aria-label="上傳課表" disabled={busy} onClick={onUpload}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/></svg>{busy?'讀取中…':'上傳課表'} <span>↗</span></button><p className="home-caption">HTML / HTM · 5 MB 以下</p><div className="home-actions"><button onClick={onManual} disabled={busy}>手動建立課表</button><button onClick={onDemo} disabled={busy}>先用示範課表試試</button></div></div>
 <article className="floating bottom-left" aria-hidden="true"><div className="card-meta"><span className="kind">▤ 課程</span><span>週三 · 13:10</span></div><div className="card-content"><h3>資料結構<br/>拆解問題的方式</h3><div className="card-foot">⌖ 教學大樓 305</div></div></article>
 <article className="floating bottom-mid" aria-hidden="true"><div className="drawing" aria-hidden="true"><svg viewBox="0 0 110 110" fill="none"><path d="M22 79H93L83 88H16Z" fill="#b8c8bc"/><path d="M25 75L30 28Q30 24 35 24H82Q87 24 87 29L82 75Z" stroke="#282c25" strokeWidth="2"/><path d="M35 33H78L75 64H32Z" fill="#d6dfd1"/><path d="M46 42L40 48L46 54M62 42L68 48L62 54M58 40L52 57" stroke="#394b3d" strokeWidth="2" strokeLinecap="round"/><path d="M24 75H83L93 83H14Z" stroke="#282c25" strokeWidth="2"/></svg></div><div className="card-body"><div className="card-meta"><span className="kind">◷ 社團</span><span>週五 · 18:00</span></div><div className="card-content"><h3>網頁開發工作坊</h3><div className="card-foot">⌖ 電腦教室 · 帶上你的點子</div></div></div></article>
 <article className="floating bottom-right" aria-hidden="true"><div className="card-meta"><span className="kind">◌ 個人</span><span>週六 · 14:00</span></div><div className="card-content"><h3>咖啡與閱讀</h3><div className="card-foot">⌖ 城市裡的一間咖啡店</div></div></article>
</section>;
}
