self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>{event.waitUntil((async()=>{try{for(const k of await caches.keys()){if(/studia|schoolbloom/i.test(k))await caches.delete(k)}}catch(_){}try{await self.registration.unregister()}catch(_){}try{for(const c of await self.clients.matchAll({type:'window'})){c.navigate(c.url)}}catch(_){}})())});
