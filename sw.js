const CACHE = "schoolbloom-v62";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(CORE).catch(()=>{}))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if(event.data?.type==="SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const req=event.request;
  if(req.method!=="GET") return;

  // HTML/navigation is NETWORK FIRST so GitHub updates are visible immediately.
  if(req.mode==="navigate" || new URL(req.url).pathname.endsWith("/index.html")){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req,{cache:"no-store"});
        const cache=await caches.open(CACHE);
        cache.put("./index.html",fresh.clone()).catch(()=>{});
        return fresh;
      }catch(e){
        return (await caches.match(req)) || (await caches.match("./index.html"));
      }
    })());
    return;
  }

  // Assets: cache first, then update.
  event.respondWith((async()=>{
    const cached=await caches.match(req);
    if(cached) return cached;
    try{
      const fresh=await fetch(req);
      const cache=await caches.open(CACHE);
      cache.put(req,fresh.clone()).catch(()=>{});
      return fresh;
    }catch(e){
      return cached;
    }
  })());
});
