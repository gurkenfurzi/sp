
const SCHOOLBLOOM_PLAN_WORKER="https://dry-surf-fec5.muelliaccc.workers.dev";

let pdfjsLib=null;
async function ensurePdfJs(){
  if(pdfjsLib)return pdfjsLib;
  const tries=[
    ["https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs","https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs"],
    ["https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs","https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs"],
    ["https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.min.mjs","https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs"]
  ];
  let lastErr=null;
  for(const [src,worker] of tries){
    try{
      const lib=await import(src);
      lib.GlobalWorkerOptions.workerSrc=worker;
      pdfjsLib=lib;
      return pdfjsLib;
    }catch(err){lastErr=err;console.warn('PDF.js Quelle nicht verfügbar:',src,err)}
  }
  throw lastErr||new Error('PDF.js konnte nicht geladen werden');
}

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const KEY="schoolhub-v1";
const defaultData={
  settings:{name:"",type:"school",className:"M U1",school:"PHS Ludwigshafen",pet:"on",pdf:"https://www.phs-lu.de/wp-content/uploads/2023/04/Stundenplan.pdf"},
  homework:[], tests:[], grades:[], flashcards:[], subjects:[
    {id:"s1",name:"Deutsch",abbr:"D",color:"#f2b6b3",cover:"#f7d2cf",emoji:"🌷",notes:[],topics:[],files:[]},
    {id:"s2",name:"Mathematik",abbr:"M",color:"#b8c9ef",cover:"#dce4f7",emoji:"🫐",notes:[],topics:[],files:[]},
    {id:"s3",name:"Englisch",abbr:"E",color:"#bfd9a3",cover:"#e2edc7",emoji:"🍀",notes:[],topics:[],files:[]}
  ],
  absences:[], studySessions:[],
  lessonExtras:{},
  reminders:[],
  flashDecks:[],
  quizzes:[],
  studySheets:[],
  canvasSheets:{},
  economy:{coins:0,owned:["base-room"],equipped:[]},
  customization:{theme:"blossom",compact:false},
  timetable:{isPlaceholder:true,classes:["M U1"],selectedClass:"M U1",lessons:[]}
};
let data=load();
let taskFilter="open";
let selectedDay=dayCode(new Date())||"Mo";
let timetableViewMode="current"; // current = wichtiger Plan inkl. Änderungen, basis = normaler Basisplan
let heatModeOverride=localStorage.getItem("schoolbloom-heat-mode")||"auto";

const HEAT_LESSON_TIMES={
 1:{start:"08:00",end:"08:35"},
 2:{start:"08:35",end:"09:10"},
 3:{start:"09:25",end:"10:00"},
 4:{start:"10:00",end:"10:35"},
 5:{start:"10:50",end:"11:25"},
 6:{start:"11:25",end:"12:00"},
 7:{start:"12:25",end:"13:00"},
 8:{start:"13:00",end:"13:35"}
};
const HEAT_PAUSES=[
 {start:"09:10",end:"09:25",label:"Pause"},
 {start:"10:35",end:"10:50",label:"Pause"},
 {start:"12:00",end:"12:25",label:"Große Pause"}
];

function isHeatScheduleActive(){
 if(heatModeOverride==="on")return true;
 if(heatModeOverride==="off")return false;
 return !!data.timetable?.heatSchedule;
}
function effectiveHeatModeLabel(){
 if(heatModeOverride==="on")return "manuell";
 if(heatModeOverride==="off")return "aus";
 return data.timetable?.heatSchedule?"automatisch":"bereit";
}

let timer={seconds:25*60,running:false,handle:null,startedAt:null,mode:"focus",goal:25*60};
let currentFlash=0, flashFlipped=false;
let selectedSubjectId=null;
let selectedTopicId=null;
let selectedDeckId=null;
let selectedSheetId=null;
let selectedQuizId=null;
let quizSession=null;
let aiCloudAvailable=false;

function defaultSubjectAbbr(name){
 const n=String(name||"").trim();
 if(!n)return "";
 if(/^LF\s*\d+/i.test(n))return n.toUpperCase();
 if(/^SSPU\s*\d*/i.test(n))return n.toUpperCase();
 if(/^(ET|M-FHR|E-FHR|SK|SGL|MINT)$/i.test(n))return n.toUpperCase();
 const words=n.split(/\s+/).filter(Boolean);
 if(words.length>1)return words.map(x=>x[0]).join("").slice(0,4).toUpperCase();
 return n.slice(0,3).toUpperCase();
}
function ensureSubjectShapeRaw(s){
 s.notes ||= [];s.topics ||= [];s.files ||= [];
 s.cover ||= s.color||"#f7d2cf";
 s.emoji ||= "🌸";
 if(typeof s.abbr!=="string")s.abbr=defaultSubjectAbbr(s.name);
 for(const t of s.topics){t.materials ||= [];t.files ||= [];}
}
function load(){
 try{
   const saved=JSON.parse(localStorage.getItem(KEY)||"{}"), d=Object.assign(structuredClone(defaultData),saved);
   d.economy ||= {coins:0,owned:["base-room"],equipped:[]};
   d.customization ||= {theme:"blossom",compact:false};
   d.lessonExtras ||= {}; d.reminders ||= []; d.flashDecks ||= []; d.quizzes ||= []; d.studySheets ||= []; d.canvasSheets ||= {}; d.timetableSubjectColors ||= {};
   for(const s of (d.subjects||[])){ensureSubjectShapeRaw(s)}
   if(!d.flashDecks.length && d.flashcards?.length){
     const by={};
     for(const c of d.flashcards){
       const sub=c.subject||"Allgemein";
       if(!by[sub]){const did="deck-"+Math.random().toString(36).slice(2);by[sub]=did;d.flashDecks.push({id:did,subject:sub,topicId:null,name:"Allgemein",emoji:"🌸"});}
       c.deckId ||= by[sub];
     }
   }
   return d;
 }catch{return structuredClone(defaultData)}
}
function save(){localStorage.setItem(KEY,JSON.stringify(data));renderAll()}
function id(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function fmtDate(s){if(!s)return"";return new Date(s+"T12:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"2-digit"})}
function localISODate(d=new Date()){
 const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
 return `${y}-${m}-${day}`;
}
function todayISO(){return localISODate(new Date())}
function localDateFromISO(s){
 const m=String(s||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if(!m)return null;
 const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12,0,0,0);
 return Number.isNaN(d.getTime())?null:d;
}
function calendarDaysUntil(dateISO,from=new Date()){
 const target=localDateFromISO(dateISO);
 if(!target)return null;
 const base=new Date(from.getFullYear(),from.getMonth(),from.getDate(),12,0,0,0);
 return Math.round((target-base)/86400000);
}
function daysUntilLabel(dateISO){
 const days=calendarDaysUntil(dateISO);
 if(days==null)return "";
 if(days===0)return "Heute";
 if(days===1)return "in 1 Tag";
 if(days>1)return `in ${days} Tagen`;
 if(days===-1)return "vor 1 Tag";
 return `vor ${Math.abs(days)} Tagen`;
}
function dayCode(d){return {1:"Mo",2:"Di",3:"Mi",4:"Do",5:"Fr"}[d.getDay()]||null}
const dayNames={Mo:"Montag",Di:"Dienstag",Mi:"Mittwoch",Do:"Donnerstag",Fr:"Freitag"};
const dayOrder=["Mo","Di","Mi","Do","Fr"];
function hashColor(s){let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))%360;return `hsl(${h} 72% 68%)`}
function timetableSubjectKey(subject){
 const pretty=prettySubject(String(subject||""));
 return pretty.replace(/\s+/g," " ).trim().toUpperCase();
}
function timetableSubjectColor(subject){
 const key=timetableSubjectKey(subject);
 data.timetableSubjectColors ||= {};
 if(data.timetableSubjectColors[key])return data.timetableSubjectColors[key];
 const raw=String(subject||"").replace(/\s+/g," " ).trim().toUpperCase();
 const linked=(data.subjects||[]).find(s=>{
   const name=String(s.name||"").replace(/\s+/g," " ).trim().toUpperCase();
   const abbr=String(s.abbr||"").replace(/\s+/g," " ).trim().toUpperCase();
   return name===key||abbr===raw||abbr===key;
 });
 return linked?.color||hashColor(key||raw||"Unterricht");
}
window.setTimetableSubjectColor=function(subject,color){
 const key=timetableSubjectKey(subject);
 if(!key||!/^[#][0-9a-f]{6}$/i.test(String(color||"")))return;
 data.timetableSubjectColors ||= {};
 data.timetableSubjectColors[key]=String(color).toLowerCase();
 localStorage.setItem(KEY,JSON.stringify(data));
 try{window.v150MarkDirty?.(80)}catch(_){}
 renderPlan();renderHome();
};
window.resetTimetableSubjectColor=function(subject){
 const key=timetableSubjectKey(subject);
 data.timetableSubjectColors ||= {};
 delete data.timetableSubjectColors[key];
 localStorage.setItem(KEY,JSON.stringify(data));
 try{window.v150MarkDirty?.(80)}catch(_){}
 renderPlan();renderHome();
 const input=document.querySelector('#lessonSubjectColor');
 if(input)input.value=colorToHex(timetableSubjectColor(subject));
};
function colorToHex(color){
 const c=String(color||"").trim();
 if(/^#[0-9a-f]{6}$/i.test(c))return c;
 const tmp=document.createElement('span');tmp.style.color=c;document.body.appendChild(tmp);
 const rgb=getComputedStyle(tmp).color;tmp.remove();
 const m=rgb.match(/\d+/g);if(!m||m.length<3)return '#e9a7a4';
 return '#'+m.slice(0,3).map(n=>Math.max(0,Math.min(255,Number(n))).toString(16).padStart(2,'0')).join('');
}

function lessonKey(l){
 const p=splitCell(l.raw);
 return [l.day,l.start,l.end,p.subject,p.teacher||"",p.room||""].join("|");
}
const pauses=[
 {start:"09:30",end:"09:45",label:"Pause"},
 {start:"11:15",end:"11:30",label:"Pause"},
 {start:"13:00",end:"13:30",label:"Mittagspause"}
];
function getActivePauses(){
 if(isHeatScheduleActive())return HEAT_PAUSES;
 return pauses;
}


function normalTimeForRow(rowNum){
 for(const rows of (data.timetable?.rowMaps||[])){
   const r=(rows||[]).find(x=>Number(x.num)===Number(rowNum));
   if(r)return {start:r.start,end:r.end};
 }
 return null;
}

function effectiveTimeForRow(rowNum){
 if(isHeatScheduleActive() && HEAT_LESSON_TIMES[rowNum])return HEAT_LESSON_TIMES[rowNum];
 return normalTimeForRow(rowNum);
}

function applyEffectiveDisplayTimes(list){
 return (list||[]).map(l=>{
   if(l.specialOnly||l.rowNum==null)return {...l};

   const blocks=Math.max(1,Number(l.blocks||1));
   const first=Number(l.rowNum);
   const last=first+blocks-1;
   const a=effectiveTimeForRow(first);
   const b=effectiveTimeForRow(last);
   if(!a||!b)return {...l};

   return {...l,start:a.start,end:b.end};
 });
}
function timetableTimeForRow(rowNum){
 return effectiveTimeForRow(rowNum);
}

function splitMultiLessonForVisibleBreaks(lesson){
 const blocks=Math.max(1,Number(lesson?.blocks||1));
 if(blocks<=1 || lesson?.rowNum==null)return [lesson];

 const pieces=[];
 for(let i=0;i<blocks;i++){
   const rowNum=Number(lesson.rowNum)+i;
   const t=timetableTimeForRow(rowNum);
   if(!t)return [lesson];

   pieces.push({
     ...lesson,
     start:t.start,
     end:t.end,
     rowNum,
     blocks:1,
     isDouble:false,
     splitFromMulti:true,
     originalBlocks:blocks,
     splitIndex:i+1
   });
 }

 // Split visually only if there is actually a pause between two parts.
 const crossesPause=pieces.some((piece,i)=>{
   if(i>=pieces.length-1)return false;
   const next=pieces[i+1];
   return getActivePauses().some(p=>p.start===piece.end && p.end===next.start)
       || officialBreaks.some(([s,e])=>s===piece.end && e===next.start);
 });

 return crossesPause?pieces:[lesson];
}

function expandLessonsForVisibleBreaks(list){
 const out=[];
 for(const l of (list||[]))out.push(...splitMultiLessonForVisibleBreaks(l));
 return out.sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end));
}

// Für „Heute → Jetzt“: Mehrfachstunden laufen nur bis zur echten Pause durch.
// Direkt aufeinanderfolgende Stunden ohne Pause bleiben dagegen ein gemeinsamer Block.
function splitMultiLessonForCountdown(lesson){
 const blocks=Math.max(1,Number(lesson?.blocks||1));
 if(blocks<=1 || lesson?.rowNum==null)return [lesson];

 const rows=[];
 for(let i=0;i<blocks;i++){
   const rowNum=Number(lesson.rowNum)+i;
   const t=timetableTimeForRow(rowNum);
   if(!t)return [lesson];
   rows.push({rowNum,start:t.start,end:t.end});
 }

 const segments=[];
 let first=rows[0],last=rows[0],count=1;
 for(let i=1;i<rows.length;i++){
   const row=rows[i];
   if(breakBetween(last.end,row.start)){
     segments.push({first,last,count});
     first=row;count=1;
   }else{
     count++;
   }
   last=row;
 }
 segments.push({first,last,count});
 if(segments.length===1)return [lesson];

 return segments.map((seg,index)=>({
   ...lesson,
   start:seg.first.start,
   end:seg.last.end,
   rowNum:seg.first.rowNum,
   blocks:seg.count,
   isDouble:seg.count>=2,
   countdownSplit:true,
   originalBlocks:blocks,
   countdownSegment:index+1
 }));
}
function expandLessonsForCountdown(list){
 const out=[];
 for(const l of (list||[]))out.push(...splitMultiLessonForCountdown(l));
 return out.sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end));
}
function renderLessonsWithPauses(ls){
 const merged=expandLessonsForVisibleBreaks(mergeLessons(ls));
 if(!merged.length)return "";

 const toMin=t=>{
   const [hh,mm]=String(t||"00:00").split(":").map(Number);
   return hh*60+mm;
 };

 const firstStart=Math.min(...merged.map(x=>toMin(x.start)));
 const lastEnd=Math.max(...merged.map(x=>toMin(x.end)));

 const events=merged.map(x=>({
   type:"lesson",
   sort:toMin(x.start),
   lesson:x
 }));

 // Pausen werden unabhängig davon eingesetzt, ob direkt vor/nach ihnen
 // eine erkannte Stunde steht. Entscheidend ist nur:
 // Der Tagesplan beginnt davor und läuft danach noch weiter.
 for(const p of getActivePauses()){
   const ps=toMin(p.start),pe=toMin(p.end);
   if(firstStart < pe && lastEnd > ps){
     events.push({
       type:"pause",
       sort:ps,
       pause:p
     });
   }
 }

 events.sort((a,b)=>{
   if(a.sort!==b.sort)return a.sort-b.sort;
   // Wenn eine Stunde exakt zur Pausenzeit endet/startet:
   // Unterricht zuerst, danach Pausenkarte.
   return a.type==="lesson"?-1:1;
 });

 const planDay=merged.find(x=>x?.day)?.day||null;
 const now=new Date();
 const nowDay=dayCode(now);
 const nowMin=now.getHours()*60+now.getMinutes();
 return events.map(e=>{
   if(e.type==="lesson")return lessonHtml(e.lesson);
   const p=e.pause;
   const active=planDay&&planDay===nowDay&&toMin(p.start)<=nowMin&&nowMin<toMin(p.end);
   return `<div class="pauseCard ${active?"currentPause":""}"><span class="cup">🍵</span><span>${p.start}–${p.end} · ${p.label}</span>${active?`<b class="pauseNowBadge">JETZT</b>`:""}</div>`;
 }).join("");
}
function ensureSubjectShape(s){
 ensureSubjectShapeRaw(s); return s;
}
data.subjects.forEach(ensureSubjectShape);
function isSpecialScheduleText(raw){
 const s=String(raw||"").replace(/\s+/g," ").trim();
 return !!s && /(klassenleit|ausflug|praktik|projekt|wandertag|exkursion|veranstaltung|prüfung|unterrichtsfrei|berufsmesse|workshop|theater|sporttag|\d{1,2}\s*uhr)/i.test(s);
}
function splitCell(raw){
 const teacherMap={
 "GRA":"Frau Grandt","ZEI":"Herr Zeilfelder","GRU":"Herr Gruseck","ROE":"Herr Roesinger",
 "KRE":"Frau Kreiselmayer","BEC":"Herr Becker","ACH":"Frau Achenbach",
 "KÖH":"Herr Köhler","KOH":"Herr Köhler","SLI":"Herr Slimistinos","STR":"Herr Strenger",
 "EDI":"Herr Edinger","AUG":"Augustin","MUS":"Herr Mussler-Ochsenfeld","HIR":"Herr Hirstein","MÜN":"Herr Münzer","MUN":"Herr Münzer"
 };
 const clean=String(raw||"").replace(/\s+/g," ").trim();
 if(isSpecialScheduleText(clean)) return {subject:clean,meta:"",teacher:"",teacherCode:"",room:"",special:true};
 let t=clean.split(/\s+/).filter(Boolean),room="",teacher="",teacherCode="";
 const ri=t.findIndex(x=>/^(R\d+[A-Z]?|HBM|HBF|TCO|R\d+\/\d+)$/i.test(x));
 if(ri>=0){room=t[ri];t.splice(ri,1)}
 for(let i=t.length-1;i>=0;i--){const code=t[i].toUpperCase();if(teacherMap[code]){teacherCode=code;teacher=teacherMap[code];t.splice(i,1);break}}
 if(t.length>1 && t[0].toUpperCase()==="M" && (/^LF\d+$/i.test(t[1]) || /^SSPU/i.test(t[1]))) t.shift();
 const joined=t.join(" ").replace(/\s+/g," ").trim();
 let subject=joined||"Unterricht";
 const lf=joined.match(/\bLF\s*(\d+)\b/i);if(lf)subject=`LF ${lf[1]}`;
 const sspu=joined.match(/\bSSPU\s*(\d+)?\b/i);if(sspu)subject=sspu[1]?`SSPU ${sspu[1]}`:"SSPU";
 if(/\bM[\s-]*FHR\b/i.test(joined))subject="Mathematik";
 if(/\bE[\s-]*FHR\b/i.test(joined))subject="Englisch";
 if(/^ET$/i.test(joined)||/\bET\b/i.test(joined))subject="Ethik";
 return {subject,meta:teacher||teacherCode,teacher,teacherCode,room,special:false};
}
function prettySubject(s){
 const x=String(s||"").trim();
 if(/^LF\s*\d+$/i.test(x)){const n=x.match(/\d+/)?.[0];return n?`LF ${n}`:x}
 const m={"D":"Deutsch","E":"Englisch","M":"Mathematik","ET":"Ethik","SP":"Sport","SPO":"Sport","INF":"Informatik","WISO":"Wirtschaft & Sozialkunde"};
 return m[x.toUpperCase()]||x||"Unterricht";
}
const officialBreaks=[
 ["09:30","09:45"],
 ["11:15","11:30"],
 ["13:00","13:30"]
];

function breakBetween(endA,startB){
 if(getActivePauses().some(p=>endA===p.start && startB===p.end))return true;
 return officialBreaks.some(([s,e])=>endA===s && startB===e);
}

function mergeLessons(ls){
 const sorted=[...(ls||[])].sort((a,b)=>{
   const d=dayOrder.indexOf(a.day)-dayOrder.indexOf(b.day);
   return d||a.start.localeCompare(b.start);
 });

 const out=[];

 for(const x of sorted){
   const item={...x,blocks:x.blocks||1};
   const p=splitCell(item.raw);
   const last=out[out.length-1];

   if(last && last.day===item.day){
     const q=splitCell(last.raw);

     // Never merge through an official break.
     const separatedByBreak=breakBetween(last.end,item.start);

     if(!separatedByBreak && last.end===item.start){
       const qTeacher=String(q.teacherCode||q.meta||"").trim().toUpperCase();
       const pTeacher=String(p.teacherCode||p.meta||"").trim().toUpperCase();
       const qRoom=String(q.room||"").trim().toUpperCase();
       const pRoom=String(p.room||"").trim().toUpperCase();
       const qSubject=String(prettySubject(q.subject||"")).replace(/\s+/g," ").trim().toUpperCase();
       const pSubject=String(prettySubject(p.subject||"")).replace(/\s+/g," ").trim().toUpperCase();
       const sameSubject=qSubject===pSubject;
       const teacherCompatible=!qTeacher||!pTeacher||qTeacher===pTeacher;
       const roomCompatible=!qRoom||!pRoom||qRoom===pRoom;
       const lastEndRow=last.rowNum==null?null:Number(last.rowNum)+Math.max(1,Number(last.blocks||1))-1;
       const sequentialRows=lastEndRow!=null&&item.rowNum!=null&&Number(item.rowNum)===lastEndRow+1;
       // V205: contiguous rows with the same subject are a Doppel-/Mehrfachstunde
       // even when PDF.js puts teacher/room fragments into only one of the rows.
       if(!p.special&&!q.special && sameSubject && ((teacherCompatible&&roomCompatible)||sequentialRows)){
         last.end=item.end;
         last.blocks=(last.blocks||1)+(item.blocks||1);
         last.isDouble=last.blocks>=2;
         continue;
       }

       if(!p.special&&!q.special && String(last.raw).trim()===String(item.raw).trim()){
         last.end=item.end;
         last.blocks=(last.blocks||1)+(item.blocks||1);
         last.isDouble=true;
         continue;
       }
     }
   }

   out.push(item);
 }

 return out;
}

function placeholderSchedule(){
 return [
 ["Mo","08:00","08:45","M LF8 GRA R13"],["Mo","08:45","09:30","M LF8 GRA R13"],["Mo","09:45","10:30","M LF11 GRU R13"],["Mo","10:30","11:15","M LF11 GRU R13"],["Mo","11:30","12:15","E-FHR BEC R14"],["Mo","12:15","13:00","E-FHR BEC R14"],
 ["Di","08:00","08:45","M LF9 ZEI R13"],["Di","08:45","09:30","M LF9 ZEI R13"],["Di","09:45","10:30","SSPU 1 ZEI R13"],["Di","10:30","11:15","SSPU 1 ZEI R13"],["Di","11:30","12:15","ET ROE R14"],
 ["Mi","08:00","08:45","M LF12 GRU R13"],["Mi","08:45","09:30","M LF12 GRU R13"],["Mi","09:45","10:30","M-FHR ACH R14"],["Mi","10:30","11:15","M-FHR ACH R14"],["Mi","11:30","12:15","M LF10 KRE R13"],
 ["Do","08:00","08:45","M LF8 GRA R13"],["Do","08:45","09:30","M LF8 GRA R13"],["Do","09:45","10:30","E-FHR BEC R14"],["Do","10:30","11:15","E-FHR BEC R14"],["Do","11:30","12:15","ET ROE R14"],
 ["Fr","08:00","08:45","M LF11 GRU R13"],["Fr","08:45","09:30","M LF11 GRU R13"],["Fr","09:45","10:30","SSPU 2 ZEI R13"],["Fr","10:30","11:15","SSPU 2 ZEI R13"]
 ].map(a=>({day:a[0],start:a[1],end:a[2],raw:a[3]}))
}



let currentLearnsetsTab="cards";

window.switchLearnsetsTab=function(tab,btn){
 currentLearnsetsTab=["cards","quiz","test"].includes(tab)?tab:"cards";
 $$("#view-learnsets [data-learnset-tab]").forEach(b=>
   b.classList.toggle("active",b.dataset.learnsetTab===currentLearnsetsTab)
 );
 const cards=$("#learnsetsCardsPanel"),quiz=$("#learnsetsQuizPanel"),test=$("#learnsetsTestPanel");
 if(cards)cards.style.display=currentLearnsetsTab==="cards"?"":"none";
 if(quiz)quiz.style.display=currentLearnsetsTab==="quiz"?"":"none";
 if(test)test.style.display=currentLearnsetsTab==="test"?"":"none";
 renderLearnsetsLists();
};

function renderLearnsetsLists(){
 const quizzes=data.quizzes||[];
 const quizRoot=$("#learnsetsQuizList");
 const testRoot=$("#learnsetsTestList");

 if(quizRoot){
   quizRoot.innerHTML=quizzes.length?quizzes.map(q=>{
     const count=(q.questions||[]).length;
     return `<div class="learnsetRow">
       <div class="learnsetRowIcon">✦</div>
       <div class="learnsetRowText">
         <b>${esc(q.name||"Quiz")}</b>
         <small>${esc(q.subject||"Ohne Fach")} · ${count} ${count===1?"Frage":"Fragen"}</small>
       </div>
       <button onclick="editQuiz('${q.id}')">Öffnen</button>
     </div>`;
   }).join(""):`<div class="learnsetsEmpty">
     <span>✦</span><b>Noch kein Quiz</b>
     <p>Erstelle ein Quiz in einem Fach → Themenordner.</p>
     <button class="primary" onclick="openView('subjects')">Zu Fächer</button>
   </div>`;
 }

 if(testRoot){
   testRoot.innerHTML=quizzes.length?quizzes.map(q=>{
     const count=(q.questions||[]).length;
     return `<div class="learnsetRow">
       <div class="learnsetRowIcon testIcon">✓</div>
       <div class="learnsetRowText">
         <b>${esc(q.name||"Test")}</b>
         <small>${esc(q.subject||"Ohne Fach")} · ${count} ${count===1?"Frage":"Fragen"}</small>
       </div>
       <button ${count?"":"disabled"} onclick="startQuiz('${q.id}')">${count?"Starten":"Leer"}</button>
     </div>`;
   }).join(""):`<div class="learnsetsEmpty">
     <span>✓</span><b>Noch kein Test</b>
     <p>Quizfragen können auch als Test ohne vorher sichtbare Lösung gestartet werden.</p>
     <button class="primary" onclick="openView('subjects')">Fragen erstellen</button>
   </div>`;
 }
}

window.openView=function(name){
 $$(".view").forEach(v=>v.classList.remove("active"));
 const el=$("#view-"+name); if(!el)return;
 el.classList.add("active");
 document.body.classList.toggle("editorMode",name==="sheet-editor");
 if(name!=="sheet-editor"){document.body.classList.remove("editorDrawerOpen");const q=$("#canvasQuickDrawer");if(q){q.classList.remove("open");q.innerHTML=""}const mt=$("#mobileSelectionTools");if(mt){mt.classList.remove("show");mt.innerHTML=""}}
 $$("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
 const titles={home:"Heute.",plan:"Stundenplan.",tasks:"Aufgaben.",grades:"Noten.",study:"Lernen.",learnsets:"Lernsets.",more:"Mehr.",subjects:"Fächer.","subject-detail":"Notizbuch.","topic-detail":"Thema.","deck-detail":"Karteikarten.","sheet-editor":"Lernblatt.","quiz-player":"Quiz.",absence:"Abwesenheit.",settings:"Einstellungen."};
 $("#headerTitle").textContent=titles[name]||"Studia.";
 $("#headerEyebrow").textContent="VERSION 202";
 window.scrollTo({top:0,behavior:"smooth"}); renderAll(); if(name==="learnsets"){renderLearnsetsLists();switchLearnsetsTab(currentLearnsetsTab);} if(name==="subject-detail")renderSubjectDetail(); if(name==="topic-detail")renderTopicDetail(); if(name==="deck-detail")renderDeckDetail(); if(name==="sheet-editor")renderSheetEditor(); if(name==="quiz-player")renderQuizPlayer();
}
$$("#nav button").forEach(b=>b.onclick=()=>openView(b.dataset.view));

let modalScrollY=0;
function openModal(html){
 modalScrollY=window.scrollY;
 $("#topViewMenu")?.classList.remove("open");
 const drawer=$("#canvasQuickDrawer");if(drawer&&(innerWidth<900||!document.body.classList.contains("editorMode"))){drawer.classList.remove("open");drawer.innerHTML="";openEditorGroup=null}
 $$(".canvasQuickNav button").forEach(x=>x.classList.remove("active"));
 $("#modal").innerHTML=html;$("#modalWrap").classList.add("open");
 document.body.classList.add("modalOpen");document.body.style.top=`-${modalScrollY}px`;
}
window.closeModal=()=>{
 $("#modalWrap").classList.remove("open");
 document.body.classList.remove("modalOpen");document.body.style.top="";
 window.scrollTo(0,modalScrollY);
};


window.confirmDanger=function({title="Wirklich löschen?",text="Diese Aktion kann nicht rückgängig gemacht werden.",confirmText="Löschen",onConfirm=""}={}){
 openModal(`<div class="confirmDangerModal">
   <div class="dangerIcon">!</div>
   <h2>${esc(title)}</h2>
   <p>${esc(text)}</p>
   <div class="confirmDangerActions">
     <button class="ghost" onclick="closeModal()">Abbrechen</button>
     <button class="dangerBtn dangerConfirm" onclick="${onConfirm}">${esc(confirmText)}</button>
   </div>
 </div>`);
}


function cuteButtonBurst(el){
 if(!el||window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)return;
 const target=el.closest?.("button")||el;if(!target?.getBoundingClientRect)return;
 target.classList.remove("cutePop");void target.offsetWidth;target.classList.add("cutePop");
 setTimeout(()=>target.classList.remove("cutePop"),360);
 const r=target.getBoundingClientRect(),burst=document.createElement("span");
 burst.className="cuteBurst";burst.style.left=(r.left+r.width/2)+"px";burst.style.top=(r.top+r.height/2)+"px";
 burst.innerHTML="<i>✦</i><i>♡</i><i>✦</i>";document.body.appendChild(burst);setTimeout(()=>burst.remove(),650);
}
window.cuteToast=function(text){
 document.querySelector(".cuteToast")?.remove();
 const t=document.createElement("div");t.className="cuteToast";t.textContent="✦ "+text;document.body.appendChild(t);
 requestAnimationFrame(()=>t.classList.add("show"));setTimeout(()=>{t.classList.remove("show");setTimeout(()=>t.remove(),220)},1100);
}
document.addEventListener("click",e=>{const b=e.target.closest?.("button");if(b&&!b.disabled)cuteButtonBurst(b)});

function subjectOptions(){
 return data.subjects.map(s=>`<option value="${esc(s.name)}">${esc(s.name)}</option>`).join("")
}

window.openLessonDetails=function(json){
 const l=JSON.parse(json), p=splitCell(l.raw), key=lessonKey(l);
 const ex=data.lessonExtras[key] ||= {notes:[],tasks:[],files:[]};
 const notes=ex.notes.map(n=>`<div class="card rowBetween"><div><b>📝 ${esc(n.text)}</b><div class="small">${fmtDate(n.date||todayISO())}</div></div><button class="dangerBtn" onclick="deleteLessonItem('${esc(key)}','notes','${n.id}')">×</button></div>`).join("")||'<div class="empty">Noch keine Notizen.</div>';
 const tasks=ex.tasks.map(n=>`<div class="card rowBetween"><div><b>✓ ${esc(n.text)}</b><div class="small">${fmtDate(n.due||todayISO())}</div></div><button class="dangerBtn" onclick="deleteLessonItem('${esc(key)}','tasks','${n.id}')">×</button></div>`).join("")||'<div class="empty">Noch keine Aufgaben.</div>';
 const currentColor=colorToHex(timetableSubjectColor(p.subject));
 openModal(`<h2>${esc(prettySubject(p.subject))}</h2>
 <div class="small">${l.start}–${l.end}${p.teacher?" · "+esc(p.teacher):""}${p.room?" · "+esc(p.room):""}</div>
 <div class="lessonColorEditor">
   <div><b>Farbe im Stundenplan</b><small>Gilt für alle ${esc(prettySubject(p.subject))}-Stunden.</small></div>
   <input id="lessonSubjectColor" type="color" value="${currentColor}" oninput="setTimetableSubjectColor(${JSON.stringify(p.subject)},this.value)">
   <button type="button" class="ghost" onclick="resetTimetableSubjectColor(${JSON.stringify(p.subject)})">Zurücksetzen</button>
 </div>
 <div class="section">
   <h3>Zu dieser Stunde hinzufügen</h3>
   <div class="formGrid" style="margin-top:10px">
     <div class="full"><label>Notiz</label><textarea id="lessonNote" placeholder="z. B. Thema, Merksatz, was ihr gemacht habt …"></textarea></div>
     <div><label>Aufgabe</label><input id="lessonTask" placeholder="z. B. Arbeitsblatt fertig machen"></div>
     <div><label>Fällig</label><input id="lessonDue" type="date" value="${todayISO()}"></div>
   </div>
   <div class="row" style="margin-top:10px;flex-wrap:wrap">
     <button class="primary" onclick="saveLessonNote('${esc(key)}')">Notiz speichern</button>
     <button class="ghost" onclick="saveLessonTask('${esc(key)}','${esc(p.subject)}')">Aufgabe speichern</button>
   </div>
 </div>
 <div class="section"><h3>Notizen</h3><div class="stack" style="margin-top:9px">${notes}</div></div>
 <div class="section"><h3>Aufgaben</h3><div class="stack" style="margin-top:9px">${tasks}</div></div>`);
}
window.saveLessonNote=function(key){
 const t=$("#lessonNote").value.trim(); if(!t)return;
 const ex=data.lessonExtras[key] ||= {notes:[],tasks:[],files:[]}; ex.notes.push({id:id(),text:t,date:todayISO()}); save(); closeModal();
}
window.saveLessonTask=function(key,subject){
 const t=$("#lessonTask").value.trim(); if(!t)return;
 const due=$("#lessonDue").value;
 const ex=data.lessonExtras[key] ||= {notes:[],tasks:[],files:[]}; ex.tasks.push({id:id(),text:t,due});
 data.homework.push({id:id(),subject:prettySubject(subject),text:t,due,note:"Aus Unterrichtsstunde",done:false,created:Date.now()});
 save(); closeModal();
}
window.deleteLessonItem=function(key,type,itemId){
 const ex=data.lessonExtras[key]; if(!ex)return; ex[type]=ex[type].filter(x=>x.id!==itemId); save(); closeModal();
}

window.openAddHomework=function(){
 openModal(`<h2>Hausaufgabe</h2><div class="formGrid">
 <div><label>Fach</label><select id="hwSubject">${subjectOptions()}</select></div>
 <div><label>Fällig</label><input id="hwDue" type="date" value="${todayISO()}"></div>
 <div class="full"><label>Aufgabe</label><textarea id="hwText" placeholder="z. B. Seite 42, Aufgabe 3–5"></textarea></div>
 <div class="full"><label>Notiz</label><input id="hwNote" placeholder="optional"></div>
 <div class="full"><label>Fotos / Dateien</label><input id="hwFiles" type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx"></div></div>
 <button class="primary" style="margin-top:12px" onclick="addHomework()">Speichern</button>`)
}
window.addHomework=async function(){
 const text=$("#hwText").value.trim();if(!text)return;
 const obj={id:id(),subject:$("#hwSubject").value,text,due:$("#hwDue").value,note:$("#hwNote").value.trim(),done:false,created:Date.now(),files:[]};
 await storeEntityFiles(obj,$("#hwFiles")?.files||[]);
 data.homework.push(obj);save();closeModal()
}
window.toggleHomework=function(i){const x=data.homework.find(x=>x.id===i);if(x){x.done=!x.done;save()}}
window.deleteHomework=function(i){data.homework=data.homework.filter(x=>x.id!==i);save()}

window.openAddTest=function(){
 openModal(`<h2>Test / Klassenarbeit</h2><div class="formGrid">
 <div><label>Fach</label><select id="tSubject">${subjectOptions()}</select></div>
 <div><label>Datum</label><input id="tDate" type="date" value="${todayISO()}"></div>
 <div><label>Art</label><select id="tType"><option>Test</option><option>Klassenarbeit</option><option>Präsentation</option><option>Prüfung</option></select></div>
 <div><label>Erinnerung</label><select id="tReminder"><option value="1">1 Tag vorher</option><option value="3">3 Tage vorher</option><option value="7">7 Tage vorher</option></select></div>
 <div class="full"><label>Beschreibung / Themen</label><textarea id="tText"></textarea></div>
 <div class="full"><label>Fotos / Dateien</label><input id="testFiles" type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx"></div></div>
 <button class="primary" style="margin-top:12px" onclick="addTest()">Speichern</button>`)
}
window.addTest=async function(){
 const obj={id:id(),subject:$("#tSubject").value,date:$("#tDate").value,type:$("#tType").value,reminder:+$("#tReminder").value,text:$("#tText").value.trim(),files:[]};
 await storeEntityFiles(obj,$("#testFiles")?.files||[]);
 data.tests.push(obj);save();closeModal()
}
window.deleteTest=i=>{data.tests=data.tests.filter(x=>x.id!==i);save()}

window.openAddGrade=function(){
 openModal(`<h2>Note eintragen</h2><div class="formGrid">
 <div><label>Fach</label><select id="gSubject">${subjectOptions()}</select></div>
 <div><label>Note</label><input id="gGrade" type="number" min="1" max="6" step="0.1" value="2"></div>
 <div><label>Gewichtung</label><select id="gWeight"><option value="1">1×</option><option value="2">2×</option><option value="0.5">0,5×</option></select></div>
 <div><label>Datum</label><input id="gDate" type="date" value="${todayISO()}"></div>
 <div class="full"><label>Beschreibung</label><input id="gText" placeholder="z. B. Klassenarbeit 1"></div></div>
 <button class="primary" style="margin-top:12px" onclick="addGrade()">Speichern</button>`)
}
window.addGrade=function(){
 const grade=+$("#gGrade").value;if(!grade||grade<1||grade>6)return;
 data.grades.push({id:id(),subject:$("#gSubject").value,grade,weight:+$("#gWeight").value,date:$("#gDate").value,text:$("#gText").value.trim()});save();closeModal()
}
window.deleteGrade=i=>{data.grades=data.grades.filter(x=>x.id!==i);save()}




function renderAIDecks(){
 const sel=$("#aiDeck");if(!sel)return;
 const subject=$("#aiSubject")?.value||"";
 const decks=(data.flashDecks||[]).filter(d=>d.subject===subject);
 sel.innerHTML='<option value="">Neuen KI-Ordner erstellen</option>'+decks.map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join("");
 const wrap=$("#aiDeckWrap");if(wrap)wrap.style.display=$("#aiMode")?.value==="flashcards"?"block":"none";
 if($("#aiMode"))$("#aiMode").onchange=()=>renderAIDecks();
}

async function updateAIStatus(){
 const badge=$("#aiConnectionBadge"),box=$("#aiConnectionSettings");
 aiCloudAvailable=false;
 if(badge){badge.textContent="KI nicht aktiviert";badge.className="aiState offline"}
 if(box)box.textContent="Studia läuft komplett kostenlos über GitHub Pages. Die kostenpflichtige Cloud-KI ist deshalb deaktiviert.";
}

window.generateAI=async function(){
 alert("Die echte Cloud-KI ist in der kostenlosen GitHub-Version deaktiviert, damit für Studia keine laufenden Kosten entstehen.");
}


window.openAddFlashcard=function(){
 openModal(`<h2>Karteikarte</h2><div class="formGrid">
 <div><label>Fach</label><select id="fSubject">${subjectOptions()}</select></div>
 <div class="full"><label>Vorderseite / Frage</label><textarea id="fQ"></textarea></div>
 <div class="full"><label>Rückseite / Antwort</label><textarea id="fA"></textarea></div></div>
 <button class="primary" style="margin-top:12px" onclick="addFlashcard()">Speichern</button>`)
}
window.addFlashcard=function(){
 const q=$("#fQ").value.trim(),a=$("#fA").value.trim();if(!q||!a)return;
 data.flashcards.push({id:id(),subject:$("#fSubject").value,q,a,created:Date.now()});currentFlash=data.flashcards.length-1;flashFlipped=false;save();closeModal()
}
window.flipFlash=()=>{flashFlipped=!flashFlipped;renderFlash()}
window.nextFlash=function(dir=1){
 if(!data.flashcards.length)return;currentFlash=(currentFlash+dir+data.flashcards.length)%data.flashcards.length;flashFlipped=false;renderFlash()
}
window.deleteFlash=function(){if(!data.flashcards.length)return;data.flashcards.splice(currentFlash,1);currentFlash=0;flashFlipped=false;save()}

window.openAddSubject=function(){
 openModal(`<h2>Fach erstellen</h2><div class="formGrid">
 <div><label>Fachname</label><input id="sName" placeholder="z. B. Lernfach 6"></div>
 <div><label>Abkürzung</label><input id="sAbbr" maxlength="8" placeholder="z. B. LF 6"></div>
 <div><label>Dunkle Farbe</label><input id="sColor" type="color" value="#c8568e"></div>
 <div><label>Hauptfarbe</label><input id="sCover" type="color" value="#f4acc5"></div>
 <div><label>Symbol</label><select id="sEmoji"><option>🌸</option><option>🌷</option><option>🍀</option><option>🧸</option><option>⭐</option><option>🎀</option><option>🫐</option><option>🍓</option></select></div>
 </div><p class="small" style="margin-top:8px">Die Abkürzung steht später im weißen Feld des Notizbuchs.</p>
 <button class="primary" style="margin-top:12px" onclick="addSubject()">Erstellen</button>`)
}
window.addSubject=function(){
 const n=$("#sName").value.trim();if(!n)return;
 const ab=($("#sAbbr")?.value||"").trim()||defaultSubjectAbbr(n);
 data.subjects.push({id:id(),name:n,abbr:ab,color:$("#sColor").value,cover:$("#sCover").value,emoji:$("#sEmoji").value,notes:[],topics:[],files:[]});
 save();closeModal()
}
window.addNote=function(sid){const s=data.subjects.find(x=>x.id===sid),title=$("#nTitle").value.trim(),text=$("#nText").value.trim();if(!s||(!title&&!text))return;(s.notes||(s.notes=[])).push({id:id(),title:title||"Notiz",text});save();openSubject(sid)}
window.deleteNote=function(sid,nid){const s=data.subjects.find(x=>x.id===sid);if(!s)return;s.notes=(s.notes||[]).filter(n=>n.id!==nid);save();renderSubjectDetail()}
window.deleteSubject=function(sid){data.subjects=data.subjects.filter(x=>x.id!==sid);save();closeModal();openView("subjects")}



window.openSubject=function(sid){
 const s=data.subjects.find(x=>x.id===sid);if(!s)return;
 ensureSubjectShape(s);selectedSubjectId=sid;openView("subject-detail");
}
function renderSubjectDetail(){
 const root=$("#subjectDetail");if(!root)return;
 const s=data.subjects.find(x=>x.id===selectedSubjectId);
 if(!s){root.innerHTML='<div class="empty">Fach nicht gefunden.</div>';return}
 ensureSubjectShape(s);
 const folders=(s.topics||[]).map(t=>{
   const decks=(data.flashDecks||[]).filter(d=>d.subject===s.name&&d.topicId===t.id).length;
   const sheets=(data.studySheets||[]).filter(x=>x.subject===s.name&&x.topicId===t.id).length;
   const quizzes=(data.quizzes||[]).filter(x=>x.subject===s.name&&x.topicId===t.id).length;
   return `<button class="topicFolder" style="--topicbg:${s.cover||s.color}" onclick="openTopic('${s.id}','${t.id}')">
     <div class="ticon">📁</div><div class="tname">${esc(t.title)}</div><div class="tmeta">${sheets} Lernblätter · ${decks} Kartenordner · ${quizzes} Quiz</div>
   </button>`;
 }).join("")||'<div class="empty">Noch keine Themen-Ordner. Erstelle deinen ersten.</div>';
 root.innerHTML=`<div class="subjectHero" style="background:${s.cover||s.color};color:#6d5950">
   <div class="emoji">${esc(s.emoji||"🌸")}</div><div class="name">${esc(s.name)}</div>
   <div class="meta">${(s.topics||[]).length} Themen-Ordner</div>
 </div>
 <div class="section"><div class="sectionHead"><h2>Themen</h2><button class="primary" onclick="openNewTopic('${s.id}')">+ Thema</button></div><div class="topicFolderGrid">${folders}</div></div>
 <div class="section panel"><h3>Notizbuch gestalten</h3><p class="small">Farbe, Cover und Symbol des Fachs.</p><button class="ghost" onclick="openCoverEditor('${s.id}')">🎨 Cover ändern</button></div>`;
 const del=$("#deleteCurrentSubjectBtn");if(del)del.onclick=()=>deleteSubjectFromPage(s.id);
}



const builtInFonts=[
 {name:"Modern",css:"Arial, sans-serif"},
 {name:"Elegant",css:"Georgia, serif"},
 {name:"Clean",css:"Trebuchet MS, sans-serif"},
 {name:"Soft",css:"Verdana, sans-serif"},
 {name:"Classic",css:"Times New Roman, serif"},
 {name:"Rounded",css:"Arial Rounded MT Bold, Arial, sans-serif"}
];

function sheetFontOptions(selected=""){
 const custom=JSON.parse(localStorage.getItem("schoolbloom-custom-fonts")||"[]");
 return [...builtInFonts,...custom].map(f=>`<option value="${esc(f.css)}" ${f.css===selected?"selected":""}>${esc(f.name)}</option>`).join("");
}



window.openStudySheetEditor=function(sheetId=null){
 selectedSheetId=sheetId||null;
 openView("sheet-editor");
}
window.closeSheetEditor=function(){
 canvasState.vectorTool="select";
 $("#canvasSvg")?.classList.remove("drawing");
 if($("#pathDrawHint"))$("#pathDrawHint").style.display="none";

 const s=data.subjects.find(x=>x.id===selectedSubjectId);
 const t=s?.topics?.find(x=>x.id===selectedTopicId);
 if(s&&t){openTopic(s.id,t.id);return}
 if(s){openSubject(s.id);return}

 selectedSubjectId=null;selectedTopicId=null;selectedSheetId=null;
 openView("subjects");
}
window.leaveSubjectNotebook=function(){
 selectedTopicId=null;selectedSheetId=null;selectedDeckId=null;selectedQuizId=null;selectedSubjectId=null;
 openView("subjects");
}
window.backToNotebook=function(){
 const sid=selectedSubjectId;
 selectedTopicId=null;selectedSheetId=null;
 if(sid&&data.subjects.some(x=>x.id===sid)){openSubject(sid);return}
 openView("subjects");
}

let canvasState={objects:[],vectors:[],selectedType:null,selectedId:null,selectedIds:[],selectedVectorIds:[],multiMode:false,orientation:"portrait",pageStyle:{color:"#ffffff",pattern:"blank",spacing:24,margin:55},vectorTool:"select",drawing:null,drag:null,snap:true,history:[],historyIndex:-1,historyLock:false,autosaveTimer:null,lastSavedHash:""};
const canvasStylesDefault=[
 {id:"h1",name:"Überschrift 1",type:"text",fontSize:34,fontWeight:"900",color:"#4f4540",fontFamily:"Georgia",bg:"transparent",borderColor:"transparent",borderWidth:0,radius:0,padding:7},
 {id:"h2",name:"Unterüberschrift",type:"text",fontSize:24,fontWeight:"800",color:"#66564f",fontFamily:"Trebuchet MS",bg:"transparent",borderColor:"transparent",borderWidth:0,radius:0,padding:7},
 {id:"body",name:"Normal",type:"text",fontSize:16,fontWeight:"400",color:"#3d3835",fontFamily:"Arial",bg:"transparent",borderColor:"transparent",borderWidth:0,radius:0,padding:7},
 {id:"task",name:"Aufgabe",type:"block",fontSize:16,fontWeight:"700",color:"#6b554c",fontFamily:"Trebuchet MS",bg:"#fff5eb",borderColor:"#efd4be",borderWidth:1,radius:14,padding:12,prefix:"Aufgabe: "},
 {id:"merke",name:"Merke",type:"block",fontSize:16,fontWeight:"700",color:"#765750",fontFamily:"Georgia",bg:"#fff0ef",borderColor:"#efcac7",borderWidth:1,radius:14,padding:12,prefix:"Merke: "}
];


function canvasSnapshot(){return JSON.stringify({objects:canvasState.objects,vectors:canvasState.vectors,orientation:canvasState.orientation,pageStyle:canvasState.pageStyle,layerGroups:canvasState.layerGroups||[]})}
function pushHistory(force=false){
 if(canvasState.historyLock)return;const snap=canvasSnapshot();
 if(!force&&canvasState.history[canvasState.historyIndex]===snap)return;
 canvasState.history=canvasState.history.slice(0,canvasState.historyIndex+1);canvasState.history.push(snap);
 if(canvasState.history.length>60)canvasState.history.shift();canvasState.historyIndex=canvasState.history.length-1;updateHistoryButtons();scheduleAutosave();
}
function restoreHistory(index){
 if(index<0||index>=canvasState.history.length)return;canvasState.historyLock=true;const d=JSON.parse(canvasState.history[index]);canvasState.objects=d.objects||[];canvasState.vectors=d.vectors||[];canvasState.orientation=d.orientation||canvasState.orientation||"portrait";canvasState.pageStyle=d.pageStyle||canvasState.pageStyle||{color:"#ffffff",pattern:"blank",spacing:24,margin:55};canvasState.layerGroups=d.layerGroups||canvasState.layerGroups||[];canvasState.historyIndex=index;canvasState.selectedType=null;canvasState.selectedId=null;canvasState.userZoomTouched=shouldAutoFitCanvas()?false:canvasState.userZoomTouched;
 applyCanvasPageSize();setTimeout(()=>{window.ensureDesktopEditorRail?.();if(shouldAutoFitCanvas())fitCanvasToScreen()},0);renderCanvasObjects();renderVectors();renderCanvasInspector();renderLayerList();clearGuides();canvasState.historyLock=false;updateHistoryButtons();
}
window.undoCanvas=function(){restoreHistory(canvasState.historyIndex-1)}
window.redoCanvas=function(){restoreHistory(canvasState.historyIndex+1)}
function updateHistoryButtons(){const u=$("#undoBtn"),r=$("#redoBtn");if(u)u.disabled=canvasState.historyIndex<=0;if(r)r.disabled=canvasState.historyIndex>=canvasState.history.length-1}
function scheduleAutosave(){clearTimeout(canvasState.autosaveTimer);const el=$("#autosaveState");if(el){el.textContent="Nicht gespeichert";el.className="autosaveState saving"}canvasState.autosaveTimer=setTimeout(()=>autoSaveCanvas(),850)}
function autoSaveCanvas(){const {s,t}=currentTopic();if(!s||!t)return;const snapshot=canvasSnapshot();if(snapshot===canvasState.lastSavedHash)return;saveCanvasSheetCore(true);canvasState.lastSavedHash=canvasSnapshot();const el=$("#autosaveState");if(el){el.textContent="Automatisch gespeichert ✓";el.className="autosaveState saved"}}

const TEXT_PRESET_HIDDEN_KEY="schoolbloom-hidden-default-styles";
const TEXT_PRESET_OVERRIDE_KEY="schoolbloom-default-style-overrides";
function readTextPresetJSON(key,fallback=[]){try{const v=JSON.parse(localStorage.getItem(key)||"null");return Array.isArray(v)?v:fallback}catch(_){return fallback}}
function canvasPresets(){
 const hidden=new Set(readTextPresetJSON(TEXT_PRESET_HIDDEN_KEY));
 const overrides=readTextPresetJSON(TEXT_PRESET_OVERRIDE_KEY);
 const custom=readTextPresetJSON("schoolbloom-canvas-styles");
 const defaults=canvasStylesDefault.filter(d=>!hidden.has(d.id)).map(d=>({...d,...(overrides.find(o=>o.id===d.id)||{})}));
 const customOnly=custom.filter(c=>!canvasStylesDefault.some(d=>d.id===c.id));
 return [...defaults,...customOnly];
}
function renderStylePresets(){
 const bar=$("#stylePresetBar");if(!bar)return;
 bar.className="formatStrip";
 bar.innerHTML=canvasPresets().map(s=>`<button class="formatChip" onclick="addCanvasText('${s.id}')">${esc(s.name)}</button>`).join("")+
 `<button class="formatChip formatAdd" title="Neues Textformat" onclick="createCustomStylePreset()">＋</button>`;
}

window.saveSelectionAsTextFormat=function(){
 const ids=selectedObjectIds(),selectedV=selectedVectorIds();
 if(ids.length+selectedV.length<1){
   openModal(`<div class="compactPresetModal"><h2>Nichts ausgewählt</h2><p class="small">Aktiviere Mehrfachauswahl und wähle den Text plus die Formen/Sticker aus, die zum Format gehören sollen.</p><button class="primary" onclick="closeModal()">OK</button></div>`);
   return;
 }
 const items=canvasState.objects.filter(o=>ids.includes(o.id));
 const vecIds=selectedV;
 const vectors=canvasState.vectors.filter(v=>vecIds.includes(v.id));
 const textItems=items.filter(o=>["text","block","task","merke","formula"].includes(o.kind));
 if(!textItems.length){
   openModal(`<div class="compactPresetModal"><h2>Text fehlt</h2><p class="small">Ein Textformat braucht mindestens ein ausgewähltes Textobjekt. Formen, Zettel, Sticker oder Bilder können zusätzlich dazugehören.</p><button class="primary" onclick="closeModal()">OK</button></div>`);
   return;
 }
 // A multi-selection saved as a text format becomes a real group immediately.
 if(ids.length+selectedV.length>1)groupSelectedItems(true);
 const vb=vectors.map(v=>vectorBounds(v));
 const allMinX=[...items.map(o=>o.x),...vb.map(b=>b.x)],allMinY=[...items.map(o=>o.y),...vb.map(b=>b.y)];
 const allMaxX=[...items.map(o=>o.x+o.w),...vb.map(b=>b.x+b.w)],allMaxY=[...items.map(o=>o.y+o.h),...vb.map(b=>b.y+b.h)];
 const minX=Math.min(...allMinX),minY=Math.min(...allMinY),maxX=Math.max(...allMaxX),maxY=Math.max(...allMaxY);
 const bundle=items.map(o=>{
   const n=JSON.parse(JSON.stringify(o));
   delete n.id;delete n.z;delete n.locked;delete n.editing;delete n.groupId;
   n.relX=o.x-minX;n.relY=o.y-minY;
   delete n.x;delete n.y;
   return n;
 });
 const vectorBundle=vectors.map(v=>{const n=JSON.parse(JSON.stringify(v));delete n.id;delete n.z;delete n.groupId;const b=vectorBounds(v);n.relX=b.x-minX;n.relY=b.y-minY;n.origBounds=b;return n});
 const payload=JSON.stringify({bundle,vectorBundle,w:maxX-minX,h:maxY-minY}).replace(/'/g,"&#39;");
 openModal(`<div class="compactPresetModal">
   <div class="presetModalHead"><div><span class="eyebrow">MEHRFACHAUSWAHL</span><h2>Als Textformat speichern</h2></div><button class="miniIcon" onclick="closeModal()">×</button></div>
   <p class="small">Alle ${items.length} ausgewählten Objekte werden zusammen gespeichert. Beim Einfügen bleiben Text, Hintergrundformen, Zettel und Sticker zusammen.</p>
   <label>Name</label>
   <input id="bundlePresetName" placeholder="z. B. Definition, Merksatz, Aufgabe">
   <div class="selectionPreviewMini"><b>${items.length+vectors.length} Objekte</b><span>${textItems.length} Text · ${items.length-textItems.length+vectors.length} Elemente</span></div>
   <button class="primary fullPresetSave" data-payload='${payload}' onclick="confirmSaveSelectionAsTextFormat(this.dataset.payload)">Speichern</button>
 </div>`);
}

window.confirmSaveSelectionAsTextFormat=function(payloadJSON){
 let payload;try{payload=JSON.parse(payloadJSON)}catch(_){return}
 const name=$("#bundlePresetName")?.value.trim()||"Eigenes Textformat";
 let arr=JSON.parse(localStorage.getItem("schoolbloom-canvas-styles")||"[]");
 const obj={id:"bundle-"+Date.now(),name,type:"bundle",bundle:payload.bundle,vectorBundle:payload.vectorBundle||[],bundleW:payload.w,bundleH:payload.h};
 arr.push(obj);
 localStorage.setItem("schoolbloom-canvas-styles",JSON.stringify(arr));
 closeModal();cuteToast("Textformat gespeichert ♡");
 renderStylePresets();
 if(openEditorGroup==="textLibrary"){
   const btn=document.querySelector(".canvasQuickNav [data-group=textLibrary]");
   if(btn){openEditorGroup=null;editorOpenGroup("textLibrary",btn)}
 }
}

window.insertSavedTextFormat=function(presetId){
 const preset=canvasPresets().find(x=>x.id===presetId);
 if(!preset?.bundle)return;
 const W=canvasPageWidth(),H=canvasPageHeight();
 const ox=Math.max(20,(W-(preset.bundleW||300))/2);
 const oy=Math.max(20,Math.min(H-(preset.bundleH||160)-20,150));
 const newIds=[],freshGroupId=makeGroupId();
 let z=nextCanvasZ();
 for(const src of preset.bundle){
   const o=JSON.parse(JSON.stringify(src));
   o.id=id();o.x=ox+(o.relX||0);o.y=oy+(o.relY||0);delete o.relX;delete o.relY;
   o.z=z++;o.locked=false;o.editing=false;o.groupId=freshGroupId;
   canvasState.objects.push(o);newIds.push(o.id);
 }
 const newVids=[];
 for(const src of (preset.vectorBundle||[])){
   const v=JSON.parse(JSON.stringify(src)),b=v.origBounds||{x:0,y:0,w:100,h:100};delete v.origBounds;
   const dx=ox+(v.relX||0)-b.x,dy=oy+(v.relY||0)-b.y;delete v.relX;delete v.relY;
   v.id=id();v.z=z++;v.groupId=freshGroupId;
   if(v.type==="rect"){v.x+=dx;v.y+=dy}
   else if(v.type==="ellipse"){v.cx+=dx;v.cy+=dy}
   else if(v.points)v.points=v.points.map(p=>[p[0]+dx,p[1]+dy]);
   canvasState.vectors.push(v);newVids.push(v.id);
 }
 canvasState.selectedIds=newIds;canvasState.selectedVectorIds=newVids;
 canvasState.selectedType=newIds.length?"object":newVids.length?"vector":null;
 canvasState.selectedId=newIds.at(-1)||newVids.at(-1)||null;
 canvasState.multiMode=false;
 renderCanvasObjects();renderVectors();renderCanvasInspector();renderLayerList();updateMultiSelectStatus();markCanvasDirty();pushHistory();
}


window.openTextFormatManager=function(){
 const visible=canvasPresets();
 const hidden=readTextPresetJSON(TEXT_PRESET_HIDDEN_KEY);
 const overrides=readTextPresetJSON(TEXT_PRESET_OVERRIDE_KEY);
 const hasChanges=hidden.length||overrides.length;
 openModal(`<div class="textFormatManager v92FormatManager">
   <div class="presetModalHead"><div><span class="eyebrow">TEXT</span><h2>Textformate</h2><p class="small">Antippen zum Einfügen · jedes Format kann bearbeitet oder entfernt werden.</p></div><button class="miniIcon" onclick="closeModal()">×</button></div>
   <div class="v92FormatManagerGrid">${visible.map(p=>{
      const standard=canvasStylesDefault.some(d=>d.id===p.id);
      const action=p.bundle?`editBundleTextFormat('${p.id}')`:`createCustomStylePreset('${p.id}')`;
      return `<article class="v92FormatManagerCard">
        <button class="v92FormatInsert" onclick="${p.bundle?`insertSavedTextFormat('${p.id}');closeModal()`:`addCanvasText('${p.id}');closeModal()`}">
          <span class="v92FormatGlyph" style="font-family:${esc(p.fontFamily||'Arial')};font-weight:${esc(p.fontWeight||'700')};color:${esc(p.color||'#725b53')}">${textFormatPreviewLabel(p)}</span>
          <span><b>${esc(p.name||'Textformat')}</b><small>${standard?'Standard':(p.bundle?'Gruppiert':'Eigenes Format')}</small></span>
        </button>
        <div class="v92FormatCardActions"><button onclick="closeModal();${action}">Bearbeiten</button><button class="formatDeleteBtn" onclick="deleteCustomStylePreset('${p.id}')">Löschen</button></div>
      </article>`}).join('')||'<div class="managerEmpty">Noch keine Textformate.</div>'}</div>
   <div class="v92ManagerFooter"><button class="primary" onclick="closeModal();createCustomStylePreset()">＋ Neues Textformat</button>${hasChanges?`<button class="ghost" onclick="restoreDefaultTextFormats()">Standards wiederherstellen</button>`:''}</div>
 </div>`);
}

window.editBundleTextFormat=function(idv){
 const p=canvasPresets().find(x=>x.id===idv);if(!p?.bundle)return;
 openModal(`<div class="compactPresetModal"><div class="presetModalHead"><div><span class="eyebrow">TEXTFORMAT</span><h2>Gruppiertes Format bearbeiten</h2></div><button class="miniIcon" onclick="closeModal()">×</button></div>
   <label>Name</label><input id="bundleEditName" value="${esc(p.name||'Eigenes Textformat')}">
   <p class="small">Die enthaltenen Elemente bleiben unverändert. Um das Design zu ändern, füge es ein, passe es auf der Seite an und speichere die Auswahl als neues Textformat.</p>
   <div class="presetModalActions"><button class="primary" onclick="saveBundleTextFormatName('${idv}')">Speichern</button><button class="dangerBtn" onclick="deleteCustomStylePreset('${idv}')">Löschen</button></div>
 </div>`);
}
window.saveBundleTextFormatName=function(idv){
 let arr=readTextPresetJSON("schoolbloom-canvas-styles");const i=arr.findIndex(x=>x.id===idv);if(i<0)return;
 arr[i].name=$("#bundleEditName")?.value.trim()||arr[i].name||"Eigenes Textformat";
 localStorage.setItem("schoolbloom-canvas-styles",JSON.stringify(arr));closeModal();renderStylePresets();setTimeout(()=>openTextFormatManager(),0);
}

window.createCustomStylePreset=function(editId=null){
 const old=editId?canvasPresets().find(x=>x.id===editId):null;
 if(old?.bundle){editBundleTextFormat(editId);return}
 const fontChoices=["Arial","Georgia","Trebuchet MS","Verdana","Times New Roman","Courier New",...(typeof v91StoredFonts==='function'?v91StoredFonts().map(f=>f.name):[])];
 openModal(`<div class="compactPresetModal"><div class="presetModalHead"><div><span class="eyebrow">TEXTFORMAT</span><h2>${old?"Textformat bearbeiten":"Neues Textformat"}</h2></div><button class="miniIcon" onclick="closeModal()">×</button></div>
 <div class="presetFormGrid">
  <div><label>Name</label><input id="presetName" value="${esc(old?.name||"")}" placeholder="z. B. Definition"></div>
  <div><label>Schriftgröße</label><input id="presetSize" type="number" min="8" max="180" value="${old?.fontSize||(innerWidth>=900?17:16)}"></div>
  <div><label>Schriftart</label><select id="presetFont">${[...new Set(fontChoices)].map(x=>`<option ${x===(old?.fontFamily||"Arial")?"selected":""}>${esc(x)}</option>`).join("")}</select></div>
  <div><label>Schriftfarbe</label><input id="presetColor" type="color" value="${old?.color||(innerWidth>=900?"#8d7369":"#4f4540")}"></div>
  <div><label>Schriftgewicht</label><select id="presetWeight"><option value="400" ${String(old?.fontWeight)==="400"?"selected":""}>Normal</option><option value="700" ${String(old?.fontWeight)==="700"?"selected":""}>Fett</option><option value="900" ${String(old?.fontWeight)==="900"?"selected":""}>Sehr fett</option></select></div>
  <div><label>Kasten</label><select id="presetBox"><option value="no" ${old?.type!=="block"?"selected":""}>Kein Kasten</option><option value="yes" ${old?.type==="block"?"selected":""}>Mit Kasten</option></select></div>
  <div><label>Hintergrund</label><input id="presetBg" type="color" value="${old?.bg&&old.bg!=="transparent"?old.bg:"#fff5eb"}"></div>
  <div><label>Kontur</label><input id="presetBorder" type="color" value="${old?.borderColor&&old.borderColor!=="transparent"?old.borderColor:"#efd4be"}"></div>
  <div><label>Konturdicke</label><input id="presetBorderWidth" type="number" min="0" max="12" value="${old?.borderWidth||1}"></div>
  <div><label>Ecken rund</label><input id="presetRadius" type="number" min="0" max="60" value="${old?.radius||14}"></div>
  <div><label>Innenabstand</label><input id="presetPadding" type="number" min="0" max="50" value="${old?.padding||10}"></div>
  <div><label>Starttext</label><input id="presetPrefix" value="${esc(old?.prefix||"")}"></div>
 </div>
 <div class="presetModalActions"><button class="primary" onclick="saveCustomStylePreset('${editId||""}')">Speichern</button>${old?`<button class="dangerBtn" onclick="deleteCustomStylePreset('${old.id}')">Format löschen</button>`:""}</div></div>`);
}
window.saveCustomStylePreset=function(editId=""){
 const box=$("#presetBox").value==="yes";
 const obj={id:editId||"custom-"+Date.now(),name:$("#presetName").value.trim()||"Eigenes Format",type:box?"block":"text",
 fontSize:+$("#presetSize").value||(innerWidth>=900?17:16),fontWeight:$("#presetWeight").value,color:$("#presetColor").value,
 fontFamily:$("#presetFont").value,bg:box?$("#presetBg").value:"transparent",borderColor:box?$("#presetBorder").value:"transparent",
 borderWidth:box?(+$("#presetBorderWidth").value||0):0,radius:box?(+$("#presetRadius").value||0):0,padding:+$("#presetPadding").value||7,prefix:$("#presetPrefix").value||""};
 if(editId&&canvasStylesDefault.some(d=>d.id===editId)){
   let arr=readTextPresetJSON(TEXT_PRESET_OVERRIDE_KEY);const i=arr.findIndex(x=>x.id===editId);if(i>=0)arr[i]=obj;else arr.push(obj);
   localStorage.setItem(TEXT_PRESET_OVERRIDE_KEY,JSON.stringify(arr));
   let hidden=readTextPresetJSON(TEXT_PRESET_HIDDEN_KEY).filter(x=>x!==editId);localStorage.setItem(TEXT_PRESET_HIDDEN_KEY,JSON.stringify(hidden));
 }else{
   let arr=readTextPresetJSON("schoolbloom-canvas-styles");const i=arr.findIndex(x=>x.id===editId);if(i>=0)arr[i]=obj;else arr.push(obj);localStorage.setItem("schoolbloom-canvas-styles",JSON.stringify(arr));
 }
 closeModal();renderStylePresets();setTimeout(()=>{if(document.body.classList.contains('editorMode'))openTextFormatManager()},0);
}
window.deleteCustomStylePreset=function(idv){
 closeModal();
 const isDefault=canvasStylesDefault.some(d=>d.id===idv);
 confirmDanger({title:"Textformat löschen?",text:isDefault?"Dieses Standardformat wird aus deiner Textformat-Liste ausgeblendet. Du kannst Standards später wiederherstellen.":"Das gespeicherte Textformat wird dauerhaft entfernt.",confirmText:"Format löschen",onConfirm:`performDeleteCustomStylePreset('${idv}')`});
}
window.performDeleteCustomStylePreset=function(idv){
 if(canvasStylesDefault.some(d=>d.id===idv)){
   const hidden=[...new Set([...readTextPresetJSON(TEXT_PRESET_HIDDEN_KEY),idv])];localStorage.setItem(TEXT_PRESET_HIDDEN_KEY,JSON.stringify(hidden));
   const ov=readTextPresetJSON(TEXT_PRESET_OVERRIDE_KEY).filter(x=>x.id!==idv);localStorage.setItem(TEXT_PRESET_OVERRIDE_KEY,JSON.stringify(ov));
 }else{
   let arr=readTextPresetJSON("schoolbloom-canvas-styles").filter(x=>x.id!==idv);localStorage.setItem("schoolbloom-canvas-styles",JSON.stringify(arr));
 }
 closeModal();renderStylePresets();setTimeout(()=>openTextFormatManager(),0);
}
window.restoreDefaultTextFormats=function(){
 localStorage.removeItem(TEXT_PRESET_HIDDEN_KEY);localStorage.removeItem(TEXT_PRESET_OVERRIDE_KEY);closeModal();renderStylePresets();cuteToast("Standardformate wiederhergestellt ♡");setTimeout(()=>openTextFormatManager(),0);
}


function formulaToHTML(expr){
 let s=esc(String(expr||""));
 // basic Word-like / LaTeX-ish shortcuts
 s=s.replace(/\\pi/g,"π").replace(/\\times/g,"×").replace(/\\div/g,"÷").replace(/\\pm/g,"±");
 s=s.replace(/\\sqrt\{([^{}]+)\}/g,'<span class="sqrtExpr">√<span>$1</span></span>');
 s=s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g,'<span class="fracExpr"><span>$1</span><span>$2</span></span>');
 s=s.replace(/\^2\b/g,"²").replace(/\^3\b/g,"³");
 s=s.replace(/\^\{([^{}]+)\}/g,'<sup>$1</sup>');
 s=s.replace(/_\{([^{}]+)\}/g,'<sub>$1</sub>');
 return s;
}

window.openFormulaDialog=function(editId=""){
 const old=editId?canvasState.objects.find(x=>x.id===editId):null;
 const html=old?.formulaHTML || (old?.formula?formulaToHTML(old.formula):"");
 openModal(`<div class="formulaModal visualFormulaModal">
   <div class="presetModalHead">
     <div><span class="eyebrow">MATHEMATIK</span><h2>${old?"Formel bearbeiten":"Formel einfügen"}</h2></div>
     <button class="miniIcon" onclick="closeModal()">×</button>
   </div>

   <p class="formulaEasyHint"><b>Markieren bestimmt den Bereich:</b> Markierst du den ganzen Bruch und drückst <b>Wurzel</b>, liegt die Wurzel über allem. Markierst du nur den Zähler, gilt sie nur dort. Genau so funktionieren Bruch, Exponent, Index, Klammer und Betrag.</p>

   <div class="formulaEditToolbar">
     <div class="formulaHistoryBtns"><button onclick="formulaLocalUndo()" title="Rückgängig">↶</button><button onclick="formulaLocalRedo()" title="Wiederholen">↷</button></div>
     <span>Direkt mathematisch bearbeiten</span>
   </div>
   <div id="formulaVisualEditor" class="formulaVisualEditor" contenteditable="true" spellcheck="false" data-placeholder="Tippe z. B.  a² + b² = c²">${html}</div>

   <div class="formulaInlineOps">
     <button onclick="insertHTMLAtCaret('+')">＋</button>
     <button onclick="insertHTMLAtCaret('−')">−</button>
     <button onclick="insertVisualFormula('times')">×</button>
     <button onclick="insertVisualFormula('divide')">÷</button>
     <button onclick="insertHTMLAtCaret('=')">＝</button>
     <button onclick="insertHTMLAtCaret('x')">x</button>
   </div>

   <div class="formulaToolSections">
    <section class="formulaToolSection"><div class="formulaToolTitle">Bausteine</div>
     <div class="formulaTemplateGrid visualOnly compactFormulaGrid">
      <button onclick="insertVisualFormula('sqrt')"><b>√x</b><span>Wurzel</span></button>
      <button onclick="insertVisualFormula('frac')"><b>½</b><span>Bruch</span></button>
      <button onclick="insertVisualFormula('power')"><b>xⁿ</b><span>Exponent</span></button>
      <button onclick="insertVisualFormula('sub')"><b>ₙ</b><span>Index</span></button>
      <button onclick="insertVisualFormula('paren')"><b>(x)</b><span>Klammer</span></button>
      <button onclick="insertVisualFormula('abs')"><b>|x|</b><span>Betrag</span></button>
     </div>
    </section>
    <section class="formulaToolSection"><div class="formulaToolTitle">Symbole & Pfeile</div>
     <div class="formulaTemplateGrid visualOnly compactFormulaGrid">
      <button onclick="insertVisualFormula('arrowRight')"><b>→</b><span>Rechts</span></button>
      <button onclick="insertVisualFormula('arrowLeft')"><b>←</b><span>Links</span></button>
      <button onclick="insertVisualFormula('arrowBoth')"><b>↔</b><span>Beidseitig</span></button>
      <button onclick="insertVisualFormula('implies')"><b>⇒</b><span>Folgt</span></button>
      <button onclick="insertVisualFormula('iff')"><b>⇔</b><span>Äquivalent</span></button>
      <button onclick="insertVisualFormula('infinity')"><b>∞</b><span>Unendlich</span></button>
      <button onclick="insertVisualFormula('pi')"><b>π</b><span>Pi</span></button>
      <button onclick="insertVisualFormula('pm')"><b>±</b><span>Plus/Minus</span></button>
      <button onclick="insertVisualFormula('minusInfinity')"><b>−∞</b><span>− unendlich</span></button>
      <button onclick="insertVisualFormula('plusInfinity')"><b>+∞</b><span>+ unendlich</span></button>
     </div>
    </section>
   </div>

   <div class="formulaQuickExamples">
     <button onclick="setFormulaExample('pythagoras')">Pythagoras</button>
     <button onclick="setFormulaExample('quadratic')">Mitternachtsformel</button>
     <button onclick="setFormulaExample('percent')">Prozentrechnung</button>
   </div>

   <div class="savedFormulaSection">
     <div class="savedFormulaHead"><b>Eigene Formeln</b><button onclick="saveCurrentFormulaFavorite()">＋ Aktuelle speichern</button></div>
     <div id="savedFormulaList" class="savedFormulaList"></div>
   </div>

   <button class="primary" onclick="saveFormulaObject('${editId}')">${old?"Übernehmen":"Einfügen"}</button>
 </div>`);
 setTimeout(()=>{
   const ed=$("#formulaVisualEditor");
   if(ed){
     ed.focus();placeCaretAtEnd(ed);
     installFormulaSlotProtection(ed);
     formulaLocalHistory=[ed.innerHTML];formulaLocalIndex=0;
     ed.addEventListener("input",()=>{normalizeAllVisualRoots(ed);pushLocalVisualHistory("formula",ed)});
   }
   renderSavedFormulaList();
 },80);
}


let formulaLocalHistory=[],formulaLocalIndex=-1,graphFormulaHistory=[],graphFormulaIndex=-1;
function pushLocalVisualHistory(kind,ed){
 if(!ed)return;
 const isGraph=kind==="graph",arr=isGraph?graphFormulaHistory:formulaLocalHistory;
 let idx=isGraph?graphFormulaIndex:formulaLocalIndex;
 const val=ed.innerHTML;if(arr[idx]===val)return;
 arr.splice(idx+1);arr.push(val);if(arr.length>60)arr.shift();
 idx=arr.length-1;if(isGraph)graphFormulaIndex=idx;else formulaLocalIndex=idx;
}
function restoreLocalVisualHistory(kind,dir){
 const isGraph=kind==="graph",arr=isGraph?graphFormulaHistory:formulaLocalHistory;
 let idx=isGraph?graphFormulaIndex:formulaLocalIndex;
 const next=Math.max(0,Math.min(arr.length-1,idx+dir));if(next===idx||!arr.length)return;
 idx=next;const ed=$(isGraph?"#graphFunctionVisual":"#formulaVisualEditor");if(ed){ed.innerHTML=arr[idx];placeCaretAtEnd(ed);installFormulaSlotProtection(ed);normalizeAllVisualRoots(ed)}
 if(isGraph)graphFormulaIndex=idx;else formulaLocalIndex=idx;
}
window.formulaLocalUndo=()=>restoreLocalVisualHistory("formula",-1);
window.formulaLocalRedo=()=>restoreLocalVisualHistory("formula",1);
window.graphFormulaUndo=()=>restoreLocalVisualHistory("graph",-1);
window.graphFormulaRedo=()=>restoreLocalVisualHistory("graph",1);

function placeCaretAtEnd(el){
 const range=document.createRange(),sel=window.getSelection();
 range.selectNodeContents(el);range.collapse(false);
 sel.removeAllRanges();sel.addRange(range);
}


function formulaEditorSelection(){
 const ed=$("#formulaVisualEditor"),sel=window.getSelection();
 if(!ed||!sel||!sel.rangeCount)return {ed,sel:null,range:null};
 const range=sel.getRangeAt(0);
 if(!ed.contains(range.commonAncestorContainer))return {ed,sel,range:null};
 return {ed,sel,range};
}

function insertHTMLAtCaret(html,selectSelector=""){
 const {ed,sel,range}=formulaEditorSelection();if(!ed)return null;
 ed.focus();
 let r=range;
 if(!r){
   r=document.createRange();r.selectNodeContents(ed);r.collapse(false);
 }
 r.deleteContents();
 const temp=document.createElement("div");temp.innerHTML=html;
 const frag=document.createDocumentFragment();let node,last;
 while((node=temp.firstChild)){last=frag.appendChild(node)}
 r.insertNode(frag);

 if(selectSelector && last?.parentElement){
   const scope=last.nodeType===1?last:last.parentElement;
   const target=(scope.matches?.(selectSelector)?scope:scope.querySelector?.(selectSelector))
     || ed.querySelector(selectSelector);
   if(target){
     const nr=document.createRange();nr.selectNodeContents(target);
     sel.removeAllRanges();sel.addRange(nr);
     return target;
   }
 }

 if(last){
   r.setStartAfter(last);r.collapse(true);
   sel.removeAllRanges();sel.addRange(r);
 }
 ed.dispatchEvent(new Event("input",{bubbles:true}));
 return last;
}

function selectedFormulaHTML(){
 const {ed,sel,range}=formulaEditorSelection();
 if(!ed||!range||range.collapsed)return "";
 const div=document.createElement("div");
 div.appendChild(range.cloneContents());
 return div.innerHTML;
}

function replaceSelectionWithHTML(html,focusSelector=""){
 const {ed,sel,range}=formulaEditorSelection();if(!ed)return;
 ed.focus();
 let r=range;
 if(!r){r=document.createRange();r.selectNodeContents(ed);r.collapse(false)}
 r.deleteContents();
 const temp=document.createElement("div");temp.innerHTML=html;
 const frag=document.createDocumentFragment();
 let n,last;
 while((n=temp.firstChild)){last=frag.appendChild(n)}
 r.insertNode(frag);

 let target=null;
 if(focusSelector){
   const root=(last?.nodeType===1?last:last?.parentElement);
   target=(root?.matches?.(focusSelector)?root:root?.querySelector?.(focusSelector))||ed.querySelector(focusSelector);
 }
 const nr=document.createRange();
 if(target){
   nr.selectNodeContents(target);
 }else if(last){
   nr.setStartAfter(last);nr.collapse(true);
 }else{
   nr.selectNodeContents(ed);nr.collapse(false);
 }
 sel.removeAllRanges();sel.addRange(nr);
 ed.dispatchEvent(new Event("input",{bubbles:true}));
}

function closestFormulaStructureFromCaret(selector){
 const {ed,range}=formulaEditorSelection();if(!ed||!range)return null;
 let node=range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentElement;
 while(node&&node!==ed){
   if(node.matches?.(selector))return node;
   node=node.parentElement;
 }
 // also check element directly before/after caret
 const sc=range.startContainer;
 if(sc?.nodeType===1){
   const before=sc.childNodes[range.startOffset-1],after=sc.childNodes[range.startOffset];
   const candidate=[before,after].find(x=>x?.nodeType===1&&x.matches?.(selector));
   if(candidate)return candidate;
 }
 return null;
}

function wrapNodeWithRoot(node){
 if(!node)return false;
 const wrap=document.createElement("span");wrap.className="vfRoot";
 const radical=document.createTextNode("√");
 const inside=document.createElement("span");
 node.parentNode.insertBefore(wrap,node);
 inside.appendChild(node);
 wrap.appendChild(radical);wrap.appendChild(inside);
 placeCaretAtEnd(inside);
 return true;
}



function cleanRootSelectionHTML(html){
 const box=document.createElement("div");box.innerHTML=html||"";
 // Safari selection can clone a naked dash/minus beside the selected fraction.
 [...box.childNodes].forEach(n=>{
   if(n.nodeType===Node.TEXT_NODE && /^\s*[-−–—]\s*$/.test(n.nodeValue||"")) n.remove();
 });
 return box.innerHTML;
}
function normalizeAllVisualRoots(ed){
 if(!ed)return;
 ed.querySelectorAll(".vfRoot").forEach(root=>{
   const radicand=root.querySelector(":scope > span");if(!radicand)return;
   [...radicand.childNodes].forEach(n=>{
     if(n.nodeType===Node.TEXT_NODE && /^\s*[-−–—]\s*$/.test(n.nodeValue||"")) n.remove();
   });
   // Remove a standalone dash immediately before a root, another WebKit selection artifact.
   let prev=root.previousSibling;
   if(prev?.nodeType===Node.TEXT_NODE && /^\s*[-−–—]\s*$/.test(prev.nodeValue||""))prev.remove();
 });
}

window.insertVisualFormula=function(type){
 const ed=$("#formulaVisualEditor");if(!ed)return;
 ed.focus();
 const selected=selectedFormulaHTML();

 if(type==="sqrt"){
   // Exact selection decides scope:
   // whole fraction selected -> root over whole fraction
   // only numerator selected -> root only over numerator
   if(selected){
     const clean=cleanRootSelectionHTML(selected);
     replaceSelectionWithHTML(`<span class="vfRoot">√<span>${clean}</span></span>&nbsp;`);
     requestAnimationFrame(()=>normalizeAllVisualRoots(ed));
     cuteToast("Wurzel über Auswahl ♡");
   }else{
     replaceSelectionWithHTML('<span class="vfRoot">√<span class="vfEditable" contenteditable="true">x</span></span>&nbsp;',".vfEditable");
   }
 }
 else if(type==="frac"){
   if(selected){
     replaceSelectionWithHTML(`<span class="vfFrac"><span>${selected}</span><span class="vfEditable" contenteditable="true">b</span></span>&nbsp;`, ".vfEditable");
   }else{
     replaceSelectionWithHTML('<span class="vfFrac"><span class="vfEditable" contenteditable="true">a</span><span contenteditable="true">b</span></span>&nbsp;',".vfEditable");
   }
 }
 else if(type==="power"){
   if(selected)replaceSelectionWithHTML(`${selected}<sup class="vfEditable" contenteditable="true">n</sup>&nbsp;`, ".vfEditable");
   else replaceSelectionWithHTML('x<sup class="vfEditable" contenteditable="true">n</sup>&nbsp;',".vfEditable");
 }
 else if(type==="sub"){
   if(selected)replaceSelectionWithHTML(`${selected}<sub class="vfEditable" contenteditable="true">n</sub>&nbsp;`, ".vfEditable");
   // Index gehört direkt an das Zeichen/Element vor dem Cursor; kein automatisches x.
   else replaceSelectionWithHTML('<sub class="vfEditable" contenteditable="true">n</sub>&nbsp;',".vfEditable");
 }
 else if(type==="paren"){
   replaceSelectionWithHTML(`<span class="vfParen">( <span class="vfEditable" contenteditable="true">${selected||"x"}</span> )</span>&nbsp;`,".vfEditable");
 }
 else if(type==="abs"){
   replaceSelectionWithHTML(`<span class="vfAbs">|<span class="vfEditable" contenteditable="true">${selected||"x"}</span>|</span>&nbsp;`,".vfEditable");
 }
 else if(type==="arrowRight") insertHTMLAtCaret("→");
 else if(type==="arrowLeft") insertHTMLAtCaret("←");
 else if(type==="arrowBoth") insertHTMLAtCaret("↔");
 else if(type==="implies") insertHTMLAtCaret("⇒");
 else if(type==="iff") insertHTMLAtCaret("⇔");
 else if(type==="minusInfinity") insertHTMLAtCaret("−∞");
 else if(type==="plusInfinity") insertHTMLAtCaret("+∞");
 else if(type==="infinity") insertHTMLAtCaret("∞");
 else if(type==="pi") insertHTMLAtCaret("π");
 else if(type==="pm") insertHTMLAtCaret("±");
 else if(type==="times") insertHTMLAtCaret("×");
 else if(type==="divide") insertHTMLAtCaret("÷");
}
window.setFormulaExample=function(type){
 const ed=$("#formulaVisualEditor");if(!ed)return;
 if(type==="pythagoras") ed.innerHTML='a<sup>2</sup> + b<sup>2</sup> = c<sup>2</sup>';
 else if(type==="quadratic") ed.innerHTML='x = <span class="vfFrac"><span>−b ± <span class="vfRoot">√<span>b<sup>2</sup> − 4ac</span></span></span><span>2a</span></span>';
 else if(type==="percent") ed.innerHTML='W = <span class="vfFrac"><span>p · G</span><span>100</span></span>';
 placeCaretAtEnd(ed);
 cuteToast("Beispiel eingesetzt ♡");
}


function installFormulaSlotProtection(ed){
 if(!ed||ed.dataset.slotProtection==="1")return;
 ed.dataset.slotProtection="1";
 ed.addEventListener("keydown",e=>{
   if(e.key!=="Backspace"&&e.key!=="Delete")return;
   const sel=window.getSelection();if(!sel||!sel.rangeCount)return;
   let node=sel.anchorNode?.nodeType===1?sel.anchorNode:sel.anchorNode?.parentElement;
   const slot=node?.closest?.("sup[contenteditable=true],sub[contenteditable=true],.vfEditable[contenteditable=true]");
   if(!slot||!ed.contains(slot))return;
   const text=(slot.textContent||"");
   // First deletion may empty the slot, but never removes the exponent/index structure.
   // Only a second delete/backspace while the slot is already empty removes the structure.
   if(text.length>0){
     // let browser delete selected character/content, then keep empty slot alive
     setTimeout(()=>{
       if(slot.isConnected && !(slot.textContent||"").length){
         slot.innerHTML="<span class='vfSlotGhost'>&#8203;</span>";
         const r=document.createRange(),s=window.getSelection();
         r.selectNodeContents(slot);r.collapse(false);s.removeAllRanges();s.addRange(r);
       }
     },0);
     return;
   }
   if(slot.querySelector(".vfSlotGhost") || text.replace(/\u200b/g,"")===""){
     e.preventDefault();
     const parent=slot.parentNode;
     const next=slot.nextSibling||parent;
     slot.remove();
     const r=document.createRange(),s=window.getSelection();
     try{r.setStartAfter(next.nodeType===1?next:parent)}catch(_){r.selectNodeContents(parent);r.collapse(false)}
     s.removeAllRanges();s.addRange(r);
   }
 });
 ed.addEventListener("input",()=>{
   ed.querySelectorAll("sup,sub,.vfEditable").forEach(slot=>{
     const ghost=slot.querySelector?.(".vfSlotGhost");
     if(ghost && (slot.textContent||"").replace(/\u200b/g,"").length)ghost.remove();
   });
 });
}

function formulaFavorites(){
 try{return JSON.parse(localStorage.getItem("schoolbloom-formula-favorites")||"[]")}catch(_){return []}
}
function saveFormulaFavorites(arr){localStorage.setItem("schoolbloom-formula-favorites",JSON.stringify(arr))}
window.saveCurrentFormulaFavorite=function(){
 const ed=$("#formulaVisualEditor");if(!ed)return;
 const plain=(ed.textContent||"").replace(/\u200b/g,"").trim();
 if(!plain){cuteToast("Erst eine Formel schreiben");return}
 openModal(`<div class="compactPresetModal">
   <div class="presetModalHead"><div><span class="eyebrow">FORMEL</span><h2>Eigene Formel speichern</h2></div><button class="miniIcon" onclick="closeModal()">×</button></div>
   <label>Name</label><input id="formulaFavName" placeholder="z. B. Mitternachtsformel">
   <div class="savedFormulaPreview">${ed.innerHTML}</div>
   <button class="primary" data-html="${encodeURIComponent(ed.innerHTML)}" onclick="confirmFormulaFavorite(this.dataset.html)">Speichern</button>
 </div>`);
}
window.confirmFormulaFavorite=function(encoded){
 const html=decodeURIComponent(encoded||"");
 const name=$("#formulaFavName")?.value.trim()||"Eigene Formel";
 const arr=formulaFavorites();arr.push({id:"ff-"+Date.now(),name,html});saveFormulaFavorites(arr);
 closeModal();cuteToast("Formel gespeichert ♡");
}
function renderSavedFormulaList(){
 const root=$("#savedFormulaList");if(!root)return;
 const arr=formulaFavorites();
 root.innerHTML=arr.length?arr.map(f=>`<div class="savedFormulaRow">
   <button class="savedFormulaUse" onclick="useFormulaFavorite('${f.id}')"><b>${esc(f.name)}</b><span>${f.html}</span></button>
   <button class="savedFormulaDelete" onclick="deleteFormulaFavorite('${f.id}')">⌫</button>
 </div>`).join(""):`<div class="savedFormulaEmpty">Noch keine eigenen Formeln.</div>`;
}
window.useFormulaFavorite=function(fid){
 const f=formulaFavorites().find(x=>x.id===fid),ed=$("#formulaVisualEditor");if(!f||!ed)return;
 ed.innerHTML=f.html;placeCaretAtEnd(ed);installFormulaSlotProtection(ed);cuteToast("Formel eingesetzt ♡");
}
window.deleteFormulaFavorite=function(fid){
 confirmDanger({title:"Formel löschen?",text:"Die gespeicherte eigene Formel wird entfernt.",confirmText:"Löschen",onConfirm:`performDeleteFormulaFavorite('${fid}')`});
}
window.performDeleteFormulaFavorite=function(fid){
 saveFormulaFavorites(formulaFavorites().filter(x=>x.id!==fid));closeModal();cuteToast("Formel gelöscht");
}

window.saveFormulaObject=function(editId=""){
 const ed=$("#formulaVisualEditor");if(!ed)return;
 const html=ed.innerHTML.trim();
 const plain=(ed.textContent||"").trim();
 if(!plain)return;
 if(editId){
   const o=canvasState.objects.find(x=>x.id===editId);
   if(o){o.formulaHTML=html;o.formula="";o.text=plain}
 }else{
   const o={
     id:id(),z:nextCanvasZ(),kind:"formula",x:110,y:150,w:360,h:90,
     formulaHTML:html,formula:"",text:plain,rotation:0,locked:false,editing:false,
     style:{fontSize:28,color:"#4f4642",fontFamily:"Cambria Math, STIX Two Math, serif",textAlign:"center"}
   };
   canvasState.objects.push(o);
   canvasState.selectedType="object";canvasState.selectedId=o.id;canvasState.selectedIds=[o.id];
 }
 closeModal();renderCanvasObjects();renderCanvasInspector();markCanvasDirty();pushHistory();cuteToast("Formel gespeichert ♡");
}


function graphDefault(){
 return {
   xMin:-10,xMax:10,yMin:-10,yMax:10,
   showGrid:true,showAxes:true,showLabels:true,
   lineWidth:2.4,
   curves:[
     {expr:"x^2",color:"#e58f98",style:"solid",visible:true}
   ],
   asymX:"",asymY:""
 };
}
function normalizeGraphExpr(expr){
 let s=String(expr||"").trim().toLowerCase().replace(/\s+/g,"");
 // German decimal comma is accepted in graph formulas too (0,5^x -> 0.5^x internally).
 s=s.replace(/(\d),(\d)/g,"$1.$2");
 if(!s)return "";
 // strict allowlist before evaluation
 if(!/^[0-9x+\-*/().,^a-z]+$/.test(s))throw new Error("Ungültige Zeichen");
 const allowed=["sin","cos","tan","sqrt","abs","exp","ln","log","pi","e"];
 const words=s.match(/[a-z]+/g)||[];
 if(words.some(w=>w!=="x"&&!allowed.includes(w)))throw new Error("Unbekannte Funktion");
 s=s.replace(/\^/g,"**")
    .replace(/\bpi\b/g,"Math.PI")
    .replace(/\be\b/g,"Math.E")
    .replace(/\bsin\(/g,"Math.sin(")
    .replace(/\bcos\(/g,"Math.cos(")
    .replace(/\btan\(/g,"Math.tan(")
    .replace(/\bsqrt\(/g,"Math.sqrt(")
    .replace(/\babs\(/g,"Math.abs(")
    .replace(/\bexp\(/g,"Math.exp(")
    .replace(/\bln\(/g,"Math.log(")
    .replace(/\blog\(/g,"Math.log10(");
 return s;
}
function graphEval(expr,x){
 try{
   const code=normalizeGraphExpr(expr);if(!code)return NaN;
   const fn=new Function("x",`"use strict";return (${code})`);
   const y=fn(x);return Number.isFinite(y)?y:NaN;
 }catch(_){return NaN}
}
function graphSvg(settings,w=520,h=330){
 const g={...graphDefault(),...(settings||{})};
 const pad=34,plotW=w-pad*2,plotH=h-pad*2;
 let xMin=Number(g.xMin),xMax=Number(g.xMax),yMin=Number(g.yMin),yMax=Number(g.yMax);
 // Preserve equal visual units and automatically reveal more x/y when the object is resized.
 const dataAspect=(xMax-xMin)/(yMax-yMin), viewAspect=plotW/plotH;
 if(Number.isFinite(dataAspect)&&Number.isFinite(viewAspect)&&dataAspect>0&&viewAspect>0){
   if(viewAspect>dataAspect){
     const cx=(xMin+xMax)/2,newSpan=(yMax-yMin)*viewAspect;
     xMin=cx-newSpan/2;xMax=cx+newSpan/2;
   }else{
     const cy=(yMin+yMax)/2,newSpan=(xMax-xMin)/viewAspect;
     yMin=cy-newSpan/2;yMax=cy+newSpan/2;
   }
 }
 const sx=x=>pad+(x-xMin)/(xMax-xMin)*plotW;
 const sy=y=>h-pad-(y-yMin)/(yMax-yMin)*plotH;
 const escAttr=s=>String(s).replace(/"/g,"&quot;");
 let out=`<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" class="mathGraphSvg">`;
 out+=`<defs><clipPath id="plotClip"><rect x="${pad}" y="${pad}" width="${plotW}" height="${plotH}" rx="2"/></clipPath><marker id="axisArrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#6d6864"/></marker></defs>`;
 out+=`<rect x="0" y="0" width="${w}" height="${h}" rx="12" fill="#fffefb"/>`;

 if(g.showGrid){
   const niceStep=span=>{const raw=span/10,p=10**Math.floor(Math.log10(raw)),n=raw/p;return (n<=1?1:n<=2?2:n<=5?5:10)*p};
   const xStep=niceStep(xMax-xMin),yStep=niceStep(yMax-yMin);
   for(let x=Math.ceil(xMin/xStep)*xStep;x<=xMax;x+=xStep){
     out+=`<line x1="${sx(x)}" y1="${pad}" x2="${sx(x)}" y2="${h-pad}" stroke="${Math.abs(x)<1e-9?"#c8c2bd":"#ece8e4"}" stroke-width="${Math.abs(x)<1e-9?1.2:.8}"/>`;
     if(g.showLabels&&Math.abs(x)>1e-9)out+=`<text x="${sx(x)}" y="${h-pad+16}" text-anchor="middle" font-size="9" fill="#8b847f">${x}</text>`;
   }
   for(let y=Math.ceil(yMin/yStep)*yStep;y<=yMax;y+=yStep){
     out+=`<line x1="${pad}" y1="${sy(y)}" x2="${w-pad}" y2="${sy(y)}" stroke="${Math.abs(y)<1e-9?"#c8c2bd":"#ece8e4"}" stroke-width="${Math.abs(y)<1e-9?1.2:.8}"/>`;
     if(g.showLabels&&Math.abs(y)>1e-9)out+=`<text x="${pad-7}" y="${sy(y)+3}" text-anchor="end" font-size="9" fill="#8b847f">${y}</text>`;
   }
 }
 if(g.showAxes){
   if(yMin<=0&&yMax>=0)out+=`<line x1="${pad}" y1="${sy(0)}" x2="${w-pad+6}" y2="${sy(0)}" stroke="#6d6864" stroke-width="1.5" marker-end="url(#axisArrow)"/>`;
   if(xMin<=0&&xMax>=0)out+=`<line x1="${sx(0)}" y1="${h-pad}" x2="${sx(0)}" y2="${pad-6}" stroke="#6d6864" stroke-width="1.5" marker-end="url(#axisArrow)"/>`;
   if(g.showLabels){out+=`<text x="${w-pad+10}" y="${sy(0)-6}" font-size="11" fill="#665f5b">x</text><text x="${sx(0)+7}" y="${pad-8}" font-size="11" fill="#665f5b">y</text>`}
 }
 // asymptotes / helper lines
 String(g.asymX||"").split(",").map(x=>+x.trim()).filter(Number.isFinite).forEach(x=>{
   if(x>=xMin&&x<=xMax)out+=`<line x1="${sx(x)}" y1="${pad}" x2="${sx(x)}" y2="${h-pad}" stroke="#b6a8c9" stroke-width="1.4" stroke-dasharray="5 5"/><text class="graphPointLabel" x="${sx(x)+5}" y="${pad+13}">x = ${x}</text>`
 });
 String(g.asymY||"").split(",").map(y=>+y.trim()).filter(Number.isFinite).forEach(y=>{
   if(y>=yMin&&y<=yMax)out+=`<line x1="${pad}" y1="${sy(y)}" x2="${w-pad}" y2="${sy(y)}" stroke="#b6a8c9" stroke-width="1.4" stroke-dasharray="5 5"/><text class="graphPointLabel" x="${pad+5}" y="${sy(y)-5}">y = ${y}</text>`
 });

 out+=`<g clip-path="url(#plotClip)">`;
 (g.curves||[]).filter(c=>c.visible!==false&&String(c.expr||"").trim()).forEach((c,ci)=>{
   const pts=[];let segment=[];
   const steps=1200;
   const rawExpr=String(c.expr||"").replace(/\s+/g,"");
   const zeroAsymptotic=/(?:exp\(|(?:\(*\s*(?:\d+(?:[.,]\d+)?|e)\s*\)*\s*\^\s*\(*\s*[+-]?x\)*))/i.test(rawExpr);
   const zeroScreen=(yMin<0&&yMax>0)?sy(0):null;
   const lineWidth=Math.max(1.2,Number(g.lineWidth)||2.4);
   const tinyVisualGap=Math.max(0.6,lineWidth*0.22);
   const flush=()=>{if(segment.length>1){pts.push(segment);segment=[]}};
   for(let i=0;i<=steps;i++){
     const x=xMin+(xMax-xMin)*i/steps,y=graphEval(c.expr,x);
     if(!Number.isFinite(y)||y<yMin-(yMax-yMin)*2||y>yMax+(yMax-yMin)*2){flush();continue}
     const px=sx(x);let py=sy(y);
     // For exponential tails, keep the real curve shape. Only prevent exact pixel-overlap
     // with the x-axis by less than 1 px so it still visibly approaches 0 instead of
     // becoming an artificial parallel line.
     if(zeroAsymptotic&&zeroScreen!==null&&Math.abs(y)>1e-15&&Math.abs(py-zeroScreen)<tinyVisualGap){
       py=zeroScreen+(y>0?-tinyVisualGap:tinyVisualGap);
     }
     if(segment.length){
       const prev=segment[segment.length-1];
       if(Math.abs(py-prev[1])>plotH*.55){flush()}
     }
     segment.push([px,py]);
   }
   flush();
   const dash=c.style==="dashed"?' stroke-dasharray="8 5"':c.style==="dotted"?' stroke-dasharray="2 5"':"";
   pts.forEach(seg=>{
     const d=seg.map((p,i)=>(i?"L":"M")+p[0].toFixed(2)+" "+p[1].toFixed(2)).join(" ");
     out+=`<path d="${d}" fill="none" stroke="${escAttr(c.color||"#e58f98")}" stroke-width="${Number(g.lineWidth)||2.4}" stroke-linecap="round" stroke-linejoin="round"${dash}/>`;
   });
 });
 out+=`</g></svg>`;
 return out;
}
function graphPreset(name){
 if(name==="linear")return {...graphDefault(),curves:[{expr:"2*x+1",color:"#e58f98",style:"solid",visible:true}]};
 if(name==="parabola")return {...graphDefault(),curves:[{expr:"x^2-4",color:"#8ba8cf",style:"solid",visible:true}],yMin:-6,yMax:12};
 if(name==="waves")return {...graphDefault(),xMin:-7,xMax:7,yMin:-3,yMax:3,curves:[
   {expr:"sin(x)",color:"#e58f98",style:"solid",visible:true},
   {expr:"cos(x)",color:"#8ca8ce",style:"solid",visible:true}
 ]};
 if(name==="crazyWaves")return {...graphDefault(),xMin:-10,xMax:10,yMin:-4,yMax:4,curves:[
   {expr:"2*sin(x)",color:"#e58f98",style:"solid",visible:true},
   {expr:"sin(2*x)+cos(x/2)",color:"#93a96f",style:"solid",visible:true},
   {expr:"2*cos(x/1.5)",color:"#8ca8ce",style:"dashed",visible:true}
 ]};
 if(name==="reciprocal")return {...graphDefault(),xMin:-8,xMax:8,yMin:-8,yMax:8,asymX:"0",asymY:"0",curves:[{expr:"1/x",color:"#9a7db0",style:"solid",visible:true}]};
 if(name==="exp")return {...graphDefault(),xMin:-5,xMax:5,yMin:-2,yMax:12,asymY:"0",curves:[{expr:"exp(x)",color:"#e09a68",style:"solid",visible:true}]};
 return graphDefault();
}
let graphDraft=graphDefault();
window.openGraphDialog=function(editId=""){
 const old=editId?canvasState.objects.find(x=>x.id===editId):null;
 graphDraft=JSON.parse(JSON.stringify(old?.graph||graphDefault()));
 openModal(`<div class="graphModal">
   <div class="presetModalHead"><div><span class="eyebrow">MATHEMATIK</span><h2>${old?"Graph bearbeiten":"Graph erstellen"}</h2></div><button class="miniIcon" onclick="closeModal()">×</button></div>
   <div class="graphPresets">
       <button onclick="applyGraphPreset('linear')">╱ Gerade</button>
       <button onclick="applyGraphPreset('parabola')">∪ Parabel</button>
       <button onclick="applyGraphPreset('waves')">〰 Sin + Cos</button>
       <button onclick="applyGraphPreset('crazyWaves')">≋ Mehrere Wellen</button>
       <button onclick="applyGraphPreset('reciprocal')">⌁ Hyperbel</button>
       <button onclick="applyGraphPreset('exp')">↗ Exponential</button>
     </div>
   
   <div class="graphBuilderLayout">
     <div class="graphControls">
       <div id="graphCurveRows"></div>
       <button class="graphAddCurve" onclick="addGraphCurve()">＋ Funktion</button>
       <div class="graphRangeGrid">
         <label>x min<input id="gxMin" type="number" step="any" value="${graphDraft.xMin}" onchange="syncGraphDraft()"></label>
         <label>x max<input id="gxMax" type="number" step="any" value="${graphDraft.xMax}" onchange="syncGraphDraft()"></label>
         <label>y min<input id="gyMin" type="number" step="any" value="${graphDraft.yMin}" onchange="syncGraphDraft()"></label>
         <label>y max<input id="gyMax" type="number" step="any" value="${graphDraft.yMax}" onchange="syncGraphDraft()"></label>
       </div>
       <div class="graphAutoRangeNote">Beim Skalieren des Graph-Objekts werden automatisch mehr/weniger x- und y-Bereiche gezeigt – keine weißen Lücken.</div>
       <div class="graphSwitches">
         <label><input id="gGrid" type="checkbox" ${graphDraft.showGrid?"checked":""} onchange="syncGraphDraft()"> Gitternetz</label>
         <label><input id="gAxes" type="checkbox" ${graphDraft.showAxes?"checked":""} onchange="syncGraphDraft()"> Achsen</label>
         <label><input id="gLabels" type="checkbox" ${graphDraft.showLabels?"checked":""} onchange="syncGraphDraft()"> Zahlen</label>
       </div>
       <div class="graphAsymGrid">
         <label>Senkrechte Hilfslinien<input id="gAsymX" value="${esc(graphDraft.asymX||"")}" placeholder="z. B. 0, 2" onchange="syncGraphDraft()"></label>
         <label>Waagrechte Hilfslinien<input id="gAsymY" value="${esc(graphDraft.asymY||"")}" placeholder="z. B. 0" onchange="syncGraphDraft()"></label>
       </div>
       <div class="graphVisualBuilder">
         <div class="graphVisualBuilderTitle">Funktion einfacher bauen</div>
         <div class="graphMathButtons">
           <button onclick="graphInsertToken('x')">x</button>
           <button onclick="graphInsertToken('^2')">x²</button>
           <button onclick="graphInsertToken('^3')">x³</button>
           <button onclick="graphInsertToken('sqrt()')">√</button>
           <button onclick="graphInsertToken('sin()')">sin</button>
           <button onclick="graphInsertToken('cos()')">cos</button>
           <button onclick="graphInsertToken('tan()')">tan</button>
           <button onclick="graphInsertToken('abs()')">|x|</button>
           <button onclick="graphInsertToken('1/')">1/x</button>
           <button onclick="graphInsertToken('exp()')">eˣ</button>
           <button onclick="graphInsertToken('+')">＋</button>
           <button onclick="graphInsertToken('-')">−</button>
           <button onclick="graphInsertToken('*')">×</button>
           <button onclick="graphInsertToken('/')">÷</button>
           <button onclick="graphInsertToken('(')">(</button>
           <button onclick="graphInsertToken(')')">)</button>
         </div>
         <div class="graphHintTiny">Tippe zuerst in eine Funktion oben und benutze dann die Mathe-Tasten. Bei √, sin, cos usw. springt der Cursor automatisch zwischen die Klammern.</div>
       </div>
     </div>
     <div class="graphPreviewWrap"><div id="graphPreview" class="graphPreview"></div></div>
   </div>
   <button class="primary" onclick="saveGraphObject('${editId}')">${old?"Übernehmen":"Graph einfügen"}</button>
 </div>`);
 setTimeout(()=>{renderGraphCurveRows();renderGraphPreview()},0);
}
function renderGraphCurveRows(){
 const root=$("#graphCurveRows");if(!root)return;
 root.innerHTML=(graphDraft.curves||[]).map((c,i)=>`<div class="graphCurveRow ${i===graphActiveCurve?"activeCurve":""}" onclick="graphActiveCurve=${i};renderGraphCurveRows()">
   <span>f${i+1}(x)</span>
   <button class="graphExprButton" data-curve="${i}" onclick="openGraphFunctionEditor(${i})"><span>${c.expr?graphExprToVisual(c.expr):"Funktion eingeben"}</span><small>Bearbeiten</small></button>
   <input class="graphColor" type="color" value="${c.color||"#e58f98"}" onchange="updateGraphCurve(${i},'color',this.value)">
   <select onchange="updateGraphCurve(${i},'style',this.value)"><option value="solid" ${c.style==="solid"?"selected":""}>Linie</option><option value="dashed" ${c.style==="dashed"?"selected":""}>Gestrichelt</option><option value="dotted" ${c.style==="dotted"?"selected":""}>Gepunktet</option></select>
   <button ${graphDraft.curves.length<=1?"disabled":""} onclick="removeGraphCurve(${i})">×</button>
 </div>`).join("");
}
window.updateGraphCurve=function(i,prop,value){graphDraft.curves[i][prop]=value;renderGraphPreview()}


window.openGraphFunctionEditor=function(i){
 graphActiveCurve=i;
 const current=graphDraft.curves[i]?.expr||"";
 openModal(`<div class="visualGraphFunctionModal">
   <div class="presetModalHead graphFnHead">
     <div><span class="eyebrow">GRAPH</span><h2>Funktion ${i+1} bearbeiten</h2></div>
     <button class="miniIcon" onclick="closeModal()">×</button>
   </div>

   <p class="formulaEasyHint"><b>Wie im Formel-Editor:</b> Schreibe direkt mathematisch. Markiere einen Teil und tippe danach z. B. Wurzel, Bruch oder Exponent – dann gilt der Baustein nur für die Markierung.</p>

   <div class="formulaEditToolbar">
     <div class="formulaHistoryBtns"><button onclick="graphFormulaUndo()" title="Rückgängig">↶</button><button onclick="graphFormulaRedo()" title="Wiederholen">↷</button></div>
     <span>Funktion visuell bearbeiten</span>
   </div>
   <div id="graphFunctionVisual" class="formulaVisualEditor graphFunctionVisual" contenteditable="true" spellcheck="false" data-placeholder="z. B. x² + 2x − 3">${graphExprToVisual(current)}</div>

   <div class="graphInlineOps" aria-label="Rechenzeichen">
     <button onclick="graphFnInsert('plus')" title="Plus">＋</button>
     <button onclick="graphFnInsert('minus')" title="Minus">−</button>
     <button onclick="graphFnInsert('times')" title="Mal">×</button>
     <button onclick="graphFnInsert('divide')" title="Geteilt">÷</button>
     <button onclick="graphFnInsert('paren')" title="Klammer">( )</button>
     <button onclick="graphFnInsert('x')" title="Variable">x</button>
   </div>

   <div class="graphToolSections">
     <section class="graphToolSection">
       <div class="graphToolTitle">Bausteine</div>
       <div class="formulaTemplateGrid visualOnly graphFormulaMenu compactMathMenu">
         <button onclick="graphFnInsert('power')"><b>xⁿ</b><span>Exponent</span></button>
         <button onclick="graphFnInsert('sqrt')"><b>√x</b><span>Wurzel</span></button>
         <button onclick="graphFnInsert('frac')"><b>½</b><span>Bruch</span></button>
         <button onclick="graphFnInsert('paren')"><b>(x)</b><span>Klammer</span></button>
         <button onclick="graphFnInsert('abs')"><b>|x|</b><span>Betrag</span></button>
         <button onclick="graphFnInsert('exp')"><b>eˣ</b><span>Exponential</span></button>
       </div>
     </section>

     <section class="graphToolSection">
       <div class="graphToolTitle">Funktionen</div>
       <div class="formulaTemplateGrid visualOnly graphFormulaMenu compactMathMenu">
         <button onclick="graphFnInsert('sin')"><b>sin</b><span>Sinus</span></button>
         <button onclick="graphFnInsert('cos')"><b>cos</b><span>Cosinus</span></button>
         <button onclick="graphFnInsert('tan')"><b>tan</b><span>Tangens</span></button>
         <button onclick="graphFnInsert('pi')"><b>π</b><span>Pi</span></button>
         <button onclick="graphFnInsert('infinity')"><b>∞</b><span>Unendlich</span></button>
         <button onclick="graphFnInsert('arrow')"><b>→</b><span>Pfeil</span></button>
       </div>
     </section>
   </div>

   <div class="graphFnFooter">
     <button class="ghost" onclick="closeModal()">Abbrechen</button>
     <button class="primary" onclick="saveGraphFunctionEditor(${i})">Übernehmen</button>
   </div>
 </div>`);
 setTimeout(()=>{
   const ed=$("#graphFunctionVisual");
   if(ed){
     ed.focus();placeCaretAtEnd(ed);installFormulaSlotProtection(ed);
     graphFormulaHistory=[ed.innerHTML];graphFormulaIndex=0;
     ed.addEventListener("input",()=>{normalizeGraphVisualMath(ed);normalizeAllVisualRoots(ed);pushLocalVisualHistory("graph",ed)});
   }
 },60);
}

function graphVisualSelection(){
 const ed=$("#graphFunctionVisual"),sel=window.getSelection();
 if(!ed||!sel||!sel.rangeCount)return {ed,sel:null,range:null,html:""};
 const range=sel.getRangeAt(0);
 if(!ed.contains(range.commonAncestorContainer))return {ed,sel,range:null,html:""};
 const box=document.createElement("div");box.appendChild(range.cloneContents());
 return {ed,sel,range,html:range.collapsed?"":box.innerHTML};
}
function graphInsertHTML(html,focusSelector=""){
 const {ed,sel,range}=graphVisualSelection();if(!ed)return;
 ed.focus();
 let r=range;
 if(!r){r=document.createRange();r.selectNodeContents(ed);r.collapse(false)}
 r.deleteContents();
 const temp=document.createElement("div");temp.innerHTML=html;
 const frag=document.createDocumentFragment();let node,last;
 while((node=temp.firstChild)){last=frag.appendChild(node)}
 r.insertNode(frag);
 let target=null;
 if(focusSelector){
   const root=last?.nodeType===1?last:last?.parentElement;
   target=(root?.matches?.(focusSelector)?root:root?.querySelector?.(focusSelector))||ed.querySelector(focusSelector);
 }
 const nr=document.createRange();
 if(target)nr.selectNodeContents(target);
 else if(last){nr.setStartAfter(last);nr.collapse(true)}
 else{nr.selectNodeContents(ed);nr.collapse(false)}
 sel.removeAllRanges();sel.addRange(nr);
}
window.graphFnInsert=function(kind){
 const {html:selected}=graphVisualSelection();
 const inner=selected||'<span class="vfEditable" contenteditable="true">x</span>';

 if(kind==="x") graphInsertHTML("x");
 else if(kind==="power"){
   const base = selected || "x";
   graphInsertHTML(`<span class="vfPower"><span class="vfPowerBase">${base}</span><sup class="vfEditable vfExponentSlot" contenteditable="true">n</sup></span>&nbsp;`,"sup.vfExponentSlot");
   setTimeout(()=>{
     const ed=$("#graphFunctionVisual");
     const slot=ed?.querySelector("sup.vfExponentSlot:last-of-type");
     if(slot){
       slot.focus?.();
       const r=document.createRange(),s=window.getSelection();
       r.selectNodeContents(slot);s.removeAllRanges();s.addRange(r);
     }
   },0);
 }
 else if(kind==="sqrt"){ graphInsertHTML(`<span class="vfRoot">√<span>${cleanRootSelectionHTML(inner)}</span></span>&nbsp;`,".vfEditable"); requestAnimationFrame(()=>normalizeAllVisualRoots($("#graphFunctionVisual"))); }
 else if(kind==="frac"){
   if(selected)graphInsertHTML(`<span class="vfFrac"><span>${selected}</span><span class="vfEditable" contenteditable="true">x</span></span>&nbsp;`,".vfEditable");
   else graphInsertHTML(`<span class="vfFrac"><span class="vfEditable" contenteditable="true">1</span><span contenteditable="true">x</span></span>&nbsp;`,".vfEditable");
 }
 else if(kind==="sin") graphInsertHTML(`<span class="vfFunction">sin(<span class="vfEditable" contenteditable="true">${selected||"x"}</span>)</span>&nbsp;`,".vfEditable");
 else if(kind==="cos") graphInsertHTML(`<span class="vfFunction">cos(<span class="vfEditable" contenteditable="true">${selected||"x"}</span>)</span>&nbsp;`,".vfEditable");
 else if(kind==="tan") graphInsertHTML(`<span class="vfFunction">tan(<span class="vfEditable" contenteditable="true">${selected||"x"}</span>)</span>&nbsp;`,".vfEditable");
 else if(kind==="abs") graphInsertHTML(`<span class="vfAbs">|<span class="vfEditable" contenteditable="true">${selected||"x"}</span>|</span>&nbsp;`,".vfEditable");
 else if(kind==="exp") graphInsertHTML(`<span class="vfExp">e<sup class="vfEditable" contenteditable="true">${selected||"x"}</sup></span>&nbsp;`,"sup.vfEditable");
 else if(kind==="plus") graphInsertHTML(" + ");
 else if(kind==="minus") graphInsertHTML(" − ");
 else if(kind==="times") graphInsertHTML(" × ");
 else if(kind==="divide") graphInsertHTML(" ÷ ");
 else if(kind==="paren") graphInsertHTML(`<span class="vfParen">(<span class="vfEditable" contenteditable="true">${selected||"x"}</span>)</span>&nbsp;`,".vfEditable");
 else if(kind==="pi") graphInsertHTML("π");
 else if(kind==="infinity") graphInsertHTML("∞");
 else if(kind==="arrow") graphInsertHTML("→");
 const ed=$("#graphFunctionVisual");
 if(ed){
   normalizeGraphVisualMath(ed);
   installFormulaSlotProtection(ed);
 }
}


function normalizeGraphVisualMath(ed){
 if(!ed)return;
 // Safari can leave a separate '-' / '−' text node from the selection right before a wrapped root.
 [...ed.childNodes].forEach((node,idx,arr)=>{
   if(node.nodeType===Node.TEXT_NODE && /^\s*[-−]\s*$/.test(node.nodeValue||"")){
     const next=arr[idx+1];
     if(next?.nodeType===Node.ELEMENT_NODE && next.matches?.(".vfRoot")) node.remove();
   }
 });
 // also remove stray operator-only text directly inside a root before the radicand.
 ed.querySelectorAll(".vfRoot").forEach(root=>{
   [...root.childNodes].forEach((node,idx)=>{
     if(node.nodeType===Node.TEXT_NODE && /^\s*[-−]\s*$/.test(node.nodeValue||"") && idx>0) node.remove();
   });
 });
}

window.setGraphFnPresetVisual=function(type){
 const ed=$("#graphFunctionVisual");if(!ed)return;
 if(type==="linear")ed.innerHTML="x";
 if(type==="square")ed.innerHTML='<span class="vfPower"><span class="vfPowerBase">x</span><sup class="vfEditable vfExponentSlot" contenteditable="true">2</sup></span>';
 if(type==="cube")ed.innerHTML='<span class="vfPower"><span class="vfPowerBase">x</span><sup class="vfEditable vfExponentSlot" contenteditable="true">3</sup></span>';
 if(type==="sin")ed.innerHTML='<span class="vfFunction">sin(<span contenteditable="true">x</span>)</span>';
 if(type==="cos")ed.innerHTML='<span class="vfFunction">cos(<span contenteditable="true">x</span>)</span>';
 if(type==="reciprocal")ed.innerHTML='<span class="vfFrac"><span contenteditable="true">1</span><span contenteditable="true">x</span></span>';
 placeCaretAtEnd(ed);installFormulaSlotProtection(ed);
}

function graphExprToVisual(expr){
 let s=String(expr||"").trim();
 if(!s)return "";
 s=s.replace(/^[xy]\s*=\s*/i,"");
 s=esc(s);
 s=s.replace(/\bpi\b/gi,"π").replace(/\*/g,"×");
 // common powers
 s=s.replace(/([a-zA-Z0-9)])\^([0-9]+)/g,'<span class="vfPower"><span class="vfPowerBase">$1</span><sup class="vfEditable vfExponentSlot" contenteditable="true">$2</sup></span>');
 // common sqrt and trig forms (simple inner values)
 s=s.replace(/sqrt\(([^()]*)\)/g,'<span class="vfRoot">√<span contenteditable="true">$1</span></span>');
 s=s.replace(/sin\(([^()]*)\)/g,'<span class="vfFunction">sin(<span contenteditable="true">$1</span>)</span>');
 s=s.replace(/cos\(([^()]*)\)/g,'<span class="vfFunction">cos(<span contenteditable="true">$1</span>)</span>');
 s=s.replace(/tan\(([^()]*)\)/g,'<span class="vfFunction">tan(<span contenteditable="true">$1</span>)</span>');
 s=s.replace(/abs\(([^()]*)\)/g,'<span class="vfAbs">|<span contenteditable="true">$1</span>|</span>');
 s=s.replace(/exp\(([^()]*)\)/g,'<span class="vfExp">e<sup contenteditable="true">$1</sup></span>');
 return s;
}
function graphVisualNodeExpr(node){
 if(!node)return "";
 if(node.nodeType===Node.TEXT_NODE){
   return (node.nodeValue||"").replace(/\u200b/g,"").replace(/[×⋅]/g,"*").replace(/÷/g,"/").replace(/−/g,"-").replace(/π/g,"pi");
 }
 if(node.nodeType!==Node.ELEMENT_NODE)return "";
 if(node.matches(".vfRoot")){
   const inside=node.querySelector(":scope > span");
   let inner=graphVisualChildrenExpr(inside).trim();
   inner=inner.replace(/^[+\-]\s*(?=\()/,"");
   return `sqrt(${inner})`;
 }
 if(node.matches(".vfFrac")){
   const parts=[...node.children];
   return `((${graphVisualChildrenExpr(parts[0])})/(${graphVisualChildrenExpr(parts[1])}))`;
 }
 if(node.matches(".vfFunction")){
   const text=(node.childNodes[0]?.nodeValue||"").trim();
   const fn=(text.match(/^(sin|cos|tan)/)||[])[1]||"sin";
   const inside=node.querySelector("span");
   return `${fn}(${graphVisualChildrenExpr(inside)})`;
 }
 if(node.matches(".vfAbs")){
   const inside=node.querySelector("span");
   return `abs(${graphVisualChildrenExpr(inside)})`;
 }
 if(node.matches(".vfPower")){
   const base=node.querySelector(":scope > .vfPowerBase");
   const exponent=node.querySelector(":scope > sup");
   return `(${graphVisualChildrenExpr(base)})^(${graphVisualChildrenExpr(exponent)})`;
 }
 if(node.matches(".vfExp")){
   const exponent=node.querySelector("sup");
   return `exp(${graphVisualChildrenExpr(exponent)})`;
 }
 if(node.tagName==="SUP")return `^(${graphVisualChildrenExpr(node)})`;
 if(node.tagName==="SUB")return "";
 return graphVisualChildrenExpr(node);
}
function graphVisualChildrenExpr(el){
 if(!el)return "";
 return [...el.childNodes].map(graphVisualNodeExpr).join("");
}
window.saveGraphFunctionEditor=function(i){
 const ed=$("#graphFunctionVisual");if(!ed)return;
 // Safari/contenteditable can leave a stray minus text node before a wrapped root.
 [...ed.childNodes].forEach((n,idx,arr)=>{
   if(n.nodeType===Node.TEXT_NODE && /^\s*[-−]\s*$/.test(n.nodeValue||"")){
     const next=arr[idx+1];
     if(next?.nodeType===Node.ELEMENT_NODE && next.matches?.(".vfRoot")) n.remove();
   }
 });
 let expr=graphVisualChildrenExpr(ed).replace(/\s+/g,"");
 expr=expr.replace(/^[xy]=/i,"");
 if(!expr){cuteToast("Funktion ist leer");return}
 graphDraft.curves[i].expr=expr;
 closeModal();renderGraphCurveRows();renderGraphPreview();cuteToast("Funktion übernommen ♡");
}



let graphActiveCurve=0;

window.graphVisualInsert=function(kind){
 const inputs=[];
 let input=inputs.find(x=>+x.dataset.curve===graphActiveCurve);
 if(!input){
   if(graphDraft.curves.length<4){addGraphCurve();input=$$(".graphExpr").find(x=>+x.dataset.curve===graphActiveCurve)}
 }
 if(!input)return;
 input.focus();
 const start=input.selectionStart??input.value.length,end=input.selectionEnd??start;
 const selected=input.value.slice(start,end);
 let insert="",cursor=null;
 const inner=selected||"x";
 if(kind==="x")insert="x";
 if(kind==="power")insert=selected?`(${selected})^2`:"x^2";
 if(kind==="sqrt")insert=`sqrt(${inner})`;
 if(kind==="frac")insert=selected?`(${selected})/(x)`:"1/x";
 if(kind==="sin")insert=`sin(${inner})`;
 if(kind==="cos")insert=`cos(${inner})`;
 if(kind==="tan")insert=`tan(${inner})`;
 if(kind==="abs")insert=`abs(${inner})`;
 if(kind==="exp")insert=`exp(${inner})`;
 if(kind==="plus")insert="+";
 if(kind==="minus")insert="-";
 if(kind==="times")insert="*";
 input.setRangeText(insert,start,end,"end");
 if(!selected && ["sqrt","sin","cos","tan","abs","exp"].includes(kind)){
   cursor=start+insert.length-2; input.setSelectionRange(cursor,cursor+1);
 }else if(!selected&&kind==="power"){
   cursor=start+2;input.setSelectionRange(cursor,cursor+1);
 }
 graphDraft.curves[+input.dataset.curve].expr=input.value;
 renderGraphCurveRows();renderGraphPreview();
 const again=$$(".graphExpr").find(x=>+x.dataset.curve===graphActiveCurve);if(again){again.focus()}
}

window.graphInsertToken=function(token){
 const inputs=[];
 const input=inputs.find(x=>+x.dataset.curve===graphActiveCurve)||inputs[0];
 if(!input)return;
 input.focus();
 const start=input.selectionStart??input.value.length,end=input.selectionEnd??start;
 let insert=token,cursor=start+token.length;
 if(token.endsWith("()")){
   insert=token;cursor=start+token.length-1;
 }else if(token==="1/"){
   const selected=input.value.slice(start,end);
   insert=selected?`1/(${selected})`:"1/x";
   cursor=start+insert.length;
 }else if(token==="^2"||token==="^3"){
   insert=token;cursor=start+token.length;
 }
 input.setRangeText(insert,start,end,"end");
 input.setSelectionRange(cursor,cursor);
 graphDraft.curves[+input.dataset.curve].expr=input.value;
 renderGraphPreview();
}

window.addGraphCurve=function(){
 if(graphDraft.curves.length>=4){cuteToast("Maximal 4 Funktionen");return}
 const colors=["#e58f98","#8ca8ce","#93a96f","#9a7db0"];
 graphDraft.curves.push({expr:"",color:colors[graphDraft.curves.length]||"#777777",style:"solid",visible:true});graphActiveCurve=graphDraft.curves.length-1;
 renderGraphCurveRows();renderGraphPreview();
}
window.removeGraphCurve=function(i){if(graphDraft.curves.length<=1)return;graphDraft.curves.splice(i,1);renderGraphCurveRows();renderGraphPreview()}
window.syncGraphDraft=function(){
 graphDraft.xMin=+$("#gxMin").value;graphDraft.xMax=+$("#gxMax").value;graphDraft.yMin=+$("#gyMin").value;graphDraft.yMax=+$("#gyMax").value;
 if(graphDraft.xMin>=graphDraft.xMax)graphDraft.xMax=graphDraft.xMin+1;
 if(graphDraft.yMin>=graphDraft.yMax)graphDraft.yMax=graphDraft.yMin+1;
 graphDraft.showGrid=$("#gGrid").checked;graphDraft.showAxes=$("#gAxes").checked;graphDraft.showLabels=$("#gLabels").checked;
 graphDraft.asymX=$("#gAsymX").value;graphDraft.asymY=$("#gAsymY").value;renderGraphPreview();
}
window.applyGraphPreset=function(name){
 const preset=graphPreset(name), incoming=preset.curves||[];
 const colors=["#e58f98","#8ca8ce","#93a96f","#9a7db0"];
 // If the initial untouched default is still present, use it as the first slot.
 const untouched=graphDraft.curves.length===1&&graphDraft.curves[0].expr==="x^2";
 if(untouched)graphDraft.curves=[];
 incoming.forEach(c=>{
   if(graphDraft.curves.length>=4)return;
   graphDraft.curves.push({...c,color:c.color||colors[graphDraft.curves.length]});
 });
 graphActiveCurve=Math.max(0,graphDraft.curves.length-1);
 // expand range instead of replacing user's existing range
 graphDraft.xMin=Math.min(graphDraft.xMin,preset.xMin);graphDraft.xMax=Math.max(graphDraft.xMax,preset.xMax);
 graphDraft.yMin=Math.min(graphDraft.yMin,preset.yMin);graphDraft.yMax=Math.max(graphDraft.yMax,preset.yMax);
 if(preset.asymX)graphDraft.asymX=[graphDraft.asymX,preset.asymX].filter(Boolean).join(",");
 if(preset.asymY)graphDraft.asymY=[graphDraft.asymY,preset.asymY].filter(Boolean).join(",");
 renderGraphCurveRows();openGraphDialogRefreshFields();renderGraphPreview();cuteToast("Als neue Funktion hinzugefügt ♡");
}
function openGraphDialogRefreshFields(){
 [["gxMin","xMin"],["gxMax","xMax"],["gyMin","yMin"],["gyMax","yMax"],["gAsymX","asymX"],["gAsymY","asymY"]].forEach(([idv,p])=>{if($("#"+idv))$("#"+idv).value=graphDraft[p]??""});
 if($("#gGrid"))$("#gGrid").checked=!!graphDraft.showGrid;if($("#gAxes"))$("#gAxes").checked=!!graphDraft.showAxes;if($("#gLabels"))$("#gLabels").checked=!!graphDraft.showLabels;
}
function renderGraphPreview(){const root=$("#graphPreview");if(root)root.innerHTML=graphSvg(graphDraft,520,330)}
window.saveGraphObject=function(editId=""){
 if(editId){
   const o=canvasState.objects.find(x=>x.id===editId);if(o)o.graph=JSON.parse(JSON.stringify(graphDraft));
 }else{
   const o={id:id(),z:nextCanvasZ(),kind:"graph",x:95,y:160,w:520,h:330,graph:JSON.parse(JSON.stringify(graphDraft)),rotation:0,locked:false};
   canvasState.objects.push(o);canvasState.selectedType="object";canvasState.selectedId=o.id;canvasState.selectedIds=[o.id];
 }
 closeModal();renderCanvasObjects();renderCanvasInspector();markCanvasDirty();pushHistory();cuteToast("Graph eingefügt ♡");
}

function nextCanvasZ(){
 const zs=[...canvasState.objects.map(x=>x.z||0),...canvasState.vectors.map(x=>x.z||0)];return (zs.length?Math.max(...zs):0)+1;
}
function newCanvasObject(styleId){
 const s=canvasPresets().find(x=>x.id===styleId)||canvasStylesDefault[2];
 return {id:id(),z:nextCanvasZ(),kind:s.type==="block"?"block":"text",formatId:s.id,x:80,y:90,w:s.type==="block"?430:360,h:s.type==="block"?100:70,
 text:s.prefix||"",rotation:0,locked:false,editing:false,
 style:{fontSize:s.fontSize,fontWeight:s.fontWeight,color:s.color,fontFamily:s.fontFamily||"Arial",background:s.bg||"transparent",
 borderColor:s.borderColor||"transparent",borderWidth:s.borderWidth||0,borderRadius:s.radius||0,padding:s.padding??7,textAlign:"left"}};
}
window.addCanvasText=function(styleId){
 const o=newCanvasObject(styleId);
 if(styleId==="h1")o.text="Überschrift";
 else if(styleId==="h2")o.text="Unterüberschrift";
 else if(styleId==="body")o.text="Text eingeben …";
 else if(styleId==="task"&&!o.text)o.text="Aufgabe: ";
 else if(styleId==="merke"&&!o.text)o.text="Merke: ";
 else if(!o.text)o.text="Text eingeben …";
 canvasState.objects.push(o);renderCanvasObjects();selectCanvasObject(o.id);
 markCanvasDirty();
}

window.addCanvasTextBox=function(){
 const o=newCanvasObject("body");o.text="Textfeld";o.w=300;o.h=90;o.style.borderWidth=1;o.style.borderColor="#d7c8c2";o.style.padding=12;
 canvasState.objects.push(o);renderCanvasObjects();selectCanvasObject(o.id);markCanvasDirty();cuteToast("Textfeld eingefügt ♡");
}
window.addCanvasChecklist=function(){
 const o=newCanvasObject("body");o.text="☐ Punkt 1<br>☐ Punkt 2<br>☐ Punkt 3";o.w=320;o.h=120;o.style.padding=10;
 canvasState.objects.push(o);renderCanvasObjects();selectCanvasObject(o.id);markCanvasDirty();cuteToast("Checkliste eingefügt ♡");
}
window.addCanvasDivider=function(){
 const o={id:id(),z:nextCanvasZ(),kind:"block",x:100,y:180,w:420,h:8,text:"",rotation:0,locked:false,editing:false,style:{fontSize:1,color:"transparent",background:"#d9cbc5",borderColor:"transparent",borderWidth:0,borderRadius:4,padding:0,textAlign:"left"}};
 canvasState.objects.push(o);renderCanvasObjects();selectCanvasObject(o.id);markCanvasDirty();cuteToast("Trennlinie eingefügt ♡");
}
window.addCanvasDate=function(){
 const o=newCanvasObject("body");o.text=new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date());o.w=180;o.h=48;
 canvasState.objects.push(o);renderCanvasObjects();selectCanvasObject(o.id);markCanvasDirty();
}
window.addCanvasPageNumber=function(){
 const o=newCanvasObject("body");o.text="Seite 1";o.w=120;o.h=42;o.style.textAlign="center";o.x=340;o.y=canvasState.orientation==="landscape"?520:1030;
 canvasState.objects.push(o);renderCanvasObjects();selectCanvasObject(o.id);markCanvasDirty();cuteToast("Seitenzahl eingefügt ♡");
}


window.openCanvasMediaPicker=function(){
 openModal(`<div class="mediaPickerModal">
  <div class="presetModalHead"><div><span class="eyebrow">MEDIEN</span><h2>Bild oder Datei hinzufügen</h2></div><button class="miniIcon" onclick="closeModal()">×</button></div>
  <div class="mediaPickerGrid">
   <button onclick="closeModal();document.getElementById('canvasImageInput').click()"><b>🖼️</b><span>Foto auswählen</span><small>Galerie / Dateien</small></button>
   <button onclick="closeModal();document.getElementById('canvasCameraInput').click()"><b>📷</b><span>Kamera</span><small>Foto aufnehmen</small></button>
   <button onclick="closeModal();document.getElementById('canvasAnyFileInput').click()"><b>📎</b><span>Datei</span><small>PDF, Word, PowerPoint …</small></button>
  </div>
 </div>`);
}
window.addCanvasFile=function(file){
 if(!file)return;
 if((file.type||"").startsWith("image/")){addCanvasImage(file);return}
 const ext=(file.name.split(".").pop()||"DATEI").toUpperCase();
 const o=newCanvasObject("block");
 o.kind="file";o.fileName=file.name;o.fileType=ext;o.text=`📎 <b>${esc(file.name)}</b><br><small>${ext}-Datei</small>`;
 o.w=330;o.h=88;o.style.background="#fffaf5";o.style.borderColor="#ead2ca";o.style.borderWidth=1;o.style.borderRadius=14;o.style.padding=13;
 canvasState.objects.push(o);renderCanvasObjects();selectCanvasObject(o.id);pushHistory();cuteToast("Datei eingefügt ♡");
}
function captureIntoFileInput(input){
 const cam=document.createElement("input");cam.type="file";cam.accept="image/*";cam.capture="environment";
 cam.onchange=()=>{
   const f=cam.files?.[0];if(!f)return;
   try{
     const dt=new DataTransfer();
     [...(input.files||[])].forEach(x=>dt.items.add(x));dt.items.add(f);input.files=dt.files;
     input.dispatchEvent(new Event("change",{bubbles:true}));
   }catch(_){}
 };
 cam.click();
}
function enhanceCameraInputs(){
 document.querySelectorAll('input[type="file"][accept*="image"]').forEach(inp=>{
   if(inp.dataset.cameraEnhanced==="1"||inp.type==="hidden"||inp.style.display==="none")return;
   inp.dataset.cameraEnhanced="1";
   const b=document.createElement("button");b.type="button";b.className="cameraAddBtn";b.innerHTML="📷 <span>Kamera</span>";
   b.onclick=()=>captureIntoFileInput(inp);inp.insertAdjacentElement("afterend",b);
 });
}

window.addCanvasImage=function(file){
 if(!file)return;
 const r=new FileReader();r.onload=()=>{const o={id:id(),z:nextCanvasZ(),kind:"image",x:110,y:150,w:300,h:200,src:r.result};canvasState.objects.push(o);renderCanvasObjects();selectCanvasObject(o.id);pushHistory()};r.readAsDataURL(file)
}
window.openTableDialog=function(){
 openModal(`<h2>Tabelle einfügen</h2><div class="formGrid"><div><label>Spalten</label><input id="tblCols" type="number" min="1" max="12" value="3"></div><div><label>Zeilen</label><input id="tblRows" type="number" min="1" max="30" value="4"></div></div><button class="primary" style="margin-top:10px" onclick="insertCanvasTable()">Einfügen</button>`);
}
window.insertCanvasTable=function(){
 const cols=Math.max(1,Math.min(12,+$("#tblCols").value||3)),rows=Math.max(1,Math.min(30,+$("#tblRows").value||4));
 const cells=Array.from({length:rows},()=>Array.from({length:cols},()=>"..."));
 const o={id:id(),z:nextCanvasZ(),kind:"table",x:90,y:180,w:520,h:Math.max(100,rows*38),rows,cols,cells,cellColors:Array.from({length:rows},()=>Array.from({length:cols},()=>"")),borderRadius:12,activeCell:{r:0,c:0}};canvasState.objects.push(o);closeModal();renderCanvasObjects();selectCanvasObject(o.id);pushHistory();
}
const stickers=["🌸","🌷","🎀","🧸","⭐","✨","🍀","🍓","🫐","☁️","🌙","💗","📚","✏️","📝","🌼","🐻","🐰","🍵","💫","🌱"];
function renderStickerPicker(){const el=$("#stickerPicker");if(el)el.innerHTML=stickers.map(s=>`<button onclick="addSticker('${s}')">${s}</button>`).join("")}
window.toggleStickerPanel=function(){const p=$("#stickerPanel");p.style.display=p.style.display==="none"?"block":"none"}

window.addPaperSticker=function(type){
 const o={id:id(),z:nextCanvasZ(),kind:"paper",paperType:type,x:110,y:160,w:420,h:230,spacing:type==="grid"?20:28};
 canvasState.objects.push(o);renderCanvasObjects();selectCanvasObject(o.id);pushHistory();
}
window.addTapeSticker=function(){
 const o={id:id(),z:nextCanvasZ(),kind:"tape",x:160,y:110,w:150,h:38,rotation:-5};
 canvasState.objects.push(o);renderCanvasObjects();selectCanvasObject(o.id);pushHistory();
}

window.addSticker=function(s){const o={id:id(),z:nextCanvasZ(),kind:"sticker",x:120,y:120,w:80,h:80,text:s};canvasState.objects.push(o);renderCanvasObjects();selectCanvasObject(o.id);pushHistory()}


function layerName(o){
 if(o.layerLabel)return o.layerLabel;
 const plain=String(o.text||"").replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim();
 if(["text","block","task","merke"].includes(o.kind))return plain?plain.slice(0,52):(o.kind==="task"?"Aufgabe":o.kind==="merke"?"Merke":"Text");
 if(o.kind==="image")return "Bild";
 if(o.kind==="file")return "Datei · "+(o.fileName||"");
 if(o.kind==="sticker")return "Sticker "+(o.text||"");
 if(o.kind==="table")return "Tabelle";
 if(o.kind==="formula")return "Formel";
 if(o.kind==="graph")return "Graph";
 if(o.kind==="paper")return o.paperType==="grid"?"Karo-Zettel":o.paperType==="line"?"Linierter Zettel":"Leerer Zettel";
 if(o.kind==="tape")return "Klebeband";
 return o.kind;
}
function layerEntries(){
 return [
  ...canvasState.objects.map(o=>({kind:"object",id:o.id,z:o.z||0,locked:o.locked,name:layerName(o)})),
  ...canvasState.vectors.map(v=>({kind:"vector",id:v.id,z:v.z||0,locked:v.locked,name:v.layerLabel||("Form · "+v.type)}))
 ].sort((a,b)=>b.z-a.z);
}
function layerItemRef(kind,id){return kind==="object"?canvasState.objects.find(x=>x.id===id):canvasState.vectors.find(x=>x.id===id)}
window.renameLayerItem=function(kind,id){
 const item=layerItemRef(kind,id);if(!item)return;
 const current=item.layerLabel||(kind==="object"?layerName(item):("Form · "+item.type));
 const value=prompt("Ebene umbenennen",current);if(value===null)return;
 item.layerLabel=value.trim();renderLayerList();markCanvasDirty();pushHistory();
}
function reorderLayerItem(sourceKind,sourceId,targetKind,targetId){
 if(sourceKind===targetKind&&sourceId===targetId)return;
 const all=layerEntries();const from=all.findIndex(x=>x.kind===sourceKind&&x.id===sourceId),to=all.findIndex(x=>x.kind===targetKind&&x.id===targetId);
 if(from<0||to<0)return;
 const [src]=all.splice(from,1);let insert=to;if(from<to)insert=to-1;all.splice(Math.max(0,insert),0,src);
 const n=all.length;all.forEach((x,i)=>{const ref=layerItemRef(x.kind,x.id);if(ref)ref.z=(n-i)*10});
 renderCanvasObjects();renderVectors();renderLayerList();markCanvasDirty();pushHistory();
}
let nativeLayerDrag=null;
window.layerNativeDragStart=function(e,kind,id){nativeLayerDrag={kind,id};try{e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",kind+":"+id)}catch(_){}}
window.layerNativeDrop=function(e,kind,id){e.preventDefault();if(nativeLayerDrag)reorderLayerItem(nativeLayerDrag.kind,nativeLayerDrag.id,kind,id);nativeLayerDrag=null}
let pointerLayerDrag=null;
window.layerPointerStart=function(e,kind,id){
 if(e.pointerType==="mouse"&&e.button!==0)return;
 e.preventDefault();e.stopPropagation();pointerLayerDrag={kind,id,pointerId:e.pointerId,target:null};
 e.currentTarget.setPointerCapture?.(e.pointerId);
 document.body.classList.add("layerDragging");
 const move=ev=>{if(!pointerLayerDrag||ev.pointerId!==pointerLayerDrag.pointerId)return;ev.preventDefault();const hit=document.elementFromPoint(ev.clientX,ev.clientY)?.closest?.('.layerItem');document.querySelectorAll('.layerItem.layerDropTarget').forEach(x=>x.classList.remove('layerDropTarget'));if(hit&&!(hit.dataset.layerKind===kind&&hit.dataset.layerId===id)){hit.classList.add('layerDropTarget');pointerLayerDrag.target={kind:hit.dataset.layerKind,id:hit.dataset.layerId}}};
 const up=ev=>{if(!pointerLayerDrag||ev.pointerId!==pointerLayerDrag.pointerId)return;document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',up,true);document.removeEventListener('pointercancel',up,true);document.body.classList.remove('layerDragging');document.querySelectorAll('.layerItem.layerDropTarget').forEach(x=>x.classList.remove('layerDropTarget'));const d=pointerLayerDrag;pointerLayerDrag=null;if(d.target)reorderLayerItem(d.kind,d.id,d.target.kind,d.target.id)};
 document.addEventListener('pointermove',move,{capture:true,passive:false});document.addEventListener('pointerup',up,true);document.addEventListener('pointercancel',up,true);
}
function renderLayerList(){
 const el=$("#layerList");if(!el)return;
 const all=layerEntries();
 el.innerHTML=all.length?all.map(a=>`<div class="layerItem ${canvasState.selectedType===a.kind&&canvasState.selectedId===a.id?"active":""}" data-layer-kind="${a.kind}" data-layer-id="${a.id}" draggable="true" ondragstart="layerNativeDragStart(event,'${a.kind}','${a.id}')" ondragover="event.preventDefault()" ondrop="layerNativeDrop(event,'${a.kind}','${a.id}')">
   <div class="layerRow">
     <button class="layerDragHandle" title="Ziehen zum Sortieren" onpointerdown="layerPointerStart(event,'${a.kind}','${a.id}')">⠿</button>
     <button class="layerTitleBtn" onclick="${a.kind==="object"?`selectCanvasObject('${a.id}')`:`selectVector('${a.id}')`}"><span class="layerMeta">${a.locked?"🔒":""}<span class="layerName">${esc(a.name)}</span></span></button>
     <div class="layerTools">
       <button title="Umbenennen" onclick="event.stopPropagation();renameLayerItem('${a.kind}','${a.id}')">✎</button>
       <button title="Sperren" onclick="event.stopPropagation();${a.kind==="object"?`selectCanvasObject('${a.id}')`:`selectVector('${a.id}')`};toggleSelectedLock()">${a.locked?"🔓":"🔒"}</button>
       <button class="layerDeleteBtn" title="Löschen" onclick="event.stopPropagation();deleteLayerItem('${a.kind}','${a.id}')">⌫</button>
     </div>
   </div>
 </div>`).join(""):'<div class="small">Noch keine Elemente.</div>';
 const mobile=document.querySelector("#canvasQuickDrawer.open .mobileLayerList");if(mobile)mobile.innerHTML=el.innerHTML;
}

function renderCanvasObjects(){
 const root=$("#canvasObjects");if(!root)return;
 root.innerHTML=canvasState.objects.map(o=>{
   const sel=(canvasState.selectedIds||[]).includes(o.id)||(canvasState.selectedType==="object"&&canvasState.selectedId===o.id)?"selected":"";
   const lockCls=o.locked?" locked":"";
   const base=`left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${o.h}px;z-index:${o.z||0}${innerWidth>=900?"!important":""};`;
   if(o.kind==="image")return `<div class="cobj imageObj ${sel}${lockCls}" data-id="${o.id}" style="${base}transform:rotate(${o.rotation||0}deg);transform-origin:50% 50%"><img src="${o.src}"><span class="rotateHandle"></span><span class="resizeHandle"></span></div>`;
   if(o.kind==="sticker")return `<div class="cobj stickerObj ${sel}${lockCls}" data-id="${o.id}" style="${base}transform:rotate(${o.rotation||0}deg);transform-origin:50% 50%">${o.text}<span class="rotateHandle"></span><span class="resizeHandle"></span></div>`;
   if(o.kind==="paper"){
     const cls=o.paperType==="grid"?"gridPaper":o.paperType==="line"?"linePaper":"blankPaper";
     const vars=(o.paperType==="grid"?`--gridSize:${o.spacing||20}px`:o.paperType==="line"?`--lineSize:${o.spacing||28}px`:"")+`;background-color:${o.paperColor||"#fffdf7"};`;
     return `<div class="cobj paperSticker ${cls} ${sel}${lockCls}" data-id="${o.id}" style="${base}${vars}transform:rotate(${o.rotation||0}deg);transform-origin:50% 50%"><span class="rotateHandle"></span><span class="resizeHandle"></span></div>`;
   }
   if(o.kind==="tape")return `<div class="cobj tapeSticker ${sel}${lockCls}" data-id="${o.id}" style="${base}--rot:${o.rotation||-4}deg;background:${o.color||"#f2beb2"}"><span class="rotateHandle"></span><span class="resizeHandle"></span></div>`;
   if(o.kind==="graph"){
     return `<div class="cobj graphObj ${sel}${lockCls}" data-id="${o.id}" style="${base}transform:rotate(${o.rotation||0}deg)">${graphSvg(o.graph||graphDefault(),Math.max(120,Math.round(o.w)),Math.max(100,Math.round(o.h)))}<span class="rotateHandle"></span><span class="resizeHandle"></span></div>`;
   }
   if(o.kind==="formula"){
     const s=o.style||{};
     return `<div class="cobj formulaObj ${sel}${lockCls}" data-id="${o.id}" style="${base}transform:rotate(${o.rotation||0}deg);font-size:${s.fontSize||28}px;color:${s.color||"#4f4642"};font-family:${s.fontFamily||"Cambria Math, serif"};text-align:${s.textAlign||"center"}"><span class="formulaContent">${o.formulaHTML||formulaToHTML(o.formula||o.text||"")}</span><span class="rotateHandle"></span><span class="resizeHandle"></span></div>`;
   }
   if(o.kind==="table"){
     const bw=o.borderWidth??1,bc=o.borderColor||"#aaa7a2",bg=o.cellBackground||"#ffffff",fs=o.fontSize||16,rad=o.borderRadius??12;
     o.cellColors ||= Array.from({length:o.rows||o.cells.length},(_,ri)=>Array.from({length:o.cols||o.cells[ri]?.length||1},()=>""));
     const table=`<table style="--tbl-border:${bw}px;--tbl-style:${o.borderStyle||"solid"};--tbl-color:${bc};--tbl-bg:${bg};--tbl-font:${fs}px;border-radius:${rad}px;overflow:hidden">${o.cells.map((row,ri)=>`<tr>${row.map((c,ci)=>`<td contenteditable="${o.locked?"false":"true"}" inputmode="text" data-r="${ri}" data-c="${ci}" style="background:${o.cellColors?.[ri]?.[ci]||bg}">${esc(c)}</td>`).join("")}</tr>`).join("")}</table>`;
     return `<div class="cobj tableObj ${sel}${lockCls}" data-id="${o.id}" style="${base}transform:rotate(${o.rotation||0}deg);transform-origin:50% 50%"><span class="tableMoveHandle" title="Tabelle bewegen">⠿</span>${table}<span class="rotateHandle"></span><span class="resizeHandle"></span></div>`;
   }
   const cls=(o.kind==="block"||o.kind==="file")?"calloutObj":o.kind==="task"?"taskObj":o.kind==="merke"?"merkeObj":"textObj";
   const s=o.style||{};
   const editCls=o.editing?" editing":"";
  return `<div class="cobj ${cls} ${sel}${lockCls}${editCls}" data-id="${o.id}" contenteditable="${o.editing?"true":"false"}" style="${base}transform:rotate(${o.rotation||0}deg);font-size:${s.fontSize||16}px;font-weight:${s.fontWeight||400};font-style:${s.fontStyle||"normal"};text-decoration:${s.textDecoration||"none"};color:${s.color||"#333"};font-family:${s.fontFamily||"Arial"};background:${s.background||"transparent"};border:${s.borderWidth||0}px ${s.borderStyle||"solid"} ${s.borderColor||"transparent"};border-radius:${s.borderRadius||0}px;padding:${s.padding??7}px;text-align:${s.textAlign||"left"};opacity:${s.opacity??1};box-shadow:${s.boxShadow||"none"};letter-spacing:${s.letterSpacing||0}px;line-height:${s.lineHeight||1.25}">${o.text||""}<span class="rotateHandle"></span><span class="resizeHandle"></span></div>`;
 }).join("");
 attachCanvasObjectEvents();renderLayerList();
 // V35: renderCanvasObjects replaces the shared layer DOM, so restore vectors every time.
 if(typeof renderVectors==="function")renderVectors();
}
function attachCanvasObjectEvents(){
 $$("#canvasObjects .cobj").forEach(el=>{
   const oid=el.dataset.id;
   el.addEventListener("pointerdown",e=>{
     const o=canvasState.objects.find(x=>x.id===oid);if(!o)return;
     /* V180: desktop pointer/edit/transform behavior is owned by one engine only.
        Do not let this historical handler steal text selection or table focus. */
     if(innerWidth>=900)return;
     if(e.target.classList.contains("rotateHandle")){if(o.locked)return;e.preventDefault();e.stopPropagation();startRotateObject(e,oid);return}
     if(e.target.classList.contains("resizeHandle")){if(o.locked)return;e.preventDefault();e.stopPropagation();startResizeObject(e,oid);return}
     if(e.target.classList.contains("tableMoveHandle")){if(o.locked)return;e.preventDefault();e.stopPropagation();if(!canvasState.selectedIds.includes(oid)){canvasState.selectedIds=[oid];canvasState.selectedId=oid;canvasState.selectedType="object";renderCanvasObjects()}startDragSelectedObjects(e,oid);return}
     if(canvasState.multiMode||e.shiftKey){e.preventDefault();e.stopPropagation();toggleObjectInMultiSelection(oid);return}
     if(e.target.tagName==="TD"){
       if(!(canvasState.selectedType==="object"&&canvasState.selectedId===oid))selectCanvasObject(oid);
       o.activeCell={r:+e.target.dataset.r||0,c:+e.target.dataset.c||0};
       renderCanvasInspector();
       return;
     }
     const already=(canvasState.selectedIds||[]).includes(oid);
     if(!already){canvasState.objects.forEach(x=>x.editing=false);selectCanvasObject(oid);return}
     if(o.locked)return;
     if((canvasState.selectedIds.length+canvasState.selectedVectorIds.length)>1){e.preventDefault();e.stopPropagation();startDragSelection(e);return}
     if(o.editing)return;
     const start=canvasPoint(e),ox=o.x,oy=o.y;let moved=false;
     const move=ev=>{const q=canvasPoint(ev);if(Math.hypot(q.x-start.x,q.y-start.y)>6)moved=true;if(moved){const rawX=Math.max(0,Math.min(canvasPageWidth()-o.w,ox+q.x-start.x)),rawY=Math.max(0,Math.min(canvasPageHeight()-o.h,oy+q.y-start.y)),sn=snapObjectPosition(o,rawX,rawY);o.x=sn.x;o.y=sn.y;el.style.left=o.x+"px";el.style.top=o.y+"px";markCanvasDirty(false)}};
     const up=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);clearGuides();if(moved){pushHistory();return}if(["text","block","task","merke"].includes(o.kind)){o.editing=true;renderCanvasObjects();setTimeout(()=>{
       const target=document.querySelector(`.cobj[data-id="${oid}"]`);
       const sx=window.scrollX,sy=window.scrollY,vp=$("#canvasViewport"),sl=vp?.scrollLeft||0,st=vp?.scrollTop||0;
       try{target?.focus({preventScroll:true})}catch(_){target?.focus()}
       requestAnimationFrame(()=>{window.scrollTo(sx,sy);if(vp){vp.scrollLeft=sl;vp.scrollTop=st}});
     },0)}};
     window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
   });
   if(el.isContentEditable)el.addEventListener("input",()=>{const o=canvasState.objects.find(x=>x.id===oid);if(o)o.text=el.innerHTML;markCanvasDirty()});
   if(innerWidth<900)el.querySelectorAll("td").forEach(td=>td.addEventListener("input",()=>{const o=canvasState.objects.find(x=>x.id===oid);if(o)o.cells[+td.dataset.r][+td.dataset.c]=td.innerText;markCanvasDirty()}));
 });
}

function clearGuides(){const g=$("#canvasGuides");if(g)g.innerHTML=""}
function drawGuideX(x,label=""){const g=$("#canvasGuides");if(!g)return;g.insertAdjacentHTML("beforeend",`<div class="guideLine guideV" style="left:${x}px"></div>${label?`<div class="guideLabel" style="left:${x}px;top:18px">${label}</div>`:""}`)}
function drawGuideY(y,label=""){const g=$("#canvasGuides");if(!g)return;g.insertAdjacentHTML("beforeend",`<div class="guideLine guideH" style="top:${y}px"></div>${label?`<div class="guideLabel" style="left:38px;top:${y}px">${label}</div>`:""}`)}
function snapObjectPosition(o,x,y){
 clearGuides();if(!canvasState.snap)return{x,y};const th=7;const W=canvasPageWidth(),H=canvasPageHeight(),m=Math.max(0,Number(canvasState.pageStyle?.margin)||0),cx=[0,m,W/2-o.w/2,W-m-o.w,W-o.w],cy=[0,m,H/2-o.h/2,H-m-o.h,H-o.h];
 for(const a of canvasState.objects){if(a.id===o.id)continue;cx.push(a.x,a.x+a.w/2-o.w/2,a.x+a.w-o.w);cy.push(a.y,a.y+a.h/2-o.h/2,a.y+a.h-o.h)}
 let sx=x,sy=y,bx=th+1,by=th+1;for(const c of cx){const d=Math.abs(x-c);if(d<bx){bx=d;sx=c}}for(const c of cy){const d=Math.abs(y-c);if(d<by){by=d;sy=c}}
 if(bx<=th)drawGuideX(sx+o.w/2,Math.abs(sx+o.w/2-397)<2?"Mitte":"");if(by<=th)drawGuideY(sy+o.h/2,Math.abs(sy+o.h/2-561.5)<2?"Mitte":"");return{x:sx,y:sy};
}


let canvasZoom=1;


function canvasPageWidth(){return canvasState.orientation==="landscape"?1123:794}
function canvasPageHeight(){return canvasState.orientation==="landscape"?794:1123}

window.toggleTopViewMenu=function(){
 const m=$("#topViewMenu");if(!m)return;
 m.classList.toggle("open");
 updateOrientationButtons();
}
function updateOrientationButtons(){
 $("#portraitBtn")?.classList.toggle("active",canvasState.orientation!=="landscape");
 $("#landscapeBtn")?.classList.toggle("active",canvasState.orientation==="landscape");
}
window.setCanvasOrientation=function(mode){ 
 if(shouldAutoFitCanvas()) canvasState.userZoomTouched=false;
 mode=mode==="landscape"?"landscape":"portrait";
 if(canvasState.orientation===mode){$("#topViewMenu")?.classList.remove("open");return}
 canvasState.orientation=mode;
 const W=canvasPageWidth(),H=canvasPageHeight();
 // Keep every object inside the new page without stretching it.
 canvasState.objects.forEach(o=>{
   o.x=Math.max(0,Math.min(W-Math.min(o.w,W),o.x));
   o.y=Math.max(0,Math.min(H-Math.min(o.h,H),o.y));
   o.w=Math.min(o.w,W);
   o.h=Math.min(o.h,H);
 });
 applyCanvasPageSize();
 renderCanvasObjects();renderVectors();renderCanvasInspector();
 fitCanvasStage();markCanvasDirty();pushHistory();
 $("#topViewMenu")?.classList.remove("open");
}

function pagePatternCSS(style=canvasState.pageStyle){
 const c=style.color||"#ffffff",sp=Math.max(10,Number(style.spacing)||24),line=style.patternColor||"#8197ae";
 if(style.pattern==="lined"){
   return `background-color:${c};background-image:repeating-linear-gradient(to bottom,transparent 0,transparent ${sp-1}px,color-mix(in srgb,${line} 28%,transparent) ${sp-1}px,color-mix(in srgb,${line} 28%,transparent) ${sp}px);background-size:100% ${sp}px`;
 }
 if(style.pattern==="grid"){
   return `background-color:${c};background-image:linear-gradient(color-mix(in srgb,${line} 24%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,${line} 24%,transparent) 1px,transparent 1px);background-size:${sp}px ${sp}px`;
 }
 if(style.pattern==="dots"){
   return `background-color:${c};background-image:radial-gradient(circle,color-mix(in srgb,${line} 38%,transparent) 1.25px,transparent 1.4px);background-size:${sp}px ${sp}px`;
 }
 return `background-color:${c};background-image:none`;
}
function updatePageStyleControls(){
 const s=canvasState.pageStyle||{};
 const patt=s.pattern||"blank";
 const lbl=$("#pageSpacingLabel");
 if(lbl){
   const names={blank:"",lined:"Linienabstand",grid:"Karogröße",dots:"Punktabstand"};
   lbl.childNodes[0].nodeValue=(names[patt]||"");
   lbl.style.display=patt==="blank"?"none":"grid";
 }
 if($("#pageSpacingValue"))$("#pageSpacingValue").textContent=s.spacing||24;
 if($("#pageColorInput"))$("#pageColorInput").value=s.color||"#ffffff";
 if($("#pagePatternSelect"))$("#pagePatternSelect").value=s.pattern||"blank";
 if($("#pageSpacingInput"))$("#pageSpacingInput").value=s.spacing||24;
 if($("#pageMarginInput"))$("#pageMarginInput").value=s.margin??55;
}
function applyCanvasPageStyle(){
 const page=$("#canvasPage");if(!page)return;
 page.setAttribute("style",`${page.getAttribute("style")||""};${pagePatternCSS()}`);
 const margin=Math.max(0,Number(canvasState.pageStyle?.margin)||0);
 page.style.setProperty("--page-margin",margin+"px");
 page.classList.toggle("showPageMargins",margin>0&&canvasState.pageStyle?.showMargin!==false);
 updatePageStyleControls();
}


function shouldAutoFitCanvas(){
 return window.matchMedia("(max-width: 899px)").matches;
}

function fitCanvasToScreen(){
 const wrap=$("#canvasStageWrap")||$("#canvasViewport")||document.querySelector(".canvasViewport");
 const page=$("#canvasPage");
 if(!wrap||!page)return;
 const W=canvasPageWidth(),H=canvasPageHeight();
 const availW=Math.max(260,wrap.clientWidth-70),availH=Math.max(320,wrap.clientHeight-70);
 const scale=Math.min(availW/W,availH/H,1);
 canvasZoom=Math.max(.28,scale);
 page.style.transform=`scale(${canvasZoom})`;
 page.style.transformOrigin="top center";
 const stage=$("#canvasStage");if(stage){stage.style.width=(W*canvasZoom)+"px";stage.style.height=(H*canvasZoom)+"px"}
 updateCanvasZoomLabel?.();
}
window.fitCanvasToScreen=fitCanvasToScreen;

window.setCanvasPageStyle=function(prop,value){
 canvasState.pageStyle=canvasState.pageStyle||{color:"#ffffff",pattern:"blank",spacing:24,margin:55};
 if(prop==="spacing")value=Math.max(10,Math.min(60,Number(value)||24));
 if(prop==="margin")value=Math.max(0,Math.min(160,Number(value)||0));
 canvasState.pageStyle[prop]=value;
 applyCanvasPageStyle();markCanvasDirty();pushHistory();
}
window.alignSelectedToPageMargin=function(side){
 if(canvasState.selectedType!=="object")return;
 const ids=selectedObjectIds(),m=Math.max(0,Number(canvasState.pageStyle?.margin)||0),W=canvasPageWidth();
 canvasState.objects.filter(o=>ids.includes(o.id)).forEach(o=>o.x=side==="right"?Math.max(m,W-m-o.w):m);
 renderCanvasObjects();renderCanvasInspector();markCanvasDirty();pushHistory();cuteToast("Am Seitenrand ausgerichtet ♡");
}
window.fitSelectedToPageMargins=function(){
 if(canvasState.selectedType!=="object")return;
 const ids=selectedObjectIds(),m=Math.max(0,Number(canvasState.pageStyle?.margin)||0),W=canvasPageWidth();
 canvasState.objects.filter(o=>ids.includes(o.id)).forEach(o=>{o.x=m;o.w=Math.max(40,W-2*m)});
 renderCanvasObjects();renderCanvasInspector();markCanvasDirty();pushHistory();cuteToast("Breite am Seitenrand ausgerichtet ♡");
}

function applyCanvasPageSize(){
 const W=canvasPageWidth(),H=canvasPageHeight();
 const stage=$("#canvasStage"),page=$("#canvasPage"),svg=$("#canvasSvg"),objs=$("#canvasObjects"),guides=$("#canvasGuides");
 [stage,page,svg,objs,guides].forEach(el=>{if(el){el.style.width=W+"px";el.style.height=H+"px"}});
 if(stage){stage.style.width=W+"px";stage.style.height=H+"px"}
 if(svg)svg.setAttribute("viewBox",`0 0 ${W} ${H}`);
 updateOrientationButtons();applyCanvasPageStyle();
 if(shouldAutoFitCanvas() || !canvasState.userZoomTouched) setTimeout(()=>fitCanvasToScreen(),0);
}

window.setCanvasZoom=function(value){
 canvasState.userZoomTouched=true;
 const stage=$("#canvasStage"),viewport=$("#canvasViewport");
 if(!stage||!viewport)return;
 const z=Math.max(.3,Math.min(2,Number(value)||1));
 canvasZoom=z;
 stage.dataset.scale=String(z);
 stage.style.zoom=String(z);
 stage.style.transform="none";

 const label=$("#canvasZoomLabel");
 if(label)label.textContent=Math.round(z*100)+"%";

 const select=$("#canvasZoomSelect");
 if(select){
   const choices=[.5,.75,1,1.25,1.5];
   const closest=choices.reduce((a,b)=>Math.abs(b-z)<Math.abs(a-z)?b:a,1);
   if(Math.abs(closest-z)<.035)select.value=String(closest);
 }
}
window.canvasZoomBy=function(delta){setCanvasZoom(canvasZoom+Number(delta||0))}
window.fitCanvasStage=function(){
 const viewport=$("#canvasViewport"),stage=$("#canvasStage");
 if(!viewport||!stage)return;
 const available=Math.max(230,viewport.clientWidth-18);
 setCanvasZoom(Math.min(1,available/canvasPageWidth()));
 viewport.scrollLeft=0;viewport.scrollTop=0;
}
function canvasPoint(e){const stage=$("#canvasStage"),r=stage.getBoundingClientRect(),sc=Number(stage.dataset.scale||canvasZoom||1);return{x:(e.clientX-r.left)/sc,y:(e.clientY-r.top)/sc}}
function startDragObject(e,oid){
 const o=canvasState.objects.find(x=>x.id===oid);if(!o||o.locked)return;const p=canvasPoint(e),ox=o.x,oy=o.y;
 const move=ev=>{const q=canvasPoint(ev),rawX=Math.max(0,Math.min(canvasPageWidth()-o.w,ox+q.x-p.x)),rawY=Math.max(0,Math.min(canvasPageHeight()-o.h,oy+q.y-p.y)),sn=snapObjectPosition(o,rawX,rawY);o.x=sn.x;o.y=sn.y;const el=document.querySelector(`.cobj[data-id="${oid}"]`);if(el){el.style.left=o.x+"px";el.style.top=o.y+"px"}markCanvasDirty(false)};
 const up=()=>{clearGuides();window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);pushHistory()};window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
}

function startRotateObject(e,oid){
 const o=canvasState.objects.find(x=>x.id===oid);if(!o||o.locked)return;const center={x:o.x+o.w/2,y:o.y+o.h/2},start=canvasPoint(e),startAngle=Math.atan2(start.y-center.y,start.x-center.x),base=o.rotation||0;
 const move=ev=>{const q=canvasPoint(ev),ang=Math.atan2(q.y-center.y,q.x-center.x);o.rotation=base+(ang-startAngle)*180/Math.PI;const el=document.querySelector(`.cobj[data-id="${oid}"]`);if(el)el.style.transform=`rotate(${o.rotation}deg)`;markCanvasDirty(false)};
 const up=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);pushHistory()};window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
}

function startResizeObject(e,oid){
 const o=canvasState.objects.find(x=>x.id===oid);if(!o||o.locked)return;const p=canvasPoint(e),ow=o.w,oh=o.h;
 const move=ev=>{const q=canvasPoint(ev);o.w=Math.max(40,ow+q.x-p.x);o.h=Math.max(30,oh+q.y-p.y);const el=document.querySelector(`.cobj[data-id="${oid}"]`);if(el){el.style.width=o.w+"px";el.style.height=o.h+"px"}markCanvasDirty(false)};
 const up=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);pushHistory();renderCanvasInspector()};window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
}
window.selectCanvasObject=function(oid){
 const o=canvasState.objects.find(x=>x.id===oid);
 if(o?.groupId&&!canvasState.multiMode){selectWholeGroup(o.groupId);return}
 const same=canvasState.selectedType==="object"&&canvasState.selectedId===oid&&canvasState.selectedIds.length===1;
 canvasState.selectedType="object";canvasState.selectedId=oid;canvasState.selectedIds=[oid];canvasState.selectedVectorIds=[];
 if(!same)renderCanvasObjects();
 renderVectors();renderCanvasInspector();renderLayerList();updateMultiSelectStatus();updateMobileSelectionTools();
 if(window.innerWidth<900&&mobileSelectedText())editorOpenGroup("textEdit",document.querySelector(".canvasQuickNav [data-group=textLibrary]"));
}
function renderCanvasInspector(){
 const el=$("#canvasInspector");if(!el)return;
 if(canvasState.multiMode&&((canvasState.selectedIds?.length||0)+(canvasState.selectedVectorIds?.length||0)>1)){
   const multiCount=(canvasState.selectedIds?.length||0)+(canvasState.selectedVectorIds?.length||0);
   el.innerHTML=`<div class="multiInspector"><b>${multiCount} Objekte ausgewählt</b><span>Ziehe eines der ausgewählten Objekte, um die Gruppe gemeinsam zu bewegen.</span><div class="alignRow"><button onclick="groupSelectedItems()">▣ Gruppieren</button><button onclick="ungroupSelectedItems()">▢ Lösen</button><button onclick="saveSelectionAsTextFormat()">＋ Textformat</button><button onclick="duplicateSelected()">⧉ Duplizieren</button><button onclick="toggleSelectedLock()">🔒 Sperren</button><button onclick="deleteSelectedCanvasItem()">⌫ Löschen</button></div></div>`;
   return;
 }
 if(canvasState.selectedType==="object"){
   const o=canvasState.objects.find(x=>x.id===canvasState.selectedId);if(!o){el.textContent="Keine Auswahl";return}
   if(["text","block","task","merke"].includes(o.kind)){
     const s=o.style||{};
     el.innerHTML=`<div class="editorHintStrong"><b>1× tippen:</b> auswählen/verschieben · <b>2× tippen:</b> Text bearbeiten.</div>
       ${o.formatId?`<div class="editRow"><span class="badge">${esc(canvasPresets().find(x=>x.id===o.formatId)?.name||"Textformat")}</span>${String(o.formatId).startsWith("custom-")?`<button class="miniIcon" title="Format bearbeiten" onclick="createCustomStylePreset('${o.formatId}')">✎</button>`:""}</div>`:""}
       <div class="inlineFormatBar" style="margin:8px 0">
         <button onclick="formatSelectedText('bold')"><b>B</b></button>
         <button onclick="formatSelectedText('italic')"><i>I</i></button>
         <button onclick="formatSelectedText('underline')"><u>U</u></button>
         <button onclick="formatSelectedText('insertUnorderedList')">• Liste</button>
         <button onclick="formatSelectedText('insertOrderedList')">1. Liste</button>
       </div>
       <div class="objectPanelGrid">
       <div><label>Schriftgröße</label><input id="insFontSize" type="number" min="8" max="72" value="${s.fontSize||16}" onchange="applyTextProperty('fontSize',+this.value)"></div>
       <div><label>Schriftfarbe</label><input id="insColor" type="color" value="${s.color||"#333333"}" onchange="applyTextProperty('color',this.value)"></div>
       <div><label>Schrift</label><select class="fontSelect" onchange="applyTextProperty('fontFamily',this.value)"><option value="Arial" ${String(s.fontFamily).includes("Arial")?"selected":""}>Arial</option><option value="Georgia" ${String(s.fontFamily).includes("Georgia")?"selected":""}>Georgia</option><option value="Trebuchet MS" ${String(s.fontFamily).includes("Trebuchet")?"selected":""}>Trebuchet</option><option value="Verdana" ${String(s.fontFamily).includes("Verdana")?"selected":""}>Verdana</option><option value="Times New Roman" ${String(s.fontFamily).includes("Times")?"selected":""}>Times</option><option value="Courier New" ${String(s.fontFamily).includes("Courier")?"selected":""}>Courier</option></select></div>
       <div><label>Ausrichtung</label><select onchange="updateObjStyle('textAlign',this.value)"><option value="left" ${s.textAlign==="left"?"selected":""}>Links</option><option value="center" ${s.textAlign==="center"?"selected":""}>Mitte</option><option value="right" ${s.textAlign==="right"?"selected":""}>Rechts</option></select></div>
       <div><label>Fett</label><select onchange="applyTextProperty('fontWeight',this.value)"><option value="400">Normal</option><option value="700" ${s.fontWeight=="700"?"selected":""}>Fett</option><option value="900" ${s.fontWeight=="900"?"selected":""}>Sehr fett</option></select></div>
       <div><label>Hintergrund</label><input type="color" value="${s.background&&s.background!=="transparent"?s.background:"#ffffff"}" onchange="updateObjStyle('background',this.value)"></div>
       <div><label>Kontur</label><input type="color" value="${s.borderColor&&s.borderColor!=="transparent"?s.borderColor:"#ffffff"}" onchange="updateObjStyle('borderColor',this.value)"></div>
       <div><label>Ecken</label><input type="number" min="0" max="80" value="${s.borderRadius||0}" onchange="updateObjStyle('borderRadius',+this.value)"></div>
       <div><label>Konturdicke</label><input type="number" min="0" max="15" value="${s.borderWidth||0}" onchange="updateObjStyle('borderWidth',+this.value)"></div>
     </div>
     <div class="positionGrid" style="margin-top:8px"><div><label>X</label><input type="number" value="${Math.round(o.x)}" onchange="setSelectedGeometry('x',+this.value)"></div><div><label>Y</label><input type="number" value="${Math.round(o.y)}" onchange="setSelectedGeometry('y',+this.value)"></div><div><label>W</label><input type="number" value="${Math.round(o.w)}" onchange="setSelectedGeometry('w',+this.value)"></div><div><label>H</label><input type="number" value="${Math.round(o.h)}" onchange="setSelectedGeometry('h',+this.value)"></div></div>
     <div class="alignRow" style="margin-top:8px"><button onclick="alignSelected('centerX')">↔ Mitte</button><button onclick="alignSelected('centerY')">↕ Mitte</button><button onclick="duplicateSelected()">⧉ Duplizieren</button></div>`;
   }else if(o.kind==="graph"){
     const count=(o.graph?.curves||[]).length;
     el.innerHTML=`<div class="graphInspector">
       <div class="editorHintStrong"><b>Mathematischer Graph</b> · ${count} ${count===1?"Funktion":"Funktionen"}</div>
       <button class="primary" onclick="openGraphDialog('${o.id}')">⌁ Graph bearbeiten</button>
       <div class="positionGrid" style="margin-top:8px">
         <div><label>X</label><input type="number" value="${Math.round(o.x)}" onchange="setSelectedGeometry('x',+this.value)"></div>
         <div><label>Y</label><input type="number" value="${Math.round(o.y)}" onchange="setSelectedGeometry('y',+this.value)"></div>
         <div><label>W</label><input type="number" value="${Math.round(o.w)}" onchange="setSelectedGeometry('w',+this.value)"></div>
         <div><label>H</label><input type="number" value="${Math.round(o.h)}" onchange="setSelectedGeometry('h',+this.value)"></div>
       </div>
     </div>`;
   }else if(o.kind==="formula"){
     el.innerHTML=`<div class="formulaInspector"><div class="editorHintStrong"><b>Mathematische Formel</b></div>
       <button class="primary" onclick="openFormulaDialog('${o.id}')">ƒx Formel bearbeiten</button>
       <div class="objectPanelGrid" style="margin-top:8px">
         <div><label>Textgröße</label><input type="number" min="14" max="80" value="${o.style?.fontSize||28}" onchange="updateFormulaStyle('fontSize',+this.value)"></div>
         <div><label>Farbe</label><input type="color" value="${o.style?.color||"#4f4642"}" onchange="updateFormulaStyle('color',this.value)"></div>
       </div></div>`;
   }else if(o.kind==="table"){
     el.innerHTML=`<div class="tableInspector">
       <div class="editorHintStrong"><b>${o.rows} × ${o.cols} Tabelle</b> · Zelle antippen und schreiben.</div>
       <div class="tableEditGrid">
        <button onclick="tableAddRow()">＋ Zeile</button><button onclick="tableRemoveRow()">− Zeile</button>
        <button onclick="tableAddCol()">＋ Spalte</button><button onclick="tableRemoveCol()">− Spalte</button>
       </div>
       <div class="objectPanelGrid" style="margin-top:8px">
        <div><label>Linienfarbe</label><input type="color" value="${o.borderColor||"#aaa7a2"}" onchange="updateSelectedTable('borderColor',this.value)"></div>
        <div><label>Linienstärke</label><input type="number" min="0" max="8" value="${o.borderWidth??1}" onchange="updateSelectedTable('borderWidth',+this.value)"></div>
        <div><label>Alle Zellen</label><input type="color" value="${o.cellBackground||"#ffffff"}" onchange="updateSelectedTable('cellBackground',this.value)"></div>
        <div><label>Aktive Zelle</label><input type="color" value="${o.cellColors?.[o.activeCell?.r||0]?.[o.activeCell?.c||0]||o.cellBackground||"#ffffff"}" onchange="updateSelectedTableCellColor(this.value)"></div>
        <div><label>Eckenradius</label><input type="number" min="0" max="60" value="${o.borderRadius??12}" onchange="updateSelectedTable('borderRadius',+this.value)"></div>
        <div><label>Textgröße</label><input type="number" min="12" max="40" value="${o.fontSize||16}" onchange="updateSelectedTable('fontSize',+this.value)"></div>
       </div>
       <div class="positionGrid" style="margin-top:8px">
        <div><label>X</label><input type="number" value="${Math.round(o.x)}" onchange="setSelectedGeometry('x',+this.value)"></div>
        <div><label>Y</label><input type="number" value="${Math.round(o.y)}" onchange="setSelectedGeometry('y',+this.value)"></div>
        <div><label>W</label><input type="number" value="${Math.round(o.w)}" onchange="setSelectedGeometry('w',+this.value)"></div>
        <div><label>H</label><input type="number" value="${Math.round(o.h)}" onchange="setSelectedGeometry('h',+this.value)"></div>
       </div>
     </div>`;
   }else if(o.kind==="paper"){
     el.innerHTML=`<div class="objectPanelGrid">
       <div><label>Breite</label><input type="number" value="${Math.round(o.w)}" onchange="setSelectedObjectSize('w',+this.value)"></div>
       <div><label>Höhe</label><input type="number" value="${Math.round(o.h)}" onchange="setSelectedObjectSize('h',+this.value)"></div>
       ${o.paperType!=="blank"?`<div><label>${o.paperType==="grid"?"Karo-Größe":"Linienabstand"}</label><input type="number" min="8" max="80" value="${o.spacing||20}" onchange="setPaperSpacing(+this.value)"></div>`:""}
       <div><label>Zettelfarbe</label><input type="color" value="${o.paperColor||"#fffdf7"}" onchange="setPaperColor(this.value)"></div>
     </div><div class="editorHint" style="margin-top:8px">Zettel frei ziehen und am Punkt unten rechts skalieren.</div>`;
   }else if(o.kind==="tape"){
     el.innerHTML=`<div class="objectPanelGrid"><div><label>Breite</label><input type="number" value="${Math.round(o.w)}" onchange="setSelectedObjectSize('w',+this.value)"></div><div><label>Höhe</label><input type="number" value="${Math.round(o.h)}" onchange="setSelectedObjectSize('h',+this.value)"></div><div><label>Farbe</label><input type="color" value="${o.color||"#f2beb2"}" onchange="setTapeColor(this.value)"></div><div><label>Drehung</label><input type="number" min="-45" max="45" value="${o.rotation||-5}" onchange="setTapeRotation(+this.value)"></div></div>`;
   }else el.innerHTML=`${o.kind==="image"?"Bild":"Sticker"} ausgewählt. Ziehen zum Verschieben, Punkt unten rechts zum Skalieren.`;
 }else if(canvasState.selectedType==="vector"){
   const v=canvasState.vectors.find(x=>x.id===canvasState.selectedId);if(!v){el.textContent="Keine Auswahl";return}
   el.innerHTML=`<div class="vectorControls">
     <div><label>Füllung</label><input type="color" value="${v.fill||"#f7d2cf"}" onchange="updateVectorStyle('fill',this.value)"></div>
     <div><label>Kontur</label><input type="color" value="${v.stroke||"#8d7369"}" onchange="updateVectorStyle('stroke',this.value)"></div>
     <div><label>Dicke</label><input type="number" min="0" max="30" value="${v.strokeWidth||2}" onchange="updateVectorStyle('strokeWidth',+this.value)"></div>
     <div><label>Drehung</label><input type="number" min="-180" max="180" value="${Math.round(v.rotation||0)}" onchange="updateVectorStyle('rotation',+this.value)"></div>
     ${v.type==="rect"?`<div><label>Ecken rund</label><input type="number" min="0" max="100" value="${v.rx||0}" onchange="updateVectorStyle('rx',+this.value)"></div>`:""}
     <div><label>Linie</label><select onchange="updateVectorStyle('dash',this.value)"><option value="solid">Durchgezogen</option><option value="dashed" ${v.dash==="dashed"?"selected":""}>Gestrichelt</option><option value="dotted" ${v.dash==="dotted"?"selected":""}>Gepunktet</option></select></div>
     <div class="full vectorToolbar"><button onclick="duplicateSelectedVector()">Duplizieren</button><button onclick="pathfinderSubtract()">Subtrahieren</button><button onclick="toggleNodeEdit()">Ankerpunkte</button><button class="vectorDeleteBtn" onclick="deleteSelectedCanvasItem()">⌫ Löschen</button></div>
   </div>`;
 }else el.textContent="Wähle ein Element aus.";
}


window.updateFormulaStyle=function(prop,value){
 if(canvasState.selectedType!=="object")return;
 const o=canvasState.objects.find(x=>x.id===canvasState.selectedId);if(!o||o.kind!=="formula")return;
 o.style=o.style||{};o.style[prop]=value;renderCanvasObjects();renderCanvasInspector();markCanvasDirty();pushHistory();
}

function selectedTable(){
 if(canvasState.selectedType!=="object")return null;
 const o=canvasState.objects.find(x=>x.id===canvasState.selectedId);
 return o?.kind==="table"?o:null;
}
window.updateSelectedTable=function(prop,value){
 const o=selectedTable();if(!o)return;o[prop]=value;
 renderCanvasObjects();renderCanvasInspector();markCanvasDirty();pushHistory();
}
window.updateSelectedTableCellColor=function(value){
 const o=selectedTable();if(!o)return;const r=Math.max(0,Math.min(o.rows-1,o.activeCell?.r||0)),c=Math.max(0,Math.min(o.cols-1,o.activeCell?.c||0));
 o.cellColors ||= Array.from({length:o.rows},()=>Array.from({length:o.cols},()=>""));
 while(o.cellColors.length<o.rows)o.cellColors.push(Array.from({length:o.cols},()=>""));
 o.cellColors.forEach(row=>{while(row.length<o.cols)row.push("")});o.cellColors[r][c]=value;
 renderCanvasObjects();renderCanvasInspector();markCanvasDirty();pushHistory();
}
window.tableAddRow=function(){
 const o=selectedTable();if(!o)return;o.cells.push(Array.from({length:o.cols},()=>""));o.cellColors ||= [];o.cellColors.push(Array.from({length:o.cols},()=>""));o.rows=o.cells.length;
 o.h=Math.max(o.h,o.rows*42);renderCanvasObjects();renderCanvasInspector();markCanvasDirty();pushHistory();
}
window.tableRemoveRow=function(){
 const o=selectedTable();if(!o||o.rows<=1)return;o.cells.pop();o.cellColors?.pop();o.rows=o.cells.length;o.activeCell={r:Math.min(o.activeCell?.r||0,o.rows-1),c:Math.min(o.activeCell?.c||0,o.cols-1)};
 renderCanvasObjects();renderCanvasInspector();markCanvasDirty();pushHistory();
}
window.tableAddCol=function(){
 const o=selectedTable();if(!o)return;o.cells.forEach(r=>r.push(""));o.cellColors ||= Array.from({length:o.rows},()=>[]);o.cellColors.forEach(r=>r.push(""));o.cols++;
 renderCanvasObjects();renderCanvasInspector();markCanvasDirty();pushHistory();
}
window.tableRemoveCol=function(){
 const o=selectedTable();if(!o||o.cols<=1)return;o.cells.forEach(r=>r.pop());o.cellColors?.forEach(r=>r.pop());o.cols--;o.activeCell={r:Math.min(o.activeCell?.r||0,o.rows-1),c:Math.min(o.activeCell?.c||0,o.cols-1)};
 renderCanvasObjects();renderCanvasInspector();markCanvasDirty();pushHistory();
}

window.formatSelectedText=function(cmd){
 const el=$(`.cobj[data-id="${canvasState.selectedId}"]`);
 if(!el||!el.isContentEditable)return;
 el.focus();document.execCommand(cmd,false,null);
 const o=canvasState.objects.find(x=>x.id===canvasState.selectedId);if(o)o.text=el.innerHTML;
 markCanvasDirty();
}
window.applyTextProperty=function(prop,value){
 const el=$(`.cobj[data-id="${canvasState.selectedId}"]`);
 if(!el)return;
 const sel=window.getSelection();
 const hasSelection=sel&&sel.rangeCount&& !sel.getRangeAt(0).collapsed && el.contains(sel.anchorNode);
 if(hasSelection){
   el.focus();
   if(prop==="color")document.execCommand("foreColor",false,value);
   else if(prop==="fontFamily")document.execCommand("fontName",false,value);
   else if(prop==="fontWeight"&&String(value)!=="400")document.execCommand("bold",false,null);
   else if(prop==="fontSize"){
     document.execCommand("fontSize",false,"7");
     el.querySelectorAll('font[size="7"]').forEach(n=>{n.removeAttribute("size");n.style.fontSize=value+"px"});
   }
 }else{
   updateObjStyle(prop,value);
 }
 const o=canvasState.objects.find(x=>x.id===canvasState.selectedId);if(o)o.text=el.innerHTML;
 markCanvasDirty();
}
window.setSelectedObjectSize=function(k,v){const o=canvasState.objects.find(x=>x.id===canvasState.selectedId);if(!o)return;o[k]=Math.max(20,v||20);renderCanvasObjects();renderCanvasInspector();markCanvasDirty()}
window.setPaperColor=function(v){const o=canvasState.objects.find(x=>x.id===canvasState.selectedId);if(!o)return;o.paperColor=v;renderCanvasObjects();renderCanvasInspector();markCanvasDirty()}
window.setPaperSpacing=function(v){const o=canvasState.objects.find(x=>x.id===canvasState.selectedId);if(!o)return;o.spacing=Math.max(8,Math.min(80,v||20));renderCanvasObjects();renderCanvasInspector();markCanvasDirty()}
window.setTapeColor=function(v){const o=canvasState.objects.find(x=>x.id===canvasState.selectedId);if(!o)return;o.color=v;renderCanvasObjects();renderCanvasInspector();markCanvasDirty()}
window.setTapeRotation=function(v){const o=canvasState.objects.find(x=>x.id===canvasState.selectedId);if(!o)return;o.rotation=Math.max(-45,Math.min(45,v||0));renderCanvasObjects();renderCanvasInspector();markCanvasDirty()}

window.updateObjStyle=function(k,v){const o=canvasState.objects.find(x=>x.id===canvasState.selectedId);if(!o)return;o.style||={};o.style[k]=v;renderCanvasObjects();markCanvasDirty()}


function updateMultiSelectStatus(){
 const el=$("#multiSelectStatus");if(!el)return;
 if(!canvasState.multiMode){
   el.classList.remove("show");el.innerHTML="";return;
 }
 const n=(canvasState.selectedIds?.length||0)+(canvasState.selectedVectorIds?.length||0);
 el.classList.add("show");
 el.innerHTML=`<span>☑ Mehrfachauswahl</span><b>${n} ausgewählt</b><button onclick="saveSelectionAsTextFormat()" ${n?"":"disabled"}>Als Textformat ＋</button><button onclick="toggleMultiSelectMode()">Fertig</button>`;
}


function makeGroupId(){return "grp-"+Date.now()+"-"+Math.random().toString(36).slice(2,7)}
function getGroupMembers(groupId){
 return {
   objects:canvasState.objects.filter(o=>o.groupId===groupId),
   vectors:canvasState.vectors.filter(v=>v.groupId===groupId)
 };
}
function selectWholeGroup(groupId){
 if(!groupId)return false;
 const g=getGroupMembers(groupId);
 if(!g.objects.length&&!g.vectors.length)return false;
 canvasState.selectedIds=g.objects.map(o=>o.id);
 canvasState.selectedVectorIds=g.vectors.map(v=>v.id);
 canvasState.selectedType=g.objects.length?"object":"vector";
 canvasState.selectedId=(g.objects.at(-1)?.id||g.vectors.at(-1)?.id||null);
 renderCanvasObjects();renderVectors();renderCanvasInspector();renderLayerList();updateMultiSelectStatus();
 return true;
}
window.groupSelectedItems=function(silent=false){
 const ids=selectedObjectIds(),vids=selectedVectorIds();
 if(ids.length+vids.length<2){
   if(!silent)openModal(`<div class="compactPresetModal"><h2>Mindestens 2 Elemente</h2><p class="small">Wähle mehrere Texte, Formen, Pfade, Sticker oder andere Elemente aus und gruppiere sie dann.</p><button class="primary" onclick="closeModal()">OK</button></div>`);
   return null;
 }
 const gid=makeGroupId();
 canvasState.objects.filter(o=>ids.includes(o.id)).forEach(o=>o.groupId=gid);
 canvasState.vectors.filter(v=>vids.includes(v.id)).forEach(v=>v.groupId=gid);
 canvasState.selectedIds=ids;canvasState.selectedVectorIds=vids;
 if(!silent){renderCanvasObjects();renderVectors();renderCanvasInspector();renderLayerList();markCanvasDirty();pushHistory();cuteToast("Gruppiert ♡")}
 return gid;
}
window.ungroupSelectedItems=function(){
 const ids=selectedObjectIds(),vids=selectedVectorIds();
 const gids=new Set([
   ...canvasState.objects.filter(o=>ids.includes(o.id)&&o.groupId).map(o=>o.groupId),
   ...canvasState.vectors.filter(v=>vids.includes(v.id)&&v.groupId).map(v=>v.groupId)
 ]);
 if(!gids.size)return;
 canvasState.objects.filter(o=>gids.has(o.groupId)).forEach(o=>delete o.groupId);
 canvasState.vectors.filter(v=>gids.has(v.groupId)).forEach(v=>delete v.groupId);
 renderCanvasObjects();renderVectors();renderCanvasInspector();renderLayerList();markCanvasDirty();pushHistory();cuteToast("Gruppierung gelöst");
}
function startDragSelection(e){
 const ids=selectedObjectIds(),vids=selectedVectorIds();
 const objects=canvasState.objects.filter(o=>ids.includes(o.id)&&!o.locked);
 const vectors=canvasState.vectors.filter(v=>vids.includes(v.id)&&!v.locked);
 if(!objects.length&&!vectors.length)return;
 const p=canvasPoint(e);
 const oStarts=objects.map(o=>({o,x:o.x,y:o.y}));
 const vStarts=vectors.map(v=>({v,data:JSON.parse(JSON.stringify(v))}));
 const move=ev=>{
   const q=canvasPoint(ev),dx=q.x-p.x,dy=q.y-p.y,W=canvasPageWidth(),H=canvasPageHeight();
   oStarts.forEach(({o,x,y})=>{
     o.x=Math.max(0,Math.min(W-o.w,x+dx));o.y=Math.max(0,Math.min(H-o.h,y+dy));
   });
   vStarts.forEach(({v,data})=>{
     if(v.type==="rect"){v.x=data.x+dx;v.y=data.y+dy}
     else if(v.type==="ellipse"){v.cx=data.cx+dx;v.cy=data.cy+dy}
     else if(v.points)v.points=data.points.map(pt=>[pt[0]+dx,pt[1]+dy]);
   });
   renderCanvasObjects();renderVectors();markCanvasDirty(false);
 };
 const up=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);pushHistory()};
 window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
}

function selectedVectorIds(){
 if(canvasState.selectedVectorIds?.length)return [...canvasState.selectedVectorIds];
 return canvasState.selectedType==="vector"&&canvasState.selectedId?[canvasState.selectedId]:[];
}

function selectedObjectIds(){
 if(canvasState.selectedIds?.length)return [...canvasState.selectedIds];
 return canvasState.selectedType==="object"&&canvasState.selectedId?[canvasState.selectedId]:[];
}
window.toggleMultiSelectMode=function(){
 canvasState.multiMode=!canvasState.multiMode;
 if(!canvasState.multiMode && canvasState.selectedIds.length>1){
   if(canvasState.selectedIds.length){
     canvasState.selectedIds=[canvasState.selectedIds[canvasState.selectedIds.length-1]];
     canvasState.selectedVectorIds=[];
     canvasState.selectedId=canvasState.selectedIds[0]||null;canvasState.selectedType="object";
   }else if(canvasState.selectedVectorIds.length){
     canvasState.selectedVectorIds=[canvasState.selectedVectorIds[canvasState.selectedVectorIds.length-1]];
     canvasState.selectedId=canvasState.selectedVectorIds[0]||null;canvasState.selectedType="vector";
   }
 }
 renderCanvasObjects();renderCanvasInspector();updateMultiSelectStatus();
 const btn=[...document.querySelectorAll("#canvasQuickDrawer button")].find(b=>/Mehrfach/.test(b.textContent));
 if(btn)btn.querySelector("span").textContent=canvasState.multiMode?"Mehrfach aus":"Mehrfachauswahl";
}
function toggleObjectInMultiSelection(oid){
 const i=canvasState.selectedIds.indexOf(oid);
 if(i>=0)canvasState.selectedIds.splice(i,1);else canvasState.selectedIds.push(oid);
 canvasState.selectedType=canvasState.selectedIds.length?"object":null;
 canvasState.selectedId=canvasState.selectedIds.at(-1)||null;
 renderCanvasObjects();renderCanvasInspector();renderLayerList();updateMultiSelectStatus();
}

function toggleVectorInMultiSelection(vid){
 const i=canvasState.selectedVectorIds.indexOf(vid);
 if(i>=0)canvasState.selectedVectorIds.splice(i,1);else canvasState.selectedVectorIds.push(vid);
 if(canvasState.selectedVectorIds.length){canvasState.selectedType="vector";canvasState.selectedId=canvasState.selectedVectorIds.at(-1)}
 else if(canvasState.selectedIds.length){canvasState.selectedType="object";canvasState.selectedId=canvasState.selectedIds.at(-1)}
 else{canvasState.selectedType=null;canvasState.selectedId=null}
 renderVectors();renderCanvasObjects();renderCanvasInspector();renderLayerList();updateMultiSelectStatus();
}

function startDragSelectedObjects(e,oid){
 const ids=selectedObjectIds();
 const items=canvasState.objects.filter(o=>ids.includes(o.id)&&!o.locked);
 if(!items.length)return;
 const p=canvasPoint(e),starts=items.map(o=>({o,x:o.x,y:o.y}));
 const move=ev=>{
   const q=canvasPoint(ev),dx=q.x-p.x,dy=q.y-p.y,W=canvasPageWidth(),H=canvasPageHeight();
   starts.forEach(({o,x,y})=>{
     o.x=Math.max(0,Math.min(W-o.w,x+dx));o.y=Math.max(0,Math.min(H-o.h,y+dy));
     const el=document.querySelector(`.cobj[data-id="${o.id}"]`);
     if(el){el.style.left=o.x+"px";el.style.top=o.y+"px"}
   });markCanvasDirty(false);
 };
 const up=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);pushHistory()};
 window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
}


window.deleteLayerItem=function(kind,itemId){
 const item=kind==="vector"?canvasState.vectors.find(x=>x.id===itemId):canvasState.objects.find(x=>x.id===itemId);
 if(!item)return;
 const label=kind==="vector"?(item.type==="path"?"Pfad":"Form"):(layerName(item)||"Element");
 confirmDanger({title:`${label} löschen?`,text:"Möchtest du dieses Element wirklich löschen?",confirmText:"Löschen",onConfirm:`performDeleteLayerItem('${kind}','${itemId}')`});
}
window.performDeleteLayerItem=function(kind,itemId){
 if(kind==="vector")canvasState.vectors=canvasState.vectors.filter(x=>x.id!==itemId);
 else canvasState.objects=canvasState.objects.filter(x=>x.id!==itemId);
 canvasState.selectedIds=(canvasState.selectedIds||[]).filter(x=>x!==itemId);
 canvasState.selectedVectorIds=(canvasState.selectedVectorIds||[]).filter(x=>x!==itemId);
 if(canvasState.selectedId===itemId){canvasState.selectedId=null;canvasState.selectedType=null}
 closeModal();renderCanvasObjects();renderVectors();renderCanvasInspector();renderLayerList();updateMultiSelectStatus();markCanvasDirty();pushHistory();cuteToast("Gelöscht");
}

window.deleteSelectedCanvasItem=function(){
 const objIds=selectedObjectIds(),vecIds=selectedVectorIds();
 const total=objIds.length+vecIds.length+(canvasState.selectedType==="vector"&&!vecIds.length?1:0);
 if(!total)return;
 const label=total===1?"dieses Element":`${total} Elemente`;
 confirmDanger({title:"Element löschen?",text:`Möchtest du ${label} wirklich löschen?`,confirmText:"Löschen",onConfirm:"performDeleteSelectedCanvasItem()"});
}
window.performDeleteSelectedCanvasItem=function(){
 const ids=selectedObjectIds(),vids=selectedVectorIds();
 if(ids.length)canvasState.objects=canvasState.objects.filter(x=>!ids.includes(x.id));
 if(vids.length)canvasState.vectors=canvasState.vectors.filter(x=>!vids.includes(x.id));
 else if(canvasState.selectedType==="vector"&&canvasState.selectedId)canvasState.vectors=canvasState.vectors.filter(x=>x.id!==canvasState.selectedId);
 canvasState.selectedType=null;canvasState.selectedId=null;canvasState.selectedIds=[];canvasState.selectedVectorIds=[];
 closeModal();renderCanvasObjects();renderVectors();renderCanvasInspector();renderLayerList();updateMultiSelectStatus();markCanvasDirty();pushHistory();
}


let marqueeSelectState=null;
function startMarqueeSelection(e){if(window.__STUDIA_V190_SELECTION_OWNER)return;
 if(window.innerWidth<900||e.button!==0||canvasState.vectorTool==="pen")return false;
 const stage=$("#canvasStage");if(!stage)return false;
 const start=canvasPoint(e);
 const box=document.createElement("div");box.className="marqueeSelectBox";stage.appendChild(box);
 marqueeSelectState={start,box,add:e.shiftKey};
 const move=ev=>{
   const q=canvasPoint(ev),x=Math.min(start.x,q.x),y=Math.min(start.y,q.y),w=Math.abs(q.x-start.x),hh=Math.abs(q.y-start.y);
   Object.assign(box.style,{left:x+"px",top:y+"px",width:w+"px",height:hh+"px"});
 };
 const up=ev=>{
   window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);
   const q=canvasPoint(ev),rx=Math.min(start.x,q.x),ry=Math.min(start.y,q.y),rw=Math.abs(q.x-start.x),rh=Math.abs(q.y-start.y);
   box.remove();marqueeSelectState=null;
   if(rw<5&&rh<5){if(!e.shiftKey)clearCanvasSelection();return}
   const hit=(x,y,w,hh)=>x<rx+rw&&x+w>rx&&y<ry+rh&&y+hh>ry;
   const obj=canvasState.objects.filter(o=>hit(o.x,o.y,o.w,o.h)).map(o=>o.id);
   const vec=canvasState.vectors.filter(v=>{const b=vectorBounds(v);return hit(b.x,b.y,b.w,b.h)}).map(v=>v.id);
   canvasState.selectedIds=e.shiftKey?[...new Set([...(canvasState.selectedIds||[]),...obj])]:obj;
   canvasState.selectedVectorIds=e.shiftKey?[...new Set([...(canvasState.selectedVectorIds||[]),...vec])]:vec;
   canvasState.selectedType=canvasState.selectedIds.length?"object":canvasState.selectedVectorIds.length?"vector":null;
   canvasState.selectedId=canvasState.selectedIds.at(-1)||canvasState.selectedVectorIds.at(-1)||null;
   canvasState.multiMode=(canvasState.selectedIds.length+canvasState.selectedVectorIds.length)>1;
   renderCanvasObjects();renderVectors();renderCanvasInspector();renderLayerList();updateMultiSelectStatus();
 };
 window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
 return true;
}

$("#canvasPage")?.addEventListener("pointerdown",e=>{if(e.target!==e.currentTarget)return;clearCanvasSelection()});
$("#canvasStage")?.addEventListener("pointerdown",e=>{
 if(canvasState.vectorTool==="pen")return;
 if(e.target.closest?.(".cobj,.vectorTouchProxy,.vectorHandle,.pathNode"))return;
 if(window.innerWidth>=900 && (e.target.id==="canvasStage"||e.target.id==="canvasPage"||e.target.id==="canvasObjects")){e.preventDefault();startMarqueeSelection(e);return}
 if(e.target.id==="canvasStage"||e.target.id==="canvasPage"||e.target.id==="canvasObjects")clearCanvasSelection();
});

function clearCanvasSelection(){canvasState.objects.forEach(x=>x.editing=false);canvasState.selectedType=null;canvasState.selectedId=null;canvasState.selectedIds=[];canvasState.selectedVectorIds=[];renderCanvasObjects();renderVectors();renderCanvasInspector();renderLayerList();updateMultiSelectStatus();updateMobileSelectionTools()}



window.setSelectedGeometry=function(k,v){if(canvasState.selectedType!=="object")return;const o=canvasState.objects.find(x=>x.id===canvasState.selectedId);if(!o)return;if(k==="w"||k==="h")o[k]=Math.max(20,v);else o[k]=v;renderCanvasObjects();renderCanvasInspector();pushHistory()}
window.alignSelected=function(mode){if(canvasState.selectedType==="object"){const o=canvasState.objects.find(x=>x.id===canvasState.selectedId);if(!o)return;if(mode==="centerX")o.x=(canvasPageWidth()-o.w)/2;if(mode==="centerY")o.y=(canvasPageHeight()-o.h)/2;renderCanvasObjects()}else if(canvasState.selectedType==="vector"){const v=canvasState.vectors.find(x=>x.id===canvasState.selectedId);if(!v)return;const b=vectorBounds(v),dx=mode==="centerX"?397-b.cx:0,dy=mode==="centerY"?561.5-b.cy:0;if(v.type==="rect"){v.x+=dx;v.y+=dy}else if(v.type==="ellipse"){v.cx+=dx;v.cy+=dy}else if(v.points)v.points=v.points.map(p=>[p[0]+dx,p[1]+dy]);renderVectors()}pushHistory()}
window.duplicateSelected=function(){if(canvasState.selectedType==="object"){const ids=selectedObjectIds();if(!ids.length)return;const newIds=[];for(const oid of ids){const o=canvasState.objects.find(x=>x.id===oid);if(!o)continue;const n=JSON.parse(JSON.stringify(o));n.id=id();n.x+=18;n.y+=18;n.z=nextCanvasZ();n.locked=false;n.editing=false;canvasState.objects.push(n);newIds.push(n.id)}canvasState.selectedIds=newIds;canvasState.selectedId=newIds.at(-1)||null;canvasState.selectedType=newIds.length?"object":null;renderCanvasObjects();renderCanvasInspector()}else if(canvasState.selectedType==="vector"){const v=canvasState.vectors.find(x=>x.id===canvasState.selectedId);if(!v)return;const n=JSON.parse(JSON.stringify(v));n.id=id();n.z=nextCanvasZ();n.locked=false;if(n.x!=null){n.x+=18;n.y+=18}if(n.cx!=null){n.cx+=18;n.cy+=18}if(n.points)n.points=n.points.map(p=>[p[0]+18,p[1]+18]);canvasState.vectors.push(n);selectVector(n.id)}pushHistory()}


let canvasInternalClipboard=null;
window.copySelectedCanvasItems=function(){
 const ids=selectedObjectIds(),vids=selectedVectorIds();
 canvasInternalClipboard={objects:canvasState.objects.filter(x=>ids.includes(x.id)).map(x=>JSON.parse(JSON.stringify(x))),vectors:canvasState.vectors.filter(x=>vids.includes(x.id)).map(x=>JSON.parse(JSON.stringify(x)))};
 if((canvasInternalClipboard.objects.length+canvasInternalClipboard.vectors.length)>0)cuteToast("Kopiert ♡");
}
window.pasteCanvasItems=function(){
 if(!canvasInternalClipboard)return;
 const newIds=[],newVids=[];let z=nextCanvasZ();
 for(const src of canvasInternalClipboard.objects||[]){const o=JSON.parse(JSON.stringify(src));o.id=id();o.x+=20;o.y+=20;o.z=z++;o.locked=false;o.editing=false;delete o.groupId;canvasState.objects.push(o);newIds.push(o.id)}
 for(const src of canvasInternalClipboard.vectors||[]){const v=JSON.parse(JSON.stringify(src));v.id=id();v.z=z++;delete v.groupId;if(v.x!=null){v.x+=20;v.y+=20}if(v.cx!=null){v.cx+=20;v.cy+=20}if(v.points)v.points=v.points.map(p=>[p[0]+20,p[1]+20]);canvasState.vectors.push(v);newVids.push(v.id)}
 canvasState.selectedIds=newIds;canvasState.selectedVectorIds=newVids;canvasState.selectedType=newIds.length?"object":newVids.length?"vector":null;canvasState.selectedId=newIds.at(-1)||newVids.at(-1)||null;
 renderCanvasObjects();renderVectors();renderCanvasInspector();updateMultiSelectStatus();pushHistory();cuteToast("Eingefügt ♡");
}
window.selectAllCanvasItems=function(){
 canvasState.selectedIds=canvasState.objects.map(x=>x.id);canvasState.selectedVectorIds=canvasState.vectors.map(x=>x.id);canvasState.selectedType=canvasState.selectedIds.length?"object":canvasState.selectedVectorIds.length?"vector":null;canvasState.selectedId=canvasState.selectedIds.at(-1)||canvasState.selectedVectorIds.at(-1)||null;canvasState.multiMode=true;
 renderCanvasObjects();renderVectors();renderCanvasInspector();updateMultiSelectStatus();
}
function nudgeSelection(dx,dy){
 const ids=selectedObjectIds(),vids=selectedVectorIds();
 canvasState.objects.filter(x=>ids.includes(x.id)&&!x.locked).forEach(o=>{o.x=Math.max(0,Math.min(canvasPageWidth()-o.w,o.x+dx));o.y=Math.max(0,Math.min(canvasPageHeight()-o.h,o.y+dy))});
 canvasState.vectors.filter(x=>vids.includes(x.id)&&!x.locked).forEach(v=>{if(v.x!=null){v.x+=dx;v.y+=dy}else if(v.cx!=null){v.cx+=dx;v.cy+=dy}else if(v.points)v.points=v.points.map(p=>[p[0]+dx,p[1]+dy])});
 renderCanvasObjects();renderVectors();markCanvasDirty(false);
}
window.openShortcutHelp=function(){
 openModal(`<div class="shortcutModal"><div class="presetModalHead"><div><span class="eyebrow">DESKTOP</span><h2>Tastenkürzel</h2></div><button class="miniIcon" onclick="closeModal()">×</button></div>
 <div class="shortcutGrid">
  <span><kbd>Ctrl/⌘ Z</kbd> Rückgängig</span><span><kbd>Ctrl/⌘ Y</kbd> Wiederholen</span>
  <span><kbd>Ctrl/⌘ C</kbd> Kopieren</span><span><kbd>Ctrl/⌘ V</kbd> Einfügen</span>
  <span><kbd>Ctrl/⌘ D</kbd> Duplizieren</span><span><kbd>Ctrl/⌘ A</kbd> Alles auswählen</span>
  <span><kbd>Ctrl/⌘ G</kbd> Gruppieren</span><span><kbd>Ctrl/⌘ ⇧ G</kbd> Gruppe lösen</span>
  <span><kbd>Delete</kbd> Löschen mit Warnung</span><span><kbd>Shift + Klick</kbd> Mehrfachauswahl</span>
  <span><kbd>Ziehen</kbd> Auswahlrahmen</span><span><kbd>Pfeiltasten</kbd> 1 px bewegen</span>
  <span><kbd>Shift + Pfeil</kbd> 10 px bewegen</span><span><kbd>Ctrl/⌘ 0</kbd> An Bildschirm</span>
  <span><kbd>Ctrl/⌘ S</kbd> Speichern</span><span><kbd>?</kbd> Diese Übersicht</span>
 </div></div>`);
}
document.addEventListener("keydown",e=>{
 if(window.innerWidth<900||!document.body.classList.contains("editorMode"))return;
 const active=document.activeElement,isTyping=active&&(active.matches("input,textarea,select")||active.isContentEditable);
 const mod=e.ctrlKey||e.metaKey,key=e.key.toLowerCase();
 if(isTyping && !(mod&&["s","z","y"].includes(key)))return;
 if(mod&&key==="z"){e.preventDefault();undoCanvas();return}
 if(mod&&(key==="y"||(key==="z"&&e.shiftKey))){e.preventDefault();redoCanvas();return}
 if(mod&&key==="c"){e.preventDefault();copySelectedCanvasItems();return}
 if(mod&&key==="v"){e.preventDefault();pasteCanvasItems();return}
 if(mod&&key==="d"){e.preventDefault();duplicateSelected();return}
 if(mod&&key==="a"){e.preventDefault();selectAllCanvasItems();return}
 if(mod&&key==="g"&&!e.shiftKey){e.preventDefault();groupSelectedItems();return}
 if(mod&&key==="g"&&e.shiftKey){e.preventDefault();ungroupSelectedItems();return}
 if(mod&&key==="0"){e.preventDefault();fitCanvasStage();return}
 if(mod&&key==="s"){e.preventDefault();saveSheetNow?.();cuteToast("Gespeichert ✓");return}
 if((e.key==="Delete"||e.key==="Backspace")&&!isTyping){e.preventDefault();deleteSelectedCanvasItem();return}
 if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)&&!isTyping){
   e.preventDefault();const n=e.shiftKey?10:1;nudgeSelection(e.key==="ArrowLeft"?-n:e.key==="ArrowRight"?n:0,e.key==="ArrowUp"?-n:e.key==="ArrowDown"?n:0);return;
 }
 if(e.key==="?"&&!isTyping){e.preventDefault();openShortcutHelp()}
});

window.toggleSelectedLock=function(){
 const ids=selectedObjectIds(),vids=selectedVectorIds();
 if(ids.length||vids.length){
  const items=[...canvasState.objects.filter(x=>ids.includes(x.id)),...canvasState.vectors.filter(x=>vids.includes(x.id))];
  if(!items.length)return;const shouldLock=items.some(x=>!x.locked);items.forEach(x=>x.locked=shouldLock);
 }
 renderCanvasObjects();renderVectors();renderCanvasInspector();markCanvasDirty();
}
window.moveSelectedLayer=function(dir){
 const ids=selectedObjectIds(),vids=selectedVectorIds();
 if(ids.length+vids.length>1){const step=dir>0?1000:-1000;canvasState.objects.filter(x=>ids.includes(x.id)).forEach(x=>x.z=(x.z||0)+step);canvasState.vectors.filter(x=>vids.includes(x.id)).forEach(x=>x.z=(x.z||0)+step);renderCanvasObjects();renderVectors();renderLayerList();markCanvasDirty();pushHistory();return}
 const all=[...canvasState.objects.map(x=>({kind:"object",x})),...canvasState.vectors.map(x=>({kind:"vector",x}))].sort((a,b)=>(a.x.z||0)-(b.x.z||0));
 const idx=all.findIndex(a=>a.kind===canvasState.selectedType&&a.x.id===canvasState.selectedId);if(idx<0)return;
 const ni=Math.max(0,Math.min(all.length-1,idx+dir));if(ni===idx)return;
 const targetZ=all[ni].x.z||0,currentZ=all[idx].x.z||0;all[ni].x.z=currentZ;all[idx].x.z=targetZ;
 renderCanvasObjects();renderVectors();renderLayerList();markCanvasDirty();
}
window.addVectorShape=function(type){
 let v={id:id(),z:nextCanvasZ(),type,fill:"#f7d2cf",stroke:"#8d7369",strokeWidth:2,dash:"solid",rotation:0,locked:false};
 if(type==="rect")Object.assign(v,{x:267,y:330,w:260,h:150,rx:14});
 else if(type==="ellipse")Object.assign(v,{cx:397,cy:405,rx:120,ry:80});
 else if(type==="triangle")Object.assign(v,{points:[[397,310],[520,490],[274,490]]});
 else return;

 canvasState.vectors.push(v);
 canvasState.vectorTool="select";
 $("#canvasSvg")?.classList.remove("drawing");
 if($("#pathDrawHint"))$("#pathDrawHint").style.display="none";
 selectVector(v.id);pushHistory();
}

// Vector editor (SVG)

function vectorBounds(v){
 if(v.type==="rect")return{x:v.x,y:v.y,w:v.w,h:v.h,cx:v.x+v.w/2,cy:v.y+v.h/2};
 if(v.type==="ellipse")return{x:v.cx-v.rx,y:v.cy-v.ry,w:v.rx*2,h:v.ry*2,cx:v.cx,cy:v.cy};
 const pts=v.points||[];if(!pts.length)return{x:0,y:0,w:0,h:0,cx:0,cy:0};
 const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
 return{x,y,w,h,cx:x+w/2,cy:y+h/2};
}

function vectorEl(v){
 const dash=v.dash==="dashed"?"10 7":v.dash==="dotted"?"2 6":"";
 if(v.type==="rect")return `<rect data-vid="${v.id}" x="${v.x}" y="${v.y}" width="${v.w}" height="${v.h}" rx="${v.rx||0}" fill="${v.fill}" stroke="${v.stroke}" stroke-width="${v.strokeWidth}" stroke-dasharray="${dash}" class="${canvasState.selectedType==="vector"&&canvasState.selectedId===v.id?"vectorSelected":""}"/>`;
 if(v.type==="ellipse")return `<ellipse data-vid="${v.id}" cx="${v.cx}" cy="${v.cy}" rx="${v.rx}" ry="${v.ry}" fill="${v.fill}" stroke="${v.stroke}" stroke-width="${v.strokeWidth}" stroke-dasharray="${dash}" class="${canvasState.selectedType==="vector"&&canvasState.selectedId===v.id?"vectorSelected":""}"/>`;
 if(v.type==="triangle")return `<polygon data-vid="${v.id}" points="${v.points.map(p=>p.join(",")).join(" ")}" fill="${v.fill}" stroke="${v.stroke}" stroke-width="${v.strokeWidth}" stroke-dasharray="${dash}" class="${canvasState.selectedType==="vector"&&canvasState.selectedId===v.id?"vectorSelected":""}"/>`;
 if(v.type==="path")return `<path data-vid="${v.id}" d="${pathD(v.points)}" fill="${v.closed?v.fill:"none"}" stroke="${v.stroke}" stroke-width="${v.strokeWidth}" stroke-dasharray="${dash}" stroke-linecap="round" stroke-linejoin="round" class="${canvasState.selectedType==="vector"&&canvasState.selectedId===v.id?"vectorSelected":""}"/>`;
 return "";
}
function pathD(points){if(!points?.length)return"";return "M "+points.map((p,i)=>(i?"L ":"")+p[0]+" "+p[1]).join(" ")}
function renderVectors(){
 const root=$("#canvasObjects");if(!root)return;root.querySelectorAll(".vectorObj").forEach(x=>x.remove());
 for(const v of [...canvasState.vectors].sort((a,b)=>(a.z||0)-(b.z||0))){
   const b=vectorBounds(v),selected=(canvasState.selectedVectorIds||[]).includes(v.id)||(canvasState.selectedType==="vector"&&canvasState.selectedId===v.id);
   const raw=vectorEl(v),visible=raw.replace('data-vid="'+v.id+'"',`data-vid="${v.id}" class="shapeVisible" style="pointer-events:none"`);
   let proxy="";
   if(v.type==="rect")proxy=`<rect data-vid="${v.id}" class="shapeHit vectorTouchProxy" x="${v.x}" y="${v.y}" width="${v.w}" height="${v.h}" rx="${v.rx||0}"/>`;
   if(v.type==="ellipse")proxy=`<ellipse data-vid="${v.id}" class="shapeHit vectorTouchProxy" cx="${v.cx}" cy="${v.cy}" rx="${v.rx}" ry="${v.ry}"/>`;
   if(v.type==="triangle")proxy=`<polygon data-vid="${v.id}" class="shapeHit vectorTouchProxy" points="${v.points.map(p=>p.join(",")).join(" ")}"/>`;
   if(v.type==="path")proxy=`<path data-vid="${v.id}" class="shapeHit vectorTouchProxy" d="${pathD(v.points)}"/>`;
   const nodes=(selected&&canvasState.nodeEdit&&v.points)?v.points.map((p,i)=>`<circle class="pathNode" data-index="${i}" cx="${p[0]}" cy="${p[1]}" r="7"/>`).join(""):"";
   const selMarkup=selected?`<rect class="vectorSelectBox" x="${b.x-7}" y="${b.y-7}" width="${b.w+14}" height="${b.h+14}"/><line class="vectorRotateLine" x1="${b.x+b.w}" y1="${b.y-7}" x2="${b.x+b.w+24}" y2="${b.y-31}"/><circle class="vectorHandle vectorRotateHandle" data-vid="${v.id}" cx="${b.x+b.w+24}" cy="${b.y-31}" r="9"/><circle class="vectorHandle vectorResizeHandle" data-vid="${v.id}" cx="${b.x+b.w+9}" cy="${b.y+b.h+9}" r="9"/>${nodes}`:"";
   root.insertAdjacentHTML("beforeend",`<svg class="vectorObj ${selected?"selected":""} ${v.locked?"locked":""}" data-vector-wrap="${v.id}" viewBox="0 0 ${canvasPageWidth()} ${canvasPageHeight()}" style="z-index:${innerWidth>=900?(v.z||0):(selected?9998:(v.z||0))}${innerWidth>=900?"!important":""};transform:rotate(${v.rotation||0}deg);transform-origin:${b.cx}px ${b.cy}px">${visible}${proxy}${selMarkup}</svg>`);
 }
 attachVectorEvents();renderLayerList();
}

function attachVectorEvents(){
 const root=$("#canvasObjects");if(!root)return;

 root.querySelectorAll(".vectorTouchProxy").forEach(el=>{
   if(el.dataset.bound==="1")return;el.dataset.bound="1";
   el.addEventListener("pointerdown",e=>{
     const vid=el.dataset.vid,v=canvasState.vectors.find(x=>x.id===vid);if(!v)return;
     e.preventDefault();e.stopPropagation();
     if(canvasState.multiMode||e.shiftKey){toggleVectorInMultiSelection(vid);return}
     selectVector(vid);
     if(!v.locked){
       if((canvasState.selectedIds.length+canvasState.selectedVectorIds.length)>1)startDragSelection(e);
       else startVectorDrag(e,vid);
     }
   });
 });

 root.querySelectorAll(".vectorResizeHandle").forEach(el=>{
   if(el.dataset.bound==="1")return;el.dataset.bound="1";
   el.addEventListener("pointerdown",e=>{
     e.preventDefault();e.stopPropagation();selectVector(el.dataset.vid);startVectorResize(e,el.dataset.vid);
   });
 });

 root.querySelectorAll(".vectorRotateHandle").forEach(el=>{
   if(el.dataset.bound==="1")return;el.dataset.bound="1";
   el.addEventListener("pointerdown",e=>{
     e.preventDefault();e.stopPropagation();selectVector(el.dataset.vid);startVectorRotate(e,el.dataset.vid);
   });
 });

 root.querySelectorAll(".pathNode").forEach(el=>{
   if(el.dataset.bound==="1")return;el.dataset.bound="1";
   el.addEventListener("pointerdown",e=>{
     e.preventDefault();e.stopPropagation();startNodeDrag(e,+el.dataset.index);
   });
 });
}

function ensurePathDrawingListener(){
 const svg=$("#canvasSvg");if(!svg||svg.dataset.pathBound==="1")return;
 svg.dataset.pathBound="1";
 svg.addEventListener("pointerdown",e=>{
   if(canvasState.vectorTool!=="pen")return;
   e.preventDefault();e.stopPropagation();startVectorDraw(e);
 });
}
window.setVectorTool=function(t){
 canvasState.vectorTool=t;
 const svg=$("#canvasSvg"),hint=$("#pathDrawHint");
 ensurePathDrawingListener();
 svg?.classList.toggle("drawing",t==="pen");
 if(hint)hint.style.display=t==="pen"?"block":"none";
 if(t==="pen"){
   canvasState.objects.forEach(x=>x.editing=false);
   canvasState.selectedType=null;canvasState.selectedId=null;
   renderCanvasObjects();renderVectors();
 }
 renderCanvasInspector();
}
function selectVector(idv){
 const v=canvasState.vectors.find(x=>x.id===idv);
 if(v?.groupId&&!canvasState.multiMode){selectWholeGroup(v.groupId);return}
 canvasState.selectedType="vector";canvasState.selectedId=idv;canvasState.selectedIds=[];canvasState.selectedVectorIds=[idv];
 renderVectors();renderCanvasObjects();renderCanvasInspector();renderLayerList();updateMultiSelectStatus();updateMobileSelectionTools();
}
function startVectorDraw(e){
 if(canvasState.vectorTool!=="pen")return;
 const p=canvasPoint(e),pts=[[p.x,p.y]],draw=$("#canvasSvg");if(!draw)return;
 draw.setPointerCapture?.(e.pointerId);
 draw.innerHTML=`<path id="livePath" d="M ${p.x} ${p.y}" fill="none" stroke="#8d7369" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;

 const move=ev=>{
   const q=canvasPoint(ev),last=pts[pts.length-1];
   if(Math.hypot(q.x-last[0],q.y-last[1])>2.5){
     pts.push([q.x,q.y]);
     $("#livePath")?.setAttribute("d",pathD(pts));
   }
 };
 const finish=()=>{
   window.removeEventListener("pointermove",move);
   window.removeEventListener("pointerup",finish);
   window.removeEventListener("pointercancel",finish);
   draw.innerHTML="";
   canvasState.vectorTool="select";
   draw.classList.remove("drawing");
   if($("#pathDrawHint"))$("#pathDrawHint").style.display="none";
   if(pts.length>2){
     const v={id:id(),z:nextCanvasZ(),type:"path",points:pts,fill:"none",stroke:"#8d7369",strokeWidth:4,dash:"solid",closed:false,rotation:0,locked:false};
     canvasState.vectors.push(v);selectVector(v.id);pushHistory();
   }else renderVectors();
 };
 window.addEventListener("pointermove",move,{passive:false});
 window.addEventListener("pointerup",finish,{once:true});
 window.addEventListener("pointercancel",finish,{once:true});
}

function startVectorRotate(e,vid){
 e.preventDefault();e.stopPropagation();
 const v=canvasState.vectors.find(x=>x.id===vid);if(!v||v.locked)return;
 const b=vectorBounds(v),p=canvasPoint(e),startA=Math.atan2(p.y-b.cy,p.x-b.cx),base=v.rotation||0;
 const move=ev=>{const q=canvasPoint(ev),a=Math.atan2(q.y-b.cy,q.x-b.cx);v.rotation=base+(a-startA)*180/Math.PI;renderVectors();markCanvasDirty()};
 const up=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);pushHistory()};
 window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
}
function startVectorResize(e,vid){
 e.preventDefault();e.stopPropagation();
 const v=canvasState.vectors.find(x=>x.id===vid);if(!v||v.locked)return;
 const b=vectorBounds(v),p=canvasPoint(e),snap=JSON.parse(JSON.stringify(v));
 const move=ev=>{
   const q=canvasPoint(ev),sx=Math.max(.1,(b.w+(q.x-p.x))/Math.max(1,b.w)),sy=Math.max(.1,(b.h+(q.y-p.y))/Math.max(1,b.h));
   if(v.type==="rect"){v.w=snap.w*sx;v.h=snap.h*sy}
   else if(v.type==="ellipse"){v.rx=snap.rx*sx;v.ry=snap.ry*sy}
   else if(v.points)v.points=snap.points.map(pt=>[b.x+(pt[0]-b.x)*sx,b.y+(pt[1]-b.y)*sy]);
   renderVectors();markCanvasDirty();
 };
 const up=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);pushHistory()};
 window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
}

function startVectorDrag(e,vid){
 e.preventDefault();e.stopPropagation();
 const v=canvasState.vectors.find(x=>x.id===vid);if(!v||v.locked)return;const p=canvasPoint(e),snap=JSON.parse(JSON.stringify(v));
 const move=ev=>{const q=canvasPoint(ev),dx=q.x-p.x,dy=q.y-p.y;if(v.type==="rect"){v.x=snap.x+dx;v.y=snap.y+dy}if(v.type==="ellipse"){v.cx=snap.cx+dx;v.cy=snap.cy+dy}if(v.type==="triangle"||v.type==="path")v.points=snap.points.map(pt=>[pt[0]+dx,pt[1]+dy]);renderVectors();markCanvasDirty(false)};
 const up=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);pushHistory()};window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
}
window.updateVectorStyle=function(k,v){const x=canvasState.vectors.find(x=>x.id===canvasState.selectedId);if(!x)return;x[k]=v;renderVectors();markCanvasDirty()}
window.duplicateSelectedVector=function(){const v=canvasState.vectors.find(x=>x.id===canvasState.selectedId);if(!v)return;const n=JSON.parse(JSON.stringify(v));n.id=id();if(n.x!=null){n.x+=18;n.y+=18}if(n.cx!=null){n.cx+=18;n.cy+=18}if(n.points)n.points=n.points.map(p=>[p[0]+18,p[1]+18]);canvasState.vectors.push(n);selectVector(n.id);markCanvasDirty()}
window.toggleNodeEdit=function(){canvasState.nodeEdit=!canvasState.nodeEdit;renderVectors()}
function startNodeDrag(e,index){const v=canvasState.vectors.find(x=>x.id===canvasState.selectedId);if(!v)return;
 const move=ev=>{const q=canvasPoint(ev);v.points[index]=[q.x,q.y];renderVectors();markCanvasDirty()};
 const up=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up)};
 window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
}
// Basic Paper.js Pathfinder
let __studiaPaperLoadPromise=null;
function ensurePaperForVector(){
 if(typeof paper!=="undefined")return Promise.resolve(paper);
 if(__studiaPaperLoadPromise)return __studiaPaperLoadPromise;
 __studiaPaperLoadPromise=new Promise((resolve,reject)=>{
   const sc=document.createElement("script");
   sc.src="https://cdnjs.cloudflare.com/ajax/libs/paper.js/0.12.18/paper-full.min.js";
   sc.async=true;
   const timer=setTimeout(()=>{sc.remove();__studiaPaperLoadPromise=null;reject(new Error("Paper.js Timeout"))},5000);
   sc.onload=()=>{clearTimeout(timer);typeof paper!=="undefined"?resolve(paper):reject(new Error("Paper.js fehlt"))};
   sc.onerror=()=>{clearTimeout(timer);__studiaPaperLoadPromise=null;reject(new Error("Paper.js nicht erreichbar"))};
   document.head.appendChild(sc);
 });
 return __studiaPaperLoadPromise;
}
function vectorToPaper(v){
 if(typeof paper==="undefined")return null;
 if(v.type==="rect")return new paper.Path.Rectangle(new paper.Rectangle(v.x,v.y,v.w,v.h),new paper.Size(v.rx||0,v.rx||0));
 if(v.type==="ellipse")return new paper.Path.Ellipse(new paper.Rectangle(v.cx-v.rx,v.cy-v.ry,v.rx*2,v.ry*2));
 if(v.type==="triangle"){const p=new paper.Path();v.points.forEach(pt=>p.add(new paper.Point(pt[0],pt[1])));p.closed=true;return p}
 if(v.type==="path"){const p=new paper.Path();v.points.forEach(pt=>p.add(new paper.Point(pt[0],pt[1])));p.closed=!!v.closed;return p}
}
function paperToVector(item){
 const pts=item.segments?.map(s=>[s.point.x,s.point.y])||[];
 return {id:id(),type:"path",points:pts,closed:item.closed,fill:"#f7d2cf",stroke:"#8d7369",strokeWidth:2,dash:"solid"};
}
window.pathfinderUnion=function(){
 if(typeof paper==="undefined")return alert("Vektor-Modul noch nicht geladen.");
 const sel=canvasState.vectors.filter(v=>v._pf);
 if(sel.length<2)return alert("Für Pathfinder: erst zwei Formen markieren. Tipp eine Form an, dann halte Shift beim Antippen der zweiten Form – diese Mehrfachauswahl kommt in der nächsten Feinstufe. Vorerst dupliziere zwei Formen und nutze Subtrahieren über die letzten zwei Formen.");
}
window.pathfinderSubtract=function(){
 if(typeof paper==="undefined")return alert("Vektor-Modul noch nicht geladen.");
 if(canvasState.vectors.length<2)return alert("Du brauchst mindestens zwei Formen.");
 paper.setup(document.createElement("canvas"));
 const b=canvasState.vectors.at(-1),a=canvasState.vectors.at(-2),pa=vectorToPaper(a),pb=vectorToPaper(b);
 if(!pa||!pb||!pa.closed||!pb.closed)return alert("Subtrahieren funktioniert mit geschlossenen Formen.");
 const result=pa.subtract(pb);const nv=paperToVector(result);
 canvasState.vectors=canvasState.vectors.slice(0,-2);canvasState.vectors.push(nv);selectVector(nv.id);markCanvasDirty();
}

function canvasSheetKey(){return selectedSheetId||"new"}

let openEditorGroup=null;
function mobileSelectedText(){
 const o=canvasState.objects.find(x=>x.id===canvasState.selectedId);
 return o&&["text","block","task","merke"].includes(o.kind)?o:null;
}
function mobileDrawerHead(title){
 return `<div class="mobileDrawerHead"><button class="mobileDrawerBack" onclick="closeEditorDrawer()">‹</button><b>${title}</b><button class="mobileDrawerClose" onclick="closeEditorDrawer()">×</button></div>`;
}
window.closeEditorDrawer=function(){
 const d=$("#canvasQuickDrawer");if(d){d.classList.remove("open");d.innerHTML=""}
 openEditorGroup=null;document.body.classList.remove("editorDrawerOpen");
 $$(".canvasQuickNav button").forEach(x=>x.classList.remove("active"));
}
function mobileTextControlsHTML(){
 const o=mobileSelectedText();
 if(!o){
   return `<div class="mobileDrawerSection"><div class="mobileDrawerTitle">Text hinzufügen</div><div class="mobileToolGrid">${canvasPresets().map(x=>`<button onclick="${x.bundle?`insertSavedTextFormat('${x.id}')`:`addCanvasText('${x.id}')`}"><b>${x.id==="h1"?"H1":x.id==="h2"?"H2":x.id==="task"?"✓":x.id==="merke"?"!":"Aa"}</b><span>${x.name}</span></button>`).join("")}</div></div>`;
 }
 return `<div class="mobileTextEditor">
   <div id="mobileTextModeContent" class="mobileTextModeContent">${mobileTextModeContentHTML('text')}</div>
   <div class="mobileTextModeTabs" role="tablist" aria-label="Text-Werkzeuge">
     <button class="on" data-mode="text" onclick="mobileTextMode('text',this)"><b>T</b><span>Text</span></button>
     <button data-mode="appearance" onclick="mobileTextMode('appearance',this)"><b>◉</b><span>Aussehen</span></button>
     <button data-mode="spacing" onclick="mobileTextMode('spacing',this)"><b>Vᴬ</b><span>Abstand</span></button>
     <button data-mode="position" onclick="mobileTextMode('position',this)"><b>⌗</b><span>Position</span></button>
     <button data-mode="effects" onclick="mobileTextMode('effects',this)"><b>✦</b><span>Effekte</span></button>
   </div>
 </div>`;
}
function mobileTextModeContentHTML(kind){
 const o=mobileSelectedText();if(!o)return '';
 const st=o.style||{};
 if(kind==='text'){
   const ff=st.fontFamily||"Arial",fs=st.fontSize||16,ta=st.textAlign||"left";
   return `<div class="mobileTextBar">
     <div class="mobileTextTop">
       <select onchange="applyTextProperty('fontFamily',this.value)">
         ${["Arial","Lato","Playfair Display","Georgia","Verdana","Trebuchet MS"].map(f=>`<option ${ff===f?"selected":""}>${f}</option>`).join("")}
       </select>
       <div class="mobileSizeStep"><button onclick="mobileFontStep(-1)">−</button><input id="mobileFontSize" type="number" min="6" max="180" value="${fs}" onchange="applyTextProperty('fontSize',+this.value)"><button onclick="mobileFontStep(1)">＋</button></div>
       <button onclick="formatSelectedText('bold')"><b>B</b></button>
       <button onclick="formatSelectedText('italic')"><i>I</i></button>
       <button onclick="formatSelectedText('underline')"><u>U</u></button>
       <button onclick="formatSelectedText('strikeThrough')"><s>S</s></button>
     </div>
     <div class="mobileTextMiddle">
       <label class="mobileColorDot" style="--dot:${st.color||'#7a5f57'}"><input type="color" value="${st.color||'#7a5f57'}" onchange="applyTextProperty('color',this.value)"></label>
       <button class="${ta==='left'?'on':''}" onclick="applyTextProperty('textAlign','left');mobileRefreshTextMode()">≡</button>
       <button class="${ta==='center'?'on':''}" onclick="applyTextProperty('textAlign','center');mobileRefreshTextMode()">≣</button>
       <button class="${ta==='right'?'on':''}" onclick="applyTextProperty('textAlign','right');mobileRefreshTextMode()">≡</button>
       <button class="${ta==='justify'?'on':''}" onclick="applyTextProperty('textAlign','justify');mobileRefreshTextMode()">☷</button>
       <button onclick="formatSelectedText('insertUnorderedList')">•≡</button>
       <button onclick="formatSelectedText('insertOrderedList')">1≡</button>
       <button onclick="mobileDashList()">–≡</button>
     </div>
   </div>`;
 }
 if(kind==='appearance')return `<div class="mobileModeSection"><div class="mobileModeIntro"><b>Aussehen</b><span>Farbe, Fläche, Kontur und Transparenz.</span></div><div class="mobileSubGrid">
   <label>Textfarbe<input type="color" value="${st.color||'#7a5f57'}" onchange="applyTextProperty('color',this.value)"></label>
   <label>Hintergrund<input type="color" value="${st.background&&st.background!=='transparent'?st.background:'#ffffff'}" onchange="updateObjStyle('background',this.value)"></label>
   <label>Kontur<input type="color" value="${st.borderColor||'#e5aaa9'}" onchange="updateObjStyle('borderColor',this.value)"></label>
   <label>Dicke<input type="number" min="0" max="20" value="${st.borderWidth||0}" onchange="updateObjStyle('borderWidth',+this.value)"></label>
   <label>Linie<select onchange="updateObjStyle('borderStyle',this.value)"><option value="solid" ${(!st.borderStyle||st.borderStyle==='solid')?'selected':''}>Durchgezogen</option><option value="dashed" ${st.borderStyle==='dashed'?'selected':''}>Gestrichelt</option><option value="dotted" ${st.borderStyle==='dotted'?'selected':''}>Gepunktet</option></select></label>
   <label>Transparenz<input type="range" min="0" max="100" value="${Math.round((st.opacity??1)*100)}" oninput="updateObjStyle('opacity',+this.value/100)"></label>
   <button onclick="mobileGradient()">Verlauf</button><button onclick="updateObjStyle('background','transparent')">Fläche aus</button>
 </div><div class="mobileDrawerActions formatClipboardActions"><button onclick="copySelectedCanvasFormat()">⧉ Format kopieren</button><button onclick="pasteSelectedCanvasFormat()">▣ Format einfügen</button></div></div>`;
 if(kind==='spacing')return `<div class="mobileModeSection"><div class="mobileModeIntro"><b>Abstand</b><span>Text- und Innenabstände fein einstellen.</span></div><div class="mobileSubGrid">
   <label>Buchstaben<input type="number" step=".5" value="${st.letterSpacing||0}" onchange="updateObjStyle('letterSpacing',+this.value)"></label>
   <label>Zeilenhöhe<input type="number" step=".05" min=".8" max="3" value="${st.lineHeight||1.25}" onchange="updateObjStyle('lineHeight',+this.value)"></label>
   <label>Innenabstand<input type="number" min="0" max="80" value="${st.padding??7}" onchange="updateObjStyle('padding',+this.value)"></label>
   <label>Eckenradius<input type="number" min="0" max="80" value="${st.borderRadius||0}" onchange="updateObjStyle('borderRadius',+this.value)"></label>
 </div></div>`;
 if(kind==='position')return `<div class="mobileModeSection"><div class="mobileModeIntro"><b>Position</b><span>Größe, Position und Ausrichtung auf der Seite.</span></div><div class="mobileSubGrid">
   <label>X<input type="number" value="${Math.round(o.x)}" onchange="setSelectedGeometry('x',+this.value)"></label><label>Y<input type="number" value="${Math.round(o.y)}" onchange="setSelectedGeometry('y',+this.value)"></label>
   <label>Breite<input type="number" value="${Math.round(o.w)}" onchange="setSelectedGeometry('w',+this.value)"></label><label>Höhe<input type="number" value="${Math.round(o.h)}" onchange="setSelectedGeometry('h',+this.value)"></label>
   <button onclick="alignSelected('centerX')">Horizontal mittig</button><button onclick="alignSelected('centerY')">Vertikal mittig</button>
 </div></div>`;
 if(kind==='effects')return `<div class="mobileModeSection"><div class="mobileModeIntro"><b>Effekte</b><span>Schatten und visuelle Tiefe.</span></div><div class="mobileSubGrid">
   <label>Schatten Blur<input id="mobileShadowBlur" type="number" min="0" max="60" value="14"></label><label>Schatten Y<input id="mobileShadowY" type="number" min="-30" max="30" value="5"></label>
   <button onclick="mobileApplyShadow()">Schatten an</button><button onclick="updateObjStyle('boxShadow','none')">Schatten aus</button>
 </div></div>`;
 return '';
}
window.mobileTextMode=function(kind,btn){
 const content=$("#mobileTextModeContent");if(!content)return;
 content.innerHTML=mobileTextModeContentHTML(kind);
 $$(".mobileTextModeTabs button").forEach(x=>x.classList.toggle("on",x.dataset.mode===kind));
 const labels={text:"Text bearbeiten",appearance:"Aussehen",spacing:"Abstand",position:"Position",effects:"Effekte"};
 const head=$("#canvasQuickDrawer .mobileDrawerHead b");if(head)head.textContent=labels[kind]||"Text bearbeiten";
}
window.mobileRefreshTextMode=function(){
 const active=$(".mobileTextModeTabs button.on");const kind=active?.dataset.mode||'text';
 const content=$("#mobileTextModeContent");if(content)content.innerHTML=mobileTextModeContentHTML(kind);
}
window.mobileFontStep=function(n){const x=$("#mobileFontSize");if(!x)return;x.value=Math.max(6,Math.min(180,(+x.value||16)+n));applyTextProperty('fontSize',+x.value)}
window.mobileDashList=function(){
 const el=$(`.cobj[data-id="${canvasState.selectedId}"]`);if(!el||!el.isContentEditable)return;
 el.focus();document.execCommand('insertUnorderedList',false,null);el.querySelectorAll('ul').forEach(x=>x.style.listStyleType='"–  "');
 const o=canvasState.objects.find(x=>x.id===canvasState.selectedId);if(o)o.text=el.innerHTML;markCanvasDirty();
}
window.mobileGradient=function(){const a=prompt('Startfarbe','#f2c3c5');if(!a)return;const b=prompt('Endfarbe','#fff6f1');if(!b)return;updateObjStyle('background',`linear-gradient(135deg,${a},${b})`)}
window.mobileApplyShadow=function(){const blur=+$("#mobileShadowBlur")?.value||14,y=+$("#mobileShadowY")?.value||5;updateObjStyle('boxShadow',`0 ${y}px ${blur}px rgba(94,68,62,.20)`)}

function textFormatPreviewLabel(p){
 if(p.bundle)return "▣";
 if(p.id==="h1")return "H1";
 if(p.id==="h2")return "H2";
 if(p.id==="task")return "✓";
 if(p.id==="merke")return "!";
 return "Aa";
}
function mobileTextLibraryHTML(){
 const presets=canvasPresets();
 const cards=presets.map(p=>`<button class="mobileFormatCard" onclick="${p.bundle?`insertSavedTextFormat('${p.id}')`:`addCanvasText('${p.id}')`}">
   <span class="mobileFormatPreview" style="font-family:${esc(p.fontFamily||'Arial')};font-weight:${esc(p.fontWeight||'700')};color:${esc(p.color||'#725b53')}">${textFormatPreviewLabel(p)}</span>
   <span class="mobileFormatName">${esc(p.name||'Textformat')}</span>
   <small>${p.bundle?'Gruppe':(p.type==='block'?'Text + Kasten':'Text')}</small>
  </button>`).join("");
 return `<div class="mobileDrawerSection mobileTextLibrary">
   <div class="mobileLibraryHead"><div><span class="mobileDrawerKicker">TEXT</span><b>Textformate</b></div><button onclick="openTextFormatManager()">Verwalten</button></div>
   <div class="mobileFormatGrid">${cards||'<div class="managerEmpty">Noch keine Textformate.</div>'}</div>
   <div class="mobileDrawerActions"><button onclick="createCustomStylePreset()">＋ Neues Textformat</button></div>
  </div>`;
}

window.editorOpenGroup=function(group,btn){
 const d=$("#canvasQuickDrawer");if(!d)return;
 if(openEditorGroup===group && d.classList.contains("open")){closeEditorDrawer();return}
 openEditorGroup=group;d.classList.add("open");document.body.classList.add("editorDrawerOpen");
 $$(".canvasQuickNav button").forEach(x=>x.classList.remove("active"));btn?.classList.add("active");
 const item=(label,action,icon="•")=>`<button onclick="${action}"><b>${icon}</b><span>${label}</span></button>`;
 const grid=items=>`<div class="mobileToolGrid">${items.join("")}</div>`;
 let title="Werkzeuge",html="";
 if(group==="textLibrary"){
   title="Text";html=mobileTextLibraryHTML();
 }else if(group==="textEdit"||group==="text"){
   title=mobileSelectedText()?"Text bearbeiten":"Text";html=mobileTextControlsHTML();
 }else if(group==="elements"){
   title="Elemente";
   html=`<div class="mobileDrawerSection"><div class="mobileDrawerTitle">Einfügen</div>${grid([
    item("Textfeld","addCanvasTextBox()","T"),item("Formel","openFormulaDialog()","∑"),item("Graph","openGraphDialog()","⌁"),item("Tabelle","openTableDialog()","▦"),
    item("Checkliste","addCanvasChecklist()","☑"),item("Bild / Foto","openCanvasMediaPicker()","▧"),item("Datei","document.getElementById('canvasAnyFileInput').click()","📎"),item("Trennlinie","addVectorLine()","—"),
    item("Rechteck","addVectorShape('rect')","□"),item("Kreis","addVectorShape('ellipse')","○"),item("Dreieck","addVectorShape('triangle')","△"),item("Freier Pfad","setVectorTool('pen')","〰"),
    item("Zettel kariert","addPaperSticker('grid')","▩"),item("Zettel liniert","addPaperSticker('line')","≡"),item("Klebeband","addTapeSticker()","▰"),item("Sticker","toggleStickerPanel()","✿")
   ])}</div>`;
 }else if(group==="formats"){
   title="Textformate";
   html=`<div class="mobileDrawerSection">${grid(canvasPresets().map(x=>item(x.name,x.bundle?`insertSavedTextFormat('${x.id}')`:`addCanvasText('${x.id}')`,x.id==="h1"?"H1":x.id==="h2"?"H2":"Aa")))}<div class="mobileDrawerActions"><button onclick="saveSelectionAsTextFormat()">＋ Auswahl als Textformat</button><button onclick="createCustomStylePreset()">＋ Eigenes Format</button><button onclick="openTextFormatManager()">⚙ Verwalten</button></div></div>`;
 }else if(group==="templates"){
   title="Vorlagen";renderPageTemplates();
   html=`<div class="mobileDrawerSection"><div class="mobileTemplateGrid">${$("#pageTemplatePicker")?.innerHTML||""}</div><div class="mobileDrawerActions"><button onclick="saveCurrentPageTemplate()">＋ Aktuelle Seite als Vorlage</button><button onclick="openPageTemplateManager()">⚙ Vorlagen verwalten</button></div></div>`;
 }else if(group==="pages"){
   title="Seiten";const ps=canvasState.pageStyle||{};
   html=`<div class="mobilePagePanel">
    <div class="mobileDrawerActions rowish"><button onclick="fitCanvasStage()">⊡ An Bildschirm</button><button onclick="setCanvasZoom(.5)">50%</button><button onclick="setCanvasZoom(.75)">75%</button><button onclick="setCanvasZoom(1)">100%</button></div>
    <div class="mobileSubGrid"><label>Ausrichtung<select onchange="setCanvasOrientation(this.value)"><option value="portrait" ${canvasState.orientation==='portrait'?'selected':''}>Hochformat</option><option value="landscape" ${canvasState.orientation==='landscape'?'selected':''}>Querformat</option></select></label><label>Seitenfarbe<input type="color" value="${ps.color||'#ffffff'}" onchange="setCanvasPageStyle('color',this.value)"></label><label>Muster<select onchange="setCanvasPageStyle('pattern',this.value)"><option value="blank" ${ps.pattern==='blank'?'selected':''}>Leer</option><option value="lined" ${ps.pattern==='lined'?'selected':''}>Liniert</option><option value="grid" ${ps.pattern==='grid'?'selected':''}>Kariert</option><option value="dots" ${ps.pattern==='dots'?'selected':''}>Gepunktet</option></select></label><label>Rastergröße<input type="number" min="10" max="48" value="${ps.spacing||24}" onchange="setCanvasPageStyle('spacing',+this.value)"></label><label>Layout-Rand<input type="number" min="0" max="160" value="${ps.margin??55}" onchange="setCanvasPageStyle('margin',+this.value)"></label></div>
    <div class="mobileDrawerActions rowish"><button onclick="alignSelectedToPageMargin('left')">⇤ Linker Rand</button><button onclick="alignSelectedToPageMargin('right')">Rechter Rand ⇥</button><button onclick="fitSelectedToPageMargins()">↔ Bis Rand</button></div>
   </div>`;
 }else if(group==="layers"){
   title="Ebenen";renderLayerList();html=`<div class="mobileDrawerSection"><div class="mobileModeIntro"><b>Ziehen zum Sortieren</b><span>Oben = vorne · unten = hinten. Am Griff ⠿ ziehen.</span></div><div class="mobileLayerList">${$("#layerList")?.innerHTML||'<div class="small">Noch keine Ebenen.</div>'}</div></div>`;
 }else if(group==="selection"){
   title="Auswahl";html=`<div class="mobileDrawerSection">${grid([item(canvasState.multiMode?"Mehrfach aus":"Mehrfachauswahl","toggleMultiSelectMode()","☑"),item("Gruppieren","groupSelectedItems()","▣"),item("Gruppierung lösen","ungroupSelectedItems()","▢"),item("Duplizieren","duplicateSelected()","⧉"),item("Als Textformat","saveSelectionAsTextFormat()","Aa"),item("Format kopieren","copySelectedCanvasFormat()","⧉"),item("Format einfügen","pasteSelectedCanvasFormat()","▣"),item("Sperren","toggleSelectedLock()","🔒"),item("Löschen","deleteSelectedCanvasItem()","⌫")])}<div class="mobileDrawerTitle">Ausrichten</div>${grid([item("Links","mobileAlignMulti('left')","⇤"),item("Horizontal Mitte","mobileAlignMulti('centerX')","↔"),item("Rechts","mobileAlignMulti('right')","⇥"),item("Oben","mobileAlignMulti('top')","⇧"),item("Vertikal Mitte","mobileAlignMulti('centerY')","↕"),item("Unten","mobileAlignMulti('bottom')","⇩")])}</div>`;
 }
 d.innerHTML=mobileDrawerHead(title)+html;
}
window.mobileAlignMulti=function(mode){
 const ids=selectedObjectIds();if(ids.length<2)return cuteToast('Wähle mindestens zwei Objekte ♡');
 const objs=canvasState.objects.filter(o=>ids.includes(o.id));
 if(mode==='left'){const x=Math.min(...objs.map(o=>o.x));objs.forEach(o=>o.x=x)}
 if(mode==='right'){const r=Math.max(...objs.map(o=>o.x+o.w));objs.forEach(o=>o.x=r-o.w)}
 if(mode==='centerX'){const c=(Math.min(...objs.map(o=>o.x))+Math.max(...objs.map(o=>o.x+o.w)))/2;objs.forEach(o=>o.x=c-o.w/2)}
 if(mode==='top'){const y=Math.min(...objs.map(o=>o.y));objs.forEach(o=>o.y=y)}
 if(mode==='bottom'){const b=Math.max(...objs.map(o=>o.y+o.h));objs.forEach(o=>o.y=b-o.h)}
 if(mode==='centerY'){const c=(Math.min(...objs.map(o=>o.y))+Math.max(...objs.map(o=>o.y+o.h)))/2;objs.forEach(o=>o.y=c-o.h/2)}
 renderCanvasObjects();renderCanvasInspector();markCanvasDirty();pushHistory();
}
function updateMobileSelectionTools(){
 const el=$("#mobileSelectionTools");if(!el)return;
 if(window.innerWidth>=900||!document.body.classList.contains('editorMode')||(!canvasState.selectedId&&!canvasState.selectedIds?.length&&!canvasState.selectedVectorIds?.length)){el.classList.remove('show');el.innerHTML='';return}
 el.classList.add('show');el.innerHTML=`<button onclick="duplicateSelected()" title="Duplizieren">⧉</button><button onclick="toggleSelectedLock()" title="Sperren">🔒</button><button onclick="deleteSelectedCanvasItem()" title="Löschen">⌫</button><button onclick="editorOpenGroup('selection')" title="Mehr">•••</button>`;
}
let copiedCanvasFormat=null;
function canvasFormatSource(){
 if(canvasState.selectedType!=="object")return null;
 return canvasState.objects.find(x=>x.id===canvasState.selectedId)||null;
}
window.copySelectedCanvasFormat=function(){
 const o=canvasFormatSource();if(!o)return cuteToast("Wähle zuerst ein Element ♡");
 if(["text","block","task","merke","file"].includes(o.kind))copiedCanvasFormat={type:"text",style:JSON.parse(JSON.stringify(o.style||{}))};
 else if(o.kind==="table")copiedCanvasFormat={type:"table",props:{borderColor:o.borderColor,borderWidth:o.borderWidth,cellBackground:o.cellBackground,fontSize:o.fontSize,borderRadius:o.borderRadius}};
 else if(o.kind==="vector")copiedCanvasFormat={type:"vector"};
 else return cuteToast("Für dieses Element gibt es noch kein Format ♡");
 cuteToast("Format kopiert ✦");
}
window.pasteSelectedCanvasFormat=function(){
 if(!copiedCanvasFormat)return cuteToast("Kopiere zuerst ein Format ♡");
 const targets=(canvasState.selectedIds||[]).length?canvasState.objects.filter(x=>canvasState.selectedIds.includes(x.id)):[canvasFormatSource()].filter(Boolean);
 let changed=0;
 targets.forEach(o=>{
  if(copiedCanvasFormat.type==="text"&&["text","block","task","merke","file"].includes(o.kind)){o.style={...(o.style||{}),...JSON.parse(JSON.stringify(copiedCanvasFormat.style))};changed++}
  if(copiedCanvasFormat.type==="table"&&o.kind==="table"){Object.assign(o,copiedCanvasFormat.props);changed++}
 });
 if(!changed)return cuteToast("Format passt nicht zu dieser Auswahl ♡");
 renderCanvasObjects();renderCanvasInspector();markCanvasDirty();pushHistory();cuteToast("Format eingefügt ✦");
}

function renderSheetEditor(){
 const {s,t}=currentTopic();if(!s||!t)return;
 renderStylePresets();renderStickerPicker();
 const sh=selectedSheetId?(data.studySheets||[]).find(x=>x.id===selectedSheetId):null;
 const saved=sh?.canvasData||null;
 canvasState.objects=saved?.objects||[];
 canvasState.vectors=saved?.vectors||[];
 canvasState.layerGroups=saved?.layerGroups||[];
 canvasState.orientation=saved?.orientation==="landscape"?"landscape":"portrait";
 canvasState.pageStyle={color:"#ffffff",pattern:"blank",spacing:24,margin:55,...(saved?.pageStyle||{})};
 canvasState.selectedType=null;canvasState.selectedId=null;canvasState.selectedIds=[];canvasState.selectedVectorIds=[];canvasState.multiMode=false;canvasState.vectorTool="select";canvasState.nodeEdit=false;canvasState.history=[];canvasState.historyIndex=-1;
 if(!saved && sh?.html){
   canvasState.objects=[{id:id(),kind:"text",x:70,y:70,w:650,h:850,text:stripHTML(sh.html),style:{fontSize:16,fontWeight:"400",color:"#333333",fontFamily:sh.font||"Arial",textAlign:"left"}}];
 }
 if(!saved&&!sh)applyCanvasTemplate("clean",true);
 if($("#wordStatus"))$("#wordStatus").textContent=sh?"Gespeichert":"Neues Lernblatt";
 applyCanvasPageSize();renderCanvasObjects();renderVectors();renderCanvasInspector();renderPageTemplates();enhanceCameraInputs();updateMultiSelectStatus();pushHistory(true);canvasState.lastSavedHash=canvasSnapshot();ensurePathDrawingListener();setTimeout(()=>{fitCanvasStage();openEditorGroup=null;const d=$("#canvasQuickDrawer");if(d){d.classList.remove("open");d.innerHTML=""}$$(".canvasQuickNav button").forEach(x=>x.classList.remove("active"))},80);
}
function stripHTML(x){const d=document.createElement("div");d.innerHTML=x;return d.innerText}
function markCanvasDirty(schedule=true){const x=$("#autosaveState");if(x){x.textContent="Nicht gespeichert";x.className="autosaveState saving"}if(schedule)scheduleAutosave()}
window.addEventListener("resize",()=>{if($("#view-sheet-editor")?.classList.contains("active"))fitCanvasStage()})
function saveCanvasSheetCore(auto=false){
 const {s,t}=currentTopic();if(!s||!t)return;const title=canvasState.objects.find(o=>["text","block"].includes(o.kind)&&(o.style?.fontSize||0)>=28)?.text?.replace(/<[^>]*>/g,"").slice(0,80)||t.title;const dataObj={objects:canvasState.objects,vectors:canvasState.vectors,orientation:canvasState.orientation,pageStyle:canvasState.pageStyle,layerGroups:canvasState.layerGroups||[]};
 if(selectedSheetId){const sh=data.studySheets.find(x=>x.id===selectedSheetId);if(sh){sh.title=title;sh.canvasData=dataObj;sh.html=""}}else{const sh={id:id(),subject:s.name,topicId:t.id,title,html:"",canvasData:dataObj,created:Date.now()};data.studySheets.push(sh);selectedSheetId=sh.id}save();if(!auto){const el=$("#autosaveState");if(el){el.textContent="Gespeichert ✓";el.className="autosaveState saved"}}
}
window.saveCanvasSheet=function(){saveCanvasSheetCore(false);canvasState.lastSavedHash=canvasSnapshot()}
function serializedCanvas(){
 const objs=canvasState.objects.map(o=>{
   const base=`position:absolute;left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${o.h}px;box-sizing:border-box;`;
   if(o.kind==="image")return `<div style="${base}"><img src="${o.src}" style="width:100%;height:100%;object-fit:contain"></div>`;
   if(o.kind==="sticker")return `<div style="${base}display:grid;place-items:center;font-size:${Math.min(o.w,o.h)*.65}px">${o.text}</div>`;
   if(o.kind==="paper"){
     const bg=o.paperType==="grid"?`background-color:#fffdf7;background-image:linear-gradient(rgba(187,205,169,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(187,205,169,.35) 1px,transparent 1px);background-size:${o.spacing||20}px ${o.spacing||20}px`:o.paperType==="line"?`background-color:#fffdf7;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent ${(o.spacing||28)-1}px,rgba(168,190,210,.38) ${(o.spacing||28)-1}px,rgba(168,190,210,.38) ${o.spacing||28}px)`:`background:#fffdf7`;
     return `<div style="${base}${bg};border:1px solid rgba(130,105,90,.14)"></div>`;
   }
   if(o.kind==="tape")return `<div style="${base}background:rgba(242,190,178,.62);transform:rotate(${o.rotation||-4}deg)"></div>`;
   if(o.kind==="graph")return `<div style="${base}">${graphSvg(o.graph||graphDefault(),Math.max(120,Math.round(o.w)),Math.max(100,Math.round(o.h)))}</div>`;
   if(o.kind==="table")return `<div style="${base}"><table style="border-collapse:collapse;width:100%;height:100%;font-size:${o.fontSize||16}px;border-radius:${o.borderRadius??12}px;overflow:hidden">${o.cells.map((r,ri)=>`<tr>${r.map((c,ci)=>`<td style="border:${o.borderWidth??1}px solid ${o.borderColor||"#aaa7a2"};background:${o.cellColors?.[ri]?.[ci]||o.cellBackground||"#ffffff"};padding:6px">${esc(c)}</td>`).join("")}</tr>`).join("")}</table></div>`;
   const s=o.style||{},bg=o.kind==="task"?"#fff5eb":o.kind==="merke"?"#fff0ef":s.background||"transparent";
   return `<div style="${base}transform:rotate(${o.rotation||0}deg);padding:${s.padding??7}px;font-size:${s.fontSize||16}px;font-weight:${s.fontWeight||400};color:${s.color||"#333"};font-family:${s.fontFamily||"Arial"};background:${s.background||bg};text-align:${s.textAlign||"left"};border:${s.borderWidth||0}px solid ${s.borderColor||"transparent"};border-radius:${s.borderRadius||0}px">${o.text||""}</div>`;
 }).join("");
 const vec=`<svg style="position:absolute;inset:0;width:${canvasPageWidth()}px;height:${canvasPageHeight()}px" viewBox="0 0 ${canvasPageWidth()} ${canvasPageHeight()}">${canvasState.vectors.map(vectorEl).join("")}</svg>`;
 return vec+objs;
}
window.exportCanvasHTML=function(){
 const title=(data.studySheets.find(x=>x.id===selectedSheetId)?.title)||"Lernblatt";
 const ps=pagePatternCSS().replace(/`/g,"");
 const html=`<!doctype html><html><head><meta charset="utf-8">





</head><body><div class="page">${serializedCanvas()}</div><div id="buildVersionBadge" style="position:fixed;right:8px;bottom:8px;z-index:9999;font:800 9px Inter,sans-serif;color:#9b7d74;background:rgba(255,250,247,.88);border:1px solid #ead4cd;border-radius:999px;padding:5px 8px;pointer-events:none">V182</div>
</body></html>`;
 const blob=new Blob([html],{type:"text/html"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=title.replace(/[^\wäöüÄÖÜß-]+/g,"_")+".html";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000);
}
window.printCanvasSheet=function(){
 const w=window.open("","_blank");w.document.write(`<!doctype html><html><head><meta charset="utf-8">





</head><body><div class="page">${serializedCanvas()}</div></body></html>`);w.document.close();setTimeout(()=>w.print(),300)
}

function customPageTemplates(){
 try{return JSON.parse(localStorage.getItem("schoolbloom-page-templates")||"[]")}catch(_){return []}
}
window.renderPageTemplates=function(){
 const root=$("#pageTemplatePicker");if(!root)return;
 const defaults=`<button class="templateCard" onclick="applyCanvasTemplate('clean')"><b>Clean Notes</b><span>klare Überschrift + Merkkasten</span></button>
 <button class="templateCard" onclick="applyCanvasTemplate('cute')"><b>Cute Study</b><span>Pastell + Sticker + Aufgabe</span></button>
 <button class="templateCard" onclick="applyCanvasTemplate('exam')"><b>Exam Prep</b><span>Definitionen + Aufgaben</span></button>
 <button class="templateCard" onclick="applyCanvasTemplate('blank')"><b>Leer</b><span>komplett frei gestalten</span></button>`;
 const own=customPageTemplates().map(t=>`<button class="templateCard customPageTemplate" onclick="applySavedPageTemplate('${t.id}')"><b>${esc(t.name)}</b><span>Eigene Seitenvorlage</span></button>`).join("");
 root.innerHTML=defaults+own;
}
window.saveCurrentPageTemplate=function(){
 openModal(`<div class="compactPresetModal"><div class="presetModalHead"><div><span class="eyebrow">SEITENVORLAGE</span><h2>Aktuelle Seite speichern</h2></div><button class="miniIcon" onclick="closeModal()">×</button></div>
 <p class="small">Objekte, Formen, Papierstil und Ausrichtung werden zusammen gespeichert.</p>
 <label>Name</label><input id="pageTemplateName" placeholder="z. B. Mathe Lernzettel">
 <button class="primary" onclick="confirmSaveCurrentPageTemplate()">Vorlage speichern</button></div>`);
}
window.confirmSaveCurrentPageTemplate=function(){
 const name=$("#pageTemplateName")?.value.trim()||"Eigene Vorlage";
 const arr=customPageTemplates();
 arr.push({id:"page-"+Date.now(),name,objects:JSON.parse(JSON.stringify(canvasState.objects)),vectors:JSON.parse(JSON.stringify(canvasState.vectors)),pageStyle:JSON.parse(JSON.stringify(canvasState.pageStyle)),orientation:canvasState.orientation});
 localStorage.setItem("schoolbloom-page-templates",JSON.stringify(arr));closeModal();renderPageTemplates();cuteToast("Seitenvorlage gespeichert ♡");
}
window.applySavedPageTemplate=function(idv){
 const t=customPageTemplates().find(x=>x.id===idv);if(!t)return;
 canvasState.objects=JSON.parse(JSON.stringify(t.objects||[])).map(o=>({...o,id:id(),z:nextCanvasZ()}));
 canvasState.vectors=JSON.parse(JSON.stringify(t.vectors||[])).map(v=>({...v,id:id(),z:nextCanvasZ()}));
 canvasState.pageStyle=JSON.parse(JSON.stringify(t.pageStyle||canvasState.pageStyle));canvasState.orientation=t.orientation||"portrait";
 applyCanvasPageSize();renderCanvasObjects();renderVectors();updatePageStyleControls();markCanvasDirty();pushHistory();cuteToast("Vorlage angewendet ♡");
}
window.openPageTemplateManager=function(){
 const arr=customPageTemplates();
 openModal(`<div class="textFormatManager"><div class="presetModalHead"><div><span class="eyebrow">SEITEN</span><h2>Eigene Vorlagen</h2></div><button class="miniIcon" onclick="closeModal()">×</button></div>
 ${arr.length?`<div class="formatManagerList">${arr.map(t=>`<div class="formatManagerRow"><div class="formatManagerPreview">▯</div><div><b>${esc(t.name)}</b><small>Seitenvorlage</small></div><button onclick="applySavedPageTemplate('${t.id}');closeModal()">Einfügen</button><button class="formatDeleteBtn" onclick="deletePageTemplate('${t.id}')">⌫</button></div>`).join("")}</div>`:`<div class="managerEmpty">Noch keine eigenen Seitenvorlagen.</div>`}
 <button class="primary" onclick="closeModal();saveCurrentPageTemplate()">＋ Aktuelle Seite speichern</button></div>`);
}
window.deletePageTemplate=function(idv){
 closeModal();confirmDanger({title:"Seitenvorlage löschen?",text:"Die gespeicherte Vorlage wird dauerhaft entfernt.",confirmText:"Vorlage löschen",onConfirm:`performDeletePageTemplate('${idv}')`});
}
window.performDeletePageTemplate=function(idv){
 const arr=customPageTemplates().filter(x=>x.id!==idv);localStorage.setItem("schoolbloom-page-templates",JSON.stringify(arr));closeModal();renderPageTemplates();setTimeout(openPageTemplateManager,0);
}

window.applyCanvasTemplate=function(name,silent=false){
 if(name==="blank"){canvasState.objects=[];canvasState.vectors=[]}
 if(name==="clean"){
   canvasState.objects=[
    {...newCanvasObject("h1"),x:70,y:70,w:650,text:"Thema"},
    {...newCanvasObject("h2"),x:70,y:145,w:500,text:"Unterthema"},
    {...newCanvasObject("body"),x:70,y:205,w:650,h:120,text:"Schreibe hier deine wichtigsten Punkte …"},
    {...newCanvasObject("merke"),x:70,y:350,w:650,h:95,text:"Merke: Wichtigster Zusammenhang oder Definition."}
   ];
 }
 if(name==="cute"){
   canvasState.objects=[
    {...newCanvasObject("h1"),x:70,y:65,w:600,text:"Mein Lernblatt"},
    {id:id(),kind:"sticker",x:650,y:55,w:70,h:70,text:"🌸"},
    {...newCanvasObject("body"),x:70,y:155,w:650,h:130,text:"Kurze Zusammenfassung …"},
    {...newCanvasObject("task"),x:70,y:320,w:650,h:95,text:"Aufgabe: Prüfe dich selbst mit einer kleinen Frage."}
   ];
 }
 if(name==="exam"){
   canvasState.objects=[
    {...newCanvasObject("h1"),x:70,y:65,w:600,text:"Prüfungsvorbereitung"},
    {...newCanvasObject("h2"),x:70,y:145,w:450,text:"Definitionen"},
    {...newCanvasObject("body"),x:70,y:200,w:650,h:170,text:"1. Begriff – Erklärung\n2. Begriff – Erklärung"},
    {...newCanvasObject("task"),x:70,y:400,w:650,h:110,text:"Aufgabe: Erkläre das Thema ohne nachzuschauen."}
   ];
 }
 renderCanvasObjects();renderVectors();if(!silent)markCanvasDirty();
}

window.deleteStudySheet=function(sid){data.studySheets=data.studySheets.filter(x=>x.id!==sid);save();renderTopicDetail()}

window.openNewTopic=function(sid){
 openModal(`<h2>Themen-Ordner erstellen</h2><label>Name</label><input id="newTopicName" placeholder="z. B. Gestaltgesetze"><label style="margin-top:10px">Kurze Beschreibung</label><textarea id="newTopicText" placeholder="optional"></textarea><button class="primary" style="margin-top:10px" onclick="createTopicFolder('${sid}')">Erstellen</button>`);
}
window.createTopicFolder=function(sid){
 const s=data.subjects.find(x=>x.id===sid),title=$("#newTopicName").value.trim();if(!s||!title)return;
 ensureSubjectShape(s);s.topics.push({id:id(),title,text:$("#newTopicText").value.trim(),materials:[],files:[]});save();closeModal();renderSubjectDetail();
}

window.createDeckPrompt=function(){
 const {s,t}=currentTopic();if(!s||!t)return;
 openModal(`<h2>Karteikarten-Ordner</h2><label>Name</label><input id="deckName" placeholder="z. B. Gestaltgesetze"><label style="margin-top:10px">Symbol</label><select id="deckEmoji"><option>🌸</option><option>🎀</option><option>⭐</option><option>🍀</option><option>🫐</option></select><button class="primary" style="margin-top:10px" onclick="createDeck()">Erstellen</button>`);
}
window.createDeck=function(){
 const {s,t}=currentTopic(),name=$("#deckName").value.trim();if(!s||!t||!name)return;
 const d={id:id(),subject:s.name,topicId:t.id,name,emoji:$("#deckEmoji").value};data.flashDecks.push(d);save();closeModal();selectedDeckId=d.id;openView("deck-detail")
}

window.goBackFromDeck=function(){
 const d=data.flashDecks.find(x=>x.id===selectedDeckId);
 if(d?.topicId){
   const s=data.subjects.find(x=>x.name===d.subject);
   if(s){selectedSubjectId=s.id;selectedTopicId=d.topicId;openView("topic-detail");return}
 }
 const s=data.subjects.find(x=>x.name===d?.subject);
 if(s){selectedSubjectId=s.id;openView("subject-detail");return}
 openView("study");
}
window.editDeckCard=function(cid){
 const c=data.flashcards.find(x=>x.id===cid);if(!c)return;
 openModal(`<h2>Karte bearbeiten</h2><label>Frage</label><textarea id="editCardQ">${esc(c.q)}</textarea><label style="margin-top:10px">Antwort</label><textarea id="editCardA">${esc(c.a)}</textarea><button class="primary" style="margin-top:10px" onclick="saveDeckCardEdit('${cid}')">Speichern</button>`);
}
window.saveDeckCardEdit=function(cid){
 const c=data.flashcards.find(x=>x.id===cid);if(!c)return;
 c.q=$("#editCardQ").value.trim();c.a=$("#editCardA").value.trim();save();closeModal();renderDeckDetail();
}

window.openDeck=function(did){selectedDeckId=did;currentFlash=0;flashFlipped=false;openView("deck-detail")}
function renderDeckDetail(){
 const root=$("#deckDetail");if(!root)return;const d=data.flashDecks.find(x=>x.id===selectedDeckId);if(!d){root.innerHTML='<div class="empty">Ordner nicht gefunden.</div>';return}
 const cards=data.flashcards.filter(c=>c.deckId===d.id);
 if(currentFlash>=cards.length)currentFlash=0;
 const c=cards[currentFlash];
 root.innerHTML=`<div class="topicHero"><div class="eyebrow">${esc(d.subject)}</div><h2>${esc(d.emoji||"🌸")} ${esc(d.name)}</h2><div class="small">${cards.length} Karten</div></div>
 <div class="section">${c?`<div class="flashScene" onclick="flipDeckCard()"><div class="flashInner ${flashFlipped?"flipped":""}" id="deckFlashInner">
   <div class="flashFace"><div><div class="badge">${esc(d.name)}</div><div class="flashQuestion" style="margin-top:16px">${esc(c.q)}</div><div class="small" style="margin-top:12px">Antippen zum Umdrehen ✿</div></div></div>
   <div class="flashFace flashBack"><div><div class="badge">Antwort</div><div class="flashAnswer" style="margin-top:16px">${esc(c.a)}</div><div class="small" style="margin-top:12px">Antippen zum Zurückdrehen ♡</div></div></div>
 </div></div>
 <div class="row" style="justify-content:center;margin-top:10px"><button class="ghost" onclick="event.stopPropagation();moveDeckCard(-1)">←</button><span class="badge">${currentFlash+1}/${cards.length}</span><button class="ghost" onclick="event.stopPropagation();moveDeckCard(1)">→</button><button class="ghost" onclick="event.stopPropagation();editDeckCard('${c.id}')">Bearbeiten</button><button class="dangerBtn" onclick="event.stopPropagation();deleteDeckCard('${c.id}')">Löschen</button></div>`:'<div class="empty">Noch keine Karten.</div>'}</div>`;
 const add=$("#addCardToDeckBtn");if(add)add.onclick=()=>openAddCardToDeck(d.id);
}
window.flipDeckCard=function(){flashFlipped=!flashFlipped;const x=$("#deckFlashInner");if(x)x.classList.toggle("flipped",flashFlipped)}
window.moveDeckCard=function(dir){const cards=data.flashcards.filter(c=>c.deckId===selectedDeckId);if(!cards.length)return;currentFlash=(currentFlash+dir+cards.length)%cards.length;flashFlipped=false;renderDeckDetail()}
window.openAddCardToDeck=function(did){
 const d=data.flashDecks.find(x=>x.id===did);if(!d)return;
 openModal(`<h2>Karte hinzufügen</h2><label>Frage</label><textarea id="deckQ"></textarea><label style="margin-top:10px">Antwort</label><textarea id="deckA"></textarea><button class="primary" style="margin-top:10px" onclick="saveCardToDeck('${did}')">Speichern</button>`);
}
window.saveCardToDeck=function(did){const d=data.flashDecks.find(x=>x.id===did),q=$("#deckQ").value.trim(),a=$("#deckA").value.trim();if(!d||!q||!a)return;data.flashcards.push({id:id(),subject:d.subject,deckId:did,q,a,created:Date.now()});save();closeModal();renderDeckDetail()}
window.deleteDeckCard=function(cid){data.flashcards=data.flashcards.filter(x=>x.id!==cid);save();renderDeckDetail()}



window.createQuizPrompt=function(){
 const {s,t}=currentTopic();if(!s||!t)return;
 openModal(`<h2>Quiz erstellen</h2><label>Name</label><input id="quizName" placeholder="z. B. Gestaltgesetze Test"><button class="primary" style="margin-top:10px" onclick="createQuiz()">Erstellen</button>`);
}
window.createQuiz=function(){const {s,t}=currentTopic(),name=$("#quizName").value.trim();if(!s||!t||!name)return;const q={id:id(),subject:s.name,topicId:t.id,name,questions:[]};data.quizzes.push(q);save();closeModal();editQuiz(q.id)}
window.editQuiz=function(qid){
 const q=data.quizzes.find(x=>x.id===qid);if(!q)return;
 const items=q.questions.map((x,i)=>`<div class="quizEditorQuestion"><div class="rowBetween"><b>${i+1}. ${esc(x.q)}</b><button class="dangerBtn" onclick="deleteQuizQuestion('${qid}','${x.id}')">×</button></div><div class="small">${x.type==="mc"?"Multiple Choice":"Freitext"} · Lösung: ${esc(x.a)}</div></div>`).join("")||'<div class="empty">Noch keine Fragen.</div>';
 openModal(`<div class="rowBetween"><h2>${esc(q.name)}</h2><button class="primary" onclick="startQuiz('${qid}')">Test starten</button></div>
 <div class="stack" style="margin-top:12px">${items}</div>
 <div class="section"><h3>Frage hinzufügen</h3>
  <label style="margin-top:8px">Fragentyp</label><select id="quizQType"><option value="text">Antwort eingeben</option><option value="mc">Multiple Choice</option></select>
  <label style="margin-top:8px">Frage</label><textarea id="newQuizQ"></textarea>
  <div id="mcOptionsBox" style="display:none"><label style="margin-top:8px">Antwortmöglichkeiten (eine pro Zeile)</label><textarea id="newQuizOptions" placeholder="Antwort A&#10;Antwort B&#10;Antwort C"></textarea></div>
  <label style="margin-top:8px">Richtige Antwort</label><input id="newQuizA">
  <button class="primary" style="margin-top:8px" onclick="addQuizQuestion('${qid}')">Frage speichern</button>
 </div>`);
 $("#quizQType").onchange=()=>$("#mcOptionsBox").style.display=$("#quizQType").value==="mc"?"block":"none";
}
window.addQuizQuestion=function(qid){
 const q=data.quizzes.find(x=>x.id===qid),type=$("#quizQType").value,qq=$("#newQuizQ").value.trim(),a=$("#newQuizA").value.trim();
 if(!q||!qq||!a)return;
 let options=[];if(type==="mc"){options=$("#newQuizOptions").value.split(/\n+/).map(x=>x.trim()).filter(Boolean);if(!options.includes(a))options.push(a);if(options.length<2)return alert("Bitte mindestens zwei Antwortmöglichkeiten eintragen.")}
 q.questions.push({id:id(),type,q:qq,a,options});save();editQuiz(qid)
}
window.deleteQuizQuestion=function(qid,itemId){const q=data.quizzes.find(x=>x.id===qid);if(!q)return;q.questions=q.questions.filter(x=>x.id!==itemId);save();editQuiz(qid)}
window.startQuiz=function(qid){
 const q=data.quizzes.find(x=>x.id===qid);if(!q||!q.questions.length)return alert("Füge zuerst mindestens eine Frage hinzu.");
 selectedQuizId=qid;quizSession={index:0,score:0,answers:[],submitted:false,selected:null};closeModal();openView("quiz-player");
}
function renderQuizPlayer(){
 const root=$("#quizPlayerRoot");if(!root)return;const q=data.quizzes.find(x=>x.id===selectedQuizId);if(!q||!quizSession){root.innerHTML='<div class="empty">Quiz nicht gefunden.</div>';return}
 if(quizSession.index>=q.questions.length){
   root.innerHTML=`<div class="panel" style="text-align:center"><div class="eyebrow">Fertig</div><h2 style="font-size:34px;margin-top:8px">${quizSession.score}/${q.questions.length} richtig</h2><p class="muted">Du kannst das Quiz direkt nochmal machen.</p><button class="primary" onclick="startQuiz('${q.id}')">Nochmal</button></div>`;
   $("#quizScoreBadge").textContent=`${quizSession.score}/${q.questions.length}`;return;
 }
 const x=q.questions[quizSession.index],progress=((quizSession.index)/q.questions.length)*100;
 $("#quizScoreBadge").textContent=`${quizSession.score} Punkte`;
 let answerUI="";
 if(x.type==="mc"){
   answerUI=`<div class="choiceList">${(x.options||[]).map(o=>`<button class="choiceBtn ${quizSession.selected===o?"selected":""}" onclick="selectQuizChoice(${JSON.stringify(o)})">${esc(o)}</button>`).join("")}</div>`;
 }else{
   answerUI=`<input id="quizTextAnswer" placeholder="Deine Antwort …" ${quizSession.submitted?"disabled":""}>`;
 }
 let fb="";
 if(quizSession.submitted){
   const given=quizSession.answers[quizSession.answers.length-1]?.given||"";
   const ok=normalizeAnswer(given)===normalizeAnswer(x.a);
   fb=`<div class="quizFeedback ${ok?"ok":"bad"}">${ok?"✓ Richtig!":`✗ Nicht ganz. Richtige Antwort: ${esc(x.a)}`}</div><button class="primary" style="margin-top:10px" onclick="nextQuizQuestion()">Weiter</button>`;
 }
 root.innerHTML=`<div class="quizPlayer"><div class="rowBetween"><div><div class="eyebrow">${esc(q.name)}</div><h2>Frage ${quizSession.index+1} von ${q.questions.length}</h2></div></div><div class="quizProgress"><div style="width:${progress}%"></div></div><div class="quizQuestion"><h3>${esc(x.q)}</h3>${answerUI}${!quizSession.submitted?`<button class="primary" style="margin-top:12px" onclick="submitQuizAnswer()">Antwort prüfen</button>`:""}${fb}</div></div>`;
}
function normalizeAnswer(s){return String(s||"").trim().toLowerCase().replace(/\s+/g," ")}
window.selectQuizChoice=function(o){if(quizSession.submitted)return;quizSession.selected=o;renderQuizPlayer()}
window.submitQuizAnswer=function(){
 const q=data.quizzes.find(x=>x.id===selectedQuizId),x=q.questions[quizSession.index];
 const given=x.type==="mc"?quizSession.selected:$("#quizTextAnswer").value.trim();
 if(!given)return alert("Bitte zuerst eine Antwort eingeben.");
 const ok=normalizeAnswer(given)===normalizeAnswer(x.a);if(ok)quizSession.score++;
 quizSession.answers.push({qid:x.id,given,ok});quizSession.submitted=true;renderQuizPlayer()
}
window.nextQuizQuestion=function(){quizSession.index++;quizSession.submitted=false;quizSession.selected=null;renderQuizPlayer()}

window.deleteQuiz=function(qid){data.quizzes=data.quizzes.filter(x=>x.id!==qid);save();renderTopicDetail()}



window.openTopic=function(sid,tid){selectedSubjectId=sid;selectedTopicId=tid;openView("topic-detail")}
function currentTopic(){
 const s=data.subjects.find(x=>x.id===selectedSubjectId);return {s,t:s?.topics?.find(x=>x.id===selectedTopicId)}
}
function renderTopicDetail(){
 const root=$("#topicDetail");if(!root)return;const {s,t}=currentTopic();if(!s||!t){root.innerHTML='<div class="empty">Thema nicht gefunden.</div>';return}
 t.materials ||= [];t.files ||= [];
 const sheets=(data.studySheets||[]).filter(x=>x.subject===s.name&&x.topicId===t.id);
 const decks=(data.flashDecks||[]).filter(x=>x.subject===s.name&&x.topicId===t.id);
 const quizzes=(data.quizzes||[]).filter(x=>x.subject===s.name&&x.topicId===t.id);
 const files=(t.files||[]).map(f=>`<div class="fileChip"><div><b>📎 ${esc(f.name)}</b><div class="small">${esc(f.type||"Datei")}</div></div><div class="row"><button class="ghost" onclick="openStoredFile('${f.id}')">Öffnen</button><button class="dangerBtn" onclick="deleteTopicFile('${f.id}')">×</button></div></div>`).join("")||'<div class="empty">Noch keine Dateien.</div>';
 root.innerHTML=`<div class="topicHero"><div class="eyebrow">${esc(s.name)}</div><h2>${esc(t.title)}</h2>${t.text?`<p class="small">${esc(t.text)}</p>`:""}</div>
 <div class="resourceSections section">
   <div class="resourceSection">
     <div class="resourceSectionHead"><h3>📄 Lernblätter</h3><button class="primary" onclick="openStudySheetEditor()">+ Lernblatt</button></div>
     <div class="stack">${sheets.length?sheets.map(x=>`<div class="sheetCard sheetCardDirect" role="button" tabindex="0" onclick="if(!event.target.closest('button'))openStudySheetEditor('${x.id}')" onkeydown="if(event.key==='Enter')openStudySheetEditor('${x.id}')"><b>📄 ${esc(x.title)}</b><div class="small">${x.canvasData?"A4 Canvas-Lernblatt":"A4 Lernblatt"}</div><div class="editRow"><button class="ghost" onclick="event.stopPropagation();openStudySheetEditor('${x.id}')">Öffnen</button><button class="dangerBtn" onclick="event.stopPropagation();deleteStudySheet('${x.id}')">Löschen</button></div></div>`).join(""):'<div class="empty">Noch kein Lernblatt.</div>'}</div>
   </div>

   <div class="resourceSection">
     <div class="resourceSectionHead"><h3>🗂️ Karteikarten</h3><button class="primary" onclick="createDeckPrompt()">+ Ordner</button></div>
     <div class="deckGrid">${decks.length?decks.map(d=>`<button class="deckCard" onclick="openDeck('${d.id}')"><div class="deckIcon">${esc(d.emoji||"🌸")}</div><div class="deckName">${esc(d.name)}</div><div class="deckMeta">${data.flashcards.filter(c=>c.deckId===d.id).length} Karten</div></button>`).join(""):'<div class="empty">Noch kein Kartenordner.</div>'}</div>
   </div>

   <div class="resourceSection">
     <div class="resourceSectionHead"><h3>🧠 Quiz & Testfragen</h3><button class="primary" onclick="createQuizPrompt()">+ Quiz</button></div>
     <div class="stack">${quizzes.length?quizzes.map(q=>`<div class="quizCard"><div class="rowBetween"><div><b>${esc(q.name)}</b><div class="small">${q.questions.length} Fragen</div></div><span class="badge">${q.questions.some(x=>x.type==="mc")?"Multiple Choice + Freitext":"Freitext"}</span></div><div class="editRow"><button class="primary" onclick="startQuiz('${q.id}')">Starten</button><button class="ghost" onclick="editQuiz('${q.id}')">Bearbeiten</button><button class="dangerBtn" onclick="deleteQuiz('${q.id}')">Löschen</button></div></div>`).join(""):'<div class="empty">Noch kein Quiz.</div>'}</div>
   </div>

   <div class="resourceSection">
     <div class="resourceSectionHead"><h3>📎 Dateien & Arbeitsblätter</h3><button class="primary" onclick="document.querySelector('#topicFileInput').click()">+ Datei</button></div>
     <input id="topicFileInput" type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx" style="display:none" onchange="addTopicFiles(this.files)">
     <div class="fileList">${files}</div>
   </div>
 </div>`;
 const del=$("#deleteCurrentTopicBtn");if(del)del.onclick=()=>deleteCurrentTopic();
}
window.deleteCurrentTopic=function(){const {s,t}=currentTopic();if(!s||!t)return;if(!confirm("Themen-Ordner löschen?"))return;s.topics=s.topics.filter(x=>x.id!==t.id);save();selectedTopicId=null;openSubject(s.id)}
window.addTopicFiles=async function(files){const {t}=currentTopic();if(!t)return;t.files ||= [];for(const f of [...files]){const fid=id();await dbPut({id:fid,name:f.name,type:f.type,blob:f});t.files.push({id:fid,name:f.name,type:f.type||"Datei"})}save();renderTopicDetail()}
window.deleteTopicFile=async function(fid){const {t}=currentTopic();if(!t)return;await dbDelete(fid);t.files=t.files.filter(x=>x.id!==fid);save();renderTopicDetail()}

window.saveMaterial=function(sid){
 const s=data.subjects.find(x=>x.id===sid);if(!s)return;ensureSubjectShape(s);
 const type=$("#materialType").value,title=$("#materialTitle").value.trim(),text=$("#materialText").value.trim();
 if(!title&&!text)return alert("Schreib einen Titel oder Inhalt hinein.");
 if(type==="topic")s.topics.push({id:id(),title:title||"Neues Thema",text});
 else s.notes.push({id:id(),title:title||"Notiz",text});
 save();renderSubjectDetail();
}
window.editTopic=function(sid,tid){
 const s=data.subjects.find(x=>x.id===sid),t=s?.topics?.find(x=>x.id===tid);if(!t)return;
 openModal(`<h2>Thema bearbeiten</h2><label>Titel</label><input id="editMatTitle" value="${esc(t.title)}"><label style="margin-top:10px">Inhalt</label><textarea id="editMatText">${esc(t.text||"")}</textarea><button class="primary" style="margin-top:10px" onclick="saveTopicEdit('${sid}','${tid}')">Speichern</button>`);
}
window.saveTopicEdit=function(sid,tid){const s=data.subjects.find(x=>x.id===sid),t=s?.topics?.find(x=>x.id===tid);if(!t)return;t.title=$("#editMatTitle").value.trim()||"Thema";t.text=$("#editMatText").value.trim();save();closeModal();renderSubjectDetail()}
window.editNote=function(sid,nid){
 const s=data.subjects.find(x=>x.id===sid),n=s?.notes?.find(x=>x.id===nid);if(!n)return;
 openModal(`<h2>Notiz bearbeiten</h2><label>Titel</label><input id="editMatTitle" value="${esc(n.title||"Notiz")}"><label style="margin-top:10px">Inhalt</label><textarea id="editMatText">${esc(n.text||"")}</textarea><button class="primary" style="margin-top:10px" onclick="saveNoteEdit('${sid}','${nid}')">Speichern</button>`);
}
window.saveNoteEdit=function(sid,nid){const s=data.subjects.find(x=>x.id===sid),n=s?.notes?.find(x=>x.id===nid);if(!n)return;n.title=$("#editMatTitle").value.trim()||"Notiz";n.text=$("#editMatText").value.trim();save();closeModal();renderSubjectDetail()}
window.openCoverEditor=function(sid){
 const s=data.subjects.find(x=>x.id===sid);if(!s)return;ensureSubjectShape(s);
 openModal(`<h2>Notizbuch gestalten</h2>
 <p class="small">Abkürzung = weißes Feld · die zwei Farben ändern direkt dein Notebook.</p>
 <div class="coverPreview" style="--nb-light:${s.cover};--nb-dark:${s.color}">
   ${SUBJECT_NOTEBOOK_SVG}
   <span class="coverPreviewAbbr">${esc(s.abbr||defaultSubjectAbbr(s.name))}</span>
 </div>
 <div class="formGrid">
   <div><label>Fachname</label><input id="editSubjectName" value="${esc(s.name)}"></div>
   <div><label>Abkürzung</label><input id="editSubjectAbbr" maxlength="8" value="${esc(s.abbr||defaultSubjectAbbr(s.name))}"></div>
   <div><label>Hauptfarbe</label><input id="editCover" type="color" value="${s.cover}" oninput="previewNotebookColors()"></div>
   <div><label>Dunkle Akzentfarbe</label><input id="editFolderColor" type="color" value="${s.color}" oninput="previewNotebookColors()"></div>
   <div><label>Symbol</label><select id="editEmoji">${["🌸","🌷","🍀","🧸","⭐","🎀","🫐","🍓","📚","✏️"].map(e=>`<option ${e===s.emoji?"selected":""}>${e}</option>`).join("")}</select></div>
 </div>
 <button class="primary" style="margin-top:10px" onclick="saveCover('${sid}')">Speichern</button>`);
}
window.previewNotebookColors=function(){
 const p=document.querySelector(".coverPreview");if(!p)return;
 p.style.setProperty("--nb-light",$("#editCover")?.value||"#f4acc5");
 p.style.setProperty("--nb-dark",$("#editFolderColor")?.value||"#c8568e");
 const ab=p.querySelector(".coverPreviewAbbr");
 if(ab)ab.textContent=($("#editSubjectAbbr")?.value||"").trim();
}
window.saveCover=function(sid){
 const s=data.subjects.find(x=>x.id===sid);if(!s)return;
 const name=($("#editSubjectName")?.value||"").trim();
 if(name)s.name=name;
 s.abbr=($("#editSubjectAbbr")?.value||"").trim()||defaultSubjectAbbr(s.name);
 s.cover=$("#editCover").value;
 s.color=$("#editFolderColor").value;
 s.emoji=$("#editEmoji").value;
 save();closeModal();renderSubjectDetail();
}

const DBNAME="schoolbloom-files", STORE="files";
function dbOpen(){return new Promise((res,rej)=>{const r=indexedDB.open(DBNAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:"id"})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function dbPut(obj){const db=await dbOpen();return new Promise((res,rej)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(obj);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
async function dbGet(id){const db=await dbOpen();return new Promise((res,rej)=>{const r=db.transaction(STORE).objectStore(STORE).get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function dbDelete(id){const db=await dbOpen();return new Promise((res,rej)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(id);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}

async function storeEntityFiles(entity,fileList){
 entity.files ||= [];
 for(const f of [...fileList]){
   const fid=id(); await dbPut({id:fid,name:f.name,type:f.type,blob:f});
   entity.files.push({id:fid,name:f.name,type:f.type||"Datei"});
 }
}
window.openStoredFile=async function(fid){
 const obj=await dbGet(fid);if(!obj)return alert("Datei nicht gefunden.");
 const url=URL.createObjectURL(obj.blob),a=document.createElement("a");a.href=url;a.target="_blank";a.download=obj.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)
}
function fileChips(files=[]){
 return files.length?`<div class="attachmentRow">${files.map(f=>`<button class="attachmentChip" onclick="event.stopPropagation();openStoredFile('${f.id}')">📎 ${esc(f.name)}</button>`).join("")}</div>`:"";
}
window.addSubjectFiles=async function(sid,files){
 const s=data.subjects.find(x=>x.id===sid);if(!s)return;ensureSubjectShape(s);
 for(const f of [...files]){
   const fid=id(); await dbPut({id:fid,name:f.name,type:f.type,blob:f});
   s.files.push({id:fid,name:f.name,type:f.type||"Datei"});
 }
 save();renderSubjectDetail()
}
window.downloadSubjectFile=async function(sid,fid){
 const obj=await dbGet(fid);if(!obj)return alert("Datei nicht gefunden.");
 const url=URL.createObjectURL(obj.blob),a=document.createElement("a");a.href=url;a.download=obj.name;a.target="_blank";a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)
}
window.deleteSubjectFile=async function(sid,fid){
 const s=data.subjects.find(x=>x.id===sid);if(!s)return;await dbDelete(fid);s.files=(s.files||[]).filter(f=>f.id!==fid);save();renderSubjectDetail()
}

window.openAddAbsence=function(){
 openModal(`<h2>Abwesenheit</h2><div class="formGrid">
 <div><label>Von</label><input id="aFrom" type="date" value="${todayISO()}"></div>
 <div><label>Bis</label><input id="aTo" type="date" value="${todayISO()}"></div>
 <div><label>Grund</label><select id="aReason"><option>Krank</option><option>Arzttermin</option><option>Privat</option><option>Sonstiges</option></select></div>
 <div><label>Status</label><select id="aStatus"><option>Entschuldigung offen</option><option>Entschuldigt</option></select></div>
 <div class="full"><label>Notiz</label><textarea id="aNote"></textarea></div></div>
 <button class="primary" style="margin-top:12px" onclick="addAbsence()">Speichern</button>`)
}
window.addAbsence=function(){data.absences.push({id:id(),from:$("#aFrom").value,to:$("#aTo").value,reason:$("#aReason").value,status:$("#aStatus").value,note:$("#aNote").value.trim()});save();closeModal()}
window.toggleAbsence=function(i){const x=data.absences.find(x=>x.id===i);if(x){x.status=x.status==="Entschuldigt"?"Entschuldigung offen":"Entschuldigt";save()}}
window.deleteAbsence=i=>{data.absences=data.absences.filter(x=>x.id!==i);save()}


const timetableSlots=[
 {start:"08:00",end:"08:45"},
 {start:"08:45",end:"09:30"},
 {start:"09:45",end:"10:30"},
 {start:"10:30",end:"11:15"},
 {start:"11:30",end:"12:15"},
 {start:"12:15",end:"13:00"},
 {start:"13:30",end:"14:15"},
 {start:"14:15",end:"15:00"},
 {start:"15:00",end:"15:45"},
 {start:"15:45",end:"16:30"}
];
function fillCancelledSlots(lessons){
 // VERSION 63:
 // Studia darf NIE aus einer nicht erkannten/leeren PDF-Zelle
 // automatisch "Entfall" erfinden.
 // Nur Einträge, die wirklich aus der PDF gelesen wurden, werden gezeigt.
 return [...(lessons||[])];
}

function renderHome(){

 const timeToMin=t=>{
   const [hh,mm]=String(t||"00:00").split(":").map(Number);
   return hh*60+mm;
 };
 const minsText=n=>{
   const sec=Math.max(0,Math.ceil(Number(n||0)*60));
   const m=Math.floor(sec/60),s=sec%60;
   return `${m} Min. ${String(s).padStart(2,"0")} Sek.`;
 };
 const __now=new Date();
 const nowMin=__now.getHours()*60+__now.getMinutes()+__now.getSeconds()/60;
 const todayCode=dayCode(new Date());
 const todayLessons=expandLessonsForCountdown(mergeLessons(stableTimetableDay(
   applyEffectiveDisplayTimes((data.timetable.lessons||[]).filter(x=>x.day===todayCode))
 ))).sort((a,b)=>a.start.localeCompare(b.start));
 const breaksToday=getActivePauses();
 $("#todayDate").textContent=new Date().toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"long"});
 const today=dayCode(new Date()), lessons=fillCancelledSlots(mergeLessons((data.timetable.lessons||[]).filter(x=>x.day===today)));
 const now=new Date(),min=now.getHours()*60+now.getMinutes()+now.getSeconds()/60;
 let next=todayLessons.find(x=>x.raw!=="__ENTFALL__"&&timeToMin(x.end)>min);
 if(next){
  const raw=String(next.raw||"").replace(/\s+/g," ").trim();
  const specialTime=raw.match(/\b(\d{1,2}(?::\d{2})?\s*Uhr)\b/i);

  if((next.specialOnly||isSpecialScheduleText(raw)) && specialTime){
   let text=raw
     .replace(specialTime[0],"")
     .replace(/Klassenleitungs-\s*stunden/ig,"Klassenleitungsstunden")
     .replace(/Klassenleitungs\s+stunden/ig,"Klassenleitungsstunden")
     .replace(/\s+/g," ")
     .trim();

   const sm=specialTime[0].match(/(\d{1,2})(?::(\d{2}))?/);
   const specialMin=sm?Number(sm[1])*60+Number(sm[2]||0):null;
   const diff=specialMin!=null?specialMin-nowMin:null;

   $("#nextPanel").innerHTML=`<div class="eyebrow">Als Nächstes</div>
    <div style="font-size:27px;font-weight:950;letter-spacing:-.04em;margin-top:5px">${esc(specialTime[0])} · ${esc(text)}</div>
    ${diff!=null&&diff>0?`<div class="muted" style="margin-top:6px">in ${minsText(diff)}</div>`:""}`;
  }else{
   const current=todayLessons.find(l=>timeToMin(l.start)<=nowMin && nowMin<timeToMin(l.end));
   const activeBreak=breaksToday.find(b=>timeToMin(b.start)<=nowMin && nowMin<timeToMin(b.end));

   if(current){
     const p=splitCell(current.raw);
     const remaining=timeToMin(current.end)-nowMin;
     $("#nextPanel").innerHTML=`<div class="eyebrow">Jetzt</div>
      <div style="font-size:27px;font-weight:950;letter-spacing:-.04em;margin-top:5px">${esc(prettySubject(p.subject))}</div>
      <div class="muted" style="margin-top:6px">noch ${minsText(remaining)} · bis ${current.end} Uhr${p.room?" · "+esc(p.room):""}</div>`;
   }else if(activeBreak){
     const after=todayLessons.find(l=>timeToMin(l.start)>=timeToMin(activeBreak.end));
     const remaining=timeToMin(activeBreak.end)-nowMin;
     $("#nextPanel").innerHTML=`<div class="eyebrow">${esc(activeBreak.label)}</div>
      <div style="font-size:27px;font-weight:950;letter-spacing:-.04em;margin-top:5px">Noch ${minsText(remaining)}</div>
      <div class="muted" style="margin-top:6px">${after?`Nächste Stunde um ${after.start} Uhr`:`Danach frei`}</div>`;
   }else{
     const p=splitCell(next.raw);
     const diff=timeToMin(next.start)-nowMin;
     $("#nextPanel").innerHTML=`<div class="eyebrow">Als Nächstes</div>
      <div style="font-size:27px;font-weight:950;letter-spacing:-.04em;margin-top:5px">Nächste Stunde: ${esc(prettySubject(p.subject))}</div>
      <div class="muted" style="margin-top:6px">${diff>0?`in ${minsText(diff)} · `:""}${next.start} Uhr${p.room?" · "+esc(p.room):""}</div>`;
   }
  }
 }else $("#nextPanel").innerHTML=`<div class="eyebrow">Heute</div><div style="font-size:25px;font-weight:900;margin-top:5px">Kein weiterer Unterricht.</div>`;
 $("#todayLessons").innerHTML=lessons.length?renderLessonsWithPauses(lessons):'<div class="empty">Heute kein Unterricht.</div>';
 const openHW=data.homework.filter(x=>!x.done).length, upcoming=data.tests.filter(x=>x.date>=todayISO()).length;
 const avg=gradeAverage(data.grades);
 $("#homeKpis").innerHTML=`<div class="kpi"><div class="big">${openHW}</div><div class="small">Hausaufgaben offen</div></div>
 <div class="kpi"><div class="big">${upcoming}</div><div class="small">Tests geplant</div></div>
 <div class="kpi"><div class="big">${avg?avg.toFixed(2).replace(".",","):"–"}</div><div class="small">Notenschnitt</div></div>`;
 const items=[
  ...data.homework.filter(x=>!x.done).map(x=>({kind:"hw",date:x.due,subject:x.subject,text:x.text,id:x.id})),
  ...data.tests.filter(x=>x.date>=todayISO()).map(x=>({kind:"test",date:x.date,subject:x.subject,text:x.type,id:x.id}))
 ].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
 $("#homeOpen").innerHTML=items.length?items.map(x=>`<div class="card rowBetween"><div><b>${esc(x.subject)} · ${esc(x.text)}</b><div class="small">${fmtDate(x.date)}${x.kind==="test"?` · ${daysUntilLabel(x.date)}`:""}</div></div><span class="badge ${x.kind==="test"?"warn":""}">${x.kind==="test"?"Test":"Aufgabe"}</span></div>`).join(""):'<div class="empty">Alles erledigt 🎉</div>';
}
function isLessonCurrentNow(l){
 if(!l||l.specialOnly||l.cancelledFromBasis)return false;
 const dc=dayCode(new Date());
 if(!dc||l.day!==dc)return false;
 const toMin=t=>{const [h,m]=String(t||"00:00").split(":").map(Number);return h*60+m};
 const now=new Date(),m=now.getHours()*60+now.getMinutes();
 return toMin(l.start)<=m && m<toMin(l.end);
}
function lessonHtml(l){
 const rawText=String(l.raw||"").replace(/\s+/g," ").trim();

 if(l.cancelledFromBasis){
   const p=splitCell(rawText);
   const teacher=p.teacher||p.meta||"";
   const blocks=Math.max(1,Number(l.blocks||1));
   return `<div class="lesson cancelled basisCancelled" style="--subject:#d6cfc9">
     <div class="time">${l.start}<br>${l.end}</div>
     <div>
       <div class="cancelTag">Entfall</div>
       <div class="subject cancelledSubject">${esc(prettySubject(p.subject||rawText))}</div>
       ${teacher?`<div class="small cancelledTeacher">🎀 ${esc(teacher)}</div>`:""}
       ${blocks>1?`<div class="doubleBadge cancelledBadge">▥ ${blocks===2?"Doppelstunde":blocks+" Stunden"}</div>`:""}
     </div>
     ${p.room?`<div class="room cancelledRoom">${esc(p.room)}</div>`:`<div class="room">—</div>`}
   </div>`;
 }

 // Entfall/Ausfall nur dann, wenn genau das in der PDF steht.
 const explicitCancelled=/\b(entfall|entfällt|ausfall|fällt\s+aus)\b/i.test(rawText);
 if(explicitCancelled){
   return `<div class="lesson cancelled" style="--subject:#d6cfc9">
     <div class="time">${l.start}<br>${l.end}</div>
     <div><div class="subject">${esc(rawText)}</div></div>
     <div class="room">—</div>
   </div>`;
 }

 const p=splitCell(rawText),teacher=p.teacher||p.meta||"",key=lessonKey(l),extra=data.lessonExtras[key]||{};
 const count=(extra.notes?.length||0)+(extra.tasks?.length||0)+(extra.files?.length||0);
 const double=(l.isDouble||Number(l.blocks)>=2);
 const splitMulti=!!l.splitFromMulti && Number(l.originalBlocks||1)>=2;

 if(p.special||l.specialOnly){
   let label=String(p.subject||rawText).replace(/\s+/g," ").trim();
   label=label.replace(/Klassenleitungs-\s*stunden/ig,"Klassenleitungsstunden")
              .replace(/Klassenleitungs\s+stunden/ig,"Klassenleitungsstunden");
   const hasOwnTime=/\b\d{1,2}(?::\d{2})?\s*Uhr\b/i.test(label);

   return `<div class="lesson specialLesson" style="--subject:#e9c887">
     ${hasOwnTime?"":`<div class="time">${l.start}<br>${l.end}</div>`}
     <div style="${hasOwnTime?"grid-column:1/-1":""}">
       <div class="subject">${esc(label)}</div>
     </div>
   </div>`;
 }

 return `<div class="lesson lessonClickable ${double?"doubleLesson":""} ${l.changedFromBasis?"changedLesson":""} ${isLessonCurrentNow(l)?"currentLesson":""}" style="--subject:${timetableSubjectColor(p.subject)}" onclick='openLessonDetails(${JSON.stringify(JSON.stringify(l))})'>
   <div class="time">${l.start}<br>${l.end}</div>
   <div>
     ${l.changedFromBasis?`<div class="changeTag">geändert</div>`:""}<div class="subject">${esc(prettySubject(p.subject))}</div>
     <div class="small">${teacher?`🎀 ${esc(teacher)}`:""}</div>
     ${double?`<div class="doubleBadge">▥ ${(l.blocks||2)>2?(l.blocks+" Stunden"):"Doppelstunde"}</div>`:splitMulti?`<div class="doubleBadge splitMultiBadge">▥ ${Number(l.originalBlocks)===2?"Doppelstunde":l.originalBlocks+" Stunden"} · ${l.splitIndex}/${l.originalBlocks}</div>`:""}
     ${count?`<div class="lessonBadge"><span class="lessonExtraDot">✿ ${count} Eintrag${count===1?"":"e"}</span></div>`:""}
   </div>
   ${p.room?`<div class="room">${esc(p.room)}</div>`:""}
 </div>`;
}


function stableTimetableDay(list){
 const src=[...(list||[])].sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end));
 const exactSeen=new Set();
 const out=[];

 for(const l of src){
   const exact=[l.day,l.start,l.end,String(l.raw||"").replace(/\s+/g," ").trim(),!!l.specialOnly].join("|");
   if(exactSeen.has(exact))continue;
   exactSeen.add(exact);

   // Same PDF row / same start can never contain two different lessons
   // for one class. Keep the stronger geometry candidate.
   const clash=out.findIndex(x=>
     x.day===l.day &&
     !x.specialOnly && !l.specialOnly &&
     ((x.rowNum!=null&&l.rowNum!=null&&x.rowNum===l.rowNum) || x.start===l.start)
   );

   if(clash<0){out.push(l);continue}

   const old=out[clash];
   const score=x=>
     Number(x.geometryConfidence||0)*10 +
     (Number(x.blocks||1)>1?2:0) +
     (x.gridExact?1:0) +
     (String(x.raw||"").trim()?0.5:0);

   if(score(l)>score(old))out[clash]=l;
 }
 return out.sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end));
}
function renderDesktopWeekPlan(){
 const selectedClass=data.timetable.selectedClass||data.settings.className||"M U1";
 const viewLessons=timetableViewMode==="basis"?basisScheduleForClass(selectedClass):currentScheduleForClass(selectedClass);
 const today=dayCode(new Date());
 const dayHtml=d=>{
   const rawDay=stableTimetableDay(applyEffectiveDisplayTimes((viewLessons||[]).filter(x=>x.day===d)));
   const specialOnly=rawDay.filter(x=>x.specialOnly),normal=rawDay.filter(x=>!x.specialOnly);
   if(specialOnly.length&&!normal.length){
     return specialOnly.map(x=>{
       const raw=cleanPdfCellText(x.raw),tm=raw.match(/^(\d{1,2}(?::\d{2})?\s*Uhr)\s*(.*)$/i),time=tm?tm[1]:"";
       let txt=tm?tm[2]:raw;
       txt=txt.replace(/Klassenleitungs-\s*stunden/ig,"Klassenleitungsstunden").replace(/Klassenleitungs\s+stunden/ig,"Klassenleitungsstunden");
       return `<div class="specialOnlyDay"><div class="specialOnlyCard">${time?`<div class="specialTime">${esc(time)}</div>`:""}<div class="specialText">${esc(txt)}</div></div></div>`;
     }).join("");
   }
   const ls=mergeLessons(rawDay.filter(x=>timetableViewMode==="basis"?!x.cancelledFromBasis:true));
   return ls.length?renderLessonsWithPauses(ls):'<div class="empty">Kein Unterricht.</div>';
 };
 return `<div class="desktopWeekGrid">${dayOrder.map(d=>`<section class="desktopWeekDay ${d===today?"today":""}"><div class="desktopWeekHead"><div><b>${dayNames[d]}</b><small>${d===today?"Heute":""}</small></div><span>${d}</span></div><div class="desktopWeekBody">${dayHtml(d)}</div></section>`).join("")}</div>`;
}
function renderPlan(){
 const basisSavedText=data.timetable?.basisSavedAt
   ? ` · gespeichert ${new Date(data.timetable.basisSavedAt).toLocaleDateString("de-DE")}`
   : "";
 $("#planStatus").textContent=data.timetable.isPlaceholder
   ? "Automatischer Stundenplan wird vorbereitet."
   : timetableViewMode==="basis"
     ? `Basisplan · regulärer Normalplan${basisSavedText}${isHeatScheduleActive()?" · ☀️ Hitzestunden":""}.`
     : `Aktueller Plan & Änderungen${data.timetable.sourceLabel?" · "+data.timetable.sourceLabel:""}${isHeatScheduleActive()?" · ☀️ Hitzestunden aktiv":""}.`;

 $("#placeholderBanner").style.display=data.timetable.isPlaceholder?"block":"none";

 const picker=$("#planClassPicker");
 if(picker){
   const classes=data.timetable.classes||[];
   picker.innerHTML=classes.length
     ? classes.map(c=>`<option value="${esc(c)}" ${c===data.timetable.selectedClass?"selected":""}>${esc(c)}</option>`).join("")
     : `<option>${esc(data.settings.className||"M U1")}</option>`;
 }

 $("#dayTabs").innerHTML=dayOrder.map(d=>`<button class="tab ${d===selectedDay?"active":""}" data-day="${d}">${dayNames[d]}</button>`).join("");
 $$("#dayTabs .tab").forEach(b=>b.onclick=()=>{selectedDay=b.dataset.day;renderPlan()});

 $$("#planModeSwitch button").forEach(x=>x.classList.toggle("active",x.dataset.planmode===timetableViewMode));
 updateHeatModeUI();
 const hint=$("#planModeHint");
 if(hint)hint.dataset.mode=timetableViewMode;

 if(window.innerWidth>=980){
   $("#planLessons").innerHTML=renderDesktopWeekPlan();
   return;
 }

 const selectedClass=data.timetable.selectedClass||data.settings.className||"M U1";
 const viewLessons=timetableViewMode==="basis"
   ? basisScheduleForClass(selectedClass)
   : currentScheduleForClass(selectedClass);
 const rawDay=stableTimetableDay(
   applyEffectiveDisplayTimes((viewLessons||[]).filter(x=>x.day===selectedDay))
 );

 // Wenn der Tag ausschließlich eine organisatorische Sondernotiz enthält,
 // KEINE erfundenen Stunden und KEIN Entfall erzeugen.
 const specialOnly=rawDay.filter(x=>x.specialOnly);
 const normal=rawDay.filter(x=>!x.specialOnly);

 if(specialOnly.length && !normal.length){
   $("#planLessons").innerHTML=specialOnly.map(x=>{
     const raw=cleanPdfCellText(x.raw);
     const tm=raw.match(/^(\d{1,2}(?::\d{2})?\s*Uhr)\s*(.*)$/i);
     const time=tm?tm[1]:"";
     let text=tm?tm[2]:raw;
     text=text.replace(/Klassenleitungs-\s*stunden/ig,"Klassenleitungsstunden")
              .replace(/Klassenleitungs\s+stunden/ig,"Klassenleitungsstunden");

     return `<div class="specialOnlyDay"><div class="specialOnlyCard">
       ${time?`<div class="specialTime">${esc(time)}</div>`:""}
       <div class="specialText">${esc(text)}</div>
     </div></div>`;
   }).join("");
   return;
 }

 const ls=mergeLessons(rawDay.filter(x=>timetableViewMode==="basis"?!x.cancelledFromBasis:true));
 $("#planLessons").innerHTML=ls.length?renderLessonsWithPauses(ls):'<div class="empty">Kein Unterricht.</div>';
}

function renderTasks(){
 $("[data-taskfilter].active")?.classList.remove("active");$(`[data-taskfilter="${taskFilter}"]`)?.classList.add("active");
 $$("[data-taskfilter]").forEach(b=>b.onclick=()=>{taskFilter=b.dataset.taskfilter;renderTasks()});
 let hw=data.homework.filter(x=>taskFilter==="all"|| (taskFilter==="open"?!x.done:x.done)).sort((a,b)=>a.due.localeCompare(b.due));
 $("#homeworkList").innerHTML=hw.length?hw.map(x=>`<div class="card row"><button class="checkbox ${x.done?"done":""}" onclick="toggleHomework('${x.id}')">${x.done?"✓":""}</button><div style="flex:1"><b class="${x.done?"doneText":""}">${esc(x.subject)} · ${esc(x.text)}</b><div class="small">Fällig ${fmtDate(x.due)}${x.note?" · "+esc(x.note):""}</div>${fileChips(x.files)}</div><button class="dangerBtn" onclick="deleteHomework('${x.id}')">×</button></div>`).join(""):'<div class="empty">Keine Aufgaben.</div>';
 const tests=[...data.tests].sort((a,b)=>a.date.localeCompare(b.date));
 $("#testList").innerHTML=tests.length?tests.map(x=>{
   const days=calendarDaysUntil(x.date);
   const left=daysUntilLabel(x.date);
   return `<div class="card rowBetween"><div><b>${esc(x.subject)} · ${esc(x.type)}</b><div class="small">${fmtDate(x.date)}${left?` · ${left}`:""}${x.text?" · "+esc(x.text):""}${Number(x.reminder)>0?` · Erinnerung ${x.reminder} T vorher`:""}</div>${fileChips(x.files)}</div><div class="row"><span class="badge ${days!=null&&days>=0?"warn":""}">${left||"–"}</span><button class="dangerBtn" onclick="deleteTest('${x.id}')">×</button></div></div>`;
 }).join(""):'<div class="empty">Noch keine Tests eingetragen.</div>';
}
function gradeAverage(gs){if(!gs.length)return null;const w=gs.reduce((s,x)=>s+x.weight,0);return gs.reduce((s,x)=>s+x.grade*x.weight,0)/w}
function renderGrades(){
 const avg=gradeAverage(data.grades), by={};for(const g of data.grades)(by[g.subject]||(by[g.subject]=[])).push(g);
 const subjectAvgs=Object.entries(by).map(([s,gs])=>({s,a:gradeAverage(gs),n:gs.length}));
 $("#gradeSummary").innerHTML=`<div class="kpi"><div class="big">${avg?avg.toFixed(2).replace(".",","):"–"}</div><div class="small">Gesamtschnitt</div></div><div class="kpi"><div class="big">${data.grades.length}</div><div class="small">Noten eingetragen</div></div>`;
 $("#gradeList").innerHTML=subjectAvgs.length?subjectAvgs.map(x=>`<div class="card"><div class="rowBetween"><div><b>${esc(x.s)}</b><div class="small">${x.n} ${x.n===1?"Note":"Noten"}</div></div><div class="gradeNum">${x.a.toFixed(2).replace(".",",")}</div></div><div class="stack" style="margin-top:10px">${by[x.s].map(g=>`<div class="grade"><div><b>${esc(g.text||"Note")}</b><div class="small">${fmtDate(g.date)} · ${g.weight}×</div></div><div class="gradeNum">${String(g.grade).replace(".",",")}</div><button class="dangerBtn" onclick="deleteGrade('${g.id}')">×</button></div>`).join("")}</div></div>`).join(""):'<div class="empty">Noch keine Noten.</div>';
}

const shopItems=[
 {id:"plant",name:"Blumentopf",emoji:"🪴",price:35,type:"decor",x:"10%",y:"55%"},
 {id:"lamp",name:"Lampe",emoji:"🛋️",price:55,type:"decor",x:"72%",y:"56%"},
 {id:"bear-bed",name:"Bärchen-Bett",emoji:"🧺",price:80,type:"decor",x:"20%",y:"68%"},
 {id:"flowers",name:"Blumen",emoji:"🌷",price:25,type:"decor",x:"65%",y:"24%"},
 {id:"room-pink",name:"Rosa Wohnung",emoji:"🏠",price:180,type:"room"},
 {id:"bow",name:"Schleife fürs Pet",emoji:"🎀",price:45,type:"pet"}
];
function renderPetRoom(){
 const room=$("#petRoomMini");if(!room)return;
 const owned=data.economy.owned||[],equipped=data.economy.equipped||[],pink=owned.includes("room-pink");
 room.style.background=pink?"linear-gradient(#f7d9df 0 65%,#e0c298 65%)":"linear-gradient(#f8e6e4 0 65%,#e3c99e 65%)";
 room.innerHTML=`<div class="window"></div><div class="rug"></div><div class="petShelf">📚</div><div class="petPlant">🌷</div><div class="petAvatarCute"><div class="petEar left"></div><div class="petEar right"></div>${owned.includes("bow")?'<div class="petBow">🎀</div>':""}<div class="petFace">• ᴥ •</div><div class="petBlush left"></div><div class="petBlush right"></div></div>`+
 shopItems.filter(x=>x.type==="decor"&&equipped.includes(x.id)).map(x=>`<span class="roomItem" style="left:${x.x};top:${x.y}">${x.emoji}</span>`).join("");
}
window.openPetShop=function(){
 const items=shopItems.map(x=>{
   const owned=(data.economy.owned||[]).includes(x.id),equipped=(data.economy.equipped||[]).includes(x.id);
   return `<button class="shopItem" onclick="${owned?`toggleEquip('${x.id}')`:`buyItem('${x.id}')`}"><b>${x.emoji} ${x.name}</b><div class="price">${owned?(x.type==="decor"?(equipped?"Im Zimmer · antippen zum Entfernen":"Gekauft · ins Zimmer stellen"):"Gekauft"):`🪙 ${x.price}`}</div></button>`
 }).join("");
 openModal(`<div class="rowBetween"><h2>Pet Shop 🧸</h2><span class="badge coin">🪙 ${data.economy.coins||0}</span></div>
 <p class="small">Du verdienst 1 Münze pro gelernter Minute.</p><div class="shopGrid">${items}</div>`);
}
window.buyItem=function(itemId){
 const it=shopItems.find(x=>x.id===itemId);if(!it)return;
 if((data.economy.coins||0)<it.price)return alert("Noch nicht genug Münzen 🌷");
 data.economy.coins-=it.price;data.economy.owned.push(it.id);
 if(it.type==="decor")data.economy.equipped.push(it.id);
 save();openPetShop()
}
window.toggleEquip=function(itemId){
 const it=shopItems.find(x=>x.id===itemId);if(!it||it.type!=="decor")return;
 const a=data.economy.equipped||(data.economy.equipped=[]),i=a.indexOf(itemId);if(i>=0)a.splice(i,1);else a.push(itemId);
 save();openPetShop()
}

function studyMinutesToday(){return Math.round(data.studySessions.filter(x=>x.date===todayISO()).reduce((s,x)=>s+x.minutes,0))}
function renderStudy(){
 $("#studyTodayBadge").textContent=`${studyMinutesToday()} min heute`;
 const cb=$("#coinBadge");if(cb)cb.textContent=`🪙 ${data.economy.coins||0}`;
 renderPetRoom();
 renderFlash();
}
function renderFlash(){
 const area=$("#flashArea");if(!area)return;
 const decks=data.flashDecks||[];
 area.innerHTML=decks.length?`<div class="deckGrid">${decks.map(d=>`<button class="deckCard" onclick="openDeck('${d.id}')"><div class="deckIcon">${esc(d.emoji||"🌸")}</div><div class="deckName">${esc(d.name)}</div><div class="deckMeta">${esc(d.subject)} · ${data.flashcards.filter(c=>c.deckId===d.id).length} Karten</div></button>`).join("")}</div>`:'<div class="empty">Erstelle in einem Fach → Thema deinen ersten Karteikarten-Ordner.</div>';
}

window.smartTimerButton=function(){
 if(timer.running){toggleTimer();return}
 const mins=Math.max(1,Math.min(240,Number($("#focusMinutes")?.value||25)));
 if(timer.mode!=="focus" || timer.seconds===timer.goal){timer.mode="focus";timer.goal=mins*60;timer.seconds=mins*60;renderTimer()}
 toggleTimer();
}
window.startCustomFocus=function(){
 const mins=Math.max(1,Math.min(240,Number($("#focusMinutes")?.value||25)));
 clearInterval(timer.handle);timer.running=false;timer.handle=null;timer.mode="focus";timer.goal=mins*60;timer.seconds=mins*60;renderTimer();toggleTimer();
}
window.startCustomBreak=function(){
 const mins=Math.max(1,Math.min(60,Number($("#breakMinutes")?.value||5)));
 clearInterval(timer.handle);timer.running=false;timer.handle=null;timer.mode="break";timer.goal=mins*60;timer.seconds=mins*60;renderTimer();toggleTimer();
}

window.toggleTimer=function(){
 timer.running=!timer.running;$("#timerBtn").textContent=timer.running?"Ⅱ Pause":"▶ Start";
 if(timer.running){timer.startedAt=Date.now();timer.handle=setInterval(()=>{timer.seconds--;if(timer.seconds<=0){completeTimer();return}renderTimer()},1000)}
 else{clearInterval(timer.handle);timer.handle=null}
}
function completeTimer(){
 clearInterval(timer.handle);timer.running=false;timer.handle=null;
 if(timer.mode==="focus"){
   const mins=Math.round(timer.goal/60);data.studySessions.push({id:id(),date:todayISO(),minutes:mins});
   data.economy.coins=(data.economy.coins||0)+mins;
   alert(`Geschafft! +${mins} Münzen 🪙`);
   const b=Math.max(1,Math.min(60,Number($("#breakMinutes")?.value||5)));timer.mode="break";timer.goal=b*60;timer.seconds=b*60;
 }else{alert("Pause vorbei 🌷");const f=Math.max(1,Math.min(240,Number($("#focusMinutes")?.value||25)));timer.mode="focus";timer.goal=f*60;timer.seconds=f*60}
 save();renderTimer();$("#timerBtn").textContent="▶ Start";renderStudy()
}
window.startBreak=function(mins){
 clearInterval(timer.handle);timer.running=false;timer.handle=null;timer.mode="break";timer.goal=mins*60;timer.seconds=mins*60;$("#timerBtn").textContent="▶ Start";renderTimer()
}
window.resetTimer=function(){clearInterval(timer.handle);timer.running=false;timer.handle=null;const f=Math.max(1,Math.min(240,Number($("#focusMinutes")?.value||25)));timer.mode="focus";timer.goal=f*60;timer.seconds=f*60;renderTimer();$("#timerBtn").textContent="▶ Start"}
function renderTimer(){const m=Math.floor(timer.seconds/60),s=timer.seconds%60;$("#timerDisplay").textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;const l=$("#timerModeLabel");if(l)l.textContent=timer.mode==="focus"?"Fokus · fürs Lernen bekommst du Münzen.":"Pause 🌷 · erhol dich kurz."}

const SUBJECT_NOTEBOOK_SVG=`<svg class="subjectNotebookSvg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 1500">
  <defs>
    
  </defs>
  <rect class="cls-3" x="335.96" y="250.98" width="884.21" height="1059.65" rx="60.73" ry="60.73"/>
  <rect class="cls-3" x="307.89" y="220.18" width="884.21" height="1059.65" rx="42.98" ry="42.98"/>
  <g>
    <rect class="cls-4" x="223.74" y="325.44" width="166.67" height="68.42" rx="34.21" ry="34.21"/>
    <rect class="cls-4" x="223.74" y="481.58" width="166.67" height="68.42" rx="34.21" ry="34.21"/>
    <rect class="cls-4" x="223.74" y="637.72" width="166.67" height="68.42" rx="34.21" ry="34.21"/>
    <rect class="cls-4" x="223.74" y="793.86" width="166.67" height="68.42" rx="34.21" ry="34.21"/>
    <rect class="cls-4" x="223.74" y="950" width="166.67" height="68.42" rx="34.21" ry="34.21"/>
    <rect class="cls-4" x="223.74" y="1106.14" width="166.67" height="68.42" rx="34.21" ry="34.21"/>
  </g>
  <rect class="cls-1" x="417.02" y="341.46" width="680.7" height="238.6" rx="119.3" ry="119.3"/>
  <g>
    <g>
      <path class="cls-2" d="M747.47,973.96c2.58,26.52,15.72,155.87,41.81,201.25,3.62,6.29,11,18.76,22.15,19.74,13.65,1.21,17.36-15.46,39.4-25.67,24.37-11.28,41.68-.86,51.09-13.06,4.99-6.47,5.01-15.73,1.42-30.3-9.31-37.76-31.05-62.98-44.75-79.73-15.61-19.07-37.21-47.19-61.29-84.88-16.6,4.21-33.21,8.43-49.81,12.64Z"/>
      <path class="cls-2" d="M752.56,974.06c-3.61,26.4-21.77,155.14-49.6,199.48-3.86,6.14-11.72,18.31-22.9,18.87-13.69.68-16.74-16.12-38.37-27.18-23.91-12.22-41.61-2.48-50.54-15.04-4.73-6.65-4.4-15.91-.24-30.33,10.77-37.37,33.47-61.73,47.82-77.93,16.33-18.45,39.01-45.71,64.55-82.43,16.43,4.86,32.86,9.71,49.28,14.57Z"/>
    </g>
    <g>
      <path class="cls-2" d="M753.92,958.75c13.02,26.66,37.74,40.74,49.23,47.11,20.19,11.18,68.32,37.84,113.46,20.94,59.13-22.15,61.37-99.69,61.74-112.62.61-21.29,1.81-62.6-29.36-83.47-38.23-25.61-96.57-1.31-113.58,5.78-32.58,13.57-50.01,33.14-71.61,57.39-7.66,8.61-14.5,17.58-16.61,30.13-2.57,15.3,3.27,27.67,6.73,34.76Z"/>
      <path class="cls-2" d="M746.71,958.61c-14.05,26.13-39.29,39.24-51.02,45.16-20.61,10.39-69.74,35.16-114.19,16.51-58.22-24.43-57.44-102-57.31-114.93.21-21.3.63-62.62,32.58-82.27,39.2-24.1,96.55,2.45,113.27,10.19,32.03,14.83,48.69,35.06,69.33,60.13,7.32,8.9,13.81,18.13,15.43,30.75,1.98,15.39-4.34,27.52-8.08,34.47Z"/>
    </g>
    <path class="cls-2" d="M750.43,961.95c12.52.61,37.19-1.37,42.42-14.29,2.56-6.31-2.23-8.57-.29-22.76,1.23-8.96,3.79-12.8,2.19-20.08-.18-.8-1.49-6.53-5.6-11.37-7.69-9.06-20.24-9.28-36.46-9.56-16.24-.28-29.6-.52-37.98,8.69-4.16,4.57-5.81,10.04-5.92,10.42-2.03,7,.27,10.74.39,20.01.16,11.74-3.43,12.79-2.23,18.22,2.92,13.19,26.99,19.91,43.48,20.72Z"/>
    <g>
      <path class="cls-2" d="M709.43,924.76c-11.06-3.28-24.06-6.32-38.75-8.26-10.56-1.4-20.36-2.01-29.21-2.14"/>
      <path class="cls-2" d="M792.49,926.38c11.18-2.85,24.28-5.38,39.04-6.75,10.6-.98,20.42-1.22,29.27-1"/>
    </g>
  </g>
</svg>`;
function renderSubjects(){
 data.subjects.forEach(ensureSubjectShape);
 $("#subjectList").className="notebookGrid";
 $("#subjectList").innerHTML=data.subjects.length?data.subjects.map(s=>{
   ensureSubjectShape(s);
   const light=s.cover||"#f4acc5";
   const dark=s.color||"#c8568e";
   const abbr=s.abbr||defaultSubjectAbbr(s.name);
   return `<button class="notebook newSvgNotebook" style="--nb-light:${light};--nb-dark:${dark}" onclick="openSubject('${s.id}')">
     <span class="notebookVisual">
       <span class="notebookArt">${SUBJECT_NOTEBOOK_SVG}</span>
       <span class="notebookAbbr">${esc(abbr)}</span>
     </span>
     <span class="notebookBelow">
       <strong>${esc(s.name)}</strong>
       <small>${(s.topics||[]).length} Themen · ${(s.files||[]).length} Dateien</small>
     </span>
   </button>`;
 }).join(""):'<div class="empty">Noch keine Fächer.</div>';
}
function daysBetween(a,b){return Math.max(1,Math.round((new Date(b)-new Date(a))/86400000)+1)}
function renderAbsence(){
 const total=data.absences.reduce((s,x)=>s+daysBetween(x.from,x.to),0),open=data.absences.filter(x=>x.status!=="Entschuldigt").length;
 $("#absenceSummary").innerHTML=`<div class="kpi"><div class="big">${total}</div><div class="small">Fehltage eingetragen</div></div><div class="kpi"><div class="big">${open}</div><div class="small">Entschuldigungen offen</div></div>`;
 $("#absenceList").innerHTML=data.absences.length?data.absences.map(x=>`<div class="card rowBetween"><div><b>${esc(x.reason)}</b><div class="small">${fmtDate(x.from)}${x.to!==x.from?" – "+fmtDate(x.to):""}${x.note?" · "+esc(x.note):""}</div></div><div class="row"><button class="badge ${x.status==="Entschuldigt"?"good":"warn"}" onclick="toggleAbsence('${x.id}')">${esc(x.status)}</button><button class="dangerBtn" onclick="deleteAbsence('${x.id}')">×</button></div></div>`).join(""):'<div class="empty">Keine Abwesenheiten.</div>';
}

window.enableNotifications=async function(){
 const standalone=window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone===true;
 if(!standalone){
   return alert("Auf dem iPhone funktionieren Studia-Benachrichtigungen erst als Home-Bildschirm-App. In Safari: Teilen → Zum Home-Bildschirm → Studia von dort öffnen → dann hier erneut tippen.");
 }
 if(!("Notification" in window)) return alert("Benachrichtigungen sind auf diesem Gerät/Web-App-Modus nicht verfügbar.");
 const perm=await Notification.requestPermission(); updateNotificationUI();
 if(perm==="granted"){
   const reg=await navigator.serviceWorker.ready;
   await reg.showNotification("Studia 🌷",{body:"Erinnerungen sind jetzt aktiviert.",icon:"./icon-192.png"});
 }
}
window.testNotification=async function(){
 const standalone=window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone===true;
 if(!standalone)return alert("Bitte Studia zuerst zum Home-Bildschirm hinzufügen und von dort öffnen.");
 if(Notification.permission!=="granted")return enableNotifications();
 const reg=await navigator.serviceWorker.ready;
 await reg.showNotification("Studia 🎀",{body:"Die Test-Erinnerung funktioniert!",icon:"./icon-192.png"});
}
function updateNotificationUI(){
 const el=$("#notificationState");if(!el||!("Notification" in window))return;
 const standalone=window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone===true;
 if(!standalone){el.textContent="📱 Auf iPhone: Safari → Teilen → Zum Home-Bildschirm. Danach Studia als App öffnen und hier aktivieren.";return}
 const p=Notification.permission;
 el.textContent=p==="granted"?"✓ Benachrichtigungen sind aktiviert.":p==="denied"?"Benachrichtigungen wurden blockiert.":"Benachrichtigungen können jetzt aktiviert werden.";
}
function reminderKey(type,id,date){return `${type}|${id}|${date}`}
function checkReminders(){
 if(!("Notification" in window)||Notification.permission!=="granted")return;
 const now=new Date(), today=todayISO();
 const sent=JSON.parse(localStorage.getItem("schoolbloom-sent-reminders")||"{}");
 for(const t of data.tests){
   const days=calendarDaysUntil(t.date,now);
   if(days!=null && days>=0 && days<=Number(t.reminder||1)){
     const k=reminderKey("test",t.id,today);
     if(!sent[k]){new Notification(`📚 ${t.subject}: ${t.type}`,{body:days===0?"Heute!":`In ${days} Tag${days===1?"":"en"}${t.text?" · "+t.text:""}`});sent[k]=1}
   }
 }
 for(const x of data.homework.filter(x=>!x.done)){
   if(x.due===today){
     const k=reminderKey("hw",x.id,today);
     if(!sent[k]){new Notification(`📝 Hausaufgabe: ${x.subject}`,{body:x.text});sent[k]=1}
   }
 }
 localStorage.setItem("schoolbloom-sent-reminders",JSON.stringify(sent));
}
setInterval(checkReminders,60000);
setTimeout(checkReminders,2500);


const themes={
 blossom:{bg:"#fff5f4",accent:"#efaaa6",text:"#66584f"},
 matcha:{bg:"#f7f8ed",accent:"#a8c687",text:"#59634f"},
 lavender:{bg:"#faf5ff",accent:"#bca5dc",text:"#61586b"},
 sky:{bg:"#f3f9ff",accent:"#94bfe3",text:"#516373"}
};
function applyCustomization(){
 const t=themes[data.customization?.theme||"blossom"]||themes.blossom;
 document.documentElement.style.setProperty("--bg",t.bg);
 document.documentElement.style.setProperty("--accent",t.accent);
 document.documentElement.style.setProperty("--text",t.text);
 document.body.classList.toggle("compact",!!data.customization?.compact);
}
window.saveCustomization=function(){
 data.customization.theme=$("#themeSwatches .active")?.dataset.theme||data.customization.theme||"blossom";
 data.customization.compact=$("#compactToggle").checked;save();applyCustomization();alert("Design gespeichert 🌷")
}

function renderSettings(){
 updateNotificationUI();updateAIStatus();
 $("#setName").value=data.settings.name||"";$("#setClass").value=data.settings.className||"";$("#setSchool").value=data.settings.school||"";$("#setPet").value=data.settings.pet||"on";$("#setPdf").value=data.settings.pdf||"";
 $$("#profileType button").forEach(b=>b.classList.toggle("active",b.dataset.type===data.settings.type));
 $$("#profileType button").forEach(b=>b.onclick=()=>{$$("#profileType button").forEach(x=>x.classList.remove("active"));b.classList.add("active");data.settings.type=b.dataset.type});
 $$("#themeSwatches .themeSwatch").forEach(b=>{b.classList.toggle("active",b.dataset.theme===(data.customization?.theme||"blossom"));b.onclick=()=>{$$("#themeSwatches .themeSwatch").forEach(x=>x.classList.remove("active"));b.classList.add("active")}});
 if($("#compactToggle"))$("#compactToggle").checked=!!data.customization?.compact;
}
window.saveSettings=function(){data.settings.name=$("#setName").value.trim();data.settings.className=$("#setClass").value.trim()||"M U1";data.settings.school=$("#setSchool").value.trim();data.settings.pet=$("#setPet").value;data.settings.pdf=$("#setPdf").value.trim();data.timetable.selectedClass=data.settings.className;
 if(data.timetable.schedules){
   const k=Object.keys(data.timetable.schedules).find(x=>x.replace(/\s+/g," ").toUpperCase()===data.settings.className.replace(/\s+/g," ").toUpperCase());
   if(k){data.timetable.selectedClass=k;data.timetable.lessons=data.timetable.schedules[k]}
 }
 save();renderAll();alert("Gespeichert")}
window.exportData=function(){
 const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="schoolhub-backup.json";a.click();URL.revokeObjectURL(a.href)
}
$("#importData").onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{data=JSON.parse(await f.text());save();alert("Backup importiert")}catch{alert("Backup konnte nicht gelesen werden.")}}
window.resetAll=function(){if(confirm("Wirklich alle Studia-Daten auf diesem Gerät löschen?")){localStorage.removeItem(KEY);location.reload()}}

function renderAll(){
 const safe=(label,fn)=>{try{return fn()}catch(err){console.error('[Studia V105] '+label+' konnte nicht gerendert werden',err);return null}};
 safe('Home',()=>renderHome());
 safe('Stundenplan',()=>renderPlan());
 safe('Aufgaben',()=>renderTasks());
 safe('Noten',()=>renderGrades());
 safe('Lernen',()=>renderStudy());
 safe('Fächer',()=>renderSubjects());
 safe('Abwesenheit',()=>renderAbsence());
 safe('Einstellungen',()=>renderSettings());
 safe('Lernsets',()=>renderLearnsetsLists());
 if(selectedSubjectId)safe('Notizbuch',()=>renderSubjectDetail());
 if(selectedTopicId)safe('Thema',()=>renderTopicDetail());
 if(selectedDeckId)safe('Karteikarten',()=>renderDeckDetail());
 if(selectedQuizId&&quizSession)safe('Quiz',()=>renderQuizPlayer());
}
applyCustomization();renderTimer();renderAll();
/* V162 SAFE START: no automatic timetable network request during boot. */


function combineNearby(items,yTol=3.5){
 const groups=[];for(const it of items.sort((a,b)=>b.y-a.y||a.x-b.x)){let g=groups.find(g=>Math.abs(g.y-it.y)<=yTol);if(!g){g={y:it.y,items:[]};groups.push(g)}g.items.push(it)}
 for(const g of groups)g.items.sort((a,b)=>a.x-b.x);return groups
}

function groupPdfLines(arr,tolerance=2.8){
 const groups=[];
 for(const item of [...arr].sort((a,b)=>b.y-a.y||a.x-b.x)){
   let g=groups.find(q=>Math.abs(q.y-item.y)<=tolerance);
   if(!g){g={y:item.y,items:[]};groups.push(g)}
   g.items.push(item);
   g.y=g.items.reduce((s,x)=>s+x.y,0)/g.items.length;
 }
 return groups.map(g=>{
   const items=g.items.sort((a,b)=>a.x-b.x);
   return {
     y:g.y,
     x:Math.min(...items.map(x=>x.x)),
     right:Math.max(...items.map(x=>x.x+x.w)),
     items,
     text:items.map(x=>x.text).join(" ").replace(/\s+/g," ").trim()
   };
 }).sort((a,b)=>b.y-a.y);
}


function pdfClock(s){
 const [hh,mm]=String(s).split(":");
 return String(Number(hh)).padStart(2,"0")+":"+mm;
}

function groupPdfLinesV24(arr,tolerance=2.8){
 const groups=[];
 for(const item of [...arr].sort((a,b)=>b.y-a.y||a.x-b.x)){
   let g=groups.find(q=>Math.abs(q.y-item.y)<=tolerance);
   if(!g){g={y:item.y,items:[]};groups.push(g)}
   g.items.push(item);
   g.y=g.items.reduce((sum,x)=>sum+x.y,0)/g.items.length;
 }
 return groups.map(g=>{
   const items=g.items.sort((a,b)=>a.x-b.x);
   return {
     y:g.y,
     items,
     text:items.map(x=>x.text).join(" ").replace(/\s+/g," ").trim()
   };
 }).sort((a,b)=>b.y-a.y);
}

async function renderPdfRaster(page){
 const scale=1.65;
 const viewport=page.getViewport({scale});
 const canvas=document.createElement("canvas");
 canvas.width=Math.ceil(viewport.width);
 canvas.height=Math.ceil(viewport.height);
 const ctx=canvas.getContext("2d",{willReadFrequently:true});
 await page.render({canvasContext:ctx,viewport}).promise;
 const image=ctx.getImageData(0,0,canvas.width,canvas.height);
 const view=page.view;
 return {
   image,
   scale,
   width:canvas.width,
   height:canvas.height,
   xMin:view[0],
   yMin:view[1],
   pageHeight:view[3]-view[1]
 };
}

function pdfToRasterX(raster,x){
 return Math.round((x-raster.xMin)*raster.scale);
}
function pdfToRasterY(raster,y){
 return Math.round((raster.pageHeight-(y-raster.yMin))*raster.scale);
}

function horizontalGridBorderStrength(raster,left,right,pdfY){
 if(!raster?.image)return 1;
 const {data,width,height}=raster.image;
 const x1=Math.max(0,pdfToRasterX(raster,left+(right-left)*.10));
 const x2=Math.min(width-1,pdfToRasterX(raster,right-(right-left)*.10));
 const cy=pdfToRasterY(raster,pdfY);
 let best=0;
 for(let dy=-4;dy<=4;dy++){
   const y=cy+dy;if(y<0||y>=height)continue;
   let dark=0,total=0;
   for(let x=x1;x<=x2;x+=2){
     const k=(y*width+x)*4,r=data[k],g=data[k+1],b=data[k+2],a=data[k+3];
     if(a>180){total++;if(r<105&&g<105&&b<105&&Math.max(r,g,b)-Math.min(r,g,b)<28)dark++;}
   }
   if(total)best=Math.max(best,dark/total);
 }
 return best;
}
function hasHorizontalGridBorder(raster,left,right,pdfY){
 // A weak antialiased/colored edge is not enough to split a merged cell.
 return horizontalGridBorderStrength(raster,left,right,pdfY)>.34;
}

// V205: Untis colors a merged lesson cell continuously across its internal row
// boundary. Sampling the fill above and below that boundary is much more robust
// than relying on a single antialiased grid line (the old Physik false split).
function timetableCellFillSample(raster,left,right,pdfY,pixelOffset){
 if(!raster?.image)return null;
 const {data,width,height}=raster.image;
 const x1=Math.max(0,pdfToRasterX(raster,left+(right-left)*.17));
 const x2=Math.min(width-1,pdfToRasterX(raster,right-(right-left)*.17));
 const cy=pdfToRasterY(raster,pdfY)+pixelOffset;
 const vals=[];
 for(let dy=-2;dy<=2;dy+=2){
   const y=Math.max(0,Math.min(height-1,cy+dy));
   for(let x=x1;x<=x2;x+=5){
     const k=(y*width+x)*4,r=data[k],g=data[k+1],b=data[k+2],a=data[k+3];
     if(a<180)continue;
     // Ignore dark grid/text pixels; we want the cell background.
     if(Math.max(r,g,b)<155)continue;
     vals.push([r,g,b]);
   }
 }
 if(vals.length<5)return null;
 const med=idx=>{const a=vals.map(v=>v[idx]).sort((a,b)=>a-b);return a[Math.floor(a.length/2)]};
 const r=med(0),g=med(1),b=med(2);
 const light=(r+g+b)/3,chroma=Math.max(r,g,b)-Math.min(r,g,b);
 return {r,g,b,light,chroma,count:vals.length};
}
function timetableBoundaryFillEvidence(raster,left,right,pdfY){
 if(!raster?.image)return {sameColoredFill:false,distance:999};
 const px=Math.max(7,Math.round((raster.scale||1.65)*4.8));
 const a=timetableCellFillSample(raster,left,right,pdfY,-px);
 const b=timetableCellFillSample(raster,left,right,pdfY, px);
 if(!a||!b)return {sameColoredFill:false,distance:999,a,b};
 const distance=Math.hypot(a.r-b.r,a.g-b.g,a.b-b.b);
 // Pastel Untis fills can be very light, so either a small departure from white
 // or some chroma counts as a real colored cell background.
 const coloredA=a.light<246||a.chroma>7;
 const coloredB=b.light<246||b.chroma>7;
 return {
   a,b,distance,
   sameColoredFill:coloredA&&coloredB&&distance<=30,
   sameAnyFill:distance<=22
 };
}

function cleanPdfCellText(raw){
 return String(raw||"")
   .replace(/Klassenleitungs-\s*stunden/ig,"Klassenleitungsstunden")
   .replace(/Klassenleitungs\s+stunden/ig,"Klassenleitungsstunden")
   .replace(/\s+/g," ")
   .trim();
}


function meaningfulCellTokensInRow(arr,bd,row,dayRows,rowIndex,gap,headerY){
 const top=row.y+(rowIndex>0?Math.abs(dayRows[rowIndex-1].y-row.y)/2:gap/2);
 const bottom=row.y-(rowIndex<dayRows.length-1?Math.abs(row.y-dayRows[rowIndex+1].y)/2:gap/2);

 return arr.filter(x=>{
   const cx=x.x+x.w/2;
   if(cx<bd.left||cx>bd.right)return false;
   if(x.y>top||x.y<bottom)return false;
   if(Math.abs(x.y-headerY)<9)return false;
   if(/\b(?:Mo|Di|Mi|Do|Fr)\s*[-–]?\s*\d+/i.test(x.text))return false;
   const t=String(x.text||"").trim();
   if(!t||/^[|:;.,\-–—]+$/.test(t))return false;
   return true;
 }).map(x=>String(x.text||"").trim()).filter(Boolean);
}

function rowHasIndependentLessonText(arr,bd,row,dayRows,rowIndex,gap,headerY){
 const tokens=meaningfulCellTokensInRow(arr,bd,row,dayRows,rowIndex,gap,headerY);
 if(!tokens.length)return false;
 const raw=cleanPdfCellText(tokens.join(" "));
 if(!raw)return false;

 // Recognizable lesson/special-cell evidence.
 return /\b(?:LF\s*\d+|SSPU|MINT|ET|ETHIK|SGL|SK|FHR|[A-ZÄÖÜ]{2,5}|R\d{2}|KLASSENLEIT|AUSFLUG|PRAKTIK|PROJEKT)\b/i.test(raw);
}
function parsePageItems(items,raster){
 const arr=items.map(it=>({
   text:String(it.str||"").trim(),
   x:it.transform?.[4]||0,
   y:it.transform?.[5]||0,
   w:it.width||0,
   h:it.height||0
 })).filter(x=>x.text);

 if(!arr.length)return null;
 const lines=groupPdfLinesV24(arr);

 // Dynamic PHS class headers:
 // BF 1A / BF 1B / BF 2 / M O1 / M U1 / W O1 / W U2 ...
 const classPattern=/^(?:BF\s*\d+[A-Z]?|[A-Z]\s*[OU]\s*\d+)$/i;
 const classTokens=arr.filter(x=>classPattern.test(x.text.replace(/\s+/g," ").trim()));
 if(!classTokens.length)return null;

 const headerGroups=[];
 for(const x of classTokens){
   let g=headerGroups.find(q=>Math.abs(q.y-x.y)<=6);
   if(!g){g={y:x.y,items:[]};headerGroups.push(g)}
   g.items.push(x);
 }
 const headerGroup=headerGroups.sort((a,b)=>b.items.length-a.items.length)[0];
 const rawHeaders=headerGroup.items.sort((a,b)=>a.x-b.x);

 // PDF.js can occasionally expose the same printed class header twice.
 // One duplicate header used to make two timetable columns feed the SAME class.
 const headers=[];
 const seenHeaderNames=new Set();
 for(const x of rawHeaders){
   const name=x.text.replace(/\s+/g," ").trim();
   const key=name.toUpperCase();
   if(seenHeaderNames.has(key))continue;
   // Also collapse near-identical overlaid text objects at nearly the same x.
   if(headers.some(h=>Math.abs((h.x+h.w/2)-(x.x+x.w/2))<4))continue;
   seenHeaderNames.add(key);
   headers.push(x);
 }
 if(headers.length<3)return null;

 const classes=headers.map(x=>x.text.replace(/\s+/g," ").trim());
 const centers=headers.map(x=>x.x+x.w/2);
 const bounds=centers.map((c,i)=>({
   left:i===0?c-(centers[i+1]-c)/2:(centers[i-1]+c)/2,
   right:i===centers.length-1?c+(c-centers[i-1])/2:(c+centers[i+1])/2
 }));

 // Rebuild the left time labels from complete horizontal lines.
 const rowRe=/\b(Mo|Di|Mi|Do|Fr)\s*[-–]?\s*(\d{1,2})\s*\/?\s*(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\b/i;
 const detected=[];
 for(const ln of lines){
   const txt=ln.text
     .replace(/[|]/g," ")
     .replace(/\s*([\/\-–])\s*/g,"$1")
     .replace(/\s+/g," ").trim();
   const m=txt.match(rowRe);
   if(m){
     detected.push({
       day:m[1][0].toUpperCase()+m[1].slice(1).toLowerCase(),
       num:Number(m[2]),
       start:pdfClock(m[3]),
       end:pdfClock(m[4]),
       y:ln.y
     });
   }
 }
 if(!detected.length)return null;

 const uniq=new Map();
 for(const r of detected){
   const key=r.day+"-"+r.num;
   if(!uniq.has(key))uniq.set(key,r);
 }
 const rows=[...uniq.values()];
 const schedule={};
 classes.forEach(c=>schedule[c]=[]);

 for(const day of ["Mo","Di","Mi","Do","Fr"]){
   const dayRows=rows.filter(r=>r.day===day).sort((a,b)=>a.num-b.num);
   if(!dayRows.length)continue;

   const gaps=[];
   for(let i=1;i<dayRows.length;i++){
     const d=Math.abs(dayRows[i-1].y-dayRows[i].y);
     if(d>3)gaps.push(d);
   }
   gaps.sort((a,b)=>a-b);
   const gap=gaps.length?gaps[Math.floor(gaps.length/2)]:15;

   for(let ci=0;ci<classes.length;ci++){
     const bd=bounds[ci];

     // Partition the timetable using the ACTUAL PDF grid lines.
     // If the line between row i and i+1 is absent in this class column,
     // Untis has drawn one merged cell -> double/multiple lesson.
     const groups=[];
     let i=0;
     while(i<dayRows.length){
       let j=i;

       // Raster-Erkennung ist hilfreich, aber wir lassen sie nicht mehr
       // unbegrenzt mehrere Stunden verschlucken.
       // Ein normales zusammengeführtes Feld darf zunächst höchstens
       // zwei Unterrichtsblöcke umfassen.
       while(j<dayRows.length-1){
         // A genuine merged Untis cell may continue across a school break.
         // The PDF border and independent text in the next row decide whether
         // it is one lesson or two different lessons.
         const boundary=(dayRows[j].y+dayRows[j+1].y)/2;
         const borderStrength=horizontalGridBorderStrength(raster,bd.left,bd.right,boundary);
         const fillEvidence=timetableBoundaryFillEvidence(raster,bd.left,bd.right,boundary);

         // If BOTH neighboring rows contain their own meaningful text in this
         // exact class column, they are separate lessons regardless of color.
         const currentHasText=rowHasIndependentLessonText(
           arr,bd,dayRows[j],dayRows,j,gap,headerGroup.y
         );
         const nextHasText=rowHasIndependentLessonText(
           arr,bd,dayRows[j+1],dayRows,j+1,gap,headerGroup.y
         );
         if(currentHasText && nextHasText)break;

         // A printed line separates rows only when the cell fill also changes.
         // Untis can draw an internal line inside a colored Doppelstunde; the
         // continuous fill + missing independent text is the stronger signal.
         if(borderStrength>.34&&!fillEvidence.sameColoredFill)break;

         const localGap=Math.abs(dayRows[j].y-dayRows[j+1].y);
         if(localGap>gap*1.85)break;
         j++;
       }

       groups.push({from:i,to:j});
       i=j+1;
     }

     for(const grp of groups){
       const first=dayRows[grp.from],last=dayRows[grp.to];
       const top=first.y+(grp.from>0?Math.abs(dayRows[grp.from-1].y-first.y)/2:gap/2);
       const bottom=last.y-(grp.to<dayRows.length-1?Math.abs(last.y-dayRows[grp.to+1].y)/2:gap/2);

       const partItems=arr.filter(x=>{
         const cx=x.x+x.w/2;
         if(cx<bd.left||cx>bd.right)return false;
         if(x.y>top||x.y<bottom)return false;
         if(Math.abs(x.y-headerGroup.y)<9)return false;
         if(/\b(?:Mo|Di|Mi|Do|Fr)\s*[-–]?\s*\d+/i.test(x.text))return false;
         return true;
       }).sort((a,b)=>b.y-a.y||a.x-b.x);

       const seen=new Set(),uniqueParts=[],usedItems=[];
       for(const item of partItems){
         const part=item.text.trim();
         if(!part||seen.has(part))continue;
         seen.add(part);
         uniqueParts.push(part);
         usedItems.push(item);
       }

       const raw=cleanPdfCellText(uniqueParts.join(" "));
       if(!raw)continue;

       const classCenter=centers[ci];
       const halfWidth=Math.max(1,(bd.right-bd.left)/2);
       const distances=usedItems.map(x=>Math.abs((x.x+x.w/2)-classCenter)/halfWidth);
       const geometryConfidence=distances.length
         ? Math.max(0,1-(distances.reduce((a,b)=>a+b,0)/distances.length))
         : 0;

       const candidate={
         day,
         start:first.start,
         end:last.end,
         raw,
         rowNum:first.num,
         blocks:grp.to-grp.from+1,
         isDouble:(grp.to-grp.from+1)>=2,
         gridExact:true,
         geometryConfidence,
         boundaryAfterStrength:grp.to<dayRows.length-1
           ? horizontalGridBorderStrength(raster,bd.left,bd.right,(dayRows[grp.to].y+dayRows[grp.to+1].y)/2)
           : 1
       };

       // A class has exactly one printed cell per timetable row.
       // If PDF.js produced two candidates for the same row, keep the one
       // whose text is geometrically centered inside THIS class column.
       const existingIndex=schedule[classes[ci]].findIndex(x=>x.day===day&&x.rowNum===first.num);
       if(existingIndex<0){
         schedule[classes[ci]].push(candidate);
       }else{
         const old=schedule[classes[ci]][existingIndex];
         const oldScore=Number(old.geometryConfidence||0)+(old.raw?0.05:0);
         const newScore=geometryConfidence+(raw?0.05:0);
         if(newScore>oldScore)schedule[classes[ci]][existingIndex]=candidate;
       }
     }
   }
 }


 // V204 recovery: if PDF.js gave us one lesson row followed by a completely
 // empty timetable row and the separating border was only weak/ambiguous,
 // treat both rows as one Doppelstunde. This fixes merged cells such as
 // Physik 08:00–09:30 without merging over a clearly printed border.
 for(const className of classes){
   const list=schedule[className]||[];
   for(const day of ["Mo","Di","Mi","Do","Fr"]){
     const dayRows=rows.filter(r=>r.day===day).sort((a,b)=>a.num-b.num);
     const dayLessons=list.filter(l=>l.day===day&&!l.specialOnly);
     for(const l of dayLessons){
       if(Number(l.blocks||1)!==1||l.rowNum==null)continue;
       const currentIndex=dayRows.findIndex(r=>Number(r.num)===Number(l.rowNum));
       if(currentIndex<0||currentIndex>=dayRows.length-1)continue;
       const nextRow=dayRows[currentIndex+1];
       if(Number(nextRow.num)!==Number(l.rowNum)+1)continue;
       const occupied=dayLessons.some(x=>x!==l&&lessonCoveredRows(x).includes(Number(nextRow.num)));
       if(occupied)continue;
       const ci=classes.indexOf(className),bd=ci>=0?bounds[ci]:null;
       const boundary=(dayRows[currentIndex].y+nextRow.y)/2;
       const strength=Number(l.boundaryAfterStrength??(bd?horizontalGridBorderStrength(raster,bd.left,bd.right,boundary):1));
       const fillEvidence=bd?timetableBoundaryFillEvidence(raster,bd.left,bd.right,boundary):{sameColoredFill:false};
       // A visible border is allowed when the same colored Untis cell clearly
       // continues into the otherwise empty next row.
       if(strength>.34&&!fillEvidence.sameColoredFill)continue;
       l.end=nextRow.end;l.blocks=2;l.isDouble=true;l.recoveredDouble=true;l.boundaryFillMatch=!!fillEvidence.sameColoredFill;
     }
   }
 }

 // Safety pass:
 // Mehr als 2 Blöcke nur dann zusammenführen, wenn der PDF-Text in den
 // direkt folgenden Feldern wirklich identisch ist.
 for(const className of classes){
   const rows=schedule[className]||[];
   const rebuilt=[];
   for(const x of rows){
     const cur={...x};
     const last=rebuilt[rebuilt.length-1];

     if(last && last.day===cur.day && last.end===cur.start){
       const a=cleanPdfCellText(last.raw);
       const b=cleanPdfCellText(cur.raw);

       if(a && a===b && (last.blocks||1)>=2){
         last.end=cur.end;
         last.blocks=(last.blocks||1)+(cur.blocks||1);
         last.isDouble=true;
         continue;
       }
     }
     rebuilt.push(cur);
   }
   schedule[className]=rebuilt;
 }
return {classes,schedule,rows};
}

function consolidateSpecialDayNotes(list){
 const sorted=[...(list||[])].sort((a,b)=>{
   const d=dayOrder.indexOf(a.day)-dayOrder.indexOf(b.day);
   return d||a.start.localeCompare(b.start);
 });

 const out=[];

 for(let i=0;i<sorted.length;i++){
   const cur={...sorted[i]};
   const raw=cleanPdfCellText(cur.raw);
   const next=sorted[i+1]?{...sorted[i+1]}:null;
   const next2=sorted[i+2]?{...sorted[i+2]}:null;

   // Already complete in one PDF field.
   if(/\b\d{1,2}(?::\d{2})?\s*Uhr\b/i.test(raw) && /Klassenleitungsstunden/i.test(raw)){
     const tm=raw.match(/\b\d{1,2}(?::\d{2})?\s*Uhr\b/i)?.[0] || "";
     out.push({
       day:cur.day,
       start:cur.start,
       end:cur.end,
       raw:`${tm} Klassenleitungsstunden`.trim(),
       specialOnly:true
     });
     continue;
   }

   // PDF split into:
   // "10:00 Uhr" / "Klassenleitungs-" / "stunden"
   if(/^\d{1,2}(?::\d{2})?\s*Uhr$/i.test(raw) && next && next.day===cur.day){
     const b=cleanPdfCellText(next.raw);
     const c=next2 && next2.day===cur.day ? cleanPdfCellText(next2.raw) : "";

     if(/klassenleitungs?-?$/i.test(b) && /^stunden?$/i.test(c)){
       out.push({
         day:cur.day,
         start:cur.start,
         end:next2.end || next.end || cur.end,
         raw:`${raw} Klassenleitungsstunden`,
         specialOnly:true
       });
       i+=2;
       continue;
     }

     if(/klassenleitungsstunden/i.test(b)){
       out.push({
         day:cur.day,
         start:cur.start,
         end:next.end || cur.end,
         raw:`${raw} Klassenleitungsstunden`,
         specialOnly:true
       });
       i+=1;
       continue;
     }
   }

   // PDF split only into Klassenleitungs- / stunden
   if(/klassenleitungs?-?$/i.test(raw) && next && next.day===cur.day && /^stunden?$/i.test(cleanPdfCellText(next.raw))){
     out.push({
       day:cur.day,
       start:cur.start,
       end:next.end || cur.end,
       raw:"Klassenleitungsstunden",
       specialOnly:true
     });
     i++;
     continue;
   }

   // A lone "stunden" must never become a lesson card.
   if(/^stunden?$/i.test(raw)){
     continue;
   }

   out.push(cur);
 }

 return out;
}

function findScheduleClassKey(schedules,name){
 return Object.keys(schedules||{}).find(k=>
   k.replace(/\s+/g," ").toUpperCase()===
   String(name||"").replace(/\s+/g," ").toUpperCase()
 );
}
function scheduleForClass(name,mode="current"){
 const schedules=mode==="basis"
   ? (data.timetable.basisSchedules||{})
   : (data.timetable.schedules||{});
 const exact=findScheduleClassKey(schedules,name);
 return exact?schedules[exact]:[];
}
function currentScheduleForClass(name){
 return scheduleForClass(name,"current");
}
function basisScheduleForClass(name){
 return scheduleForClass(name,"basis");
}

window.setHeatMode=function(mode,btn){
 heatModeOverride=["auto","on","off"].includes(mode)?mode:"auto";
 localStorage.setItem("schoolbloom-heat-mode",heatModeOverride);
 updateHeatModeUI();
 renderHome();
 renderPlan();
}
function updateHeatModeUI(){
 $$("#heatPlanControl button").forEach(x=>
   x.classList.toggle("active",x.dataset.heatmode===heatModeOverride)
 );
 const state=$("#heatPlanState");
 if(state){
   if(heatModeOverride==="on")state.textContent="Manuell aktiviert";
   else if(heatModeOverride==="off")state.textContent="Manuell deaktiviert";
   else state.textContent=data.timetable?.heatSchedule
     ?"Auto erkannt · Hitzestunden aktiv"
     :"Auto · keine Hitzestunden erkannt";
 }
 const box=$("#heatPlanControl");
 if(box)box.classList.toggle("heatActive",isHeatScheduleActive());
}
window.setTimetableViewMode=function(mode,btn){
 timetableViewMode=mode==="basis"?"basis":"current";
 $$("#planModeSwitch button").forEach(x=>x.classList.toggle("active",x.dataset.planmode===timetableViewMode));
 renderPlan();
}
window.switchTimetableClass=function(name){
 if(!name)return;
 data.timetable.selectedClass=name;
 data.settings.className=name;
 // Home must ALWAYS use the important/current schedule.
 data.timetable.lessons=currentScheduleForClass(name);
 save();renderHome();renderPlan();
}


function detectHeatSchedule(items){
 const arr=(items||[]).map(it=>({
   text:String(it.str||"").replace(/\s+/g," ").trim(),
   x:it.transform?.[4]||0,
   y:it.transform?.[5]||0,
   w:it.width||0
 })).filter(x=>x.text);

 const wholeText=arr.map(x=>x.text).join(" ").replace(/\s+/g," ");

 const textSignal=
   /Hitzebedingte\s+Kurzstunden/i.test(wholeText) ||
   /Hitzebedingte/i.test(wholeText) ||
   /Kurzstunden/i.test(wholeText) ||
   (/Temperaturen/i.test(wholeText) && /Unterrichtszeiten/i.test(wholeText));

 const extractedTimes=[...wholeText.matchAll(/\b([01]?\d|2[0-3]):[0-5]\d\b/g)]
   .map(m=>m[0].padStart(5,"0"));

 const expectedHeatTimes=[
   "08:00","08:35","09:10","09:25","10:00","10:35",
   "10:50","11:25","12:00","12:25","13:00","13:35"
 ];
 const heatTimeHits=expectedHeatTimes.filter(t=>extractedTimes.includes(t)).length;
 const timeSignal=heatTimeHits>=7;

 // Auto detection:
 // either heat-related text exists, or almost the complete heat timetable
 // exists in the extracted PDF text.
 if(!textSignal && heatTimeHits<10)return null;

 const marker=arr.find(x=>/Hitzebedingte\s+Kurzstunden/i.test(x.text))
   || arr.find(x=>/Hitzebedingte|Kurzstunden|Unterrichtszeiten/i.test(x.text))
   || arr.find(x=>/Temperaturen/i.test(x.text));

 const source=marker
   ? arr.filter(x=>x.x>=marker.x-150 && x.y<=marker.y+120)
   : arr;

 const groups=[];
 for(const x of source){
   let g=groups.find(q=>Math.abs(q.y-x.y)<=4);
   if(!g){g={y:x.y,items:[]};groups.push(g)}
   g.items.push(x);
 }
 groups.sort((a,b)=>b.y-a.y);

 const lessons={},heatPauses=[];
 for(const g of groups){
   const line=g.items.sort((a,b)=>a.x-b.x).map(x=>x.text).join(" ").replace(/\s+/g," ").trim();
   const times=[...line.matchAll(/\b([01]?\d|2[0-3]):[0-5]\d\b/g)].map(m=>m[0].padStart(5,"0"));
   if(times.length<2)continue;

   const num=line.match(/(?:^|\s)([1-8])(?:\s|$)/);
   if(num){
     lessons[Number(num[1])]={start:times[0],end:times[1]};
   }else if(/Pause/i.test(line)){
     heatPauses.push({
       start:times[0],
       end:times[1],
       label:/gro(?:ß|ss)e\s+Pause/i.test(line)?"Große Pause":"Pause"
     });
   }
 }

 if(Object.keys(lessons).length<8)Object.assign(lessons,HEAT_LESSON_TIMES);
 if(heatPauses.length<3)heatPauses.splice(0,heatPauses.length,...HEAT_PAUSES);

 heatPauses.sort((a,b)=>a.start.localeCompare(b.start));
 return {
   active:true,
   lessons,
   pauses:heatPauses,
   detection:{textSignal,timeSignal,heatTimeHits}
 };
}

function applyHeatTimesToSchedule(schedule,heat){
 if(!heat?.active)return schedule;
 const out={};
 for(const [className,list] of Object.entries(schedule||{})){
   out[className]=(list||[]).map(l=>{
     if(l.specialOnly||l.rowNum==null)return {...l};
     const from=Number(l.rowNum);
     const blocks=Math.max(1,Number(l.blocks||1));
     const to=from+blocks-1;
     const a=heat.lessons[from],b=heat.lessons[to];
     if(!a||!b)return {...l};
     return {...l,start:a.start,end:b.end,heatSchedule:true};
   });
 }
 return out;
}

function lessonCoveredRows(l){
 if(l?.rowNum==null)return [];
 const n=Math.max(1,Number(l.blocks||1));
 return Array.from({length:n},(_,i)=>Number(l.rowNum)+i);
}

function rowTimeFromMaps(rowNum,rowMaps,heat){
 if(heat?.active && heat.lessons[rowNum])return heat.lessons[rowNum];
 for(const rows of (rowMaps||[])){
   const r=(rows||[]).find(x=>Number(x.num)===Number(rowNum));
   if(r)return {start:r.start,end:r.end};
 }
 return null;
}

function compareLessonIdentity(l){
 const p=splitCell(String(l?.raw||""));
 const subject=String(p.subject||"")
   .replace(/^M\s+/i,"")
   .replace(/^W\s+/i,"")
   .replace(/\s+/g," ")
   .trim()
   .toUpperCase();
 const teacher=String(p.teacherCode||p.meta||"")
   .replace(/\s+/g," ")
   .trim()
   .toUpperCase();

 // Room is intentionally NOT part of identity:
 // a moved lesson can also receive another room.
 return teacher?`${subject}|${teacher}`:subject;
}

function lessonBlockCount(l){
 return Math.max(1,Number(l?.blocks||lessonCoveredRows(l).length||1));
}

function addBasisCancellations(current,basis,rowMaps,heat){
 const result=(current||[]).map(x=>({...x}));

 // Rows occupied by the CURRENT plan. A different current lesson in the
 // old position means "changed/replaced", not an invented cancellation card.
 const currentRowsByDay=new Map();
 for(const l of current||[]){
   if(l.specialOnly)continue;
   const set=currentRowsByDay.get(l.day)||new Set();
   for(const r of lessonCoveredRows(l))set.add(r);
   currentRowsByDay.set(l.day,set);
 }

 // If another subject fills a basis row, that is a change/replacement.
 // It must never create an Entfall card.
 const basisByDayRow=new Map();
 for(const b of basis||[]){
   if(b.specialOnly)continue;
   for(const r of lessonCoveredRows(b))basisByDayRow.set(`${b.day}|${r}`,b);
 }
 for(const cur of result){
   if(cur.specialOnly)continue;
   const replaced=[];
   for(const r of lessonCoveredRows(cur)){
     const base=basisByDayRow.get(`${cur.day}|${r}`);
     if(base && compareLessonIdentity(base)!==compareLessonIdentity(cur))replaced.push(base);
   }
   if(replaced.length){
     cur.changedFromBasis=true;
     cur.changedFromRaw=replaced[0].raw||"";
   }
 }

 // Count how many lesson BLOCKS of the same subject+teacher exist per day.
 // This is what fixes shifted lessons:
 // Basis: LF2 ZEI at row 8, Current: LF2 ZEI at row 3 => count is unchanged,
 // therefore it is a MOVE, not an Entfall.
 const basisTotals=new Map(),currentTotals=new Map();
 const totalKey=l=>`${l.day}|${compareLessonIdentity(l)}`;

 for(const l of basis||[]){
   if(l.specialOnly||l.rowNum==null)continue;
   const k=totalKey(l);
   basisTotals.set(k,(basisTotals.get(k)||0)+lessonBlockCount(l));
 }
 for(const l of current||[]){
   if(l.specialOnly||l.rowNum==null)continue;
   const k=totalKey(l);
   currentTotals.set(k,(currentTotals.get(k)||0)+lessonBlockCount(l));
 }

 // Only the true shortage can ever become Entfall.
 const remainingMissing=new Map();
 for(const [k,n] of basisTotals){
   remainingMissing.set(k,Math.max(0,n-(currentTotals.get(k)||0)));
 }

 for(const b of (basis||[]).sort((a,b)=>dayOrder.indexOf(a.day)-dayOrder.indexOf(b.day)||Number(a.rowNum||0)-Number(b.rowNum||0))){
   if(b.specialOnly||b.rowNum==null)continue;

   const k=totalKey(b);
   let deficit=remainingMissing.get(k)||0;
   if(deficit<=0)continue; // Entire basis amount exists somewhere today -> moved, not cancelled.

   const occupied=currentRowsByDay.get(b.day)||new Set();
   const baseRows=lessonCoveredRows(b);

   // A cancellation can only be placed on rows that are actually empty
   // in the current plan. If another subject is there, it is a change.
   const emptyRows=baseRows.filter(r=>!occupied.has(r));
   if(!emptyRows.length)continue;

   const rowsToCancel=emptyRows.slice(0,deficit);
   if(!rowsToCancel.length)continue;

   // Consecutive rows become one cancellation card.
   let group=[];
   const flush=()=>{
     if(!group.length)return;
     const first=group[0],last=group[group.length-1];
     const a=rowTimeFromMaps(first,rowMaps,heat);
     const z=rowTimeFromMaps(last,rowMaps,heat);
     if(a&&z){
       result.push({
         ...b,
         start:a.start,
         end:z.end,
         rowNum:first,
         blocks:group.length,
         isDouble:group.length>=2,
         cancelledFromBasis:true,
         cancellationLabel:"Entfall"
       });
       deficit-=group.length;
       remainingMissing.set(k,Math.max(0,deficit));
     }
     group=[];
   };

   for(const r of rowsToCancel){
     if(group.length && r!==group[group.length-1]+1)flush();
     if(deficit<=0)break;
     group.push(r);
   }
   flush();
 }

 return result;
}

async function parsePdfDocument(pdf){
 const currentPages=[],basisPages=[],allText=[],rowMaps=[];
 let heat=null;
 let nextPageIsBasis=false;
 let sawReliableBasis=false;

 for(let p=1;p<=pdf.numPages;p++){
   const page=await pdf.getPage(p);
   const content=await page.getTextContent();
   const raster=await renderPdfRaster(page);
   const pageText=content.items.map(x=>(x.str||"").trim()).filter(Boolean).join(" ").replace(/\s+/g," ").trim();
   allText.push(pageText);

   if(!heat){
     const detectedHeat=detectHeatSchedule(content.items);
     if(detectedHeat)heat=detectedHeat;
   }

   // PHS-Sonderfall:
   // Häufig steht auf Seite N nur "Nächste Seite: Neuer BASISPLAN".
   // Die eigentliche Folgeseite enthält dann den Stundenplan, ohne das Wort
   // BASISPLAN noch einmal zuverlässig im extrahierten PDF-Text zu tragen.
   const announcesNextBasis=/\bN(?:Ä|AE)CHSTE\s+SEITE\s*:?\s*(?:NEUER\s+)?BASISPLAN\b/i.test(pageText);

   // Referenzen auf den Basisplan dürfen die AKTUELLE Seite nicht selbst zum
   // Basisplan machen. Erst nach Entfernen solcher Hinweise prüfen wir, ob
   // diese Seite tatsächlich als Basisplan überschrieben ist.
   const pageWithoutBasisReferences=pageText
     .replace(/\bN(?:Ä|AE)CHSTE\s+SEITE\s*:?\s*(?:NEUER\s+)?BASISPLAN\b/ig," ")
     .replace(/\bBASISPLAN\s+AB\b[^.]{0,120}\b(?:SIEHE\s+)?SEITE\s+\d+\b/ig," ");
   const pageDeclaresBasis=/\b1\.\s*BASISPLAN\b|\bBASISPLAN\s+UW\b|\bNEUER\s+BASISPLAN\b|\bBASISPLAN\b/i.test(pageWithoutBasisReferences);
   const pageIsBasis=nextPageIsBasis||pageDeclaresBasis;
   if(pageIsBasis)sawReliableBasis=true;

   const parsed=parsePageItems(content.items,raster);

   // Wichtig: auch wenn eine Hinweisseite selbst nicht parsebar ist, muss
   // die "nächste Seite = Basisplan"-Information erhalten bleiben.
   nextPageIsBasis=announcesNextBasis;

   if(!parsed)continue;
   rowMaps.push(parsed.rows||[]);
   (pageIsBasis?basisPages:currentPages).push(parsed);
 }

 const mergePages=pages=>{
   const combined={};
   for(const parsed of pages){
     for(const [className,lessons] of Object.entries(parsed.schedule||{})){
       const normalized=className.replace(/\s+/g," ").trim();
       combined[normalized]||=[];
       combined[normalized].push(...lessons);
     }
   }
   for(const k of Object.keys(combined)){
     combined[k]=consolidateSpecialDayNotes(combined[k]);
   }
   return combined;
 };

 const hasSchedule=schedules=>Object.values(schedules||{}).some(list=>Array.isArray(list)&&list.length);
 const cloneSchedules=schedules=>{
   const out={};
   for(const [k,list] of Object.entries(schedules||{}))out[k]=(list||[]).map(x=>({...x}));
   return out;
 };

 let current=mergePages(currentPages);
 const parsedBasis=mergePages(basisPages);
 const previousBasis=cloneSchedules(data.timetable?.basisSchedules||{});
 const parsedBasisValid=hasSchedule(parsedBasis);
 const previousBasisValid=hasSchedule(previousBasis);

 // Wenn die Schul-PDF gerade NUR den Basisplan veröffentlicht, ist dieser
 // gleichzeitig der aktuelle Plan. Wir kopieren ihn deshalb in "Aktuell",
 // behalten ihn aber AUCH dauerhaft als Basisplan.
 if(!hasSchedule(current) && parsedBasisValid){
   current=cloneSchedules(parsedBasis);
 }

 // Der wichtigste Speicher-Fix:
 // Ein einmal sicher erkannter Basisplan wird NICHT gelöscht, nur weil eine
 // spätere PDF lediglich Vertretungen/Entfall enthält. Er wird erst ersetzt,
 // wenn erneut ein echter Basisplan in der PDF erkannt wurde.
 const effectiveBasis=parsedBasisValid
   ? cloneSchedules(parsedBasis)
   : previousBasisValid
     ? previousBasis
     : {};

 const basisUpdatedNow=parsedBasisValid&&sawReliableBasis;
 const previousBasisSavedAt=Number(data.timetable?.basisSavedAt||0)||0;
 const now=Date.now();

 // Keep the original row structure/times in storage.
 // Heat times are applied dynamically so Auto/An/Aus can switch instantly.
 const keys=[...new Set([...Object.keys(current),...Object.keys(effectiveBasis)])]
   .sort((a,b)=>a.localeCompare(b,"de",{numeric:true,sensitivity:"base"}));
 if(!keys.length)throw new Error("Keine Klassen im PHS-Plan erkannt");

 const finalSchedules={};
 for(const className of keys){
   const cur=current[className]||[];
   const base=effectiveBasis[className]||[];
   finalSchedules[className]=base.length
     ? addBasisCancellations(cur,base,rowMaps,null)
     : cur.map(x=>({...x}));
 }

 const wanted=(data.timetable.selectedClass||data.settings.className||"M U1").replace(/\s+/g," ").toUpperCase();
 let chosen=keys.find(k=>k.replace(/\s+/g," ").toUpperCase()===wanted);
 if(!chosen)chosen=keys.find(k=>k.replace(/\s+/g," ").toUpperCase()==="M U1")||keys[0];

 const txt=allText.join(" ");
 const dm=txt.match(/(?:ab\s+)?(\d{1,2}\.\s*(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+20\d{2})/i);
 const sourceLabel=dm?dm[1]:"";

 data.timetable={
   isPlaceholder:false,
   classes:keys,
   schedules:finalSchedules,
   currentSchedules:current,
   basisSchedules:effectiveBasis,
   selectedClass:chosen,
   lessons:finalSchedules[chosen]||[],
   sourceLabel,
   fetchedAt:now,
   parserVersion:44,
   heatSchedule:!!heat?.active,
   activePauses:heat?.active?heat.pauses:pauses,
   currentPageCount:currentPages.length,
   basisPageCount:basisPages.length,
   rowMaps:rowMaps,

   // Basisplan-Metadaten werden mit dem normalen Studia-Account gespeichert.
   basisSavedAt:basisUpdatedNow?now:previousBasisSavedAt,
   basisSourceLabel:basisUpdatedNow?sourceLabel:(data.timetable?.basisSourceLabel||""),
   basisFreshFromPdf:basisUpdatedNow,
   basisRetainedFromAccount:!basisUpdatedNow&&previousBasisValid
 };
 data.settings.className=chosen;
 save();
}
async function parsePdfBytes(bytes){
 const lib=await ensurePdfJs();
 const pdf=await lib.getDocument({data:bytes}).promise;
 await parsePdfDocument(pdf);
}

window.loadRemotePlan=async function(manual=false){
 const status=$("#planStatus"),live=$("#liveRefreshStatus");
 const refreshBtn=document.querySelector(".planRefreshBtn")||[...document.querySelectorAll("button")].find(b=>(b.textContent||"").includes("aktualisieren"));
 if(refreshBtn)refreshBtn.disabled=true;

 if(status)status.textContent=manual?"Aktuelle PHS-PDF wird live neu geladen …":"Stundenplan wird geladen …";
 if(live){live.textContent="Live-PDF wird abgerufen …";live.className="liveRefreshStatus loading"}

 const stamp=Date.now();
 const external=data.settings.pdf||defaultData.settings.pdf;
 const sep=external.includes("?")?"&":"?";
 const sources=[
   {name:"Live",url:SCHOOLBLOOM_PLAN_WORKER+"?schoolbloom="+stamp},
   {name:"GitHub-Sicherung",url:"./Stundenplan.pdf?schoolbloom="+stamp},
   {name:"Direkt",url:external+sep+"schoolbloom="+stamp}
 ];

 let networkError=null,parserError=null;

 for(const candidate of sources){
   let bytes;
   try{
     const response=await fetch(candidate.url,{
       method:"GET",
       cache:"no-store",
       headers:{"Cache-Control":"no-cache","Pragma":"no-cache"}
     });
     if(!response.ok)throw new Error(`HTTP ${response.status}`);
     bytes=new Uint8Array(await response.arrayBuffer());
     if(bytes.length<4||String.fromCharCode(...bytes.slice(0,4))!=="%PDF")throw new Error("Antwort ist keine PDF");
   }catch(e){
     networkError=e;
     console.warn(candidate.name+" Download fehlgeschlagen",e);
     continue;
   }

   try{
     if(live){live.textContent=`✓ ${candidate.name}-PDF geladen · Stundenplan wird gelesen …`;live.className="liveRefreshStatus loading"}
     await parsePdfBytes(bytes);

     const d=new Date(),time=String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
     data.timetable.lastSource=candidate.name;
     data.timetable.lastLiveCheck=Date.now();
     save();

     if(status)status.textContent=`Aktueller PHS-Plan geladen${data.timetable.sourceLabel?" · "+data.timetable.sourceLabel:""}${data.timetable.basisFreshFromPdf?" · Basisplan gespeichert":""}.`;
     if(live){
       live.textContent=`✓ ${candidate.name} · exakt aus PDF gelesen · ${time} Uhr`;
       live.className="liveRefreshStatus ok";
     }
     if(refreshBtn)refreshBtn.disabled=false;
     renderAll();
     return;
   }catch(e){
     parserError=e;
     console.warn(candidate.name+" PDF geladen, Parser fehlgeschlagen",e);
     // If Live PDF was downloaded, do NOT lie that Live itself failed.
     if(candidate.name==="Live"&&live){
       live.textContent="✓ Live-PDF geladen · Auslesen fehlgeschlagen, versuche Sicherung …";
       live.className="liveRefreshStatus warn";
     }
   }
 }

 if(refreshBtn)refreshBtn.disabled=false;

 if(parserError){
   if(status)status.textContent=(data.timetable?.lessons||[]).length
     ? "Der gespeicherte Stundenplan bleibt aktiv. Die neue PHS-PDF konnte gerade nicht sicher gelesen werden."
     : "Die PDF wurde geladen, konnte aber nicht vollständig gelesen werden.";
   if(live){live.textContent=(data.timetable?.lessons||[]).length
     ? "✓ Gespeicherter Plan aktiv · Live-PDF gerade nicht lesbar"
     : "PDF erreichbar · Inhalt ist aktuell kein lesbarer PHS-Stundenplan";live.className="liveRefreshStatus warn"}
 }else{
   if(status)status.textContent="Die Stundenplan-PDF ist gerade nicht erreichbar. Der letzte funktionierende Plan bleibt erhalten.";
   if(live){live.textContent="Live-Verbindung gerade nicht erreichbar";live.className="liveRefreshStatus error"}
 }
 console.warn(parserError||networkError);
}

// V162 SAFE START: never fetch/parse the timetable during application boot.
// The existing timetable stays available; live refresh remains available from the timetable UI.
/* V162 SAFE START: service worker registration disabled. */


/* ===== V92 RECOVERY + SAFE EDITOR ENHANCEMENTS ===== */
window.__schoolBloomBooted=true;
try{
  const V91_FONTS_KEY="schoolbloom-v91-custom-fonts";
  function v91StoredFonts(){try{return JSON.parse(localStorage.getItem(V91_FONTS_KEY)||"[]")}catch(_){return []}}
  function v91InstallFont(font){
    if(!font?.name||!font?.data)return;
    const sid="v91-font-"+font.name.replace(/[^a-z0-9_-]/gi,"-");
    if(document.getElementById(sid))return;
    const st=document.createElement("style");st.id=sid;
    st.textContent=`@font-face{font-family:${JSON.stringify(font.name)};src:url(${JSON.stringify(font.data)});font-display:swap}`;
    document.head.appendChild(st);
  }
  window.v91LoadFonts=function(){v91StoredFonts().forEach(v91InstallFont)};
  window.v91PickFont=function(){
    const inp=document.createElement("input");inp.type="file";inp.accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2";
    inp.onchange=()=>{
      const f=inp.files?.[0];if(!f)return;
      if(f.size>1600000){alert("Die Schrift ist zu groß. Bitte eine Datei unter ca. 1,6 MB verwenden.");return}
      const reader=new FileReader();reader.onload=()=>{
        const clean=(f.name||"Eigene Schrift").replace(/\.(ttf|otf|woff2?|TTF|OTF|WOFF2?)$/,'').trim()||"Eigene Schrift";
        const arr=v91StoredFonts().filter(x=>x.name!==clean);arr.push({name:clean,data:String(reader.result)});
        try{localStorage.setItem(V91_FONTS_KEY,JSON.stringify(arr));v91InstallFont(arr.at(-1));mobileRefreshTextMode?.();cuteToast?.("Schrift hinzugefügt ♡")}catch(e){alert("Die Schrift konnte nicht gespeichert werden. Versuche eine kleinere Font-Datei.")}
      };reader.readAsDataURL(f);
    };inp.click();
  };
  v91LoadFonts();

  const v91BaseTextModeContent=mobileTextModeContentHTML;
  mobileTextModeContentHTML=function(kind){
    let out=v91BaseTextModeContent(kind);
    if(kind!=="text")return out;
    const fonts=v91StoredFonts();
    // Textfarbe is intentionally only under “Aussehen”; this spot becomes Add Font.
    out=out.replace(/<label class="mobileColorDot"[\s\S]*?<\/label>/,
      `<button class="v91FontAdd" onclick="v91PickFont()"><b>Aa+</b><span>Schrift hinzufügen</span></button>`);
    if(fonts.length){
      const opts=fonts.map(f=>`<option value="${esc(f.name)}">${esc(f.name)}</option>`).join("");
      out=out.replace(/<\/select>/,opts+"</select>");
    }
    return out;
  };

  // Textformate live only in the dedicated Text library drawer.

  // Lists work from a selected text box even when the user did not highlight its text.
  const v91BaseFormatSelectedText=window.formatSelectedText;
  window.formatSelectedText=function(cmd){
    const el=document.querySelector(`.cobj[data-id="${canvasState.selectedId}"]`);
    if(el && el.isContentEditable && ["insertUnorderedList","insertOrderedList"].includes(cmd)){
      const sel=window.getSelection();
      const inside=sel&&sel.rangeCount&&el.contains(sel.anchorNode);
      if(!inside){
        el.focus();const r=document.createRange();r.selectNodeContents(el);sel.removeAllRanges();sel.addRange(r);
      }
    }
    return v91BaseFormatSelectedText(cmd);
  };
  const v91BaseDash=window.mobileDashList;
  window.mobileDashList=function(){
    const el=document.querySelector(`.cobj[data-id="${canvasState.selectedId}"]`);
    if(el&&el.isContentEditable){const sel=window.getSelection();if(!(sel&&sel.rangeCount&&el.contains(sel.anchorNode))){el.focus();const r=document.createRange();r.selectNodeContents(el);sel.removeAllRanges();sel.addRange(r)}}
    return v91BaseDash();
  };

  // Manual zoom stays manual. Focusing / editing text never forces another auto-fit.
  const v91BaseSetZoom=window.setCanvasZoom;
  window.v91ZoomBy=function(delta){v91BaseSetZoom(Math.max(.3,Math.min(2.25,canvasZoom+Number(delta||0))));v91UpdateZoomLabel()};
  window.v91Fit=function(){canvasState.userZoomTouched=false;fitCanvasStage();setTimeout(v91UpdateZoomLabel,0)};
  function v91UpdateZoomLabel(){const x=document.getElementById('v91ZoomLabel');if(x)x.textContent=Math.round((canvasZoom||1)*100)+'%'}
  document.addEventListener('focusin',e=>{if(e.target?.closest?.('#canvasViewport') && e.target.closest('[contenteditable="true"]'))canvasState.userZoomTouched=true},true);
  const vp=document.getElementById('canvasViewport');
  if(vp){
    let pinch=null;
    vp.addEventListener('touchstart',e=>{if(window.__STUDIA_V115_OWNS_GESTURES)return;if(e.touches.length===2){const [a,b]=e.touches;pinch={d:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),z:canvasZoom};canvasState.userZoomTouched=true}}, {passive:true});
    vp.addEventListener('touchmove',e=>{if(window.__STUDIA_V115_OWNS_GESTURES)return;if(pinch&&e.touches.length===2){const [a,b]=e.touches,d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);v91BaseSetZoom(Math.max(.3,Math.min(2.25,pinch.z*(d/pinch.d))));v91UpdateZoomLabel();e.preventDefault()}}, {passive:false});
    vp.addEventListener('touchend',e=>{if(e.touches.length<2)pinch=null},{passive:true});
  }

  // Drawer close always restores the main editor strip; this fixes the “no bar after editing a format” state.
  const v91BaseCloseDrawer=window.closeEditorDrawer;
  window.closeEditorDrawer=function(){const r=v91BaseCloseDrawer();const nav=document.querySelector('.canvasQuickNav');if(nav){nav.style.removeProperty('display');nav.style.removeProperty('visibility');nav.style.removeProperty('opacity')}return r};

  const zoom=document.createElement('div');zoom.className='v91ZoomPill';zoom.innerHTML='<button onclick="v91ZoomBy(-.1)">−</button><span id="v91ZoomLabel">100%</span><button onclick="v91ZoomBy(.1)">＋</button><button onclick="v91Fit()">⊡</button>';document.body.appendChild(zoom);v91UpdateZoomLabel();
}catch(e){console.warn('V92 editor enhancement skipped safely:',e)}
/* ===== /V92 ===== */

/* ===== V96 — compact editor, font previews, multi-page canvas, free pan/zoom, subject redesign ===== */

// ---------- Compact font picker with real previews ----------
const V96_FONT_KEY="schoolbloom-v91-custom-fonts";
function v96StoredFonts(){try{return JSON.parse(localStorage.getItem(V96_FONT_KEY)||"[]")}catch(_){return []}}
function v96FontChoices(){
  return [
    {name:"Arial",css:"Arial"},
    {name:"Lato",css:"Lato, Arial, sans-serif"},
    {name:"Playfair Display",css:"'Playfair Display', Georgia, serif"},
    {name:"Georgia",css:"Georgia"},
    {name:"Verdana",css:"Verdana"},
    {name:"Trebuchet MS",css:"'Trebuchet MS'"},
    ...v96StoredFonts().map(f=>({name:f.name,css:f.name,custom:true}))
  ];
}
function v96FontDisplayName(css){
  const clean=String(css||"").replace(/["']/g,"").toLowerCase();
  const hit=v96FontChoices().find(f=>clean.includes(String(f.name).toLowerCase()));
  return hit?.name||String(css||"Schrift").split(",")[0].replace(/["']/g,"");
}
window.v96UseFont=function(css){applyTextProperty('fontFamily',css);mobileTextMode('text')};
window.v96OpenFontPicker=function(){
  const o=mobileSelectedText();if(!o)return;
  const current=o.style?.fontFamily||"Arial";
  const rows=v96FontChoices().map(f=>{
    const selected=String(current).replace(/["']/g,"").includes(f.name.replace(/["']/g,""));
    return `<button class="v96FontChoice ${selected?'selected':''}" onclick='v96UseFont(${JSON.stringify(f.css)})'>
      <span class="v96FontSample" style='font-family:${esc(f.css)}'>Abc 123</span>
      <span class="v96FontMeta"><b style='font-family:${esc(f.css)}'>${esc(f.name)}</b><small>${f.custom?'Eigene Schrift':'Standard'}</small></span>
      <i>${selected?'✓':'›'}</i>
    </button>`;
  }).join("");
  const content=$("#mobileTextModeContent");if(!content)return;
  content.innerHTML=`<div class="v96FontPicker"><div class="v96InlineHead"><button onclick="mobileTextMode('text')">‹</button><div><b>Schriftart</b><small>Tippe auf eine Schrift für die Vorschau.</small></div></div><div class="v96FontList">${rows}</div><button class="v96AddFontButton" onclick="v91PickFont()"><b>Aa＋</b><span>Eigene Schrift hinzufügen</span></button></div>`;
};

const v96PreviousTextModeContentHTML=mobileTextModeContentHTML;
mobileTextModeContentHTML=function(kind){
  const o=mobileSelectedText();if(!o)return '';
  const st=o.style||{};
  if(kind==='text'){
    const ff=st.fontFamily||"Arial",fs=st.fontSize||16,ta=st.textAlign||"left";
    return `<div class="v96TextPanel">
      <div class="v96TextPrimaryRow">
        <button class="v96FontChooser" onclick="v96OpenFontPicker()"><span class="fontPreviewAa" style='font-family:${esc(ff)}'>Aa</span><span><b style='font-family:${esc(ff)}'>${esc(v96FontDisplayName(ff))}</b><small>Schriftart</small></span><i>⌄</i></button>
        <div class="mobileSizeStep"><button onclick="mobileFontStep(-1)">−</button><input id="mobileFontSize" type="number" min="6" max="180" value="${fs}" onchange="applyTextProperty('fontSize',+this.value)"><button onclick="mobileFontStep(1)">＋</button></div>
        <button class="v96FmtBtn" onclick="formatSelectedText('bold')"><b>B</b></button>
        <button class="v96FmtBtn" onclick="formatSelectedText('italic')"><i>I</i></button>
        <button class="v96FmtBtn" onclick="formatSelectedText('underline')"><u>U</u></button>
        <button class="v96FmtBtn" onclick="formatSelectedText('strikeThrough')"><s>S</s></button>
      </div>
      <div class="v96TextSecondaryRow">
        <button class="${ta==='left'?'on':''}" onclick="applyTextProperty('textAlign','left');mobileRefreshTextMode()" title="Links">≡</button>
        <button class="${ta==='center'?'on':''}" onclick="applyTextProperty('textAlign','center');mobileRefreshTextMode()" title="Zentriert">≣</button>
        <button class="${ta==='right'?'on':''}" onclick="applyTextProperty('textAlign','right');mobileRefreshTextMode()" title="Rechts">≡</button>
        <button class="${ta==='justify'?'on':''}" onclick="applyTextProperty('textAlign','justify');mobileRefreshTextMode()" title="Blocksatz">☷</button>
        <span class="v96Divider"></span>
        <button onclick="formatSelectedText('insertUnorderedList')" title="Punkte">•≡</button>
        <button onclick="formatSelectedText('insertOrderedList')" title="Nummern">1≡</button>
        <button onclick="mobileDashList()" title="Striche">–≡</button>
      </div>
    </div>`;
  }
  if(kind==='appearance')return `<div class="v96CompactMode"><div class="v96CompactTitle"><b>Aussehen</b><span>Farben, Kontur und Transparenz</span></div><div class="v96CompactGrid">
      <label>Textfarbe<input type="color" value="${st.color||'#7a5f57'}" onchange="applyTextProperty('color',this.value)"></label>
      <label>Fläche<input type="color" value="${st.background&&st.background!=='transparent'?st.background:'#ffffff'}" onchange="updateObjStyle('background',this.value)"></label>
      <label>Kontur<input type="color" value="${st.borderColor||'#e5aaa9'}" onchange="updateObjStyle('borderColor',this.value)"></label>
      <label>Dicke<input type="number" min="0" max="20" value="${st.borderWidth||0}" onchange="updateObjStyle('borderWidth',+this.value)"></label>
      <label>Linie<select onchange="updateObjStyle('borderStyle',this.value)"><option value="solid" ${(!st.borderStyle||st.borderStyle==='solid')?'selected':''}>Durchgezogen</option><option value="dashed" ${st.borderStyle==='dashed'?'selected':''}>Gestrichelt</option><option value="dotted" ${st.borderStyle==='dotted'?'selected':''}>Gepunktet</option></select></label>
      <label>Transparenz<input type="range" min="0" max="100" value="${Math.round((st.opacity??1)*100)}" oninput="updateObjStyle('opacity',+this.value/100)"></label>
    </div><div class="v96ActionRow"><button onclick="mobileGradient()">✦ Verlauf</button><button onclick="updateObjStyle('background','transparent')">Fläche aus</button><button onclick="copySelectedCanvasFormat()">⧉ Format kopieren</button><button onclick="pasteSelectedCanvasFormat()">▣ Format einfügen</button></div></div>`;
  if(kind==='spacing')return `<div class="v96CompactMode"><div class="v96CompactTitle"><b>Abstand</b><span>Text und Innenraum</span></div><div class="v96CompactGrid">
      <label>Buchstaben<input type="number" step=".5" value="${st.letterSpacing||0}" onchange="updateObjStyle('letterSpacing',+this.value)"></label>
      <label>Zeilenhöhe<input type="number" step=".05" min=".8" max="3" value="${st.lineHeight||1.25}" onchange="updateObjStyle('lineHeight',+this.value)"></label>
      <label>Innenabstand<input type="number" min="0" max="80" value="${st.padding??7}" onchange="updateObjStyle('padding',+this.value)"></label>
      <label>Eckenradius<input type="number" min="0" max="80" value="${st.borderRadius||0}" onchange="updateObjStyle('borderRadius',+this.value)"></label>
    </div></div>`;
  if(kind==='position')return `<div class="v96CompactMode"><div class="v96CompactTitle"><b>Position</b><span>Größe und Ausrichtung</span></div><div class="v96CompactGrid">
      <label>X<input type="number" value="${Math.round(o.x)}" onchange="setSelectedGeometry('x',+this.value)"></label><label>Y<input type="number" value="${Math.round(o.y)}" onchange="setSelectedGeometry('y',+this.value)"></label>
      <label>Breite<input type="number" value="${Math.round(o.w)}" onchange="setSelectedGeometry('w',+this.value)"></label><label>Höhe<input type="number" value="${Math.round(o.h)}" onchange="setSelectedGeometry('h',+this.value)"></label>
    </div><div class="v96ActionRow two"><button onclick="alignSelected('centerX')">↔ Horizontal Mitte</button><button onclick="alignSelected('centerY')">↕ Vertikal Mitte</button></div></div>`;
  if(kind==='effects')return `<div class="v96CompactMode"><div class="v96CompactTitle"><b>Effekte</b><span>Schatten und Tiefe</span></div><div class="v96CompactGrid">
      <label>Blur<input id="mobileShadowBlur" type="number" min="0" max="60" value="14"></label><label>Versatz Y<input id="mobileShadowY" type="number" min="-30" max="30" value="5"></label>
    </div><div class="v96ActionRow two"><button onclick="mobileApplyShadow()">✦ Schatten an</button><button onclick="updateObjStyle('boxShadow','none')">Schatten aus</button></div></div>`;
  return v96PreviousTextModeContentHTML(kind);
};

// ---------- Multi-page canvas ----------
function v96Deep(v){return JSON.parse(JSON.stringify(v))}
function v96CurrentPageData(){return {objects:v96Deep(canvasState.objects||[]),vectors:v96Deep(canvasState.vectors||[]),orientation:canvasState.orientation||'portrait',pageStyle:v96Deep(canvasState.pageStyle||{color:'#fff',pattern:'blank',spacing:24,margin:55}),layerGroups:v96Deep(canvasState.layerGroups||[])}}
function v96BlankPage(){return {objects:[],vectors:[],orientation:canvasState.orientation||'portrait',pageStyle:v96Deep(canvasState.pageStyle||{color:'#fff',pattern:'blank',spacing:24,margin:55}),layerGroups:[]}}
function v96SyncPage(){
  canvasState.pages ||= [v96CurrentPageData()];
  canvasState.activePage=Math.max(0,Math.min(canvasState.pages.length-1,Number(canvasState.activePage)||0));
  canvasState.pages[canvasState.activePage]=v96CurrentPageData();
}
function v96LoadPageData(pg){
  canvasState.objects=v96Deep(pg?.objects||[]);canvasState.vectors=v96Deep(pg?.vectors||[]);
  canvasState.layerGroups=v96Deep(pg?.layerGroups||[]);
  canvasState.orientation=pg?.orientation==='landscape'?'landscape':'portrait';
  canvasState.pageStyle={color:'#ffffff',pattern:'blank',spacing:24,margin:55,...v96Deep(pg?.pageStyle||{})};
  canvasState.selectedType=null;canvasState.selectedId=null;canvasState.selectedIds=[];canvasState.selectedVectorIds=[];canvasState.multiMode=false;
  canvasState.history=[];canvasState.historyIndex=-1;
  applyCanvasPageSize();renderCanvasObjects();renderVectors();renderCanvasInspector();renderLayerList();clearGuides();pushHistory(true);canvasState.lastSavedHash=canvasSnapshot();
}
function v96EnsurePageStrip(){
  const vp=$("#canvasViewport");if(!vp)return null;
  let strip=$("#v96PageStrip");if(!strip){strip=document.createElement('div');strip.id='v96PageStrip';strip.className='v96PageStrip';vp.insertAdjacentElement('afterend',strip)}
  return strip;
}
function v96RenderPageStrip(){
  const strip=v96EnsurePageStrip();if(!strip)return;
  canvasState.pages ||= [v96CurrentPageData()];
  strip.innerHTML=`<div class="v96PageThumbs">${canvasState.pages.map((p,i)=>`<button class="v96PageThumb ${i===canvasState.activePage?'active':''}" onclick="v96SwitchPage(${i})"><span>${i+1}</span><small>Seite</small></button>`).join('')}<button class="v96PageAdd" onclick="v96AddPage()"><b>＋</b><small>Seite</small></button></div><div class="v96PageActions"><button onclick="v96DuplicatePage()">⧉</button><button onclick="v96DeletePage()">⌫</button></div>`;
}
window.v96SwitchPage=function(index){
  index=Number(index);if(index===canvasState.activePage||!canvasState.pages?.[index])return;
  v96SyncPage();canvasState.activePage=index;v96LoadPageData(canvasState.pages[index]);v96RenderPageStrip();markCanvasDirty();setTimeout(()=>v96FitCanvas(false),30);
};
window.v96AddPage=function(){
  v96SyncPage();canvasState.pages.push(v96BlankPage());canvasState.activePage=canvasState.pages.length-1;v96LoadPageData(canvasState.pages[canvasState.activePage]);v96RenderPageStrip();markCanvasDirty();cuteToast('Neue Seite hinzugefügt ♡');setTimeout(()=>v96FitCanvas(false),30);
};
window.v96DuplicatePage=function(){
  v96SyncPage();const copy=v96Deep(canvasState.pages[canvasState.activePage]);copy.objects.forEach(o=>o.id=id());copy.vectors.forEach(v=>v.id=id());canvasState.pages.splice(canvasState.activePage+1,0,copy);canvasState.activePage++;v96LoadPageData(copy);v96RenderPageStrip();markCanvasDirty();cuteToast('Seite dupliziert ✦');
};
window.v96DeletePage=function(){
  if((canvasState.pages||[]).length<=1)return cuteToast('Mindestens eine Seite bleibt ♡');
  if(!confirm('Diese Seite wirklich löschen?'))return;
  canvasState.pages.splice(canvasState.activePage,1);canvasState.activePage=Math.max(0,canvasState.activePage-1);v96LoadPageData(canvasState.pages[canvasState.activePage]);v96RenderPageStrip();markCanvasDirty();
};

const v96BaseRenderSheetEditor=renderSheetEditor;
renderSheetEditor=function(){
  v96BaseRenderSheetEditor();
  const sh=selectedSheetId?(data.studySheets||[]).find(x=>x.id===selectedSheetId):null;
  const saved=sh?.canvasData||null;
  canvasState.pages=saved?.pages?.length?v96Deep(saved.pages):[v96CurrentPageData()];
  canvasState.activePage=Math.max(0,Math.min(canvasState.pages.length-1,Number(saved?.activePage)||0));
  if(saved?.pages?.length)v96LoadPageData(canvasState.pages[canvasState.activePage]);
  v96EnsurePanSurface();v96RenderPageStrip();setTimeout(()=>v96FitCanvas(false),100);
};

saveCanvasSheetCore=function(auto=false){
  const {s,t}=currentTopic();if(!s||!t)return;
  v96SyncPage();
  const first=canvasState.pages?.[0]||v96CurrentPageData();
  const title=first.objects?.find(o=>["text","block"].includes(o.kind)&&(o.style?.fontSize||0)>=28)?.text?.replace(/<[^>]*>/g,"").slice(0,80)||t.title;
  const active=canvasState.pages[canvasState.activePage]||v96CurrentPageData();
  const dataObj={objects:v96Deep(active.objects),vectors:v96Deep(active.vectors),orientation:active.orientation,pageStyle:v96Deep(active.pageStyle),layerGroups:v96Deep(active.layerGroups||canvasState.layerGroups||[]),pages:v96Deep(canvasState.pages),activePage:canvasState.activePage};
  if(selectedSheetId){const sh=data.studySheets.find(x=>x.id===selectedSheetId);if(sh){sh.title=title;sh.canvasData=dataObj;sh.html=""}}
  else{const sh={id:id(),subject:s.name,topicId:t.id,title,html:"",canvasData:dataObj,created:Date.now()};data.studySheets.push(sh);selectedSheetId=sh.id}
  save();if(!auto){const el=$("#autosaveState");if(el){el.textContent="Gespeichert ✓";el.className="autosaveState saved"}}
};

// ---------- Free pan / pinch zoom ----------
function v96EnsurePanSurface(){
  const vp=$("#canvasViewport"),stage=$("#canvasStage");if(!vp||!stage)return null;
  let surface=$("#v96PanSurface");
  if(!surface){surface=document.createElement('div');surface.id='v96PanSurface';surface.className='v96PanSurface';stage.parentNode.insertBefore(surface,stage);surface.appendChild(stage)}
  return surface;
}
function v96ApplyZoom(value,preserve=true,focus=null){
  const vp=$("#canvasViewport"),stage=$("#canvasStage"),surface=v96EnsurePanSurface();if(!vp||!stage||!surface)return;
  const old=Math.max(.2,Number(stage.dataset.scale)||canvasZoom||1),z=Math.max(.25,Math.min(3,Number(value)||1));
  let docX,docY;
  if(focus){const sr=surface.getBoundingClientRect();docX=(focus.x-sr.left+vp.scrollLeft)/old;docY=(focus.y-sr.top+vp.scrollTop)/old}
  else if(preserve){docX=(vp.scrollLeft+vp.clientWidth/2)/old;docY=(vp.scrollTop+vp.clientHeight/2)/old}
  canvasZoom=z;canvasState.userZoomTouched=true;stage.dataset.scale=String(z);stage.style.zoom='';stage.style.transform=`scale(${z})`;stage.style.transformOrigin='0 0';
  surface.style.width=(canvasPageWidth()*z)+'px';surface.style.height=(canvasPageHeight()*z)+'px';
  const label=$("#canvasZoomLabel");if(label)label.textContent=Math.round(z*100)+'%';const pill=$("#v91ZoomLabel");if(pill)pill.textContent=Math.round(z*100)+'%';
  requestAnimationFrame(()=>{if(docX!=null){vp.scrollLeft=Math.max(0,docX*z-(focus?focus.x:vp.clientWidth/2));vp.scrollTop=Math.max(0,docY*z-(focus?focus.y:vp.clientHeight/2))}});
}
function v96FitCanvas(markUser=false){
  const vp=$("#canvasViewport");if(!vp)return;const z=Math.min(1,Math.max(.25,(vp.clientWidth-28)/canvasPageWidth()));
  const touched=canvasState.userZoomTouched;v96ApplyZoom(z,false);canvasState.userZoomTouched=markUser?true:touched;vp.scrollLeft=0;vp.scrollTop=0;
}
fitCanvasToScreen=function(){v96FitCanvas(false)};window.fitCanvasToScreen=fitCanvasToScreen;
window.fitCanvasStage=function(){v96FitCanvas(true)};
window.setCanvasZoom=function(v){v96ApplyZoom(v,true)};
window.canvasZoomBy=function(delta){v96ApplyZoom(canvasZoom+Number(delta||0),true)};
const v96OldApplyPageSize=applyCanvasPageSize;
applyCanvasPageSize=function(){v96OldApplyPageSize();setTimeout(()=>v96ApplyZoom(canvasZoom||1,false),0)};

(function v96InstallCanvasGestures(){
 const vp=$("#canvasViewport");if(!vp||vp.dataset.v96Gesture)return;vp.dataset.v96Gesture='1';
 let pinch=null;
 vp.addEventListener('touchstart',e=>{if(window.__STUDIA_V115_OWNS_GESTURES)return;
   if(e.touches.length!==2)return; e.preventDefault();e.stopImmediatePropagation();
   const a=e.touches[0],b=e.touches[1],rect=vp.getBoundingClientRect();
   pinch={dist:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),zoom:canvasZoom,focus:{x:(a.clientX+b.clientX)/2-rect.left,y:(a.clientY+b.clientY)/2-rect.top}};
   canvasState.userZoomTouched=true;
 },{capture:true,passive:false});
 vp.addEventListener('touchmove',e=>{if(window.__STUDIA_V115_OWNS_GESTURES)return;
   if(!pinch||e.touches.length!==2)return;e.preventDefault();e.stopImmediatePropagation();
   const a=e.touches[0],b=e.touches[1],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);v96ApplyZoom(pinch.zoom*(d/pinch.dist),true,pinch.focus);
 },{capture:true,passive:false});
 vp.addEventListener('touchend',e=>{if(e.touches.length<2)pinch=null},{capture:true,passive:true});
})();

// ---------- Subject/notebook detail: close to the supplied reference ----------
const v96BaseRenderSubjectDetail=renderSubjectDetail;
window.v96FilterTopics=function(q){const term=String(q||'').trim().toLowerCase();document.querySelectorAll('.v96TopicCard').forEach(c=>c.hidden=!!term&&!c.dataset.search.includes(term))};
renderSubjectDetail=function(){
  if(window.innerWidth>=900)return v96BaseRenderSubjectDetail();
  const root=$("#subjectDetail");if(!root)return;const s=data.subjects.find(x=>x.id===selectedSubjectId);if(!s){root.innerHTML='<div class="empty">Fach nicht gefunden.</div>';return}ensureSubjectShape(s);
  const topics=s.topics||[];
  let totalResources=0,populated=0;
  const cards=topics.map(t=>{
    const topicDecks=(data.flashDecks||[]).filter(d=>d.subject===s.name&&d.topicId===t.id);
    const cardsCount=topicDecks.reduce((sum,d)=>sum+(data.flashcards||[]).filter(c=>c.deckId===d.id).length,0);
    const sheets=(data.studySheets||[]).filter(x=>x.subject===s.name&&x.topicId===t.id).length;
    const quizzes=(data.quizzes||[]).filter(x=>x.subject===s.name&&x.topicId===t.id).length;
    const files=(t.files||[]).length;const resources=sheets+cardsCount+quizzes+files;totalResources+=resources;if(resources)populated++;
    return `<button class="v96TopicCard" data-search="${esc((t.title+' '+(t.text||'')).toLowerCase())}" onclick="openTopic('${s.id}','${t.id}')">
      <span class="v96FolderTab"></span><span class="v96TopicTop"><i>${esc(s.emoji||'🌿')}</i><b>${esc(t.title)}</b><strong>›</strong></span>
      <span class="v96TopicStats"><em>▧ <span>${sheets} Lernblätter</span></em><em>▤ <span>${cardsCount} Karteikarten</span></em><em>ⓘ <span>${quizzes} Quizze</span></em><em>⌑ <span>${files} Dateien</span></em></span>
    </button>`;
  }).join('')||'<div class="v96EmptyTopics">Noch keine Themen. Tippe auf <b>+ Thema</b>.</div>';
  const pct=topics.length?Math.round(populated/topics.length*100):0;
  root.innerHTML=`<div class="v96SubjectPage">
    <div class="v96SubjectHeader"><button onclick="leaveSubjectNotebook()">←</button><div><h2>${esc(s.name)}</h2><p>Themenordner</p></div><span class="v96LeafDecor">🌿</span></div>
    <div class="v96SubjectTools"><label><span>⌕</span><input placeholder="Themen suchen …" oninput="v96FilterTopics(this.value)"></label><button onclick="openNewTopic('${s.id}')">＋ Thema</button></div>
    <div class="v96TopicGrid">${cards}</div>
    <div class="v96SubjectOverview"><span class="v96OverviewFlower">${esc(s.emoji||'🌷')}</span><div><small>Dein Überblick</small><b>${topics.length} ${topics.length===1?'Thema':'Themen'} insgesamt</b><div class="v96Progress"><i style="width:${pct}%"></i></div><span>${totalResources} Lerninhalte · ${pct}% mit Inhalten</span></div><button onclick="openCoverEditor('${s.id}')">Gestalten</button></div>
    <button class="v96DeleteSubject" onclick="deleteSubjectFromPage('${s.id}')">Fach löschen</button>
  </div>`;
};

// ---------- Home: clearer shortcuts; Fächer is no longer hidden behind “Notiz” ----------
(function v96HomeCleanup(){
 const a=document.querySelector('.homeMiniActions');if(a){
   const b=[...a.querySelectorAll('button')];
   if(b[0])b[0].innerHTML='<span>＋</span> Aufgabe';
   if(b[1])b[1].innerHTML='<span>✦</span> Test';
   if(b[2]){b[2].innerHTML='<span>▤</span> Fächer';b[2].setAttribute('onclick',"openView('subjects')")}
   if(b[3]){b[3].innerHTML='<span>◷</span> Lernen';b[3].setAttribute('onclick',"openView('study')")}
 }
})();



// ===== V97 — subject/settings + topic hub reference redesign =====
function v97TopicStats(s,t){
  const decks=(data.flashDecks||[]).filter(d=>d.subject===s.name&&d.topicId===t.id);
  const cardCount=decks.reduce((sum,d)=>sum+(data.flashcards||[]).filter(c=>c.deckId===d.id).length,0);
  const sheets=(data.studySheets||[]).filter(x=>x.subject===s.name&&x.topicId===t.id);
  const quizzes=(data.quizzes||[]).filter(x=>x.subject===s.name&&x.topicId===t.id);
  const tests=(data.tests||[]).filter(x=>x.subject===s.name&&x.topicId===t.id);
  t.notes ||= []; t.files ||= [];
  return {decks,cardCount,sheets,quizzes,tests,notes:t.notes,files:t.files};
}
function v97LeafIcon(){return `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 25c3-8 8-13 15-17"/><path d="M13 18c-4-.4-7-2.6-8-6 4-.7 7 .6 9 4"/><path d="M18 13c-.2-4 1.6-7 5-9 1.2 3.8.3 7-3 9"/><path d="M17 20c4-.2 7 1.3 9 4-3.4 1.4-6.8.7-9-2"/></svg>`}
function v97ResourceIcon(kind){
  const icons={
    sheets:`<svg viewBox="0 0 32 32"><path d="M9 4h10l5 5v19H9z"/><path d="M19 4v6h6"/><path d="M13 16h7M13 21h7"/></svg>`,
    cards:`<svg viewBox="0 0 32 32"><rect x="7" y="7" width="17" height="20" rx="2"/><path d="M11 4h16a2 2 0 0 1 2 2v17"/><path d="M11 13h9M11 18h9"/></svg>`,
    quizzes:`<svg viewBox="0 0 32 32"><rect x="6" y="5" width="20" height="22" rx="3"/><path d="M12 12c.4-2 2-3 4-3 2.4 0 4 1.4 4 3.4 0 2.8-4 2.7-4 5.1"/><circle cx="16" cy="22" r="1"/></svg>`,
    tests:`<svg viewBox="0 0 32 32"><rect x="7" y="5" width="18" height="23" rx="3"/><path d="M12 4h8v4h-8z"/><path d="m11 15 2 2 4-5M19 15h3M11 22l2 2 4-5M19 22h3"/></svg>`,
    notes:`<svg viewBox="0 0 32 32"><rect x="8" y="5" width="17" height="22" rx="2"/><path d="M12 11h9M12 16h9M12 21h6"/><path d="M5 9v15"/></svg>`,
    files:`<svg viewBox="0 0 32 32"><path d="M9 4h10l6 6v18H9z"/><path d="M19 4v7h7"/><path d="M13 17h8M13 22h8"/></svg>`
  };return icons[kind]||icons.files;
}
window.v97FilterTopics=function(q){const term=String(q||'').trim().toLowerCase();document.querySelectorAll('.v97TopicCard').forEach(c=>c.hidden=!!term&&!c.dataset.search.includes(term))};

window.openSubjectSettings=function(sid=selectedSubjectId){
  const s=data.subjects.find(x=>x.id===sid);if(!s)return;ensureSubjectShape(s);
  openModal(`<div class="v97SettingsModal"><div class="eyebrow">FACH</div><h2>${esc(s.name)} einstellen</h2><p class="small">Name und Notizbuch-Einstellungen dieses Fachs.</p>
    <label>Name des Fachs</label><input id="v97SubjectName" value="${esc(s.name)}" maxlength="50">
    <label>Abkürzung</label><input id="v97SubjectAbbr" value="${esc(s.abbr||defaultSubjectAbbr(s.name))}" maxlength="8">
    <div class="v97SettingsActions"><button class="primary" onclick="saveSubjectSettings('${s.id}')">Speichern</button><button class="ghost" onclick="closeModal();openCoverEditor('${s.id}')">Cover & Farbe</button></div>
    <div class="v97DangerZone"><b>Gefahrenbereich</b><span>Das Fach und seine Themen werden aus dem Notizbuch entfernt.</span><button onclick="deleteSubjectFromSettings('${s.id}')">Fach löschen</button></div>
  </div>`);
};
window.saveSubjectSettings=function(sid){
  const s=data.subjects.find(x=>x.id===sid);if(!s)return;
  const old=s.name,newName=String($('#v97SubjectName')?.value||'').trim();if(!newName)return alert('Bitte gib einen Fachnamen ein.');
  const duplicate=data.subjects.some(x=>x.id!==sid&&x.name.trim().toLowerCase()===newName.toLowerCase());if(duplicate)return alert('Ein Fach mit diesem Namen gibt es bereits.');
  s.name=newName;s.abbr=String($('#v97SubjectAbbr')?.value||'').trim()||defaultSubjectAbbr(newName);
  const collections=[data.flashDecks,data.flashcards,data.studySheets,data.quizzes,data.tests,data.homework,data.grades];
  collections.forEach(arr=>(arr||[]).forEach(x=>{if(x.subject===old)x.subject=newName}));
  save();closeModal();selectedSubjectId=sid;openView('subject-detail');
};
window.deleteSubjectFromSettings=function(sid){
  const s=data.subjects.find(x=>x.id===sid);if(!s)return;
  if(!confirm(`„${s.name}“ wirklich löschen?`))return;
  data.subjects=data.subjects.filter(x=>x.id!==sid);save();closeModal();selectedSubjectId=null;selectedTopicId=null;openView('subjects');
};

const v97DesktopSubjectRender=v96BaseRenderSubjectDetail;
renderSubjectDetail=function(){
  if(window.innerWidth>=900)return v97DesktopSubjectRender();
  const root=$('#subjectDetail');if(!root)return;const s=data.subjects.find(x=>x.id===selectedSubjectId);if(!s){root.innerHTML='<div class="empty">Fach nicht gefunden.</div>';return}ensureSubjectShape(s);
  const cards=(s.topics||[]).map(t=>{const st=v97TopicStats(s,t);return `<button class="v97TopicCard" data-search="${esc((t.title+' '+(t.text||'')).toLowerCase())}" onclick="openTopic('${s.id}','${t.id}')">
      <span class="v97FolderTab"></span><span class="v97TopicHead"><i>${v97LeafIcon()}</i><b>${esc(t.title)}</b><strong>›</strong></span>
      <span class="v97TopicStats"><em>${v97ResourceIcon('sheets')}<span>${st.sheets.length} Lernblätter</span></em><em>${v97ResourceIcon('cards')}<span>${st.cardCount} Karteikarten</span></em><em>${v97ResourceIcon('quizzes')}<span>${st.quizzes.length} Quizze</span></em><em>${v97ResourceIcon('tests')}<span>${st.tests.length} ${st.tests.length===1?'Test':'Tests'}</span></em></span>
    </button>`}).join('')||'<div class="v97EmptyTopics">Noch keine Themen. Tippe auf <b>+ Thema</b>.</div>';
  root.innerHTML=`<div class="v97SubjectPage">
    <div class="v97SubjectHeader"><button class="v97Back" onclick="leaveSubjectNotebook()">←</button><div><h2>${esc(s.name)}</h2><p>Themenordner</p></div><button class="v97SubjectGear" onclick="openSubjectSettings('${s.id}')" aria-label="Fach einstellen">⚙︎</button></div>
    <div class="v97SubjectTools"><label><span>⌕</span><input placeholder="Themen suchen …" oninput="v97FilterTopics(this.value)"></label><button onclick="openNewTopic('${s.id}')"><span>＋</span> Thema</button></div>
    <div class="v97TopicGrid">${cards}</div>
  </div>`;
};

function v97TopicResourceCounts(s,t){return v97TopicStats(s,t)}
function v97TopicCard(kind,title,count,desc,tone){
  return `<button class="v97ResourceCard tone-${tone}" onclick="v97OpenTopicHub('${kind}')"><span class="v97ResourceIcon">${v97ResourceIcon(kind)}</span><b>${title}</b><small>▱ ${count} ${title}</small><p>${desc}</p><span class="v97OpenHint">Öffnen <i>›</i></span></button>`;
}
const v97BaseRenderTopicDetail=renderTopicDetail;
renderTopicDetail=function(){
  if(window.innerWidth>=900)return v97BaseRenderTopicDetail();
  const root=$('#topicDetail');if(!root)return;const {s,t}=currentTopic();if(!s||!t){root.innerHTML='<div class="empty">Thema nicht gefunden.</div>';return}ensureSubjectShape(s);t.notes ||= [];t.files ||= [];
  const st=v97TopicResourceCounts(s,t);
  root.innerHTML=`<div class="v97TopicPage">
    <div class="v97TopicHeader"><button class="v97Back" onclick="backToNotebook()">←</button><div class="v97TopicBreadcrumb"><span>${esc(s.name)}</span><i>›</i><b>${esc(t.title)}</b></div><div class="v97Tulip">🌷<span>♡</span></div></div>
    <h2>${esc(t.title)}</h2><p class="v97TopicSubtitle">Alle Inhalte an einem Ort</p>
    <div class="v97ResourceGrid">
      ${v97TopicCard('sheets','Lernblätter',st.sheets.length,'Übersichten, Erklärungen und Arbeitsblätter.','green')}
      ${v97TopicCard('cards','Karteikarten',st.cardCount,'Wichtige Begriffe und Definitionen.','peach')}
      ${v97TopicCard('quizzes','Quizze',st.quizzes.length,'Teste dein Wissen mit verschiedenen Fragetypen.','purple')}
      ${v97TopicCard('tests','Tests',st.tests.length,'Simuliere Prüfungen und behalte Termine im Blick.','blue')}
    </div>
    <div class="v97SmallResources">
      <button onclick="v97OpenTopicHub('notes')"><span class="v97SmallIcon tone-orange">${v97ResourceIcon('notes')}</span><span><b>Notizen</b><small>▱ ${st.notes.length} Notizen</small><p>Eigene Mitschriften und Gedanken.</p></span><i>›</i></button>
      <button onclick="v97OpenTopicHub('files')"><span class="v97SmallIcon tone-teal">${v97ResourceIcon('files')}</span><span><b>Dateien</b><small>▱ ${st.files.length} Dateien</small><p>Zusätzliche Materialien und Dokumente.</p></span><i>›</i></button>
    </div>
    <div class="v97Motivation"><span>🌷</span><div><b>Bleib dran – du machst das!</b><small>Kleine Schritte, große Ziele.</small></div><i>♡　♡　♡</i></div>
    <input id="v97TopicFileInput" type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx" hidden onchange="v97AddTopicFiles(this.files)">
  </div>`;
};

function v97HubHeader(title,sub=''){return `<div class="v97HubHead"><button onclick="closeModal()">←</button><div><div class="eyebrow">${sub}</div><h2>${title}</h2></div></div>`}
window.v97OpenTopicHub=function(kind){
  const {s,t}=currentTopic();if(!s||!t)return;const st=v97TopicStats(s,t);
  if(kind==='sheets'){
    const items=st.sheets.map(x=>`<button class="v97HubItem" onclick="v97OpenSheet('${x.id}')"><span>${v97ResourceIcon('sheets')}</span><div><b>${esc(x.title)}</b><small>${x.canvasData?'A4 Canvas-Lernblatt':'A4 Lernblatt'}</small></div><i>›</i></button>`).join('')||'<div class="empty">Noch kein Lernblatt.</div>';
    openModal(`${v97HubHeader('Lernblätter',esc(t.title))}<div class="v97HubActions"><button class="primary" onclick="v97NewSheet()">＋ Lernblatt</button></div><div class="v97HubList">${items}</div>`);return;
  }
  if(kind==='cards'){
    const items=st.decks.map(d=>`<button class="v97HubItem" onclick="v97OpenDeck('${d.id}')"><span>${v97ResourceIcon('cards')}</span><div><b>${esc(d.name)}</b><small>${(data.flashcards||[]).filter(c=>c.deckId===d.id).length} Karten</small></div><i>›</i></button>`).join('')||'<div class="empty">Noch kein Kartenordner.</div>';
    openModal(`${v97HubHeader('Karteikarten',esc(t.title))}<div class="v97HubActions"><button class="primary" onclick="v97NewDeck()">＋ Ordner</button></div><div class="v97HubList">${items}</div>`);return;
  }
  if(kind==='quizzes'){
    const items=st.quizzes.map(q=>`<button class="v97HubItem" onclick="v97OpenQuiz('${q.id}')"><span>${v97ResourceIcon('quizzes')}</span><div><b>${esc(q.name)}</b><small>${(q.questions||[]).length} Fragen</small></div><i>›</i></button>`).join('')||'<div class="empty">Noch kein Quiz.</div>';
    openModal(`${v97HubHeader('Quizze',esc(t.title))}<div class="v97HubActions"><button class="primary" onclick="v97NewQuiz()">＋ Quiz</button></div><div class="v97HubList">${items}</div>`);return;
  }
  if(kind==='tests'){
    const items=st.tests.map(x=>`<div class="v97HubItem static"><span>${v97ResourceIcon('tests')}</span><div><b>${esc(x.type||'Test')}</b><small>${esc(x.date||'Ohne Datum')} · ${esc(x.text||'Keine Beschreibung')}</small></div><button class="v97MiniDelete" onclick="v97DeleteTopicTest('${x.id}')">×</button></div>`).join('')||'<div class="empty">Noch kein Test für dieses Thema.</div>';
    openModal(`${v97HubHeader('Tests',esc(t.title))}<div class="v97HubActions"><button class="primary" onclick="v97NewTopicTest()">＋ Test</button></div><div class="v97HubList">${items}</div>`);return;
  }
  if(kind==='notes'){
    const items=st.notes.map(n=>`<button class="v97HubItem" onclick="v97EditTopicNote('${n.id}')"><span>${v97ResourceIcon('notes')}</span><div><b>${esc(n.title||'Notiz')}</b><small>${esc((n.text||'').slice(0,80)||'Antippen zum Bearbeiten')}</small></div><i>›</i></button>`).join('')||'<div class="empty">Noch keine Notizen.</div>';
    openModal(`${v97HubHeader('Notizen',esc(t.title))}<div class="v97HubActions"><button class="primary" onclick="v97NewTopicNote()">＋ Notiz</button></div><div class="v97HubList">${items}</div>`);return;
  }
  if(kind==='files'){
    const items=st.files.map(f=>`<div class="v97HubItem static"><span>${v97ResourceIcon('files')}</span><button class="v97FileOpen" onclick="openStoredFile('${f.id}')"><b>${esc(f.name)}</b><small>${esc(f.type||'Datei')}</small></button><button class="v97MiniDelete" onclick="v97DeleteTopicFile('${f.id}')">×</button></div>`).join('')||'<div class="empty">Noch keine Dateien.</div>';
    openModal(`${v97HubHeader('Dateien',esc(t.title))}<div class="v97HubActions"><button class="primary" onclick="closeModal();setTimeout(()=>document.querySelector('#v97TopicFileInput')?.click(),60)">＋ Datei</button></div><div class="v97HubList">${items}</div>`);return;
  }
};
window.v97OpenSheet=function(id){closeModal();openStudySheetEditor(id)};
window.v97NewSheet=function(){closeModal();openStudySheetEditor()};
window.v97OpenDeck=function(id){closeModal();openDeck(id)};
window.v97NewDeck=function(){closeModal();setTimeout(()=>createDeckPrompt(),40)};
window.v97OpenQuiz=function(id){closeModal();setTimeout(()=>editQuiz(id),40)};
window.v97NewQuiz=function(){closeModal();setTimeout(()=>createQuizPrompt(),40)};
window.v97NewTopicTest=function(){
  const {s,t}=currentTopic();if(!s||!t)return;openModal(`${v97HubHeader('Neuer Test',esc(t.title))}<div class="formGrid"><div><label>Datum</label><input id="v97TestDate" type="date" value="${todayISO()}"></div><div><label>Art</label><select id="v97TestType"><option>Test</option><option>Klassenarbeit</option><option>Prüfung</option><option>Präsentation</option></select></div><div class="full"><label>Beschreibung / Themen</label><textarea id="v97TestText" placeholder="Was kommt dran?"></textarea></div></div><button class="primary" style="margin-top:12px" onclick="v97SaveTopicTest()">Speichern</button>`)
};
window.v97SaveTopicTest=function(){const {s,t}=currentTopic();if(!s||!t)return;data.tests.push({id:id(),subject:s.name,topicId:t.id,date:$('#v97TestDate').value,type:$('#v97TestType').value,reminder:1,text:$('#v97TestText').value.trim(),files:[]});save();v97OpenTopicHub('tests')};
window.v97DeleteTopicTest=function(tid){if(!confirm('Test löschen?'))return;data.tests=data.tests.filter(x=>x.id!==tid);save();v97OpenTopicHub('tests')};
window.v97NewTopicNote=function(){const {t}=currentTopic();if(!t)return;openModal(`${v97HubHeader('Neue Notiz',esc(t.title))}<label>Titel</label><input id="v97NoteTitle" placeholder="z. B. Zusammenfassung"><label style="margin-top:10px">Notiz</label><textarea id="v97NoteText" placeholder="Schreib deine Notiz …"></textarea><button class="primary" style="margin-top:12px" onclick="v97SaveTopicNote()">Speichern</button>`)};
window.v97SaveTopicNote=function(noteId=null){const {t}=currentTopic();if(!t)return;t.notes ||= [];const title=String($('#v97NoteTitle')?.value||'').trim()||'Notiz',text=String($('#v97NoteText')?.value||'').trim();if(noteId){const n=t.notes.find(x=>x.id===noteId);if(n){n.title=title;n.text=text}}else t.notes.push({id:id(),title,text,created:Date.now()});save();v97OpenTopicHub('notes')};
window.v97EditTopicNote=function(nid){const {t}=currentTopic();const n=t?.notes?.find(x=>x.id===nid);if(!n)return;openModal(`${v97HubHeader('Notiz bearbeiten',esc(t.title))}<label>Titel</label><input id="v97NoteTitle" value="${esc(n.title||'Notiz')}"><label style="margin-top:10px">Notiz</label><textarea id="v97NoteText">${esc(n.text||'')}</textarea><div class="v97SettingsActions"><button class="primary" onclick="v97SaveTopicNote('${nid}')">Speichern</button><button class="dangerBtn" onclick="v97DeleteTopicNote('${nid}')">Löschen</button></div>`)};
window.v97DeleteTopicNote=function(nid){const {t}=currentTopic();if(!t||!confirm('Notiz löschen?'))return;t.notes=(t.notes||[]).filter(x=>x.id!==nid);save();v97OpenTopicHub('notes')};
window.v97AddTopicFiles=async function(files){const {t}=currentTopic();if(!t)return;t.files ||= [];for(const f of [...files]){const fid=id();await dbPut({id:fid,name:f.name,type:f.type,blob:f});t.files.push({id:fid,name:f.name,type:f.type||'Datei'})}save();renderTopicDetail();v97OpenTopicHub('files')};
window.v97DeleteTopicFile=async function(fid){const {t}=currentTopic();if(!t||!confirm('Datei löschen?'))return;await dbDelete(fid);t.files=(t.files||[]).filter(x=>x.id!==fid);save();v97OpenTopicHub('files')};

// Context-aware top settings button: subject settings inside a subject notebook, normal settings elsewhere.
(function v97ContextGear(){
  const gear=document.querySelector('.header .iconbtn');if(!gear)return;
  gear.onclick=()=>{if(document.querySelector('#view-subject-detail.active')&&selectedSubjectId){openSubjectSettings(selectedSubjectId)}else openView('settings')};
})();

/* ===== /V97 ===== */

/* ===== /V96 ===== */


/* ===== Studia V103 behavior ===== */

(()=>{
  const SVG={
    search:`<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>`,
    settings:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/></svg>`,
    back:`<svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg>`,
    book:`<svg viewBox="0 0 24 24"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22zM20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22z"/></svg>`,
    pencil:`<svg viewBox="0 0 24 24"><path d="m4 20 4.2-1 10-10-3.2-3.2-10 10zM14.8 5.8l3.2 3.2"/></svg>`,
    calculator:`<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><rect x="8" y="6" width="8" height="3" rx="1"/><path d="M8 13h1M12 13h1M16 13h1M8 17h1M12 17h1M16 17h1"/></svg>`,
    chat:`<svg viewBox="0 0 24 24"><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/></svg>`,
    atom:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="9" ry="3.7"/><ellipse cx="12" cy="12" rx="9" ry="3.7" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.7" transform="rotate(120 12 12)"/></svg>`,
    palette:`<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18h1.2c1.2 0 1.8-1.5 1-2.3-.9-.9-.2-2.7 1.2-2.7H18a3 3 0 0 0 3-3c0-5.5-4-10-9-10z"/><circle cx="8" cy="9" r="1"/><circle cx="12" cy="7" r="1"/><circle cx="16" cy="10" r="1"/><circle cx="8" cy="14" r="1"/></svg>`,
    folder:`<svg viewBox="0 0 24 24"><path d="M3 7h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7V5a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v2"/></svg>`,
    sheet:`<svg viewBox="0 0 24 24"><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></svg>`,
    homework:`<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 9h8M8 13h8M8 17h5"/></svg>`,
    cards:`<svg viewBox="0 0 24 24"><rect x="5" y="7" width="14" height="12" rx="2"/><path d="M8 4h11a2 2 0 0 1 2 2v10M8 11h8M8 15h6"/></svg>`,
    quiz:`<svg viewBox="0 0 24 24"><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-7l-4 3v-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.8-2.5 2-2.5 3.5M12 15h.01"/></svg>`,
    test:`<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 10l1.5 1.5L12 9M14 10h2M8 15l1.5 1.5L12 14M14 15h2"/></svg>`,
    worksheet:`<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h4M8 16h6"/></svg>`,
    heart:`<svg viewBox="0 0 24 24"><path d="M20 8.5c0 5-8 10-8 10s-8-5-8-10A4.5 4.5 0 0 1 12 5a4.5 4.5 0 0 1 8 3.5z"/></svg>`,
    image:`<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m5 18 5-5 3 3 2-2 4 4"/></svg>`,
    rect:`<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"/></svg>`,
    circle:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>`,
    triangle:`<svg viewBox="0 0 24 24"><path d="m12 4 8 15H4z"/></svg>`,
    line:`<svg viewBox="0 0 24 24"><path d="M4 12h16"/></svg>`,
    graph:`<svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h16"/><path d="m7 16 4-5 3 2 4-6"/></svg>`,
    formula:`<svg viewBox="0 0 24 24"><path d="M18 5H9l5 7-5 7h9"/></svg>`,
    table:`<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16M15 4v16"/></svg>`,
    layers:`<svg viewBox="0 0 24 24"><path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/></svg>`,
    template:`<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>`,
    pages:`<svg viewBox="0 0 24 24"><path d="M7 3h10v14H7z"/><path d="M4 7v14h10"/></svg>`
  };
  window.v102Icon=(name)=>SVG[name]||SVG.sheet;
  function subjectIconKey(s){return s.iconKey||({Mathematik:'calculator',Deutsch:'pencil',Englisch:'chat',Biologie:'atom',Geschichte:'book'}[s.name]||'book')}
  function colorAt(i){return [['#f8e3e6','#c67f84','#efafb4'],['#fff0cf','#b38b49','#edc9a3'],['#e9f1dc','#819c64','#c8dba9'],['#e9eef8','#7890b2','#b9cbe8']][i%4]}
  function typedSheets(s,t,type){return (data.studySheets||[]).filter(x=>x.subject===s.name&&x.topicId===t.id&&(x.resourceType||'sheet')===type)}
  data.writtenTests ||= [];

  window.v102FilterSubjects=function(q){const term=String(q||'').trim().toLowerCase();document.querySelectorAll('.v102Notebook[data-search]').forEach(c=>c.hidden=!!term&&!c.dataset.search.includes(term))}
  window.v102FilterTopics=function(q){const term=String(q||'').trim().toLowerCase();document.querySelectorAll('.v102TopicFolder').forEach(c=>c.hidden=!!term&&!c.dataset.search.includes(term))}

  renderSubjects=function(){
    const root=$('#subjectList');if(!root)return;data.subjects=Array.isArray(data.subjects)?data.subjects:[];data.subjects.forEach(ensureSubjectShape);
    const cards=data.subjects.map((s,i)=>{const c=colorAt(i),key=subjectIconKey(s);return `<button class="v102Notebook" data-search="${esc(s.name.toLowerCase())}" style="--ring:${c[2]};--pin:${c[2]}" onclick="openSubject('${s.id}')"><span class="v102NotebookPin"></span><span class="v102NotebookIcon" style="--bubble:${c[0]};color:${c[1]}">${v102Icon(key)}</span><strong>${esc(s.name)}</strong><small>${(s.topics||[]).length} ${(s.topics||[]).length===1?'Thema':'Themen'}</small><span class="v102Heart">${v102Icon('heart')}</span></button>`}).join('');
    root.className='';root.innerHTML=`<div class="v102SubjectsPage"><div class="v102SubjectPageHead"><div><h2>Fächer</h2><p>Deine Fächer</p></div><button class="v102RoundIcon" onclick="openView('settings')" aria-label="Einstellungen">${v102Icon('settings')}</button></div><div class="v102SubjectTools"><label class="v102Search">${v102Icon('search')}<input placeholder="Fächer suchen" oninput="v102FilterSubjects(this.value)"></label><button class="v102AddSubject" onclick="openAddSubject()">＋ Fach</button></div><div class="v102NotebookGrid">${cards||''}<button class="v102Notebook v102EmptyAdd" onclick="openAddSubject()"><span class="plus">＋</span><b>Fach hinzufügen</b></button></div></div>`;
  };

  window.openAddSubject=function(){
    openModal(`<h2>Fach erstellen</h2><div class="formGrid"><div class="full"><label>Fachname</label><input id="sName" placeholder="z. B. Biologie"></div><div><label>Abkürzung</label><input id="sAbbr" maxlength="8" placeholder="BIO"></div><div><label>Symbol</label><select id="sIcon"><option value="book">Buch</option><option value="pencil">Stift</option><option value="calculator">Rechner</option><option value="chat">Sprache</option><option value="atom">Naturwissenschaft</option><option value="palette">Kunst</option></select></div><div><label>Akzent</label><input id="sColor" type="color" value="#c77f84"></div><div><label>Cover</label><input id="sCover" type="color" value="#f7dfe1"></div></div><button class="primary" style="margin-top:12px" onclick="addSubject()">Erstellen</button>`)
  };
  window.addSubject=function(){const n=String($('#sName')?.value||'').trim();if(!n)return;const ab=String($('#sAbbr')?.value||'').trim()||defaultSubjectAbbr(n);data.subjects.push({id:id(),name:n,abbr:ab,color:$('#sColor')?.value||'#c77f84',cover:$('#sCover')?.value||'#f7dfe1',iconKey:$('#sIcon')?.value||'book',notes:[],topics:[],files:[]});save();closeModal();renderSubjects()};

    window.openSubjectSettings=function(sid=selectedSubjectId){const s=data.subjects.find(x=>x.id===sid);if(!s)return;ensureSubjectShape(s);openModal(`<h2>Fach bearbeiten</h2><div class="formGrid"><div class="full"><label>Name</label><input id="v102SubjectName" value="${esc(s.name)}"></div><div><label>Abkürzung</label><input id="v102SubjectAbbr" value="${esc(s.abbr||defaultSubjectAbbr(s.name))}"></div><div><label>Symbol</label><select id="v102SubjectIcon"><option value="book" ${subjectIconKey(s)==='book'?'selected':''}>Buch</option><option value="pencil" ${subjectIconKey(s)==='pencil'?'selected':''}>Stift</option><option value="calculator" ${subjectIconKey(s)==='calculator'?'selected':''}>Rechner</option><option value="chat" ${subjectIconKey(s)==='chat'?'selected':''}>Sprache</option><option value="atom" ${subjectIconKey(s)==='atom'?'selected':''}>Naturwissenschaft</option><option value="palette" ${subjectIconKey(s)==='palette'?'selected':''}>Kunst</option></select></div><div><label>Akzent</label><input id="v102SubjectColor" type="color" value="${s.color||'#c77f84'}"></div><div><label>Cover</label><input id="v102SubjectCover" type="color" value="${s.cover||'#f7dfe1'}"></div></div><div class="row" style="margin-top:12px"><button class="primary" onclick="v102SaveSubjectSettings('${s.id}')">Speichern</button><button class="dangerBtn" onclick="deleteSubjectFromSettings('${s.id}')">Fach löschen</button></div>`)};
  window.v102SaveSubjectSettings=function(sid){const s=data.subjects.find(x=>x.id===sid);if(!s)return;const old=s.name,n=String($('#v102SubjectName')?.value||'').trim();if(!n)return;s.name=n;s.abbr=String($('#v102SubjectAbbr')?.value||'').trim()||defaultSubjectAbbr(n);s.iconKey=$('#v102SubjectIcon')?.value||'book';s.color=$('#v102SubjectColor')?.value||s.color;s.cover=$('#v102SubjectCover')?.value||s.cover;[data.flashDecks,data.flashcards,data.studySheets,data.quizzes,data.tests,data.homework,data.grades,data.writtenTests].forEach(arr=>(arr||[]).forEach(x=>{if(x.subject===old)x.subject=n}));save();closeModal();renderSubjectDetail()};

  renderSubjectDetail=function(){const root=$('#subjectDetail');if(!root)return;const s=data.subjects.find(x=>x.id===selectedSubjectId);if(!s){root.innerHTML='<div class="empty">Fach nicht gefunden.</div>';return}ensureSubjectShape(s);const topics=s.topics||[];const cards=topics.map((t,i)=>{const decks=(data.flashDecks||[]).filter(d=>d.subject===s.name&&d.topicId===t.id),cardCount=decks.reduce((n,d)=>n+(data.flashcards||[]).filter(c=>c.deckId===d.id).length,0),sheets=typedSheets(s,t,'sheet').length,works=typedSheets(s,t,'worksheet').length,home=typedSheets(s,t,'homework').length,quiz=(data.quizzes||[]).filter(q=>q.subject===s.name&&q.topicId===t.id).length,tests=(data.writtenTests||[]).filter(x=>x.subject===s.name&&x.topicId===t.id).length,c=colorAt(i);return `<button class="v102TopicFolder" data-search="${esc(String(t.title||'').toLowerCase())}" onclick="openTopic('${s.id}','${t.id}')"><div class="v102TopicTop"><span class="v102FolderIcon" style="--bubble:${c[0]};color:${c[1]}">${v102Icon('folder')}</span><b>${esc(t.title)}</b><i>›</i></div><div class="v102TopicStats"><span>${v102Icon('sheet')}${sheets} Lernblätter</span><span>${v102Icon('worksheet')}${home+works} Aufgaben/Arbeitsblätter</span><span>${v102Icon('cards')}${cardCount} Karteikarten</span><span>${v102Icon('quiz')}${quiz} Quizze · ${tests} Tests</span></div></button>`}).join('')||'<div class="empty">Noch keine Themen.</div>';root.innerHTML=`<div class="v102SubjectDetail"><div class="v102SubjectPageHead"><div class="v102SubjectIdentity"><button class="v102Back" onclick="leaveSubjectNotebook()">${v102Icon('back')}</button><div><h2>${esc(s.name)}</h2><p>Themenordner</p></div></div><button class="v102RoundIcon" onclick="openSubjectSettings('${s.id}')">${v102Icon('settings')}</button></div><div class="v102SubjectTools"><label class="v102Search">${v102Icon('search')}<input placeholder="Themen suchen …" oninput="v102FilterTopics(this.value)"></label><button class="v102AddTopic" onclick="openNewTopic('${s.id}')">＋ Thema</button></div><div class="v102TopicGrid">${cards}</div></div>`};

  function topicCounts(s,t){const decks=(data.flashDecks||[]).filter(d=>d.subject===s.name&&d.topicId===t.id);return {sheet:typedSheets(s,t,'sheet'),homework:typedSheets(s,t,'homework'),worksheet:typedSheets(s,t,'worksheet'),decks,cardCount:decks.reduce((n,d)=>n+(data.flashcards||[]).filter(c=>c.deckId===d.id).length,0),quizzes:(data.quizzes||[]).filter(q=>q.subject===s.name&&q.topicId===t.id),tests:(data.writtenTests||[]).filter(x=>x.subject===s.name&&x.topicId===t.id)}}
  renderTopicDetail=function(){const root=$('#topicDetail');if(!root)return;const {s,t}=currentTopic();if(!s||!t){root.innerHTML='<div class="empty">Thema nicht gefunden.</div>';return}const st=topicCounts(s,t),rows=[['sheet','Lernblätter',st.sheet.length,'#f8e3e5','#bd7b80'],['homework','Hausaufgaben',st.homework.length,'#fff0cf','#af884b'],['worksheet','Arbeitsblätter',st.worksheet.length,'#eaf1dc','#819b63'],['cards','Karteikarten',st.cardCount,'#edf3df','#819b63'],['quiz','Quizze',st.quizzes.length,'#eee5f6','#8e78a7'],['test','Tests & Klassenarbeiten',st.tests.length,'#e7eff8','#728fab']];root.innerHTML=`<div class="v102TopicDetail"><div class="v102TopicPageHead"><div class="v102SubjectIdentity"><button class="v102Back" onclick="backToNotebook()">${v102Icon('back')}</button><div><h2>${esc(t.title)}</h2><p>Alle Inhalte an einem Ort</p></div></div><div class="row" style="gap:8px"><button class="v102RoundIcon" onclick="editTopic('${s.id}','${t.id}')">${v102Icon('settings')}</button><button class="v102OnlyPlus" onclick="v102OpenAddResource()">＋ Hinzufügen</button></div></div><div class="v102TopicResourceList">${rows.map(r=>`<button class="v102ResourceCard" onclick="v102OpenTopicHub('${r[0]}')"><span class="v102ResourceIcon" style="--bubble:${r[3]};--ico:${r[4]}">${v102Icon(r[0]==='homework'?'homework':r[0])}</span><span><b>${r[1]}</b><small>${r[2]} ${r[1]}</small></span><i class="v102Chevron">›</i></button>`).join('')}</div></div>`};

  let v102PendingResource=null;
  window.v102CreateCanvasResource=function(type){const {t}=currentTopic();if(!t)return;const label={sheet:'Lernblatt',homework:'Hausaufgabe',worksheet:'Arbeitsblatt'}[type]||'Lernblatt';openModal(`<h2>${label} erstellen</h2><label>Name</label><input id="v102ResourceName" value="${esc(label)}" placeholder="Name"><button class="primary" style="margin-top:12px" onclick="v102StartCanvasResource('${type}')">Im Editor öffnen</button>`)};
  window.v102StartCanvasResource=function(type){const name=String($('#v102ResourceName')?.value||'').trim()||({sheet:'Lernblatt',homework:'Hausaufgabe',worksheet:'Arbeitsblatt'}[type]||'Lernblatt');v102PendingResource={type,name};selectedSheetId=null;closeModal();openStudySheetEditor(null);setTimeout(()=>{const h=canvasState.objects.find(o=>['text','block'].includes(o.kind)&&(o.style?.fontSize||0)>=28);if(h){h.text=name;renderCanvasObjects();markCanvasDirty(false)}},80)};
  const v102BaseSaveCanvasSheetCore=saveCanvasSheetCore;
  saveCanvasSheetCore=function(auto=false){v102BaseSaveCanvasSheetCore(auto);const sh=(data.studySheets||[]).find(x=>x.id===selectedSheetId);if(sh){if(v102PendingResource){sh.resourceType=v102PendingResource.type;sh.title=v102PendingResource.name}else sh.resourceType=sh.resourceType||'sheet';save()}if(!auto)v102PendingResource=null};

  window.v102RenameSheet=function(idv){const sh=(data.studySheets||[]).find(x=>x.id===idv);if(!sh)return;const n=prompt('Neuer Name',sh.title||'Lernblatt');if(!n?.trim())return;sh.title=n.trim();save();v102OpenTopicHub(sh.resourceType||'sheet')};
  window.v102RenameDeck=function(idv){const d=(data.flashDecks||[]).find(x=>x.id===idv);if(!d)return;const n=prompt('Neuer Name',d.name);if(!n?.trim())return;d.name=n.trim();save();v102OpenTopicHub('cards')};
  window.v102RenameQuiz=function(idv){const q=(data.quizzes||[]).find(x=>x.id===idv);if(!q)return;const n=prompt('Neuer Name',q.name);if(!n?.trim())return;q.name=n.trim();save();v102OpenTopicHub('quiz')};
  window.v102DeleteDeck=function(idv){if(!confirm('Karteikarten-Ordner löschen?'))return;data.flashDecks=(data.flashDecks||[]).filter(x=>x.id!==idv);data.flashcards=(data.flashcards||[]).filter(x=>x.deckId!==idv);save();v102OpenTopicHub('cards')};

  window.v102AddWrittenTest=function(){const {s,t}=currentTopic();if(!s||!t)return;openModal(`<h2>Geschriebenen Test eintragen</h2><div class="formGrid"><div class="full"><label>Name</label><input id="v102TestName" placeholder="z. B. Klassenarbeit 2"></div><div><label>Datum</label><input id="v102TestDate" type="date" value="${todayISO()}"></div><div><label>Note (optional)</label><input id="v102TestGrade" placeholder="z. B. 2+"></div><div class="full"><label>Notiz</label><textarea id="v102TestNote" placeholder="Themen, Feedback …"></textarea></div></div><button class="primary" style="margin-top:12px" onclick="v102SaveWrittenTest()">Speichern</button>`)};
  window.v102SaveWrittenTest=function(){const {s,t}=currentTopic(),name=String($('#v102TestName')?.value||'').trim();if(!s||!t||!name)return;data.writtenTests.push({id:id(),subject:s.name,topicId:t.id,name,date:$('#v102TestDate')?.value||todayISO(),grade:String($('#v102TestGrade')?.value||'').trim(),note:String($('#v102TestNote')?.value||'').trim()});save();closeModal();v102OpenTopicHub('test')};
  window.v102RenameWrittenTest=function(idv){const x=data.writtenTests.find(x=>x.id===idv);if(!x)return;const n=prompt('Neuer Name',x.name);if(!n?.trim())return;x.name=n.trim();save();v102OpenTopicHub('test')};
  window.v102DeleteWrittenTest=function(idv){if(!confirm('Test löschen?'))return;data.writtenTests=data.writtenTests.filter(x=>x.id!==idv);save();v102OpenTopicHub('test')};

  window.v102OpenTopicHub=function(kind){const {s,t}=currentTopic();if(!s||!t)return;const st=topicCounts(s,t);let title='',items=[],add='';
    if(['sheet','homework','worksheet'].includes(kind)){title={sheet:'Lernblätter',homework:'Hausaufgaben',worksheet:'Arbeitsblätter'}[kind];items=st[kind];add=`<button class="primary" onclick="closeModal();setTimeout(()=>v102CreateCanvasResource('${kind}'),20)">＋ ${title.slice(0,-1)}</button>`;items=items.map(x=>`<div class="v102HubItem"><span class="v102HubIcon">${v102Icon(kind==='sheet'?'sheet':kind)}</span><div><b>${esc(x.title||title.slice(0,-1))}</b><small>${x.canvasData?.pages?.length||1} Seite(n)</small></div><div class="v102HubActions"><button class="v102Mini" onclick="closeModal();openStudySheetEditor('${x.id}')">Öffnen</button><button class="v102Mini" onclick="v102RenameSheet('${x.id}')">Umbenennen</button><button class="v102Mini danger" onclick="deleteStudySheet('${x.id}');v102OpenTopicHub('${kind}')">Löschen</button></div></div>`).join('')}
    if(kind==='cards'){title='Karteikarten';add=`<button class="primary" onclick="closeModal();setTimeout(createDeckPrompt,20)">＋ Ordner</button>`;items=st.decks.map(d=>`<div class="v102HubItem"><span class="v102HubIcon">${v102Icon('cards')}</span><div><b>${esc(d.name)}</b><small>${(data.flashcards||[]).filter(c=>c.deckId===d.id).length} Karten</small></div><div class="v102HubActions"><button class="v102Mini" onclick="closeModal();openDeck('${d.id}')">Lernen</button><button class="v102Mini" onclick="v102RenameDeck('${d.id}')">Umbenennen</button><button class="v102Mini danger" onclick="v102DeleteDeck('${d.id}')">Löschen</button></div></div>`).join('')}
    if(kind==='quiz'){title='Quizze';add=`<button class="primary" onclick="closeModal();setTimeout(createQuizPrompt,20)">＋ Quiz</button>`;items=st.quizzes.map(q=>`<div class="v102HubItem"><span class="v102HubIcon">${v102Icon('quiz')}</span><div><b>${esc(q.name)}</b><small>${(q.questions||[]).length} Fragen</small></div><div class="v102HubActions"><button class="v102Mini" onclick="closeModal();startQuiz('${q.id}')">Starten</button><button class="v102Mini" onclick="editQuiz('${q.id}')">Bearbeiten</button><button class="v102Mini" onclick="v102RenameQuiz('${q.id}')">Umbenennen</button><button class="v102Mini danger" onclick="deleteQuiz('${q.id}');v102OpenTopicHub('quiz')">Löschen</button></div></div>`).join('')}
    if(kind==='test'){title='Tests & Klassenarbeiten';add=`<button class="primary" onclick="v102AddWrittenTest()">＋ Test</button>`;items=st.tests.map(x=>`<div class="v102HubItem"><span class="v102HubIcon">${v102Icon('test')}</span><div><b>${esc(x.name)}</b><small>${esc(x.date||'')} ${x.grade?'· Note '+esc(x.grade):''}</small></div><div class="v102HubActions"><button class="v102Mini" onclick="v102RenameWrittenTest('${x.id}')">Umbenennen</button><button class="v102Mini danger" onclick="v102DeleteWrittenTest('${x.id}')">Löschen</button></div></div>`).join('')}
    openModal(`<div class="v102ResourceModal"><div class="rowBetween"><div><div class="eyebrow">${esc(t.title)}</div><h2>${title}</h2></div>${add}</div><div class="v102HubList">${items||'<div class="empty">Noch nichts hier.</div>'}</div></div>`)
  };

  window.v102OpenAddResource=function(){const {t}=currentTopic();if(!t)return;openModal(`<div class="v102ResourceModal"><div class="rowBetween"><div><div class="eyebrow">HINZUFÜGEN</div><h2>${esc(t.title)}</h2></div><button class="iconbtn" onclick="closeModal()">×</button></div><div class="v102AddGrid"><button class="v102ActionCard" onclick="closeModal();setTimeout(()=>v102CreateCanvasResource('sheet'),20)"><span class="v102ResourceIcon">${v102Icon('sheet')}</span><b>Lernblatt</b></button><button class="v102ActionCard" onclick="closeModal();setTimeout(()=>v102CreateCanvasResource('homework'),20)"><span class="v102ResourceIcon" style="--bubble:#fff0cf">${v102Icon('homework')}</span><b>Hausaufgabe</b></button><button class="v102ActionCard" onclick="closeModal();setTimeout(()=>v102CreateCanvasResource('worksheet'),20)"><span class="v102ResourceIcon" style="--bubble:#eaf1dc">${v102Icon('worksheet')}</span><b>Arbeitsblatt</b></button><button class="v102ActionCard" onclick="closeModal();setTimeout(createDeckPrompt,20)"><span class="v102ResourceIcon" style="--bubble:#edf3df">${v102Icon('cards')}</span><b>Karteikarten</b></button><button class="v102ActionCard" onclick="closeModal();setTimeout(createQuizPrompt,20)"><span class="v102ResourceIcon" style="--bubble:#eee5f6">${v102Icon('quiz')}</span><b>Quiz</b></button><button class="v102ActionCard" onclick="v102AddWrittenTest()"><span class="v102ResourceIcon" style="--bubble:#e7eff8">${v102Icon('test')}</span><b>Test / Klassenarbeit</b></button></div></div>`)};

  /* deck creation without emoji */
  window.createDeckPrompt=function(){const {s,t}=currentTopic();if(!s||!t)return;openModal(`<h2>Karteikarten-Ordner</h2><label>Name</label><input id="deckName" placeholder="z. B. Definitionen"><button class="primary" style="margin-top:10px" onclick="createDeck()">Erstellen</button>`)};
  window.createDeck=function(){const {s,t}=currentTopic(),name=String($('#deckName')?.value||'').trim();if(!s||!t||!name)return;const d={id:id(),subject:s.name,topicId:t.id,name};data.flashDecks.push(d);save();closeModal();selectedDeckId=d.id;openView('deck-detail')};

  /* lightweight spaced repetition inside a deck */
  let v102DeckQueue=[],v102DeckIndex=0;
  const oldOpenDeck=openDeck;
  window.openDeck=function(did){selectedDeckId=did;flashFlipped=false;v102DeckQueue=(data.flashcards||[]).filter(c=>c.deckId===did).map(c=>c.id);v102DeckIndex=0;currentFlash=0;openView('deck-detail')};
  renderDeckDetail=function(){const root=$('#deckDetail');if(!root)return;const d=(data.flashDecks||[]).find(x=>x.id===selectedDeckId);if(!d){root.innerHTML='<div class="empty">Ordner nicht gefunden.</div>';return}if(!v102DeckQueue.length)v102DeckQueue=(data.flashcards||[]).filter(c=>c.deckId===d.id).map(c=>c.id);const cid=v102DeckQueue[v102DeckIndex]||v102DeckQueue[0],c=(data.flashcards||[]).find(x=>x.id===cid),total=(data.flashcards||[]).filter(x=>x.deckId===d.id).length;root.innerHTML=`<div class="v102Deck"><div class="v102DeckHead"><div><div class="eyebrow">KARTEIKARTEN</div><h2>${esc(d.name)}</h2><div class="small">${total} Karten</div></div><button class="ghost" onclick="v102RenameDeck('${d.id}');renderDeckDetail()">Umbenennen</button></div><div class="section">${c?`<div class="flashScene" onclick="flipDeckCard()"><div class="flashInner ${flashFlipped?'flipped':''}" id="deckFlashInner"><div class="flashFace"><div><div class="badge">Frage</div><div class="flashQuestion" style="margin-top:16px">${esc(c.q)}</div><div class="small" style="margin-top:12px">Antippen zum Umdrehen</div></div></div><div class="flashFace flashBack"><div><div class="badge">Antwort</div><div class="flashAnswer" style="margin-top:16px">${esc(c.a)}</div></div></div></div></div>${flashFlipped?`<div class="v102MemoryButtons"><button onclick="event.stopPropagation();v102RateCard('known')">Gewusst</button><button onclick="event.stopPropagation();v102RateCard('meh')">Meh / fast</button><button onclick="event.stopPropagation();v102RateCard('no')">Nicht gewusst</button></div>`:''}<div class="row" style="justify-content:center;margin-top:10px"><span class="badge">${Math.min(v102DeckIndex+1,Math.max(1,v102DeckQueue.length))}/${Math.max(1,v102DeckQueue.length)}</span><button class="ghost" onclick="editDeckCard('${c.id}')">Bearbeiten</button><button class="dangerBtn" onclick="deleteDeckCard('${c.id}');v102DeckQueue=v102DeckQueue.filter(x=>x!=='${c.id}');renderDeckDetail()">Löschen</button></div>`:'<div class="empty">Runde fertig oder noch keine Karten.</div>'}</div></div>`;const add=$('#addCardToDeckBtn');if(add)add.onclick=()=>openAddCardToDeck(d.id)};
  window.v102RateCard=function(rating){const cid=v102DeckQueue[v102DeckIndex],c=(data.flashcards||[]).find(x=>x.id===cid);if(!cid)return;v102DeckQueue.splice(v102DeckIndex,1);if(c){c.memoryStatus=rating;c.lastRated=Date.now()}if(rating==='no'){const at=Math.min(v102DeckIndex+1,v102DeckQueue.length);v102DeckQueue.splice(at,0,cid)}if(rating==='meh'){const gap=Math.random()<.5?2:3,at=Math.min(v102DeckIndex+gap,v102DeckQueue.length);v102DeckQueue.splice(at,0,cid)}if(v102DeckIndex>=v102DeckQueue.length)v102DeckIndex=0;flashFlipped=false;save();renderDeckDetail()};

  /* rounded triangles */
  function roundedPolygonPath(points,r){if(!points?.length)return'';r=Math.max(0,Number(r)||0);if(!r)return 'M '+points.map((p,i)=>(i?'L ':'')+p[0]+' '+p[1]).join(' ')+' Z';const n=points.length,out=[];for(let i=0;i<n;i++){const prev=points[(i-1+n)%n],cur=points[i],next=points[(i+1)%n];const d1=Math.hypot(cur[0]-prev[0],cur[1]-prev[1]),d2=Math.hypot(next[0]-cur[0],next[1]-cur[1]);const rr=Math.min(r,d1*.35,d2*.35);const a=[cur[0]+(prev[0]-cur[0])*(rr/d1),cur[1]+(prev[1]-cur[1])*(rr/d1)],b=[cur[0]+(next[0]-cur[0])*(rr/d2),cur[1]+(next[1]-cur[1])*(rr/d2)];if(i===0)out.push(`M ${a[0]} ${a[1]}`);else out.push(`L ${a[0]} ${a[1]}`);out.push(`Q ${cur[0]} ${cur[1]} ${b[0]} ${b[1]}`)}return out.join(' ')+' Z'}
  const v102BaseVectorEl=vectorEl;
  vectorEl=function(v){if(v.type==='triangle'){const dash=v.dash==='dashed'?'10 7':v.dash==='dotted'?'2 6':'';return `<path data-vid="${v.id}" d="${roundedPolygonPath(v.points,v.cornerRadius||0)}" fill="${v.fill}" stroke="${v.stroke}" stroke-width="${v.strokeWidth}" stroke-dasharray="${dash}" class="${canvasState.selectedType==='vector'&&canvasState.selectedId===v.id?'vectorSelected':''}"/>`}return v102BaseVectorEl(v)};
  const v102BaseAddVector=addVectorShape;
  window.addVectorShape=function(type){v102BaseAddVector(type);const v=canvasState.vectors.at(-1);if(v&&type==='triangle')v.cornerRadius=0;renderVectors()};
  const v102BaseInspector=renderCanvasInspector;
  renderCanvasInspector=function(){v102BaseInspector();if(window.innerWidth>=900&&document.body.classList.contains('editorMode')&&canvasState.selectedId)setTimeout(()=>v102RightTab('design'),0);if(canvasState.selectedType==='vector'){const v=canvasState.vectors.find(x=>x.id===canvasState.selectedId);if(v&&v.type==='triangle'){const box=$('#canvasInspector .vectorControls');if(box&&!box.querySelector('.v102CornerCtl'))box.insertAdjacentHTML('beforeend',`<div class="v102CornerCtl"><label>Ecken rund</label><input type="number" min="0" max="90" value="${v.cornerRadius||0}" onchange="updateVectorStyle('cornerRadius',+this.value)"></div>`)}}};

  /* desktop editor: one clean left palette, pretty background, pan + Alt wheel zoom */
  function paletteButton(label,icon,action){return `<button onclick="${action}">${v102Icon(icon)}<span>${label}</span></button>`}
  function v102PaletteHTML(){return `<div class="v102PaletteGroup"><div class="v102PaletteTitle">Basis</div><div class="v102PaletteGrid">${paletteButton('Text','pencil','addCanvasTextBox()')}${paletteButton('Bild','image','openCanvasMediaPicker()')}${paletteButton('Tabelle','table','openTableDialog()')}${paletteButton('Vorlagen','template',"editorOpenGroup('templates')")}</div></div><div class="v102PaletteGroup"><div class="v102PaletteTitle">Formen</div><div class="v102PaletteGrid">${paletteButton('Rechteck','rect',"addVectorShape('rect')")}${paletteButton('Kreis','circle',"addVectorShape('ellipse')")}${paletteButton('Dreieck','triangle',"addVectorShape('triangle')")}${paletteButton('Linie','line','addVectorLine()')}</div></div><div class="v102PaletteGroup"><div class="v102PaletteTitle">Mathematik</div><div class="v102PaletteGrid">${paletteButton('Formel','formula','openFormulaDialog()')}${paletteButton('Graph','graph','openGraphDialog()')}${paletteButton('Tabelle','table','openTableDialog()')}</div></div><div class="v102PaletteGroup"><div class="v102PaletteTitle">Dokument</div><div class="v102PaletteGrid">${paletteButton('Seiten','pages',"v102RightTab('page')")}${paletteButton('Ebenen','layers',"v102RightTab('layers')")}</div></div>`}
  window.v102RightTab=function(mode){
    if(window.innerWidth<900)return;
    const side=$('#desktopEditorSidebar');if(!side)return;
    const prop=side.querySelector('#canvasInspector')?.closest('.objectPanel');
    const layers=side.querySelector('#layerList')?.closest('.objectPanel');
    const templates=side.querySelector('#pageTemplatePicker')?.closest('.objectPanel');
    let page=side.querySelector('#v102PagePanel');
    if(!page){page=document.createElement('div');page.id='v102PagePanel';page.className='objectPanel v102PagePanel';side.appendChild(page)}
    [prop,layers,templates,page].forEach(x=>{if(x)x.style.display='none'});
    if(mode==='design'&&prop)prop.style.display='block';
    if(mode==='layers'&&layers)layers.style.display='block';
    if(mode==='templates'&&templates)templates.style.display='block';
    if(mode==='page'){
      page.style.display='block';canvasState.pages ||= [v96CurrentPageData()];const ps=canvasState.pageStyle||{};
      page.innerHTML=`<div class="rowBetween"><b>Seiten</b><button class="miniIcon" onclick="v96AddPage();setTimeout(()=>v102RightTab('page'),20)">＋</button></div><div class="v102SidePages">${canvasState.pages.map((p,i)=>`<button class="${i===canvasState.activePage?'active':''}" onclick="v96SwitchPage(${i});setTimeout(()=>v102RightTab('page'),20)"><span>${i+1}</span><small>Seite ${i+1}</small></button>`).join('')}</div><div class="v102SidePageSettings"><label>Hintergrund<input type="color" value="${ps.color||'#ffffff'}" onchange="setCanvasPageStyle('color',this.value)"></label><label>Muster<select onchange="setCanvasPageStyle('pattern',this.value)"><option value="blank" ${ps.pattern==='blank'?'selected':''}>Leer</option><option value="dots" ${ps.pattern==='dots'?'selected':''}>Punkte</option><option value="grid" ${ps.pattern==='grid'?'selected':''}>Kariert</option><option value="lined" ${ps.pattern==='lined'?'selected':''}>Liniert</option></select></label><label>Raster<input type="number" min="10" max="60" value="${ps.spacing||24}" onchange="setCanvasPageStyle('spacing',+this.value)"></label><label>Layout-Rand<input type="number" min="0" max="160" value="${ps.margin??55}" onchange="setCanvasPageStyle('margin',+this.value)"></label><div class="two"><button class="ghost" onclick="setCanvasOrientation('portrait')">Hochformat</button><button class="ghost" onclick="setCanvasOrientation('landscape')">Querformat</button></div></div>`;
    }
    side.querySelectorAll('.v102RightTabs button').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  };
  function v102DesktopEditorInit(){if(window.innerWidth<900||!document.body.classList.contains('editorMode'))return;const shell=$('.canvasEditorShell'),nav=$('.canvasQuickNav'),drawer=$('#canvasQuickDrawer'),vp=$('#canvasViewport'),side=$('#desktopEditorSidebar');if(!shell||!nav||!drawer||!vp||!side)return;let left=$('.v102DesktopLeft');if(!left){left=document.createElement('div');left.className='v102DesktopLeft';nav.parentNode.insertBefore(left,nav);left.append(nav,drawer)}if(!window.__STUDIA_V134_REFERENCE_ONLY__){nav.innerHTML=`<button class="active" onclick="document.getElementById('canvasQuickDrawer').innerHTML=v102PaletteHTML()">${v102Icon('rect')}<span>Elemente</span></button><button onclick="document.getElementById('canvasQuickDrawer').innerHTML=v102PaletteHTML()">${v102Icon('pencil')}<span>Text</span></button><button onclick="v102RightTab('page')">${v102Icon('pages')}<span>Seiten</span></button><button onclick="v102RightTab('layers')">${v102Icon('layers')}<span>Ebenen</span></button>`;drawer.classList.add('open');drawer.innerHTML=v102PaletteHTML();}if(!side.querySelector('.v102RightTabs'))side.insertAdjacentHTML('afterbegin',`<div class="v102RightTabs"><button data-mode="design" onclick="v102RightTab('design')">Design</button><button data-mode="page" onclick="v102RightTab('page')">Seiten</button><button data-mode="layers" onclick="v102RightTab('layers')">Ebenen</button></div>`);v102RightTab(canvasState.selectedId?'design':'page');v102InstallDesktopPanZoom(vp);}
  window.v102PaletteHTML=v102PaletteHTML;
  function v102InstallDesktopPanZoom(vp){if(vp.dataset.v102PanZoom)return;vp.dataset.v102PanZoom='1';let space=false,pan=null;window.addEventListener('keydown',e=>{const a=e.target instanceof Element?e.target:document.activeElement,typing=/INPUT|TEXTAREA|SELECT/.test(a?.tagName)||a?.isContentEditable||!!a?.closest?.('[contenteditable="true"]');if(e.code==='Space'&&!typing){space=true;if(document.body.classList.contains('editorMode'))e.preventDefault()}});window.addEventListener('keyup',e=>{if(e.code==='Space')space=false});vp.addEventListener('wheel',e=>{if(window.__STUDIA_V115_OWNS_GESTURES)return;if(!e.altKey)return;e.preventDefault();const rect=vp.getBoundingClientRect(),focus={x:e.clientX-rect.left,y:e.clientY-rect.top};v96ApplyZoom((canvasZoom||1)*(e.deltaY<0?1.08:.92),true,focus)},{passive:false});vp.addEventListener('pointerdown',e=>{if(window.__STUDIA_V115_OWNS_GESTURES)return;if(!(e.button===1||(e.button===0&&space)))return;e.preventDefault();vp.classList.add('v102Panning');pan={x:e.clientX,y:e.clientY,l:vp.scrollLeft,t:vp.scrollTop};vp.setPointerCapture?.(e.pointerId)});vp.addEventListener('pointermove',e=>{if(!pan)return;vp.scrollLeft=pan.l-(e.clientX-pan.x);vp.scrollTop=pan.t-(e.clientY-pan.y)});const end=()=>{pan=null;vp.classList.remove('v102Panning')};vp.addEventListener('pointerup',end);vp.addEventListener('pointercancel',end)}
  const v102RenderSheet=renderSheetEditor;renderSheetEditor=function(){v102RenderSheet();setTimeout(v102DesktopEditorInit,100)};
  window.addEventListener('resize',()=>{if(document.body.classList.contains('editorMode'))setTimeout(v102DesktopEditorInit,80)});

  /* refresh version + title */
  const eyebrow=$('#headerEyebrow');if(eyebrow)eyebrow.textContent='VERSION 202';document.title='Studia';
})();


/* ===== Studia V103 — compact notebooks + clean desktop editor ===== */
(()=>{
  const I=(n)=>v102Icon(n);
  const extra={
    plus:`<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`,
    edit:`<svg viewBox="0 0 24 24"><path d="M4 20h4l11-11-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>`,
    trash:`<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>`,
    lock:`<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`,
    unlock:`<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M9 10V7a4 4 0 0 1 7-2.6"/></svg>`,
    drag:`<svg viewBox="0 0 24 24"><circle cx="9" cy="7" r="1"/><circle cx="15" cy="7" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="17" r="1"/><circle cx="15" cy="17" r="1"/></svg>`,
    duplicate:`<svg viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>`,
    download:`<svg viewBox="0 0 24 24"><path d="M12 3v12M8 11l4 4 4-4M4 20h16"/></svg>`,
    print:`<svg viewBox="0 0 24 24"><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><rect x="7" y="14" width="10" height="7"/></svg>`,
    save:`<svg viewBox="0 0 24 24"><path d="M5 3h12l2 2v16H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/></svg>`,
    undo:`<svg viewBox="0 0 24 24"><path d="M9 8 5 12l4 4"/><path d="M6 12h7a6 6 0 0 1 6 6"/></svg>`,
    redo:`<svg viewBox="0 0 24 24"><path d="m15 8 4 4-4 4"/><path d="M18 12h-7a6 6 0 0 0-6 6"/></svg>`,
    eye:`<svg viewBox="0 0 24 24"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.5"/></svg>`,
    close:`<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>`
  };
  window.v103Icon=(n)=>extra[n]||I(n);
  const icon=window.v103Icon;

  /* V105 FIX: these helpers were private to the V102 IIFE.
     V103 referenced them as if they were global, which threw a ReferenceError
     when opening Fächer/Notizbuch and left only the bottom navigation visible. */
  const subjectIconKey=(s)=>s?.iconKey||({Mathematik:'calculator',Deutsch:'pencil',Englisch:'chat',Biologie:'atom',Geschichte:'book'}[String(s?.name||'')]||'book');
  const colorAt=(i)=>[['#f8e3e6','#c67f84','#efafb4'],['#fff0cf','#b38b49','#edc9a3'],['#e9f1dc','#819c64','#c8dba9'],['#e9eef8','#7890b2','#b9cbe8']][(Number(i)||0)%4];
  const typedSheets=(s,t,type)=>(data.studySheets||[]).filter(x=>x.subject===s.name&&x.topicId===t.id&&(x.resourceType||'sheet')===type);
  const topicCounts=(s,t)=>{
    const decks=(data.flashDecks||[]).filter(d=>d.subject===s.name&&d.topicId===t.id);
    return {
      sheet:typedSheets(s,t,'sheet'),
      homework:typedSheets(s,t,'homework'),
      worksheet:typedSheets(s,t,'worksheet'),
      decks,
      cardCount:decks.reduce((n,d)=>n+(data.flashcards||[]).filter(c=>c.deckId===d.id).length,0),
      quizzes:(data.quizzes||[]).filter(q=>q.subject===s.name&&q.topicId===t.id),
      tests:(data.writtenTests||[]).filter(x=>x.subject===s.name&&x.topicId===t.id)
    };
  };
  const pop=()=>{document.addEventListener('pointerdown',e=>{const b=e.target.closest('button,.v102Notebook,.v102TopicFolder,.v102ResourceCard,.v103FolderRow');if(!b)return;b.classList.remove('v103Pop');void b.offsetWidth;b.classList.add('v103Pop')},{capture:true})};
  pop();

  function sIcon(s){return subjectIconKey(s)}
  function topicStats(s,t){
    const decks=(data.flashDecks||[]).filter(d=>d.subject===s.name&&d.topicId===t.id);
    return {
      sheets:typedSheets(s,t,'sheet').length,
      hw:typedSheets(s,t,'homework').length,
      ws:typedSheets(s,t,'worksheet').length,
      cards:decks.reduce((n,d)=>n+(data.flashcards||[]).filter(c=>c.deckId===d.id).length,0),
      quizzes:(data.quizzes||[]).filter(q=>q.subject===s.name&&q.topicId===t.id).length,
      tests:(data.writtenTests||[]).filter(x=>x.subject===s.name&&x.topicId===t.id).length
    }
  }

  /* One clear add button; notebook cards scale correctly on phone + laptop. */
  renderSubjects=function(){
    const root=$('#subjectList');if(!root)return;data.subjects.forEach(ensureSubjectShape);
    const cards=(data.subjects||[]).map((s,i)=>{const c=colorAt(i);return `<button class="v102Notebook v103Notebook" data-search="${esc(s.name.toLowerCase())}" style="--ring:${c[2]};--pin:${c[2]}" onclick="openSubject('${s.id}')"><span class="v102NotebookPin"></span><span class="v102NotebookIcon" style="--bubble:${c[0]};color:${c[1]}">${icon(sIcon(s))}</span><strong>${esc(s.name)}</strong><small>${(s.topics||[]).length} ${(s.topics||[]).length===1?'Thema':'Themen'}</small><span class="v102Heart">${icon('heart')}</span></button>`}).join('');
    root.className='';root.innerHTML=`<div class="v102SubjectsPage v103SubjectsPage"><div class="v102SubjectPageHead"><div><h2>Fächer</h2><p>Deine Fächer</p></div><button class="v102RoundIcon" onclick="openView('settings')" aria-label="Einstellungen">${icon('settings')}</button></div><div class="v102SubjectTools"><label class="v102Search">${icon('search')}<input placeholder="Fächer suchen" oninput="v102FilterSubjects(this.value)"></label><button class="v102AddSubject" onclick="openAddSubject()">${icon('plus')}<span>Fach</span></button></div><div class="v102NotebookGrid">${cards||'<div class="v103EmptyState">Noch kein Fach. Erstelle dein erstes Notizbuch.</div>'}</div></div>`;
  };

  renderSubjectDetail=function(){
    const root=$('#subjectDetail');if(!root)return;const s=data.subjects.find(x=>x.id===selectedSubjectId);if(!s){root.innerHTML='<div class="empty">Fach nicht gefunden.</div>';return}ensureSubjectShape(s);
    const folders=(s.topics||[]).map((t,i)=>{const st=topicStats(s,t),c=colorAt(i);return `<button class="v103FolderRow" data-search="${esc(String(t.title||'').toLowerCase())}" onclick="openTopic('${s.id}','${t.id}')"><span class="v103FolderArt" style="--bubble:${c[0]};--ink:${c[1]}">${icon('folder')}</span><span class="v103FolderText"><b>${esc(t.title)}</b><small>${st.sheets} Lernblätter · ${st.hw} Hausaufgaben · ${st.ws} Arbeitsblätter · ${st.cards} Karten · ${st.quizzes} Quizze · ${st.tests} Tests</small></span><span class="v103Chevron">›</span></button>`}).join('');
    root.innerHTML=`<div class="v102SubjectDetail v103SubjectDetail"><div class="v102SubjectPageHead"><div class="v102SubjectIdentity"><button class="v102Back" onclick="leaveSubjectNotebook()">${icon('back')}</button><div><h2>${esc(s.name)}</h2><p>Themenordner</p></div></div><button class="v102RoundIcon" onclick="openSubjectSettings('${s.id}')">${icon('settings')}</button></div><div class="v102SubjectTools"><label class="v102Search">${icon('search')}<input placeholder="Themen suchen …" oninput="v102FilterTopics(this.value)"></label><button class="v102AddTopic" onclick="openNewTopic('${s.id}')">${icon('plus')}<span>Thema</span></button></div><div class="v103TopicList">${folders||'<div class="v103EmptyState">Noch kein Themenordner.</div>'}</div></div>`;
  };

  renderTopicDetail=function(){
    const root=$('#topicDetail');if(!root)return;const {s,t}=currentTopic();if(!s||!t){root.innerHTML='<div class="empty">Thema nicht gefunden.</div>';return}const st=topicCounts(s,t);
    const rows=[['sheet','Lernblätter',st.sheet.length,'Übersichten, Erklärungen und eigene Lernblätter.','#f8e3e5','#bd7b80'],['homework','Hausaufgaben',st.homework.length,'Digital im gleichen Editor bearbeiten.','#fff0cf','#af884b'],['worksheet','Arbeitsblätter',st.worksheet.length,'Arbeitsblätter erstellen und ausfüllen.','#eaf1dc','#819b63'],['cards','Karteikarten',st.cardCount,'Lernen mit Gewusst / Meh / Nicht gewusst.','#edf3df','#819b63'],['quiz','Quizze',st.quizzes.length,'Teste dein Wissen mit Fragen.','#eee5f6','#8e78a7'],['test','Tests & Klassenarbeiten',st.tests.length,'Geschriebene Arbeiten sammeln und benennen.','#e7eff8','#728fab']];
    root.innerHTML=`<div class="v102TopicDetail v103TopicDetail"><div class="v102TopicPageHead"><div class="v102SubjectIdentity"><button class="v102Back" onclick="backToNotebook()">${icon('back')}</button><div><h2>${esc(t.title)}</h2><p>Alle Inhalte an einem Ort</p></div></div><div class="v103HeadActions"><button class="v102RoundIcon" onclick="editTopic('${s.id}','${t.id}')">${icon('settings')}</button><button class="v102OnlyPlus" onclick="v102OpenAddResource()">${icon('plus')}<span>Hinzufügen</span></button></div></div><div class="v102TopicResourceList">${rows.map(r=>`<button class="v102ResourceCard" onclick="v102OpenTopicHub('${r[0]}')"><span class="v102ResourceIcon" style="--bubble:${r[4]};--ico:${r[5]}">${icon(r[0])}</span><span class="v103ResourceText"><b>${r[1]}</b><small>${r[2]} · ${r[3]}</small></span><i class="v102Chevron">›</i></button>`).join('')}</div></div>`;
  };

  /* Neater hubs; no unreliable canvas-thumbnail preview (fixes the black preview). */
  window.v102OpenTopicHub=function(kind){const {s,t}=currentTopic();if(!s||!t)return;const st=topicCounts(s,t);let title='',items='',add='';
    const item=(ico,name,meta,actions,tone='')=>`<div class="v102HubItem v103HubItem"><span class="v102HubIcon ${tone}">${icon(ico)}</span><div class="v103HubText"><b>${esc(name)}</b><small>${meta}</small></div><div class="v102HubActions">${actions}</div></div>`;
    if(['sheet','homework','worksheet'].includes(kind)){title={sheet:'Lernblätter',homework:'Hausaufgaben',worksheet:'Arbeitsblätter'}[kind];const singular={sheet:'Lernblatt',homework:'Hausaufgabe',worksheet:'Arbeitsblatt'}[kind];add=`<button class="primary v103HubAdd" onclick="closeModal();setTimeout(()=>v102CreateCanvasResource('${kind}'),20)">${icon('plus')} ${singular}</button>`;items=st[kind].map(x=>item(kind==='sheet'?'sheet':kind,x.title||singular,`${x.canvasData?.pages?.length||1} Seite(n)`,`<button class="v102Mini" onclick="closeModal();openStudySheetEditor('${x.id}')">Öffnen</button><button class="v102Mini" onclick="v102RenameSheet('${x.id}')">Umbenennen</button><button class="v102Mini danger" onclick="deleteStudySheet('${x.id}');v102OpenTopicHub('${kind}')">Löschen</button>`)).join('')}
    if(kind==='cards'){title='Karteikarten';add=`<button class="primary v103HubAdd" onclick="closeModal();setTimeout(createDeckPrompt,20)">${icon('plus')} Ordner</button>`;items=st.decks.map(d=>item('cards',d.name,`${(data.flashcards||[]).filter(c=>c.deckId===d.id).length} Karten`,`<button class="v102Mini" onclick="closeModal();openDeck('${d.id}')">Lernen</button><button class="v102Mini" onclick="v102RenameDeck('${d.id}')">Umbenennen</button><button class="v102Mini danger" onclick="v102DeleteDeck('${d.id}')">Löschen</button>`)).join('')}
    if(kind==='quiz'){title='Quizze';add=`<button class="primary v103HubAdd" onclick="closeModal();setTimeout(createQuizPrompt,20)">${icon('plus')} Quiz</button>`;items=st.quizzes.map(q=>item('quiz',q.name,`${(q.questions||[]).length} Fragen`,`<button class="v102Mini" onclick="closeModal();startQuiz('${q.id}')">Starten</button><button class="v102Mini" onclick="editQuiz('${q.id}')">Bearbeiten</button><button class="v102Mini" onclick="v102RenameQuiz('${q.id}')">Umbenennen</button><button class="v102Mini danger" onclick="deleteQuiz('${q.id}');v102OpenTopicHub('quiz')">Löschen</button>`)).join('')}
    if(kind==='test'){title='Tests & Klassenarbeiten';add=`<button class="primary v103HubAdd" onclick="v103AddWrittenTest()">${icon('plus')} Test</button>`;items=st.tests.map(x=>item('test',x.name,`${esc(x.date||'ohne Datum')}${x.grade?' · Note '+esc(x.grade):''}${x.attachmentName?' · '+esc(x.attachmentName):''}`,`<button class="v102Mini" onclick="v102RenameWrittenTest('${x.id}')">Umbenennen</button>${x.attachmentData?`<button class="v102Mini" onclick="v103OpenTestAttachment('${x.id}')">Datei</button>`:''}<button class="v102Mini danger" onclick="v102DeleteWrittenTest('${x.id}')">Löschen</button>`)).join('')}
    openModal(`<div class="v102ResourceModal v103ResourceModal"><div class="rowBetween v103HubHeader"><div><div class="eyebrow">${esc(t.title)}</div><h2>${title}</h2></div>${add}</div><div class="v102HubList">${items||'<div class="v103EmptyState">Noch nichts hier.</div>'}</div></div>`)
  };

  /* Written tests can optionally keep a scan/photo/PDF as a data URL. */
  window.v103AddWrittenTest=function(){const {s,t}=currentTopic();if(!s||!t)return;openModal(`<div class="v103TestModal"><h2>Test / Klassenarbeit</h2><div class="formGrid"><div class="full"><label>Name</label><input id="v103TestName" placeholder="z. B. Klassenarbeit 2"></div><div><label>Datum</label><input id="v103TestDate" type="date" value="${todayISO()}"></div><div><label>Note (optional)</label><input id="v103TestGrade" placeholder="z. B. 2+"></div><div class="full"><label>Scan / Foto / PDF (optional)</label><input id="v103TestFile" type="file" accept="image/*,application/pdf"></div><div class="full"><label>Notiz</label><textarea id="v103TestNote" placeholder="Themen, Feedback …"></textarea></div></div><button class="primary" style="margin-top:12px" onclick="v103SaveWrittenTest()">Speichern</button></div>`)};
  window.v103SaveWrittenTest=function(){const {s,t}=currentTopic(),name=String($('#v103TestName')?.value||'').trim();if(!s||!t||!name)return;const file=$('#v103TestFile')?.files?.[0];const finish=(url='')=>{data.writtenTests.push({id:id(),subject:s.name,topicId:t.id,name,date:$('#v103TestDate')?.value||todayISO(),grade:String($('#v103TestGrade')?.value||'').trim(),note:String($('#v103TestNote')?.value||'').trim(),attachmentName:file?.name||'',attachmentType:file?.type||'',attachmentData:url});save();closeModal();v102OpenTopicHub('test')};if(file){if(file.size>7*1024*1024&&!confirm('Die Datei ist größer als 7 MB und kann den lokalen Speicher stark füllen. Trotzdem speichern?'))return;const r=new FileReader();r.onload=()=>finish(String(r.result||''));r.readAsDataURL(file)}else finish()};
  window.v103OpenTestAttachment=function(idv){const x=(data.writtenTests||[]).find(v=>v.id===idv);if(!x?.attachmentData)return;const w=window.open('','_blank');if(w)w.location.href=x.attachmentData};

  /* SVG-only layers: cleaner drag/drop and no emoji locks. */
  renderLayerList=function(){const el=$('#layerList');if(!el)return;const all=layerEntries();el.innerHTML=all.length?all.map(a=>`<div class="layerItem v103LayerItem ${canvasState.selectedType===a.kind&&canvasState.selectedId===a.id?'active':''}" data-layer-kind="${a.kind}" data-layer-id="${a.id}" draggable="true" ondragstart="layerNativeDragStart(event,'${a.kind}','${a.id}')" ondragover="event.preventDefault()" ondrop="layerNativeDrop(event,'${a.kind}','${a.id}')"><div class="layerRow"><button class="layerDragHandle" title="Ziehen" onpointerdown="layerPointerStart(event,'${a.kind}','${a.id}')">${icon('drag')}</button><button class="layerTitleBtn" onclick="${a.kind==='object'?`selectCanvasObject('${a.id}')`:`selectVector('${a.id}')`}"><span class="v103LayerKind">${a.kind==='object'?icon('sheet'):icon('rect')}</span><span class="layerName">${esc(a.name)}</span></button><div class="layerTools"><button title="Umbenennen" onclick="event.stopPropagation();renameLayerItem('${a.kind}','${a.id}')">${icon('edit')}</button><button title="Sperren" onclick="event.stopPropagation();${a.kind==='object'?`selectCanvasObject('${a.id}')`:`selectVector('${a.id}')`};toggleSelectedLock()">${icon(a.locked?'unlock':'lock')}</button><button class="layerDeleteBtn" title="Löschen" onclick="event.stopPropagation();deleteLayerItem('${a.kind}','${a.id}')">${icon('trash')}</button></div></div></div>`).join(''):'<div class="v103EmptyState">Noch keine Elemente.</div>';const mobile=document.querySelector('#canvasQuickDrawer.open .mobileLayerList');if(mobile)mobile.innerHTML=el.innerHTML};

  /* Page strip with one obvious + Seite button. */
  v96RenderPageStrip=function(){const strip=v96EnsurePageStrip();if(!strip)return;canvasState.pages ||= [v96CurrentPageData()];strip.innerHTML=`<div class="v96PageThumbs v103PageThumbs">${canvasState.pages.map((p,i)=>`<button class="v96PageThumb ${i===canvasState.activePage?'active':''}" onclick="v96SwitchPage(${i})"><span>${i+1}</span><small>Seite ${i+1}</small></button>`).join('')}<button class="v96PageAdd v103PageAdd" onclick="v96AddPage()">${icon('plus')}<small>Seite hinzufügen</small></button></div><div class="v96PageActions"><button title="Duplizieren" onclick="v96DuplicatePage()">${icon('duplicate')}</button><button title="Löschen" onclick="v96DeletePage()">${icon('trash')}</button></div>`};

  /* More stable desktop vector dragging: pointer capture + one paint per frame. */
  startVectorDrag=function(e,vid){e.preventDefault();e.stopPropagation();const v=canvasState.vectors.find(x=>x.id===vid);if(!v||v.locked)return;const p=canvasPoint(e),snap=JSON.parse(JSON.stringify(v)),pid=e.pointerId,host=e.currentTarget;host?.setPointerCapture?.(pid);let latest=null,raf=0;const paint=()=>{raf=0;if(!latest)return;const q=canvasPoint(latest),dx=q.x-p.x,dy=q.y-p.y;if(v.type==='rect'){v.x=snap.x+dx;v.y=snap.y+dy}else if(v.type==='ellipse'){v.cx=snap.cx+dx;v.cy=snap.cy+dy}else if(v.points)v.points=snap.points.map(pt=>[pt[0]+dx,pt[1]+dy]);renderVectors();markCanvasDirty(false)};const move=ev=>{if(ev.pointerId!==pid)return;latest=ev;if(!raf)raf=requestAnimationFrame(paint)};const up=ev=>{if(ev.pointerId!==pid)return;if(raf){cancelAnimationFrame(raf);paint()}window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',up,true);try{host?.releasePointerCapture?.(pid)}catch(_){}pushHistory()};window.addEventListener('pointermove',move,{capture:true,passive:false});window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',up,true)};

  /* Rectangle + triangle corner controls are consistent. */
  const v103InspectorBase=renderCanvasInspector;
  renderCanvasInspector=function(){v103InspectorBase();if(canvasState.selectedType==='vector'){const v=canvasState.vectors.find(x=>x.id===canvasState.selectedId),box=$('#canvasInspector .vectorControls');if(v&&box){const existing=box.querySelector('.v103RoundCtl');if(!existing&&(v.type==='rect'||v.type==='triangle'))box.insertAdjacentHTML('beforeend',`<div class="v103RoundCtl"><label>Ecken rund</label><input type="range" min="0" max="${v.type==='rect'?100:70}" value="${v.type==='rect'?(v.rx||0):(v.cornerRadius||0)}" oninput="updateVectorStyle('${v.type==='rect'?'rx':'cornerRadius'}',+this.value)"></div>`)}}if(window.innerWidth>=900&&document.body.classList.contains('editorMode')&&canvasState.selectedId)setTimeout(()=>v102RightTab('design'),0)};

  /* Cleaner categorized desktop palette. */
  function pbtn(label,ico,act){return `<button onclick="${act}"><span class="v103PaletteIcon">${icon(ico)}</span><span>${label}</span></button>`}
  function v103PaletteHTML(){return `<div class="v102PaletteGroup"><div class="v102PaletteTitle">Text & Inhalt</div><div class="v102PaletteGrid">${pbtn('Textfeld','pencil','addCanvasTextBox()')}${pbtn('Checkliste','homework','addCanvasChecklist()')}${pbtn('Bild / Datei','image','openCanvasMediaPicker()')}${pbtn('Tabelle','table','openTableDialog()')}</div></div><div class="v102PaletteGroup"><div class="v102PaletteTitle">Formen</div><div class="v102PaletteGrid">${pbtn('Rechteck','rect',"addVectorShape('rect')")}${pbtn('Kreis','circle',"addVectorShape('ellipse')")}${pbtn('Dreieck','triangle',"addVectorShape('triangle')")}${pbtn('Linie','line','addVectorLine()')}</div></div><div class="v102PaletteGroup"><div class="v102PaletteTitle">Mathematik</div><div class="v102PaletteGrid">${pbtn('Formel','formula','openFormulaDialog()')}${pbtn('Graph','graph','openGraphDialog()')}</div></div><div class="v102PaletteGroup"><div class="v102PaletteTitle">Papier & Deko</div><div class="v102PaletteGrid">${pbtn('Vorlagen','template',"editorOpenGroup('templates')")}${pbtn('Sticker','heart',"editorOpenGroup('decor')")}</div></div>`}
  window.v102PaletteHTML=v103PaletteHTML;

  function v103Topbar(){if(window.__STUDIA_DESKTOP_UI_OWNER&&innerWidth>=900)return;if(window.innerWidth<900||!document.body.classList.contains('editorMode'))return;const top=$('.canvasTopbar');if(!top)return;const hist=top.querySelector('.historyBar'),actions=top.querySelector('.editorActions');if(hist){const b=hist.querySelectorAll('button');if(b[0])b[0].innerHTML=icon('undo');if(b[1])b[1].innerHTML=icon('redo')}if(actions){const b=actions.querySelectorAll('button');if(b[0]){b[0].innerHTML=icon('pages');b[0].title='Seite & Ansicht'}if(b[1]){b[1].innerHTML=icon('download');b[1].title='Exportieren';b[1].setAttribute('onclick','v103OpenExportMenu()')}if(b[2])b[2].innerHTML=icon('print');if(b[3])b[3].innerHTML=icon('save')}const title=top.querySelector('.editorTitle b');if(title){const sh=(data.studySheets||[]).find(x=>x.id===selectedSheetId);title.textContent=sh?.title||window.v102PendingResource?.name||'Lernblatt'}}

  /* Important export choices. PDF uses print; PNG/JPG export active page. */
  window.v103OpenExportMenu=function(){openModal(`<div class="v103Export"><div class="rowBetween"><div><div class="eyebrow">EXPORT</div><h2>Speichern als</h2></div><button class="iconbtn" onclick="closeModal()">${icon('close')}</button></div><div class="v103ExportGrid"><button onclick="closeModal();printCanvasSheet()">${icon('print')}<b>PDF / Drucken</b><small>Alle wichtigen Druckoptionen</small></button><button onclick="closeModal();v103ExportImage('png')">${icon('image')}<b>PNG</b><small>Aktuelle Seite</small></button><button onclick="closeModal();v103ExportImage('jpeg')">${icon('image')}<b>JPG</b><small>Aktuelle Seite</small></button><button onclick="closeModal();exportCanvasHTML()">${icon('download')}<b>HTML</b><small>Bearbeitbare Datei</small></button></div></div>`)};
  window.v103ExportImage=function(type='png'){try{v96SyncPage?.()}catch(_){}const W=canvasPageWidth(),H=canvasPageHeight(),stage=$('#canvasStage');if(!stage)return;const clone=stage.cloneNode(true);clone.querySelectorAll('.selected,.resizeHandle,.rotateHandle,.vectorSelectBox,.vectorHandle,.vectorRotateLine,.pathNode,.guideLine').forEach(x=>x.remove());clone.querySelectorAll('[contenteditable]').forEach(x=>x.removeAttribute('contenteditable'));const xml=new XMLSerializer().serializeToString(clone);const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><foreignObject x="0" y="0" width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${W}px;height:${H}px;background:white">${xml}</div></foreignObject></svg>`;const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=W*2;c.height=H*2;const ctx=c.getContext('2d');ctx.scale(2,2);ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.drawImage(img,0,0,W,H);URL.revokeObjectURL(url);const a=document.createElement('a');a.download=((data.studySheets||[]).find(x=>x.id===selectedSheetId)?.title||'Studia-Seite').replace(/[^a-z0-9äöüß _-]/gi,'_')+'.'+(type==='jpeg'?'jpg':'png');a.href=c.toDataURL('image/'+type,type==='jpeg'?.94:1);a.click()};img.onerror=()=>{URL.revokeObjectURL(url);alert('Bildexport konnte für diese Seite nicht erzeugt werden. PDF/HTML funktionieren weiterhin.')};img.src=url};

  /* Upgrade desktop init without touching the phone editor. */
  const v103RenderSheetBase=renderSheetEditor;
  renderSheetEditor=function(){v103RenderSheetBase();setTimeout(()=>{if(window.innerWidth>=900){const d=$('#canvasQuickDrawer');if(d)d.innerHTML=v103PaletteHTML();v103Topbar();v96RenderPageStrip();v102RightTab(canvasState.selectedId?'design':'page')}},80)};

  /* Keep current view after refresh, including subject/topic/editor. */
  const v103OpenViewBase=openView;
  openView=function(name,...args){const out=v103OpenViewBase(name,...args);try{sessionStorage.setItem('studia-last-view',name);sessionStorage.setItem('studia-last-subject',selectedSubjectId||'');sessionStorage.setItem('studia-last-topic',selectedTopicId||'');sessionStorage.setItem('studia-last-sheet',selectedSheetId||'')}catch(_){}return out};
  window.addEventListener('beforeunload',()=>{try{sessionStorage.setItem('studia-last-view',document.querySelector('.view.active')?.id?.replace('view-','')||'home');sessionStorage.setItem('studia-last-subject',selectedSubjectId||'');sessionStorage.setItem('studia-last-topic',selectedTopicId||'');sessionStorage.setItem('studia-last-sheet',selectedSheetId||'')}catch(_){}});

  setTimeout(()=>{const e=$('#headerEyebrow');if(e)e.textContent='VERSION 202';document.title='Studia';if(document.body.classList.contains('editorMode')){v103Topbar();v96RenderPageStrip()}},60);
  /* Space shows a grab hand; middle mouse or Space+drag pans. */
  window.addEventListener('keydown',e=>{const a=e.target instanceof Element?e.target:document.activeElement,typing=/INPUT|TEXTAREA|SELECT/.test(a?.tagName)||a?.isContentEditable||!!a?.closest?.('[contenteditable="true"]');if(e.code==='Space'&&document.body.classList.contains('editorMode')&&!typing)$('#canvasViewport')?.classList.add('v103Hand')});
  window.addEventListener('keyup',e=>{if(e.code==='Space')$('#canvasViewport')?.classList.remove('v103Hand')});
  window.addEventListener('blur',()=>$('#canvasViewport')?.classList.remove('v103Hand'));

  /* Restore the exact working area after a normal refresh in the same tab. */
  /* V162 SAFE START: do not auto-resume the last editor/view during boot. */

})();
/* ===== /Studia V103 additions ===== */
/* ===== /Studia V103 behavior ===== */
/* Compatibility bridge for the classic editor patches that follow this module. */
Object.assign(window,{
  $, $$, data, canvasState,
  renderVectors,renderCanvasObjects,renderCanvasInspector,renderLayerList,renderSheetEditor,renderSettings,
  v96RenderPageStrip,save,dbOpen,openModal,closeModal,
  canvasPageWidth,canvasPageHeight,vectorBounds,pathD,attachVectorEvents,renderPageTemplates,
  markCanvasDirty,pushHistory,layerEntries,layerItemRef,reorderLayerItem,deleteLayerItem,
  selectVector,startVectorDrag,startDragObject,startVectorResize,startVectorRotate,startNodeDrag,
  toggleVectorInMultiSelection,toggleObjectInMultiSelection,updateMultiSelectStatus,updateMobileSelectionTools,
  selectedObjectIds,selectedVectorIds,mobileSelectedText,renderTopicDetail,renderSubjectDetail,openView
});
Object.defineProperties(window,{
  canvasZoom:{configurable:true,get:()=>canvasZoom,set:v=>{canvasZoom=Number(v)||1}},
  openEditorGroup:{configurable:true,get:()=>openEditorGroup,set:v=>{openEditorGroup=v}},
  selectedSheetId:{configurable:true,get:()=>selectedSheetId,set:v=>{selectedSheetId=v}},
  selectedSubjectId:{configurable:true,get:()=>selectedSubjectId,set:v=>{selectedSubjectId=v}},
  selectedTopicId:{configurable:true,get:()=>selectedTopicId,set:v=>{selectedTopicId=v}}
});
