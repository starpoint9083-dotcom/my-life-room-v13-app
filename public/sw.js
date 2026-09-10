const CACHE="my-life-room-v23-cinema-shell";
const BUILD="visualfix1";
const PATCH="cleanup2";
const CINEMA="pilot1";
const SHELL=["/","/index.html","/manifest.webmanifest","/runtime-v14.js","/avatar-runtime-v15.js","/reset-runtime-v16.js","/visual-runtime-v17.js","/room-runtime-v19.js","/pose-runtime-v20.js","/core-runtime-v21.js","/continuity-runtime-v22.js","/cinema-runtime-v23.js","/assets/asset_manifest.json"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}));self.skipWaiting()});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener("fetch",event=>{const req=event.request;if(req.method!=="GET"||new URL(req.url).pathname.startsWith("/api/"))return;event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});return res}).catch(()=>caches.match(req).then(r=>r||caches.match("/index.html"))))});