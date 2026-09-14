import fs from "node:fs";
let base=process.env.DEPLOYMENT_URL||process.env.WORKER_URL||"";if(!base&&fs.existsSync("deployment.url.txt"))base=fs.readFileSync("deployment.url.txt","utf8").trim();if(!base)base="https://my-life-room-v13-live-0910.starpoint9083.workers.dev";base=base.replace(/\/$/,"");
const get=async path=>{const r=await fetch(base+path,{cache:"no-store",headers:{"cache-control":"no-cache"}}),t=await r.text();return {r,t}};
const must=async path=>{const x=await get(path);if(!x.r.ok)throw new Error(`${path} ${x.r.status}`);return x.t};
let last="";for(let attempt=1;attempt<=12;attempt++){try{
 const [home,js,manifestText,css,statusText,oldJs,oldCss]=await Promise.all([must(`/?v42_verify=${Date.now()}`),must("/master-frames-v42.js?v=42"),must("/master-frames-v42-manifest.json?v=42"),must("/master-scenes-v40.css?v=40"),must("/api/master-scenes/status"),must("/master-motion-v41.js?v=retired"),must("/master-motion-v41.css?v=retired")]);
 const manifest=JSON.parse(manifestText),status=JSON.parse(statusText);
 if(!home.includes("/master-frames-v42.js?v=42")||!home.includes("/master-scenes-v40.css?v=40"))throw new Error("V42 injection missing");
 if(home.includes("/master-motion-v41.js")||home.includes("/master-motion-v41.css"))throw new Error("V41 fake motion still injected");
 if(!js.includes("v42-real-frame-sequence")||!js.includes("real-intermediate-images-only")||!js.includes("fakeMotion:false")||!js.includes("paidVideo:false"))throw new Error("V42 runtime markers missing");
 if(manifest.version!=="v42-real-frame-sequence"||manifest.fakeMotion!==false||manifest.paidVideo!==false||!Array.isArray(manifest.routes)||manifest.routes.length<8)throw new Error("V42 manifest mismatch");
 if(css.includes("@keyframes")||css.includes("transition:")||css.includes("transform:"))throw new Error("V40 master layer still contains fake visual motion");
 if(status.readyCount!==8||status.total!==8)throw new Error(`V40 masters not ready ${status.readyCount}/${status.total}`);
 if(!oldJs.includes("v41-retired-tombstone")||oldJs.includes("m41Return")||oldJs.includes("master41-run"))throw new Error("V41 runtime tombstone not active yet");
 if(!oldCss.includes("v41-retired-tombstone")||oldCss.includes("@keyframes")||oldCss.includes("animation:")||oldCss.includes("transform:"))throw new Error("V41 CSS tombstone not active yet");
 console.log(`PASS V42 live attempt ${attempt}/12 masters=8/8 fake-motion=purged real-frame-engine=ready`);process.exit(0)
 }catch(e){last=e?.message||String(e);console.log(`WAIT V42 live attempt ${attempt}/12 ${last}`);if(attempt<12)await new Promise(r=>setTimeout(r,5000))}}
console.error("P2 V42 live verification failed",last);process.exit(1);
