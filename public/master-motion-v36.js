(()=>{
"use strict";
const VERSION="v36-motion-polish";
const V35_URL="/master-motion-v35.js?v=35";
const FULL_BODY=new Set(["master_04_return_home","master_05_sit_down","master_06_walk_to_window"]);
const ROUTES=new Set(["entry>sofa","sofa>window","window>sofa","sofa>pet","pet>sofa"]);
const SETTLE={micro:260,full:360,transition:220,returnGap:320,modeGap:300};
let v35Requested=false,seq=0,current="",currentSlot="",lastMaster="",repeatCount=0,lastMode="",lastPlayAt=0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function v35(){return window.masterMotionV35||null}
function requestV35(){if(v35()||v35Requested||document.querySelector('script[data-master-motion-v35]'))return;v35Requested=true;const s=document.createElement("script");s.src=V35_URL;s.async=true;s.dataset.masterMotionV35="1";document.head.appendChild(s)}
async function waitV35(){requestV35();for(let n=0;n<40&&!v35();n++)await sleep(50);return v35()}
function norm(x){return x==="pet"?"sofa":String(x||"home")}
function currentState(){const s=v35()?.status?.()||{};return {location:norm(s.logicalLocation),pose:String(s.logicalPose||"standing")}}
function mappedMaster(slotId){return v35()?.mappedMaster?.(slotId)||""}
function canPlaySlot(slotId){return Boolean(mappedMaster(slotId))}
function qualityForSlot(slotId){return v35()?.qualityForSlot?.(slotId)||{slotId,masterId:mappedMaster(slotId),grade:"unknown",score:0}}
function canRoute(from,to){const a=norm(from),b=norm(to);if(a===b)return true;return ROUTES.has(`${a}>${b}`)}
function cadenceFor(slotId){const q=qualityForSlot(slotId),m=q.masterId||mappedMaster(slotId);if(String(slotId).startsWith("transition_"))return SETTLE.transition;if(FULL_BODY.has(m))return SETTLE.full;return SETTLE.micro}
function repeatPenalty(masterId){if(!masterId)return 0;if(masterId!==lastMaster)return 0;return repeatCount>=2?18:repeatCount===1?8:0}
function naturalScore(slotId,{currentLocation=""}={}){const q=qualityForSlot(slotId),masterId=q.masterId||mappedMaster(slotId);let score=Number(q.score)||0;score-=repeatPenalty(masterId);const target=window.sceneV28?.manifest?.()?.scenes?.find?.(s=>s.id===slotId)?.start?.location||"";if(target&&currentLocation){const a=norm(currentLocation),b=norm(target);if(a===b)score+=10;else if(canRoute(a,b))score+=3;else score-=14}return score}
async function settle(ms){const n=Math.max(0,Number(ms)||0);if(n)await sleep(n)}
function markMaster(masterId){if(!masterId)return;if(masterId===lastMaster)repeatCount+=1;else{lastMaster=masterId;repeatCount=1}lastPlayAt=Date.now()}
async function playMaster(id,opts={}){const e=await waitV35();if(!e?.playMaster)return false;const my=++seq;current=id;currentSlot="";if(Date.now()-lastPlayAt<180)await settle(180);if(my!==seq)return false;const ok=Boolean(await e.playMaster(id,{...opts,motionPolishV36:true}));if(my!==seq)return false;if(ok){markMaster(id);await settle(FULL_BODY.has(id)?SETTLE.full:SETTLE.micro)}current="";return ok}
async function playForSlot(slotId,opts={}){const e=await waitV35();if(!e?.playForSlot)return false;const my=++seq,masterId=mappedMaster(slotId);current=masterId;currentSlot=slotId;const scene=window.sceneV28?.manifest?.()?.scenes?.find?.(s=>s.id===slotId)||null;const state=currentState(),target=norm(scene?.start?.location||state.location);if(state.location!==target&&!canRoute(state.location,target)){current="";currentSlot="";return false}if(Date.now()-lastPlayAt<160)await settle(160);if(my!==seq)return false;const ok=Boolean(await e.playForSlot(slotId,{...opts,motionPolishV36:true}));if(my!==seq)return false;if(ok){markMaster(masterId);await settle(cadenceFor(slotId))}current="";currentSlot="";return ok}
async function playTransition(from,to){const e=await waitV35();if(!e?.playTransition)return false;if(!canRoute(from,to))return false;const my=++seq;await settle(120);if(my!==seq)return false;const ok=Boolean(await e.playTransition(from,to));if(my!==seq)return false;if(ok)await settle(SETTLE.transition);return ok}
async function playForMode(mode){lastMode=String(mode||"");if(lastMode==="day")return false;const e=await waitV35();if(!e)return false;if(lastMode==="return"){
 const my=++seq;current="master_04_return_home>master_05_sit_down";
 const a=Boolean(await e.playMaster?.("master_04_return_home",{motionPolishV36:true}));if(my!==seq||!a)return false;markMaster("master_04_return_home");await settle(SETTLE.returnGap);if(my!==seq)return false;
 const b=Boolean(await e.playMaster?.("master_05_sit_down",{motionPolishV36:true}));if(my!==seq)return false;if(b){markMaster("master_05_sit_down");await settle(SETTLE.full)}current="";return Boolean(a&&b)
 }
 if(Date.now()-lastPlayAt<SETTLE.modeGap)await settle(SETTLE.modeGap);if(seq<0)return false;
 const ok=Boolean(await e.playForMode?.(lastMode));if(ok){const st=e.status?.()||{};if(st.current||st.currentSlot){}lastPlayAt=Date.now();await settle(SETTLE.micro)}return ok
}
async function playAllMasters(opts={}){const e=await waitV35();return e?.playAllMasters?e.playAllMasters(opts):{ok:false,results:[]}}
function continuityReport(){return v35()?.continuityReport?.()||{total:0,counts:{},roughSlots:[]}}
function qc(){const r=continuityReport();return {version:VERSION,total:r.total||0,counts:r.counts||{},roughSlots:r.roughSlots||[],repeatMaster:lastMaster,repeatCount,routePairs:[...ROUTES],settleMs:{...SETTLE},freeOnly:true,paidGeneration:false}}
function stop(){seq++;v35()?.stop?.();current="";currentSlot=""}
function status(){const s=v35()?.status?.()||{};return {version:VERSION,current,currentSlot,lastMode,lastMaster,repeatCount,logicalLocation:norm(s.logicalLocation),logicalPose:s.logicalPose||"standing",mappedSlots:s.mappedSlots||0,roughSlotCount:s.roughSlotCount||0,settleMs:{...SETTLE},freeOnly:true,paidGeneration:false,delegatesTo:"v35-continuity-qc"}}
async function boot(){requestV35();const e=await waitV35();if(!e)return;window.masterMotionV36={version:VERSION,status,qc,continuityReport,qualityForSlot,naturalScore,canRoute,cadenceFor,canPlaySlot,mappedMaster,playMaster,playForSlot,playTransition,playForMode,playAllMasters,stop};window.dispatchEvent(new CustomEvent("p2:master-motion-v36-ready",{detail:status()}))}
window.addEventListener("beforeunload",()=>stop());
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,1160),{once:true});else setTimeout(boot,1160);
})();
