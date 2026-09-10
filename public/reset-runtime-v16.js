(()=>{
"use strict";
let resetting=false;
function msg(text){
  try{if(typeof toast==="function")toast(text)}catch{}
  try{const e=document.getElementById("event");if(e)e.textContent=text}catch{}
}
async function clearClientState(){
  try{localStorage.clear()}catch{}
  try{sessionStorage.clear()}catch{}
  try{
    if("caches" in window){
      const keys=await caches.keys();
      await Promise.all(keys.filter(k=>k.startsWith("my-life-room-")).map(k=>caches.delete(k)));
    }
  }catch{}
}
async function fullReset(){
  if(resetting)return;
  const ok=window.confirm("나의 방 설정, 생활 기록, 저장된 본캐를 모두 초기화하고 처음부터 다시 시작할까요?");
  if(!ok)return;
  resetting=true;
  msg("전체 초기화 중…");
  try{
    if(typeof ensureDeviceIdentity==="function")ensureDeviceIdentity();
    const headers=typeof authHeaders==="function"?authHeaders({"content-type":"application/json"}):{"content-type":"application/json"};
    const r=await fetch("/api/life/reset",{method:"POST",headers,cache:"no-store"});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok||!d.reset)throw new Error(d.error||`서버 초기화 실패 (${r.status})`);
    await clearClientState();
    location.replace("/?reset="+Date.now());
  }catch(err){
    resetting=false;
    msg("초기화 실패 — 기존 데이터는 그대로 유지했습니다.");
    console.error("full reset failed",err);
  }
}
function install(){window.resetAll=fullReset;window.fullReset=fullReset;}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();
