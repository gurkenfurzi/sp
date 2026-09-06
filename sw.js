const VERSION='160-rollback';
self.addEventListener('install',event=>{self.skipWaiting()});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    try{
      const keys=await caches.keys();
      await Promise.all(keys.filter(k=>/^studia-shell-/i.test(k)).map(k=>caches.delete(k)));
    }catch(_){ }
    try{await self.clients.claim()}catch(_){ }
  })());
});
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting()});
/* Intentionally no fetch handler in rollback build: never serve a stale Studia shell. */
