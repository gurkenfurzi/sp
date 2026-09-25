
(function(){
  'use strict';
  if(window.__STUDIA_V216__)return;
  window.__STUDIA_V216__=true;
  const q=(s,r=document)=>r?.querySelector?.(s)||null;
  const qa=(s,r=document)=>r?.querySelectorAll?[...r.querySelectorAll(s)]:[];
  const esc216=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const aliases={
    PH:'PHYSIK',PHY:'PHYSIK',PHYS:'PHYSIK',PHYSIK:'PHYSIK','PH-FHR':'PHYSIK','PHY-FHR':'PHYSIK',
    BIO:'BIOLOGIE',BI:'BIOLOGIE',BIOLOGIE:'BIOLOGIE',
    GES:'GESCHICHTE',GE:'GESCHICHTE',G:'GESCHICHTE',GESCHICHTE:'GESCHICHTE',
    CH:'CHEMIE',CHE:'CHEMIE',CHEMIE:'CHEMIE',
    D:'DEUTSCH',DE:'DEUTSCH',DEUTSCH:'DEUTSCH',
    E:'ENGLISCH',ENG:'ENGLISCH',ENGLISCH:'ENGLISCH',
    M:'MATHEMATIK',MATHE:'MATHEMATIK',MATHEMATIK:'MATHEMATIK',
    ET:'ETHIK',ETHIK:'ETHIK',SP:'SPORT',SPO:'SPORT',SPORT:'SPORT',INF:'INFORMATIK',INFORMATIK:'INFORMATIK'
  };
  const referenceColors={MATHEMATIK:'#e9a7a4',DEUTSCH:'#e7c5a5',ENGLISCH:'#9fb8e3',BIOLOGIE:'#b6c99c',GESCHICHTE:'#e4c38a',CHEMIE:'#bea4d9',PHYSIK:'#aeb9df',ETHIK:'#d5aec6',SPORT:'#9dcdbd',INFORMATIK:'#a9bddb'};
  const palette=['#e9a7a4','#9fb8e3','#b6c99c','#e4c38a','#bea4d9','#e7c5a5','#aeb9df','#9dcdbd','#d5aec6'];
  let colorSaveTimer=0;

  function pretty216(v){
    let x=String(v||'').replace(/\s+/g,' ').trim();
    try{x=prettySubject(x)}catch(_){}
    return String(x||'').replace(/\s+/g,' ').trim();
  }
  function canon216(v){
    const x=pretty216(v).toUpperCase().replace(/\s+/g,' ').trim();
    return aliases[x]||x;
  }
  function referenceColor216(name){
    const k=canon216(name);if(referenceColors[k])return referenceColors[k];
    let h=0;for(const c of k)h=(h*31+c.charCodeAt(0))>>>0;return palette[h%palette.length]||'#e9a7a4';
  }
  function validHex(v){return /^#[0-9a-f]{6}$/i.test(String(v||''))}
  function toHex216(v){try{return colorToHex(v)}catch(_){return validHex(v)?String(v):'#e9a7a4'}}
  function mix216(color,white=.77){
    const h=toHex216(color).slice(1),n=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16));
    return '#'+n.map(v=>Math.round(v+(255-v)*white).toString(16).padStart(2,'0')).join('');
  }
  function sameSubject216(a,b){return !!canon216(a)&&canon216(a)===canon216(b)}
  function subjectRecord216(name){
    const k=canon216(name);return (data.subjects||[]).find(s=>canon216(s.name)===k||canon216(s.abbr)===k)||null;
  }
  function storedColor216(name){
    data.timetableSubjectColors ||= {};
    const wanted=canon216(name);
    for(const [k,v] of Object.entries(data.timetableSubjectColors))if(canon216(k)===wanted&&validHex(v))return String(v).toLowerCase();
    const rec=subjectRecord216(name);if(rec?.color)return toHex216(rec.color).toLowerCase();
    return referenceColor216(name);
  }
  function writeColor216(name,color,persist=true){
    color=String(color||'').toLowerCase();if(!validHex(color))return;
    const canon=canon216(name);if(!canon)return;
    data.timetableSubjectColors ||= {};
    data.timetableSubjectColors[canon]=color;
    try{const originalKey=timetableSubjectKey(name);if(originalKey)data.timetableSubjectColors[originalKey]=color}catch(_){}
    const rec=subjectRecord216(name);
    if(rec){
      rec.color=color;
      /* Keep an already user-customized cover; only generate one for timetable-created folders. */
      if(rec.autoFromTimetable)rec.cover=mix216(color,.62);
      try{data.timetableSubjectColors[canon216(rec.name)]=color}catch(_){}
      if(rec.abbr)try{data.timetableSubjectColors[canon216(rec.abbr)]=color}catch(_){}
    }
    paintAllSubjectColors216();
    if(persist){
      clearTimeout(colorSaveTimer);colorSaveTimer=setTimeout(()=>{
        try{save()}catch(_){try{localStorage.setItem(KEY,JSON.stringify(data))}catch(__){}}
        try{renderPlan()}catch(_){};try{renderHome()}catch(_){};try{if(q('#view-subjects.active'))renderSubjects()}catch(_){}
        setTimeout(paintAllSubjectColors216,0);
      },80);
    }
  }
  window.v216SetSubjectColor=(name,color)=>writeColor216(name,color,true);

  function paintSubjectFolders216(){
    qa('#view-subjects .v102Notebook').forEach(card=>{
      const sid=card.dataset.subjectId;const rec=(data.subjects||[]).find(s=>String(s.id)===String(sid))||subjectRecord216(card.querySelector('strong')?.textContent||'');
      if(!rec)return;const c=storedColor216(rec.name);card.dataset.v212Subject='1';card.style.setProperty('--v212-card',c);card.style.setProperty('--ring',c);card.style.setProperty('--pin',c);
    });
  }
  function paintToday216(){
    /* Direct colors avoid old hard-coded pink/green/blue classes winning on laptop. */
    qa('#v209TodayTimeline .v209TodayCard').forEach(card=>{
      const name=card.querySelector('.v209TodayTitle')?.textContent||'';if(!name)return;const c=storedColor216(name);
      card.style.setProperty('--lesson-color',c);
      card.style.setProperty('background',mix216(c,.76),'important');
      card.style.setProperty('border-color',mix216(c,.58),'important');
      const ic=card.querySelector('.v209TodayIcon');if(ic)ic.style.setProperty('color',c,'important');
      const right=card.querySelector('.v209TodayRoom');if(right&&/doppelstunde/i.test(right.textContent||''))right.textContent='';
    });
    qa('#todayLessons .lesson.lessonClickable').forEach(card=>{
      const name=card.querySelector('.subject')?.textContent||'';if(!name)return;const c=storedColor216(name);card.style.setProperty('--subject',c);
    });
    const panel=q('#nextPanel');if(panel){
      const full=String(panel.textContent||'').replace(/\s+/g,' ').trim();
      const m=full.match(/(?:Nächste Stunde:\s*)?([^·]+?)(?:\s+in\s+\d+|\s+\d{1,2}:\d{2}\s*Uhr|$)/i);
      let name=(q('#nextPanel [style*="font-size:27px"]')?.textContent||m?.[1]||'').replace(/^Nächste Stunde:\s*/i,'').trim();
      if(name&&!/kein weiterer unterricht|pause|noch\s+\d/i.test(name)){const c=storedColor216(name);panel.style.setProperty('background',`linear-gradient(135deg,${mix216(c,.70)},#fffaf8 76%)`,'important');panel.style.setProperty('border-color',mix216(c,.53),'important')}
    }
  }
  function paintPlan216(){
    qa('#view-plan .v210Lesson').forEach(card=>{
      const name=card.querySelector('.v210LessonTitle')?.textContent||'';if(name)card.style.setProperty('--lesson-color',storedColor216(name));
      /* Anything much taller than one 45-minute block is a multi-hour card. */
      const h=parseFloat(card.style.height)||card.getBoundingClientRect().height||0;
      card.classList.toggle('v216LongLesson',h>=78);
      qa('.v210LessonMeta',card).forEach(meta=>{if(/^doppelstunde$/i.test((meta.textContent||'').trim()))meta.remove()});
    });
    qa('#view-plan .doubleBadge').forEach(b=>{if(/doppelstunde/i.test(b.textContent||''))b.remove()});
  }
  function syncColorInputs216(){
    qa('#v210SubjectColors .v210ColorRow').forEach(row=>{
      const name=(row.querySelector('span')?.textContent||'').trim(),input=row.querySelector('input[type="color"]');if(!name||!input)return;
      const wanted=storedColor216(name);if(document.activeElement!==input&&input.value.toLowerCase()!==wanted)input.value=wanted;
      input.dataset.v216Subject=name;
    });
  }
  function paintAllSubjectColors216(){paintSubjectFolders216();paintToday216();paintPlan216();syncColorInputs216()}

  /* Capture the desktop color control so the selection is really saved and shared everywhere. */
  document.addEventListener('input',e=>{
    const input=e.target?.closest?.('#v210SubjectColors input[type="color"]');if(!input)return;
    const name=input.dataset.v216Subject||input.closest('.v210ColorRow')?.querySelector('span')?.textContent||'';
    writeColor216(name,input.value,false);
  },true);
  document.addEventListener('change',e=>{
    const input=e.target?.closest?.('#v210SubjectColors input[type="color"]');if(!input)return;
    const name=input.dataset.v216Subject||input.closest('.v210ColorRow')?.querySelector('span')?.textContent||'';
    e.stopImmediatePropagation();writeColor216(name,input.value,true);
  },true);

  /* Remove the old 'Doppelstunde' label synchronously from generated laptop plan HTML. */
  const desktopPlanBefore216=window.renderDesktopWeekPlan;
  if(typeof desktopPlanBefore216==='function'&&!desktopPlanBefore216.__v216Clean){
    const cleanPlan=function(){
      let html=desktopPlanBefore216.apply(this,arguments);
      if(typeof html==='string')html=html.replace(/<span class=\"v210LessonMeta\">Doppelstunde<\/span>/gi,'').replace(/<div class=\"doubleBadge[^\"]*\">[^<]*Doppelstunde[^<]*<\/div>/gi,'');
      return html;
    };
    cleanPlan.__v216Clean=true;window.renderDesktopWeekPlan=cleanPlan;try{renderDesktopWeekPlan=cleanPlan}catch(_){}
  }

  /* ---- Strong basis-plan recovery: Mittwoch period 1+2 Physik is one 08:00–09:30 block. ---- */
  const basisBefore216=window.basisScheduleForClass||((typeof basisScheduleForClass==='function')?basisScheduleForClass:null);
  function min216(t){const m=String(t||'').match(/(\d{1,2}):(\d{2})/);return m?+m[1]*60 + +m[2]:0}
  function physics216(l){
    let parts=[l?.raw||''];try{const p=splitCell(l?.raw||'');parts.push(p.subject||'',pretty216(p.subject||''),p.meta||'')}catch(_){}
    const t=parts.join(' ').toUpperCase().replace(/[_]+/g,' ').replace(/\s+/g,' ');
    return /(^|[^A-ZÄÖÜ])PH(?:Y|YS|YSI|YSIK)?(?:\s*[- ]?\s*FHR)?(?=$|[^A-ZÄÖÜ])/.test(t)||t.includes('PHYSIK');
  }
  function weak216(l){
    if(!l||!String(l.raw||'').trim())return true;
    try{const p=splitCell(l.raw||'');const s=canon216(p.subject||'');return !s||s==='UNTERRICHT'}catch(_){return true}
  }
  function repairPhysics216(list){
    const out=(list||[]).map(x=>({...x}));
    const wed=out.filter(x=>(String(x.day||'').toLowerCase()==='mi'||String(x.day||'').toLowerCase().startsWith('mitt'))&&!x.specialOnly&&!x.cancelledFromBasis);
    const early=wed.filter(x=>Number(x.rowNum)===1||Number(x.rowNum)===2||[480,525].includes(min216(x.start))||((min216(x.start)<570)&&(min216(x.end)>480)));
    const phys=early.find(physics216);if(!phys)return out;
    const r1=early.find(x=>Number(x.rowNum)===1||min216(x.start)===480);
    const r2=early.find(x=>x!==r1&&(Number(x.rowNum)===2||min216(x.start)===525));
    /* The PHS PDF sometimes puts the merged-cell text only into row 2. Absorb only
       the same physics cell or parser fragments, never a genuine different subject. */
    for(const other of [r1,r2]){
      if(!other||other===phys)continue;
      if(physics216(other)||weak216(other)){const i=out.indexOf(other);if(i>=0)out.splice(i,1)}
    }
    phys.day='Mi';phys.start='08:00';phys.end='09:30';phys.rowNum=1;phys.blocks=2;phys.isDouble=true;phys.recoveredBasisDouble=true;phys.recoveredBasisDoubleV216=true;
    return out;
  }
  if(typeof basisBefore216==='function'){
    const wrapped=function(name){return repairPhysics216(basisBefore216.call(this,name)||[])};
    wrapped.__v216BasisPhysics=true;window.basisScheduleForClass=wrapped;try{basisScheduleForClass=wrapped}catch(_){}
  }

  /* ---- Lernen/Bearbeiten: the old read-only guard must not trap the user. ---- */
  function untrapLearningMode216(){
    qa('.v214LearnModeSwitch button').forEach(btn=>{
      const text=(btn.textContent||'').replace(/\u200b/g,'').trim();
      if(text==='Bearbeiten'){
        /* V214 has an older capture guard matching the exact text "Bearbeiten".
           A zero-width separator keeps the visible label identical but avoids trapping the switch. */
        if(!btn.textContent.includes('\u200b'))btn.textContent='Bearbe\u200biten';
        btn.classList.add('v216EditMode');btn.setAttribute('aria-label','Bearbeiten');btn.title='Bearbeiten';
      }
    });
  }
  const modeSet216=mode=>{
    try{window.v214SetLearningMode?.(mode)}catch(_){document.body.classList.toggle('v214LearningReadOnly',mode!=='edit')}
    document.body.classList.toggle('v214LearningReadOnly',mode!=='edit');
    try{if(q('#view-deck-detail.active'))renderDeckDetail()}catch(_){}
    try{if(q('#view-learnsets.active'))renderLearnsetsLists()}catch(_){}
    setTimeout(untrapLearningMode216,0);
  };
  window.v216SetLearningMode=modeSet216;
  /* Rebind both generated switches with a non-trappable visible label. */
  function bindModeSwitches216(){
    qa('.v214LearnModeSwitch').forEach(sw=>{
      const buttons=qa('button',sw);if(buttons.length<2)return;
      const learn=buttons.find(b=>(b.textContent||'').replace(/\u200b/g,'').trim()==='Lernen');
      const edit=buttons.find(b=>(b.textContent||'').replace(/\u200b/g,'').trim()==='Bearbeiten');
      if(learn){learn.onclick=e=>{e.preventDefault();e.stopPropagation();modeSet216('learn')}}
      if(edit){if(edit.textContent!=='Bearbe\u200biten')edit.textContent='Bearbe\u200biten';edit.setAttribute('aria-label','Bearbeiten');edit.title='Bearbeiten';edit.onclick=e=>{e.preventDefault();e.stopPropagation();modeSet216('edit')}}
    });
  }

  /* ---- Mobile canvas Mehrfachauswahl: keep selection mode and intercept taps before legacy single-select logic. ---- */
  const baseToggleMulti216=window.toggleMultiSelectMode;
  if(typeof baseToggleMulti216==='function'){
    window.toggleMultiSelectMode=function(){const r=baseToggleMulti216.apply(this,arguments);try{document.body.classList.toggle('v216MobileMulti',innerWidth<900&&!!canvasState.multiMode);updateMobileSelectionTools?.();updateMultiSelectStatus?.()}catch(_){};return r};
    try{toggleMultiSelectMode=window.toggleMultiSelectMode}catch(_){}
  }
  document.addEventListener('pointerdown',e=>{
    if(innerWidth>=900||!document.body.classList.contains('editorMode'))return;
    let st=null;try{st=canvasState}catch(_){st=window.canvasState}if(!st?.multiMode)return;
    const target=e.target instanceof Element?e.target:null;if(!target||target.closest('button,input,textarea,select,.resizeHandle,.rotateHandle,.tableMoveHandle,td,[contenteditable="true"].editing'))return;
    const obj=target.closest('#canvasObjects .cobj[data-id]');
    if(obj){e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();try{toggleObjectInMultiSelection(obj.dataset.id)}catch(_){};document.body.classList.add('v216MobileMulti');return}
    const vec=target.closest('#canvasObjects [data-vid]');
    if(vec?.dataset.vid){e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();try{toggleVectorInMultiSelection(vec.dataset.vid)}catch(_){};document.body.classList.add('v216MobileMulti')}
  },true);

  /* ---- Homework / tests: edit existing entries and show a due countdown for homework too. ---- */
  window.openEditHomework=function(hid){
    const x=(data.homework||[]).find(v=>String(v.id)===String(hid));if(!x)return;
    openModal(`<h2>Hausaufgabe bearbeiten</h2><div class="formGrid"><div><label>Fach</label><select id="v216HwSubject">${subjectOptions()}</select></div><div><label>Fällig</label><input id="v216HwDue" type="date" value="${esc216(x.due||todayISO())}"></div><div class="full"><label>Aufgabe</label><textarea id="v216HwText">${esc216(x.text||'')}</textarea></div><div class="full"><label>Notiz</label><input id="v216HwNote" value="${esc216(x.note||'')}"></div><div class="full"><label>Weitere Fotos / Dateien</label><input id="v216HwFiles" type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx"></div></div><button class="primary" style="margin-top:12px" onclick="saveHomeworkEdit('${esc216(x.id)}')">Änderungen speichern</button>`);
    const sel=q('#v216HwSubject');if(sel)sel.value=x.subject||'';
  };
  window.saveHomeworkEdit=async function(hid){
    const x=(data.homework||[]).find(v=>String(v.id)===String(hid));if(!x)return;
    const text=(q('#v216HwText')?.value||'').trim();if(!text)return alert('Bitte eine Aufgabe eintragen.');
    x.subject=q('#v216HwSubject')?.value||x.subject;x.due=q('#v216HwDue')?.value||x.due;x.text=text;x.note=(q('#v216HwNote')?.value||'').trim();
    try{await storeEntityFiles(x,q('#v216HwFiles')?.files||[])}catch(err){console.warn('Datei konnte nicht ergänzt werden',err)}
    save();closeModal();try{renderTasks()}catch(_){};try{renderHome()}catch(_){};
  };
  window.openEditTest=function(tid){
    const x=(data.tests||[]).find(v=>String(v.id)===String(tid));if(!x)return;
    openModal(`<h2>Test bearbeiten</h2><div class="formGrid"><div><label>Fach</label><select id="v216TestSubject">${subjectOptions()}</select></div><div><label>Datum</label><input id="v216TestDate" type="date" value="${esc216(x.date||todayISO())}"></div><div><label>Art</label><select id="v216TestType"><option>Test</option><option>Klassenarbeit</option><option>Präsentation</option><option>Prüfung</option></select></div><div><label>Erinnerung</label><select id="v216TestReminder"><option value="1">1 Tag vorher</option><option value="3">3 Tage vorher</option><option value="7">7 Tage vorher</option></select></div><div class="full"><label>Beschreibung / Themen</label><textarea id="v216TestText">${esc216(x.text||'')}</textarea></div><div class="full"><label>Weitere Fotos / Dateien</label><input id="v216TestFiles" type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx"></div></div><button class="primary" style="margin-top:12px" onclick="saveTestEdit('${esc216(x.id)}')">Änderungen speichern</button>`);
    const s=q('#v216TestSubject');if(s)s.value=x.subject||'';const t=q('#v216TestType');if(t)t.value=x.type||'Test';const r=q('#v216TestReminder');if(r)r.value=String(x.reminder||1);
  };
  window.saveTestEdit=async function(tid){
    const x=(data.tests||[]).find(v=>String(v.id)===String(tid));if(!x)return;
    x.subject=q('#v216TestSubject')?.value||x.subject;x.date=q('#v216TestDate')?.value||x.date;x.type=q('#v216TestType')?.value||x.type;x.reminder=Number(q('#v216TestReminder')?.value||x.reminder||1);x.text=(q('#v216TestText')?.value||'').trim();
    try{await storeEntityFiles(x,q('#v216TestFiles')?.files||[])}catch(err){console.warn('Datei konnte nicht ergänzt werden',err)}
    save();closeModal();try{renderTasks()}catch(_){};try{renderHome()}catch(_){};
  };

  const renderTasksBefore216=window.renderTasks||((typeof renderTasks==='function')?renderTasks:null);
  function renderTasks216(){
    try{q('[data-taskfilter].active')?.classList.remove('active');q(`[data-taskfilter="${taskFilter}"]`)?.classList.add('active');qa('[data-taskfilter]').forEach(b=>b.onclick=()=>{taskFilter=b.dataset.taskfilter;renderTasks216()})}catch(_){}
    const hw=(data.homework||[]).filter(x=>taskFilter==='all'||(taskFilter==='open'?!x.done:x.done)).sort((a,b)=>String(a.due||'').localeCompare(String(b.due||'')));
    const hwRoot=q('#homeworkList');if(hwRoot)hwRoot.innerHTML=hw.length?hw.map(x=>{const left=daysUntilLabel(x.due);return `<div class="card row"><button class="checkbox ${x.done?'done':''}" onclick="toggleHomework('${esc216(x.id)}')">${x.done?'✓':''}</button><div style="flex:1"><b class="${x.done?'doneText':''}">${esc216(x.subject)} · ${esc216(x.text)}</b><div class="small">Fällig ${esc216(fmtDate(x.due))}${left?` · <span class="v216DueCountdown">${esc216(left)}</span>`:''}${x.note?' · '+esc216(x.note):''}</div>${fileChips(x.files)}</div><div class="v216ItemActions"><button class="ghost v216EditBtn" onclick="openEditHomework('${esc216(x.id)}')">Bearbeiten</button><button class="dangerBtn" onclick="deleteHomework('${esc216(x.id)}')">×</button></div></div>`}).join(''):'<div class="empty">Keine Aufgaben.</div>';
    const tests=[...(data.tests||[])].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));const testRoot=q('#testList');if(testRoot)testRoot.innerHTML=tests.length?tests.map(x=>{const days=calendarDaysUntil(x.date),left=daysUntilLabel(x.date);return `<div class="card rowBetween"><div><b>${esc216(x.subject)} · ${esc216(x.type)}</b><div class="small">${esc216(fmtDate(x.date))}${left?` · ${esc216(left)}`:''}${x.text?' · '+esc216(x.text):''}${Number(x.reminder)>0?` · Erinnerung ${Number(x.reminder)} T vorher`:''}</div>${fileChips(x.files)}</div><div class="v216ItemActions"><span class="badge ${days!=null&&days>=0?'warn':''}">${esc216(left||'–')}</span><button class="ghost v216EditBtn" onclick="openEditTest('${esc216(x.id)}')">Bearbeiten</button><button class="dangerBtn" onclick="deleteTest('${esc216(x.id)}')">×</button></div></div>`}).join(''):'<div class="empty">Noch keine Tests eingetragen.</div>';
  }
  if(typeof renderTasksBefore216==='function'){
    window.renderTasks=renderTasks216;try{renderTasks=renderTasks216}catch(_){}
  }
  function decorateHomeCountdowns216(){
    const items=[...(data.homework||[]).filter(x=>!x.done).map(x=>({kind:'hw',date:x.due,id:x.id})),...(data.tests||[]).filter(x=>x.date>=todayISO()).map(x=>({kind:'test',date:x.date,id:x.id}))].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))).slice(0,5);
    const cards=qa('#homeOpen .card');cards.forEach((card,i)=>{const item=items[i];if(!item)return;const small=card.querySelector('.small');if(item.kind==='hw'&&small&&!small.dataset.v216Countdown){const left=daysUntilLabel(item.date);if(left){small.insertAdjacentHTML('beforeend',` · <span class="v216DueCountdown">${esc216(left)}</span>`)}small.dataset.v216Countdown='1'}if(!card.querySelector('.v216HomeEdit')){const b=document.createElement('button');b.className='ghost v216EditBtn v216HomeEdit';b.textContent='Bearbeiten';b.onclick=e=>{e.preventDefault();e.stopPropagation();item.kind==='hw'?openEditHomework(item.id):openEditTest(item.id)};card.appendChild(b)}});
  }
  const renderHomeBefore216=window.renderHome||((typeof renderHome==='function')?renderHome:null);
  if(typeof renderHomeBefore216==='function'){
    const wrapped=function(){const r=renderHomeBefore216.apply(this,arguments);setTimeout(()=>{decorateHomeCountdowns216();paintToday216()},0);return r};wrapped.__v216=true;window.renderHome=wrapped;try{renderHome=wrapped}catch(_){}
  }

  /* ---- Laptop editor: restore sheet/topic context first, then open the existing editor directly. ---- */
  function clearEditorLocks216(){
    document.body.classList.remove('v184PreviewOpen','v137ViewMode');
    const view=q('#view-sheet-editor');if(view){try{view.inert=false}catch(_){}view.removeAttribute('inert');view.removeAttribute('aria-hidden');view.style.pointerEvents='auto'}
    q('#v181Preview')?.classList.remove('open');
  }
  function restoreEditorContext216(sheetId){
    let sh=null;if(sheetId)sh=(data.studySheets||[]).find(x=>String(x.id)===String(sheetId))||null;
    if(sh){
      let s=(data.subjects||[]).find(x=>String(x.name)===String(sh.subject));
      if(!s&&sh.topicId)s=(data.subjects||[]).find(x=>(x.topics||[]).some(t=>String(t.id)===String(sh.topicId)));
      if(s){selectedSubjectId=s.id;const t=(s.topics||[]).find(t=>String(t.id)===String(sh.topicId));if(t)selectedTopicId=t.id}
    }
    try{const cur=currentTopic();if(cur?.s&&cur?.t)return true}catch(_){}
    const byIds=(data.subjects||[]).find(s=>String(s.id)===String(selectedSubjectId));if(byIds?.topics?.length){selectedTopicId=byIds.topics[0].id;return true}
    const first=(data.subjects||[]).find(s=>(s.topics||[]).length);if(first){selectedSubjectId=first.id;selectedTopicId=first.topics[0].id;return true}
    return false;
  }
  window.openStudySheetEditor=function(sheetId=null){
    clearEditorLocks216();
    if(sheetId!=null)selectedSheetId=sheetId;else selectedSheetId=null;
    if(!restoreEditorContext216(sheetId)){
      alert('Erstelle oder öffne zuerst ein Thema unter Fächer, damit das Lernblatt dort gespeichert werden kann.');
      try{openView('subjects')}catch(_){};return;
    }
    try{if(q('#modalWrap.open'))closeModal()}catch(_){}
    try{openView('sheet-editor')}catch(err){console.error('Studia V216 editor open',err)}
    requestAnimationFrame(()=>{
      clearEditorLocks216();document.body.classList.add('editorMode');
      const view=q('#view-sheet-editor');if(view){qa('.view').forEach(v=>v.classList.remove('active'));view.classList.add('active')}
      try{renderSheetEditor()}catch(err){console.error('Studia V216 editor render',err)}
      setTimeout(()=>{try{fitCanvasStage?.();ensureDesktopEditorRail?.()}catch(_){}},80);
    });
  };
  try{openStudySheetEditor=window.openStudySheetEditor}catch(_){}

  /* ---- Keep all generated UI fixed after normal app rerenders. ---- */
  function removeSidebarCreature216(){const icon=q('#v210Sidebar .brandIcon');if(icon)icon.remove()}
  function reconcile216(){removeSidebarCreature216();untrapLearningMode216();bindModeSwitches216();paintAllSubjectColors216();decorateHomeCountdowns216();try{document.body.classList.toggle('v216MobileMulti',innerWidth<900&&!!canvasState?.multiMode)}catch(_){}}
  const obs=new MutationObserver(()=>{clearTimeout(window.__v216ReconTimer);window.__v216ReconTimer=setTimeout(reconcile216,0)});obs.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',()=>setTimeout(reconcile216,50));
  document.addEventListener('click',()=>setTimeout(reconcile216,0),false);
  [0,80,250,700,1500].forEach(t=>setTimeout(reconcile216,t));
  try{const e=q('#headerEyebrow');if(e)e.textContent='VERSION 216'}catch(_){}
})();
