import fs from "node:fs";

let base=process.env.DEPLOYMENT_URL||process.env.WORKER_URL||"";
if(!base&&fs.existsSync("deployment.url.txt"))base=fs.readFileSync("deployment.url.txt","utf8").trim();
if(!base)base="https://my-life-room-v13-live-0910.starpoint9083.workers.dev";
base=base.replace(/\/$/,"");

const VERSION="v40-eight-master-assets";
const IDS=[
  "master_01_sofa_relax","master_02_window_gaze","master_03_pet_touch","master_04_return_home",
  "master_05_sit_down","master_06_walk_to_window","master_07_morning_life","master_08_night_rest"
];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function urlFor(path){
  const url=new URL(base+path);
  url.searchParams.set("v40_verify",Date.now().toString());
  return url;
}
async function getText(path){
  const r=await fetch(urlFor(path),{redirect:"follow",cache:"no-store",headers:{"cache-control":"no-cache"}});
  const body=await r.text();
  if(!r.ok)throw new Error(`${path} ${r.status} ${body.slice(0,180)}`);
  return {r,body};
}
async function getJson(path){
  const {r,body}=await getText(path);
  let data;
  try{data=JSON.parse(body)}catch{throw new Error(`${path} returned non-JSON: ${body.slice(0,180)}`)}
  return {r,data};
}
async function getMasterFile(id){
  const r=await fetch(urlFor(`/api/master-scenes/file?id=${encodeURIComponent(id)}`),{redirect:"follow",cache:"no-store",headers:{"cache-control":"no-cache"}});
  if(!r.ok){const body=await r.text().catch(()=>"");throw new Error(`master ${id} ${r.status} ${body.slice(0,180)}`)}
  const type=String(r.headers.get("content-type")||"").toLowerCase();
  const marker=r.headers.get("x-p2-master-scene")||"";
  const bytes=(await r.arrayBuffer()).byteLength;
  if(!type.includes("image/webp"))throw new Error(`master ${id} content-type=${type||"missing"}`);
  if(marker!==id)throw new Error(`master ${id} marker=${marker||"missing"}`);
  if(bytes<=0)throw new Error(`master ${id} empty body`);
  return bytes;
}

let last="";
for(let attempt=1;attempt<=12;attempt++){
  try{
    const [{data:info},{data:status},{data:manifest},runtime,css]=await Promise.all([
      getJson("/api/master-scenes/info"),
      getJson("/api/master-scenes/status"),
      getJson("/master-scenes-v40-manifest.json?v=40"),
      getText("/master-scenes-v40.js?v=42-master-only"),
      getText("/master-scenes-v40.css?v=42-master-only")
    ]);

    if(info.ok!==true||info.version!==VERSION||info.masterCount!==8||info.freeOnly!==true||info.paidGeneration!==false||info.r2!==true)throw new Error("V40 info mismatch");
    if(status.ok!==true||status.version!==VERSION||status.readyCount!==8||status.total!==8||status.freeOnly!==true||status.paidGeneration!==false)throw new Error(`V40 status not ready ${status.readyCount}/${status.total}`);
    if(!Array.isArray(status.assets)||status.assets.length!==8)throw new Error("V40 status asset list mismatch");
    for(const id of IDS){const a=status.assets.find(x=>x.id===id);if(!a?.ready||Number(a.size||0)<=0)throw new Error(`V40 status asset missing ${id}`)}

    if(manifest.version!==VERSION||manifest.masterCount!==8||manifest.freeOnly!==true||manifest.paidGeneration!==false||!Array.isArray(manifest.masters)||manifest.masters.length!==8)throw new Error("V40 manifest mismatch");
    for(const id of IDS){const m=manifest.masters.find(x=>x.id===id);if(!m)throw new Error(`V40 manifest missing ${id}`);if(m.src!==`/api/master-scenes/file?id=${id}`)throw new Error(`V40 manifest route mismatch ${id}`)}
    if(!runtime.body.includes(VERSION)||!runtime.body.includes("p2:master-scene-v40-show")||!runtime.body.includes("masterScene40")||!runtime.body.includes("master40-shell"))throw new Error("V40 master-only runtime markers missing");
    if(!css.body.includes("masterScene40")||!css.body.includes("master40-shell")||!css.body.includes("Old room/avatar/pet/fake-motion layers must never reappear"))throw new Error("V40 master-only CSS markers missing");

    const sizes=[];
    for(const id of IDS)sizes.push(await getMasterFile(id));
    const totalBytes=sizes.reduce((a,b)=>a+b,0);
    console.log(`PASS V40 master-only live attempt ${attempt}/12 ready=${status.readyCount}/${status.total} files=8/8 bytes=${totalBytes}`);
    console.log("DEPLOYMENT VERIFIED P2 V40 MASTER-ONLY: 8 CANONICAL R2 MASTERS + PINNED ROOM SHELL + LEGACY VISUAL LAYERS SUPPRESSED + ZERO PAID GENERATION");
    process.exit(0);
  }catch(error){
    last=error?.message||String(error);
    console.log(`WAIT V40 master-only live attempt ${attempt}/12 ${last}`);
  }
  if(attempt<12)await sleep(5000);
}
console.error("P2 V40 master-only live verification failed",last);
process.exit(1);
