import fs from "node:fs";
let base=process.argv[2];
if(!base&&fs.existsSync("deployment.url.txt"))base=fs.readFileSync("deployment.url.txt","utf8").trim();
if(!base){console.error("Usage: node scripts/verify-v26-live.mjs https://worker.workers.dev");process.exit(2)}
base=base.replace(/\/$/,"");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function text(path){const u=new URL(base+path);u.searchParams.set("v26_verify",Date.now().toString());const r=await fetch(u,{cache:"no-store",headers:{"cache-control":"no-cache"}});return {r,body:await r.text()}}
let last="";
for(let attempt=1;attempt<=12;attempt++){
 try{
  const [healthRes,avatar,motion,sw]=await Promise.all([fetch(base+"/api/health",{cache:"no-store"}),text("/avatar-runtime-v15.js"),text("/motion-runtime-v26.js"),text("/sw.js")]);
  const h=await healthRes.json().catch(()=>({}));
  const motionStatus=await fetch(base+"/api/motion/status",{cache:"no-store"}),motionStatusBody=await motionStatus.text();
  const hybrid=await fetch(base+"/api/avatar/hybrid-current",{method:"POST",cache:"no-store"}),hybridBody=await hybrid.text();
  const motionGenerate=await fetch(base+"/api/motion/generate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({slot:"walk-sit"}),cache:"no-store"}),motionGenerateBody=await motionGenerate.text();
  const staticOk=avatar.r.ok&&avatar.body.includes("30:70 애니영화형")&&avatar.body.includes("loadMotion26")&&avatar.body.includes("motion-runtime-v26.js?v=26")&&motion.r.ok&&motion.body.includes("v26-natural-motion")&&motion.body.includes("walk-sit")&&motion.body.includes("stand-walk")&&motion.body.includes("pet-touch")&&motion.body.includes("startAmbient")&&motion.body.includes("/api/avatar/hybrid-current")&&motion.body.includes("/api/motion/generate")&&sw.r.ok&&sw.body.includes("my-life-room-v26-shell")&&sw.body.includes("hybrid-30-real-70-animation-v26")&&sw.body.includes("/motion-runtime-v26.js");
  const infraOk=healthRes.ok&&h.ok===true&&h.ai===true&&h.d1===true&&h.r2===true;
  const routeOk=motionStatus.status===401&&motionStatusBody.includes("Device credentials missing")&&hybrid.status===401&&hybridBody.includes("Device credentials missing")&&motionGenerate.status===401&&motionGenerateBody.includes("Device credentials missing");
  const ok=staticOk&&infraOk&&routeOk;
  console.log(`${ok?"PASS":"WAIT"} V26 live attempt ${attempt}/12 health=${healthRes.status} avatar=${avatar.r.status} motion=${motion.r.status} sw=${sw.r.status} motionRoute=${motionStatus.status} hybridRoute=${hybrid.status}`);
  if(ok){console.log("DEPLOYMENT VERIFIED P2 V26 HYBRID 30/70 + NATURAL MOTION ROUTES, ZERO PAID VIDEO GENERATION TRIGGERED");process.exit(0)}
  last=JSON.stringify({h,avatar:avatar.body.slice(0,160),motion:motion.body.slice(0,200),sw:sw.body.slice(0,200),motionStatus:motionStatusBody.slice(0,120),hybrid:hybridBody.slice(0,120),motionGenerate:motionGenerateBody.slice(0,120)})
 }catch(e){last=e.message;console.log(`WAIT V26 live attempt ${attempt}/12 ${e.message}`)}
 if(attempt<12)await sleep(5000)
}
console.error("P2 V26 live verification failed",last);process.exit(1);
