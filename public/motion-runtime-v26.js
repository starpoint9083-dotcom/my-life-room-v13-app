(()=>{
"use strict";
const VERSION="v26-natural-motion-free-safe";
const SLOTS=["ambient","walk-sit","stand-walk","pet-touch","window-look","stretch"];
const LAST_ERROR_KEY="myroomMotionV26LastError";
const byId=id=>document.getElementById(id);
const blobCache=new Map();
let statusData=null,stage=null,videos=[],active=0,busy=false,hybridCutout="",hybridObjectUrl="",seated=false,ambientEnabled=false;

function auth(extra={}){try{return typeof authHeaders==="function"?authHeaders(extra):extra}catch{return extra}}
function has(slot){return Boolean(statusData?.slots?.find(x=>x.slot===slot&&x.video))}
function setupMode(){return new URL(location.href).searchParams.get("motionSetup")==="1"}
function paidMode(){return new URL(location.href).searchParams.get("motionPaid")==="1"}
function lastError(){try{return localStorage.getItem(LAST_ERROR_KEY)||""}catch{return ""}}
function setLastError(msg){const m=String(msg||"").trim().slice(0,500);try{if(m)localStorage.setItem(LAST_ERROR_KEY,m);else localStorage.removeItem(LAST_ERROR_KEY)}catch{}return m}

function addStyle(){
  if(byId("motion26Style"))return;
  const s=document.createElement("style");s.id="motion26Style";s.textContent=`
  .room .motion26Stage{position:absolute;inset:0;z-index:21;display:none;background:#171513;overflow:hidden}
  .room.motion26-active .motion26Stage{display:block}
  .room .motion26Video{position:absolute;inset:-1px;width:calc(100% + 2px);height:calc(100% + 2px);object-fit:cover;object-position:center center;opacity:0;transition:opacity .30s ease;background:#171513}
  .room .motion26Video.active{opacity:1}
  .room.motion26-active>.roomArt,.room.motion26-active>.window,.room.motion26-active>.sun,.room.motion26-active>.sofa,.room.motion26-active>.rug,.room.motion26-active>.table,.room.motion26-active>.plant,.room.motion26-active>.avatar,.room.motion26-active>.pet,.room.motion26-active>.sparkle,.room.motion26-active>.v19Sun,.room.motion26-active>.v19Wind,.room.motion26-active>.v19Leaves,.room.motion26-active>.v19Dust,.room.motion26-active>.v19Lamp,.room.motion26-active>.v19PetBed{visibility:hidden!important;pointer-events:none!important}
  .room.motion26-active>.badge,.room.motion26-active>.event{visibility:visible!important}
  .room.motion26-free .avatar.ai .avatarFull{animation:motion26Breath 5.8s cubic-bezier(.45,0,.55,1) infinite;transform-origin:50% 88%;will-change:transform}
  .room.motion26-free .pet.assetMode .petAsset{animation:motion26PetIdle 7.2s cubic-bezier(.45,0,.55,1) infinite;transform-origin:50% 100%;will-change:transform}
  .room.motion26-free .roomArt{animation:motion26RoomLight 11s ease-in-out infinite;will-change:filter}
  .room.motion26-free.motion26-avatar-react .avatar.ai .avatarFull{animation:motion26AvatarReact .9s ease-out 1}
  .room.motion26-free.motion26-pet-react .pet.assetMode .petAsset{animation:motion26PetReact .9s ease-out 1}
  @keyframes motion26Breath{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-1px) scale(1.003,1.006)}}
  @keyframes motion26PetIdle{0%,100%{transform:translate(0,0) rotate(0deg)}45%{transform:translate(0,-1px) rotate(.2deg)}60%{transform:translate(1px,0) rotate(-.15deg)}}
  @keyframes motion26RoomLight{0%,100%{filter:saturate(.97) brightness(1)}50%{filter:saturate(1) brightness(1.018)}}
  @keyframes motion26AvatarReact{0%{transform:translateY(0) rotate(0deg)}35%{transform:translateY(-2px) rotate(.22deg)}100%{transform:translateY(0) rotate(0deg)}}
  @keyframes motion26PetReact{0%{transform:translate(0,0) rotate(0deg)}35%{transform:translate(1px,-2px) rotate(.5deg)}100%{transform:translate(0,0) rotate(0deg)}}
  .motion26Setup{background:#171513;color:#fff;border-radius:18px;padding:13px;margin:9px 0;font-size:11px;line-height:1.45}
  .motion26Setup b{font-size:13px}.motion26Setup button{width:100%;border:0;border-radius:12px;padding:11px;margin-top:8px;font-weight:800}
  .motion26Setup button:disabled{opacity:.58}
  .motion26Slots{display:grid;grid-template-columns:repeat(2,1fr);gap:5px;margin-top:8px}.motion26Slot{font-size:9px;padding:7px 4px;background:#2c2c2c;border-radius:8px;text-align:center}.motion26Slot.ready{background:#e7f4e6;color:#143919}
  .motion26Free{margin-top:8px;padding:9px;border-radius:10px;background:#233126;color:#dff2e2}.motion26Err{margin-top:8px;padding:9px;border-radius:10px;background:#3a2424;color:#ffd9d9;word-break:break-word}
  `;
  document.head.appendChild(s)
}

function ensureStage(){
  const room=byId("room");if(!room)return null;
  if(stage&&stage.isConnected)return stage;
  stage=document.createElement("div");stage.className="motion26Stage";
  for(let i=0;i<2;i++){
    const v=document.createElement("video");v.className="motion26Video";v.muted=true;v.playsInline=true;v.preload="auto";v.disablePictureInPicture=true;v.setAttribute("webkit-playsinline","");
    stage.appendChild(v);videos.push(v)
  }
  room.appendChild(stage);return stage
}

function activateFreeAmbient(){
  const room=byId("room");if(!room)return false;
  room.classList.remove("motion26-active");room.classList.add("motion26-free");ambientEnabled=false;
  for(const v of videos){try{v.pause()}catch{}}
  applyHybrid();return true
}
function freeAvatarResponse(){const room=byId("room");if(!room)return;room.classList.add("motion26-free");room.classList.remove("motion26-avatar-react");void room.offsetWidth;room.classList.add("motion26-avatar-react");setTimeout(()=>room.classList.remove("motion26-avatar-react"),1000)}
function freePetResponse(){const room=byId("room");if(!room)return;room.classList.add("motion26-free");room.classList.remove("motion26-pet-react");void room.offsetWidth;room.classList.add("motion26-pet-react");setTimeout(()=>room.classList.remove("motion26-pet-react"),1000)}

async function getStatus(){
  try{
    const r=await fetch("/api/motion/status",{headers:auth(),cache:"no-store"}),d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok)throw new Error(d.error||`motion status ${r.status}`);
    statusData=d;renderSetup();return d
  }catch(e){const msg=setLastError(e?.message||"모션 상태 확인 실패");console.warn("motion26 status",e);statusData=null;renderSetup(msg);return null}
}

async function blobUrl(slot){
  if(blobCache.has(slot))return blobCache.get(slot);
  const r=await fetch(`/api/motion/file?slot=${encodeURIComponent(slot)}`,{headers:auth(),cache:"force-cache"});
  if(!r.ok)throw new Error(`motion file ${slot} ${r.status}`);
  const b=await r.blob(),url=URL.createObjectURL(b);blobCache.set(slot,url);return url
}

async function loadInto(v,slot,loop){
  const src=await blobUrl(slot);
  if(v.dataset.slot!==slot){v.pause();v.src=src;v.dataset.slot=slot;v.load()}
  v.loop=loop;v.muted=true;v.playsInline=true;
  try{v.currentTime=0}catch{}
  await v.play()
}

async function transition(slot,{loop=false}={}){
  if(busy||!has(slot))return false;busy=true;
  try{
    ensureStage();const next=1-active,nv=videos[next],ov=videos[active];
    nv.classList.remove("active");nv.onended=null;await loadInto(nv,slot,loop);
    const room=byId("room");room?.classList.remove("motion26-free");room?.classList.add("motion26-active");
    requestAnimationFrame(()=>{nv.classList.add("active");ov?.classList.remove("active")});
    setTimeout(()=>{try{ov?.pause()}catch{}},340);active=next;return true
  }catch(e){setLastError(`${slot}: ${e?.message||"video transition failed"}`);console.warn("motion26 transition",slot,e);return false}
  finally{busy=false}
}

function waitEnded(v,maxMs=8500){
  return new Promise(resolve=>{
    let done=false;
    const finish=()=>{if(done)return;done=true;clearTimeout(timer);v.removeEventListener("ended",finish);v.removeEventListener("error",finish);resolve()};
    const timer=setTimeout(finish,maxMs);v.addEventListener("ended",finish,{once:true});v.addEventListener("error",finish,{once:true})
  })
}

async function startAmbient(force=false){
  if(!has("ambient")){activateFreeAmbient();return true}
  ambientEnabled=true;const cur=videos[active]?.dataset?.slot;
  if(!force&&cur==="ambient"&&!videos[active]?.paused){const room=byId("room");room?.classList.remove("motion26-free");room?.classList.add("motion26-active");return true}
  return transition("ambient",{loop:true})
}

async function playOneShot(slot){
  if(!has(slot))return false;
  const ok=await transition(slot,{loop:false});if(!ok)return false;
  await waitEnded(videos[active]);
  if(ambientEnabled&&has("ambient"))await startAmbient(true);else activateFreeAmbient();
  return true
}

function deactivate(){
  const room=byId("room");room?.classList.remove("motion26-active","motion26-free");
  for(const v of videos){try{v.pause()}catch{}}
}

async function loadHybrid(){
  try{
    if(location.protocol==="file:")return false;
    const r=await fetch("/api/avatar/hybrid-current",{method:"POST",headers:auth({"cache-control":"no-cache"}),cache:"no-store"}),d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok||!d.url)throw new Error(d.error||`hybrid avatar ${r.status}`);
    const f=await fetch(d.url,{headers:auth(),cache:"force-cache"});if(!f.ok)throw new Error(`hybrid file ${f.status}`);
    const blob=await f.blob();
    if(hybridObjectUrl)try{URL.revokeObjectURL(hybridObjectUrl)}catch{}
    hybridObjectUrl=URL.createObjectURL(blob);
    let out=hybridObjectUrl;
    try{if(typeof window.visual17Cutout==="function")out=await window.visual17Cutout(hybridObjectUrl,"avatar")}catch(e){console.warn("hybrid cutout",e)}
    hybridCutout=out;applyHybrid();
    window.visual17GetMasterCutout=()=>hybridCutout;
    window.visual17RestoreMaster=async()=>{applyHybrid();return Boolean(hybridCutout)};
    return true
  }catch(e){setLastError(e?.message||"30:70 본캐 로드 실패");console.warn("hybrid current",e);return false}
}

