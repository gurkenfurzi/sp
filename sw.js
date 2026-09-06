self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{try{for(const key of await caches.keys()){if(/studia|schoolbloom/i.test(key))await caches.delete(key)}}catch(_){}await self.clients.claim()})()));
self.addEventListener('fetch',()=>{});
