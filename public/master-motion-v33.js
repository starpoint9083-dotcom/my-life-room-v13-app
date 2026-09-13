(()=>{
"use strict";
const VERSION="v33-keyframe-motion-456";
const V32_ENGINE="/master-motion-v32.js?v=32";
const ASSET_ENGINE="/master-motion-v33-assets.js?v=33";
const KEY_IDS=new Set(["master_04_return_home","master_05_sit_down","master_06_walk_to_window"]);
const DURATION={master_04_return_home:5400,master_05_sit_down:5000,master_06_walk_to_window:5600};
const byId=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let seq=0,current="",source="",stage=null,imgA=null,imgB=null,ready=false;

function room(){return byId("room")}
function v32(){return window.masterMotionV32||null}
function frames(){return window.masterMotionV33Frames||{}}
function reduced(){return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)}

function addStyle(){
 if(byId("masterMotion33Style"))return;
 const s=document.createElement("style");s.id="masterMotion33Style";s.textContent=`
 .room .mm33Stage{position:absolute;inset:0;z-index:24;overflow:hidden;pointer-events:none;display:none;background:#111;opacity:0;transition:opacity .28s ease}
 .room.mm33-playing .mm33Stage{display:block}
 .room.mm33-playing>#avatar,.room.mm33-playing>#pet{visibility:hidden!important}
 .mm33Frame{position:absolute;inset:-1.5%;width:103%;height:103%;object-fit:cover;object-position:center center;opacity:0;transform:scale(1.018) translate3d(0,0,0);transition:opacity .82s cubic-bezier(.33,1,.68,1),transform 2.8s cubic-bezier(.22,1,.36,1);will-change:opacity,transform}
 .mm33Frame.on{opacity:1;transform:scale(1.002) translate3d(0,0,0)}
 .mm33Frame.arrive{transform:scale(1.006) translate3d(-.35%,0,0)}
 .mm33Frame.sit{transform:scale(1.004) translate3d(0,.28%,0)}
 .mm33Frame.walk{transform:scale(1.006) translate3d(.42%,0,0)}
 `;document.head.appendChild(s)
}

function ensureStage(){
 const r=room();if(!r)return false;
 if(stage?.isConnected)return true;
 stage=document.createElement("div");stage.className="mm33Stage";stage.id="mm33Stage";
 imgA=document.createElement("img");imgA.className="mm33Frame";imgA.alt="";imgA.draggable=false;
 imgB=document.createElement("img");imgB.className="mm33Frame";imgB.alt="";imgB.draggable=false;
 stage.append(imgA,imgB);r.appendChild(stage);return true
}
function setFrameClass(img,id){
 img.className="mm33Frame";
 if(id==="master_04_return_home")img.classList.add("arrive");
 else if(id==="master_05_sit_down")img.classList.add("sit");
 else if(id==="master_06_walk_to_window")img.classList.add("walk")
}
function cleanup(my=null){
 if(my!==null&&my!==seq)return;
 const r=room();r?.classList.remove("mm33-playing");
 if(stage){stage.style.opacity="0";stage.style.display="none"}
 for(const img of [imgA,imgB])if(img){img.className="mm33Frame";img.removeAttribute("src")}
 current="";source=""
}
function preload(src){return new Promise(resolve=>{const i=new Image();i.decoding="async";i.onload=()=>resolve(true);i.onerror=()=>resolve(false);i.src=src})}
async function preloadPair(list){const out=await Promise.all((list||[]).slice(0,2).map(preload));return out.length===2&&out.every(Boolean)}

async function playKeyframes(id){
 const list=frames()?.[id];if(!Array.isArray(list)||list.length<2||reduced())return false;
 const my=++seq;v32()?.stop?.();
 if(!ensureStage())return false;
 if(!await preloadPair(list)||my!==seq)return false;
 const r=room();current=id;source="keyframe";
 setFrameClass(imgA,id);setFrameClass(imgB,id);imgA.src=list[0];imgB.src=list[1];
 stage.style.display="block";stage.style.opacity="0";r.classList.add("mm33-playing");
 void stage.offsetWidth;stage.style.opacity="1";imgA.classList.add("on");
 const total=Number(DURATION[id])||5200;
 const firstHold=id==="master_05_sit_down"?1550:1700;
 await sleep(firstHold);if(my!==seq)return false;
 imgB.classList.add("on");imgA.classList.remove("on");
 await sleep(900);if(my!==seq)return false;
 const remain=Math.max(900,total-firstHold-900-360);await sleep(remain);if(my!==seq)return false;
 stage.style.opacity="0";await sleep(300);if(my!==seq)return false;
 cleanup(my);return true
}

async function play(id,opts={}){
 if(KEY_IDS.has(id)){
   const ok=await playKeyframes(id);if(ok)return true
 }
 return Boolean(await v32()?.play?.(id,opts))
}
async function playForMode(mode){
 if(mode==="return"){
   const a=await play("master_04_return_home");if(!a)return Boolean(await v32()?.playForMode?.(mode));
   await sleep(120);if(current||source)return a;
   return Boolean(await play("master_05_sit_down"))||a
 }
 if(mode==="evening"&&Math.random()<0.34){
   const ok=await play("master_06_walk_to_window");if(ok)return true
 }
 return Boolean(await v32()?.playForMode?.(mode))
}
function stop(){seq++;cleanup();v32()?.stop?.()}
function status(){
 const f=frames(),ids=[...KEY_IDS];
 return {version:VERSION,freeOnly:true,paidGeneration:false,ready,profileCount:8,keyframeProfiles:ids.filter(id=>Array.isArray(f[id])&&f[id].length>=2),current,source,fallback:v32()?.status?.()||null}
}
function loadScript(src,selector){return new Promise(resolve=>{
 if(selector&&document.querySelector(selector)){resolve(true);return}
 const s=document.createElement("script");s.src=src;s.async=true;if(selector?.includes("v32"))s.dataset.masterMotionV32="1";else s.dataset.masterMotionV33Assets="1";s.onload=()=>resolve(true);s.onerror=()=>resolve(false);document.head.appendChild(s)
})}
async function waitV32(){
 if(v32())return true;
 for(let i=0;i<35;i++){await sleep(100);if(v32())return true}return false
}
async function boot(){
 addStyle();ensureStage();
 await loadScript(ASSET_ENGINE,'script[data-master-motion-v33-assets]');
 if(!v32())await loadScript(V32_ENGINE,'script[data-master-motion-v32]');
 await waitV32();
 ready=Boolean(v32()&&Object.keys(frames()).length>=3);
 window.masterMotionV33={version:VERSION,freeOnly:true,paidGeneration:false,status,play,playForMode,playKeyframes,stop,frames:()=>frames(),fallback:()=>v32()};
 window.dispatchEvent(new CustomEvent("p2:master-motion-v33-ready",{detail:status()}))
}
window.addEventListener("beforeunload",stop);
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,980),{once:true});else setTimeout(boot,980);
})();
