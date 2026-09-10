import {WorkflowEntrypoint} from "cloudflare:workers";
import {handleCinemaRoute,CINEMA_INFO} from "./cinema-engine.js";

const SLOTS=[
  "base-morning","base-evening","base-night",
  "state-success","state-steady","state-recovery",
  "action-avatar","action-pet","action-room"
];
const JSON_HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
const internalJson=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:JSON_HEADERS});
const safeChoice=(v,allowed,fallback)=>{const s=String(v||"").trim();return allowed.includes(s)?s:fallback};
const safeJobId=v=>{const s=String(v||"").trim();return /^[A-Za-z0-9_-]{8,100}$/.test(s)?s:null};

async function runSlot(env,deviceId,slot,opts){
  const req=new Request("https://cinema.internal/api/cinema/generate",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({slot,...opts,confirm_cost:true})
  });
  const trustedAuth=async()=>({ok:true,deviceId});
  const res=await handleCinemaRoute(req,env,trustedAuth,internalJson);
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data.ok)throw new Error(data.error||`Cinema slot ${slot} failed with ${res.status}`);
  return {slot,cached:Boolean(data.cached),bytes:Number(data.bytes||0)};
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
      const id=`cinema-${crypto.randomUUID()}`;
      const instance=await env.CINEMA_WORKFLOW.create({id,params,retention:{successRetention:"3 days",errorRetention:"7 days"}});
      return json({ok:true,engine:CINEMA_INFO.version,background:true,id,status:(await instance.status()).status,publicStatus:`/api/cinema/batch/public?id=${encodeURIComponent(id)}`});
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
