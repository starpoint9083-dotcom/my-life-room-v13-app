import {WorkflowEntrypoint} from "cloudflare:workers";
import {handleCinemaRoute,CINEMA_INFO} from "./cinema-engine.js";

const SLOTS=[
  "base-morning","base-evening","base-night",
  "state-success","state-steady","state-recovery",
  "action-avatar","action-pet","action-room"
];
const LATEST_PUBLIC_KEY="__cinema_pilot_latest__";
const VISUAL_QC_POINTER_KEY="__cinema_visual_qc_latest__";
const VISUAL_QC_RESULT_KEY="__cinema_visual_qc_result__";
const VISUAL_QC_MODEL="@cf/moondream/moondream3.1-9B-A2B";
const JSON_HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
const internalJson=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:JSON_HEADERS});
const safeChoice=(v,allowed,fallback)=>{const s=String(v||"").trim();return allowed.includes(s)?s:fallback};
const safeJobId=v=>{const s=String(v||"").trim();return /^[A-Za-z0-9_-]{8,100}$/.test(s)?s:null};
const avatarPrefix=key=>{const s=String(key||"");return s.endsWith("master.jpg")?s.slice(0,-"master.jpg".length):s.replace(/[^/]+$/,"")};

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

async function writeState(env,key,value){
  await env.DB.prepare("INSERT INTO app_state (device_id,state_json,updated_at) VALUES (?1,?2,datetime('now')) ON CONFLICT(device_id) DO UPDATE SET state_json=excluded.state_json,updated_at=datetime('now')")
    .bind(key,JSON.stringify(value)).run();
}
async function readState(env,key){
  const row=await env.DB.prepare("SELECT state_json,updated_at FROM app_state WHERE device_id=?1").bind(key).first();
  if(!row)return null;
  let value=null;try{value=JSON.parse(row.state_json)}catch{}
  return value?{...value,updatedAt:row.updated_at||value.updatedAt||null}:null;
}

async function saveLatestPointer(env,{id,deviceId,startedAt}){
  if(!env.DB)return;
  await writeState(env,LATEST_PUBLIC_KEY,{id,deviceId,startedAt});
}
async function saveVisualPointer(env,{id,deviceId,startedAt}){
  if(!env.DB)return;
  await writeState(env,VISUAL_QC_POINTER_KEY,{id,deviceId,startedAt});
}

async function latestPointer(env){
  if(!env.DB)return null;
  const p=await readState(env,LATEST_PUBLIC_KEY);
  const id=safeJobId(p?.id),deviceId=String(p?.deviceId||"");
  if(!id||!deviceId)return null;
  return {id,deviceId,updatedAt:p.updatedAt||null};
}
async function latestVisualPointer(env){
  if(!env.DB)return null;
  const p=await readState(env,VISUAL_QC_POINTER_KEY);
  const id=safeJobId(p?.id),deviceId=String(p?.deviceId||"");
  if(!id||!deviceId)return null;
  return {id,deviceId,updatedAt:p.updatedAt||null};
}

async function latestPublicStatus(env){
  if(!env.CINEMA_WORKFLOW||!env.DB)return {ok:false,statusCode:503,error:"Cinema progress monitor is not connected"};
  const pointer=await latestPointer(env);
  if(!pointer)return {ok:true,status:"idle",ready:0,total:SLOTS.length,complete:false,error:null,updatedAt:null};
  try{
    const instance=await env.CINEMA_WORKFLOW.get(pointer.id),details=await instance.status();
    let ready=0;
    try{ready=Number((await runCinemaInternal(env,pointer.deviceId,"/api/cinema/status")).ready||0)}catch{}
    const complete=details.status==="complete"&&ready>=SLOTS.length;
    return {ok:true,status:details.status,ready,total:SLOTS.length,complete,error:details.error?.message||null,updatedAt:pointer.updatedAt};
  }catch(error){
    return {ok:true,status:"unknown",ready:0,total:SLOTS.length,complete:false,error:error?.message||"Cinema job status unavailable",updatedAt:pointer.updatedAt};
  }
}

