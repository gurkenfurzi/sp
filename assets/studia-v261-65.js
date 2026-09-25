
(()=>{
  'use strict';
  window.__STUDIA_VERSION__=248;
  // Remove legacy retry wording if an old DOM fragment survived navigation/cache.
  const scrub=()=>{
    document.querySelectorAll('#v150AccountStatus,#v242SyncStatus,#v242DesktopSync small').forEach(el=>{
      const s=String(el.textContent||'');
      if(/versucht es automatisch erneut/i.test(s)) el.textContent='Sync fehlgeschlagen · kein automatischer Retry';
    });
    const e=document.querySelector('#headerEyebrow'); if(e)e.textContent='VERSION 253';
  };
  [0,120,500,1500].forEach(ms=>setTimeout(scrub,ms));
  /* V253: removed self-triggering global mutation observer. */
})();
