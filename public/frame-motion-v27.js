(()=>{
"use strict";
const VERSION="v27-free-frame-motion";
const MANIFEST_URL="/frame-motion-v27-manifest.json?v=27";
const byId=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
let manifest=null,actorLayer=null,actorImg=null,actorShadow=null,petLayer=null,petImg=null,petShadow=null;
let currentAction="",running=false,queue=Promise.resolve(),cancelSeq=0,positionX=52,seated=false,ready=false;
const cache=new Map();

function room(){return byId("room")}
function baseAvatar(){return byId("avatarFull")}
function baseAvatarWrap(){return byId("avatar")}
function basePet(){return byId("petFull")||document.querySelector("#pet img")}
function basePetWrap(){return byId("pet")}
function prefersReduced(){return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches}

function addStyle(){
 if(byId("frameMotion27Style"))return;
 const s=document.createElement("style");s.id="frameMotion27Style";s.textContent=`
 .room .fm27Actor,.room .fm27Pet{position:absolute;inset:auto;z-index:19;pointer-events:none;display:none;will-change:transform,left,bottom}
 .room.fm27-ready .fm27Actor,.room.fm27-ready .fm27Pet{display:block}
 .room.fm27-ready>#avatar,.room.fm27-ready>#pet{visibility:hidden!important;pointer-events:none!important}
 .fm27Actor{width:154px;height:238px;left:52%;bottom:91px;transform:translateX(-50%)}
 .fm27Pet{width:118px;height:94px;left:22%;bottom:71px;transform:translateX(-50%)}
 .fm27Actor img,.fm27Pet img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:center bottom;user-select:none;-webkit-user-drag:none}
 .fm27Shadow{position:absolute;left:50%;bottom:-5px;transform:translateX(-50%);width:60%;height:12px;border-radius:50%;background:rgba(40,31,25,.17);filter:blur(4px);opacity:.72;transition:opacity .08s linear,transform .08s linear}
 .fm27Pet .fm27Shadow{width:68%;height:9px;bottom:-2px;filter:blur(3px)}
 .room.fm27-static .fm27Actor,.room.fm27-static .fm27Pet{display:none!important}
 `;document.head.appendChild(s)
}

function ensureLayers(){
 const r=room();if(!r)return false;if(actorLayer?.isConnected)return true;
 actorLayer=document.createElement("div");actorLayer.className="fm27Actor";actorLayer.id="fm27Actor";
 actorShadow=document.createElement("div");actorShadow.className="fm27Shadow";
 actorImg=document.createElement("img");actorImg.alt="";actorImg.draggable=false;actorLayer.append(actorShadow,actorImg);
 petLayer=document.createElement("div");petLayer.className="fm27Pet";petLayer.id="fm27Pet";
 petShadow=document.createElement("div");petShadow.className="fm27Shadow";
 petImg=document.createElement("img");petImg.alt="";petImg.draggable=false;petLayer.append(petShadow,petImg);
 r.append(actorLayer,petLayer);return true
}

function actionSpec(name){return manifest?.actions?.[name]||null}
function frameList(spec,kind="actor"){const v=spec?.[kind+"Frames"];return Array.isArray(v)?v.filter(Boolean):[]}
function frameDelay(spec,index){
 const timing=Array.isArray(spec?.timingMs)?spec.timingMs:null;
 if(timing?.length)return clamp(Number(timing[index%timing.length])||100,45,1200);
 const fps=clamp(Number(spec?.fps)||8,1,15);return Math.round(1000/fps)
}
function normalizePath(src){return String(src||"").startsWith("/")?src:`/${String(src||"").replace(/^\/+/,"")}`}

async function preloadOne(src){
 src=normalizePath(src);if(cache.has(src))return cache.get(src);
 const p=new Promise(resolve=>{const i=new Image();i.decoding="async";i.onload=()=>resolve(src);i.onerror=()=>resolve(null);i.src=src});cache.set(src,p);return p
}
async function preloadAction(name){
 const spec=actionSpec(name);if(!spec)return false;
 const files=[...frameList(spec,"actor"),...frameList(spec,"pet")];
 if(!files.length)return false;const out=await Promise.all(files.map(preloadOne));return out.some(Boolean)
}
function preloadNext(names){for(const n of names||[])preloadAction(n).catch(()=>{})}

function copyFallbackImages(){
 const a=baseAvatar(),p=basePet();if(a?.src&&!actorImg.src)actorImg.src=a.src;if(p?.src&&!petImg.src)petImg.src=p.src
}
function setReady(on){ready=Boolean(on);const r=room();if(!r)return;r.classList.toggle("fm27-ready",ready);r.classList.toggle("fm27-static",!ready)}
function setPosition(x){positionX=clamp(Number(x)||52,12,88);if(actorLayer)actorLayer.style.left=positionX+"%"}
function applyFrameMeta(spec,index,total){
 const move=Number(spec?.movePct)||0;
 if(move&&total>1){const t=index/(total-1);setPosition((Number(spec?.startX)||positionX)+move*t)}
 const lift=Array.isArray(spec?.liftPx)?Number(spec.liftPx[index%spec.liftPx.length])||0:0;
 if(actorLayer)actorLayer.style.transform=`translateX(-50%) translateY(${-lift}px)`;
 if(actorShadow){const airborne=Math.abs(lift)>1;actorShadow.style.opacity=airborne?".48":".72";actorShadow.style.transform=`translateX(-50%) scale(${airborne?.88:1},${airborne?.9:1})`}
}
function applyActor(src){if(src&&actorImg)actorImg.src=normalizePath(src)}
function applyPet(src){if(src&&petImg)petImg.src=normalizePath(src)}

async function playFrames(name,{loopOverride=null,maxLoops=null}={}){
 const spec=actionSpec(name);if(!spec||spec.ready===false)return false;
 const aFrames=frameList(spec,"actor"),pFrames=frameList(spec,"pet");if(!aFrames.length&&!pFrames.length)return false;
 const ok=await preloadAction(name);if(!ok)return false;
 ensureLayers();copyFallbackImages();setReady(true);currentAction=name;running=true;const mySeq=++cancelSeq;
 const loop=loopOverride===null?Boolean(spec.loop):Boolean(loopOverride);let loops=0;
 do{
   const total=Math.max(aFrames.length||1,pFrames.length||1);
   for(let i=0;i<total;i++){
     if(mySeq!==cancelSeq){running=false;return false}
     if(aFrames.length)applyActor(aFrames[i%aFrames.length]);if(pFrames.length)applyPet(pFrames[i%pFrames.length]);
     applyFrameMeta(spec,i,total);await sleep(frameDelay(spec,i));
   }
   loops++;
 }while(loop&&(maxLoops===null||loops<maxLoops)&&mySeq===cancelSeq);
 running=false;
 if(Number.isFinite(Number(spec.endX)))setPosition(Number(spec.endX));
 if(spec.seated===true)seated=true;if(spec.seated===false)seated=false;
 preloadNext(spec.preload||[]);return true
}

function enqueue(fn){const run=queue.then(fn,fn);queue=run.catch(()=>{});return run}
async function play(name,opts={}){return enqueue(()=>playFrames(name,opts))}
function stop(){cancelSeq++;running=false;currentAction=""}

async function playWalkTo(targetX=60){
 const dir=targetX>=positionX?1:-1,dist=Math.abs(targetX-positionX),spec=actionSpec("walk_loop");
 await playFrames("walk_start");
 if(spec&&dist>1){const loops=Math.max(1,Math.round(dist/Math.max(1,Math.abs(Number(spec.stepPct)||3))));const original=positionX;
   for(let n=0;n<loops;n++){const remain=targetX-positionX,step=Math.abs(remain)<Math.abs(Number(spec.stepPct)||3)?remain:dir*Math.abs(Number(spec.stepPct)||3);spec.startX=positionX;spec.movePct=step;await playFrames("walk_loop",{loopOverride:false});}
   setPosition(targetX);spec.startX=original;
 }
 await playFrames("walk_stop");return true
}
async function sitSequence(){return enqueue(async()=>{await playWalkTo(Number(manifest?.anchors?.sofaX)||58);return playFrames("sit_down")})}
async function standSequence(){return enqueue(async()=>{const ok=await playFrames("stand_up");return ok})}
async function petSequence(){return enqueue(async()=>{const x=Number(manifest?.anchors?.petX)||30;if(Math.abs(positionX-x)>8)await playWalkTo(x+8);return playFrames("pet_touch")})}
async function idle(){const name=seated&&actionSpec("sit_idle")?"sit_idle":"idle";return play(name,{loopOverride:true,maxLoops:1})}

async function loadManifest(){
 try{const r=await fetch(MANIFEST_URL,{cache:"no-store"});if(!r.ok)throw new Error(`manifest ${r.status}`);manifest=await r.json();if(!manifest||manifest.version!==VERSION)throw new Error("manifest version mismatch");return true}catch(e){console.warn("frame motion manifest",e);manifest=null;return false}
}
function available(name){const s=actionSpec(name);return Boolean(s&&s.ready!==false&&frameList(s,"actor").length)}

function wireApp(){
 const oldAvatarTap=window.avatarTap;if(typeof oldAvatarTap==="function"&&!oldAvatarTap.__fm27){const fn=function(){if(ready&&available(seated?"stand_up":"sit_down")){seated?standSequence():sitSequence();return}return oldAvatarTap.apply(this,arguments)};fn.__fm27=true;window.avatarTap=fn}
 const oldPetTap=window.petTap;if(typeof oldPetTap==="function"&&!oldPetTap.__fm27){const fn=function(){if(ready&&available("pet_touch")){petSequence();return}return oldPetTap.apply(this,arguments)};fn.__fm27=true;window.petTap=fn}
 const oldSetTime=window.setTime;if(typeof oldSetTime==="function"&&!oldSetTime.__fm27){const fn=function(t){const out=oldSetTime.apply(this,arguments);Promise.resolve(out).finally(()=>{if(t==="return"&&available("walk_start"))sitSequence();else if(t==="morning"&&available("stretch"))play("stretch");else idle()});return out};fn.__fm27=true;window.setTime=fn}
}

async function boot(){
 addStyle();ensureLayers();copyFallbackImages();setPosition(Number(manifest?.anchors?.homeX)||52);
 const ok=await loadManifest();if(!ok){setReady(false);return}
 setPosition(Number(manifest?.anchors?.homeX)||52);
 const first=available("idle")||available("walk_loop")||available("sit_down");setReady(first);
 wireApp();preloadNext(["idle","walk_start","walk_loop","walk_stop","sit_down","sit_idle","stand_up","pet_touch"]);
 if(first&&!prefersReduced())idle();
 window.frameMotionV27={version:VERSION,ready:()=>ready,manifest:()=>manifest,available,play,playWalkTo,sit:sitSequence,stand:standSequence,pet:petSequence,idle,stop,position:()=>positionX,state:()=>({action:currentAction,running,seated,positionX})}
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,900),{once:true});else setTimeout(boot,900);
})();