function applyHybrid(){
  if(!hybridCutout)return false;
  const img=byId("avatarFull"),a=byId("avatar");if(!img||!a)return false;
  img.src=hybridCutout;
  try{if(typeof window.visual17FitActor==="function")window.visual17FitActor(img,"avatar")}catch{}
  a.classList.add("ai");return true
}

function context(){
  let rs="warm",pk="dog",pm="댕댕이형",tm="evening";
  try{rs=roomStyle||rs}catch{}try{pk=petKind||pk}catch{}try{pm=petMode||pm}catch{}try{tm=currentTime||tm}catch{}
  return {roomStyle:rs,petKind:pk,petMode:pm,time:tm}
}

async function generateAll(){
  if(!setupMode()||!paidMode())return;
  if(!window.confirm("영화형 자연 모션 6개를 AI 영상으로 생성합니다. 외부 영상 모델/Cloudflare 과금이 발생할 수 있습니다. 계속할까요?"))return;
  const btn=byId("motion26Generate");if(btn){btn.disabled=true;btn.textContent="영화형 모션 생성 중…"}
  const progress=byId("motion26Progress");
  try{
    setLastError("");await loadHybrid();const ctx=context();
    for(let i=0;i<SLOTS.length;i++){
      const slot=SLOTS[i];if(has(slot))continue;
      if(progress)progress.textContent=`${i+1}/${SLOTS.length} · ${slot} 생성 중…`;
      const r=await fetch("/api/motion/generate",{method:"POST",headers:auth({"content-type":"application/json"}),body:JSON.stringify({slot,...ctx,confirm_cost:true}),cache:"no-store"});
      const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw new Error(`${slot}: ${d.error||`HTTP ${r.status}`}`);
      await getStatus()
    }
    setLastError("");if(progress)progress.textContent="영화형 자연 모션 6개 생성 완료";
    if(btn){btn.disabled=true;btn.textContent="영화형 모션 준비 완료"}await startAmbient(true)
  }catch(e){const msg=setLastError(e?.message||"모션 생성 실패");if(progress)progress.textContent=`생성 실패 · ${msg}`;if(btn){btn.disabled=false;btn.textContent="실패한 모션부터 이어서 생성"}renderSetup(msg)}
}