async function latestTechnicalQuality(env){
  if(!env.DB||!env.AVATAR_ASSETS)return {ok:false,statusCode:503,error:"Cinema quality monitor is not connected"};
  const pointer=await latestPointer(env);
  if(!pointer)return {ok:true,status:"idle",ready:0,total:SLOTS.length,technicalPass:false,technicalScore:0,visualReview:"pending",paidAiTriggered:false,clips:[],updatedAt:null};
  const avatar=await env.DB.prepare("SELECT r2_key FROM avatars WHERE device_id=?1 ORDER BY id DESC LIMIT 1").bind(pointer.deviceId).first();
  if(!avatar?.r2_key)return {ok:true,status:"waiting-for-avatar",ready:0,total:SLOTS.length,technicalPass:false,technicalScore:0,visualReview:"pending",paidAiTriggered:false,clips:[],updatedAt:pointer.updatedAt};
  const prefix=avatarPrefix(avatar.r2_key),clips=[];
  for(const slot of SLOTS){
    const [frame,video]=await Promise.all([
      env.AVATAR_ASSETS.head(`${prefix}cinema-v23/pilot/${slot}.jpg`),
      env.AVATAR_ASSETS.head(`${prefix}cinema-v23/pilot/${slot}.mp4`)
    ]);
    const meta=video?.customMetadata||{},http=video?.httpMetadata||{};
    const bytes=Number(video?.size||meta.bytes||0),duration=Number(meta.duration||0),contentType=String(http.contentType||"");
    const technicalOk=Boolean(frame&&video&&bytes>=50000&&bytes<=60000000&&contentType.includes("video")&&duration===6&&meta.role==="cinema-video");
    clips.push({slot,frame:Boolean(frame),video:Boolean(video),bytes,duration,contentType:contentType||null,model:meta.model||null,technicalOk});
  }
  const ready=clips.filter(x=>x.video).length,passed=clips.filter(x=>x.technicalOk).length,technicalScore=Math.round((passed/SLOTS.length)*100);
  return {ok:true,status:ready===SLOTS.length?"ready":"incomplete",ready,total:SLOTS.length,technicalPass:passed===SLOTS.length,technicalScore,visualReview:"pending",paidAiTriggered:false,clips,updatedAt:pointer.updatedAt};
}

