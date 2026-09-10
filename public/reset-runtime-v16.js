(()=>{
"use strict";
const RESET_VERSION="v16.3";
let resetting=false;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function msg(text){try{if(typeof toast==="function")toast(text)}catch{}try{const e=document.getElementById("event");if(e)e.textContent=text}catch{}}
function deviceHeaders(){
  try{if(typeof ensureDeviceIdentity==="function")ensureDeviceIdentity()}catch{}
  try{if(typeof authHeaders==="function")return authHeaders({"content-type":"application/json"})}catch{}
  let id="",token="";try{id=localStorage.getItem("myroomDeviceId")||"";token=localStorage.getItem("myroomDeviceToken")||""}catch{}
  return {"content-type":"application/json","x-device-id":id,"x-device-token":token};
}
function stopSaving(){
  try{window.__resetLock=true}catch{}
  try{if(typeof syncTimer!=="undefined"&&syncTimer){clearTimeout(syncTimer);syncTimer=null}}catch{}
  try{if(typeof timerId!=="undefined"&&timerId){clearInterval(timerId);timerId=null}}catch{}
  try{if(window.__liveTimer){clearInterval(window.__liveTimer);window.__liveTimer=null}}catch{}
  try{serverSyncEnabled=false}catch{}
}
async function clearCachesAndWorker(){
  try{if("caches" in window){const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith("my-life-room-")).map(k=>caches.delete(k)))}}catch{}
  try{if("serviceWorker" in navigator){const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(r=>r.unregister()))}}catch{}
}
async function clearSetupClient(){
  try{
    const keep=new Set(["myroomDeviceId","myroomDeviceToken"]);
    const remove=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);if(!k)continue;
      if((k.startsWith("myroom")&&!keep.has(k))||k.startsWith("p2"))remove.push(k);
    }
    remove.forEach(k=>localStorage.removeItem(k));
  }catch{}
  try{sessionStorage.clear()}catch{}
  await clearCachesAndWorker();
}
async function postReset(scope){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
  try{
    const r=await fetch("/api/life/reset",{method:"POST",headers:deviceHeaders(),cache:"no-store",signal:controller.signal,body:JSON.stringify({scope,client:RESET_VERSION,ts:Date.now()})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok||!d.reset||d.scope!==scope)throw new Error(d.error||`reset failed ${r.status}`);
    return d;
  }finally{clearTimeout(timer)}
}
async function fetchState(){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
  try{
    const r=await fetch("/api/state?reset_verify="+Date.now(),{cache:"no-store",headers:deviceHeaders(),signal:controller.signal});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok)throw new Error(d.error||`state verify failed ${r.status}`);
    return d.state??null;
  }finally{clearTimeout(timer)}
}
async function authoritativeSetupReset(){
  stopSaving();
  await wait(700);
  let result=await postReset("setup");
  await wait(350);
  let state=await fetchState();
  if(state!==null){result=await postReset("setup");await wait(250);state=await fetchState()}
  if(state!==null)throw new Error("server state survived setup reset");
  return result;
}
async function setupReset(){
  if(resetting)return;
  if(!window.confirm("방 설정과 저장된 본캐를 초기화하고 처음 설정 화면으로 돌아갈까요? 금주·금연 실제 기록은 유지됩니다."))return;
  resetting=true;msg("설정 초기화 중…");
  try{
    await authoritativeSetupReset();
    await clearSetupClient();
    try{sessionStorage.setItem("myroomForceSetup","1")}catch{}
    location.replace("/?freshSetup="+Date.now());
  }catch(err){
    resetting=false;window.__resetLock=false;try{serverSyncEnabled=true}catch{}
    msg("초기화 실패 — 저장값은 지우지 않았습니다. 다시 눌러주세요.");console.error("setup reset failed",err);
  }
}
async function fullReset(){
  if(resetting)return;
  if(!window.confirm("모든 생활 기록과 본캐까지 완전히 삭제할까요? 이 작업은 되돌릴 수 없습니다."))return;
  resetting=true;stopSaving();msg("전체 데이터 삭제 중…");
  try{
    await wait(700);await postReset("full");
    try{localStorage.clear()}catch{}try{sessionStorage.clear()}catch{}await clearCachesAndWorker();
    location.replace("/?freshAll="+Date.now());
  }catch(err){resetting=false;window.__resetLock=false;try{serverSyncEnabled=true}catch{}msg("전체 삭제 실패 — 기존 데이터는 그대로 유지했습니다.");console.error("full reset failed",err)}
}
function holdStart(){
  try{window.__resetLock=true;window.loadState=()=>false;window.loadServerState=async()=>false}catch{}
  const force=()=>{try{if(typeof go==="function")go("start");document.getElementById("nav")?.classList.remove("show")}catch{}};
  force();setTimeout(force,150);setTimeout(force,500);setTimeout(force,1100);
  setTimeout(()=>{try{sessionStorage.removeItem("myroomForceSetup")}catch{}window.__resetLock=false},1800);
}
function forceFresh(){
  const u=new URL(location.href);let flagged=u.searchParams.has("freshSetup")||u.searchParams.has("freshAll");
  try{flagged=flagged||sessionStorage.getItem("myroomForceSetup")==="1"}catch{}
  if(!flagged)return;
  try{
    localStorage.removeItem("myroomV13");localStorage.removeItem("myroomAvatarKey");localStorage.removeItem("myroomV13Live");
    history.replaceState({},"",u.pathname);
  }catch(e){console.warn("fresh setup guard",e)}
  holdStart();
}
function bindResetButtons(){
  document.querySelectorAll('button[onclick*="resetAll"],[data-reset="setup"]').forEach(btn=>{
    btn.removeAttribute("onclick");
    if(btn.dataset.resetBound===RESET_VERSION)return;
    btn.dataset.resetBound=RESET_VERSION;
    btn.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();setupReset()});
  });
}
function captureResetClick(e){
  const target=e.target instanceof Element?e.target.closest("button"):null;if(!target)return;
  const raw=target.getAttribute("onclick")||"",label=(target.textContent||"").trim();
  if(!raw.includes("resetAll")&&label!=="초기화")return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();setupReset();
}
function loadP2Continuity(){
  if(window.p2ContinuityV22||document.querySelector('script[data-p2-continuity="v22"]'))return;
  const s=document.createElement("script");s.src="/continuity-runtime-v22.js?v=22";s.dataset.p2Continuity="v22";s.async=false;document.body.appendChild(s);
}
function loadP2Core(){
  const existing=document.querySelector('script[data-p2-core="v21"]');
  if(window.p2CoreV21){loadP2Continuity();return}
  if(existing){existing.addEventListener("load",loadP2Continuity,{once:true});return}
  const s=document.createElement("script");s.src="/core-runtime-v21.js?v=21";s.dataset.p2Core="v21";s.async=false;s.addEventListener("load",loadP2Continuity,{once:true});document.body.appendChild(s)
}
function install(){
  window.resetAll=setupReset;window.setupReset=setupReset;window.fullReset=fullReset;window.__resetVersion=RESET_VERSION;
  const oldSave=window.saveState;if(typeof oldSave==="function"&&!oldSave.__resetSafe){const fn=function(){if(window.__resetLock)return;return oldSave.apply(this,arguments)};fn.__resetSafe=true;window.saveState=fn}
  const oldPush=window.pushServerState;if(typeof oldPush==="function"&&!oldPush.__resetSafe){const fn=async function(){if(window.__resetLock)return false;return oldPush.apply(this,arguments)};fn.__resetSafe=true;window.pushServerState=fn}
  bindResetButtons();forceFresh();loadP2Core();
}
document.addEventListener("click",captureResetClick,true);
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();