
(function(){
  window.__studiaBootErrors=[];
  window.addEventListener('error',function(e){window.__studiaBootErrors.push(String(e.message||e.error||'Unbekannter Fehler'));});
  window.addEventListener('unhandledrejection',function(e){window.__studiaBootErrors.push(String(e.reason||'Promise-Fehler'));});
  // Never let a stale editor/modal state cover the normal app on startup.
  document.documentElement.classList.remove('editorDrawerOpen');
  // Fire-and-forget cleanup: an old Studia service worker must never serve a mismatched editor.js.
  try{if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister().catch(()=>{}))).catch(()=>{})}catch(_){}
  try{if('caches' in window)caches.keys().then(ks=>Promise.all(ks.filter(k=>/studia|schoolbloom/i.test(k)).map(k=>caches.delete(k)))).catch(()=>{})}catch(_){}
})();
