import fs from "node:fs";
let base=process.argv[2];
if(!base&&fs.existsSync("deployment.url.txt"))base=fs.readFileSync("deployment.url.txt","utf8").trim();
if(!base){console.error("Usage: node scripts/verify-v22-live.mjs https://your-worker.workers.dev");process.exit(2)}
base=base.replace(/\/$/,"");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const specs=[
 ["core-v21","/core-runtime-v21.js",b=>b.includes("p2CoreV21")&&b.includes("riskState")&&b.includes("maybeNotify")&&b.includes("/api/life/summary")],
 ["continuity-v22","/continuity-runtime-v22.js",b=>b.includes("p2ContinuityV22")&&b.includes("seedHidden")&&b.includes("installRewardGuards")&&b.includes("syncOverallResult")&&b.includes("continuity-v22")],
 ["visual-cleanup2-v22","/visual-runtime-v17.js",b=>b.includes("removeUniformBackground")&&b.includes("keepPrimaryComponent")&&b.includes("safe-cutout-v2")&&b.includes('visual17SegmentationVersion="v22-clean2"')&&b.includes("visual17GetMasterCutout")&&!b.includes("dr*dr+dg*dg+db*db<6400")],
 ["pose-safe-v22","/pose-runtime-v20.js",b=>b.includes("visual17RestoreMaster")&&b.includes("visual17GetMasterCutout")&&b.includes("visual integrity engine not ready")&&!b.includes("img.src=selectedAvatar")&&!b.includes("dr*dr+dg*dg+db*db<7200")],
 ["reset-v22-loader","/reset-runtime-v16.js",b=>b.includes("loadP2Continuity")&&b.includes("continuity-runtime-v22.js?v=22")&&b.includes("data-p2-continuity")],
 ["service-worker-v26-shell","/sw.js",b=>b.includes("my-life-room-v26-shell")&&b.includes('const BUILD="visualfix1"')&&b.includes('const PATCH="cleanup2"')&&b.includes("/core-runtime-v21.js")&&b.includes("/continuity-runtime-v22.js")&&b.includes("/cinema-background-v23.js")&&b.includes("/motion-runtime-v26.js")]
];
async function check(name,path,predicate){try{const u=new URL(base+path);u.searchParams.set("v22_verify",Date.now().toString());const r=await fetch(u,{cache:"no-store",headers:{"cache-control":"no-cache"}}),body=await r.text();return {name,status:r.status,ok:r.ok&&predicate(body),preview:body.slice(0,160)}}catch(e){return {name,status:0,ok:false,error:e.message}}}
let last=[];
for(let attempt=1;attempt<=12;attempt++){
 console.log(`V22 live verification attempt ${attempt}/12: ${base}`);last=[];
 for(const [name,path,predicate] of specs){const r=await check(name,path,predicate);last.push(r);console.log(`${r.ok?"PASS":"WAIT"} ${r.name} ${r.status||""} ${r.error||""}`)}
 if(last.every(x=>x.ok)){console.log("DEPLOYMENT VERIFIED P2 V22 CONTINUITY + VISUAL CLEANUP2 UNDER V26 SHELL");process.exit(0)}
 if(attempt<12)await sleep(5000);
}
console.error("P2 V22 live verification failed after retries.");for(const r of last)console.error(`${r.name}: status=${r.status} error=${r.error||""} preview=${r.preview||""}`);process.exit(1);
