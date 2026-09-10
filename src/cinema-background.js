import {WorkflowEntrypoint} from "cloudflare:workers";
import {handleCinemaRoute,CINEMA_INFO} from "./cinema-engine.js";

const SLOTS=[
  "base-morning","base-evening","base-night",
  "state-success","state-steady","state-recovery",
  "action-avatar","action-pet","action-room"
];
const LATEST_PUBLIC_KEY="__cinema_pilot_latest__";
const JSON_HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
const internalJson=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:JSON_HEADERS});
const safeChoice=(v,allowed,fallback)=>{const s=String(v||"").trim();return allowed.includes(s)?s:fallback};
const safeJobId=v=>{const s=String(v||"").trim();return /^[A-Za-z0-9_-]{8,100}$/.test(s)?s:null};

async function runCinemaInternal(env,deviceId,path,{method="GET",body}={}){
  const req=new Request(`https://cinema.internal${path}`,{
    method,
    headers:{"content-type":"application/json"},
    body:body===undefined?undefined:JSON.stringify(body)
  });
  const trustedAuth=async()=>({ok:true,deviceId});
  const res=await handleCinemaRoute(req,env,trustedAuth,internalJson);
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data.ok)throw new Error(data.error||`Cinema internal ${path} failed with ${res.status}`);
  return data;
}

async function runSlot(env,deviceId,slot,opts){
  const data=await runCinemaInternal(env,deviceId,"/api/cinema/generate",{
    method:"POST",
    body:{slot,...opts,confirm_cost:true}
  });
  return {slot,cached:Boolean(data.cached),bytes:Number(data.bytes||0)};
}

async function saveLatestPointer(env,{id,deviceId,startedAt}){
  if(!env.DB)return;
  const state=JSON.stringify({id,deviceId,startedAt});
  await env.DB.prepare("INSERT INTO app_state (device_id,state_json,updated_at) VALUES (?1,?2,datetime('now')) ON CONFLICT(device_id) DO UPDATE SET state_json=excluded.state_json,updated_at=datetime('now')")
    .bind(LATEST_PUBLIC_KEY,state).run();
}

async function latestPublicStatus(env){
  if(!env.CINEMA_WORKFLOW||!env.DB)return {ok:false,statusCode:503,error:"Cinema progress monitor is not connected"};
  const row=await env.DB.prepare("SELECT state_json,updated_at FROM app_state WHERE device_id=?1").bind(LATEST_PUBLIC_KEY).first();
  if(!row)return {ok:true,status:"idle",ready:0,total:SLOTS.length,complete:false,error:null,updatedAt:null};
  let p=null;try{p=JSON.parse(row.state_json)}catch{}
  const id=safeJobId(p?.id),deviceId=String(p?.deviceId||"");
  if(!id||!deviceId)return {ok:true,status:"idle",ready:0,total:SLOTS.length,complete:false,error:null,updatedAt:row.updated_at||null};
  try{
    const instance=await env.CINEMA_WORKFLOW.get(id),details=await instance.status();
    let ready=0;
    try{ready=Number((await runCinemaInternal(env,deviceId,"/api/cinema/status")).ready||0)}catch{}
    const complete=details.status==="complete"&&ready>=SLOTS.length;
    return {ok:true,status:details.status,ready,total:SLOTS.length,complete,error:details.error?.message||null,updatedAt:row.updated_at||null};
  }catch(error){
    return {ok:true,status:"unknown",ready:0,total:SLOTS.length,complete:false,error:error?.message||"Cinema job status unavailable",updatedAt:row.updated_at||null};
  }
}

