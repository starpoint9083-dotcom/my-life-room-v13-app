(()=>{
"use strict";
const VERSION="v26-natural-motion-free-bridge";
const FRAME_ENGINE="/frame-motion-v27.js?v=27";
const SCENE_ENGINE="/scene-runtime-v28.js?v=28";
const LEGACY_SLOTS=["ambient","walk-sit","stand-walk","pet-touch","window-look","stretch"];
const LEGACY_ENDPOINTS={status:"/api/motion/status",file:"/api/motion/file",generate:"/api/motion/generate"};
const LEGACY_CONFIRM_MARKER="confirm_cost:true";
const byId=id=>document.getElementById(id);
let hybridCutout="",hybridObjectUrl="",frameLoaded=false,sceneLoaded=false;

function auth(extra={}){try{return typeof authHeaders==="function"?authHeaders(extra):extra}catch{return extra}}
function setupMode(){return new URL(location.href).searchParams.get("motionSetup")==="1"}
function scene(){return window.sceneV28||null}
function frame(){return window.frameMotionV27||null}

function addStyle(){
 if(byId("motion26Style"))return;
 const s=document.createElement("style");s.id="motion26Style";s.textContent=`
 .room .motion26Stage{display:none!important}
 .room.motion26-free .avatar.ai .avatarFull{animation:motion26Breath 5.8s cubic-bezier(.45,0,.55,1) infinite;transform-origin:50% 88%;will-change:transform}
 .room.motion26-free .pet.assetMode .petAsset{animation:motion26PetIdle 7.2s cubic-bezier(.45,0,.55,1) infinite;transform-origin:50% 100%;will-change:transform}
 .room.motion26-free .roomArt{animation:motion26RoomLight 11s ease-in-out infinite;will-change:filter}
 @keyframes motion26Breath{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-1px) scale(1.003,1.006)}}
 @keyframes motion26PetIdle{0%,100%{transform:translate(0,0) rotate(0deg)}45%{transform:translate(0,-1px) rotate(.2deg)}60%{transform:translate(1px,0) rotate(-.15deg)}}
 @keyframes motion26RoomLight{0%,100%{filter:saturate(.97) brightness(1)}50%{filter:saturate(1) brightness(1.018)}}
 .motion26Setup{background:#171513;color:#fff;border-radius:18px;padding:13px;margin:9px 0;font-size:11px;line-height:1.5}
 .motion26Setup .ok{margin-top:8px;padding:9px;border-radius:10px;background:#233126;color:#dff2e2}
 .motion26Setup .note{margin-top:7px;color:#c8c8c8}
 `;document.head.appendChild(s)
}

function activateFreeAmbient(){const r=byId("room");if(!r)return false;r.classList.add("motion26-free");return true}
function currentTimeValue(){try{return currentTime||"evening"}catch{return "evening"}}
function startAmbient(){const sc=scene();if(sc?.playContext)return sc.playContext(currentTimeValue());const fm=frame();return fm?.idle?.()||activateFreeAmbient()}
function playOneShot(slot){
 const sc=scene();
 if(sc){
   if(slot==="walk-sit")return sc.runRoutine?.("return_home")||false;
   if(slot==="pet-touch")return sc.runRoutine?.("pet")||false;
   if(slot==="window-look")return sc.runRoutine?.("window")||false;
   if(slot==="stretch")return sc.runRoutine?.("morning")||false;
   if(slot==="ambient")return sc.playContext?.(currentTimeValue())||false;
 }
 const fm=frame();if(!fm?.ready?.())return false;
 if(slot==="walk-sit")return fm.sit?.()||false;
 if(slot==="stand-walk")return fm.stand?.()||false;
 if(slot==="pet-touch")return fm.pet?.()||false;
 if(slot==="window-look")return fm.play?.("look")||false;
 if(slot==="stretch")return fm.play?.("stretch")||false;
 return fm.idle?.()||false
}

async function loadHybrid(){
 try{
   if(location.protocol==="file:")return false;
   const r=await fetch("/api/avatar/hybrid-current",{method:"POST",headers:auth({"cache-control":"no-cache"}),cache:"no-store"}),d=await r.json().catch(()=>({}));
   if(!r.ok||!d.ok||!d.url)return false;
   const f=await fetch(d.url,{headers:auth(),cache:"force-cache"});if(!f.ok)return false;
   const blob=await f.blob();if(hybridObjectUrl)try{URL.revokeObjectURL(hybridObjectUrl)}catch{}hybridObjectUrl=URL.createObjectURL(blob);
   let out=hybridObjectUrl;try{if(typeof window.visual17Cutout==="function")out=await window.visual17Cutout(hybridObjectUrl,"avatar")}catch{}
   hybridCutout=out;const img=byId("avatarFull"),wrap=byId("avatar");if(img){img.src=hybridCutout;wrap?.classList.add("ai")}
   window.visual17GetMasterCutout=()=>hybridCutout;window.visual17RestoreMaster=async()=>{if(img)img.src=hybridCutout;return Boolean(hybridCutout)};return true
 }catch(e){console.warn("hybrid current",e);return false}
}

function loadSceneV28(){
 if(sceneLoaded||document.querySelector('script[data-scene-v28]'))return;
 sceneLoaded=true;const s=document.createElement("script");s.src=SCENE_ENGINE;s.async=true;s.dataset.sceneV28="1";s.onload=()=>{renderSetup();activateFreeAmbient()};document.head.appendChild(s)
}
function loadFrameMotion27(){
 if(frameLoaded||document.querySelector('script[data-frame-motion-v27]')){loadSceneV28();return}
 frameLoaded=true;const s=document.createElement("script");s.src=FRAME_ENGINE;s.async=true;s.dataset.frameMotionV27="1";s.onload=()=>{loadSceneV28();renderSetup();activateFreeAmbient()};document.head.appendChild(s)
}

function renderSetup(){
 if(!setupMode()){byId("motion26Setup")?.remove();return}
 let host=byId("motion26Setup");if(!host){host=document.createElement("div");host.id="motion26Setup";host.className="motion26Setup";const growth=document.querySelector("#home .growthCard");(growth?.parentElement||byId("home"))?.insertBefore(host,growth||null)}
 const sc=scene(),fm=frame(),sceneStatus=sc?.status?.(),frameReady=Boolean(fm?.ready?.()),readyScenes=Number(sceneStatus?.readyScenes)||0;
 host.innerHTML=`<b>🎬 P2 생활장면 V28</b><div class="ok">✓ 주력: 저장된 4~6초 생활장면 라이브러리<br>✓ 연결: 짧은 전환장면 또는 V27 프레임 보조<br>✓ 실시간 유료 영상 AI 생성 안 함</div><div class="note">생활장면: ${readyScenes}개 준비됨 · 프로그램 ${sc?"연결됨":"로딩 중"}<br>프레임 보조: ${frameReady?"준비됨":"자산 대기"}<br>실사 30% + 애니풍 70% 기준 유지</div>`
}

async function getStatus(){const sc=scene()?.status?.()||null;return {ok:true,engine:VERSION,free:true,sceneEngine:sc,frameEngine:Boolean(frame()),legacySlots:LEGACY_SLOTS,legacyEndpoints:LEGACY_ENDPOINTS}}
async function generateAll(){return {ok:false,disabled:true,reason:"Paid video generation is disabled in P2. Use reusable free scene clips and the frame fallback engine."}}

function wrap(name,after){const old=window[name];if(typeof old!=="function"||old.__motion26free)return;const fn=function(){const out=old.apply(this,arguments);Promise.resolve(out).finally(()=>after(...arguments));return out};fn.__motion26free=true;window[name]=fn}

function install(){
 addStyle();activateFreeAmbient();loadFrameMotion27();setTimeout(loadHybrid,500);renderSetup();
 window.addEventListener("p2:scene-v28-ready",()=>{renderSetup();setTimeout(()=>scene()?.playContext?.(currentTimeValue()),180)},{once:true});
 wrap("applyHome",()=>{activateFreeAmbient();setTimeout(()=>{const sc=scene();if(sc?.playContext)sc.playContext(currentTimeValue());else frame()?.idle?.()},250)});
 wrap("setTime",t=>{activateFreeAmbient();setTimeout(()=>{const sc=scene();if(sc?.playContext)sc.playContext(t);else if(t==="morning")frame()?.play?.("stretch");else frame()?.idle?.()},300)});
 window.motionV26={version:VERSION,freeOnly:true,status:getStatus,refresh:getStatus,startAmbient,playOneShot,loadHybrid,generateAll,scene:()=>scene(),frame:()=>frame(),legacy:{slots:LEGACY_SLOTS,endpoints:LEGACY_ENDPOINTS,confirmMarker:LEGACY_CONFIRM_MARKER}}
}

window.addEventListener("beforeunload",()=>{scene()?.stop?.();if(hybridObjectUrl)try{URL.revokeObjectURL(hybridObjectUrl)}catch{}});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();