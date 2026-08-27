const CACHE_NAME='studia-v119-shell';
const SHELL=['./','./index.html?v=117','./manifest.webmanifest','./icon-192-v109.png','./icon-512-v109.png','./apple-touch-icon-v109.png'];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(SHELL).catch(()=>{})))});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys()){if(key!==CACHE_NAME)await caches.delete(key)}await self.clients.claim()})())});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(r=>{const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(event.request,copy));return r}).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html?v=117'))));
    return;
  }
  event.respondWith(fetch(event.request).then(r=>{const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(event.request,copy));return r}).catch(()=>caches.match(event.request)));
});
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting()});
