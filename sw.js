const VERSION='159';
self.addEventListener('install',event=>{self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{try{for(const key of await caches.keys())if(/^studia-shell-/i.test(key))await caches.delete(key)}catch(_){}try{await self.clients.claim()}catch(_){}})())});
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting()});
/* V159 intentionally has NO fetch handler: it cannot cache or block the app shell. */