function bytesToDataUrl(bytes,type="image/jpeg"){
  let out="";const step=0x8000;
  for(let i=0;i<bytes.length;i+=step)out+=String.fromCharCode(...bytes.subarray(i,i+step));
  return `data:${type};base64,${btoa(out)}`;
}
function visualPrompt(slot){
  return `You are a strict visual quality inspector for a photorealistic lifestyle film still. Slot: ${slot}. Inspect only visible evidence. Exactly one adult person and exactly one companion pet should appear naturally inside one coherent premium home interior. Look for duplicated people or animals, face distortion, impossible hands or limbs, broken pet anatomy, cutout/composite appearance, floating objects, inconsistent light or shadows, warped furniture or room geometry, text/logo/UI artifacts, blur or severe generation artifacts, and unnatural camera perspective. If hands are not clearly visible, do not fail hands unless there is a visible defect. Return ONLY one JSON object with these exact keys: oneAdult, onePet, anatomyOk, faceNatural, handsNatural, petNatural, roomNatural, lightingNatural, cameraNatural, artifactFree (all booleans); issues (array of up to 5 short strings); note (one short string). No markdown and no extra commentary.`;
}
function parseVisualAnswer(answer){
  const text=String(answer||"").trim();
  const match=text.match(/\{[\s\S]*\}/);
  if(!match)throw new Error("Visual QC model did not return JSON");
  return JSON.parse(match[0]);
}
function bool(v){return v===true||String(v).toLowerCase()==="true"}
function cleanIssue(v){return String(v||"").replace(/[\r\n]+/g," ").trim().slice(0,180)}
function normalizeVisual(slot,raw){
  const keys=["oneAdult","onePet","anatomyOk","faceNatural","handsNatural","petNatural","roomNatural","lightingNatural","cameraNatural","artifactFree"];
  const criteria={};for(const k of keys)criteria[k]=bool(raw?.[k]);
  const passed=keys.filter(k=>criteria[k]).length,score=Math.round((passed/keys.length)*100);
  const severe=!criteria.oneAdult||!criteria.onePet||!criteria.anatomyOk||!criteria.faceNatural||!criteria.petNatural||!criteria.artifactFree;
  const issues=Array.isArray(raw?.issues)?raw.issues.map(cleanIssue).filter(Boolean).slice(0,5):[];
  const note=cleanIssue(raw?.note);
  return {slot,score,pass:score>=80&&!severe,regenerationCandidate:score<80||severe,criteria,issues,note};
}
async function latestAvatarForDevice(env,deviceId){
  return await env.DB.prepare("SELECT r2_key FROM avatars WHERE device_id=?1 ORDER BY id DESC LIMIT 1").bind(deviceId).first();
}
async function visualFrameReadiness(env,deviceId){
  const avatar=await latestAvatarForDevice(env,deviceId);if(!avatar?.r2_key)return {ready:0,avatar:null,prefix:null};
  const prefix=avatarPrefix(avatar.r2_key);let ready=0;
  for(const slot of SLOTS)if(await env.AVATAR_ASSETS.head(`${prefix}cinema-v23/pilot/${slot}.jpg`))ready++;
  return {ready,avatar,prefix};
}
async function analyzeVisualFrame(env,prefix,slot){
  try{
    const obj=await env.AVATAR_ASSETS.get(`${prefix}cinema-v23/pilot/${slot}.jpg`);
    if(!obj)return {slot,score:0,pass:false,regenerationCandidate:true,criteria:{},issues:["frame-missing"],note:"Cinema frame missing"};
    const bytes=new Uint8Array(await obj.arrayBuffer());
    const response=await env.AI.run(VISUAL_QC_MODEL,{task:"query",image:bytesToDataUrl(bytes,"image/jpeg"),question:visualPrompt(slot),reasoning:false,temperature:0.1,max_tokens:900,stream:false});
    return normalizeVisual(slot,parseVisualAnswer(response?.answer||response?.response||""));
  }catch(error){
    return {slot,score:0,pass:false,regenerationCandidate:true,criteria:{},issues:[cleanIssue(error?.message||"visual-qc-error")],note:"Visual QC could not score this frame"};
  }
}
function visualPublicShape(result){
  if(!result)return {ok:true,status:"idle",ready:0,total:SLOTS.length,complete:false,paidAiTriggered:false,model:VISUAL_QC_MODEL,visualScore:0,pass:false,candidates:[],clips:[],motionReview:"pending-middle-frame-pass",updatedAt:null};
  const clips=(result.clips||[]).map(c=>({slot:c.slot,score:Number(c.score||0),pass:c.pass===true,regenerationCandidate:c.regenerationCandidate===true,issues:Array.isArray(c.issues)?c.issues.slice(0,5):[]}));
  return {ok:true,status:result.status||"unknown",ready:Number(result.ready||clips.length||0),total:SLOTS.length,complete:result.status==="complete",paidAiTriggered:result.paidAiTriggered===true,model:VISUAL_QC_MODEL,visualScore:Number(result.visualScore||0),pass:result.pass===true,candidates:clips.filter(c=>c.regenerationCandidate).map(c=>c.slot),clips,motionReview:"pending-middle-frame-pass",updatedAt:result.updatedAt||null};
}
async function saveVisualResult(env,result){await writeState(env,VISUAL_QC_RESULT_KEY,{...result,updatedAt:new Date().toISOString()})}
async function latestVisualPublic(env){
  if(!env.DB)return {ok:false,statusCode:503,error:"Visual QC monitor is not connected"};
  const result=await readState(env,VISUAL_QC_RESULT_KEY);
  if(result)return visualPublicShape(result);
  const pointer=await latestVisualPointer(env);
  if(!pointer)return visualPublicShape(null);
  try{
    const details=await env.CINEMA_WORKFLOW.get(pointer.id).then(x=>x.status());
    return {...visualPublicShape(null),status:details.status,error:details.error?.message||null,updatedAt:pointer.updatedAt};
  }catch{return visualPublicShape(null)}
}
async function runVisualQcWorkflow(env,deviceId,step){
  if(!env.AI)throw new Error("Workers AI binding is required for visual QC");
  const prepared=await visualFrameReadiness(env,deviceId);
  if(prepared.ready!==SLOTS.length||!prepared.prefix)throw new Error(`Visual QC requires 9 Cinema frames; found ${prepared.ready}`);
  const clips=[];
  await saveVisualResult(env,{status:"running",ready:0,total:SLOTS.length,paidAiTriggered:true,visualScore:0,pass:false,clips});
  for(const slot of SLOTS){
    const result=await step.do(`visual QC ${slot}`,{retries:{limit:1,delay:"5 seconds"},timeout:"3 minutes"},async()=>analyzeVisualFrame(env,prepared.prefix,slot));
    clips.push(result);
    const visualScore=Math.round(clips.reduce((a,c)=>a+Number(c.score||0),0)/clips.length);
    await saveVisualResult(env,{status:"running",ready:clips.length,total:SLOTS.length,paidAiTriggered:true,visualScore,pass:false,clips});
  }
  const visualScore=Math.round(clips.reduce((a,c)=>a+Number(c.score||0),0)/SLOTS.length);
  const pass=clips.every(c=>c.pass===true)&&visualScore>=85;
  const final={status:"complete",ready:SLOTS.length,total:SLOTS.length,paidAiTriggered:true,visualScore,pass,clips};
  await saveVisualResult(env,final);
  return {ok:true,engine:CINEMA_INFO.version,mode:"visual-qc",model:VISUAL_QC_MODEL,ready:SLOTS.length,total:SLOTS.length,visualScore,pass,candidates:clips.filter(c=>c.regenerationCandidate).map(c=>c.slot),motionReview:"pending-middle-frame-pass"};
}

