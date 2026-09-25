
(function(){
  'use strict';
  if(window.__STUDIA_V214__)return;
  window.__STUDIA_V214__=true;
  const $1=(s,r=document)=>r.querySelector(s), $$1=(s,r=document)=>[...r.querySelectorAll(s)];
  const desktop=()=>innerWidth>=1100&&!document.body.classList.contains('editorMode');

  /* 1) Desktop sidebar: Notizen stays gone; Fehltage is removed as requested,
        while Fehlstunden remains a first-class navigation item. */
  function trimDesktopSidebar214(){
    if(!desktop())return;
    const side=$1('#v210Sidebar');if(!side)return;
    $$1('.navItem',side).forEach(btn=>{
      const label=(btn.querySelector('.navLabel')?.textContent||'').trim();
      if(label==='Notizen'||label==='Fehltage')btn.remove();
    });
    const dividers=$$1('.navDivider',side);
    dividers.forEach(d=>{
      const before=d.previousElementSibling,after=d.nextElementSibling;
      if(!before||!after)d.remove();
    });
  }

  /* 2) Robust targeted basis-plan recovery for the known Wednesday Physik
        double lesson (periods 1+2). The PDF can place the text in row 1 OR row 2,
        or mark two blocks while still returning the short 08:45 end time. */
  const prevBasis214=window.basisScheduleForClass||((typeof basisScheduleForClass==='function')?basisScheduleForClass:null);
  function normDay(d){const x=String(d||'').trim().toLowerCase();return x==='mi'||x.startsWith('mitt')?'Mi':String(d||'')}
  function mins214(t){const m=String(t||'').match(/(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):0}
  function lessonText214(l){
    const parts=[String(l?.raw||'')];
    try{const p=splitCell(l?.raw||'');parts.push(p.subject||'',p.meta||'',p.teacher||'',p.room||'');try{parts.push(prettySubject(p.subject||''))}catch(_){}}catch(_){}
    return parts.join(' ').replace(/[_\-]+/g,' ').replace(/\s+/g,' ').trim().toUpperCase();
  }
  function isPhysics214(l){
    const t=lessonText214(l);
    return /(^|[^A-ZÄÖÜ])PH(?:Y|YS|YSI|YSIK)?(?=$|[^A-ZÄÖÜ])/.test(t)||t.includes('PHYSIK');
  }
  function weakFragment214(l){
    if(!l)return true;
    const raw=String(l.raw||'').trim();if(!raw)return true;
    let p=null;try{p=splitCell(raw)}catch(_){}
    const subj=String(p?.subject||'').trim().toUpperCase();
    /* splitCell already removes known rooms/teachers. If a real subject remains,
       treat row 2 as an independent lesson and never swallow it. */
    if(subj&&subj!=='UNTERRICHT')return false;
    return true;
  }
  function robustBasisPhysics214(list){
    const out=(list||[]).map(x=>({...x}));
    const wed=out.filter(x=>normDay(x.day)==='Mi'&&!x.specialOnly&&!x.cancelledFromBasis);
    let r1=wed.find(x=>Number(x.rowNum)===1)||wed.find(x=>mins214(x.start)===480);
    let r2=wed.find(x=>x!==r1&&(Number(x.rowNum)===2||mins214(x.start)===525));

    /* If a merged PDF cell was assigned to the second row, recover its real start. */
    if((!r1||!isPhysics214(r1))&&r2&&isPhysics214(r2)&&(!r1||weakFragment214(r1))){
      if(r1){const i=out.indexOf(r1);if(i>=0)out.splice(i,1)}
      r2.start='08:00';r2.end=mins214(r2.end)>=570?r2.end:'09:30';r2.rowNum=1;r2.blocks=2;r2.isDouble=true;
      r2.recoveredBasisDouble=true;r2.recoveredBasisDoubleV214=true;
      return out;
    }
    if(!r1||!isPhysics214(r1))return out;

    /* A real different row-2 lesson would be left alone. A duplicate/fragment of
       the same merged Physik cell is absorbed. */
    if(r2&&!isPhysics214(r2)&&!weakFragment214(r2))return out;
    r1.start='08:00';r1.end=(r2&&mins214(r2.end)>=570)?r2.end:'09:30';
    r1.rowNum=1;r1.blocks=Math.max(2,Number(r1.blocks||1));r1.isDouble=true;
    r1.recoveredBasisDouble=true;r1.recoveredBasisDoubleV214=true;
    if(r2&&(isPhysics214(r2)||weakFragment214(r2))){const i=out.indexOf(r2);if(i>=0)out.splice(i,1)}
    return out;
  }
  if(typeof prevBasis214==='function'){
    const wrapped=function(name){return robustBasisPhysics214(prevBasis214.call(this,name)||[])};
    wrapped.__v214BasisPhysics=true;
    window.basisScheduleForClass=wrapped;try{basisScheduleForClass=wrapped}catch(_){}
  }

  /* 3) Lernen / Bearbeiten are now deliberately separate. Default path from the
        Lernen hub is read-only: no rename, edit, delete or add controls. */
  let learningMode214='learn';
  function readOnly214(){return learningMode214==='learn'}
  function applyLearningClass214(){document.body.classList.toggle('v214LearningReadOnly',readOnly214())}
  window.v214SetLearningMode=function(mode){
    learningMode214=mode==='edit'?'edit':'learn';applyLearningClass214();
    try{renderLearnsetsLists()}catch(_){}
    try{renderFlash()}catch(_){}
    decorateLearnsets214();
    if($1('#view-deck-detail.active')){try{renderDeckDetail()}catch(_){}}
  };
  function ensureLearningSwitch214(){
    const hero=$1('#view-learnsets .learnsetsHero');if(!hero)return;
    let sw=$1('.v214LearnModeSwitch',hero);
    if(!sw){sw=document.createElement('div');sw.className='v214LearnModeSwitch';hero.appendChild(sw)}
    if(sw.dataset.mode!==learningMode214){
      sw.dataset.mode=learningMode214;
      sw.innerHTML=`<button type="button" class="${readOnly214()?'active':''}" onclick="v214SetLearningMode('learn')">Lernen</button><button type="button" class="${readOnly214()?'':'active'}" onclick="v214SetLearningMode('edit')">Bearbeiten</button>`;
    }
  }
  function decorateQuizList214(){
    const root=$1('#learnsetsQuizList');if(!root)return;
    const quizzes=data.quizzes||[];
    $$1('.learnsetRow',root).forEach((row,i)=>{
      const quiz=quizzes[i],btn=row.querySelector('button');if(!quiz||!btn)return;
      const marker=learningMode214+':'+quiz.id+':'+((quiz.questions||[]).length?1:0);
      if(btn.dataset.v214QuizMarker===marker)return;
      btn.dataset.v214QuizMarker=marker;btn.type='button';btn.removeAttribute('onclick');
      if(readOnly214()){
        btn.textContent=(quiz.questions||[]).length?'Starten':'Leer';btn.disabled=!(quiz.questions||[]).length;
        btn.onclick=e=>{e.preventDefault();e.stopPropagation();if(!btn.disabled)startQuiz(quiz.id)};
      }else{
        btn.textContent='Bearbeiten';btn.disabled=false;
        btn.onclick=e=>{e.preventDefault();e.stopPropagation();editQuiz(quiz.id)};
      }
    });
  }
  function decorateLearnsets214(){
    applyLearningClass214();ensureLearningSwitch214();decorateQuizList214();
    const cardsHead=$1('#learnsetsCardsPanel .compactHead'),quizHead=$1('#learnsetsQuizPanel .compactHead');
    if(cardsHead)cardsHead.dataset.v214Mode=learningMode214;
    if(quizHead)quizHead.dataset.v214Mode=learningMode214;
  }

  const baseLearnsets214=window.renderLearnsetsLists||((typeof renderLearnsetsLists==='function')?renderLearnsetsLists:null);
  if(typeof baseLearnsets214==='function'){
    const wrapped=function(){const r=baseLearnsets214.apply(this,arguments);decorateLearnsets214();return r};
    wrapped.__v214=true;window.renderLearnsetsLists=wrapped;try{renderLearnsetsLists=wrapped}catch(_){}
  }

  const baseDeckRender214=window.renderDeckDetail||((typeof renderDeckDetail==='function')?renderDeckDetail:null);
  function stripDeckEditing214(){
    const root=$1('#deckDetail');if(!root)return;
    if(!readOnly214())return;
    /* Header rename + per-card edit/delete are intentionally absent in study mode. */
    $$1('button',root).forEach(btn=>{
      const t=(btn.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
      if(t==='umbenennen'||t==='bearbeiten'||t==='löschen')btn.remove();
    });
  }
  if(typeof baseDeckRender214==='function'){
    const wrapped=function(){const r=baseDeckRender214.apply(this,arguments);applyLearningClass214();stripDeckEditing214();return r};
    wrapped.__v214=true;window.renderDeckDetail=wrapped;try{renderDeckDetail=wrapped}catch(_){}
  }

  const baseBackDeck214=window.goBackFromDeck;
  window.goBackFromDeck=function(){if(readOnly214()){openView('learnsets');return}return typeof baseBackDeck214==='function'?baseBackDeck214.apply(this,arguments):openView('learnsets')};
  try{goBackFromDeck=window.goBackFromDeck}catch(_){}

  const baseOpen214=window.openView;
  if(typeof baseOpen214==='function'){
    const wrapped=function(name){
      const before=$1('.view.active')?.id?.replace('view-','')||'';
      if(name==='study')learningMode214='learn';
      else if(name==='learnsets'&&before==='study')learningMode214='learn';
      const r=baseOpen214.apply(this,arguments);
      applyLearningClass214();
      setTimeout(()=>{trimDesktopSidebar214();if(name==='learnsets')decorateLearnsets214();if(name==='deck-detail')stripDeckEditing214()},0);
      return r;
    };
    wrapped.__v214=true;window.openView=wrapped;try{openView=wrapped}catch(_){}
  }

  /* Defensive guard: even if stale markup survives for a frame, editing actions
     cannot fire while the user is in Lernen mode. */
  document.addEventListener('click',e=>{
    if(!readOnly214())return;
    const b=e.target.closest?.('#view-learnsets button,#view-deck-detail button');if(!b)return;
    const t=(b.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
    if(b.id==='addCardToDeckBtn'||t==='umbenennen'||t==='bearbeiten'||t==='löschen'||t.startsWith('+ ordner')||t.startsWith('+ quiz')){
      e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();
    }
  },true);

  /* Keep generated desktop navigation trimmed after every V210 rebuild. */
  const obs=new MutationObserver(()=>{trimDesktopSidebar214();if($1('#view-learnsets.active'))decorateLearnsets214();if($1('#view-deck-detail.active'))stripDeckEditing214()});
  obs.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',()=>setTimeout(trimDesktopSidebar214,60));
  [0,80,250,700,1500].forEach(t=>setTimeout(()=>{trimDesktopSidebar214();decorateLearnsets214();stripDeckEditing214()},t));
})();