export class CinemaBatchWorkflow extends WorkflowEntrypoint {
  async run(event,step){
    const p=event.payload||{},deviceId=String(p.deviceId||"");
    if(!deviceId)throw new Error("Cinema Workflow device id missing");
    const opts={
      roomStyle:safeChoice(p.roomStyle,["warm","modern","cozy"],"warm"),
      petKind:safeChoice(p.petKind,["dog","cat"],"dog"),
      petMode:String(p.petMode||"댕댕이형").slice(0,30),
      force:false
    };
    const results=[];
    for(const slot of SLOTS){
      const result=await step.do(
        `generate ${slot}`,
        {retries:{limit:2,delay:"15 seconds",backoff:"exponential"},timeout:"10 minutes"},
        async()=>runSlot(this.env,deviceId,slot,opts)
      );
      results.push(result);
    }
    return {ok:true,engine:CINEMA_INFO.version,ready:results.length,total:SLOTS.length,slots:results.map(x=>x.slot)};
  }
}

export async function handleCinemaBackgroundRoute(request,env,ensureAuth,json){
  const url=new URL(request.url);
  if(!url.pathname.startsWith("/api/cinema/batch/"))return null;

  if(url.pathname==="/api/cinema/batch/latest-public"&&request.method==="GET"){
    try{
      const s=await latestPublicStatus(env);
      if(!s.ok)return json({ok:false,error:s.error},s.statusCode||503);
      return json(s);
    }catch(error){return json({ok:false,error:error?.message||"Cinema progress unavailable"},500)}
  }

  if(url.pathname==="/api/cinema/batch/public"&&request.method==="GET"){
    if(!env.CINEMA_WORKFLOW)return json({ok:false,error:"Cinema background workflow is not connected"},503);
    const id=safeJobId(url.searchParams.get("id"));
    if(!id)return json({ok:false,error:"Invalid job id"},400);
    try{
      const instance=await env.CINEMA_WORKFLOW.get(id),details=await instance.status();
      return json({ok:true,id,status:details.status,error:details.error?.message||null,output:details.status==="complete"?details.output||null:null});
    }catch(error){return json({ok:false,error:error?.message||"Cinema job not found"},404)}
  }

  const auth=await ensureAuth(request,env,true);if(!auth.ok)return auth.response;
  if(!env.CINEMA_WORKFLOW)return json({ok:false,error:"Cinema background workflow is not connected"},503);

  if(url.pathname==="/api/cinema/batch/start"&&request.method==="POST"){
    const b=await request.json().catch(()=>({}));
    if(b.confirm_cost!==true)return json({ok:false,error:"AI video generation may incur Cloudflare charges. Explicit confirm_cost=true is required."},402);
    const params={
      deviceId:auth.deviceId,
      roomStyle:safeChoice(b.roomStyle,["warm","modern","cozy"],"warm"),
      petKind:safeChoice(b.petKind,["dog","cat"],"dog"),
      petMode:String(b.petMode||"댕댕이형").slice(0,30)
    };
    try{
      const id=`cinema-${crypto.randomUUID()}`,startedAt=new Date().toISOString();
      const instance=await env.CINEMA_WORKFLOW.create({id,params,retention:{successRetention:"3 days",errorRetention:"7 days"}});
      await saveLatestPointer(env,{id,deviceId:auth.deviceId,startedAt});
      return json({ok:true,engine:CINEMA_INFO.version,background:true,id,status:(await instance.status()).status,publicStatus:`/api/cinema/batch/public?id=${encodeURIComponent(id)}`,publicLatest:"/api/cinema/batch/latest-public"});
    }catch(error){return json({ok:false,error:error?.message||"Cinema background job could not start"},500)}
  }

  if(url.pathname==="/api/cinema/batch/status"&&request.method==="GET"){
    const id=safeJobId(url.searchParams.get("id"));if(!id)return json({ok:false,error:"Invalid job id"},400);
    try{
      const instance=await env.CINEMA_WORKFLOW.get(id),details=await instance.status();
      return json({ok:true,id,status:details.status,error:details.error?.message||null,output:details.output||null});
    }catch(error){return json({ok:false,error:error?.message||"Cinema job not found"},404)}
  }
  return json({ok:false,error:"Not found"},404);
}
