
(()=>{
  'use strict';
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];

  /* Font previews only. Selection is owned by the editor's stable input layer. */
  function familyName(btn){
    return String(btn?.dataset?.v172Font||btn?.dataset?.font||'').trim();
  }
  function forceFontPreviews(root=document){
    qa('[data-v172-font],[data-font]',root).forEach(btn=>{
      const name=familyName(btn);if(!name)return;
      const fam='"'+name.replace(/["\\]/g,'')+'", sans-serif';
      btn.style.setProperty('font-family',fam,'important');
      const sample=btn.querySelector('.v165FontAa,.v96FontSample')||btn.querySelector(':scope > span');
      if(sample)sample.style.setProperty('font-family',fam,'important');
      const label=btn.querySelector(':scope > b,.v96FontMeta>b');
      if(label)label.style.setProperty('font-family',fam,'important');
      try{document.fonts?.load?.('18px '+fam)}catch(_){}
    });
  }
  function wrapFontMenu(name){
    const old=window[name];if(typeof old!=='function'||old.__requestedPreviewFix)return;
    const wrapped=async function(){
      const out=await old.apply(this,arguments);
      requestAnimationFrame(()=>forceFontPreviews(document));
      setTimeout(()=>forceFontPreviews(document),80);
      return out;
    };
    wrapped.__requestedPreviewFix=true;window[name]=wrapped;
  }
  ['v144OpenFontBrowser','v96OpenFontPicker','v165ToggleFontMenu'].forEach(wrapFontMenu);
  window.addEventListener('pageshow',()=>setTimeout(()=>forceFontPreviews(document),120));
})();
