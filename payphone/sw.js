const CACHE='telefon-call-v1';
const CORE=['/payphone/collection.html','/payphone/call.js','/payphone/video-call.js','/payphone/manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim());});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));});
self.addEventListener('push',e=>{let data={};try{data=e.data?e.data.json():{}}catch(_){data={title:'Gelen arama',body:e.data?e.data.text():'0601 numarasından arama'}}const title=data.title||'Gelen arama';const opts={body:data.body||'0601 numarasından arama',tag:data.tag||'telefon-call',renotify:true,requireInteraction:true,data:{url:data.url||'/payphone/collection.html?incoming=1'}};e.waitUntil(self.registration.showNotification(title,opts));});
self.addEventListener('notificationclick',e=>{e.notification.close();const url=(e.notification.data&&e.notification.data.url)||'/payphone/collection.html?incoming=1';e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list){if('focus'in c){c.navigate(url);return c.focus();}}return clients.openWindow(url);}));});
