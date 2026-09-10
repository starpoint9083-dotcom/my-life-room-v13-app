import fs from "node:fs";

let base=process.argv[2];
if(!base && fs.existsSync("deployment.url.txt"))base=fs.readFileSync("deployment.url.txt","utf8").trim();
if(!base){
  console.error("Usage: node scripts/verify-deployment.mjs https://your-worker.workers.dev");
  process.exit(2);
}
base=base.replace(/\/$/,"");

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const specs=[
  ["home","/",(r,d,b)=>b.includes("내 삶 시작하기")],
  ["health","/api/health",(r,d)=>d?.ok===true&&d?.ai===true&&d?.d1===true&&d?.r2===true],
  ["manifest","/manifest.webmanifest",(r,d,b)=>b.includes("나의 방")],
  ["service-worker","/sw.js",(r,d,b)=>b.includes("my-life-room")]
];

async function runCheck(name,path,predicate){
  try{
    const u=new URL(base+path);
    u.searchParams.set("verify_ts",Date.now().toString());
    const r=await fetch(u,{cache:"no-store",headers:{"cache-control":"no-cache"}});
    const body=await r.text();
    let data=null;try{data=JSON.parse(body)}catch{}
    return {name,ok:r.ok&&predicate(r,data,body),status:r.status,data,bodyPreview:body.slice(0,180)};
  }catch(e){
    return {name,ok:false,error:e.message};
  }
}

let last=[];
for(let attempt=1;attempt<=12;attempt++){
  console.log(`Verification attempt ${attempt}/12: ${base}`);
  last=[];
  for(const [name,path,predicate] of specs){
    const c=await runCheck(name,path,predicate);
    last.push(c);
    console.log(`${c.ok?"PASS":"WAIT"} ${c.name}`,c.status||"",c.error||"");
    if(c.data)console.log(JSON.stringify(c.data));
    if(!c.ok&&c.bodyPreview)console.log(c.bodyPreview);
  }
  if(last.every(c=>c.ok)){
    console.log("DEPLOYMENT VERIFIED");
    process.exit(0);
  }
  if(attempt<12)await sleep(5000);
}

console.error("Deployment verification failed after 60 seconds.");
for(const c of last)console.error(`${c.name}: status=${c.status||"n/a"} error=${c.error||""}`);
process.exit(1);
