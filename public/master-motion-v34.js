(()=>{
"use strict";
const VERSION="v34-eight-to-fifty";
const MAP_URL="/master-motion-v34-map.json?v=34";
const V33_URL="/master-motion-v33.js?v=33";
const MASTER_IDS=[
 "master_01_sofa_relax","master_02_window_gaze","master_03_pet_touch","master_04_return_home",
 "master_05_sit_down","master_06_walk_to_window","master_07_morning_life","master_08_night_rest"
];
const MODE_MAP={
 morning:["master_07_morning_life","master_01_sofa_relax"],
 return:["master_04_return_home","master_05_sit_down"],
 day:[],
 evening:["master_01_sofa_relax","master_02_window_gaze","master_03_pet_touch","master_06_walk_to_window"],
 risk:["master_08_night_rest","master_02_window_gaze","master_01_sofa_relax"],
 night:["master_08_night_rest","master_02_window_gaze"]
};
const TRANSITIONS={
 "entry>sofa":"transition_entry_to_sofa",
 "sofa>standing":"transition_sofa_to_stand",
 "sofa>window":"transition_sofa_to_window",
 "window>sofa":"transition_window_to_sofa",
 "sofa>pet":"transition_sofa_to_pet",
 "pet>sofa":"transition_pet_to_sofa"
};
const MASTER_END={
 master_01_sofa_relax:{location:"sofa",pose:"seated"},master_02_window_gaze:{location:"window",pose:"standing"},
 master_03_pet_touch:{location:"pet",pose:"crouch"},master_04_return_home:{location:"entry",pose:"standing"},
 master_05_sit_down:{location:"sofa",pose:"seated"},master_06_walk_to_window:{location:"window",pose:"standing"},
 master_07_morning_life:{location:"home",pose:"standing"},master_08_night_rest:{location:"sofa",pose:"seated"}
};
let map=null,loading=null,v33Requested=false,current="",currentSlot="",lastMode="",seq=0;
let logical={location:"home",pose:"standing"};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function v33(){return window.masterMotionV33||null}
function scene(){return window.sceneV28||null}
function requestV33(){if(v33()||v33Requested||document.querySelector('script[data-master-motion-v33]'))return;v33Requested=true;const s=document.createElement("script");s.src=V33_URL;s.async=true;s.dataset.masterMotionV33="1";document.head.appendChild(s)}
async function waitV33(){requestV33();for(let n=0;n<30&&!v33();n++)await sleep(50);return v33()}
async function loadMap(){if(map)return true;if(loading)return loading;loading=(async()=>{try{const r=await fetch(MAP_URL,{cache:"no-store"});if(!r.ok)throw new Error(`map ${r.status}`);const d=await r.json();if(d?.version!==VERSION||d?.freeOnly!==true||d?.paidGeneration!==false||Number(d?.masterCount)!==8||Number(d?.slotCount)!==50)throw new Error("map validation");if(Object.keys(d.slots||{}).length!==50)throw new Error("slot coverage");map=d;return true}catch(e){console.warn("master motion v34",e);map=null;return false}})();return loading}
function sceneEntry(id){return scene()?.manifest?.()?.scenes?.find?.(s=>s.id===id)||null}
function applyLogical(slotId,masterId){const s=sceneEntry(slotId);if(s?.end?.location)logical={location:s.end.location,pose:s.end.pose||logical.pose};else if(MASTER_END[masterId])logical={...MASTER_END[masterId]}}
function mappedMaster(slotId){return map?.slots?.[slotId]||""}
function canPlaySlot(slotId){return Boolean(mappedMaster(slotId))}
async function playMaster(id,opts={}){if(!MASTER_IDS.includes(id))return false;const my=++seq,currentEngine=await waitV33();if(my!==seq||!currentEngine?.play)return false;current=id;currentSlot="";const ok=Boolean(await currentEngine.play(id,opts));if(my!==seq)return false;if(ok&&MASTER_END[id])logical={...MASTER_END[id]};current="";return ok}
async function playForSlot(slotId,opts={}){if(!map&&!(await loadMap()))return false;const masterId=mappedMaster(slotId);if(!masterId)return false;const my=++seq,currentEngine=await waitV33();if(my!==seq||!currentEngine?.play)return false;current=masterId;currentSlot=slotId;const ok=Boolean(await currentEngine.play(masterId,opts));if(my!==seq)return false;if(ok)applyLogical(slotId,masterId);current="";currentSlot="";return ok}
async function playTransition(from,to){if(!map&&!(await loadMap()))return false;const slot=TRANSITIONS[`${from}>${to}`]||"";if(slot)return playForSlot(slot,{transition:true});return false}
async function playForMode(mode){lastMode=String(mode||"");if(lastMode==="day")return false;const engine=await waitV33();if(!engine)return false;if(lastMode==="return"&&engine.playReturnChain){const my=++seq;current="master_04_return_home>master_05_sit_down";const ok=Boolean(await engine.playReturnChain());if(my!==seq)return false;if(ok)logical={location:"sofa",pose:"seated"};current="";return ok}const ids=MODE_MAP[lastMode]||[];if(!ids.length)return false;const id=ids[Math.floor(Math.random()*ids.length)]||ids[0];return playMaster(id)}
async function playAllMasters({gapMs=120}={}){const results=[];for(const id of MASTER_IDS){const ok=await playMaster(id,{qc:true});results.push({id,ok});if(!ok)break;await sleep(Math.max(0,Number(gapMs)||0))}return {ok:results.length===8&&results.every(x=>x.ok),results}}
function qc(){const manifestScenes=scene()?.manifest?.()?.scenes||[];const ids=manifestScenes.length?manifestScenes.map(s=>s.id):Object.keys(map?.slots||{});const missing=ids.filter(id=>!mappedMaster(id));const mapped=ids.length-missing.length;return {version:VERSION,masterCount:MASTER_IDS.length,slotTarget:50,mappedSlots:mapped,missingSlots:missing,transitionSlots:Object.values(TRANSITIONS),freeOnly:true,paidGeneration:false}}
function stop(){seq++;v33()?.stop?.();current="";currentSlot=""}
function status(){const q=qc();return {...q,current,currentSlot,lastMode,logicalLocation:logical.location,logicalPose:logical.pose,mapReady:Boolean(map),delegatesTo:"v33-keyframe-motion-33.1"}}
async function boot(){requestV33();const ok=await loadMap();if(!ok)return;window.masterMotionV34={version:VERSION,status,qc,canPlaySlot,mappedMaster,playMaster,playForSlot,playTransition,playForMode,playAllMasters,stop,masterIds:()=>[...MASTER_IDS]};window.dispatchEvent(new CustomEvent("p2:master-motion-v34-ready",{detail:status()}))}
window.addEventListener("beforeunload",()=>stop());
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,1120),{once:true});else setTimeout(boot,1120);
})();
