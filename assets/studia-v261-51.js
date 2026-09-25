
(function(){
  'use strict';
  if(window.__STUDIA_V217__)return;
  window.__STUDIA_V217__=true;
  const q=(s,r=document)=>r?.querySelector?.(s)||null;
  const qa=(s,r=document)=>r?.querySelectorAll?[...r.querySelectorAll(s)]:[];
  const html=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const jsArg=v=>JSON.stringify(String(v==null?'':v)).replace(/&/g,'&amp;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');

  /* ---------- Desktop Studia wordmark ---------- */
  function removeSidebarMascot217(){
    qa('#v210Sidebar .brandIcon').forEach(x=>x.remove());
  }

  /* ---------- Correct subject colors on laptop Today ---------- */
  function asHex217(c){
    try{return colorToHex(c)}catch(_){return /^#[0-9a-f]{6}$/i.test(String(c||''))?String(c):'#e9a7a4'}
  }
  function mixWhite217(c,ratio=.76){
    const h=asHex217(c).replace('#','');
    const rgb=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16));
    return '#'+rgb.map(v=>Math.round(v+(255-v)*ratio).toString(16).padStart(2,'0')).join('');
  }
  function subjectColor217(name){
    try{return timetableSubjectColor(name)}catch(_){}
    const n=String(name||'').trim().toUpperCase();
    const s=(data.subjects||[]).find(x=>String(x.name||'').trim().toUpperCase()===n||String(x.abbr||'').trim().toUpperCase()===n);
    return s?.color||'#e9a7a4';
  }
  function paintToday217(){
    if(innerWidth<900)return;
    qa('#v209TodayTimeline .v209TodayCard').forEach(card=>{
      const name=(card.querySelector('.v209TodayTitle')?.textContent||'').trim();
      if(!name)return;
      const c=asHex217(subjectColor217(name));
      card.classList.remove('pink','green','blue','gold','purple','peach');
      card.style.setProperty('--lesson-color',c);
      card.style.setProperty('background',mixWhite217(c,.76),'important');
      card.style.setProperty('border-color',mixWhite217(c,.54),'important');
      const icon=card.querySelector('.v209TodayIcon');if(icon)icon.style.setProperty('color',c,'important');
      const room=card.querySelector('.v209TodayRoom');if(room&&/doppelstunde/i.test(room.textContent||''))room.textContent='';
    });
    qa('#todayLessons .lesson.lessonClickable').forEach(card=>{
      const name=(card.querySelector('.subject')?.textContent||'').trim();
      if(name)card.style.setProperty('--subject',asHex217(subjectColor217(name)));
    });
  }

  /* ---------- Homework + tests: edit and reliable countdown ---------- */
  function countdown217(date){
    try{return daysUntilLabel(date)||''}catch(_){return''}
  }
  window.openEditHomework=function(hid){
    const x=(data.homework||[]).find(v=>String(v.id)===String(hid));if(!x)return;
    openModal(`<h2>Hausaufgabe bearbeiten</h2><div class="formGrid">
      <div><label>Fach</label><select id="v217HwSubject">${subjectOptions()}</select></div>
      <div><label>Fällig</label><input id="v217HwDue" type="date" value="${html(x.due||todayISO())}"></div>
      <div class="full"><label>Aufgabe</label><textarea id="v217HwText">${html(x.text||'')}</textarea></div>
      <div class="full"><label>Notiz</label><input id="v217HwNote" value="${html(x.note||'')}"></div>
      <div class="full"><label>Weitere Fotos / Dateien</label><input id="v217HwFiles" type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx"></div>
    </div><button type="button" class="primary" style="margin-top:12px" onclick="saveHomeworkEdit(${jsArg(x.id)})">Änderungen speichern</button>`);
    const s=q('#v217HwSubject');if(s)s.value=x.subject||'';
  };
  window.saveHomeworkEdit=async function(hid){
    const x=(data.homework||[]).find(v=>String(v.id)===String(hid));if(!x)return;
    const text=(q('#v217HwText')?.value||'').trim();if(!text)return alert('Bitte eine Aufgabe eintragen.');
    x.subject=q('#v217HwSubject')?.value||x.subject;
    x.due=q('#v217HwDue')?.value||x.due;
    x.text=text;x.note=(q('#v217HwNote')?.value||'').trim();
    try{await storeEntityFiles(x,q('#v217HwFiles')?.files||[])}catch(err){console.warn('Studia: Datei konnte nicht ergänzt werden',err)}
    try{save()}catch(err){console.error(err);return alert('Die Änderung konnte nicht gespeichert werden.');}
    closeModal();try{renderTasks()}catch(_){};try{renderHome()}catch(_){};
  };
  window.openEditTest=function(tid){
    const x=(data.tests||[]).find(v=>String(v.id)===String(tid));if(!x)return;
    openModal(`<h2>Test bearbeiten</h2><div class="formGrid">
      <div><label>Fach</label><select id="v217TestSubject">${subjectOptions()}</select></div>
      <div><label>Datum</label><input id="v217TestDate" type="date" value="${html(x.date||todayISO())}"></div>
      <div><label>Art</label><select id="v217TestType"><option>Test</option><option>Klassenarbeit</option><option>Präsentation</option><option>Prüfung</option></select></div>
      <div><label>Erinnerung</label><select id="v217TestReminder"><option value="1">1 Tag vorher</option><option value="3">3 Tage vorher</option><option value="7">7 Tage vorher</option></select></div>
      <div class="full"><label>Beschreibung / Themen</label><textarea id="v217TestText">${html(x.text||'')}</textarea></div>
      <div class="full"><label>Weitere Fotos / Dateien</label><input id="v217TestFiles" type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx"></div>
    </div><button type="button" class="primary" style="margin-top:12px" onclick="saveTestEdit(${jsArg(x.id)})">Änderungen speichern</button>`);
    const s=q('#v217TestSubject');if(s)s.value=x.subject||'';
    const t=q('#v217TestType');if(t)t.value=x.type||'Test';
    const r=q('#v217TestReminder');if(r)r.value=String(x.reminder||1);
  };
  window.saveTestEdit=async function(tid){
    const x=(data.tests||[]).find(v=>String(v.id)===String(tid));if(!x)return;
    x.subject=q('#v217TestSubject')?.value||x.subject;
    x.date=q('#v217TestDate')?.value||x.date;
    x.type=q('#v217TestType')?.value||x.type;
    x.reminder=Number(q('#v217TestReminder')?.value||x.reminder||1);
    x.text=(q('#v217TestText')?.value||'').trim();
    try{await storeEntityFiles(x,q('#v217TestFiles')?.files||[])}catch(err){console.warn('Studia: Datei konnte nicht ergänzt werden',err)}
    try{save()}catch(err){console.error(err);return alert('Die Änderung konnte nicht gespeichert werden.');}
    closeModal();try{renderTasks()}catch(_){};try{renderHome()}catch(_){};
  };

  function renderTasks217(){
    try{q('[data-taskfilter].active')?.classList.remove('active');q(`[data-taskfilter="${taskFilter}"]`)?.classList.add('active')}catch(_){}
    qa('[data-taskfilter]').forEach(b=>b.onclick=()=>{taskFilter=b.dataset.taskfilter;renderTasks217()});
    const hw=(data.homework||[]).filter(x=>taskFilter==='all'||(taskFilter==='open'?!x.done:x.done)).sort((a,b)=>String(a.due||'').localeCompare(String(b.due||'')));
    const hroot=q('#homeworkList');
    if(hroot)hroot.innerHTML=hw.length?hw.map(x=>{
      const left=countdown217(x.due);
      return `<div class="card row"><button class="checkbox ${x.done?'done':''}" onclick="toggleHomework(${jsArg(x.id)})">${x.done?'✓':''}</button><div style="flex:1"><b class="${x.done?'doneText':''}">${html(x.subject)} · ${html(x.text)}</b><div class="small">Fällig ${html(fmtDate(x.due))}${left?` · <span class="v217Countdown">${html(left)}</span>`:''}${x.note?' · '+html(x.note):''}</div>${fileChips(x.files)}</div><div class="v217ItemActions"><button type="button" class="ghost v217EditBtn" onclick="openEditHomework(${jsArg(x.id)})">Bearbeiten</button><button class="dangerBtn" onclick="deleteHomework(${jsArg(x.id)})">×</button></div></div>`;
    }).join(''):'<div class="empty">Keine Aufgaben.</div>';
    const tests=[...(data.tests||[])].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
    const troot=q('#testList');
    if(troot)troot.innerHTML=tests.length?tests.map(x=>{
      const left=countdown217(x.date);let days=null;try{days=calendarDaysUntil(x.date)}catch(_){}
      return `<div class="card rowBetween"><div><b>${html(x.subject)} · ${html(x.type)}</b><div class="small">${html(fmtDate(x.date))}${left?` · ${html(left)}`:''}${x.text?' · '+html(x.text):''}${Number(x.reminder)>0?` · Erinnerung ${Number(x.reminder)} T vorher`:''}</div>${fileChips(x.files)}</div><div class="v217ItemActions"><span class="badge ${days!=null&&days>=0?'warn':''}">${html(left||'–')}</span><button type="button" class="ghost v217EditBtn" onclick="openEditTest(${jsArg(x.id)})">Bearbeiten</button><button class="dangerBtn" onclick="deleteTest(${jsArg(x.id)})">×</button></div></div>`;
    }).join(''):'<div class="empty">Noch keine Tests eingetragen.</div>';
  }
  window.renderTasks=renderTasks217;try{renderTasks=renderTasks217}catch(_){}

  function decorateHome217(){
    const root=q('#homeOpen');if(!root)return;
    const items=[
      ...(data.homework||[]).filter(x=>!x.done).map(x=>({kind:'hw',date:x.due,subject:x.subject,text:x.text,id:x.id})),
      ...(data.tests||[]).filter(x=>x.date>=todayISO()).map(x=>({kind:'test',date:x.date,subject:x.subject,text:x.type,id:x.id}))
    ].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))).slice(0,5);
    const cards=qa(':scope > .card',root);
    cards.forEach((card,i)=>{
      const item=items[i];if(!item)return;
      const small=card.querySelector('.small');
      if(item.kind==='hw'&&small&&!small.querySelector('.v217Countdown')){
        const left=countdown217(item.date);if(left)small.insertAdjacentHTML('beforeend',` · <span class="v217Countdown">${html(left)}</span>`);
      }
      if(!card.querySelector('.v217HomeEdit')){
        const b=document.createElement('button');b.type='button';b.className='ghost v217EditBtn v217HomeEdit';b.textContent='Bearbeiten';
        b.onclick=e=>{e.preventDefault();e.stopPropagation();item.kind==='hw'?openEditHomework(item.id):openEditTest(item.id)};
        card.appendChild(b);
      }
    });
  }
  const homeBefore217=window.renderHome||((typeof renderHome==='function')?renderHome:null);
  if(typeof homeBefore217==='function'&&!homeBefore217.__v217){
    const wrapped=function(){const r=homeBefore217.apply(this,arguments);setTimeout(()=>{decorateHome217();paintToday217()},30);return r};
    wrapped.__v217=true;window.renderHome=wrapped;try{renderHome=wrapped}catch(_){}
  }

  /* ---------- Karteikarten: learning/edit mode cannot trap the user ---------- */
  function setLearnMode217(mode){
    const edit=mode==='edit';
    try{window.v214SetLearningMode?.(edit?'edit':'learn')}catch(_){}
    document.body.classList.toggle('v214LearningReadOnly',!edit);
    try{if(q('#view-deck-detail.active'))renderDeckDetail()}catch(_){}
    try{if(q('#view-learnsets.active'))renderLearnsetsLists()}catch(_){}
    setTimeout(()=>{ensureLearningSwitch217();ensureDeckSwitch217()},0);
  }
  window.v217SetLearnMode=setLearnMode217;
  window.v215SetDeckMode=setLearnMode217;
  window.v216SetLearningMode=setLearnMode217;

  function safeEditLabel217(){return 'Bearbe\u200biten'}
  function ensureLearningSwitch217(){
    qa('.v214LearnModeSwitch').forEach(sw=>{
      const bs=qa('button',sw);if(bs.length<2)return;
      const learn=bs.find(b=>(b.textContent||'').replace(/\u200b/g,'').trim()==='Lernen');
      const edit=bs.find(b=>(b.textContent||'').replace(/\u200b/g,'').trim()==='Bearbeiten');
      if(learn){learn.type='button';learn.onclick=e=>{e.preventDefault();e.stopPropagation();setLearnMode217('learn')}}
      if(edit){edit.type='button';edit.textContent=safeEditLabel217();edit.title='Bearbeiten';edit.setAttribute('aria-label','Bearbeiten');edit.onclick=e=>{e.preventDefault();e.stopPropagation();setLearnMode217('edit')}}
    });
  }
  function ensureDeckSwitch217(){
    const view=q('#view-deck-detail');if(!view)return;
    const head=q(':scope > .sectionHead',view);if(!head)return;
    let sw=q('.v217DeckModeSwitch',head)||q('.v215DeckModeSwitch',head);
    if(!sw){sw=document.createElement('div');sw.className='v217DeckModeSwitch';head.insertBefore(sw,q('#addCardToDeckBtn',head)||null)}else sw.classList.add('v217DeckModeSwitch');
    const readOnly=document.body.classList.contains('v214LearningReadOnly');
    sw.innerHTML=`<button type="button" class="${readOnly?'active':''}" onclick="v217SetLearnMode('learn')">Lernen</button><button type="button" class="${readOnly?'':'active'}" onclick="v217SetLearnMode('edit')">${safeEditLabel217()}</button>`;
    const add=q('#addCardToDeckBtn',view);
    if(add){add.type='button';const did=(()=>{try{return selectedDeckId}catch(_){return window.selectedDeckId}})();add.onclick=e=>{e.preventDefault();e.stopPropagation();if(document.body.classList.contains('v214LearningReadOnly'))return;window.openAddCardToDeck?.(did)}}
  }
  window.openAddCardToDeck=function(did){
    const d=(data.flashDecks||[]).find(x=>String(x.id)===String(did));if(!d)return alert('Karteikarten-Ordner nicht gefunden.');
    openModal(`<h2>Karte hinzufügen</h2><label>Frage</label><textarea id="v217DeckQ"></textarea><label style="margin-top:10px">Antwort</label><textarea id="v217DeckA"></textarea><button type="button" class="primary" style="margin-top:10px" onclick="saveCardToDeck(${jsArg(d.id)})">Speichern</button>`);
  };
  window.saveCardToDeck=function(did){
    const d=(data.flashDecks||[]).find(x=>String(x.id)===String(did));
    const question=(q('#v217DeckQ')?.value||q('#deckQ')?.value||'').trim();
    const answer=(q('#v217DeckA')?.value||q('#deckA')?.value||'').trim();
    if(!d)return alert('Karteikarten-Ordner nicht gefunden.');
    if(!question||!answer)return alert('Bitte Frage und Antwort ausfüllen.');
    data.flashcards ||= [];
    data.flashcards.push({id:typeof id==='function'?id():'card-'+Date.now(),subject:d.subject,deckId:d.id,q:question,a:answer,created:Date.now()});
    try{save()}catch(err){console.error(err);return alert('Die Karte konnte nicht gespeichert werden.');}
    closeModal();try{renderDeckDetail()}catch(_){};setTimeout(ensureDeckSwitch217,0);
  };
  const deckBefore217=window.renderDeckDetail||((typeof renderDeckDetail==='function')?renderDeckDetail:null);
  if(typeof deckBefore217==='function'&&!deckBefore217.__v217){
    const wrapped=function(){const r=deckBefore217.apply(this,arguments);setTimeout(ensureDeckSwitch217,0);return r};
    wrapped.__v217=true;window.renderDeckDetail=wrapped;try{renderDeckDetail=wrapped}catch(_){}
  }

  /* ---------- Quiz: saving a question must always work ---------- */
  window.v217SaveQuizQuestion=function(qid){
    const quiz=(data.quizzes||[]).find(x=>String(x.id)===String(qid));if(!quiz)return alert('Quiz nicht gefunden.');
    const type=q('#quizQType')?.value||'text';
    const question=(q('#newQuizQ')?.value||'').trim();
    const answer=(q('#newQuizA')?.value||'').trim();
    if(!question)return alert('Bitte zuerst eine Frage eingeben.');
    if(!answer)return alert('Bitte die richtige Antwort eingeben.');
    let options=[];
    if(type==='mc'){
      options=(q('#newQuizOptions')?.value||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
      if(!options.some(x=>x.toLocaleLowerCase()===answer.toLocaleLowerCase()))options.push(answer);
      options=[...new Map(options.map(x=>[x.toLocaleLowerCase(),x])).values()];
      if(options.length<2)return alert('Bitte mindestens zwei Antwortmöglichkeiten eintragen.');
    }
    quiz.questions=Array.isArray(quiz.questions)?quiz.questions:[];
    quiz.questions.push({id:typeof id==='function'?id():'quizq-'+Date.now(),type,q:question,a:answer,options});
    try{save()}catch(err){console.error(err);return alert('Die Frage konnte nicht gespeichert werden.');}
    try{cuteToast?.('Frage gespeichert ✓')}catch(_){}
    window.editQuiz(qid);
  };
  window.addQuizQuestion=window.v217SaveQuizQuestion;try{addQuizQuestion=window.addQuizQuestion}catch(_){}
  window.editQuiz=function(qid){
    setLearnMode217('edit');
    const quiz=(data.quizzes||[]).find(x=>String(x.id)===String(qid));if(!quiz)return;
    quiz.questions=Array.isArray(quiz.questions)?quiz.questions:[];
    const items=quiz.questions.map((x,i)=>`<div class="quizEditorQuestion"><div class="rowBetween"><b>${i+1}. ${html(x.q)}</b><button class="dangerBtn" onclick="deleteQuizQuestion(${jsArg(qid)},${jsArg(x.id)})">×</button></div><div class="small">${x.type==='mc'?'Multiple Choice':'Freitext'} · Lösung: ${html(x.a)}</div></div>`).join('')||'<div class="empty">Noch keine Fragen.</div>';
    openModal(`<div class="rowBetween"><h2>${html(quiz.name)}</h2><button type="button" class="primary" onclick="startQuiz(${jsArg(qid)})">Test starten</button></div>
      <div class="stack" style="margin-top:12px">${items}</div>
      <div class="section"><h3>Frage hinzufügen</h3>
        <label style="margin-top:8px">Fragentyp</label><select id="quizQType"><option value="text">Antwort eingeben</option><option value="mc">Multiple Choice</option></select>
        <label style="margin-top:8px">Frage</label><textarea id="newQuizQ"></textarea>
        <div id="mcOptionsBox" style="display:none"><label style="margin-top:8px">Antwortmöglichkeiten (eine pro Zeile)</label><textarea id="newQuizOptions" placeholder="Antwort A&#10;Antwort B&#10;Antwort C"></textarea></div>
        <label style="margin-top:8px">Richtige Antwort</label><input id="newQuizA">
        <button type="button" class="primary" style="margin-top:8px" onclick="v217SaveQuizQuestion(${jsArg(qid)})">Frage speichern</button>
      </div>`);
    const type=q('#quizQType');if(type)type.onchange=()=>{const box=q('#mcOptionsBox');if(box)box.style.display=type.value==='mc'?'block':'none'};
  };
  try{editQuiz=window.editQuiz}catch(_){}

  /* ---------- iPhone multi-select ---------- */
  window.toggleMultiSelectMode=function(){
    try{
      canvasState.selectedIds ||= [];canvasState.selectedVectorIds ||= [];
      canvasState.multiMode=!canvasState.multiMode;
      if(canvasState.multiMode){
        if(canvasState.selectedType==='object'&&canvasState.selectedId&&!canvasState.selectedIds.includes(canvasState.selectedId))canvasState.selectedIds.push(canvasState.selectedId);
        if(canvasState.selectedType==='vector'&&canvasState.selectedId&&!canvasState.selectedVectorIds.includes(canvasState.selectedId))canvasState.selectedVectorIds.push(canvasState.selectedId);
      }else{
        const lastObj=canvasState.selectedIds.at(-1),lastVec=canvasState.selectedVectorIds.at(-1);
        if(lastObj){canvasState.selectedIds=[lastObj];canvasState.selectedVectorIds=[];canvasState.selectedType='object';canvasState.selectedId=lastObj}
        else if(lastVec){canvasState.selectedIds=[];canvasState.selectedVectorIds=[lastVec];canvasState.selectedType='vector';canvasState.selectedId=lastVec}
        else{canvasState.selectedType=null;canvasState.selectedId=null}
      }
      document.body.classList.toggle('v217MobileMulti',innerWidth<900&&canvasState.multiMode);
      document.body.classList.toggle('v216MobileMulti',innerWidth<900&&canvasState.multiMode);
      try{renderCanvasObjects()}catch(_){};try{renderVectors()}catch(_){};try{renderCanvasInspector()}catch(_){};try{renderLayerList()}catch(_){};try{updateMultiSelectStatus()}catch(_){};try{updateMobileSelectionTools()}catch(_){}
      const b=qa('#canvasQuickDrawer button').find(x=>/Mehrfach/.test(x.textContent||''));if(b){const span=b.querySelector('span');if(span)span.textContent=canvasState.multiMode?'Mehrfach aus':'Mehrfachauswahl'}
    }catch(err){console.error('Studia Mehrfachauswahl',err)}
  };
  try{toggleMultiSelectMode=window.toggleMultiSelectMode}catch(_){}

  /* ---------- Laptop editor: direct, deterministic opener ---------- */
  function restoreSheetContext217(sheetId){
    if(!sheetId)return;
    const sh=(data.studySheets||[]).find(x=>String(x.id)===String(sheetId));if(!sh)return;
    let s=(data.subjects||[]).find(x=>String(x.name)===String(sh.subject));
    if(!s&&sh.topicId)s=(data.subjects||[]).find(x=>(x.topics||[]).some(t=>String(t.id)===String(sh.topicId)));
    if(s){
      try{selectedSubjectId=s.id}catch(_){window.selectedSubjectId=s.id}
      const t=(s.topics||[]).find(x=>String(x.id)===String(sh.topicId));if(t)try{selectedTopicId=t.id}catch(_){window.selectedTopicId=t.id}
    }
  }
  function clearEditorLocks217(){
    document.body.classList.remove('v184PreviewOpen','v137ViewMode','editorDrawerOpen');
    const view=q('#view-sheet-editor');if(view){try{view.inert=false}catch(_){}view.removeAttribute('inert');view.removeAttribute('aria-hidden');view.style.pointerEvents='auto';view.style.visibility='visible'}
    q('#v181Preview')?.classList.remove('open');
  }
  window.openStudySheetEditor=function(sheetId=null){
    try{selectedSheetId=sheetId||null}catch(_){window.selectedSheetId=sheetId||null}
    restoreSheetContext217(sheetId);
    clearEditorLocks217();
    try{if(q('#modalWrap.open'))closeModal()}catch(_){}
    qa('.view').forEach(v=>v.classList.remove('active'));
    const view=q('#view-sheet-editor');if(!view)return alert('Der Lernblatt-Editor konnte nicht gefunden werden.');
    view.classList.add('active');document.body.classList.add('editorMode');
    qa('#nav button').forEach(b=>b.classList.remove('active'));
    const title=q('#headerTitle');if(title)title.textContent='Lernblatt.';
    const eye=q('#headerEyebrow');if(eye)eye.textContent='VERSION 217';
    const run=()=>{
      clearEditorLocks217();document.body.classList.add('editorMode');view.classList.add('active');
      try{renderSheetEditor()}catch(err){console.error('Studia editor render',err);return alert('Der Editor konnte nicht geladen werden.');}
      setTimeout(()=>{clearEditorLocks217();try{window.ensureDesktopEditorRail?.()}catch(_){};try{window.fitCanvasStage?.()}catch(_){};try{window.v132SyncHits?.()}catch(_){}},120);
    };
    requestAnimationFrame(run);
  };
  try{openStudySheetEditor=window.openStudySheetEditor}catch(_){}

  /* ---------- Reconcile generated UI after older render layers rebuild it ---------- */
  function reconcile217(){
    removeSidebarMascot217();ensureLearningSwitch217();ensureDeckSwitch217();decorateHome217();
    setTimeout(paintToday217,25);
    try{document.body.classList.toggle('v217MobileMulti',innerWidth<900&&!!canvasState?.multiMode)}catch(_){}
  }
  const obs=new MutationObserver(()=>{clearTimeout(window.__studia217Timer);window.__studia217Timer=setTimeout(reconcile217,35)});
  obs.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',()=>setTimeout(reconcile217,45),false);
  window.addEventListener('resize',()=>setTimeout(reconcile217,60));
  [0,100,350,900,1800].forEach(t=>setTimeout(reconcile217,t));
  const eye=q('#headerEyebrow');if(eye)eye.textContent='VERSION 217';
})();
