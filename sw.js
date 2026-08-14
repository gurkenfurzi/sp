const CACHE = "schoolbloom-v71-safe";
const CORE = ["./","./index.html","./manifest.webmanifest","./apple-touch-icon.png","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE).catch(()=>{})))});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim()})())});
self.addEventListener("message",e=>{if(e.data?.type==="SKIP_WAITING")self.skipWaiting()});
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET")return;
 const u=new URL(e.request.url);
 if(e.request.mode==="navigate"||u.pathname.endsWith("/index.html")){
  e.respondWith((async()=>{try{const r=await fetch(e.request,{cache:"no-store"});(await caches.open(CACHE)).put("./index.html",r.clone()).catch(()=>{});return r}catch(_){return await caches.match("./index.html")}})());return;
 }
 e.respondWith((async()=>{const c=await caches.match(e.request);if(c)return c;try{const r=await fetch(e.request);(await caches.open(CACHE)).put(e.request,r.clone()).catch(()=>{});return r}catch(_){return c}})())
});
