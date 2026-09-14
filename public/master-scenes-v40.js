(()=>{
"use strict";
const VERSION="v40-eight-master-assets";
const MANIFEST_URL="/master-scenes-v40-manifest.json?v=40";
const TIME_MODES=["morning","leave","day","return","evening","night"];
const TIME_POOLS={
 morning:["master_07_morning_life"],
 leave:[],day:[],
 return:["master_04_return_home","master_05_sit_down"],
 evening:["master_01_sofa_relax","master_03_pet_touch","master_06_walk_to_window","master_02_window_gaze","master_05_sit_down"],
 risk:["master_03_pet_touch","master_01_sofa_relax","master_02_window_gaze"],
 night:["master_08_night_rest"]
};
let manifest=null,loading=null,current="",currentSource="",bridgeDone=false,seq=0;
const modeIndex={morning:0,leave:0,day:0,return:0,evening:0,risk:0,night:0};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function byId(id){return document.getElementById(id)}
async function loadManifest(){
 if(manifest)return manifest;if(loading)return loading;
 loading=(async()=>{try{const r=await fetch(MANIFEST_URL,{cache:"no-store"});if(!r.ok)throw new Error(`manifest ${r.status}`);const d=await r.json();if(d?.version!==VERSION||d?.freeOnly!==true||d?.paidGeneration!==false||!Array.isArray(d?.masters)||d.masters.length!==8)throw new Error("manifest validation");manifest=d;return d}catch(e){console.warn("master scenes v40 manifest",e);return null}})();return loading
}
function entry(id){return manifest?.masters?.find?.(x=>x.id===id)||null}
function ensureLayer(){
 const room=byId("room");if(!room)return null;
 let img=byId("masterScene40");
 if(!img){img=document.createElement("img");img.id="masterScene40";img.className="masterScene40";img.alt="마이라이프룸 생활 장면";img.decoding="async";img.loading="eager";room.appendChild(img)}
 return {room,img}
}
function legacyHidden(active){const room=byId("room");if(!room)return;room.classList.toggle("master40-active",Boolean(active));if(!active){delete room.dataset.master40;delete room.dataset.master40Source}}
async function showMaster(id,{source="manual"}={}){
 const my=++seq;if(!manifest&&!await loadManifest())return false;const m=entry(id);if(!m)return false;const layer=ensureLayer();if(!layer)return false;
 const {room,img}=layer;current=id;currentSource=source;room.dataset.master40=id;room.dataset.master40Source=source;room.classList.add("master40-loading");
 img.style.objectFit=m.fit||"cover";img.style.objectPosition=m.position||"50% 50%";
 const src=m.src;
 if(img.getAttribute("src")!==src){
   img.style.opacity="0";
   await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;resolve()};img.onload=finish;img.onerror=finish;img.src=src;setTimeout(finish,2200)});
 }
 if(my!==seq)return false;
 room.classList.remove("master40-loading");legacyHidden(true);requestAnimationFrame(()=>{img.style.opacity=""});
 window.dispatchEvent(new CustomEvent("p2:master-scene-v40-show",{detail:{id,label:m.label,source}}));
 return true
}
function hideMaster({source="hide"}={}){seq++;const room=byId("room"),img=byId("masterScene40");if(room){room.classList.remove("master40-loading");legacyHidden(false)}if(img)img.style.opacity="0";current="";currentSource=source;return true}
function nextForMode(mode){const pool=TIME_POOLS[mode]||[];if(!pool.length)return "";const i=modeIndex[mode]||0;const id=pool[i%pool.length];modeIndex[mode]=i+1;return id}
async function showForTime(mode,{cycle=false,source="time"}={}){
 const m=String(mode||"");if(m==="leave"||m==="day"){hideMaster({source:m});return false}
 const pool=TIME_POOLS[m]||[];if(!pool.length)return false;let id=pool[0];if(cycle)id=nextForMode(m);
 if(m==="return"){
   const my=seq+1;const ok=await showMaster("master_04_return_home",{source:`${source}:return`});
   if(ok){setTimeout(()=>{if(seq===my)showMaster("master_05_sit_down",{source:`${source}:return-settle`})},2300)}
   return ok
 }
 return showMaster(id,{source})
}
async function waitMotion(){for(let n=0;n<80;n++){const e=window.masterMotionV36||window.masterMotionV35||window.masterMotionV34;if(e)return e;await sleep(50)}return null}
async function showForSlot(slotId,{source="slot"}={}){const e=await waitMotion();const id=e?.mappedMaster?.(slotId)||"";if(!id)return false;return showMaster(id,{source:`${source}:${slotId}`})}
function patchEngine(e,name){
 if(!e||e.__masterSceneV40Patched)return false;e.__masterSceneV40Patched=true;
 const origPlayMaster=typeof e.playMaster==="function"?e.playMaster.bind(e):null;
 const origPlayForSlot=typeof e.playForSlot==="function"?e.playForSlot.bind(e):null;
 const origPlayForMode=typeof e.playForMode==="function"?e.playForMode.bind(e):null;
 const origStop=typeof e.stop==="function"?e.stop.bind(e):null;
 if(origPlayMaster)e.playMaster=async(id,opts={})=>{await showMaster(id,{source:`${name}:master`});return origPlayMaster(id,opts)};
 if(origPlayForSlot)e.playForSlot=async(slotId,opts={})=>{const id=e.mappedMaster?.(slotId)||"";if(id)await showMaster(id,{source:`${name}:slot:${slotId}`});return origPlayForSlot(slotId,opts)};
 if(origPlayForMode)e.playForMode=async(mode,...args)=>{
   const m=String(mode||"");
   if(m==="day"||m==="leave")hideMaster({source:`${name}:${m}`});
   else if(m==="return"){
     const guard=seq+1;await showMaster("master_04_return_home",{source:`${name}:return`});setTimeout(()=>{if(seq===guard)showMaster("master_05_sit_down",{source:`${name}:return-settle`})},2300);
   }else{const id=nextForMode(m);if(id)await showMaster(id,{source:`${name}:mode:${m}`})}
   return origPlayForMode(mode,...args)
 };
 if(origStop)e.stop=(...args)=>origStop(...args);
 return true
}
async function bridgeMotion(){
 if(bridgeDone)return;for(let n=0;n<80;n++){
   let did=false;did=patchEngine(window.masterMotionV36,"v36")||did;did=patchEngine(window.masterMotionV35,"v35")||did;did=patchEngine(window.masterMotionV34,"v34")||did;
   if(window.masterMotionV36&&did){bridgeDone=true;break}await sleep(50)
 }
}
function modeFromButton(btn){const buttons=[...document.querySelectorAll("#home .times button")];const idx=buttons.indexOf(btn);return TIME_MODES[idx]||""}
function wireTimeButtons(){document.querySelectorAll("#home .times button").forEach(btn=>{if(btn.dataset.master40Wired)return;btn.dataset.master40Wired="1";btn.addEventListener("click",()=>{const m=modeFromButton(btn);setTimeout(()=>showForTime(m,{cycle:true,source:"time-button"}),40)})})}
function inferCurrentMode(){const t=String(window.currentTime||"");if(TIME_MODES.includes(t))return t;const buttons=[...document.querySelectorAll("#home .times button")];const idx=buttons.findIndex(b=>b.classList.contains("active"));return TIME_MODES[idx]||"day"}
async function status(){if(!manifest)await loadManifest();return {version:VERSION,current,currentSource,masterCount:manifest?.masters?.length||0,bridgeDone,freeOnly:true,paidGeneration:false}}
async function boot(){
 if(!await loadManifest())return;ensureLayer();wireTimeButtons();await bridgeMotion();
 const mode=inferCurrentMode();if(mode!=="day"&&mode!=="leave")await showForTime(mode,{cycle:false,source:"boot"});else hideMaster({source:`boot:${mode}`});
 window.masterSceneV40={version:VERSION,status,showMaster,showForSlot,showForTime,hide:hideMaster,manifest:()=>manifest,ids:()=>manifest?.masters?.map(x=>x.id)||[]};
 window.dispatchEvent(new CustomEvent("p2:master-scenes-v40-ready",{detail:await status()}));
}
for(const ev of ["p2:master-motion-v34-ready","p2:master-motion-v35-ready","p2:master-motion-v36-ready"])window.addEventListener(ev,()=>setTimeout(bridgeMotion,30));
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,1250),{once:true});else setTimeout(boot,1250);
})();
