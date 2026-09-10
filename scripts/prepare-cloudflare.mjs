import fs from "node:fs";
import {execFileSync} from "node:child_process";

const s=JSON.parse(fs.readFileSync("deploy.settings.json","utf8"));

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

console.log("\n5) Applying D1 migrations remotely");
run(["d1","migrations","apply",s.d1_name,"--remote","--config","wrangler.production.jsonc"]);

console.log("\n6) Local preflight");
execFileSync("node",["preflight.mjs"],{stdio:"inherit"});

console.log("\n7) Deploying new Worker");
const deployOut=run(["deploy","--config","wrangler.production.jsonc"]);

const urlMatch=deployOut.match(/https:\/\/[A-Za-z0-9.-]+\.workers\.dev(?:\/\S*)?/);
if(urlMatch){
  fs.writeFileSync("deployment.url.txt",urlMatch[0].replace(/[),.]+$/,""));
  console.log("Deployment URL saved:",urlMatch[0]);
}else{
  console.log("Deployment finished. URL could not be parsed automatically; use Wrangler output.");
}

console.log("\n=== Prepare/deploy complete ===");
