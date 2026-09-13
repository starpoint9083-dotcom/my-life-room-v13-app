(()=>{
"use strict";
const VERSION="v33-keyframe-motion";
const V32_URL="/master-motion-v32.js?v=32";
const ASSET_ROOT="/assets/master-motion-v33/";
const KEYFRAMES={
 master_04_return_home:{a:"04_return_a.webp",b:"04_return_b.webp",duration:5400,panA:"scale(1.015) translateX(1.2%)",panB:"scale(1.025) translateX(-.6%)"},
 master_05_sit_down:{a:"05_sit_a.webp",b:"05_sit_b.webp",duration:5000,panA:"scale(1.018) translateY(-.6%)",panB:"scale(1.025) translateY(.4%)"},
 master_06_walk_to_window:{a:"06_walk_a.webp",b:"06_walk_b.webp",duration:5600,panA:"scale(1.012) translateX(-.8%)",panB:"scale(1.025) translateX(.8%)"}
};
let stage=null,imgA=null,imgB=null,timer=0,seq=0,current="",source="",v32Requested=false,returnToggle=0;
const byId=id=>document.getElementById(id);
function room(){return byId("room")}
function v32(){return window.masterMotionV32||null}
function reduced(){return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)}
function loadV32(){if(v32()||v32Requested||document.querySelector('script[data-master-motion-v32]'))return;v32Requested=true;const s=document.createElement("script");s.src=V32_URL;s.async=true;s.dataset.masterMotionV32="1";document.head.appendChild(s)}
function addStyle(){if(byId("masterMotion33Style"))return;const s=document.createElement("style");s.id="masterMotion33Style";s.textContent=`
 .mm33-stage{position:absolute;inset:0;z-index:18;overflow:hidden;pointer-events:none;background:#111;opacity:0;transition:opacity .18s ease}
 .mm33-stage.on{opacity:1}
 .mm33-stage img{position:absolute;inset:-1.5%;width:103%;height:103%;object-fit:cover;opacity:0;transform:scale(1.015);transition:opacity .85s cubic-bezier(.4,0,.2,1),transform 5.4s cubic-bezier(.25,.1,.25,1);will-change:opacity,transform}
 .mm33-stage img.show{opacity:1}
 .room.mm33-playing>#avatar,.room.mm33-playing>#pet,.room.mm33-playing>.roomArt{visibility:hidden!important}
 `;document.head.appendChild(s)}
function ensureStage(){const r=room();if(!r)return false;if(stage?.isConnected)return true;stage=document.createElement("div");stage.id="masterMotion33Stage";stage.className="mm33-stage";imgA=document.createElement("img");imgB=document.createElement("img");for(const i of [imgA,imgB]){i.alt="";i.decoding="async";i.draggable=false}stage.append(imgA,imgB);r.append(stage);return true}
function preload(src){return new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(true);i.onerror=()=>resolve(false);i.src=src})}
function cleanupVisual(){clearTimeout(timer);timer=0;stage?.classList.remove("on");imgA?.classList.remove("show");imgB?.classList.remove("show");room()?.classList.remove("mm33-playing");if(imgA){imgA.removeAttribute("src");imgA.style.transform=""}if(imgB){imgB.removeAttribute("src");imgB.style.transform=""}}
function stop(increment=true){if(increment)seq++;cleanupVisual();if(source==="v32")v32()?.stop?.();current="";source=""}
async function playKeyframe(id){const cfg=KEYFRAMES[id];if(!cfg||!ensureStage())return false;const my=++seq;stop(false);seq=my;const a=ASSET_ROOT+cfg.a,b=ASSET_ROOT+cfg.b;const ok=await Promise.all([preload(a),preload(b)]);if(my!==seq||!ok.every(Boolean))return false;const r=room();r?.classList.add("mm33-playing");stage.classList.add("on");imgA.src=a;imgB.src=b;imgA.style.transitionDuration=`${Math.max(1,cfg.duration/1000)}s`;imgB.style.transitionDuration=`.9s,${Math.max(1,cfg.duration/1000)}s`;imgA.style.transform=cfg.panA;imgB.style.transform=cfg.panA;void stage.offsetWidth;imgA.classList.add("show");current=id;source="keyframe";
 if(reduced()){imgA.style.transform="none";timer=setTimeout(()=>{if(my===seq){imgA.src=b;current=""}},cfg.duration);return true}
 requestAnimationFrame(()=>{if(my!==seq)return;imgA.style.transform=cfg.panB});
 const swapAt=Math.round(cfg.duration*.48);timer=setTimeout(()=>{if(my!==seq)return;imgB.classList.add("show");imgB.style.transform=cfg.panB},swapAt);
 setTimeout(()=>{if(my!==seq)return;imgA.classList.remove("show")},swapAt+650);
 setTimeout(()=>{if(my!==seq)return;cleanupVisual();current="";source=""},cfg.duration+120);return true}
async function play(id,opts={}){if(KEYFRAMES[id])return playKeyframe(id);loadV32();for(let n=0;n<20&&!v32();n++)await new Promise(r=>setTimeout(r,50));if(v32()?.play){source="v32";current=id;return Boolean(await v32().play(id,opts))}return false}
async function playForMode(mode){if(mode==="return"){const id=returnToggle++%2===0?"master_04_return_home":"master_05_sit_down";return playKeyframe(id)}if(mode==="evening"&&Math.random()<.34)return playKeyframe("master_06_walk_to_window");loadV32();for(let n=0;n<20&&!v32();n++)await new Promise(r=>setTimeout(r,50));if(v32()?.playForMode){source="v32";return Boolean(await v32().playForMode(mode))}return false}
function status(){return {version:VERSION,freeOnly:true,paidGeneration:false,placeholderIdentity:true,current,source,keyframeMasters:Object.keys(KEYFRAMES),assetsReady:true,delegatesTo:"v32-natural-motion-engine"}}
function boot(){addStyle();ensureStage();loadV32();window.masterMotionV33={version:VERSION,status,play,playForMode,stop,keyframeMasters:()=>Object.keys(KEYFRAMES)};window.dispatchEvent(new CustomEvent("p2:master-motion-v33-ready",{detail:status()}))}
window.addEventListener("beforeunload",()=>stop());
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,1080),{once:true});else setTimeout(boot,1080);
})();
