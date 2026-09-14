import fs from "node:fs";
import {execFileSync} from "node:child_process";

const s=JSON.parse(fs.readFileSync("deploy.settings.json","utf8"));
const V40_MASTER_IDS=[
  "master_01_sofa_relax","master_02_window_gaze","master_03_pet_touch","master_04_return_home",
  "master_05_sit_down","master_06_walk_to_window","master_07_morning_life","master_08_night_rest"
];

function run(args,{allowFail=false}={}){
  try{
    const out=execFileSync("npx",["wrangler",...args],{encoding:"utf8",stdio:["inherit","pipe","pipe"]});
    process.stdout.write(out);
    return out;
  }catch(e){
    const msg=(e.stdout||"")+(e.stderr||"");
    process.stderr.write(msg);
    if(!allowFail)throw e;
    return msg;
  }
}

function seedV40Masters(){
  const dir="seed/master-scenes-v40";
  for(const id of V40_MASTER_IDS){
    const file=`${dir}/${id}.webp`;
    if(!fs.existsSync(file))throw new Error(`Missing V40 master seed: ${file}`);
    console.log(`Seeding V40 master: ${id}`);
    run([
      "r2","object","put",`${s.r2_name}/master-scenes/v40/${id}.webp`,
      "--file",file,
      "--content-type","image/webp",
      "--cache-control","public, max-age=86400",
      "--remote",
      "--force"
    ]);
  }
}
function ensureV42Frames(){
  const report="public/master-frames-v42/generation-report.json";
  let valid=false;
  try{const d=JSON.parse(fs.readFileSync(report,"utf8"));valid=d?.version==="v42-real-frame-sequence"&&d?.frameCount===64&&d?.fakeMotion===false&&d?.paidVideo===false}catch{}
  if(valid){console.log("V42 intermediate images already prepared: 64 frames");return}
  execFileSync("node",["scripts/generate-v42-frames.mjs"],{stdio:"inherit"});
}

console.log("=== My Life Room V13 Cloudflare prepare ===");
console.log("1) Wrangler account check");
run(["whoami"]);

console.log("\n2) D1 database create/check");
let d1Out=run(["d1","create",s.d1_name,"--location","apac"],{allowFail:true});

let databaseId=null;
const patterns=[
  /database_id\s*=\s*"([^"]+)"/i,
  /"database_id"\s*:\s*"([^"]+)"/i,
  /([0-9a-f]{8}-[0-9a-f-]{27,})/i
];
for(const re of patterns){
  const m=d1Out.match(re);
  if(m){databaseId=m[1];break}
}

if(!databaseId){
  console.log("D1 may already exist. Reading list...");
  const list=run(["d1","list","--json"],{allowFail:true});
  try{
    const arr=JSON.parse(list);
    const hit=arr.find(x=>x.name===s.d1_name);
    if(hit)databaseId=hit.uuid||hit.id||hit.database_id;
  }catch{}
}
if(!databaseId){
  throw new Error("Could not determine D1 database id. Stop before modifying config.");
}
console.log("D1 id found:",databaseId);

console.log("\n3) R2 bucket create/check");
run(["r2","bucket","create",s.r2_name],{allowFail:true});

console.log("\n4) Writing production wrangler config");
const base=JSON.parse(fs.readFileSync("wrangler.jsonc","utf8"));
base.name=s.worker_name;
base.ai={binding:s.ai_binding};
base.d1_databases=[{
  binding:s.d1_binding,
  database_name:s.d1_name,
  database_id:databaseId
}];
base.r2_buckets=[{
  binding:s.r2_binding,
  bucket_name:s.r2_name
}];
fs.writeFileSync("wrangler.production.jsonc",JSON.stringify(base,null,2));

console.log("\n5) Preparing P2 V42 real intermediate images");
ensureV42Frames();

console.log("\n6) Seeding canonical P2 V40 master scenes into R2");
seedV40Masters();

console.log("\n7) Applying D1 migrations remotely");
run(["d1","migrations","apply",s.d1_name,"--remote","--config","wrangler.production.jsonc"]);

console.log("\n8) Local preflight");
execFileSync("node",["preflight.mjs"],{stdio:"inherit"});

console.log("\n9) Deploying new Worker");
const deployOut=run(["deploy","--config","wrangler.production.jsonc"]);

const urlMatch=deployOut.match(/https:\/\/[A-Za-z0-9.-]+\.workers\.dev(?:\/\S*)?/);
if(urlMatch){
  fs.writeFileSync("deployment.url.txt",urlMatch[0].replace(/[),.]+$/,""));
  console.log("Deployment URL saved:",urlMatch[0]);
}else{
  console.log("Deployment finished. URL could not be parsed automatically; use Wrangler output.");
}

console.log("\n=== Prepare/deploy complete ===");
