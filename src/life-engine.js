import {handleVisualRoute} from "./visual-engine.js";

function safeDate(value){
  const s=String(value||"").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:null;
}
function safeInt(value,min,max,def=0){
  const n=Number(value);
  if(!Number.isFinite(n))return def;
  return Math.max(min,Math.min(max,Math.round(n)));
}
function todaySeoul(){
  return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
function dateDiffInclusive(start,end){
  const a=new Date(start+"T00:00:00Z"),b=new Date(end+"T00:00:00Z");
  if(Number.isNaN(a)||Number.isNaN(b)||b<a)return 0;
  return Math.floor((b-a)/86400000)+1;
}
function previousDate(date){
  const d=new Date(date+"T00:00:00Z"); d.setUTCDate(d.getUTCDate()-1);
  return d.toISOString().slice(0,10);
}
function explicitStreak(rows,field,predicate,refDate){
  const byDate=new Map(rows.map(r=>[r.local_date,r]));
  let cursor=byDate.has(refDate)?refDate:previousDate(refDate),n=0;
  while(byDate.has(cursor)&&predicate(byDate.get(cursor)[field])){
    n++; cursor=previousDate(cursor);
  }
  return n;
}
function startBasedStreak(rows,startDate,field,isFailure,refDate){
  if(!startDate||startDate>refDate)return null;
  const failures=rows.filter(r=>r.local_date>=startDate&&r.local_date<=refDate&&isFailure(r[field])).sort((a,b)=>b.local_date.localeCompare(a.local_date));
  const start=failures.length?new Date(new Date(failures[0].local_date+"T00:00:00Z").getTime()+86400000).toISOString().slice(0,10):startDate;
  return dateDiffInclusive(start,refDate);
}
async function getProfile(env,deviceId){
  return await env.DB.prepare("SELECT alcohol_start_date,smoking_start_date,alcohol_daily_cost,smoking_daily_cost FROM life_profiles WHERE device_id=?1").bind(deviceId).first();
}
async function getRows(env,deviceId){
  const r=await env.DB.prepare("SELECT local_date,alcohol_result,smoking_count,smoking_baseline,condition_score FROM life_daily WHERE device_id=?1 ORDER BY local_date DESC LIMIT 180").bind(deviceId).all();
  return r.results||[];
}
async function summary(env,deviceId,refDate){
  const [profile,rows,msg]=await Promise.all([
    getProfile(env,deviceId),
    getRows(env,deviceId),
    env.DB.prepare("SELECT body,created_at FROM clear_messages WHERE device_id=?1 ORDER BY id DESC LIMIT 1").bind(deviceId).first()
  ]);
  const dryStart=startBasedStreak(rows,profile?.alcohol_start_date,"alcohol_result",v=>v==="reduce"||v==="slip",refDate);
  const smokeStart=startBasedStreak(rows,profile?.smoking_start_date,"smoking_count",v=>Number(v)>0,refDate);
  const dryStreak=dryStart??explicitStreak(rows,"alcohol_result",v=>v==="success",refDate);
  const smokeStreak=smokeStart??explicitStreak(rows,"smoking_count",v=>Number(v)===0,refDate);
  const alcoholDailyCost=safeInt(profile?.alcohol_daily_cost,0,10000000,0);
  const smokingDailyCost=safeInt(profile?.smoking_daily_cost,0,10000000,0);
  const today=rows.find(r=>r.local_date===refDate)||null;
  return {
    date:refDate,
    dryStreak,smokeStreak,
    savedEstimate:dryStreak*alcoholDailyCost+smokeStreak*smokingDailyCost,
    profile:profile||null,today,
    latestMessage:msg?.body||null
  };
}
async function upsertDaily(env,deviceId,date,patch){
  const old=await env.DB.prepare("SELECT alcohol_result,smoking_count,smoking_baseline,condition_score FROM life_daily WHERE device_id=?1 AND local_date=?2").bind(deviceId,date).first();
  const next={
    alcohol_result:patch.alcohol_result!==undefined?patch.alcohol_result:(old?.alcohol_result??null),
    smoking_count:patch.smoking_count!==undefined?patch.smoking_count:(old?.smoking_count??null),
    smoking_baseline:patch.smoking_baseline!==undefined?patch.smoking_baseline:(old?.smoking_baseline??null),
    condition_score:patch.condition_score!==undefined?patch.condition_score:(old?.condition_score??null)
  };
  await env.DB.prepare(
    "INSERT INTO life_daily (device_id,local_date,alcohol_result,smoking_count,smoking_baseline,condition_score,updated_at) VALUES (?1,?2,?3,?4,?5,?6,datetime('now')) ON CONFLICT(device_id,local_date) DO UPDATE SET alcohol_result=excluded.alcohol_result,smoking_count=excluded.smoking_count,smoking_baseline=excluded.smoking_baseline,condition_score=excluded.condition_score,updated_at=datetime('now')"
  ).bind(deviceId,date,next.alcohol_result,next.smoking_count,next.smoking_baseline,next.condition_score).run();
}
async function resetDevice(env,deviceId){
  let r2Deleted=0;
  if(env.AVATAR_ASSETS){
    const rows=await env.DB.prepare("SELECT r2_key FROM avatars WHERE device_id=?1").bind(deviceId).all();
    const keys=(rows.results||[]).map(r=>r.r2_key).filter(Boolean);
    for(const key of keys){
      try{await env.AVATAR_ASSETS.delete(key);r2Deleted++;}catch{}
    }
  }
  await env.DB.batch([
    env.DB.prepare("DELETE FROM clear_messages WHERE device_id=?1").bind(deviceId),
    env.DB.prepare("DELETE FROM life_daily WHERE device_id=?1").bind(deviceId),
    env.DB.prepare("DELETE FROM life_profiles WHERE device_id=?1").bind(deviceId),
    env.DB.prepare("DELETE FROM habit_signals WHERE device_id=?1").bind(deviceId),
    env.DB.prepare("DELETE FROM app_events WHERE device_id=?1").bind(deviceId),
    env.DB.prepare("DELETE FROM avatars WHERE device_id=?1").bind(deviceId),
    env.DB.prepare("DELETE FROM app_state WHERE device_id=?1").bind(deviceId),
    env.DB.prepare("DELETE FROM device_auth WHERE device_id=?1").bind(deviceId)
  ]);
  return {r2Deleted};
}
export async function handleLifeRoute(request,env,ensureAuth,json){
  const visual=await handleVisualRoute(request,env,ensureAuth,json);
  if(visual)return visual;
  const url=new URL(request.url);
  if(!url.pathname.startsWith("/api/life/"))return null;
  const auth=await ensureAuth(request,env,true); if(!auth.ok)return auth.response;
  const deviceId=auth.deviceId;
  const refDate=safeDate(url.searchParams.get("date"))||todaySeoul();

  if(url.pathname==="/api/life/reset"&&request.method==="POST"){
    const result=await resetDevice(env,deviceId);
    return json({ok:true,reset:true,...result});
  }
  if(url.pathname==="/api/life/summary"&&request.method==="GET"){
    return json({ok:true,summary:await summary(env,deviceId,refDate)});
  }
  if(url.pathname==="/api/life/profile"&&request.method==="POST"){
    const b=await request.json().catch(()=>({}));
    const alcoholStart=safeDate(b.alcohol_start_date),smokingStart=safeDate(b.smoking_start_date);
    const alcoholCost=safeInt(b.alcohol_daily_cost,0,10000000,0),smokingCost=safeInt(b.smoking_daily_cost,0,10000000,0);
    await env.DB.prepare(
      "INSERT INTO life_profiles (device_id,alcohol_start_date,smoking_start_date,alcohol_daily_cost,smoking_daily_cost,updated_at) VALUES (?1,?2,?3,?4,?5,datetime('now')) ON CONFLICT(device_id) DO UPDATE SET alcohol_start_date=excluded.alcohol_start_date,smoking_start_date=excluded.smoking_start_date,alcohol_daily_cost=excluded.alcohol_daily_cost,smoking_daily_cost=excluded.smoking_daily_cost,updated_at=datetime('now')"
    ).bind(deviceId,alcoholStart,smokingStart,alcoholCost,smokingCost).run();
    return json({ok:true,summary:await summary(env,deviceId,refDate)});
  }
  if(url.pathname==="/api/life/daily"&&request.method==="POST"){
    const b=await request.json().catch(()=>({})); const date=safeDate(b.date)||refDate;
    const result=["success","reduce","slip"].includes(b.alcohol_result)?b.alcohol_result:null;
    if(!result)return json({ok:false,error:"Invalid alcohol_result"},400);
    await upsertDaily(env,deviceId,date,{alcohol_result:result});
    return json({ok:true,summary:await summary(env,deviceId,date)});
  }
  if(url.pathname==="/api/life/smoking"&&request.method==="POST"){
    const b=await request.json().catch(()=>({})); const date=safeDate(b.date)||refDate;
    const count=safeInt(b.count,0,500,-1),baseline=safeInt(b.baseline,0,500,0);
    if(count<0)return json({ok:false,error:"Invalid smoking count"},400);
    await upsertDaily(env,deviceId,date,{smoking_count:count,smoking_baseline:baseline});
    return json({ok:true,summary:await summary(env,deviceId,date)});
  }
  if(url.pathname==="/api/life/condition"&&request.method==="POST"){
    const b=await request.json().catch(()=>({})); const date=safeDate(b.date)||refDate;
    const score=safeInt(b.score,0,10,-1); if(score<0)return json({ok:false,error:"Invalid condition score"},400);
    await upsertDaily(env,deviceId,date,{condition_score:score});
    return json({ok:true,summary:await summary(env,deviceId,date)});
  }
  if(url.pathname==="/api/life/message"&&request.method==="POST"){
    const b=await request.json().catch(()=>({})); const body=String(b.text||"").trim().slice(0,1200);
    if(!body)return json({ok:false,error:"Message text is required"},400);
    await env.DB.prepare("INSERT INTO clear_messages (device_id,body) VALUES (?1,?2)").bind(deviceId,body).run();
    return json({ok:true});
  }
  return json({ok:false,error:"Not found"},404);
}
