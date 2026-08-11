const CACHE="schoolbloom-v31";
const CORE=["./","./index.html","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
 const u=new URL(e.request.url);
 if(u.hostname.includes("workers.dev") || u.hostname.includes("phs-lu.de") || u.pathname.endsWith("/Stundenplan.pdf")) return;
 if(e.request.mode==="navigate"){
   e.respondWith(fetch(e.request).then(r=>{caches.open(CACHE).then(c=>c.put("./index.html",r.clone()));return r}).catch(()=>caches.match("./index.html")));
   return;
 }
 e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)));
});
