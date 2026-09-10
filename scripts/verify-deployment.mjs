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
  ["home","/",(r,d,b)=>b.includes("내 삶 시작하기")&&b.includes("/runtime-v14.js")&&b.includes("/avatar-runtime-v15.js")&&b.includes("/reset-runtime-v16.js")],
  ["health","/api/health",(r,d)=>d?.ok===true&&d?.ai===true&&d?.d1===true&&d?.r2===true&&d?.lifeEngine===true&&d?.avatarEngine==="v15"&&d?.resetEngine==="v16"],
  ["runtime","/runtime-v14.js",(r,d,b)=>b.includes("실사용 엔진")&&b.includes("syncDaily")&&b.includes("맑은 나의 메시지")],
  ["avatar-runtime","/avatar-runtime-v15.js",(r,d,b)=>b.includes("progressiveGenerate")&&b.includes("AbortController")&&b.includes("실패한 후보만 이어서")],
  ["reset-runtime","/reset-runtime-v16.js",(r,d,b)=>b.includes("fullReset")&&b.includes("/api/life/reset")&&b.includes("localStorage.clear()")&&b.includes("window.resetAll=fullReset")],
  ["manifest","/manifest.webmanifest",(r,d,b)=>b.includes("나의 방")],
  ["service-worker","/sw.js",(r,d,b)=>b.includes("my-life-room-v16-shell")&&b.includes("/avatar-runtime-v15.js")&&b.includes("/reset-runtime-v16.js")]
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

async function jsonCall(path,{method="GET",body,headers={}}={}){
  const r=await fetch(base+path,{
    method,
    cache:"no-store",
    headers:{"cache-control":"no-cache",...headers},
    body:body===undefined?undefined:JSON.stringify(body)
  });
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d.ok)throw new Error(`${method} ${path} failed: ${r.status} ${JSON.stringify(d).slice(0,220)}`);
  return d;
}

async function saveTestAvatar(deviceId,deviceToken){
  const fd=new FormData();
  fd.append("image",new Blob(["reset-r2-test"],{type:"image/jpeg"}),"reset-test.jpg");
  fd.append("style","나답게");
  fd.append("device_id",deviceId);
  fd.append("device_token",deviceToken);
  const r=await fetch(base+"/api/avatar/save",{method:"POST",body:fd,cache:"no-store"});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d.ok||d.stored!==true||!d.key)throw new Error(`R2 test avatar save failed: ${r.status} ${JSON.stringify(d).slice(0,300)}`);
  return d;
}

async function verifyLifeEngine(){
  const suffix=`${Date.now()}-${Math.floor(Math.random()*1e6)}`;
  const deviceId=`ci-verify-${suffix}`;
  const deviceToken=`ci.${crypto.randomUUID().replaceAll("-","")}.${crypto.randomUUID().replaceAll("-","")}`;
  const auth={"x-device-id":deviceId,"x-device-token":deviceToken,"content-type":"application/json"};
  const date=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());

  await jsonCall(`/api/life/summary?date=${date}`,{headers:auth});
  await jsonCall("/api/life/profile",{method:"POST",headers:auth,body:{alcohol_start_date:date,smoking_start_date:date,alcohol_daily_cost:1000,smoking_daily_cost:500}});
  await jsonCall("/api/life/daily",{method:"POST",headers:auth,body:{date,alcohol_result:"success"}});
  await jsonCall("/api/life/smoking",{method:"POST",headers:auth,body:{date,count:0,baseline:20}});
  await jsonCall("/api/life/condition",{method:"POST",headers:auth,body:{date,score:8}});
  await jsonCall("/api/life/message",{method:"POST",headers:auth,body:{text:"CI live-room verification message"}});
  await jsonCall("/api/state",{method:"POST",headers:auth,body:{state:{habit:"둘 다",P:999,saved:12345}}});
  await jsonCall("/api/event",{method:"POST",headers:auth,body:{type:"ci-reset-test",payload:{ok:true}}});
  await jsonCall("/api/signal",{method:"POST",headers:auth,body:{kind:"smoking_count",amount:3,local_hour:20,weekday:4,meta:{ci:true}}});
  const avatar=await saveTestAvatar(deviceId,deviceToken);

  const d=await jsonCall(`/api/life/summary?date=${date}`,{headers:auth});
  const s=d.summary||{},t=s.today||{};
  const ok=s.dryStreak>=1&&s.smokeStreak>=1&&t.alcohol_result==="success"&&Number(t.smoking_count)===0&&Number(t.condition_score)===8&&s.latestMessage==="CI live-room verification message";
  if(!ok)throw new Error(`life engine state mismatch before reset: ${JSON.stringify(s).slice(0,600)}`);
  console.log(`PASS life-engine D1 read/write streaks dry=${s.dryStreak} smoke=${s.smokeStreak}`);
  console.log(`PASS R2 avatar saved before reset key=${avatar.key}`);

  const reset=await jsonCall("/api/life/reset",{method:"POST",headers:auth});
  if(reset.reset!==true)throw new Error(`reset endpoint did not confirm reset: ${JSON.stringify(reset)}`);
  if(Number(reset.r2Deleted)<1)throw new Error(`reset did not delete R2 avatar: ${JSON.stringify(reset)}`);

  const alternateToken=`ci.alt.${crypto.randomUUID().replaceAll("-","")}.${crypto.randomUUID().replaceAll("-","")}`;
  const altAuth={"x-device-id":deviceId,"x-device-token":alternateToken,"content-type":"application/json"};
  const stateAfter=await jsonCall("/api/state",{headers:altAuth});
  if(stateAfter.state!==null)throw new Error(`state survived reset: ${JSON.stringify(stateAfter.state).slice(0,300)}`);
  const summaryAfter=(await jsonCall(`/api/life/summary?date=${date}`,{headers:altAuth})).summary||{};
  if(summaryAfter.profile!==null||summaryAfter.today!==null||summaryAfter.latestMessage!==null||Number(summaryAfter.dryStreak)!==0||Number(summaryAfter.smokeStreak)!==0||Number(summaryAfter.savedEstimate)!==0){
    throw new Error(`life data survived reset: ${JSON.stringify(summaryAfter).slice(0,600)}`);
  }
  const riskAfter=(await jsonCall("/api/risk-profile",{headers:altAuth})).profile||{};
  if(Number(riskAfter.sampleCount)!==0)throw new Error(`habit signals survived reset: ${JSON.stringify(riskAfter)}`);
  console.log("PASS full reset clears D1 state/life/signals, R2 avatar, and old device auth");
}

let last=[];
let shellReady=false;
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
  if(last.every(c=>c.ok)){shellReady=true;break}
  if(attempt<12)await sleep(5000);
}

if(!shellReady){
  console.error("Deployment verification failed after 60 seconds.");
  for(const c of last)console.error(`${c.name}: status=${c.status||"n/a"} error=${c.error||""}`);
  process.exit(1);
}

let lifeOk=false,lastLifeError="";
for(let attempt=1;attempt<=3;attempt++){
  try{await verifyLifeEngine();lifeOk=true;break}
  catch(e){lastLifeError=e.message;console.log(`WAIT life-engine/reset attempt ${attempt}/3: ${lastLifeError}`);if(attempt<3)await sleep(3000)}
}
if(!lifeOk){console.error(`Life engine/reset end-to-end verification failed: ${lastLifeError}`);process.exit(1)}

console.log("DEPLOYMENT VERIFIED");