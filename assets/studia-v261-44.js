
(function(){
  const MIN=1100;
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function svg(name){const m={
    bunny:`<svg viewBox="0 0 24 24"><path d="M8.5 8.5C6.8 5.2 7 2.6 8.2 2c1.4-.5 3 1.6 4 5.6"/><path d="M15.5 8.5c1.7-3.3 1.5-5.9.3-6.5-1.4-.5-3 1.6-4 5.6"/><path d="M5 13c0-4.4 3.1-7 7-7s7 2.6 7 7v2.3c0 4.3-2.8 6.7-7 6.7s-7-2.4-7-6.7V13Z"/><path d="M9.2 13.2h.01M14.8 13.2h.01"/><path d="M10.2 17c1.1.9 2.5.9 3.6 0"/></svg>`,
    home:`<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/></svg>`,
    cal:`<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 9h18"/></svg>`,
    tasks:`<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m7 12 3 3 7-8"/></svg>`,
    learn:`<svg viewBox="0 0 24 24"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v16H7.5A3.5 3.5 0 0 0 4 21.5z"/><path d="M4 5.5v16"/></svg>`,
    folder:`<svg viewBox="0 0 24 24"><path d="M3 6h7l2 2h9v11H3z"/></svg>`,
    test:`<svg viewBox="0 0 24 24"><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></svg>`,
    notes:`<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="m14 6 4 4"/></svg>`,
    sprout:`<svg viewBox="0 0 24 24"><path d="M12 21v-9"/><path d="M12 13c-5 0-8-3-8-7 5 0 8 3 8 7Z"/><path d="M12 16c5 0 8-3 8-7-5 0-8 3-8 7Z"/></svg>`,
    heart:`<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>`,
    plus:`<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`,
    settings:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.8-1L14.4 3h-4.8l-.3 3.1a7 7 0 0 0-1.8 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.8 1l.3 3.1h4.8l.3-3.1a7 7 0 0 0 1.8-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z"/></svg>`,
    math:`<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2"/></svg>`,
    bio:`<svg viewBox="0 0 24 24"><path d="M12 21v-9"/><path d="M12 13c-5 0-8-3-8-7 5 0 8 3 8 7Z"/><path d="M12 16c5 0 8-3 8-7-5 0-8 3-8 7Z"/></svg>`,
    globe:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>`,
    hist:`<svg viewBox="0 0 24 24"><path d="m3 9 9-5 9 5"/><path d="M5 10h14M6 10v7M10 10v7M14 10v7M18 10v7M4 20h16"/></svg>`,
    chem:`<svg viewBox="0 0 24 24"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M8 15h8"/></svg>`,
    book:`<svg viewBox="0 0 24 24"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v16H7.5A3.5 3.5 0 0 0 4 21.5z"/><path d="M4 5.5v16"/></svg>`,
    atom:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.5"/><ellipse cx="12" cy="12" rx="9" ry="3.5"/><ellipse cx="12" cy="12" rx="3.5" ry="9" transform="rotate(45 12 12)"/><ellipse cx="12" cy="12" rx="3.5" ry="9" transform="rotate(-45 12 12)"/></svg>`
  };return m[name]||m.cal;}
  function subjectIcon(s){s=String(s||'').toLowerCase();if(s.includes('mathe'))return svg('math');if(s.includes('bio'))return svg('bio');if(s.includes('engl'))return svg('globe');if(s.includes('geschichte'))return svg('hist');if(s.includes('chem'))return svg('chem');if(s.includes('deutsch'))return svg('book');if(s.includes('phys'))return svg('atom');return svg('cal')}
  function colorClass(s){s=String(s||'').toLowerCase();if(s.includes('bio'))return'green';if(s.includes('engl'))return'blue';if(s.includes('geschichte'))return'gold';if(s.includes('chem'))return'purple';if(s.includes('deutsch'))return'peach';return'pink'}
  function currentView(){return document.querySelector('.view.active')?.id?.replace('view-','')||'home'}
  function taskBubble(){const h=(data.homework||[]).filter(x=>!x.done).length;const t=(data.tests||[]).filter(x=>{try{const n=calendarDaysUntil(x.date);return n!=null&&n>=0}catch(_){return false}}).length;return h+t}
  function side(label,icon,view,action,bubble){return `<button class="navItem ${currentView()===view?'active':''} ${bubble?'hasBubble':''}" onclick="${action}"><span class="navIcon">${svg(icon)}</span><span class="navLabel">${esc(label)}</span><span class="navBubble">${bubble||''}</span></button>`}
  function shellActive(){return window.innerWidth>=MIN&&!document.body.classList.contains('editorMode')&&!!document.querySelector('#view-home.active,#view-plan.active')}
  function ensureShell(){
    document.body.classList.toggle('v209Shell',shellActive());
    if(!shellActive())return;
    const app=document.querySelector('.app');if(!app)return;
    let s=document.getElementById('v209Sidebar');if(!s){s=document.createElement('aside');s.id='v209Sidebar';app.insertBefore(s,app.firstChild)}
    const bubble=taskBubble();
    s.innerHTML=`<div class="brand" onclick="openView('home')"><span class="brandIcon">${svg('bunny')}</span><span class="brandText"><b>Studia</b><small>PLAN · LERNEN · ERREICHEN</small></span></div><div class="navList">${side('Stundenplan','cal','plan',`v210Nav('plan')`,'','plan')}${side('Aufgaben','tasks','tasks',`v210Nav('tasks')`,bubble?String(bubble):'','tasks')}${side('Lernen','learn','study',`openView('study')`,'')}${side('Fächer','folder','subjects',`openView('subjects')`,'')}${side('Tests','test','tasks',`openView('tasks')`,'')}${side('Notizen','notes','subjects',`openView('subjects')`,'')}</div><div class="quoteBox"><span class="quoteIcon">${svg('sprout')}</span><div class="quoteText">Better<br>than<br>yesterday.</div><span class="quoteHeart">${svg('heart')}</span></div>`;
  }
  function dateInfo(){const d=new Date();const weekday=d.toLocaleDateString('de-DE',{weekday:'long'});const full=d.toLocaleDateString('de-DE',{day:'2-digit',month:'long',year:'numeric'});return{weekday,full}}
  function ensureHomeHead(){
    if(!shellActive()||!document.querySelector('#view-home.active'))return;
    const view=document.getElementById('view-home');let h=document.getElementById('v209HomeHead');if(!h){h=document.createElement('div');h.id='v209HomeHead';h.innerHTML=`<div class="title">Heute</div><div class="sub"></div><div class="actions"><button class="headBtn" onclick="openAddHomework()" title="Aufgabe hinzufügen">${svg('plus')}</button><button class="headBtn" onclick="openAddTest()" title="Test hinzufügen">${svg('test')}</button><button class="headBtn" onclick="openView('settings')" title="Einstellungen">${svg('settings')}</button></div><div class="dateCard"><b></b><small></small></div>`;view.insertBefore(h,view.firstChild)}
    const d=dateInfo();h.querySelector('.sub').textContent=data.settings.school||'PHS Ludwigshafen';h.querySelector('.dateCard b').textContent=d.weekday;h.querySelector('.dateCard small').textContent=d.full;
  }
  function toMin(t){const[a,b]=String(t||'00:00').split(':').map(Number);return(a||0)*60+(b||0)}
  function renderTodayTimeline(){
    if(!shellActive()||!document.querySelector('#view-home.active'))return;
    const host=document.getElementById('todayLessons');if(!host)return;
    let custom=document.getElementById('v209TodayTimeline');if(!custom){custom=document.createElement('div');custom.id='v209TodayTimeline';host.parentNode.insertBefore(custom,host)}
    const dc=dayCode(new Date());const all=expandLessonsForVisibleBreaks(mergeLessons(stableTimetableDay(applyEffectiveDisplayTimes((data.timetable.lessons||[]).filter(x=>x.day===dc))))).sort((a,b)=>a.start.localeCompare(b.start));
    if(!all.length){custom.innerHTML='<div class="empty">Heute kein Unterricht.</div>';return}
    const events=all.map(l=>({type:'lesson',sort:toMin(l.start),l}));
    const first=Math.min(...all.map(x=>toMin(x.start))),last=Math.max(...all.map(x=>toMin(x.end)));
    try{getActivePauses().forEach(p=>{if(first<toMin(p.end)&&last>toMin(p.start))events.push({type:'pause',sort:toMin(p.start),p})})}catch(_){ }
    events.sort((a,b)=>a.sort-b.sort|| (a.type==='lesson'?-1:1));
    custom.innerHTML=events.map(e=>{if(e.type==='pause')return `<div class="v209PauseRow"><div class="v209PauseTime">${esc(e.p.start)}–${esc(e.p.end)}</div><div class="v209PauseCard">${esc(e.p.label||'Pause')}</div></div>`;const l=e.l,raw=(Array.isArray(l.duplicates)&&l.duplicates.length?l.duplicates[0].raw:l.raw)||'',p=splitCell(raw),title=prettySubject(p.subject),meta=[p.room?('Raum '+p.room):'',p.teacher||p.meta].filter(Boolean).join(' · ');return `<div class="v209TodayRow"><div class="v209TodayTime">${esc(l.start)}<br>${esc(l.end)}</div><button class="v209TodayCard ${colorClass(title)}" onclick='openLessonDetails(${JSON.stringify(JSON.stringify(l))})'><span class="v209TodayIcon">${subjectIcon(title)}</span><span><span class="v209TodayTitle">${esc(title)}</span>${meta?`<span class="v209TodayMeta">${esc(meta)}</span>`:''}</span><span class="v209TodayRoom">${Number(l.blocks||1)>=2?'Doppelstunde':''}</span></button></div>`}).join('');
  }
  function cleanHomeEmpty(){const x=document.querySelector('#homeOpen .empty');if(x)x.textContent=x.textContent.replace(/🎉/g,'').trim()}
  function reconcile(){ensureShell();ensureHomeHead();renderTodayTimeline();cleanHomeEmpty()}
  const oldOpen=window.openView;if(typeof oldOpen==='function'&&!oldOpen.__v209){window.openView=function(){const r=oldOpen.apply(this,arguments);setTimeout(reconcile,0);return r};window.openView.__v209=true;try{openView=window.openView}catch(_){}}
  const oldHome=window.renderHome;if(typeof oldHome==='function'&&!oldHome.__v209){window.renderHome=function(){const r=oldHome.apply(this,arguments);setTimeout(reconcile,0);return r};window.renderHome.__v209=true;try{renderHome=window.renderHome}catch(_){}}
  const oldPlan=window.renderPlan;if(typeof oldPlan==='function'&&!oldPlan.__v209){window.renderPlan=function(){const r=oldPlan.apply(this,arguments);setTimeout(reconcile,0);return r};window.renderPlan.__v209=true;try{renderPlan=window.renderPlan}catch(_){}}
  window.addEventListener('resize',()=>setTimeout(reconcile,50));document.addEventListener('click',()=>setTimeout(reconcile,0),true);[0,250,800,1800].forEach(t=>setTimeout(reconcile,t));
})();