function renderSetup(error=""){
  if(!setupMode()){byId("motion26Setup")?.remove();return}
  let host=byId("motion26Setup");
  if(!host){host=document.createElement("div");host.id="motion26Setup";host.className="motion26Setup";const growth=document.querySelector("#home .growthCard");(growth?.parentElement||byId("home"))?.insertBefore(host,growth||null)}
  const ready=new Set((statusData?.slots||[]).filter(x=>x.video).map(x=>x.slot)),savedError=error||lastError();
  const paid=paidMode();
  host.innerHTML=`<b>🎬 P2 자연 모션 V26</b><div style="margin-top:4px">실사 30% + 애니풍 70% · 무료 기본 움직임 우선</div><div class="motion26Free">✓ 무료 기본 움직임 활성화: 호흡 · 미세 체중이동 · 펫 반응 · 방의 빛 변화<br>걷기 · 앉기 · 일어나기는 억지 CSS로 흉내 내지 않습니다.</div><div class="motion26Slots">${SLOTS.map(s=>`<div class="motion26Slot ${ready.has(s)?"ready":""}">${ready.has(s)?"✓ ":""}${s}</div>`).join("")}</div><div id="motion26Progress" style="margin-top:8px">${ready.size}/${SLOTS.length}개 영화형 모션 준비됨</div>${savedError?`<div class="motion26Err"><b>마지막 오류</b><br>${savedError.replace(/[<>&]/g,m=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[m]))}</div>`:""}<button id="motion26Generate" ${paid?"":"disabled"}>${ready.size===SLOTS.length?"영화형 모션 준비 완료":paid?"영화형 모션 6개 만들기":"영화형 모션 · 결제/게이트웨이 연결 후 사용"}</button><div style="margin-top:5px;color:#bbb">${paid?"※ 유료 영상 엔진 테스트 모드입니다.":"※ 현재는 무료 기본 모드입니다. 유료 영상 호출은 자동 실행되지 않습니다."}</div>`;
  const b=byId("motion26Generate");if(b){b.disabled=!paid||ready.size===SLOTS.length;if(paid)b.onclick=generateAll}
}

