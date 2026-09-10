import fs from "node:fs";
let base=process.argv[2];
if(!base&&fs.existsSync("deployment.url.txt"))base=fs.readFileSync("deployment.url.txt","utf8").trim();
if(!base){console.error("Usage: node scripts/verify-v23-cinema-live.mjs https://worker.workers.dev");process.exit(2)}
base=base.replace(/\/$/,"");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function text(path){const u=new URL(base+path);u.searchParams.set("cinema_verify",Date.now());const r=await fetch(u,{cache:"no-store",headers:{"cache-control":"no-cache"}});return {r,body:await r.text()}}
let passed=false,last="";
for(let attempt=1;attempt<=12;attempt++){
 try{
  const health=await fetch(base+"/api/health",{cache:"no-store"}),h=await health.json();
  const runtime=await text("/cinema-runtime-v23.js"),sw=await text("/sw.js");
  const route=await fetch(base+"/api/cinema/status",{cache:"no-store"}),routeBody=await route.text();
  const ok=health.ok&&h.ok===true&&h.cinemaEngine==="v23-pilot"&&h.cinemaVideoModel==="minimax/hailuo-2.3-fast"&&runtime.r.ok&&runtime.body.includes("combinations:27")&&runtime.body.includes("clipSlots:9")&&runtime.body.includes("URL.createObjectURL")&&sw.r.ok&&sw.body.includes("/cinema-runtime-v23.js")&&sw.body.includes('const CINEMA="pilot1"')&&route.status===401&&routeBody.includes("Device credentials missing");
  console.log(`${ok?"PASS":"WAIT"} V23 cinema live attempt ${attempt}/12 health=${health.status} runtime=${runtime.r.status} route=${route.status}`);
  if(ok){passed=true;break}last=JSON.stringify({h,runtime:runtime.body.slice(0,120),sw:sw.body.slice(0,120),route:routeBody.slice(0,120)})
 }catch(e){last=e.message;console.log(`WAIT V23 cinema live attempt ${attempt}/12 ${e.message}`)}
 if(attempt<12)await sleep(5000)
}
if(!passed){console.error("P2 V23 Cinema Room live verification failed",last);process.exit(1)}
console.log("DEPLOYMENT VERIFIED P2 V23 CINEMA PILOT: 9 CLIPS -> 27 FLOWS, NO PAID GENERATION TRIGGERED");
