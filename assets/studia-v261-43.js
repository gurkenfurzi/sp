
(function(){
  const DESKTOP_MIN=1100;
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function svg(name){
    const m={
      bunny:`<svg viewBox="0 0 24 24"><path d="M8.5 8.5C6.8 5.2 7 2.6 8.2 2c1.4-.5 3 1.6 4 5.6"/><path d="M15.5 8.5c1.7-3.3 1.5-5.9.3-6.5-1.4-.5-3 1.6-4 5.6"/><path d="M5 13c0-4.4 3.1-7 7-7s7 2.6 7 7v2.3c0 4.3-2.8 6.7-7 6.7s-7-2.4-7-6.7V13Z"/><path d="M9.2 13.2h.01M14.8 13.2h.01"/><path d="M10.2 17c1.1.9 2.5.9 3.6 0"/></svg>`,
      cal:`<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 9h18"/></svg>`,
      tasks:`<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m7 12 3 3 7-8"/></svg>`,
      learn:`<svg viewBox="0 0 24 24"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v16H7.5A3.5 3.5 0 0 0 4 21.5z"/><path d="M4 5.5v16"/></svg>`,
      folder:`<svg viewBox="0 0 24 24"><path d="M3 6h7l2 2h9v11H3z"/></svg>`,
      test:`<svg viewBox="0 0 24 24"><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></svg>`,
      notes:`<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="m14 6 4 4"/></svg>`,
      sprout:`<svg viewBox="0 0 24 24"><path d="M12 21v-9"/><path d="M12 13c-5 0-8-3-8-7 5 0 8 3 8 7Z"/><path d="M12 16c5 0 8-3 8-7-5 0-8 3-8 7Z"/></svg>`,
      heart:`<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>`,
      refresh:`<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0 2.2 5.6"/><path d="M20 4v7h-7"/></svg>`,
      calendar2:`<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
      settings:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.8-1L14.4 3h-4.8l-.3 3.1a7 7 0 0 0-1.8 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.8 1l.3 3.1h4.8l.3-3.1a7 7 0 0 0 1.8-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z"/></svg>`,
      math:`<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2"/></svg>`,
      bio:`<svg viewBox="0 0 24 24"><path d="M12 21v-9"/><path d="M12 13c-5 0-8-3-8-7 5 0 8 3 8 7Z"/><path d="M12 16c5 0 8-3 8-7-5 0-8 3-8 7Z"/></svg>`,
      globe:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>`,
      hist:`<svg viewBox="0 0 24 24"><path d="m3 9 9-5 9 5"/><path d="M5 10h14M6 10v7M10 10v7M14 10v7M18 10v7M4 20h16"/></svg>`,
      chem:`<svg viewBox="0 0 24 24"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M8 15h8"/></svg>`,
      deutsch:`<svg viewBox="0 0 24 24"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v16H7.5A3.5 3.5 0 0 0 4 21.5z"/><path d="M4 5.5v16"/></svg>`,
      phys:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.5"/><ellipse cx="12" cy="12" rx="9" ry="3.5"/><ellipse cx="12" cy="12" rx="3.5" ry="9" transform="rotate(45 12 12)"/><ellipse cx="12" cy="12" rx="3.5" ry="9" transform="rotate(-45 12 12)"/></svg>`
    }; return m[name]||m.cal;
  }
  function lessonIcon(subject){
    const s=String(subject||'').toLowerCase();
    if(s.includes('mathe'))return svg('math');
    if(s.includes('bio'))return svg('bio');
    if(s.includes('engl'))return svg('globe');
    if(s.includes('geschichte'))return svg('hist');
    if(s.includes('chem'))return svg('chem');
    if(s.includes('deutsch'))return svg('deutsch');
    if(s.includes('phys'))return svg('phys');
    return svg('cal');
  }
  function weekInfo(){
    const now=new Date();
    const monday=new Date(now); monday.setDate(now.getDate()-((now.getDay()+6)%7)); monday.setHours(12,0,0,0);
    const dates=[]; for(let i=0;i<5;i++){const d=new Date(monday); d.setDate(monday.getDate()+i); dates.push(d);}
    const months=['Jan.','Feb.','März','Apr.','Mai','Juni','Juli','Aug.','Sep.','Okt.','Nov.','Dez.'];
    const iso=(d)=>{const x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())); const day=x.getUTCDay()||7; x.setUTCDate(x.getUTCDate()+4-day); const ys=new Date(Date.UTC(x.getUTCFullYear(),0,1)); return Math.ceil((((x-ys)/86400000)+1)/7)};
    return {week:`Woche`, range:`${dates[0].getDate()}. – ${dates[4].getDate()}. ${months[dates[4].getMonth()]} ${dates[4].getFullYear()}`, short:(d)=>`${d.getDate()}. ${months[d.getMonth()]}`, dates};
  }
  function currentView(){return document.querySelector('.view.active')?.id?.replace('view-','')||'plan'}
  function taskBubble(){
    const h=(data.homework||[]).filter(x=>!x.done).length; const t=(data.tests||[]).filter(x=>{try{const n=calendarDaysUntil(x.date);return n!=null&&n>=0}catch(_){return false}}).length; return h+t;
  }
  function sidebarButton(label, icon, active, action, bubble){
    return `<button class="navItem ${active?'active':''} ${bubble?'hasBubble':''}" onclick="${action}"><span class="navIcon">${svg(icon)}</span><span class="navLabel">${esc(label)}</span><span class="navBubble">${bubble||''}</span></button>`;
  }
  function ensureSidebar(){
    if(window.innerWidth<DESKTOP_MIN||!document.body.classList.contains('planViewActive'))return;
    const app=document.querySelector('.app'); if(!app) return;
    let s=document.getElementById('v208Sidebar'); if(!s){s=document.createElement('aside'); s.id='v208Sidebar'; app.insertBefore(s, app.firstChild);}    
    const view=currentView(), bubble=taskBubble();
    s.innerHTML=`<div class="v208Brand"><span class="v208BrandIcon">${svg('bunny')}</span><span class="v208BrandText"><b>Studia</b><small>PLAN · LERNEN · ERREICHEN</small></span></div>
      <div class="navList">
        ${sidebarButton('Stundenplan','cal',true,`openView('plan')`,'')}
        ${sidebarButton('Aufgaben','tasks',view==='tasks',`openView('tasks')`,bubble?String(bubble):'')}
        ${sidebarButton('Lernen','learn',view==='study',`openView('study')`,'')}
        ${sidebarButton('Fächer','folder',view==='subjects',`openView('subjects')`,'')}
        ${sidebarButton('Tests','test',false,`openView('tasks')`,'')}
        ${sidebarButton('Notizen','notes',false,`openView('subjects')`,'')}
      </div>
      <div class="quoteBox"><span class="quoteSprout">${svg('sprout')}</span><div class="quoteText">Better<br>than<br>yesterday.</div><span class="quoteHeart">${svg('heart')}</span></div>`;
  }
  function ensureHead(){
    if(window.innerWidth<DESKTOP_MIN||!document.body.classList.contains('planViewActive'))return;
    const view=document.getElementById('view-plan'); if(!view) return;
    let h=document.getElementById('v208PlanHead');
    if(!h){
      h=document.createElement('div'); h.id='v208PlanHead';
      h.innerHTML=`<div class="title">Stundenplan</div><div class="sub">${esc(data.settings.school||'PHS Ludwigshafen')}</div>
      <div class="modeWrap"><button class="modeBtn">Tag</button><button class="modeBtn active">Woche</button></div>
      <div class="actionRow"><button class="headBtn" onclick="loadRemotePlan(true)" title="Aktualisieren">${svg('refresh')}</button><button class="headBtn" onclick="openView('tasks')" title="Kalender">${svg('calendar2')}</button><button class="headBtn" onclick="openView('settings')" title="Einstellungen">${svg('settings')}</button></div>
      <div class="weekNav"><button class="weekBtn" type="button">‹</button><div class="weekInfo"><b></b><small></small></div><button class="weekBtn" type="button">›</button></div>`;
      view.insertBefore(h, view.firstChild);
    }
    const wk=weekInfo();
    h.querySelector('.sub').textContent=data.settings.school||'PHS Ludwigshafen';
    h.querySelector('.weekInfo b').textContent=wk.week;
    h.querySelector('.weekInfo small').textContent=wk.range;
  }
  function colorClass(subject){
    const s=String(subject||'').toLowerCase();
    if(s.includes('bio'))return 'green';
    if(s.includes('engl'))return 'blue';
    if(s.includes('geschichte'))return 'gold';
    if(s.includes('chem'))return 'purple';
    if(s.includes('deutsch'))return 'peach';
    return 'pink';
  }
  function timeLines(viewLessons){
    let labels=new Set(['08:00']);
    const list=(viewLessons||[]).flatMap(l=>[l.start,l.end]);
    list.forEach(t=>{ if(t&&m(t)>=480) labels.add(t); });
    const pauses=(typeof getActivePauses==='function'?getActivePauses():[]);
    pauses.forEach(p=>{ if(m(p.start)>=480) labels.add(p.start); if(m(p.end)>=480) labels.add(p.end); });
    const arr=[...labels].sort((a,b)=>m(a)-m(b));
    let last=Math.max(945, ...arr.map(m));
    return {start:480, labels:arr, end:last};
    function m(t){const [hh,mm]=String(t||'00:00').split(':').map(Number); return hh*60+mm;}
  }
  function renderReferenceWeek(){
    const selectedClass=data.timetable.selectedClass||data.settings.className||'M U1';
    const viewLessons=timetableViewMode==='basis'?basisScheduleForClass(selectedClass):currentScheduleForClass(selectedClass);
    const wk=weekInfo();
    const timeline=timeLines(viewLessons||[]);
    const px=1.35; const bodyHeight=Math.max(690, Math.round((timeline.end-timeline.start)*px));
    const timePos=t=>Math.round((toMin(t)-timeline.start)*px);
    const today=dayCode(new Date());

    function toMin(t){const [hh,mm]=String(t||'00:00').split(':').map(Number); return hh*60+mm;}
    function dayContent(day){
      const rawDay=stableTimetableDay(applyEffectiveDisplayTimes((viewLessons||[]).filter(x=>x.day===day))).filter(x=>toMin(x.end)>timeline.start);
      const specialOnly=rawDay.filter(x=>x.specialOnly), normal=rawDay.filter(x=>!x.specialOnly);
      const guides=timeline.labels.map(t=>`<div class="v208GridLine" style="top:${timePos(t)}px"></div>`).join('');
      if(specialOnly.length&&!normal.length){
        const card=specialOnly.map(x=>{const raw=cleanPdfCellText(x.raw||''); const tm=raw.match(/^(\d{1,2}(?::\d{2})?\s*Uhr)\s*(.*)$/i); return `<div class="v208Special"><b>${esc(tm?tm[1]:'Info')}</b>${esc(tm?tm[2]:raw)}</div>`;}).join('');
        return `<div class="v208DayBody" style="height:${bodyHeight}px">${guides}${card}</div>`;
      }
      const merged=expandLessonsForVisibleBreaks(mergeLessons(rawDay.filter(x=>timetableViewMode==='basis'?!x.cancelledFromBasis:true)));
      const lessons=merged.map(l=>{
        const raw=(Array.isArray(l.duplicates)&&l.duplicates.length?l.duplicates[0].raw:l.raw)||''; const p=splitCell(raw); const title=prettySubject(p.subject); const meta=[p.room?('Raum '+p.room):'',p.teacher||p.meta].filter(Boolean).join(' · ');
        const top=Math.max(0,timePos(l.start))+6; const height=Math.max(72, Math.round((toMin(l.end)-toMin(l.start))*px)-8); const compact=height<86;
        return `<button class="v208Lesson ${colorClass(title)} ${compact?'compact':''}" style="top:${top}px;height:${height}px" onclick='openLessonDetails(${JSON.stringify(JSON.stringify(l))})'><span class="v208LessonIcon">${lessonIcon(title)}</span><span><span class="v208LessonTitle">${esc(title)}</span><span class="v208LessonTime">${esc(l.start)} – ${esc(l.end)}</span>${meta?`<span class="v208LessonMeta">${esc(meta)}</span>`:''}</span></button>`;
      }).join('');
      return `<div class="v208DayBody" style="height:${bodyHeight}px">${guides}${lessons||'<div class="v208Empty">Kein Unterricht</div>'}</div>`;
    }

    return `<div class="v208WeekBoard"><div class="v208Corner"></div>${dayOrder.map((d,i)=>`<div class="v208DayHead ${d===today?'today':''}"><b>${esc(d)}</b><span>${esc(wk.short(wk.dates[i]))}</span></div>`).join('')}<div class="v208TimeRail" style="height:${bodyHeight}px">${timeline.labels.map(t=>`<div class="v208TimeLabel" style="top:${timePos(t)}px">${esc(t)}</div>`).join('')}</div>${dayOrder.map(d=>dayContent(d)).join('')}</div>`;
  }
  window.renderDesktopWeekPlan=renderReferenceWeek; try{renderDesktopWeekPlan=window.renderDesktopWeekPlan}catch(_){ }
  const prevOpen=window.openView;
  if(typeof prevOpen==='function'&&!prevOpen.__v208wrap){window.openView=function(){const r=prevOpen.apply(this,arguments); setTimeout(()=>{ensureSidebar();ensureHead();},0); return r;}; window.openView.__v208wrap=true; try{openView=window.openView}catch(_){ }}
  const prevRender=window.renderPlan;
  if(typeof prevRender==='function'&&!prevRender.__v208wrap){window.renderPlan=function(){const r=prevRender.apply(this,arguments); setTimeout(()=>{ensureSidebar();ensureHead();},0); return r;}; window.renderPlan.__v208wrap=true; try{renderPlan=window.renderPlan}catch(_){ }}
  window.addEventListener('resize',()=>setTimeout(()=>{ensureSidebar();ensureHead();},20));
  document.addEventListener('click',()=>setTimeout(()=>{ensureSidebar();ensureHead();},0),true);
  [0,200,700,1500].forEach(t=>setTimeout(()=>{ensureSidebar();ensureHead();},t));
})();
