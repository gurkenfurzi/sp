
(()=>{
  if(!window.StudiaCloud){
    console.error('[Studia V243] Inline cloud transport failed to initialize');
    const show=()=>{const s=document.querySelector('#v242SyncStatus');if(s){s.textContent='Sync-Client konnte nicht initialisiert werden';s.classList.add('bad')}};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
    return;
  }
  const mark=()=>{const e=document.querySelector('#headerEyebrow');if(e)e.textContent='VERSION 253'};
  [0,250,900,1800].forEach(t=>setTimeout(mark,t));
})();
