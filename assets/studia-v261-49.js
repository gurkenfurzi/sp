
(function(){
  'use strict';
  if(window.__STUDIA_V215__)return;
  window.__STUDIA_V215__=true;

  const q=(s,r=document)=>r?.querySelector?.(s)||null;
  const qa=(s,r=document)=>r?.querySelectorAll?[...r.querySelectorAll(s)]:[];
  const activeView=()=>q('.view.active')?.id||'';
  const readOnly=()=>document.body.classList.contains('v214LearningReadOnly');

  function setLearningMode(mode){
    try{
      if(typeof window.v214SetLearningMode==='function')window.v214SetLearningMode(mode);
      else document.body.classList.toggle('v214LearningReadOnly',mode!=='edit');
    }catch(_){document.body.classList.toggle('v214LearningReadOnly',mode!=='edit')}
  }

  /* Opening content from Fächer/Thema is an editing workflow. Opening it from
     Lernen keeps the selected Lernen/Bearbeiten mode from V214. */
  const oldOpenDeck=window.openDeck;
  if(typeof oldOpenDeck==='function'){
    window.openDeck=function(did){
      const from=activeView();
      if(from==='view-topic-detail'||from==='view-subject-detail'||from==='view-subjects')setLearningMode('edit');
      const out=oldOpenDeck.apply(this,arguments);
      setTimeout(syncDeckModeUI,0);
      return out;
    };
    try{openDeck=window.openDeck}catch(_){}
  }

  const oldCreateDeckPrompt=window.createDeckPrompt;
  if(typeof oldCreateDeckPrompt==='function'){
    window.createDeckPrompt=function(){setLearningMode('edit');return oldCreateDeckPrompt.apply(this,arguments)};
    try{createDeckPrompt=window.createDeckPrompt}catch(_){}
  }
  const oldCreateDeck=window.createDeck;
  if(typeof oldCreateDeck==='function'){
    window.createDeck=function(){setLearningMode('edit');const out=oldCreateDeck.apply(this,arguments);setTimeout(syncDeckModeUI,0);return out};
    try{createDeck=window.createDeck}catch(_){}
  }

  window.v215SetDeckMode=function(mode){
    setLearningMode(mode==='edit'?'edit':'learn');
    try{renderDeckDetail()}catch(_){}
    setTimeout(syncDeckModeUI,0);
  };

  function syncDeckModeUI(){
    const view=q('#view-deck-detail');
    if(!view?.classList.contains('active'))return;
    const head=q(':scope > .sectionHead',view);if(!head)return;
    let sw=q('.v215DeckModeSwitch',head);
    if(!sw){sw=document.createElement('div');sw.className='v214LearnModeSwitch v215DeckModeSwitch';head.insertBefore(sw,q('#addCardToDeckBtn',head)||null)}
    const mode=readOnly()?'learn':'edit';
    if(sw.dataset.mode!==mode){
      sw.dataset.mode=mode;
      sw.innerHTML=`<button type="button" class="${mode==='learn'?'active':''}" onclick="v215SetDeckMode('learn')">Lernen</button><button type="button" class="${mode==='edit'?'active':''}" onclick="v215SetDeckMode('edit')">Bearbeiten</button>`;
    }
    const add=q('#addCardToDeckBtn',view);
    if(add){add.type='button';add.style.display=mode==='edit'?'inline-flex':'none';const did=window.selectedDeckId||(()=>{try{return selectedDeckId}catch(_){return null}})();if(did)add.onclick=()=>window.openAddCardToDeck?.(did)}
  }

  const oldDeckRender=window.renderDeckDetail||(()=>{try{return renderDeckDetail}catch(_){return null}})();
  if(typeof oldDeckRender==='function'&&!oldDeckRender.__v215){
    const wrapped=function(){const out=oldDeckRender.apply(this,arguments);setTimeout(syncDeckModeUI,0);return out};
    wrapped.__v215=true;window.renderDeckDetail=wrapped;try{renderDeckDetail=wrapped}catch(_){}
  }

  /* Robust quiz question save. This deliberately reuses the existing quiz data
     model and save/sync functions instead of introducing a second editor model. */
  window.v215SaveQuizQuestion=function(qid){
    const quiz=(data.quizzes||[]).find(x=>String(x.id)===String(qid));
    const type=q('#quizQType')?.value||'text';
    const question=(q('#newQuizQ')?.value||'').trim();
    const answer=(q('#newQuizA')?.value||'').trim();
    if(!quiz)return alert('Quiz nicht gefunden.');
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
    try{save()}catch(err){console.error('Studia V215 quiz save',err);return alert('Die Frage konnte nicht gespeichert werden.')}
    try{cuteToast?.('Frage gespeichert ✓')}catch(_){}
    window.editQuiz?.(qid);
  };
  window.addQuizQuestion=window.v215SaveQuizQuestion;
  try{addQuizQuestion=window.addQuizQuestion}catch(_){}

  function bindQuizSave(qid){
    const modal=q('#modal');if(!modal)return;
    const btn=qa('button',modal).find(b=>(b.textContent||'').replace(/\s+/g,' ').trim()==='Frage speichern');
    if(btn){btn.type='button';btn.removeAttribute('onclick');btn.onclick=e=>{e.preventDefault();e.stopPropagation();window.v215SaveQuizQuestion(qid)}}
  }
  const oldEditQuiz=window.editQuiz;
  if(typeof oldEditQuiz==='function'){
    window.editQuiz=function(qid){
      setLearningMode('edit');
      const out=oldEditQuiz.apply(this,arguments);
      setTimeout(()=>bindQuizSave(qid),0);
      return out;
    };
    try{editQuiz=window.editQuiz}catch(_){}
  }
  const oldCreateQuizPrompt=window.createQuizPrompt;
  if(typeof oldCreateQuizPrompt==='function'){
    window.createQuizPrompt=function(){setLearningMode('edit');return oldCreateQuizPrompt.apply(this,arguments)};
    try{createQuizPrompt=window.createQuizPrompt}catch(_){}
  }

  /* Laptop learning-sheet editor recovery. Keep all existing editor wrappers when
     they work; only force the existing sheet view active if that chain fails. */
  function clearPreviewLock(){
    document.body.classList.remove('v184PreviewOpen','v137ViewMode');
    const sheet=q('#view-sheet-editor');
    if(sheet){try{sheet.inert=false}catch(_){}sheet.removeAttribute('inert');sheet.removeAttribute('aria-hidden')}
    const preview=q('#v181Preview');if(preview)preview.classList.remove('open');
  }
  function forceSheetEditor(sheetId){
    clearPreviewLock();
    try{selectedSheetId=sheetId||null}catch(_){window.selectedSheetId=sheetId||null}
    let ok=false;
    try{if(typeof window.openView==='function'){window.openView('sheet-editor');ok=!!q('#view-sheet-editor.active')}}catch(err){console.warn('Studia V215 openView fallback',err)}
    if(!ok){
      qa('.view').forEach(v=>v.classList.remove('active'));
      const sheet=q('#view-sheet-editor');if(!sheet)return;
      sheet.classList.add('active');document.body.classList.add('editorMode');
      try{q('#headerTitle').textContent='Lernblatt.'}catch(_){}
      try{renderSheetEditor()}catch(err){console.error('Studia V215 editor render',err)}
    }
    setTimeout(()=>{
      clearPreviewLock();document.body.classList.add('editorMode');
      const sheet=q('#view-sheet-editor');if(sheet&&!sheet.classList.contains('active'))sheet.classList.add('active');
      try{renderSheetEditor()}catch(_){}
      try{window.ensureDesktopEditorRail?.()}catch(_){}
      try{window.fitCanvasStage?.()}catch(_){}
    },80);
  }
  const oldOpenSheet=window.openStudySheetEditor;
  window.openStudySheetEditor=function(sheetId=null){
    setLearningMode('edit');clearPreviewLock();
    let out;
    try{out=typeof oldOpenSheet==='function'?oldOpenSheet.apply(this,arguments):undefined}catch(err){console.warn('Studia V215 existing editor opener failed',err)}
    setTimeout(()=>{if(!q('#view-sheet-editor.active')||!document.body.classList.contains('editorMode'))forceSheetEditor(sheetId);else clearPreviewLock()},0);
    setTimeout(()=>{if(!q('#view-sheet-editor.active')||!document.body.classList.contains('editorMode'))forceSheetEditor(sheetId)},180);
    return out;
  };
  try{openStudySheetEditor=window.openStudySheetEditor}catch(_){}

  /* A small safety net for desktop buttons/cards that explicitly open a learning sheet. */
  document.addEventListener('click',e=>{
    if(innerWidth<900)return;
    const el=e.target.closest?.('[onclick*="openStudySheetEditor"]');
    if(!el)return;
    setTimeout(()=>{
      if(!q('#view-sheet-editor.active')&&!q('#modalWrap.open')){
        const code=el.getAttribute('onclick')||'';
        const m=code.match(/openStudySheetEditor\(['\"]([^'\"]+)['\"]\)/);
        forceSheetEditor(m?m[1]:null);
      }
    },35);
  },false);

  const obs=new MutationObserver(()=>{
    if(q('#view-deck-detail.active'))syncDeckModeUI();
    const modal=q('#modal');
    if(modal&&/Frage speichern/.test(modal.textContent||'')){
      const quiz=(data.quizzes||[]).find(x=>String(x.id)===String(window.selectedQuizId||''));
      if(quiz)bindQuizSave(quiz.id);
    }
  });
  obs.observe(document.body,{childList:true,subtree:true});

  [0,100,350,900].forEach(t=>setTimeout(()=>{syncDeckModeUI();const e=q('#headerEyebrow');if(e)e.textContent='VERSION 215'},t));
})();
