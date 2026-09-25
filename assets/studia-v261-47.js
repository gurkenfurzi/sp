
(function(){
  'use strict';
  if(window.__STUDIA_V213_LEARNING_FIXES__)return;
  window.__STUDIA_V213_LEARNING_FIXES__=true;
  const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const mobileEditor=()=>innerWidth<900&&document.body.classList.contains('editorMode')&&!!q('#view-sheet-editor.active');

  /* 1) Mobile text editing: do not let the normal global rerender replace the
     contenteditable while the phone keyboard / IME is still editing it. */
  let composing=false;
  const mobileTypingTarget=()=>{
    const a=document.activeElement;
    return !!(innerWidth<900&&a&&(
      a.matches?.('input,textarea,select')||a.isContentEditable||a.closest?.('[contenteditable="true"]')
    ));
  };
  try{
    const baseRenderAll=window.renderAll||renderAll;
    if(typeof baseRenderAll==='function'&&!baseRenderAll.__v213MobileGuard){
      const guarded=function(){
        if(innerWidth<900&&(composing||mobileTypingTarget()))return;
        return baseRenderAll.apply(this,arguments);
      };
      guarded.__v213MobileGuard=true;guarded.__v213Original=baseRenderAll;
      window.renderAll=guarded;try{renderAll=guarded}catch(_){}
    }
  }catch(_){}

  function cleanObjectHTML(el){
    const clone=el.cloneNode(true);
    clone.querySelectorAll('.resizeHandle,.rotateHandle,.v135LinkBadge,.v116ShapeMoveHandle,.v108VectorMoveHandle').forEach(n=>n.remove());
    return clone.innerHTML;
  }
  function commitMobileText(el){
    if(!mobileEditor()||!el)return;
    const box=el.closest?.('#canvasObjects .cobj[contenteditable="true"]');if(!box)return;
    const idv=box.dataset.id;let st=null;try{st=canvasState}catch(_){st=window.canvasState}const o=(st?.objects||[]).find(x=>String(x.id)===String(idv));if(!o)return;
    o.text=cleanObjectHTML(box);
    try{markCanvasDirty?.()}catch(_){}
  }
  document.addEventListener('compositionstart',e=>{if(innerWidth<900&&(e.target?.matches?.('input,textarea')||e.target?.isContentEditable||e.target?.closest?.('[contenteditable="true"]')))composing=true},true);
  document.addEventListener('compositionend',e=>{if(innerWidth<900)composing=false;if(mobileEditor())commitMobileText(e.target)},true);
  document.addEventListener('input',e=>{
    if(!mobileEditor()||!e.target?.closest?.('#canvasObjects .cobj[contenteditable="true"]'))return;
    /* Run after the historical anonymous input handler so clean text wins and
       resize/rotate handles can never be saved into the text itself. */
    queueMicrotask(()=>commitMobileText(e.target));
  },true);
  document.addEventListener('blur',e=>{if(mobileEditor())commitMobileText(e.target)},true);

  /* 2) Use the exact uploaded panda artwork for StudyPet. */
  function putPanda(){
    const room=q('#petRoomMini');if(!room)return;
    const old=room.querySelector('.petAvatarCute');
    if(old){
      const wrap=document.createElement('div');wrap.className='v213PandaWrap';
      const img=document.createElement('img');img.className='v213PandaPet';img.src='panda-study.png';img.alt='StudyPet Panda';img.draggable=false;
      wrap.appendChild(img);
      const bow=old.querySelector('.petBow');if(bow)wrap.appendChild(bow.cloneNode(true));
      old.replaceWith(wrap);
    }else if(!room.querySelector('.v213PandaPet')){
      const img=document.createElement('img');img.className='v213PandaPet';img.src='panda-study.png';img.alt='StudyPet Panda';img.draggable=false;room.appendChild(img);
    }
  }
  try{
    const basePet=window.renderPetRoom||renderPetRoom;
    if(typeof basePet==='function'&&!basePet.__v213Panda){
      const wrapped=function(){const out=basePet.apply(this,arguments);putPanda();return out};
      wrapped.__v213Panda=true;window.renderPetRoom=wrapped;try{renderPetRoom=wrapped}catch(_){}
    }
  }catch(_){}

  /* 3) Karteikarten: reveal rating controls after flipping and make the three
     choices icon-only: known / medium / not known. */
  const ratingIcons={
    known:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>',
    meh:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg>',
    no:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>'
  };
  function decorateRatings(){
    const box=q('#deckDetail .v102MemoryButtons');if(!box)return;
    box.classList.add('v213IconRatings');
    const defs=[['known','Gewusst'],['meh','Mittel'],['no','Nicht gewusst']];
    qa('button',box).slice(0,3).forEach((b,i)=>{
      const [key,label]=defs[i];
      if(b.dataset.v213RatingIcon!==key){b.innerHTML=ratingIcons[key];b.dataset.v213RatingIcon=key}
      b.title=label;b.setAttribute('aria-label',label);b.type='button';
    });
  }
  try{
    const baseDeck=window.renderDeckDetail||renderDeckDetail;
    if(typeof baseDeck==='function'&&!baseDeck.__v213Ratings){
      const wrapped=function(){const out=baseDeck.apply(this,arguments);decorateRatings();return out};
      wrapped.__v213Ratings=true;window.renderDeckDetail=wrapped;try{renderDeckDetail=wrapped}catch(_){}
    }
    const flip=function(){
      try{flashFlipped=!flashFlipped}catch(_){return}
      try{renderDeckDetail()}catch(_){}
    };
    window.flipDeckCard=flip;try{flipDeckCard=flip}catch(_){}
  }catch(_){}

  /* 4) Quiz: older markup put JSON strings with double quotes directly inside
     an onclick attribute. Browsers truncate that handler. Keep the existing quiz
     logic, but replace those broken inline handlers with real DOM click handlers. */
  function repairQuizButtons(){
    const root=q('#quizPlayerRoot');if(!root||!quizSession)return;
    const quiz=(data.quizzes||[]).find(x=>x.id===selectedQuizId);if(!quiz)return;
    const item=quiz.questions?.[quizSession.index];if(!item)return;
    const opts=item.options||[];
    qa('.choiceBtn',root).forEach((b,i)=>{
      b.type='button';b.removeAttribute('onclick');
      b.onclick=e=>{e.preventDefault();e.stopPropagation();if(quizSession.submitted)return;quizSession.selected=opts[i]??b.textContent.trim();renderQuizPlayer()};
    });
    qa('button',root).forEach(b=>{
      const txt=(b.textContent||'').trim();
      if(txt==='Antwort prüfen'){b.type='button';b.onclick=e=>{e.preventDefault();e.stopPropagation();submitQuizAnswer()}}
      else if(txt==='Weiter'){b.type='button';b.onclick=e=>{e.preventDefault();e.stopPropagation();nextQuizQuestion()}}
    });
  }
  try{
    const baseQuiz=window.renderQuizPlayer||renderQuizPlayer;
    if(typeof baseQuiz==='function'&&!baseQuiz.__v213Clicks){
      const wrapped=function(){const out=baseQuiz.apply(this,arguments);repairQuizButtons();return out};
      wrapped.__v213Clicks=true;window.renderQuizPlayer=wrapped;try{renderQuizPlayer=wrapped}catch(_){}
    }
  }catch(_){}

  /* Keep fixes applied after normal app rerenders without changing other views. */
  const obs=new MutationObserver(()=>{
    if(q('#view-study.active'))putPanda();
    if(q('#view-deck-detail.active'))decorateRatings();
    if(q('#view-quiz-player.active'))repairQuizButtons();
  });
  obs.observe(document.body,{childList:true,subtree:true});
  [0,120,500,1200].forEach(t=>setTimeout(()=>{putPanda();decorateRatings();repairQuizButtons()},t));
})();
