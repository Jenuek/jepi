// JEPI service worker: app shell works offline; APIs and map tiles always go to the network.
const VER='jepi-v2';
const SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VER).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VER).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET') return;
  // own files: network first (so updates arrive), cache as fallback
  if(u.origin===location.origin){
    e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(VER).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
    return;
  }
  // fonts and the map library: cache first
  if(/fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/.test(u.host)){
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const c=res.clone();caches.open(VER).then(x=>x.put(e.request,c));return res})));
  }
});
// push notifications (sent by supabase/functions/jepi-push)
self.addEventListener('push',e=>{
  let d={}; try{d=e.data?e.data.json():{}}catch(_){d={title:'JEPI',body:e.data&&e.data.text()}}
  e.waitUntil(self.registration.showNotification(d.title||'JEPI',{body:d.body||'',tag:d.tag||undefined,icon:'icon-192.png',badge:'icon-192.png',data:{url:d.url||'./'}}));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close(); const url=new URL((e.notification.data&&e.notification.data.url)||'./',self.location.origin).href;
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(ws=>{
    for(const w of ws){if(w.url.startsWith(self.location.origin)&&'focus' in w) return w.focus()}
    return self.clients.openWindow(url)}));
});
