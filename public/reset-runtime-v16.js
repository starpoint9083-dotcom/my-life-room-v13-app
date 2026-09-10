(()=>{
"use strict";
let resetting=false;
function msg(text){
  try{if(typeof toast==="function")toast(text)}catch{}
  try{const e=document.getElementById("event");if(e)e.textContent=text}catch{}
}
async function clearClientSetupState(){
  try{
    localStorage.removeItem("myroomV13");
    localStorage.removeItem("myroomAvatarKey");
    localStorage.removeItem("myroomV13Live");
  }catch{}
  try{sessionStorage.clear()}catch{}
  try{
    if("caches" in window){
      const keys=await caches.keys();
      await Promise.all(keys.filter(k=>k.startsWith("my-life-room-")).map(k=>caches.delete(k)));
    }
  }catch{}
}
async function setupReset(){
  if(resetting)return;
  const ok=window.confirm("앱 설정, 방, 저장된 본캐만 초기화하고 처음 설정 화면으로 돌아갈까요? 금주·금연 실제 기록은 유지됩니다.");
  if(!ok)return;
  resetting=true;
  msg("설정 초기화 중…");
  try{
    if(typeof ensureDeviceIdentity==="function")ensureDeviceIdentity();
    const headers=typeof authHeaders==="function"?authHeaders({"content-type":"application/json"}):{"content-type":"application/json"};
    const r=await fetch("/api/life/reset",{method:"POST",headers,cache:"no-store",body:JSON.stringify({scope:"setup"})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok||!d.reset||d.scope!=="setup")throw new Error(d.error||`서버 초기화 실패 (${r.status})`);
    await clearClientSetupState();
    location.replace("/?setupReset="+Date.now());
  }catch(err){
    resetting=false;
    msg("초기화 실패 — 기존 데이터는 그대로 유지했습니다.");
    console.error("setup reset failed",err);
  }
}
async function fullReset(){
  if(resetting)return;
  const ok=window.confirm("모든 생활 기록과 본캐까지 완전히 삭제할까요? 이 작업은 되돌릴 수 없습니다.");
  if(!ok)return;
  resetting=true;
  msg("전체 데이터 삭제 중…");
  try{
    if(typeof ensureDeviceIdentity==="function")ensureDeviceIdentity();
    const headers=typeof authHeaders==="function"?authHeaders({"content-type":"application/json"}):{"content-type":"application/json"};
    const r=await fetch("/api/life/reset",{method:"POST",headers,cache:"no-store",body:JSON.stringify({scope:"full"})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok||!d.reset||d.scope!=="full")throw new Error(d.error||`전체 삭제 실패 (${r.status})`);
    try{localStorage.clear()}catch{}
    try{sessionStorage.clear()}catch{}
    location.replace("/?fullReset="+Date.now());
  }catch(err){
    resetting=false;
    msg("전체 삭제 실패 — 기존 데이터는 그대로 유지했습니다.");
    console.error("full reset failed",err);
  }
}
function install(){window.resetAll=setupReset;window.setupReset=setupReset;window.fullReset=fullReset;}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();