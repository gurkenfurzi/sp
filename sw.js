const CACHE_NAME='studia-shell-v148';
const SHELL=['./','./index.html','./editor.css','./editor.js','./manifest.webmanifest','./favicon.png','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./assets/stickers/title-1.png','./assets/stickers/title-2.png','./assets/stickers/title-3.png','./assets/stickers/title-4.png','./assets/stickers/pins-1.png','./assets/stickers/pins-2.png','./assets/stickers/notes-1.png','./assets/stickers/notes-2.png','./assets/stickers/notes-3.png','./assets/stickers/notes-4.png','./assets/stickers/notes-5.png','./assets/stickers/notes-6.png','./assets/stickers/notes-7.png','./assets/stickers/rrahmen.svg'];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(SHELL).catch(()=>{})))});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys()){if(key!==CACHE_NAME)await caches.delete(key)}await self.clients.claim()})())});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(r=>{const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(event.request,copy));return r}).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html'))));
    return;
  }
  event.respondWith(fetch(event.request).then(r=>{const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(event.request,copy));return r}).catch(()=>caches.match(event.request)));
});
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting()});
