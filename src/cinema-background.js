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
const MOTION_QC_POINTER_KEY="__cinema_motion_qc_latest__";
const MOTION_QC_RESULT_KEY="__cinema_motion_qc_result__";
const VISUAL_QC_MODEL="@cf/google/gemma-4-26b-a4b-it";
const MOTION_QC_MODEL=VISUAL_QC_MODEL;
const VISUAL_KEYS=["oneAdult","onePet","anatomyOk","faceNatural","handsNatural","petNatural","roomNatural","lightingNatural","cameraNatural","artifactFree"];
const MOTION_KEYS=["identityStable","petStable","anatomyStable","roomStable","lightingContinuous","cameraContinuous","motionNatural","morphFree","loopReturnNatural","artifactFree"];
const VISUAL_QC_SCHEMA={
  type:"object",additionalProperties:false,
  properties:{
    oneAdult:{type:"boolean"},onePet:{type:"boolean"},anatomyOk:{type:"boolean"},faceNatural:{type:"boolean"},handsNatural:{type:"boolean"},petNatural:{type:"boolean"},roomNatural:{type:"boolean"},lightingNatural:{type:"boolean"},cameraNatural:{type:"boolean"},artifactFree:{type:"boolean"},
    issues:{type:"array",items:{type:"string"},maxItems:5},note:{type:"string"}
  },
  required:[...VISUAL_KEYS,"issues","note"]
};
const MOTION_QC_SCHEMA={
  type:"object",additionalProperties:false,
  properties:{
    identityStable:{type:"boolean"},petStable:{type:"boolean"},anatomyStable:{type:"boolean"},roomStable:{type:"boolean"},lightingContinuous:{type:"boolean"},cameraContinuous:{type:"boolean"},motionNatural:{type:"boolean"},morphFree:{type:"boolean"},loopReturnNatural:{type:"boolean"},artifactFree:{type:"boolean"},
    issues:{type:"array",items:{type:"string"},maxItems:5},note:{type:"string"}
  },
  required:[...MOTION_KEYS,"issues","note"]
};
const JSON_HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
const internalJson=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:JSON_HEADERS});
const safeChoice=(v,allowed,fallback)=>{const s=String(v||"").trim();return allowed.includes(s)?s:fallback};
const safeJobId=v=>{const s=String(v||"").trim();return /^[A-Za-z0-9_-]{8,100}$/.test(s)?s:null};
const safeSlot=v=>{const s=String(v||"").trim();return SLOTS.includes(s)?s:null};
const avatarPrefix=key=>{const s=String(key||"");return s.endsWith("master.jpg")?s.slice(0,-"master.jpg".length):s.replace(/[^/]+$/,"")};

