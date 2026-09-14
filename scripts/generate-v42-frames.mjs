import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {spawnSync} from "node:child_process";

const VERSION="v42-real-frame-sequence";
const MASTER_DIR="seed/master-scenes-v40";
const OUT_ROOT="public/master-frames-v42";
const routes=[
  {id:"return_to_sit",from:"master_04_return_home",to:"master_05_sit_down",count:8,mode:"flow"},
  {id:"sit_to_relax",from:"master_05_sit_down",to:"master_01_sofa_relax",count:6,mode:"flow"},
  {id:"relax_to_pet",from:"master_01_sofa_relax",to:"master_03_pet_touch",count:6,mode:"flow"},
  {id:"pet_to_relax",from:"master_03_pet_touch",to:"master_01_sofa_relax",count:6,mode:"flow"},
  {id:"relax_to_walk",from:"master_01_sofa_relax",to:"master_06_walk_to_window",count:8,mode:"flow"},
  {id:"walk_to_window",from:"master_06_walk_to_window",to:"master_02_window_gaze",count:8,mode:"flow"},
  {id:"window_to_relax",from:"master_02_window_gaze",to:"master_01_sofa_relax",count:8,mode:"flow"},
  {id:"relax_to_night",from:"master_01_sofa_relax",to:"master_08_night_rest",count:6,mode:"fade"},
  {id:"night_to_morning",from:"master_08_night_rest",to:"master_07_morning_life",count:8,mode:"fade"}
];

function run(cmd,args,label){
  const r=spawnSync(cmd,args,{encoding:"utf8",stdio:["ignore","pipe","pipe"]});
  if(r.status!==0)throw new Error(`${label} failed: ${(r.stderr||r.stdout||"").slice(-4000)}`);
  return r;
}
function master(id){const p=path.join(MASTER_DIR,`${id}.webp`);if(!fs.existsSync(p))throw new Error(`Missing master: ${p}`);return p}
function cleanDir(dir){fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true})}
function selectedIndices(total,count){
  if(total<count+2)throw new Error(`Need at least ${count+2} generated frames, got ${total}`);
  const out=[];
  for(let i=1;i<=count;i++)out.push(Math.max(1,Math.min(total-2,Math.round(i*(total-1)/(count+1)))));
  return out;
}
function generateRaw(a,b,mode,tmp){
  const pattern=path.join(tmp,"raw-%03d.webp");
  if(mode==="flow"){
    const seq=path.join(tmp,"source-%03d.webp");
    fs.copyFileSync(a,path.join(tmp,"source-000.webp"));
    fs.copyFileSync(b,path.join(tmp,"source-001.webp"));
    run("ffmpeg",[
      "-hide_banner","-loglevel","error","-y",
      "-framerate","1","-start_number","0","-i",seq,
      "-vf","minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1",
      "-t","1","-frames:v","24","-c:v","libwebp","-q:v","78","-compression_level","4",pattern
    ],"V42 optical-flow interpolation");
  }else{
    run("ffmpeg",[
      "-hide_banner","-loglevel","error","-y",
      "-loop","1","-t","1","-i",a,
      "-loop","1","-t","1","-i",b,
      "-filter_complex","[0:v][1:v]xfade=transition=fade:duration=1:offset=0,fps=24",
      "-t","1","-frames:v","24","-c:v","libwebp","-q:v","78","-compression_level","4",pattern
    ],"V42 time-transition interpolation");
  }
  return fs.readdirSync(tmp).filter(x=>/^raw-\d+\.webp$/.test(x)).sort().map(x=>path.join(tmp,x));
}

run("ffmpeg",["-version"],"ffmpeg availability");
cleanDir(OUT_ROOT);
let total=0;
for(const route of routes){
  const outDir=path.join(OUT_ROOT,route.id);fs.mkdirSync(outDir,{recursive:true});
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),`p2-v42-${route.id}-`));
  try{
    const raw=generateRaw(master(route.from),master(route.to),route.mode,tmp);
    const picks=selectedIndices(raw.length,route.count);
    picks.forEach((idx,i)=>{
      const dest=path.join(outDir,`${String(i+1).padStart(2,"0")}.webp`);
      fs.copyFileSync(raw[idx],dest);
      const bytes=fs.statSync(dest).size;if(bytes<700)throw new Error(`Generated frame too small: ${dest} ${bytes}`);
      total+=bytes;
    });
    console.log(`V42 ${route.id}: ${route.count} real intermediate images (${route.mode})`);
  }finally{fs.rmSync(tmp,{recursive:true,force:true})}
}
const report={version:VERSION,routeCount:routes.length,frameCount:routes.reduce((a,r)=>a+r.count,0),bytes:total,fakeMotion:false,paidVideo:false,method:"ffmpeg optical-flow / still-frame interpolation"};
fs.writeFileSync(path.join(OUT_ROOT,"generation-report.json"),JSON.stringify(report,null,2));
console.log(`P2 V42 FRAME GENERATION COMPLETE: routes=${report.routeCount} frames=${report.frameCount} bytes=${report.bytes}`);
