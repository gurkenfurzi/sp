
(function(){
  'use strict';
  const MIN=1100;
  let weekOffset=Number(localStorage.getItem('studia-v210-week-offset')||0)||0;
  let desktopMode=localStorage.getItem('studia-v210-plan-mode')==='day'?'day':'week';
  let desktopDay=localStorage.getItem('studia-v210-plan-day')||((typeof dayCode==='function'&&dayCode(new Date()))||'Mo');
  let navFocus='',specialNavInFlight=false;
  if(!['Mo','Di','Mi','Do','Fr'].includes(desktopDay))desktopDay='Mo';

  function esc2(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function svg(name){const m={
    bunny:`<svg viewBox="0 0 24 24"><path d="M8.5 8.5C6.8 5.2 7 2.6 8.2 2c1.4-.5 3 1.6 4 5.6"/><path d="M15.5 8.5c1.7-3.3 1.5-5.9.3-6.5-1.4-.5-3 1.6-4 5.6"/><path d="M5 13c0-4.4 3.1-7 7-7s7 2.6 7 7v2.3c0 4.3-2.8 6.7-7 6.7s-7-2.4-7-6.7V13Z"/><path d="M9.2 13.2h.01M14.8 13.2h.01"/><path d="M10.2 17c1.1.9 2.5.9 3.6 0"/></svg>`,
    cal:`<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 9h18"/></svg>`,
    tasks:`<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m7 12 3 3 7-8"/></svg>`,
    learn:`<svg viewBox="0 0 24 24"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v16H7.5A3.5 3.5 0 0 0 4 21.5z"/><path d="M4 5.5v16"/></svg>`,
    folder:`<svg viewBox="0 0 24 24"><path d="M3 6h7l2 2h9v11H3z"/></svg>`,
    test:`<svg viewBox="0 0 24 24"><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></svg>`,
    notes:`<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="m14 6 4 4"/></svg>`,
    dayoff:`<svg viewBox="0 0 24 24"><path d="M6 3v3M18 3v3M4 8h16v12H4z"/><path d="m8 13 2 2 5-5"/></svg>`,
    clock:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
    settings:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.8-1L14.4 3h-4.8l-.3 3.1a7 7 0 0 0-1.8 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.8 1l.3 3.1h4.8l.3-3.1a7 7 0 0 0 1.8-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z"/></svg>`,
    refresh:`<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0 2.2 5.6"/><path d="M20 4v7h-7"/></svg>`,
    calendar2:`<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
    sprout:`<svg viewBox="0 0 24 24"><path d="M12 21v-9"/><path d="M12 13c-5 0-8-3-8-7 5 0 8 3 8 7Z"/><path d="M12 16c5 0 8-3 8-7-5 0-8 3-8 7Z"/></svg>`,
    heart:`<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>`,
    math:`<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2"/></svg>`,
    bio:`<svg viewBox="0 0 24 24"><path d="M12 21v-9"/><path d="M12 13c-5 0-8-3-8-7 5 0 8 3 8 7Z"/><path d="M12 16c5 0 8-3 8-7-5 0-8 3-8 7Z"/></svg>`,
    globe:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>`,
    hist:`<svg viewBox="0 0 24 24"><path d="m3 9 9-5 9 5"/><path d="M5 10h14M6 10v7M10 10v7M14 10v7M18 10v7M4 20h16"/></svg>`,
    chem:`<svg viewBox="0 0 24 24"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M8 15h8"/></svg>`,
    book:`<svg viewBox="0 0 24 24"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v16H7.5A3.5 3.5 0 0 0 4 21.5z"/><path d="M4 5.5v16"/></svg>`,
    atom:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.5"/><ellipse cx="12" cy="12" rx="9" ry="3.5"/><ellipse cx="12" cy="12" rx="3.5" ry="9" transform="rotate(45 12 12)"/><ellipse cx="12" cy="12" rx="3.5" ry="9" transform="rotate(-45 12 12)"/></svg>`
  };return m[name]||m.cal}
  function lessonIcon(subject){const s=String(subject||'').toLowerCase();if(s.includes('mathe'))return svg('math');if(s.includes('bio'))return svg('bio');if(s.includes('engl'))return svg('globe');if(s.includes('geschichte'))return svg('hist');if(s.includes('chem'))return svg('chem');if(s.includes('deutsch'))return svg('book');if(s.includes('phys'))return svg('atom');return svg('cal')}
  function desktop(){return innerWidth>=MIN&&!document.body.classList.contains('editorMode')}
  function currentView(){return document.querySelector('.view.active')?.id?.replace('view-','')||'home'}
  function taskBubble(){const h=(data.homework||[]).filter(x=>!x.done).length;const t=(data.tests||[]).filter(x=>{try{const n=calendarDaysUntil(x.date);return n!=null&&n>=0}catch(_){return false}}).length;return h+t}
  function side(label,icon,views,action,bubble,key=''){const matched=(Array.isArray(views)?views:[views]).includes(currentView());const active=navFocus?navFocus===key:matched;return `<button class="navItem ${active?'active':''} ${bubble?'hasBubble':''}" onclick="${action}"><span class="navIcon">${svg(icon)}</span><span class="navLabel">${esc2(label)}</span><span class="navBubble">${bubble||''}</span></button>`}

  window.v210Nav=function(view){navFocus='';openView(view)};
  window.v210OpenTests=function(){navFocus='tests';specialNavInFlight=true;openView('tasks');specialNavInFlight=false;setTimeout(()=>{ensureSidebar();document.getElementById('testList')?.closest('.section')?.scrollIntoView({block:'start',behavior:'smooth'})},80)};
  window.v210OpenNotes=function(){navFocus='notes';specialNavInFlight=true;openView('subjects');specialNavInFlight=false;setTimeout(ensureSidebar,0)};
  window.v210OpenMissedHours=function(){navFocus='';ensureMissedHoursView();openView('missed-hours');setTimeout(renderMissedHours,0)};

  function ensureSidebar(){
    document.body.classList.toggle('v210Desktop',desktop());
    if(!desktop())return;
    const app=document.querySelector('.app');if(!app)return;
    let s=document.getElementById('v210Sidebar');if(!s){s=document.createElement('aside');s.id='v210Sidebar';app.insertBefore(s,app.firstChild)}
    const bubble=taskBubble();
    s.innerHTML=`<div class="brand" onclick="openView('home')"><span class="brandIcon">${svg('bunny')}</span><span class="brandText"><b>Studia</b><small>PLAN · LERNEN · ERREICHEN</small></span></div>
      <div class="navList">
        ${side('Stundenplan','cal','plan',`openView('plan')`,'')}
        ${side('Aufgaben','tasks','tasks',`openView('tasks')`,bubble?String(bubble):'')}
        ${side('Lernen','learn',['study','learnsets'],`v210Nav('study')`,'','study')}
        ${side('Fächer','folder',['subjects','subject-detail','topic-detail','deck-detail'],`v210Nav('subjects')`,'','subjects')}
        ${side('Tests','test','__never__',`v210OpenTests()`,'','tests')}
        ${side('Notizen','notes','__never__',`v210OpenNotes()`,'','notes')}
        <div class="navDivider"></div>
        ${side('Fehltage','dayoff','absence',`v210Nav('absence')`,'','absence')}
        ${side('Fehlstunden','clock','missed-hours',`v210OpenMissedHours()`,'','missed-hours')}
      </div>
      <div class="sidebarBottom">${side('Einstellungen','settings','settings',`v210Nav('settings')`,'','settings')}
        <div class="quoteBox"><span class="quoteIcon">${svg('sprout')}</span><div class="quoteText">Better<br>than<br>yesterday.</div><span class="quoteHeart">${svg('heart')}</span></div>
      </div>`;
  }

  function startOfWeek(offset=0){const n=new Date();const d=new Date(n.getFullYear(),n.getMonth(),n.getDate(),12);d.setDate(d.getDate()-((d.getDay()+6)%7)+(offset*7));return d}
  function isoWeek(d){const x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const day=x.getUTCDay()||7;x.setUTCDate(x.getUTCDate()+4-day);const ys=new Date(Date.UTC(x.getUTCFullYear(),0,1));return Math.ceil((((x-ys)/86400000)+1)/7)}
  function weekInfo(){const mon=startOfWeek(weekOffset),dates=[];for(let i=0;i<5;i++){const d=new Date(mon);d.setDate(mon.getDate()+i);dates.push(d)}const fmt=d=>d.toLocaleDateString('de-DE',{day:'2-digit',month:'short'}).replace('. ',' ').replace(/\.$/,'');const range=`${dates[0].toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})} – ${dates[4].toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}`;return{week:`Woche`,range,dates,short:fmt}}
  window.v210ShiftWeek=function(n){weekOffset+=Number(n)||0;localStorage.setItem('studia-v210-week-offset',String(weekOffset));ensurePlanHead();if(document.getElementById('view-plan')?.classList.contains('active'))renderPlan()};
  window.v210SetPlanMode=function(mode){desktopMode=mode==='day'?'day':'week';localStorage.setItem('studia-v210-plan-mode',desktopMode);ensurePlanHead();renderPlan()};
  window.v210SetPlanDay=function(day){if(!['Mo','Di','Mi','Do','Fr'].includes(day))return;desktopDay=day;localStorage.setItem('studia-v210-plan-day',day);renderPlan()};

  function ensurePlanHead(){
    if(!desktop()||!document.getElementById('view-plan')?.classList.contains('active'))return;
    const view=document.getElementById('view-plan');let h=document.getElementById('v210PlanHead');if(!h){h=document.createElement('div');h.id='v210PlanHead';view.insertBefore(h,view.firstChild)}
    const wk=weekInfo();
    h.innerHTML=`<div class="title">Stundenplan</div><div class="sub">${esc2(data.settings.school||'PHS Ludwigshafen')}</div>
      <div class="modeWrap"><button class="modeBtn ${desktopMode==='day'?'active':''}" onclick="v210SetPlanMode('day')">Tag</button><button class="modeBtn ${desktopMode==='week'?'active':''}" onclick="v210SetPlanMode('week')">Woche</button></div>
      <div class="actionRow"><button class="headBtn" onclick="loadRemotePlan(true)" title="Aktualisieren">${svg('refresh')}</button><button class="headBtn" onclick="openView('tasks')" title="Kalender">${svg('calendar2')}</button><button class="headBtn" onclick="openView('settings')" title="Einstellungen">${svg('settings')}</button></div>
      <div class="weekNav"><button class="weekBtn" onclick="v210ShiftWeek(-1)" aria-label="Vorherige Woche">‹</button><button class="weekInfo" onclick="${weekOffset?`v210ShiftWeek(${-weekOffset})`:`void 0`}" title="${weekOffset?'Zur aktuellen Woche':'Aktuelle Woche'}"><b>${esc2(wk.week)}</b><small>${esc2(wk.range)}</small></button><button class="weekBtn v210WeekBtnRight" onclick="v210ShiftWeek(1)" aria-label="Nächste Woche">›</button></div>`;
  }

  function toMin(t){const[a,b]=String(t||'00:00').split(':').map(Number);return(a||0)*60+(b||0)}
  function timeline(viewLessons){
    const start=480,end=960,labels=new Set(['08:00','15:45']);
    try{for(let i=1;i<=16;i++){const t=effectiveTimeForRow(i);if(!t)continue;if(toMin(t.start)>=start&&toMin(t.start)<=end)labels.add(t.start);if(toMin(t.end)>=start&&toMin(t.end)<=end)labels.add(t.end)}}catch(_){ }
    for(const l of (viewLessons||[])){if(toMin(l.start)>=start&&toMin(l.start)<=end)labels.add(l.start);if(toMin(l.end)>=start&&toMin(l.end)<=end)labels.add(l.end)}
    try{for(const p of getActivePauses()){if(toMin(p.start)>=start&&toMin(p.start)<=end)labels.add(p.start);if(toMin(p.end)>=start&&toMin(p.end)<=end)labels.add(p.end)}}catch(_){ }
    return{start,end,labels:[...labels].sort((a,b)=>toMin(a)-toMin(b))}
  }
  function changeLabel(l,p){
    if(l.cancelledFromBasis)return'ENTFÄLLT';
    const raw=String(l.raw||'');if(/\b(entfall|entfällt|ausfall|fällt\s+aus)\b/i.test(raw))return'ENTFÄLLT';
    if(!l.changedFromBasis)return'';
    try{const old=splitCell(l.changedFromRaw||'');const now=p||splitCell(raw);if(old.subject&&prettySubject(old.subject)===prettySubject(now.subject)){if(old.teacher&&now.teacher&&old.teacher!==now.teacher)return'VERTRETUNG';if(old.room&&now.room&&old.room!==now.room)return'RAUMÄNDERUNG'} }catch(_){ }
    return'GEÄNDERT'
  }
  function desktopPretty(subject){const p=prettySubject(subject),u=String(p||'').trim().toUpperCase();const map={PH:'Physik',PHY:'Physik',PHYS:'Physik',BIO:'Biologie',BI:'Biologie',GES:'Geschichte',GE:'Geschichte',G:'Geschichte',CH:'Chemie',CHE:'Chemie'};return map[u]||p}
  function subjectColor(title){try{return timetableSubjectColor(title)||'#e9a7a4'}catch(_){return'#e9a7a4'}}

  function renderV210Plan(){
    const selectedClass=data.timetable.selectedClass||data.settings.className||'M U1';
    /* Desktop always shows the effective/current plan. Basis data is still retained and used to mark changes/cancellations. */
    const viewLessons=(typeof currentScheduleForClass==='function'?currentScheduleForClass(selectedClass):(data.timetable.lessons||[]))||[];
    const tl=timeline(viewLessons),px=1.32,bodyHeight=Math.round((tl.end-tl.start)*px),pos=t=>Math.round((toMin(t)-tl.start)*px),wk=weekInfo(),today=dayCode(new Date());
    const days=desktopMode==='day'?[desktopDay]:dayOrder;
    const dayIndex=d=>dayOrder.indexOf(d);
    function body(day){
      const rawDay=stableTimetableDay(applyEffectiveDisplayTimes(viewLessons.filter(x=>x.day===day))).filter(x=>toMin(x.end)>tl.start&&toMin(x.start)<tl.end);
      const special=rawDay.filter(x=>x.specialOnly),normal=rawDay.filter(x=>!x.specialOnly);
      const lines=tl.labels.map(t=>`<div class="v210GridLine" style="top:${pos(t)}px"></div>`).join('');
      const pauses=(typeof getActivePauses==='function'?getActivePauses():[]).filter(p=>toMin(p.end)>tl.start&&toMin(p.start)<tl.end).map(p=>{const active=day===today&&toMin(p.start)<=toMinNow()&&toMinNow()<toMin(p.end);return `<div class="v210PauseBand ${active?'current':''}" style="top:${Math.max(0,pos(p.start))}px;height:${Math.max(10,pos(p.end)-pos(p.start))}px">${active?'JETZT · ':''}${esc2(p.label||'Pause')}</div>`}).join('');
      if(special.length&&!normal.length){const cards=special.map(x=>{const raw=cleanPdfCellText(x.raw||'');const tm=raw.match(/^(\d{1,2}(?::\d{2})?\s*Uhr)\s*(.*)$/i);return `<div class="v210Special"><b>${esc2(tm?tm[1]:'Info')}</b>${esc2(tm?tm[2]:raw)}</div>`}).join('');return `<div class="v210DayBody" style="height:${bodyHeight}px">${lines}${pauses}${cards}</div>`}
      const merged=expandLessonsForVisibleBreaks(mergeLessons(rawDay));
      const cards=merged.map(l=>{
        const raw=(Array.isArray(l.duplicates)&&l.duplicates.length?l.duplicates[0].raw:l.raw)||'';const p=splitCell(raw),title=desktopPretty(p.subject||raw),badge=changeLabel(l,p),cancelled=badge==='ENTFÄLLT';
        const top=Math.max(0,pos(l.start))+4,height=Math.max(44,Math.round((toMin(l.end)-toMin(l.start))*px)-7),compact=height<70,current=!cancelled&&typeof isLessonCurrentNow==='function'&&isLessonCurrentNow(l);
        const meta=[p.room?('Raum '+p.room):'',p.teacher||p.meta].filter(Boolean).join(' · ');const color=subjectColor(title);
        return `<button class="v210Lesson ${compact?'compact':''} ${current?'current':''} ${cancelled?'cancelled':''} ${badge?'hasBadge':''}" style="top:${top}px;height:${height}px;--lesson-color:${esc2(color)}" onclick='openLessonDetails(${JSON.stringify(JSON.stringify(l))})'>${badge?`<span class="v210Badge">${esc2(badge)}</span>`:''}<span class="v210LessonIcon">${lessonIcon(title)}</span><span><span class="v210LessonTitle">${esc2(title)}</span><span class="v210LessonTime">${esc2(l.start)} – ${esc2(l.end)}</span>${meta&&!cancelled?`<span class="v210LessonMeta">${esc2(meta)}</span>`:''}</span></button>`
      }).join('');
      return `<div class="v210DayBody" style="height:${bodyHeight}px">${lines}${pauses}${cards||'<div class="v210Empty">Kein Unterricht</div>'}</div>`
    }
    function toMinNow(){const n=new Date();return n.getHours()*60+n.getMinutes()}
    const tabs=desktopMode==='day'?`<div class="v210DayTabs">${dayOrder.map((d,i)=>`<button class="v210DayTab ${d===desktopDay?'active':''}" onclick="v210SetPlanDay('${d}')">${d} · ${esc2(wk.short(wk.dates[i]))}</button>`).join('')}</div>`:'';
    const heads=days.map(d=>{const i=dayIndex(d),date=wk.dates[Math.max(0,i)];return `<div class="v210DayHead ${weekOffset===0&&d===today?'today':''}"><b>${esc2(d)}</b><span>${esc2(wk.short(date))}</span></div>`}).join('');
    return `${tabs}<div class="v210WeekBoard ${desktopMode==='day'?'dayMode':''}"><div class="v210Corner"></div>${heads}<div class="v210TimeRail" style="height:${bodyHeight}px">${tl.labels.map(t=>`<div class="v210TimeLabel" style="top:${pos(t)}px">${esc2(t)}</div>`).join('')}</div>${days.map(body).join('')}</div>`
  }

  /* Own the desktop renderer only; the mobile/tablet renderer/business logic remains untouched. */
  const priorDesktopWeekRenderer=window.renderDesktopWeekPlan;
  window.renderDesktopWeekPlan=function(){
    if(desktop())return renderV210Plan();
    return typeof priorDesktopWeekRenderer==='function'?priorDesktopWeekRenderer.apply(this,arguments):'';
  };
  try{renderDesktopWeekPlan=window.renderDesktopWeekPlan}catch(_){ }

  function ensureMissedHoursView(){
    if(document.getElementById('view-missed-hours'))return;
    const settings=document.getElementById('view-settings');if(!settings)return;
    const v=document.createElement('section');v.className='view';v.id='view-missed-hours';v.innerHTML=`<div class="sectionHead"><h2>Fehlstunden</h2><button class="primary" onclick="openAddMissedHour()">+ Eintragen</button></div><div class="v210MissingSummary" id="missedHoursSummary"></div><div class="v210MissingList" id="missedHoursList"></div>`;settings.parentNode.insertBefore(v,settings)
  }
  window.openAddMissedHour=function(){data.missedHours ||= [];openModal(`<h2>Fehlstunde eintragen</h2><div class="formGrid"><div><label>Datum</label><input id="mhDate" type="date" value="${todayISO()}"></div><div><label>Fach</label><input id="mhSubject" placeholder="z. B. Mathematik"></div><div><label>Von</label><input id="mhStart" type="time" value="08:00"></div><div><label>Bis</label><input id="mhEnd" type="time" value="08:45"></div><div><label>Status</label><select id="mhStatus"><option>Entschuldigung offen</option><option>Entschuldigt</option></select></div><div><label>Grund</label><input id="mhReason" placeholder="z. B. Arzttermin"></div><div class="full"><label>Notiz</label><input id="mhNote" placeholder="Optional"></div></div><button class="primary" style="margin-top:12px" onclick="addMissedHour()">Speichern</button>`)};
  window.addMissedHour=function(){data.missedHours ||= [];const date=document.getElementById('mhDate')?.value||todayISO(),subject=document.getElementById('mhSubject')?.value.trim()||'Unterricht',start=document.getElementById('mhStart')?.value||'',end=document.getElementById('mhEnd')?.value||'',status=document.getElementById('mhStatus')?.value||'Entschuldigung offen',reason=document.getElementById('mhReason')?.value.trim()||'Fehlstunde',note=document.getElementById('mhNote')?.value.trim()||'';data.missedHours.push({id:id(),date,subject,start,end,status,reason,note});save();closeModal();setTimeout(renderMissedHours,0)};
  window.toggleMissedHour=function(mid){data.missedHours ||= [];const x=data.missedHours.find(x=>x.id===mid);if(x){x.status=x.status==='Entschuldigt'?'Entschuldigung offen':'Entschuldigt';save();setTimeout(renderMissedHours,0)}};
  window.deleteMissedHour=function(mid){data.missedHours ||= [];data.missedHours=data.missedHours.filter(x=>x.id!==mid);save();setTimeout(renderMissedHours,0)};
  function renderMissedHours(){ensureMissedHoursView();data.missedHours ||= [];const sum=document.getElementById('missedHoursSummary'),list=document.getElementById('missedHoursList');if(!sum||!list)return;const total=data.missedHours.length,open=data.missedHours.filter(x=>x.status!=='Entschuldigt').length;sum.innerHTML=`<div class="kpi"><div class="big">${total}</div><div class="small">Fehlstunden eingetragen</div></div><div class="kpi"><div class="big">${open}</div><div class="small">Entschuldigungen offen</div></div>`;list.innerHTML=total?data.missedHours.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(x=>`<div class="card rowBetween"><div><b>${esc2(x.subject)}</b><div class="small">${esc2(fmtDate(x.date))}${x.start?` · ${esc2(x.start)}${x.end?'–'+esc2(x.end):''}`:''}${x.reason?' · '+esc2(x.reason):''}${x.note?' · '+esc2(x.note):''}</div></div><div class="row"><button class="badge ${x.status==='Entschuldigt'?'good':'warn'}" onclick="toggleMissedHour('${esc2(x.id)}')">${esc2(x.status)}</button><button class="dangerBtn" onclick="deleteMissedHour('${esc2(x.id)}')">×</button></div></div>`).join(''):'<div class="empty">Keine Fehlstunden eingetragen.</div>'}
  window.renderMissedHours=renderMissedHours;

  function uniquePlanSubjects(){const cls=data.timetable.selectedClass||data.settings.className||'M U1',ls=(typeof currentScheduleForClass==='function'?currentScheduleForClass(cls):(data.timetable.lessons||[]))||[],set=new Map();for(const l of ls){if(l.specialOnly||l.cancelledFromBasis)continue;try{const p=splitCell(l.raw||'');const t=desktopPretty(p.subject);if(t&&!set.has(t))set.set(t,timetableSubjectColor(t))}catch(_){ }}return[...set.entries()].slice(0,18)}
  function ensureTimetableSettings(){
    if(!desktop())return;const view=document.getElementById('view-settings');if(!view)return;let box=document.getElementById('v210TimetableSettings');if(!box){box=document.createElement('div');box.id='v210TimetableSettings';box.className='panel';view.insertBefore(box,view.firstChild)}
    const subs=uniquePlanSubjects();box.innerHTML=`<div class="rowBetween"><div><div class="eyebrow">STUNDENPLAN</div><h2>Stundenplan</h2></div><span class="badge">Desktop</span></div><div class="v210SettingsGrid"><div class="v210SettingCard"><b>Hitzestunden</b><small id="v210HeatState">${esc2(typeof effectiveHeatModeLabel==='function'?effectiveHeatModeLabel():'Automatisch')}</small><div class="heatModeButtons"><button class="${heatModeOverride==='auto'?'active':''}" onclick="setHeatMode('auto',this);setTimeout(v210RefreshDesktopSettings,0)">Auto</button><button class="${heatModeOverride==='on'?'active':''}" onclick="setHeatMode('on',this);setTimeout(v210RefreshDesktopSettings,0)">An</button><button class="${heatModeOverride==='off'?'active':''}" onclick="setHeatMode('off',this);setTimeout(v210RefreshDesktopSettings,0)">Aus</button></div></div><div class="v210SettingCard"><b>Automatische Aktualisierung</b><small>Der Plan wird beim Öffnen und im Vordergrund automatisch geprüft. Die bestehende Auto-Sync-Logik bleibt aktiv.</small><button class="ghost" style="margin-top:9px;min-height:32px;padding:6px 9px;font-size:9px" onclick="loadRemotePlan(true)">Jetzt aktualisieren</button></div><div class="v210SettingCard full" style="grid-column:1/-1"><b>Fachfarben</b><small>Die bereits gespeicherten Fachfarben werden direkt im Desktop-Stundenplan verwendet.</small><div id="v210SubjectColors">${subs.length?subs.map(([name,color])=>`<label class="v210ColorRow"><span>${esc2(name)}</span><input type="color" value="${esc2(colorToHex(color))}" onchange="setTimetableSubjectColor(${JSON.stringify(name)},this.value);setTimeout(v210RefreshDesktopSettings,0)"></label>`).join(''):'<span class="small">Noch keine Fächer im Plan erkannt.</span>'}</div></div></div>`
  }
  window.v210RefreshDesktopSettings=function(){ensureTimetableSettings();ensureSidebar();if(document.getElementById('view-plan')?.classList.contains('active')){ensurePlanHead();renderPlan()}};

  function ensurePageHead(){if(!desktop())return;const v=currentView();const labels={absence:['Fehltage','Ganze versäumte Schultage & Entschuldigungen'],'missed-hours':['Fehlstunden','Einzelne versäumte Unterrichtsstunden']};const view=document.getElementById('view-'+v);if(!view||!labels[v])return;let h=view.querySelector(':scope > .v210PageHead');if(!h){h=document.createElement('div');h.className='v210PageHead';view.insertBefore(h,view.firstChild)}h.innerHTML=`<div><h1>${labels[v][0]}</h1><p>${labels[v][1]}</p></div>`}

  function reconcile(){ensureMissedHoursView();ensureSidebar();if(!desktop())return;ensurePlanHead();ensureTimetableSettings();renderMissedHours();ensurePageHead()}
  const oldOpen=window.openView;if(typeof oldOpen==='function'&&!oldOpen.__v210){window.openView=function(){if(!specialNavInFlight)navFocus='';const r=oldOpen.apply(this,arguments);setTimeout(reconcile,0);return r};window.openView.__v210=true;try{openView=window.openView}catch(_){ }}
  const oldPlan=window.renderPlan;if(typeof oldPlan==='function'&&!oldPlan.__v210){window.renderPlan=function(){const r=oldPlan.apply(this,arguments);setTimeout(()=>{ensureSidebar();ensurePlanHead()},0);return r};window.renderPlan.__v210=true;try{renderPlan=window.renderPlan}catch(_){ }}
  window.addEventListener('resize',()=>setTimeout(reconcile,60));document.addEventListener('click',()=>setTimeout(()=>{if(desktop())ensureSidebar()},0),true);[0,180,600,1500].forEach(t=>setTimeout(reconcile,t));
})();