async function runCinemaInternal(env,deviceId,path,{method="GET",body}={}){
  const req=new Request(`https://cinema.internal${path}`,{method,headers:{"content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
  const trustedAuth=async()=>({ok:true,deviceId});
  const res=await handleCinemaRoute(req,env,trustedAuth,internalJson);
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data.ok)throw new Error(data.error||`Cinema internal ${path} failed with ${res.status}`);
  return data;
}
async function runSlot(env,deviceId,slot,opts){
  const data=await runCinemaInternal(env,deviceId,"/api/cinema/generate",{method:"POST",body:{slot,...opts,confirm_cost:true}});
  return {slot,cached:Boolean(data.cached),bytes:Number(data.bytes||0)};
}
async function writeState(env,key,value){
  await env.DB.prepare("INSERT INTO app_state (device_id,state_json,updated_at) VALUES (?1,?2,datetime('now')) ON CONFLICT(device_id) DO UPDATE SET state_json=excluded.state_json,updated_at=datetime('now')").bind(key,JSON.stringify(value)).run();
}
async function readState(env,key){
  const row=await env.DB.prepare("SELECT state_json,updated_at FROM app_state WHERE device_id=?1").bind(key).first();
  if(!row)return null;let value=null;try{value=JSON.parse(row.state_json)}catch{}
  return value?{...value,updatedAt:row.updated_at||value.updatedAt||null}:null;
}
async function saveLatestPointer(env,{id,deviceId,startedAt}){if(env.DB)await writeState(env,LATEST_PUBLIC_KEY,{id,deviceId,startedAt})}
async function saveVisualPointer(env,{id,deviceId,startedAt}){if(env.DB)await writeState(env,VISUAL_QC_POINTER_KEY,{id,deviceId,startedAt})}
async function saveMotionPointer(env,{id,deviceId,captureId,startedAt}){if(env.DB)await writeState(env,MOTION_QC_POINTER_KEY,{id,deviceId,captureId,startedAt})}
async function latestPointer(env){
  if(!env.DB)return null;const p=await readState(env,LATEST_PUBLIC_KEY),id=safeJobId(p?.id),deviceId=String(p?.deviceId||"");if(!id||!deviceId)return null;return {id,deviceId,updatedAt:p.updatedAt||null};
}
async function latestVisualPointer(env){
  if(!env.DB)return null;const p=await readState(env,VISUAL_QC_POINTER_KEY),id=safeJobId(p?.id),deviceId=String(p?.deviceId||"");if(!id||!deviceId)return null;return {id,deviceId,updatedAt:p.updatedAt||null};
}
async function latestMotionPointer(env){
  if(!env.DB)return null;const p=await readState(env,MOTION_QC_POINTER_KEY),id=safeJobId(p?.id),deviceId=String(p?.deviceId||""),captureId=safeJobId(p?.captureId);if(!id||!deviceId||!captureId)return null;return {id,deviceId,captureId,updatedAt:p.updatedAt||null};
}
async function latestAvatarForDevice(env,deviceId){return await env.DB.prepare("SELECT r2_key FROM avatars WHERE device_id=?1 ORDER BY id DESC LIMIT 1").bind(deviceId).first()}

async function latestPublicStatus(env){
  if(!env.CINEMA_WORKFLOW||!env.DB)return {ok:false,statusCode:503,error:"Cinema progress monitor is not connected"};
  const pointer=await latestPointer(env);if(!pointer)return {ok:true,status:"idle",ready:0,total:SLOTS.length,complete:false,error:null,updatedAt:null};
  try{
    const instance=await env.CINEMA_WORKFLOW.get(pointer.id),details=await instance.status();let ready=0;
    try{ready=Number((await runCinemaInternal(env,pointer.deviceId,"/api/cinema/status")).ready||0)}catch{}
    const complete=details.status==="complete"&&ready>=SLOTS.length;
    return {ok:true,status:details.status,ready,total:SLOTS.length,complete,error:details.error?.message||null,updatedAt:pointer.updatedAt};
  }catch(error){return {ok:true,status:"unknown",ready:0,total:SLOTS.length,complete:false,error:error?.message||"Cinema job status unavailable",updatedAt:pointer.updatedAt}}
}
async function latestTechnicalQuality(env){
  if(!env.DB||!env.AVATAR_ASSETS)return {ok:false,statusCode:503,error:"Cinema quality monitor is not connected"};
  const pointer=await latestPointer(env);if(!pointer)return {ok:true,status:"idle",ready:0,total:SLOTS.length,technicalPass:false,technicalScore:0,visualReview:"pending",paidAiTriggered:false,clips:[],updatedAt:null};
  const avatar=await latestAvatarForDevice(env,pointer.deviceId);if(!avatar?.r2_key)return {ok:true,status:"waiting-for-avatar",ready:0,total:SLOTS.length,technicalPass:false,technicalScore:0,visualReview:"pending",paidAiTriggered:false,clips:[],updatedAt:pointer.updatedAt};
  const prefix=avatarPrefix(avatar.r2_key),clips=[];
  for(const slot of SLOTS){
    const [frame,video]=await Promise.all([env.AVATAR_ASSETS.head(`${prefix}cinema-v23/pilot/${slot}.jpg`),env.AVATAR_ASSETS.head(`${prefix}cinema-v23/pilot/${slot}.mp4`)]);
    const meta=video?.customMetadata||{},http=video?.httpMetadata||{},bytes=Number(video?.size||meta.bytes||0),duration=Number(meta.duration||0),contentType=String(http.contentType||"");
    const technicalOk=Boolean(frame&&video&&bytes>=50000&&bytes<=60000000&&contentType.includes("video")&&duration===6&&meta.role==="cinema-video");
    clips.push({slot,frame:Boolean(frame),video:Boolean(video),bytes,duration,contentType:contentType||null,model:meta.model||null,technicalOk});
  }
  const ready=clips.filter(x=>x.video).length,passed=clips.filter(x=>x.technicalOk).length,technicalScore=Math.round((passed/SLOTS.length)*100);
  return {ok:true,status:ready===SLOTS.length?"ready":"incomplete",ready,total:SLOTS.length,technicalPass:passed===SLOTS.length,technicalScore,visualReview:"pending",paidAiTriggered:false,clips,updatedAt:pointer.updatedAt};
}

function bytesToDataUrl(bytes,type="image/jpeg"){
  let out="";const step=0x8000;for(let i=0;i<bytes.length;i+=step)out+=String.fromCharCode(...bytes.subarray(i,i+step));return `data:${type};base64,${btoa(out)}`;
}
function cleanIssue(v){return String(v||"").replace(/[\r\n]+/g," ").trim().slice(0,180)}
function boolToken(v){const s=String(v??"").trim().toLowerCase();if(["true","y","yes","1","pass","ok"].includes(s))return true;if(["false","n","no","0","fail","bad"].includes(s))return false;return null}
function parseStructuredResponse(response,label){
  const candidates=[response?.response,response?.choices?.[0]?.message?.parsed,response?.choices?.[0]?.message?.content,response?.answer];
  for(const candidate of candidates){
    if(candidate&&typeof candidate==="object"&&!Array.isArray(candidate))return candidate;
    const text=String(candidate||"").trim();if(!text)continue;try{return JSON.parse(text)}catch{}const match=text.match(/\{[\s\S]*\}/);if(match){try{return JSON.parse(match[0])}catch{}}
  }
  throw new Error(`${label} structured response was missing or invalid`);
}
function visualPrompt(slot){return `Inspect this photorealistic lifestyle film still for slot ${slot}. Judge only visible evidence. The intended scene has exactly one adult and exactly one companion pet in one coherent premium home interior. Check person count, pet count, anatomy, face, hands, pet anatomy, room geometry, lighting/shadows, camera perspective, and visible generation artifacts. If hands are not clearly visible, mark handsNatural=true unless there is a visible defect. Keep issues short and factual.`}
function normalizeVisual(slot,raw){
  const criteria={};for(const k of VISUAL_KEYS){const parsed=typeof raw?.[k]==="boolean"?raw[k]:boolToken(raw?.[k]);if(parsed===null)throw new Error(`Visual QC response missing boolean ${k}`);criteria[k]=parsed}
  const passed=VISUAL_KEYS.filter(k=>criteria[k]).length,score=Math.round((passed/VISUAL_KEYS.length)*100),severe=!criteria.oneAdult||!criteria.onePet||!criteria.anatomyOk||!criteria.faceNatural||!criteria.petNatural||!criteria.artifactFree;
  const issues=Array.isArray(raw?.issues)?raw.issues.map(cleanIssue).filter(Boolean).slice(0,5):[],note=cleanIssue(raw?.note);
  return {slot,scored:true,score,pass:score>=80&&!severe,regenerationCandidate:score<80||severe,criteria,issues,note,error:null};
}
function unscoredVisual(slot,error,note="Visual QC could not score this frame"){return {slot,scored:false,score:null,pass:false,regenerationCandidate:false,criteria:{},issues:[cleanIssue(error||"visual-qc-error")],note,error:cleanIssue(error||"visual-qc-error")}}
function isLegacyUnscored(c){const issues=Array.isArray(c?.issues)?c.issues.map(x=>String(x||"")):[];return c?.scored!==true&&(issues.some(x=>/Visual QC model did not return JSON|not machine-readable|could not score|structured visual QC|Structured visual QC response/i.test(x))||/could not score/i.test(String(c?.note||"")))}
async function visualFrameReadiness(env,deviceId){
  const avatar=await latestAvatarForDevice(env,deviceId);if(!avatar?.r2_key)return {ready:0,avatar:null,prefix:null};const prefix=avatarPrefix(avatar.r2_key);let ready=0;for(const slot of SLOTS)if(await env.AVATAR_ASSETS.head(`${prefix}cinema-v23/pilot/${slot}.jpg`))ready++;return {ready,avatar,prefix};
}
async function analyzeVisualFrame(env,prefix,slot){
  try{
    const obj=await env.AVATAR_ASSETS.get(`${prefix}cinema-v23/pilot/${slot}.jpg`);if(!obj)return unscoredVisual(slot,"frame-missing","Cinema frame missing; visual quality was not judged");
    const bytes=new Uint8Array(await obj.arrayBuffer());
    const response=await env.AI.run(VISUAL_QC_MODEL,{messages:[{role:"system",content:"You are a strict visual quality inspector. Return only the requested structured result."},{role:"user",content:visualPrompt(slot)}],image:bytesToDataUrl(bytes,"image/jpeg"),response_format:{type:"json_schema",json_schema:VISUAL_QC_SCHEMA},chat_template_kwargs:{enable_thinking:false},temperature:0,max_completion_tokens:500,stream:false});
    return normalizeVisual(slot,parseStructuredResponse(response,"Visual QC"));
  }catch(error){return unscoredVisual(slot,error?.message||"visual-qc-error")}
}
function visualPublicShape(result){
  if(!result)return {ok:true,status:"idle",ready:0,scoredCount:0,total:SLOTS.length,complete:false,paidAiTriggered:false,model:VISUAL_QC_MODEL,visualScore:null,pass:false,candidates:[],clips:[],error:null,motionReview:"pending-sampled-motion-pass",updatedAt:null};
  const clips=(result.clips||[]).map(c=>{const legacyUnscored=isLegacyUnscored(c),scored=c?.scored===true&&!legacyUnscored;return {slot:c.slot,scored,score:scored&&Number.isFinite(Number(c.score))?Number(c.score):null,pass:scored&&c.pass===true,regenerationCandidate:scored&&c.regenerationCandidate===true,issues:Array.isArray(c.issues)?c.issues.slice(0,5):[],error:scored?null:cleanIssue(c.error||c.issues?.[0]||"")}});
  const scoredClips=clips.filter(c=>c.scored),scoredCount=scoredClips.length,visualScore=scoredCount?Math.round(scoredClips.reduce((a,c)=>a+Number(c.score||0),0)/scoredCount):null,underlyingStatus=String(result.status||"unknown"),scoringError=(underlyingStatus==="complete"||underlyingStatus==="error")&&scoredCount<SLOTS.length,status=scoringError?"error":underlyingStatus,error=scoringError?`Visual QC scored ${scoredCount}/${SLOTS.length} frames; unscored frames are not regeneration candidates.`:(result.error||null);
  return {ok:true,status,ready:Number(result.ready||clips.length||0),scoredCount,total:SLOTS.length,complete:status==="complete"&&scoredCount===SLOTS.length,paidAiTriggered:result.paidAiTriggered===true,model:VISUAL_QC_MODEL,visualScore,pass:status==="complete"&&result.pass===true&&scoredCount===SLOTS.length,candidates:clips.filter(c=>c.regenerationCandidate).map(c=>c.slot),clips,error,motionReview:"pending-sampled-motion-pass",updatedAt:result.updatedAt||null};
}
async function saveVisualResult(env,result){await writeState(env,VISUAL_QC_RESULT_KEY,{...result,updatedAt:new Date().toISOString()})}
async function latestVisualPublic(env){
  if(!env.DB)return {ok:false,statusCode:503,error:"Visual QC monitor is not connected"};const result=await readState(env,VISUAL_QC_RESULT_KEY);if(result)return visualPublicShape(result);const pointer=await latestVisualPointer(env);if(!pointer)return visualPublicShape(null);try{const details=await env.CINEMA_WORKFLOW.get(pointer.id).then(x=>x.status());return {...visualPublicShape(null),status:details.status,error:details.error?.message||null,updatedAt:pointer.updatedAt}}catch{return visualPublicShape(null)}
}
async function runVisualQcWorkflow(env,deviceId,step){
  if(!env.AI)throw new Error("Workers AI binding is required for visual QC");const prepared=await visualFrameReadiness(env,deviceId);if(prepared.ready!==SLOTS.length||!prepared.prefix)throw new Error(`Visual QC requires 9 Cinema frames; found ${prepared.ready}`);
  const clips=[];await saveVisualResult(env,{status:"running",ready:0,scoredCount:0,total:SLOTS.length,paidAiTriggered:true,visualScore:null,pass:false,clips,error:null});
  for(const slot of SLOTS){const result=await step.do(`visual QC ${slot}`,{retries:{limit:1,delay:"5 seconds"},timeout:"3 minutes"},async()=>analyzeVisualFrame(env,prepared.prefix,slot));clips.push(result);const scored=clips.filter(c=>c.scored===true),visualScore=scored.length?Math.round(scored.reduce((a,c)=>a+Number(c.score||0),0)/scored.length):null;await saveVisualResult(env,{status:"running",ready:clips.length,scoredCount:scored.length,total:SLOTS.length,paidAiTriggered:true,visualScore,pass:false,clips,error:null})}
  const scored=clips.filter(c=>c.scored===true),scoredCount=scored.length,visualScore=scoredCount?Math.round(scored.reduce((a,c)=>a+Number(c.score||0),0)/scoredCount):null,fullyScored=scoredCount===SLOTS.length,pass=fullyScored&&clips.every(c=>c.pass===true)&&Number(visualScore)>=85,error=fullyScored?null:`Visual QC could not score ${SLOTS.length-scoredCount} of ${SLOTS.length} frames; no unscored frame was marked for regeneration.`;
  const final={status:fullyScored?"complete":"error",ready:SLOTS.length,scoredCount,total:SLOTS.length,paidAiTriggered:true,visualScore,pass,clips,error};await saveVisualResult(env,final);return {ok:fullyScored,engine:CINEMA_INFO.version,mode:"visual-qc",model:VISUAL_QC_MODEL,status:final.status,ready:SLOTS.length,scoredCount,total:SLOTS.length,visualScore,pass,error,candidates:clips.filter(c=>c.scored&&c.regenerationCandidate).map(c=>c.slot),motionReview:"pending-sampled-motion-pass"};
}

function motionSheetKey(prefix,slot){return `${prefix}cinema-v23/qc-motion/${slot}.jpg`}
async function motionSheetReadiness(env,deviceId,captureId){
  const avatar=await latestAvatarForDevice(env,deviceId);if(!avatar?.r2_key)return {ready:0,prefix:null};const prefix=avatarPrefix(avatar.r2_key);let ready=0;
  for(const slot of SLOTS){const head=await env.AVATAR_ASSETS.head(motionSheetKey(prefix,slot));if(head&&(!captureId||head.customMetadata?.captureId===captureId))ready++}
  return {ready,prefix};
}
function motionPrompt(slot){return `This image is a 2x2 contact sheet sampled from one 6-second photorealistic Cinema Room clip for slot ${slot}. Read time in this order: top-left about 0.4s, top-right about 2.0s, bottom-left about 3.8s, bottom-right near 5.6s. Compare the same person, pet, room and camera across time. Subtle motion is intentional and must not be penalized. identityStable means the adult remains recognizably the same person. petStable means the companion remains the same animal without species/body drift. anatomyStable means no new malformed hands, limbs, face or pet anatomy appears over time. roomStable means furniture and room geometry do not melt or teleport. lightingContinuous means changes are plausible and gradual. cameraContinuous means no unexplained cut or large jump. motionNatural means the sampled poses form a physically plausible progression. morphFree means no visible melting, duplication or shape drift. loopReturnNatural means the final frame plausibly settles into a calm stable pose suitable for returning to ambient playback; exact pixel matching is not required. artifactFree means no generated text, UI, tearing or severe artifacts. Keep issues short and factual.`}
function normalizeMotion(slot,raw){
  const criteria={};for(const k of MOTION_KEYS){const parsed=typeof raw?.[k]==="boolean"?raw[k]:boolToken(raw?.[k]);if(parsed===null)throw new Error(`Motion QC response missing boolean ${k}`);criteria[k]=parsed}
  const passed=MOTION_KEYS.filter(k=>criteria[k]).length,score=Math.round((passed/MOTION_KEYS.length)*100),severe=!criteria.identityStable||!criteria.petStable||!criteria.anatomyStable||!criteria.morphFree||!criteria.artifactFree,issues=Array.isArray(raw?.issues)?raw.issues.map(cleanIssue).filter(Boolean).slice(0,5):[],note=cleanIssue(raw?.note);
  return {slot,scored:true,score,pass:score>=80&&!severe,regenerationCandidate:score<80||severe,criteria,issues,note,error:null};
}
function unscoredMotion(slot,error){return {slot,scored:false,score:null,pass:false,regenerationCandidate:false,criteria:{},issues:[cleanIssue(error||"motion-qc-error")],note:"Sampled motion QC could not score this clip",error:cleanIssue(error||"motion-qc-error")}}
async function analyzeMotionSheet(env,prefix,slot,captureId){
  try{
    const obj=await env.AVATAR_ASSETS.get(motionSheetKey(prefix,slot));if(!obj)return unscoredMotion(slot,"motion-contact-sheet-missing");if(obj.customMetadata?.captureId!==captureId)return unscoredMotion(slot,"motion-contact-sheet-capture-mismatch");const bytes=new Uint8Array(await obj.arrayBuffer());
    const response=await env.AI.run(MOTION_QC_MODEL,{messages:[{role:"system",content:"You are a strict temporal visual quality inspector. Return only the requested structured result."},{role:"user",content:motionPrompt(slot)}],image:bytesToDataUrl(bytes,"image/jpeg"),response_format:{type:"json_schema",json_schema:MOTION_QC_SCHEMA},chat_template_kwargs:{enable_thinking:false},temperature:0,max_completion_tokens:500,stream:false});
    return normalizeMotion(slot,parseStructuredResponse(response,"Motion QC"));
  }catch(error){return unscoredMotion(slot,error?.message||"motion-qc-error")}
}
async function saveMotionResult(env,result){await writeState(env,MOTION_QC_RESULT_KEY,{...result,updatedAt:new Date().toISOString()})}
function motionPublicShape(result){
  if(!result)return {ok:true,status:"idle",ready:0,scoredCount:0,total:SLOTS.length,complete:false,paidAiTriggered:false,model:MOTION_QC_MODEL,motionScore:null,pass:false,candidates:[],clips:[],error:null,sampling:"4-checkpoint-contact-sheet",autoRegeneration:false,updatedAt:null};
  const clips=(result.clips||[]).map(c=>{const scored=c?.scored===true;return {slot:c.slot,scored,score:scored&&Number.isFinite(Number(c.score))?Number(c.score):null,pass:scored&&c.pass===true,regenerationCandidate:scored&&c.regenerationCandidate===true,issues:Array.isArray(c.issues)?c.issues.slice(0,5):[],error:scored?null:cleanIssue(c.error||c.issues?.[0]||"")}}),scoredClips=clips.filter(c=>c.scored),scoredCount=scoredClips.length,motionScore=scoredCount?Math.round(scoredClips.reduce((a,c)=>a+Number(c.score||0),0)/scoredCount):null,underlyingStatus=String(result.status||"unknown"),scoringError=(underlyingStatus==="complete"||underlyingStatus==="error")&&scoredCount<SLOTS.length,status=scoringError?"error":underlyingStatus,error=scoringError?`Motion QC scored ${scoredCount}/${SLOTS.length} clips; unscored clips are not regeneration candidates.`:(result.error||null);
  return {ok:true,status,ready:Number(result.ready||clips.length||0),scoredCount,total:SLOTS.length,complete:status==="complete"&&scoredCount===SLOTS.length,paidAiTriggered:result.paidAiTriggered===true,model:MOTION_QC_MODEL,motionScore,pass:status==="complete"&&result.pass===true&&scoredCount===SLOTS.length,candidates:clips.filter(c=>c.regenerationCandidate).map(c=>c.slot),clips,error,sampling:"4-checkpoint-contact-sheet",autoRegeneration:false,updatedAt:result.updatedAt||null};
}
async function latestMotionPublic(env){
  if(!env.DB)return {ok:false,statusCode:503,error:"Motion QC monitor is not connected"};const result=await readState(env,MOTION_QC_RESULT_KEY);if(result)return motionPublicShape(result);const pointer=await latestMotionPointer(env);if(!pointer)return motionPublicShape(null);try{const details=await env.CINEMA_WORKFLOW.get(pointer.id).then(x=>x.status());return {...motionPublicShape(null),status:details.status,error:details.error?.message||null,updatedAt:pointer.updatedAt}}catch{return motionPublicShape(null)}
}
async function runMotionQcWorkflow(env,deviceId,captureId,step){
  if(!env.AI)throw new Error("Workers AI binding is required for motion QC");const prepared=await motionSheetReadiness(env,deviceId,captureId);if(prepared.ready!==SLOTS.length||!prepared.prefix)throw new Error(`Motion QC requires 9 matching contact sheets; found ${prepared.ready}`);
  const clips=[];await saveMotionResult(env,{status:"running",ready:0,scoredCount:0,total:SLOTS.length,paidAiTriggered:true,motionScore:null,pass:false,clips,error:null,captureId});
  for(const slot of SLOTS){const result=await step.do(`motion QC ${slot}`,{retries:{limit:1,delay:"5 seconds"},timeout:"3 minutes"},async()=>analyzeMotionSheet(env,prepared.prefix,slot,captureId));clips.push(result);const scored=clips.filter(c=>c.scored===true),motionScore=scored.length?Math.round(scored.reduce((a,c)=>a+Number(c.score||0),0)/scored.length):null;await saveMotionResult(env,{status:"running",ready:clips.length,scoredCount:scored.length,total:SLOTS.length,paidAiTriggered:true,motionScore,pass:false,clips,error:null,captureId})}
  const scored=clips.filter(c=>c.scored===true),scoredCount=scored.length,motionScore=scoredCount?Math.round(scored.reduce((a,c)=>a+Number(c.score||0),0)/scoredCount):null,fullyScored=scoredCount===SLOTS.length,pass=fullyScored&&clips.every(c=>c.pass===true)&&Number(motionScore)>=85,error=fullyScored?null:`Motion QC could not score ${SLOTS.length-scoredCount} of ${SLOTS.length} clips; no unscored clip was marked for regeneration.`;
  const final={status:fullyScored?"complete":"error",ready:SLOTS.length,scoredCount,total:SLOTS.length,paidAiTriggered:true,motionScore,pass,clips,error,captureId};await saveMotionResult(env,final);return {ok:fullyScored,engine:CINEMA_INFO.version,mode:"motion-qc",model:MOTION_QC_MODEL,status:final.status,ready:SLOTS.length,scoredCount,total:SLOTS.length,motionScore,pass,error,candidates:clips.filter(c=>c.scored&&c.regenerationCandidate).map(c=>c.slot),sampling:"4-checkpoint-contact-sheet",autoRegeneration:false};
}

export class CinemaBatchWorkflow extends WorkflowEntrypoint {
  async run(event,step){
    const p=event.payload||{},deviceId=String(p.deviceId||"");if(!deviceId)throw new Error("Cinema Workflow device id missing");
    if(p.mode==="visual-qc")return runVisualQcWorkflow(this.env,deviceId,step);
    if(p.mode==="motion-qc"){const captureId=safeJobId(p.captureId);if(!captureId)throw new Error("Motion QC capture id missing");return runMotionQcWorkflow(this.env,deviceId,captureId,step)}
    const opts={roomStyle:safeChoice(p.roomStyle,["warm","modern","cozy"],"warm"),petKind:safeChoice(p.petKind,["dog","cat"],"dog"),petMode:String(p.petMode||"댕댕이형").slice(0,30),force:false},results=[];
    for(const slot of SLOTS){const result=await step.do(`generate ${slot}`,{retries:{limit:2,delay:"15 seconds",backoff:"exponential"},timeout:"10 minutes"},async()=>runSlot(this.env,deviceId,slot,opts));results.push(result)}
    return {ok:true,engine:CINEMA_INFO.version,ready:results.length,total:SLOTS.length,slots:results.map(x=>x.slot)};
  }
}

export async function handleCinemaBackgroundRoute(request,env,ensureAuth,json){
  const url=new URL(request.url);if(!url.pathname.startsWith("/api/cinema/batch/"))return null;
  if(url.pathname==="/api/cinema/batch/latest-public"&&request.method==="GET"){try{const s=await latestPublicStatus(env);if(!s.ok)return json({ok:false,error:s.error},s.statusCode||503);return json(s)}catch(error){return json({ok:false,error:error?.message||"Cinema progress unavailable"},500)}}
  if(url.pathname==="/api/cinema/batch/quality-public"&&request.method==="GET"){try{const q=await latestTechnicalQuality(env);if(!q.ok)return json({ok:false,error:q.error},q.statusCode||503);return json(q)}catch(error){return json({ok:false,error:error?.message||"Cinema quality manifest unavailable"},500)}}
  if(url.pathname==="/api/cinema/batch/visual-qc/latest-public"&&request.method==="GET"){try{const q=await latestVisualPublic(env);if(!q.ok)return json({ok:false,error:q.error},q.statusCode||503);return json(q)}catch(error){return json({ok:false,error:error?.message||"Cinema visual QC unavailable"},500)}}
  if(url.pathname==="/api/cinema/batch/motion-qc/latest-public"&&request.method==="GET"){try{const q=await latestMotionPublic(env);if(!q.ok)return json({ok:false,error:q.error},q.statusCode||503);return json(q)}catch(error){return json({ok:false,error:error?.message||"Cinema motion QC unavailable"},500)}}
  if(url.pathname==="/api/cinema/batch/public"&&request.method==="GET"){
    if(!env.CINEMA_WORKFLOW)return json({ok:false,error:"Cinema background workflow is not connected"},503);const id=safeJobId(url.searchParams.get("id"));if(!id)return json({ok:false,error:"Invalid job id"},400);
    try{const instance=await env.CINEMA_WORKFLOW.get(id),details=await instance.status();return json({ok:true,id,status:details.status,error:details.error?.message||null,output:details.status==="complete"?details.output||null:null})}catch(error){return json({ok:false,error:error?.message||"Cinema job not found"},404)}
  }

  const auth=await ensureAuth(request,env,true);if(!auth.ok)return auth.response;if(!env.CINEMA_WORKFLOW)return json({ok:false,error:"Cinema background workflow is not connected"},503);
  if(url.pathname==="/api/cinema/batch/start"&&request.method==="POST"){
    const b=await request.json().catch(()=>({}));if(b.confirm_cost!==true)return json({ok:false,error:"AI video generation may incur Cloudflare charges. Explicit confirm_cost=true is required."},402);const params={deviceId:auth.deviceId,roomStyle:safeChoice(b.roomStyle,["warm","modern","cozy"],"warm"),petKind:safeChoice(b.petKind,["dog","cat"],"dog"),petMode:String(b.petMode||"댕댕이형").slice(0,30)};
    try{const id=`cinema-${crypto.randomUUID()}`,startedAt=new Date().toISOString(),instance=await env.CINEMA_WORKFLOW.create({id,params,retention:{successRetention:"3 days",errorRetention:"7 days"}});await saveLatestPointer(env,{id,deviceId:auth.deviceId,startedAt});return json({ok:true,engine:CINEMA_INFO.version,background:true,id,status:(await instance.status()).status,publicStatus:`/api/cinema/batch/public?id=${encodeURIComponent(id)}`,publicLatest:"/api/cinema/batch/latest-public",publicQuality:"/api/cinema/batch/quality-public"})}catch(error){return json({ok:false,error:error?.message||"Cinema background job could not start"},500)}
  }
  if(url.pathname==="/api/cinema/batch/visual-qc/start"&&request.method==="POST"){
    const b=await request.json().catch(()=>({}));if(b.confirm_cost!==true)return json({ok:false,error:"Paid visual AI inspection requires explicit confirm_cost=true."},402);if(!env.AI)return json({ok:false,error:"Workers AI binding is required for visual QC"},503);
    try{const readiness=await visualFrameReadiness(env,auth.deviceId);if(readiness.ready!==SLOTS.length)return json({ok:false,error:`Visual QC requires all 9 Cinema frames; found ${readiness.ready}.`},409);const id=`cinema-qc-${crypto.randomUUID()}`,startedAt=new Date().toISOString(),instance=await env.CINEMA_WORKFLOW.create({id,params:{deviceId:auth.deviceId,mode:"visual-qc"},retention:{successRetention:"3 days",errorRetention:"7 days"}});await saveVisualPointer(env,{id,deviceId:auth.deviceId,startedAt});await saveVisualResult(env,{status:"queued",ready:0,scoredCount:0,total:SLOTS.length,paidAiTriggered:true,visualScore:null,pass:false,clips:[],error:null});return json({ok:true,engine:CINEMA_INFO.version,mode:"visual-qc",model:VISUAL_QC_MODEL,id,status:(await instance.status()).status,publicStatus:`/api/cinema/batch/public?id=${encodeURIComponent(id)}`,publicLatest:"/api/cinema/batch/visual-qc/latest-public",autoRegeneration:false})}catch(error){return json({ok:false,error:error?.message||"Cinema visual QC could not start"},500)}
  }
  if(url.pathname==="/api/cinema/batch/motion-qc/upload"&&request.method==="POST"){
    if(!env.AVATAR_ASSETS)return json({ok:false,error:"R2 binding is required for motion QC"},503);try{const form=await request.formData(),slot=safeSlot(form.get("slot")),captureId=safeJobId(form.get("capture_id")),image=form.get("image");if(!slot||!captureId)return json({ok:false,error:"Invalid motion QC slot or capture id"},400);if(!(image instanceof Blob)||image.size<10000||image.size>2000000||!String(image.type||"image/jpeg").startsWith("image/"))return json({ok:false,error:"Invalid motion QC contact sheet"},400);const avatar=await latestAvatarForDevice(env,auth.deviceId);if(!avatar?.r2_key)return json({ok:false,error:"Saved avatar is required"},409);const prefix=avatarPrefix(avatar.r2_key),key=motionSheetKey(prefix,slot),bytes=await image.arrayBuffer();await env.AVATAR_ASSETS.put(key,bytes,{httpMetadata:{contentType:"image/jpeg",cacheControl:"private, max-age=3600"},customMetadata:{role:"cinema-motion-contact-sheet",slot,captureId,createdAt:new Date().toISOString()}});const readiness=await motionSheetReadiness(env,auth.deviceId,captureId);return json({ok:true,slot,captureId,uploaded:readiness.ready,total:SLOTS.length,paidAiTriggered:false})}catch(error){return json({ok:false,error:error?.message||"Motion QC contact sheet upload failed"},500)}
  }
  if(url.pathname==="/api/cinema/batch/motion-qc/start"&&request.method==="POST"){
    const b=await request.json().catch(()=>({})),captureId=safeJobId(b.capture_id);if(b.confirm_cost!==true)return json({ok:false,error:"Paid sampled motion AI inspection requires explicit confirm_cost=true."},402);if(!captureId)return json({ok:false,error:"Motion QC capture id is required"},400);if(!env.AI)return json({ok:false,error:"Workers AI binding is required for motion QC"},503);
    try{const readiness=await motionSheetReadiness(env,auth.deviceId,captureId);if(readiness.ready!==SLOTS.length)return json({ok:false,error:`Motion QC requires 9 matching contact sheets; found ${readiness.ready}.`},409);const id=`cinema-motion-qc-${crypto.randomUUID()}`,startedAt=new Date().toISOString(),instance=await env.CINEMA_WORKFLOW.create({id,params:{deviceId:auth.deviceId,mode:"motion-qc",captureId},retention:{successRetention:"3 days",errorRetention:"7 days"}});await saveMotionPointer(env,{id,deviceId:auth.deviceId,captureId,startedAt});await saveMotionResult(env,{status:"queued",ready:0,scoredCount:0,total:SLOTS.length,paidAiTriggered:true,motionScore:null,pass:false,clips:[],error:null,captureId});return json({ok:true,engine:CINEMA_INFO.version,mode:"motion-qc",model:MOTION_QC_MODEL,id,status:(await instance.status()).status,publicStatus:`/api/cinema/batch/public?id=${encodeURIComponent(id)}`,publicLatest:"/api/cinema/batch/motion-qc/latest-public",sampling:"4-checkpoint-contact-sheet",autoRegeneration:false})}catch(error){return json({ok:false,error:error?.message||"Cinema motion QC could not start"},500)}
  }
  if(url.pathname==="/api/cinema/batch/status"&&request.method==="GET"){
    const id=safeJobId(url.searchParams.get("id"));if(!id)return json({ok:false,error:"Invalid job id"},400);try{const instance=await env.CINEMA_WORKFLOW.get(id),details=await instance.status();return json({ok:true,id,status:details.status,error:details.error?.message||null,output:details.output||null})}catch(error){return json({ok:false,error:error?.message||"Cinema job not found"},404)}
  }
  return json({ok:false,error:"Not found"},404);
}
