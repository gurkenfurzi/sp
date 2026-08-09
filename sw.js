const CACHE="schoolbloom-v16";
const CORE=["./","./index.html","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(u.hostname.includes("phs-lu.de"))return;if(e.request.mode==="navigate"){e.respondWith(fetch(e.request).then(r=>{caches.open(CACHE).then(c=>c.put("./index.html",r.clone()));return r}).catch(()=>caches.match("./index.html")));return}e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)))});
