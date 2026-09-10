(()=>{
"use strict";
const POSES=["window","pet","relax","stretch"],labels={window:"창밖을 바라봐요",pet:"펫을 바라보며 몸을 낮춰요",relax:"편안하게 자세를 풀어요",stretch:"가볍게 스트레칭해요"};
const cache=new Map();let loading=false,timer=null,lastPose="";
const byId=id=>document.getElementById(id);
function auth(extra={}){try{return typeof authHeaders==="function"?authHeaders(extra):extra}catch{return extra}}
function ready(){try{return Boolean(storageGet("myroomAvatarKey"))}catch{return Boolean(localStorage.getItem("myroomAvatarKey"))}}
async function safeCutout(src){
  if(typeof window.visual17Cutout!=="function")throw new Error("visual integrity engine not ready");
  return window.visual17Cutout(src,"avatar");
}
function fit(img){try{if(typeof window.visual17FitActor==="function")window.visual17FitActor(img,"avatar")}catch{}}
async function ensurePose(pose){
  if(cache.has(pose))return cache.get(pose);if(!ready())throw new Error("master avatar not saved");
  const r=await fetch("/api/avatar/pose",{method:"POST",cache:"no-store",headers:auth({"content-type":"application/json"}),body:JSON.stringify({pose})}),d=await r.json().catch(()=>({}));if(!r.ok||!d.ok||!d.key)throw new Error(d.error||`pose ${r.status}`);
  const f=await fetch(`/api/avatar/pose/file?key=${encodeURIComponent(d.key)}`,{headers:auth(),cache:"force-cache"});if(!f.ok)throw new Error(`pose file ${f.status}`);
  const blob=await f.blob(),url=URL.createObjectURL(blob);
  try{const out=await safeCutout(url);if(!out)throw new Error("pose cutout rejected");cache.set(pose,out);return out}
  finally{URL.revokeObjectURL(url)}
}
async function preload(){if(loading||!ready())return;loading=true;for(const p of POSES){if(cache.has(p))continue;try{await ensurePose(p)}catch(e){console.warn("pose-v20 rejected",p,e);break}await new Promise(r=>setTimeout(r,700))}loading=false}
function showPose(pose,announce=false){const src=cache.get(pose),img=byId("avatarFull"),a=byId("avatar");if(!src||!img||!a||a.classList.contains("away"))return false;img.src=src;fit(img);a.classList.add("ai");lastPose=pose;if(announce)try{show("🙂 "+labels[pose])}catch{}return true}
function nextPose(announce=false){const available=POSES.filter(p=>cache.has(p)&&p!==lastPose);if(!available.length){preload();return false}return showPose(available[Math.floor(Math.random()*available.length)],announce)}
function restoreMaster(){
  lastPose="";
  try{const safe=typeof window.visual17GetMasterCutout==="function"?window.visual17GetMasterCutout():"",img=byId("avatarFull"),a=byId("avatar");if(safe&&img&&a){img.src=safe;fit(img);a.classList.add("ai");return true}}catch{}
  try{if(typeof window.visual17RestoreMaster==="function"){Promise.resolve(window.visual17RestoreMaster()).catch(()=>{});return true}}catch{}
  return false;
}
function wrap(name,after){const old=window[name];if(typeof old!=="function"||old.__pose20)return;const fn=function(){const r=old.apply(this,arguments);Promise.resolve(r).finally(()=>after(...arguments));return r};fn.__pose20=true;window[name]=fn}
function install(){
 wrap("avatarTap",()=>{if(!nextPose(true))try{toast("새 포즈를 준비하고 있어요.")}catch{}});
 wrap("setTime",t=>{if(t==="day"||t==="leave")return;if(cache.size)setTimeout(()=>nextPose(false),900);else preload()});
 wrap("applyHome",()=>{setTimeout(()=>{preload();if(cache.size)nextPose(false)},1200)});
 timer=setInterval(()=>{const home=byId("home"),a=byId("avatar");if(home?.classList.contains("active")&&!a?.classList.contains("away")){if(Math.random()<.72)nextPose(false);else restoreMaster()}},14000);
 setTimeout(preload,1800);window.poseV20={preload,nextPose,restoreMaster,cacheSize:()=>cache.size}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();