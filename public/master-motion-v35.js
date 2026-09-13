(()=>{
"use strict";
const VERSION="v35-continuity-qc";
const V34_URL="/master-motion-v34.js?v=34";
const SCENE_MANIFEST_URL="/scene-library-v28-manifest.json?v=28";
const FLEXIBLE=new Set(["master_01_sofa_relax","master_02_window_gaze","master_03_pet_touch","master_07_morning_life","master_08_night_rest"]);
const FIXED={
 master_04_return_home:{start:{location:"entry",pose:"standing"},end:{location:"entry",pose:"standing"}},
 master_05_sit_down:{start:{location:"entry",pose:"standing"},end:{location:"sofa",pose:"seated"}},
 master_06_walk_to_window:{start:{location:"sofa",pose:"seated"},end:{location:"window",pose:"standing"}}
};
const ROUTES={
 "entry>sofa":"transition_entry_to_sofa",
 "sofa>window":"transition_sofa_to_window",
 "window>sofa":"transition_window_to_sofa",
 "sofa>pet":"transition_sofa_to_pet",
 "pet>sofa":"transition_pet_to_sofa"
};
let sceneManifest=null,manifestLoading=null,v34Requested=false,seq=0,current="",currentSlot="",lastMode="";
let logical={location:"home",pose:"standing"};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function v34(){return window.masterMotionV34||null}
function normalizeLocation(x){return x==="pet"?"sofa":String(x||"home")}
function normalizeState(s={}){return {location:normalizeLocation(s.location),pose:String(s.pose||"standing")}}
function sameState(a,b){const x=normalizeState(a),y=normalizeState(b);return x.location===y.location&&x.pose===y.pose}
function requestV34(){if(v34()||v34Requested||document.querySelector('script[data-master-motion-v34]'))return;v34Requested=true;const s=document.createElement("script");s.src=V34_URL;s.async=true;s.dataset.masterMotionV34="1";document.head.appendChild(s)}
async function waitV34(){requestV34();for(let n=0;n<36&&!v34();n++)await sleep(50);return v34()}
async function loadManifest(){if(sceneManifest)return true;if(manifestLoading)return manifestLoading;manifestLoading=(async()=>{try{const r=await fetch(SCENE_MANIFEST_URL,{cache:"no-store"});if(!r.ok)throw new Error(`scene manifest ${r.status}`);const d=await r.json();if(!Array.isArray(d?.scenes)||d.scenes.length!==50)throw new Error("scene manifest validation");sceneManifest=d;return true}catch(e){console.warn("master motion v35",e);sceneManifest=null;return false}})();return manifestLoading}
function entry(id){return sceneManifest?.scenes?.find?.(s=>s.id===id)||null}
function mappedMaster(slotId){return v34()?.mappedMaster?.(slotId)||""}
function canPlaySlot(slotId){return Boolean(mappedMaster(slotId))}
function fixedState(masterId){return FIXED[masterId]||null}
function qualityForSlot(slotId){
 const s=entry(slotId),m=mappedMaster(slotId);if(!s||!m)return {slotId,masterId:m||"",grade:"missing",score:-100};
 if(FLEXIBLE.has(m)){
   if(s.type==="transition")return {slotId,masterId:m,grade:"soft-transition",score:4};
   return {slotId,masterId:m,grade:"adaptive",score:16};
 }
 const f=fixedState(m);if(!f)return {slotId,masterId:m,grade:"unknown",score:0};
 const startExact=sameState(s.start,f.start),endExact=sameState(s.end,f.end);
 if(startExact&&endExact)return {slotId,masterId:m,grade:"exact",score:22};
 if(endExact)return {slotId,masterId:m,grade:"end-match",score:10};
 if(startExact)return {slotId,masterId:m,grade:"start-match",score:8};
 return {slotId,masterId:m,grade:"rough",score:1};
}
function scoreSlot(slotId){return qualityForSlot(slotId).score}
function continuityReport(){
 const rows=(sceneManifest?.scenes||[]).map(s=>qualityForSlot(s.id));
 const counts={exact:0,adaptive:0,"end-match":0,"start-match":0,"soft-transition":0,rough:0,missing:0,unknown:0};
 for(const r of rows)counts[r.grade]=(counts[r.grade]||0)+1;
 return {version:VERSION,total:rows.length,counts,roughSlots:rows.filter(r=>r.grade==="rough"||r.grade==="missing"||r.grade==="unknown"),transitionSlots:rows.filter(r=>entry(r.slotId)?.type==="transition"),freeOnly:true,paidGeneration:false};
}
async function routeTo(target={}){
 const want=normalizeState(target),have=normalizeState(logical);
 if(sameState(have,want)){logical=want;return true}
 if(have.location===want.location){logical=want;return true}
 const engine=await waitV34();if(!engine)return false;
 const rawFrom=have.location==="sofa"&&logical.location==="pet"?"pet":have.location;
 const rawTo=want.location;
 const key=`${rawFrom}>${rawTo}`;
 const slot=ROUTES[key]||ROUTES[`${have.location}>${want.location}`]||"";
 if(slot&&engine.playForSlot){const ok=Boolean(await engine.playForSlot(slot,{continuityRoute:true}));if(ok){const s=entry(slot);logical=normalizeState(s?.end||want);if(logical.location===want.location)logical=want;return true}}
 try{const ok=Boolean(await engine.playTransition?.(rawFrom,rawTo));if(ok){logical=want;return true}}catch(e){console.warn("v35 route",e)}
 return false
}
async function playMaster(id,opts={}){
 const engine=await waitV34();if(!engine?.playMaster)return false;const my=++seq;current=id;currentSlot="";
 const ok=Boolean(await engine.playMaster(id,opts));if(my!==seq)return false;
 if(ok){const f=fixedState(id);if(f)logical=normalizeState(f.end)}current="";return ok
}
async function playForSlot(slotId,opts={}){
 if(!sceneManifest&&!(await loadManifest()))return false;const s=entry(slotId),masterId=mappedMaster(slotId);if(!s||!masterId)return false;
 const my=++seq,currentEngine=await waitV34();if(my!==seq||!currentEngine?.playForSlot)return false;
 const targetStart=normalizeState(s.start);if(!sameState(logical,targetStart))await routeTo(s.start);
 if(my!==seq)return false;current=masterId;currentSlot=slotId;
 const ok=Boolean(await currentEngine.playForSlot(slotId,{...opts,continuityV35:true}));if(my!==seq)return false;
 if(ok){const f=fixedState(masterId);logical=f?normalizeState(f.end):normalizeState(s.end)}
 current="";currentSlot="";return ok
}
async function playTransition(from,to){
 if(!sceneManifest&&!(await loadManifest()))return false;
 const have=normalizeLocation(from),want=normalizeLocation(to);
 if(have===want){logical={location:want,pose:logical.pose};return true}
 return routeTo({location:to,pose:to==="sofa"?"seated":"standing"})
}
async function playForMode(mode){
 lastMode=String(mode||"");if(lastMode==="day")return false;const engine=await waitV34();if(!engine)return false;
 if(lastMode==="return"){
   const my=++seq;current="master_04_return_home>master_05_sit_down";
   const ok=Boolean(await engine.playForMode?.("return"));if(my!==seq)return false;
   if(ok)logical={location:"sofa",pose:"seated"};current="";return ok
 }
 const ok=Boolean(await engine.playForMode?.(lastMode));if(ok){const st=engine.status?.()||{};if(st.logicalLocation)logical={location:normalizeLocation(st.logicalLocation),pose:st.logicalPose||logical.pose}}return ok
}
async function playAllMasters(opts={}){const engine=await waitV34();return engine?.playAllMasters?engine.playAllMasters(opts):{ok:false,results:[]}}
function qc(){const r=continuityReport();return {...r,logicalLocation:logical.location,logicalPose:logical.pose}}
function stop(){seq++;v34()?.stop?.();current="";currentSlot=""}
function status(){const r=continuityReport();return {version:VERSION,freeOnly:true,paidGeneration:false,current,currentSlot,lastMode,logicalLocation:logical.location,logicalPose:logical.pose,mappedSlots:r.total,continuityCounts:r.counts,roughSlotCount:r.roughSlots.length,delegatesTo:"v34-eight-to-fifty"}}
async function boot(){requestV34();const ok=await loadManifest();if(!ok)return;await waitV34();window.masterMotionV35={version:VERSION,status,qc,continuityReport,qualityForSlot,scoreSlot,normalizeLocation,canPlaySlot,mappedMaster,playMaster,playForSlot,playTransition,playForMode,playAllMasters,routeTo,stop};window.dispatchEvent(new CustomEvent("p2:master-motion-v35-ready",{detail:status()}))}
window.addEventListener("beforeunload",()=>stop());
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,1140),{once:true});else setTimeout(boot,1140);
})();
