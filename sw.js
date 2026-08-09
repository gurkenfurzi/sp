const C="schoolbloom-v10";const A=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png"];self.addEventListener("install",e=>e.waitUntil(caches.open(C).then(c=>c.addAll(A))));self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(fetch(e.request).then(r=>{const x=r.clone();caches.open(C).then(c=>c.put(e.request,x)).catch(()=>{});return r}).catch(()=>caches.match(e.request)))})
self.addEventListener("push",event=>{
 let data={title:"SchoolBloom 🌷",body:"Du hast eine neue Erinnerung."};
 try{data=event.data.json()}catch{}
 event.waitUntil(self.registration.showNotification(data.title||"SchoolBloom 🌷",{body:data.body||"",icon:"./icon-192.png",badge:"./icon-192.png",data:data.url||"./"}));
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();
 event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
   for(const c of list){if("focus"in c)return c.focus()}
   if(clients.openWindow)return clients.openWindow(event.notification.data||"./");
 }));
});
