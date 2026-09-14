(()=>{
"use strict";
const VERSION="v40-eight-master-assets";
const MANIFEST_URL="/master-scenes-v40-manifest.json?v=40";
const TIME_MODES=["morning","leave","day","return","evening","night"];
const TIME_POOLS={
 morning:["master_07_morning_life"],
 leave:["master_06_walk_to_window"],
 day:["master_02_window_gaze"],
 return:["master_04_return_home","master_05_sit_down"],
 evening:["master_01_sofa_relax","master_03_pet_touch","master_06_walk_to_window","master_02_window_gaze","master_05_sit_down"],
 risk:["master_03_pet_touch","master_01_sofa_relax","master_02_window_gaze"],
 night:["master_08_night_rest"]
};
let manifest=null,loading=null,current="",currentSource="",seq=0,observer=null;
const modeIndex={morning:0,leave:0,day:0,return:0,evening:0,risk:0,night:0};
function byId(id){return document.getElementById(id)}
async function loadManifest(){
 if(manifest)return manifest;if(loading)return loading;
 loading=(async()=>{try{const r=await fetch(MANIFEST_URL,{cache:"no-store"});if(!r.ok)throw new Error(`manifest ${r.status}`);const d=await r.json();if(d?.version!==VERSION||d?.freeOnly!==true||d?.paidGeneration!==false||!Array.isArray(d?.masters)||d.masters.length!==8)throw new Error("manifest validation");manifest=d;return d}catch(e){console.warn("master scenes v40 manifest",e);return null}})();return loading
}
function entry(id){return manifest?.masters?.find?.(x=>x.id===id)||null}
function pinShell(room){
 if(!room)return;
 room.classList.add("master40-shell","master40-active");
 if(!observer){
   observer=new MutationObserver(()=>{if(!room.classList.contains("master40-shell")||!room.classList.contains("master40-active")){room.classList.add("master40-shell","master40-active")}});
   observer.observe(room,{attributes:true,attributeFilter:["class"]});
 }
}
function ensureLayer(){
 const room=byId("room");if(!room)return null;pinShell(room);
 let img=byId("masterScene40");
 if(!img){img=document.createElement("img");img.id="masterScene40";img.className="masterScene40";img.alt="마이라이프룸 생활 장면";img.decoding="async";img.loading="eager";room.appendChild(img)}
 return {room,img}
}
async function showMaster(id,{source="manual"}={}){
 const my=++seq;if(!manifest&&!await loadManifest())return false;const m=entry(id);if(!m)return false;const layer=ensureLayer();if(!layer)return false;
 const {room,img}=layer;current=id;currentSource=source;room.dataset.master40=id;room.dataset.master40Source=source;room.classList.add("master40-loading");
 img.style.objectFit=m.fit||"cover";img.style.objectPosition=m.position||"50% 50%";
 const src=m.src;
 if(img.getAttribute("src")!==src){
   await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;resolve()};img.onload=finish;img.onerror=finish;img.src=src;setTimeout(finish,2200)});
 }
 if(my!==seq)return false;
 room.classList.remove("master40-loading");pinShell(room);
 window.dispatchEvent(new CustomEvent("p2:master-scene-v40-show",{detail:{id,label:m.label,source}}));
 return true
}
function keepMaster({source="keep"}={}){const room=byId("room");if(room){pinShell(room);room.dataset.master40Source=source}return true}
function nextForMode(mode){const pool=TIME_POOLS[mode]||[];if(!pool.length)return "";const i=modeIndex[mode]||0;const id=pool[i%pool.length];modeIndex[mode]=i+1;return id}
async function showForTime(mode,{cycle=false,source="time"}={}){
 const m=String(mode||"");const pool=TIME_POOLS[m]||[];if(!pool.length)return keepMaster({source:`${source}:${m}:keep`});let id=pool[0];if(cycle)id=nextForMode(m);
 if(m==="return"){
   const my=seq+1;const ok=await showMaster("master_04_return_home",{source:`${source}:return`});
   if(ok){setTimeout(()=>{if(seq===my)showMaster("master_05_sit_down",{source:`${source}:return-settle`})},2300)}
   return ok
 }
 return showMaster(id,{source})
}
function modeFromButton(btn){const buttons=[...document.querySelectorAll("#home .times button")];const idx=buttons.indexOf(btn);return TIME_MODES[idx]||""}
function wireTimeButtons(){document.querySelectorAll("#home .times button").forEach(btn=>{if(btn.dataset.master40Wired)return;btn.dataset.master40Wired="1";btn.addEventListener("click",()=>{const m=modeFromButton(btn);setTimeout(()=>showForTime(m,{cycle:true,source:"time-button"}),40)})})}
function inferCurrentMode(){const t=String(window.currentTime||"");if(TIME_MODES.includes(t))return t;const buttons=[...document.querySelectorAll("#home .times button")];const idx=buttons.findIndex(b=>b.classList.contains("active"));return TIME_MODES[idx]||"evening"}
async function status(){if(!manifest)await loadManifest();return {version:VERSION,current,currentSource,masterCount:manifest?.masters?.length||0,masterOnly:true,freeOnly:true,paidGeneration:false}}
async function boot(){
 if(!await loadManifest())return;ensureLayer();wireTimeButtons();
 const mode=inferCurrentMode();const ok=await showForTime(mode,{cycle:false,source:"boot"});if(!ok&&!current)await showMaster("master_01_sofa_relax",{source:"boot-fallback"});
 window.masterSceneV40={version:VERSION,status,showMaster,showForTime,hide:keepMaster,manifest:()=>manifest,ids:()=>manifest?.masters?.map(x=>x.id)||[]};
 window.dispatchEvent(new CustomEvent("p2:master-scenes-v40-ready",{detail:await status()}));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,250),{once:true});else setTimeout(boot,250);
})();