export class CinemaBatchWorkflow extends WorkflowEntrypoint {
  async run(event,step){
    const p=event.payload||{},deviceId=String(p.deviceId||"");
    if(!deviceId)throw new Error("Cinema Workflow device id missing");
    if(p.mode==="visual-qc")return runVisualQcWorkflow(this.env,deviceId,step);
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

  if(url.pathname==="/api/cinema/batch/quality-public"&&request.method==="GET"){
    try{
      const q=await latestTechnicalQuality(env);
      if(!q.ok)return json({ok:false,error:q.error},q.statusCode||503);
      return json(q);
    }catch(error){return json({ok:false,error:error?.message||"Cinema quality manifest unavailable"},500)}
  }

  if(url.pathname==="/api/cinema/batch/visual-qc/latest-public"&&request.method==="GET"){
    try{
      const q=await latestVisualPublic(env);
      if(!q.ok)return json({ok:false,error:q.error},q.statusCode||503);
      return json(q);
    }catch(error){return json({ok:false,error:error?.message||"Cinema visual QC unavailable"},500)}
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
      return json({ok:true,engine:CINEMA_INFO.version,background:true,id,status:(await instance.status()).status,publicStatus:`/api/cinema/batch/public?id=${encodeURIComponent(id)}`,publicLatest:"/api/cinema/batch/latest-public",publicQuality:"/api/cinema/batch/quality-public"});
    }catch(error){return json({ok:false,error:error?.message||"Cinema background job could not start"},500)}
  }

  if(url.pathname==="/api/cinema/batch/visual-qc/start"&&request.method==="POST"){
    const b=await request.json().catch(()=>({}));
    if(b.confirm_cost!==true)return json({ok:false,error:"Paid visual AI inspection requires explicit confirm_cost=true."},402);
    if(!env.AI)return json({ok:false,error:"Workers AI binding is required for visual QC"},503);
    try{
      const readiness=await visualFrameReadiness(env,auth.deviceId);
      if(readiness.ready!==SLOTS.length)return json({ok:false,error:`Visual QC requires all 9 Cinema frames; found ${readiness.ready}.`},409);
      const id=`cinema-qc-${crypto.randomUUID()}`,startedAt=new Date().toISOString();
      const instance=await env.CINEMA_WORKFLOW.create({id,params:{deviceId:auth.deviceId,mode:"visual-qc"},retention:{successRetention:"3 days",errorRetention:"7 days"}});
      await saveVisualPointer(env,{id,deviceId:auth.deviceId,startedAt});
      await saveVisualResult(env,{status:"queued",ready:0,total:SLOTS.length,paidAiTriggered:true,visualScore:0,pass:false,clips:[]});
      return json({ok:true,engine:CINEMA_INFO.version,mode:"visual-qc",model:VISUAL_QC_MODEL,id,status:(await instance.status()).status,publicStatus:`/api/cinema/batch/public?id=${encodeURIComponent(id)}`,publicLatest:"/api/cinema/batch/visual-qc/latest-public",autoRegeneration:false});
    }catch(error){return json({ok:false,error:error?.message||"Cinema visual QC could not start"},500)}
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