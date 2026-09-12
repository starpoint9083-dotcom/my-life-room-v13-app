const CACHE="my-life-room-v26-shell";
const ROOM_CACHE="my-life-room-v25-room-shell";
const BUILD="visualfix1";
const PATCH="cleanup2";
const CINEMA="pilot-background1";
const STYLE="hybrid-30-real-70-animation-v26";
const ROOM_EXPERIENCE="v25-room-experience-1";
const MOTION="v26-natural-motion";
const SHELL=["/","/index.html","/manifest.webmanifest","/runtime-v14.js","/avatar-runtime-v15.js","/reset-runtime-v16.js","/visual-runtime-v17.js","/room-runtime-v19.js","/pose-runtime-v20.js","/core-runtime-v21.js","/continuity-runtime-v22.js","/cinema-runtime-v23.js","/cinema-background-v23.js","/cinema-motion-qc-v23.js","/room-experience-v25.js","/motion-runtime-v26.js","/assets/asset_manifest.json"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}));self.skipWaiting()});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
function injectRoomExperience(html){if(html.includes("/room-experience-v25.js"))return html;const script='<script src="/room-experience-v25.js" defer></script>';return html.includes("</body>")?html.replace("</body>",script+"</body>"):html+script}
self.addEventListener("fetch",event=>{
  const req=event.request,url=new URL(req.url);if(req.method!=="GET"||url.pathname.startsWith("/api/"))return;
  event.respondWith(fetch(req).then(async res=>{
    const type=res.headers.get("content-type")||"";
    if(type.includes("text/html")){
      const html=injectRoomExperience(await res.text()),headers=new Headers(res.headers);headers.delete("content-length");headers.set("cache-control","no-cache");
      const out=new Response(html,{status:res.status,statusText:res.statusText,headers});caches.open(CACHE).then(c=>c.put(req,out.clone())).catch(()=>{});return out;
    }
    const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});return res;
  }).catch(()=>caches.match(req).then(async cached=>{
    if(cached)return cached;const shell=await caches.match("/index.html");if(!shell)return new Response("Offline",{status:503});const type=shell.headers.get("content-type")||"";if(!type.includes("text/html"))return shell;const html=injectRoomExperience(await shell.text()),headers=new Headers(shell.headers);headers.delete("content-length");return new Response(html,{status:shell.status,statusText:shell.statusText,headers});
  }))
});
