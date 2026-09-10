const base=(process.argv[2]||process.env.PRODUCTION_URL||"").replace(/\/$/,"");
if(!base){console.error("Production URL is required.");process.exit(2)}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const specs=[
  ["home","/",async r=>(await r.text()).includes("내 삶 시작하기")],
  ["health","/api/health",async r=>{const d=await r.json();return d?.ok===true&&d?.ai===true&&d?.d1===true&&d?.r2===true&&d?.lifeEngine===true&&d?.poseEngine==="v20"}],
  ["pose-runtime","/pose-runtime-v20.js",async r=>{const b=await r.text();return b.includes("poseV20")&&b.includes("ensurePose")}],
  ["service-worker","/sw.js",async r=>{const b=await r.text();return b.includes("my-life-room-v20-shell")&&b.includes("/pose-runtime-v20.js")}],
  ["manifest","/manifest.webmanifest",async r=>(await r.text()).includes("나의 방")]
];
async function check(name,path,predicate){try{const u=new URL(base+path);u.searchParams.set("health_ts",Date.now().toString());const r=await fetch(u,{cache:"no-store",headers:{"cache-control":"no-cache"}});return {name,status:r.status,ok:r.ok&&await predicate(r)}}catch(error){return {name,status:0,ok:false,error:error.message}}}
let last=[];
for(let attempt=1;attempt<=4;attempt++){
  console.log(`Live health attempt ${attempt}/4: ${base}`);
  last=[];
  for(const [name,path,predicate] of specs){const result=await check(name,path,predicate);last.push(result);console.log(`${result.ok?"PASS":"WAIT"} ${name} ${result.status||""} ${result.error||""}`)}
  if(last.every(x=>x.ok)){console.log("LIVE HEALTH VERIFIED V20");process.exit(0)}
  if(attempt<4)await sleep(5000);
}
console.error("Live health verification failed after retries.");
for(const r of last.filter(x=>!x.ok))console.error(`${r.name}: status=${r.status} error=${r.error||"predicate failed"}`);
process.exit(1);
