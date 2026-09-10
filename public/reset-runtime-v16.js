(()=>{
"use strict";
let resetting=false;
function msg(text){try{if(typeof toast==="function")toast(text)}catch{}try{const e=document.getElementById("event");if(e)e.textContent=text}catch{}}
function stopSaving(){
  try{window.__resetLock=true}catch{}
  try{if(typeof syncTimer!=="undefined"&&syncTimer){clearTimeout(syncTimer);syncTimer=null}}catch{}
  try{if(typeof timerId!=="undefined"&&timerId){clearInterval(timerId);timerId=null}}catch{}
  try{serverSyncEnabled=false}catch{}
}
async function clearCaches(){
  try{if("caches" in window){const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith("my-life-room-")).map(k=>caches.delete(k)))}}catch{}
}
async function clearSetupClient(){
  try{["myroomV13","myroomAvatarKey","myroomV13Live","myroomV18Items"].forEach(k=>localStorage.removeItem(k))}catch{}
  try{sessionStorage.clear()}catch{}
  await clearCaches();
}
async function postReset(scope){
  if(typeof ensureDeviceIdentity==="function")ensureDeviceIdentity();
  const headers=typeof authHeaders==="function"?authHeaders({"content-type":"application/json"}):{"content-type":"application/json"};
  const r=await fetch("/api/life/reset",{method:"POST",headers,cache:"no-store",body:JSON.stringify({scope})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d.ok||!d.reset||d.scope!==scope)throw new Error(d.error||`reset failed ${r.status}`);
  return d;
}
async function setupReset(){
  if(resetting)return;
  if(!window.confirm("방 설정과 저장된 본캐를 초기화하고 처음 설정 화면으로 돌아갈까요? 금주·금연 실제 기록은 유지됩니다."))return;
  resetting=true;stopSaving();msg("설정 초기화 중…");
  try{
    await postReset("setup");
    await clearSetupClient();
    location.replace("/?freshSetup="+Date.now());
  }catch(err){
    resetting=false;window.__resetLock=false;try{serverSyncEnabled=true}catch{}
    msg("초기화 실패 — 기존 데이터는 그대로 유지했습니다.");console.error("setup reset failed",err);
  }
}
async function fullReset(){
  if(resetting)return;
  if(!window.confirm("모든 생활 기록과 본캐까지 완전히 삭제할까요? 이 작업은 되돌릴 수 없습니다."))return;
  resetting=true;stopSaving();msg("전체 데이터 삭제 중…");
  try{
    await postReset("full");
    try{localStorage.clear()}catch{}try{sessionStorage.clear()}catch{}await clearCaches();
    location.replace("/?freshAll="+Date.now());
  }catch(err){
    resetting=false;window.__resetLock=false;try{serverSyncEnabled=true}catch{}
    msg("전체 삭제 실패 — 기존 데이터는 그대로 유지했습니다.");console.error("full reset failed",err);
  }
}
function install(){
  window.resetAll=setupReset;window.setupReset=setupReset;window.fullReset=fullReset;
  const oldSave=window.saveState;
  if(typeof oldSave==="function"&&!oldSave.__resetSafe){
    const fn=function(){if(window.__resetLock)return;return oldSave.apply(this,arguments)};fn.__resetSafe=true;window.saveState=fn;
  }
  const oldPush=window.pushServerState;
  if(typeof oldPush==="function"&&!oldPush.__resetSafe){
    const fn=async function(){if(window.__resetLock)return false;return oldPush.apply(this,arguments)};fn.__resetSafe=true;window.pushServerState=fn;
  }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();