function wrap(name,after){
  const old=window[name];if(typeof old!=="function"||old.__motion26)return;
  const fn=function(){const r=old.apply(this,arguments);Promise.resolve(r).finally(()=>after(...arguments));return r};fn.__motion26=true;window[name]=fn
}

function install(){
  addStyle();ensureStage();
  wrap("applyHome",()=>setTimeout(()=>{applyHybrid();getStatus().then(()=>startAmbient(false))},500));
  wrap("setTime",t=>setTimeout(async()=>{applyHybrid();await getStatus();if(t==="morning"&&has("stretch"))playOneShot("stretch");else if(t==="return"&&has("walk-sit")){seated=true;playOneShot("walk-sit")}else startAmbient(false)},550));
  wrap("avatarTap",()=>setTimeout(async()=>{if(!statusData)await getStatus();const slot=seated?"stand-walk":"walk-sit";if(has(slot)){seated=!seated;playOneShot(slot)}else freeAvatarResponse()},0));
  wrap("petTap",()=>setTimeout(async()=>{if(!statusData)await getStatus();if(has("pet-touch"))playOneShot("pet-touch");else freePetResponse()},0));
  setTimeout(async()=>{await loadHybrid();await getStatus();await startAmbient(false)},1400);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden){applyHybrid();getStatus().then(()=>startAmbient(false))}});
  window.motionV26={version:VERSION,status:()=>statusData,refresh:getStatus,play:playOneShot,startAmbient,applyHybrid,generateAll,free:activateFreeAmbient,lastError}
}

window.addEventListener("beforeunload",()=>{for(const u of blobCache.values())try{URL.revokeObjectURL(u)}catch{}if(hybridObjectUrl)try{URL.revokeObjectURL(hybridObjectUrl)}catch{}});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();
