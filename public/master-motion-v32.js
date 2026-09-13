(()=>{
"use strict";
const VERSION="v32-natural-motion-engine";
const MANIFEST_URL="/master-motion-v32-manifest.json?v=32";
const byId=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let manifest=null,current="",source="",timer=0,seq=0;

function scene(){return window.sceneV28||null}
function frame(){return window.frameMotionV27||null}
function room(){return byId("room")}
function avatar(){return byId("avatar")}
function pet(){return byId("pet")}
function reduced(){return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)}
function profiles(){return Array.isArray(manifest?.profiles)?manifest.profiles:[]}
function profile(id){return profiles().find(x=>x.id===id)||null}
function sceneManifest(){return scene()?.manifest?.()||null}
function sceneReady(id){const s=sceneManifest()?.scenes?.find?.(x=>x.id===id);return Boolean(s?.ready===true)}

function addStyle(){
 if(byId("masterMotion32Style"))return;
 const s=document.createElement("style");s.id="masterMotion32Style";s.textContent=`
 .room.mm32-active>#avatar,.room.mm32-active>#pet,.room.mm32-active .roomArt{will-change:transform,filter}
 .room.mm32-sofa-relax>#avatar{animation:mm32Breath 5.2s cubic-bezier(.45,0,.55,1) 1}
 .room.mm32-sofa-relax>#pet{animation:mm32PetCalm 5.2s ease-in-out 1}
 .room.mm32-window-gaze>#avatar{animation:mm32Look 4.8s cubic-bezier(.4,0,.2,1) 1}
 .room.mm32-pet-touch>#avatar{animation:mm32PetTouch 5s cubic-bezier(.4,0,.2,1) 1}
 .room.mm32-pet-touch>#pet{animation:mm32PetReact 5s ease-in-out 1}
 .room.mm32-return-home>#avatar{animation:mm32Return 5.4s cubic-bezier(.2,.7,.2,1) 1}
 .room.mm32-sit-down>#avatar{animation:mm32Sit 5s cubic-bezier(.25,.75,.2,1) 1}
 .room.mm32-walk-window>#avatar{animation:mm32WalkWindow 5.6s cubic-bezier(.35,.05,.25,1) 1}
 .room.mm32-morning-life>#avatar{animation:mm32Morning 5s ease-in-out 1}
 .room.mm32-morning-life .roomArt{animation:mm32MorningLight 5s ease-in-out 1}
 .room.mm32-night-rest>#avatar{animation:mm32Night 5.6s ease-in-out 1}
 .room.mm32-night-rest>#pet{animation:mm32PetCalm 5.6s ease-in-out 1}
 @keyframes mm32Breath{0%,100%{transform:translateY(0) scale(1)}48%{transform:translateY(-2px) scale(1.004,1.008)}}
 @keyframes mm32PetCalm{0%,100%{transform:translateY(0) rotate(0)}45%{transform:translateY(-1px) rotate(.25deg)}65%{transform:translateX(1px) rotate(-.2deg)}}
 @keyframes mm32Look{0%,20%{transform:translate(0,0) rotate(0)}55%,78%{transform:translate(2px,-1px) rotate(1.1deg)}100%{transform:translate(0,0) rotate(0)}}
 @keyframes mm32PetTouch{0%,18%{transform:translate(0,0) rotate(0)}42%,68%{transform:translate(-3px,1px) rotate(-.7deg)}100%{transform:translate(0,0) rotate(0)}}
 @keyframes mm32PetReact{0%,20%,100%{transform:translate(0,0) rotate(0)}48%{transform:translate(1px,-2px) rotate(.7deg)}70%{transform:translate(-1px,-1px) rotate(-.35deg)}}
 @keyframes mm32Return{0%{transform:translateX(34px) translateY(0) scale(.985);opacity:.2}24%{opacity:1}45%{transform:translateX(16px) translateY(-1px) scale(.994)}70%{transform:translateX(5px) translateY(0) scale(1)}100%{transform:translateX(0) translateY(0) scale(1)}}
 @keyframes mm32Sit{0%,15%{transform:translateY(-10px) scale(1.01)}48%{transform:translateY(-3px) scale(1.002)}74%,100%{transform:translateY(0) scale(.995,1)}}
 @keyframes mm32WalkWindow{0%{transform:translateX(-10px) translateY(0)}18%{transform:translateX(0) translateY(-2px)}38%{transform:translateX(10px) translateY(0)}58%{transform:translateX(20px) translateY(-2px)}78%{transform:translateX(31px) translateY(0)}100%{transform:translateX(38px) translateY(0)}}
 @keyframes mm32Morning{0%,100%{transform:translateY(0) scale(1)}38%{transform:translateY(-4px) scale(1.01,1.025)}62%{transform:translateY(-2px) scale(1.006,1.015)}}
 @keyframes mm32MorningLight{0%,100%{filter:brightness(1) saturate(1)}55%{filter:brightness(1.025) saturate(1.015)}}
 @keyframes mm32Night{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(1px) rotate(.2deg)}}
 `;document.head.appendChild(s)
}

function clearMicro(){
 const r=room();if(!r)return;
 for(const c of [...r.classList])if(c==="mm32-active"||c.startsWith("mm32-"))r.classList.remove(c)
}
function applyMicro(p){
 if(!p||reduced())return false;const r=room();if(!r)return false;
 clearMicro();void r.offsetWidth;r.classList.add("mm32-active",p.microClass);current=p.id;source="micro";
 clearTimeout(timer);timer=setTimeout(()=>{if(current===p.id&&source==="micro"){clearMicro();current="";source=""}},Number(p.durationMs)||5000);
 return true
}

async function playSceneCandidate(p,my){
 const sc=scene();if(!sc?.playScene)return false;
 for(const id of p.sceneCandidates||[]){
   if(my!==seq)return false;if(!sceneReady(id))continue;
   const ok=await sc.playScene(id,{fallback:false,keepStage:false});
   if(ok){current=p.id;source="scene";return true}
 }
 return false
}

async function playFrameStep(step){
 const fm=frame();if(!fm?.ready?.())return false;
 if(step==="walk_to_sofa")return Boolean(await fm.playWalkTo?.(58));
 if(step==="walk_to_window")return Boolean(await fm.playWalkTo?.(76));
 if(step==="sit_down")return Boolean(await fm.sit?.());
 if(step==="stand_up")return Boolean(await fm.stand?.());
 if(step==="pet_touch")return Boolean(await fm.pet?.());
 if(step==="idle"||step==="sit_idle")return Boolean(await fm.idle?.());
 if(!fm.available?.(step))return false;
 return Boolean(await fm.play?.(step,{loopOverride:false,maxLoops:1}))
}
async function playFrameSequence(p,my){
 const fm=frame();if(!fm?.ready?.())return false;
 const steps=Array.isArray(p.frameSteps)?p.frameSteps:[];if(!steps.length)return false;
 let played=0;
 for(const step of steps){if(my!==seq)return false;const ok=await playFrameStep(step);if(ok)played++;else if(["walk_to_sofa","walk_to_window","sit_down","stand_up"].includes(step))return false}
 if(played){current=p.id;source="frame";return true}return false
}

async function play(id,{prefer="scene",allowMicro=true}={}){
 const p=profile(id);if(!p)return false;const my=++seq;stop(false);seq=my;
 if(prefer==="frame"){if(await playFrameSequence(p,my))return true;if(await playSceneCandidate(p,my))return true}
 else {if(await playSceneCandidate(p,my))return true;if(await playFrameSequence(p,my))return true}
 return allowMicro?applyMicro(p):false
}

function pickForMode(mode){
 const ids=manifest?.modeMap?.[mode]||[];if(!ids.length)return null;
 const pool=ids.map(profile).filter(Boolean);if(!pool.length)return null;
 const clipReady=pool.filter(p=>(p.sceneCandidates||[]).some(sceneReady));
 const src=clipReady.length?clipReady:pool;return src[Math.floor(Math.random()*src.length)]||src[0]
}
async function playForMode(mode){const p=pickForMode(mode);if(!p)return false;return play(p.id)}
function stop(increment=true){if(increment)seq++;clearTimeout(timer);timer=0;clearMicro();if(source==="frame")frame()?.stop?.();current="";source=""}
function status(){
 const ps=profiles();const clipReady=ps.filter(p=>(p.sceneCandidates||[]).some(sceneReady)).length;
 return {version:VERSION,freeOnly:true,paidGeneration:false,profileCount:ps.length,clipReadyProfiles:clipReady,frameReady:Boolean(frame()?.ready?.()),current,source,needsExtraFrames:ps.filter(p=>p.requiresExtraFrames).map(p=>p.id)}
}
async function load(){
 try{const r=await fetch(MANIFEST_URL,{cache:"no-store"});if(!r.ok)throw new Error(`manifest ${r.status}`);const d=await r.json();if(d?.version!==VERSION||d?.masterCount!==8||!d?.freeOnly||d?.paidGeneration)throw new Error("manifest validation");manifest=d;return true}catch(e){console.warn("master motion v32",e);manifest=null;return false}
}
async function boot(){addStyle();const ok=await load();if(!ok)return;window.masterMotionV32={version:VERSION,status,profiles:()=>profiles(),play,playForMode,stop};window.dispatchEvent(new CustomEvent("p2:master-motion-v32-ready",{detail:status()}))}
window.addEventListener("beforeunload",()=>stop());
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,1050),{once:true});else setTimeout(boot,1050);
})();
