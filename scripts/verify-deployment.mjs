import fs from "node:fs";

let base=process.argv[2];
if(!base && fs.existsSync("deployment.url.txt"))base=fs.readFileSync("deployment.url.txt","utf8").trim();
if(!base){
  console.error("Usage: node scripts/verify-deployment.mjs https://your-worker.workers.dev");
  process.exit(2);
}
base=base.replace(/\/$/,"");

const checks=[];
async function test(name,path,predicate){
  try{
    const r=await fetch(base+path,{cache:"no-store"});
    const body=await r.text();
    let data=null;try{data=JSON.parse(body)}catch{}
    const ok=r.ok&&predicate(r,data,body);
    checks.push({name,ok,status:r.status,data});
  }catch(e){
    checks.push({name,ok:false,error:e.message});
  }
}

await test("home","/",(r,d,b)=>b.includes("내 삶 시작하기"));
await test("health","/api/health",(r,d)=>d?.ok===true&&d?.ai===true&&d?.d1===true&&d?.r2===true);
await test("manifest","/manifest.webmanifest",(r,d,b)=>b.includes("나의 방"));
await test("service-worker","/sw.js",(r,d,b)=>b.includes("my-life-room"));

for(const c of checks){
  console.log(`${c.ok?"PASS":"FAIL"} ${c.name}`,c.status||"",c.error||"");
  if(c.data)console.log(JSON.stringify(c.data));
}
if(checks.some(c=>!c.ok))process.exit(1);
console.log("DEPLOYMENT VERIFIED");
