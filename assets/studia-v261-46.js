
(function(){
  const DESKTOP_MIN=1100;
  const dayOrderV212=['Mo','Di','Mi','Do','Fr'];
  const aliasMap={
    PH:'Physik',PHY:'Physik',PHYS:'Physik',PHYSIK:'Physik',
    BIO:'Biologie',BI:'Biologie',BIOLOGIE:'Biologie',
    GES:'Geschichte',GE:'Geschichte',G:'Geschichte',GESCHICHTE:'Geschichte',
    CH:'Chemie',CHE:'Chemie',CHEMIE:'Chemie',
    D:'Deutsch',DE:'Deutsch',DEUTSCH:'Deutsch',
    E:'Englisch',ENG:'Englisch',ENGLISCH:'Englisch',
    M:'Mathematik',MATHE:'Mathematik',MATHEMATIK:'Mathematik',
    ET:'Ethik',ETHIK:'Ethik',SP:'Sport',SPO:'Sport',SPORT:'Sport',
    INF:'Informatik',INFORMATIK:'Informatik'
  };
  const referenceColors={
    'MATHEMATIK':'#e9a7a4','DEUTSCH':'#e7c5a5','ENGLISCH':'#9fb8e3','BIOLOGIE':'#b6c99c',
    'GESCHICHTE':'#e4c38a','CHEMIE':'#bea4d9','PHYSIK':'#aeb9df','ETHIK':'#d5aec6',
    'SPORT':'#9dcdbd','INFORMATIK':'#a9bddb','WIRTSCHAFT & SOZIALKUNDE':'#d8b995'
  };
  const autoPalette=['#e9a7a4','#9fb8e3','#b6c99c','#e4c38a','#bea4d9','#e7c5a5','#aeb9df','#9dcdbd','#d5aec6'];
  let dragSubjectId='';

  function desktop(){return innerWidth>=DESKTOP_MIN&&!document.body.classList.contains('editorMode')}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function toMin(t){const [h,m]=String(t||'00:00').split(':').map(Number);return (h||0)*60+(m||0)}
  function canonical(raw){
    let x='';
    try{x=prettySubject(String(raw||''))}catch(_){x=String(raw||'')}
    x=String(x||'').replace(/\s+/g,' ').trim();
    const up=x.toUpperCase();
    return aliasMap[up]||x;
  }
  function key(raw){return canonical(raw).replace(/\s+/g,' ').trim().toUpperCase()}
  function subjectFromLesson(l){
    if(!l||l.specialOnly||l.cancelledFromBasis)return'';
    try{const p=splitCell(l.raw||'');return canonical(p.subject||'')}catch(_){return''}
  }
  function referenceColor(name){
    const k=key(name);if(referenceColors[k])return referenceColors[k];
    if(/^LF\s*\d+$/i.test(name)){const n=Number(String(name).match(/\d+/)?.[0]||0);return autoPalette[n%autoPalette.length]}
    let h=0;for(const c of k)h=(h*31+c.charCodeAt(0))>>>0;return autoPalette[h%autoPalette.length]
  }
  function getColor(name){
    const k0=key(name);data.timetableSubjectColors ||= {};
    if(data.timetableSubjectColors[k0])return data.timetableSubjectColors[k0];
    const linked=(data.subjects||[]).find(s=>key(s.name)===k0||key(s.abbr)===k0);
    if(linked?.color)return linked.color;
    return referenceColor(name);
  }
  function hexColor(c){try{return colorToHex(c)}catch(_){return /^#[0-9a-f]{6}$/i.test(String(c||''))?c:'#e9a7a4'}}
  function mixWhite(c,ratio=.72){
    const h=hexColor(c).replace('#','');const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
    const f=v=>Math.round(v+(255-v)*ratio).toString(16).padStart(2,'0');return '#'+f(r)+f(g)+f(b)
  }
  function iconKey(name){const k=key(name);if(k==='MATHEMATIK')return'calculator';if(k==='DEUTSCH')return'pencil';if(k==='ENGLISCH')return'chat';if(k==='BIOLOGIE'||k==='PHYSIK'||k==='CHEMIE')return'atom';return'book'}

  /* ---------- one automatic Fachordner for every real timetable subject ---------- */
  function scheduleLists(){
    const cls=data.timetable?.selectedClass||data.settings?.className||'M U1';const all=[];
    try{all.push(...(currentScheduleForClass(cls)||[]))}catch(_){all.push(...(data.timetable?.lessons||[]))}
    try{all.push(...(originalBasisScheduleForClass?originalBasisScheduleForClass(cls):[]))}catch(_){ }
    return all;
  }
  function ensureAutomaticSubjectFolders(){
    data.subjects=Array.isArray(data.subjects)?data.subjects:[];data.timetableSubjectColors ||= {};
    const names=[];const seen=new Set();
    for(const l of scheduleLists()){
      const n=subjectFromLesson(l);const k0=key(n);
      if(!n||!k0||k0==='UNTERRICHT'||seen.has(k0))continue;seen.add(k0);names.push(n)
    }
    let changed=false;
    for(const n of names){
      const k0=key(n);const exists=data.subjects.some(s=>key(s.name)===k0||key(s.abbr)===k0);
      if(exists)continue;
      const color=referenceColor(n);if(!data.timetableSubjectColors[k0])data.timetableSubjectColors[k0]=color;
      let abbr='';try{abbr=defaultSubjectAbbr(n)}catch(_){abbr=n.replace(/[^A-Za-zÄÖÜäöü0-9]/g,'').slice(0,5).toUpperCase()||'FACH'}
      data.subjects.push({id:(typeof id==='function'?id():'subject-'+Date.now()+'-'+Math.random().toString(36).slice(2)),name:n,abbr,color,cover:mixWhite(color,.62),iconKey:iconKey(n),emoji:'📚',notes:[],topics:[],files:[],autoFromTimetable:true});changed=true
    }
    if(changed){try{save()}catch(_){try{localStorage.setItem(KEY,JSON.stringify(data))}catch(__){}}}
    return changed
  }

  /* ---------- same Fachfarbe on the Fächer page + desktop drag/drop ordering ---------- */
  function subjectByCard(card){const sid=card?.dataset?.subjectId;if(sid)return (data.subjects||[]).find(s=>s.id===sid);const n=card?.querySelector('strong')?.textContent||'';return(data.subjects||[]).find(s=>key(s.name)===key(n))}
  function clearDropMarks(){document.querySelectorAll('.v102Notebook.v212DropBefore,.v102Notebook.v212DropAfter').forEach(x=>x.classList.remove('v212DropBefore','v212DropAfter'))}
  function moveSubject(fromId,toId,after){
    if(!fromId||!toId||fromId===toId)return;const arr=data.subjects||[];const from=arr.findIndex(s=>s.id===fromId);if(from<0)return;const [moved]=arr.splice(from,1);let to=arr.findIndex(s=>s.id===toId);if(to<0){arr.push(moved)}else{if(after)to++;arr.splice(to,0,moved)}
    try{save()}catch(_){};setTimeout(()=>{try{renderSubjects()}catch(_){};setTimeout(decorateSubjectCards,0)},0)
  }
  function decorateSubjectCards(){
    const root=document.querySelector('#view-subjects #subjectList');if(!root)return;ensureAutomaticSubjectFolders();
    const cards=[...root.querySelectorAll('.v102Notebook[data-search]')];
    for(const card of cards){
      const s=subjectByCard(card);if(!s)continue;const color=getColor(s.name);card.dataset.subjectId=s.id;card.dataset.v212Subject='1';card.draggable=desktop();card.style.setProperty('--v212-card',color);card.style.setProperty('--ring',color);card.style.setProperty('--pin',color);card.title=desktop()?'Ziehen, um die Fächer frei zu sortieren':'';
      if(!card.querySelector('.v212DragHint'))card.insertAdjacentHTML('beforeend','<span class="v212DragHint" aria-hidden="true">•••</span>');
      card.ondragstart=e=>{if(!desktop()){e.preventDefault();return}dragSubjectId=s.id;card.classList.add('v212Dragging');try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',s.id)}catch(_){}};
      card.ondragover=e=>{if(!dragSubjectId||dragSubjectId===s.id)return;e.preventDefault();clearDropMarks();const r=card.getBoundingClientRect(),after=e.clientX>r.left+r.width/2;card.classList.add(after?'v212DropAfter':'v212DropBefore');card.dataset.dropAfter=after?'1':'0'};
      card.ondrop=e=>{e.preventDefault();const from=dragSubjectId||(()=>{try{return e.dataTransfer.getData('text/plain')}catch(_){return''}})();const after=card.dataset.dropAfter==='1';clearDropMarks();moveSubject(from,s.id,after);dragSubjectId=''};
      card.ondragend=()=>{dragSubjectId='';card.classList.remove('v212Dragging');clearDropMarks()}
    }
  }

  /* Re-render Fächer whenever a timetable color is changed. */
  const oldSetColor=window.setTimetableSubjectColor;
  if(typeof oldSetColor==='function'&&!oldSetColor.__v212){
    window.setTimetableSubjectColor=function(subject,color){
      const r=oldSetColor.apply(this,arguments);const k0=key(subject),s=(data.subjects||[]).find(x=>key(x.name)===k0||key(x.abbr)===k0);if(s){s.color=String(color).toLowerCase();s.cover=mixWhite(color,.62);try{save()}catch(_){}}
      setTimeout(()=>{if(document.querySelector('#view-subjects.active')){try{renderSubjects()}catch(_){};setTimeout(decorateSubjectCards,0)}paintTodayColors()},0);return r
    };window.setTimetableSubjectColor.__v212=true;try{setTimetableSubjectColor=window.setTimetableSubjectColor}catch(_){}
  }

  /* ---------- HEUTE: paint timeline and top current/next card with the same editable colors ---------- */
  function paintTodayColors(){
    document.querySelectorAll('#v209TodayTimeline .v209TodayCard').forEach(card=>{const title=card.querySelector('.v209TodayTitle')?.textContent||'';card.style.setProperty('--lesson-color',getColor(title))});
    const panel=document.getElementById('nextPanel');if(panel){let txt=panel.children?.[1]?.textContent||'';txt=txt.replace(/^Nächste Stunde:\s*/i,'').trim();if(txt&&!/Noch\s+\d|Kein weiterer Unterricht/i.test(txt)){panel.classList.add('v212SubjectPanel');panel.style.setProperty('--v212-home-color',getColor(txt))}else{panel.classList.remove('v212SubjectPanel');panel.style.removeProperty('--v212-home-color')}}
  }

  /* ---------- known PHS basis repair: Physik Wednesday, rows 1+2 ---------- */
  const originalBasisScheduleForClass=window.basisScheduleForClass||((typeof basisScheduleForClass==='function')?basisScheduleForClass:null);
  function rowTime(rowNum){try{const x=normalTimeForRow(rowNum)||effectiveTimeForRow(rowNum);if(x)return x}catch(_){};const slots={1:{start:'08:00',end:'08:45'},2:{start:'08:45',end:'09:30'}};return slots[rowNum]||null}
  function repairBasisPhysics(list){
    const out=(list||[]).map(x=>({...x}));const wed=out.filter(x=>x.day==='Mi'&&!x.specialOnly);
    const first=wed.find(x=>Number(x.rowNum)===1)||wed.find(x=>x.start==='08:00');if(!first)return out;
    let p='';try{p=canonical(splitCell(first.raw||'').subject)}catch(_){p=''};if(key(p)!=='PHYSIK'||Number(first.blocks||1)>1)return out;
    const second=wed.find(x=>x!==first&&(Number(x.rowNum)===2||x.start==='08:45'));
    if(second){let p2='';try{p2=canonical(splitCell(second.raw||'').subject)}catch(_){p2=''};if(key(p2)!=='PHYSIK')return out;first.end=second.end||'09:30';first.blocks=2;first.isDouble=true;first.recoveredBasisDouble=true;const i=out.indexOf(second);if(i>=0)out.splice(i,1);return out}
    const t=rowTime(2);if(t){first.end=t.end;first.blocks=2;first.isDouble=true;first.recoveredBasisDouble=true}return out
  }
  if(typeof originalBasisScheduleForClass==='function'){
    window.basisScheduleForClass=function(name){return repairBasisPhysics(originalBasisScheduleForClass.call(this,name)||[])};try{basisScheduleForClass=window.basisScheduleForClass}catch(_){}
  }

  /* ---------- Desktop plan: 08:00–15:00, only extend when a lesson really runs later ---------- */
  const previousDesktopRenderer=window.renderDesktopWeekPlan;
  function planWeekDates(){const now=new Date(),d=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);const off=Number(localStorage.getItem('studia-v210-week-offset')||0)||0;d.setDate(d.getDate()-((d.getDay()+6)%7)+(off*7));return dayOrderV212.map((_,i)=>{const x=new Date(d);x.setDate(d.getDate()+i);return x})}
  function planTitle(subject){const x=canonical(subject),u=key(x);return aliasMap[u]||x}
  function lessonSvg(subject){const s=key(subject);if(s==='MATHEMATIK')return'∑';if(s==='BIOLOGIE')return'♧';if(s==='ENGLISCH')return'◎';if(s==='GESCHICHTE')return'⌂';if(s==='CHEMIE')return'△';if(s==='PHYSIK')return'⚛';if(s==='DEUTSCH')return'▤';return'○'}
  function changeBadge(l,p){if(l.cancelledFromBasis)return'ENTFÄLLT';const raw=String(l.raw||'');if(/\b(entfall|entfällt|ausfall|fällt\s+aus)\b/i.test(raw))return'ENTFÄLLT';if(!l.changedFromBasis)return'';try{const old=splitCell(l.changedFromRaw||'');if(old.subject&&canonical(old.subject)===canonical(p.subject)){if(old.teacher&&p.teacher&&old.teacher!==p.teacher)return'VERTRETUNG';if(old.room&&p.room&&old.room!==p.room)return'RAUMÄNDERUNG'}}catch(_){}return'GEÄNDERT'}
  function timelineFor(list){
    const start=480;let end=900;for(const l of list||[]){if(l.specialOnly)continue;end=Math.max(end,toMin(l.end))}end=Math.ceil(end/15)*15;
    const labels=new Set(['08:00','15:00']);
    try{for(let i=1;i<=20;i++){const t=effectiveTimeForRow(i);if(!t)continue;if(toMin(t.start)>=start&&toMin(t.start)<=end)labels.add(t.start);if(toMin(t.end)>=start&&toMin(t.end)<=end)labels.add(t.end)}}catch(_){}
    for(const l of list||[]){if(toMin(l.start)>=start&&toMin(l.start)<=end)labels.add(l.start);if(toMin(l.end)>=start&&toMin(l.end)<=end)labels.add(l.end)}
    try{for(const p of getActivePauses()){if(toMin(p.start)>=start&&toMin(p.start)<=end)labels.add(p.start);if(toMin(p.end)>=start&&toMin(p.end)<=end)labels.add(p.end)}}catch(_){}
    return{start,end,labels:[...labels].filter(t=>toMin(t)>=start&&toMin(t)<=end).sort((a,b)=>toMin(a)-toMin(b))}
  }
  function renderV212Plan(){
    const cls=data.timetable?.selectedClass||data.settings?.className||'M U1';let source=[];
    try{source=timetableViewMode==='basis'?basisScheduleForClass(cls):currentScheduleForClass(cls)}catch(_){source=data.timetable?.lessons||[]}
    source=source||[];const tl=timelineFor(source),px=1.32,bodyHeight=Math.round((tl.end-tl.start)*px),pos=t=>Math.round((toMin(t)-tl.start)*px),today=(typeof dayCode==='function'?dayCode(new Date()):''),dates=planWeekDates();
    const mode=localStorage.getItem('studia-v210-plan-mode')==='day'?'day':'week';
    const selectedDay=['Mo','Di','Mi','Do','Fr'].includes(localStorage.getItem('studia-v210-plan-day'))?localStorage.getItem('studia-v210-plan-day'):(today||'Mo');
    const days=mode==='day'?[selectedDay]:dayOrderV212;
    function body(day){
      const rawDay=stableTimetableDay(applyEffectiveDisplayTimes(source.filter(x=>x.day===day))).filter(x=>toMin(x.end)>tl.start&&toMin(x.start)<tl.end);const special=rawDay.filter(x=>x.specialOnly),normal=rawDay.filter(x=>!x.specialOnly);const lines=tl.labels.map(t=>`<div class="v210GridLine" style="top:${pos(t)}px"></div>`).join('');
      const pauses=(typeof getActivePauses==='function'?getActivePauses():[]).filter(p=>toMin(p.end)>tl.start&&toMin(p.start)<tl.end).map(p=>{const n=new Date(),now=n.getHours()*60+n.getMinutes(),active=day===today&&toMin(p.start)<=now&&now<toMin(p.end);return `<div class="v210PauseBand ${active?'current':''}" style="top:${Math.max(0,pos(p.start))}px;height:${Math.max(10,pos(p.end)-pos(p.start))}px">${active?'JETZT · ':''}${esc(p.label||'Pause')}</div>`}).join('');
      if(special.length&&!normal.length){const info=special.map(x=>`<div class="v210Special"><b>Info</b>${esc(cleanPdfCellText(x.raw||''))}</div>`).join('');return `<div class="v210DayBody" style="height:${bodyHeight}px">${lines}${pauses}${info}</div>`}
      const merged=expandLessonsForVisibleBreaks(mergeLessons(rawDay.filter(x=>timetableViewMode==='basis'?!x.cancelledFromBasis:true)));const cards=merged.map(l=>{const p=splitCell(l.raw||''),altRaw=(Array.isArray(l.duplicates)&&l.duplicates.length?l.duplicates[0]?.raw:'')||l.changedFromRaw||'',alt=altRaw?splitCell(altRaw):{},room=String(p.room||alt.room||l.room||'').trim(),title=planTitle(p.subject||l.raw||''),badge=changeBadge(l,p),cancelled=badge==='ENTFÄLLT',top=Math.max(0,pos(l.start))+4,height=Math.max(44,Math.round((toMin(l.end)-toMin(l.start))*px)-7),compact=height<70,current=!cancelled&&typeof isLessonCurrentNow==='function'&&isLessonCurrentNow(l),teacher=String(p.teacher||p.meta||alt.teacher||alt.meta||'').trim(),color=getColor(title);return `<button class="v210Lesson ${compact?'compact':''} ${current?'current':''} ${cancelled?'cancelled':''} ${badge?'hasBadge':''}" style="top:${top}px;height:${height}px;--lesson-color:${esc(color)}" onclick='openLessonDetails(${JSON.stringify(JSON.stringify(l))})'>${badge?`<span class="v210Badge">${esc(badge)}</span>`:''}<span class="v210LessonIcon" style="font-size:17px">${esc(lessonSvg(title))}</span><span><span class="v210LessonTitle">${esc(title)}</span><span class="v210LessonTime">${esc(l.start)} – ${esc(l.end)}</span>${!cancelled?`<span class="v245LessonRoom">Raum ${esc(room||'—')}</span>`:''}${teacher&&!cancelled?`<span class="v210LessonMeta">${esc(teacher)}</span>`:''}${Number(l.blocks||1)>=2?`<span class="v210LessonMeta">Doppelstunde</span>`:''}</span></button>`}).join('');return `<div class="v210DayBody" style="height:${bodyHeight}px">${lines}${pauses}${cards||'<div class="v210Empty">Kein Unterricht</div>'}</div>`
    }
    const heads=days.map(d=>{const i=dayOrderV212.indexOf(d);return `<div class="v210DayHead ${d===today?'today':''}"><b>${esc(d)}</b><span>${esc(dates[i].toLocaleDateString('de-DE',{day:'2-digit',month:'short'}).replace(/\.$/,''))}</span></div>`}).join('');
    const tabs=mode==='day'?`<div class="v210DayTabs">${dayOrderV212.map((d,i)=>`<button class="v210DayTab ${d===selectedDay?'active':''}" onclick="v210SetPlanDay('${d}')">${d} · ${esc(dates[i].toLocaleDateString('de-DE',{day:'2-digit',month:'short'}).replace(/\.$/,''))}</button>`).join('')}</div>`:'';
    return `${tabs}<div class="v210WeekBoard ${mode==='day'?'dayMode':''}"><div class="v210Corner"></div>${heads}<div class="v210TimeRail" style="height:${bodyHeight}px">${tl.labels.map(t=>`<div class="v210TimeLabel" style="top:${pos(t)}px">${esc(t)}</div>`).join('')}</div>${days.map(body).join('')}</div>${tl.end>900?`<div class="v212TimeEndNote">Automatisch bis ${String(Math.floor(tl.end/60)).padStart(2,'0')}:${String(tl.end%60).padStart(2,'0')} verlängert.</div>`:''}`
  }
  window.renderDesktopWeekPlan=function(){if(desktop())return renderV212Plan();return typeof previousDesktopRenderer==='function'?previousDesktopRenderer.apply(this,arguments):''};try{renderDesktopWeekPlan=window.renderDesktopWeekPlan}catch(_){}

  /* ---------- Visible current/basis switch + timetable settings shortcut ---------- */
  window.v212SetSource=function(mode){try{setTimetableViewMode(mode)}catch(_){timetableViewMode=mode==='basis'?'basis':'current';try{renderPlan()}catch(__){}};setTimeout(reconcile,0)};
  window.v212OpenTimetableSettings=function(){openView('settings');setTimeout(()=>{const box=document.getElementById('v210TimetableSettings');box?.scrollIntoView({behavior:'smooth',block:'start'});box?.classList.add('v212SettingsFlash');setTimeout(()=>box?.classList.remove('v212SettingsFlash'),900)},80)};
  function planControls(){
    if(!desktop())return;const head=document.getElementById('v210PlanHead');if(!head)return;const view=document.getElementById('view-plan');if(!view?.classList.contains('active'))return;
    const actions=head.querySelector('.actionRow');if(actions){const refresh=actions.querySelector('button[title="Aktualisieren"]')||actions.children[0];if(refresh&&!refresh.classList.contains('v212RefreshBtn')){refresh.classList.add('v212RefreshBtn');refresh.insertAdjacentHTML('beforeend','<span>Aktualisieren</span>')}const gear=actions.querySelector('button[title="Einstellungen"]');if(gear)gear.setAttribute('onclick','v212OpenTimetableSettings()')}
    let sw=document.getElementById('v212PlanSourceSwitch');if(!sw){sw=document.createElement('div');sw.id='v212PlanSourceSwitch';head.insertAdjacentElement('afterend',sw)}sw.innerHTML=`<button class="${timetableViewMode==='current'?'active':''}" onclick="v212SetSource('current')">Aktuell & Änderungen</button><button class="${timetableViewMode==='basis'?'active':''}" onclick="v212SetSource('basis')">Basisplan</button><span class="v212SourceHint">${timetableViewMode==='basis'?'Normalplan':'gültiger Plan'}</span>`
  }

  /* ---------- remove Notizen from desktop sidebar (and keep it removed when V210 rebuilds it) ---------- */
  function trimSidebar(){const s=document.getElementById('v210Sidebar');if(!s)return;for(const b of s.querySelectorAll('.navItem'))if((b.querySelector('.navLabel')?.textContent||'').trim()==='Notizen')b.remove()}

  /* ---------- integrate after all existing renderers without rewriting their business logic ---------- */
  function reconcile(){ensureAutomaticSubjectFolders();trimSidebar();planControls();decorateSubjectCards();paintTodayColors()}
  const oldOpen=window.openView;if(typeof oldOpen==='function'&&!oldOpen.__v212){window.openView=function(){const r=oldOpen.apply(this,arguments);setTimeout(reconcile,0);return r};window.openView.__v212=true;try{openView=window.openView}catch(_){}}
  const oldHome=window.renderHome;if(typeof oldHome==='function'&&!oldHome.__v212){window.renderHome=function(){const r=oldHome.apply(this,arguments);setTimeout(()=>{paintTodayColors();decorateSubjectCards()},0);return r};window.renderHome.__v212=true;try{renderHome=window.renderHome}catch(_){}}
  const oldPlan=window.renderPlan;if(typeof oldPlan==='function'&&!oldPlan.__v212){window.renderPlan=function(){const r=oldPlan.apply(this,arguments);setTimeout(()=>{planControls();paintTodayColors()},0);return r};window.renderPlan.__v212=true;try{renderPlan=window.renderPlan}catch(_){}}
  const oldLoad=window.loadRemotePlan;if(typeof oldLoad==='function'&&!oldLoad.__v212){window.loadRemotePlan=async function(){const r=await oldLoad.apply(this,arguments);ensureAutomaticSubjectFolders();setTimeout(reconcile,0);return r};window.loadRemotePlan.__v212=true;try{loadRemotePlan=window.loadRemotePlan}catch(_){}}
  const oldSwitchClass=window.switchTimetableClass;if(typeof oldSwitchClass==='function'&&!oldSwitchClass.__v212){window.switchTimetableClass=function(){const r=oldSwitchClass.apply(this,arguments);ensureAutomaticSubjectFolders();setTimeout(reconcile,0);return r};window.switchTimetableClass.__v212=true;try{switchTimetableClass=window.switchTimetableClass}catch(_){}}

  const sidebarObserver=new MutationObserver(()=>{if(desktop())trimSidebar()});
  const attachObserver=()=>{const s=document.getElementById('v210Sidebar');if(s&&!s.dataset.v212Observed){s.dataset.v212Observed='1';sidebarObserver.observe(s,{childList:true,subtree:true})}};
  window.addEventListener('resize',()=>setTimeout(()=>{attachObserver();reconcile()},80));document.addEventListener('click',()=>setTimeout(()=>{attachObserver();reconcile()},0),true);
  [0,120,450,1100,2200].forEach(t=>setTimeout(()=>{attachObserver();reconcile()},t));
})();
