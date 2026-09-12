(()=>{
"use strict";
const VERSION="v26-natural-motion";
const SLOTS=["ambient","walk-sit","stand-walk","pet-touch","window-look","stretch"];
const byId=id=>document.getElementById(id);
const blobCache=new Map();
let statusData=null,stage=null,videos=[],active=0,busy=false,hybridCutout="",hybridObjectUrl="",seated=false,ambientEnabled=false;

function auth(extra={}){try{return typeof authHeaders==="function"?authHeaders(extra):extra}catch{return extra}}
function has(slot){return Boolean(statusData?.slots?.find(x=>x.slot===slot&&x.video))}
function setupMode(){return new URL(location.href).searchParams.get("motionSetup")==="1"}

function addStyle(){
  if(byId("motion26Style"))return;
  const s=document.createElement("style");s.id="motion26Style";s.textContent=`
  .room .motion26Stage{position:absolute;inset:0;z-index:21;display:none;background:#171513;overflow:hidden}
  .room.motion26-active .motion26Stage{display:block}
  .room .motion26Video{position:absolute;inset:-1px;width:calc(100% + 2px);height:calc(100% + 2px);object-fit:cover;object-position:center center;opacity:0;transition:opacity .30s ease;background:#171513}
  .room .motion26Video.active{opacity:1}
  .room.motion26-active>.roomArt,.room.motion26-active>.window,.room.motion26-active>.sun,.room.motion26-active>.sofa,.room.motion26-active>.rug,.room.motion26-active>.table,.room.motion26-active>.plant,.room.motion26-active>.avatar,.room.motion26-active>.pet,.room.motion26-active>.sparkle,.room.motion26-active>.v19Sun,.room.motion26-active>.v19Wind,.room.motion26-active>.v19Leaves,.room.motion26-active>.v19Dust,.room.motion26-active>.v19Lamp,.room.motion26-active>.v19PetBed{visibility:hidden!important;pointer-events:none!important}
  .room.motion26-active>.badge,.room.motion26-active>.event{visibility:visible!important}
  .motion26Setup{background:#171513;color:#fff;border-radius:18px;padding:13px;margin:9px 0;font-size:11px;line-height:1.45}
  .motion26Setup b{font-size:13px}.motion26Setup button{width:100%;border:0;border-radius:12px;padding:11px;margin-top:8px;font-weight:800}
  .motion26Slots{display:grid;grid-template-columns:repeat(2,1fr);gap:5px;margin-top:8px}.motion26Slot{font-size:9px;padding:7px 4px;background:#2c2c2c;border-radius:8px;text-align:center}.motion26Slot.ready{background:#e7f4e6;color:#143919}
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

async function getStatus(){
  try{
    const r=await fetch("/api/motion/status",{headers:auth(),cache:"no-store"}),d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok)throw new Error(d.error||`motion status ${r.status}`);
    statusData=d;renderSetup();return d
  }catch(e){console.warn("motion26 status",e);statusData=null;renderSetup(e.message);return null}
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
    byId("room")?.classList.add("motion26-active");
    requestAnimationFrame(()=>{nv.classList.add("active");ov?.classList.remove("active")});
    setTimeout(()=>{try{ov?.pause()}catch{}},340);active=next;return true
  }catch(e){console.warn("motion26 transition",slot,e);return false}
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
  if(!has("ambient")){ambientEnabled=false;deactivate();return false}
  ambientEnabled=true;const cur=videos[active]?.dataset?.slot;
  if(!force&&cur==="ambient"&&!videos[active]?.paused){byId("room")?.classList.add("motion26-active");return true}
  return transition("ambient",{loop:true})
}

async function playOneShot(slot){
  if(!has(slot))return false;
  const ok=await transition(slot,{loop:false});if(!ok)return false;
  await waitEnded(videos[active]);
  if(ambientEnabled&&has("ambient"))await startAmbient(true);else deactivate();
  return true
}

function deactivate(){
  byId("room")?.classList.remove("motion26-active");
  for(const v of videos){try{v.pause()}catch{}}
}

async function loadHybrid(){
  try{
    if(location.protocol==="file:")return false;
    const r=await fetch("/api/avatar/hybrid-current",{method:"POST",headers:auth({"cache-control":"no-cache"}),cache:"no-store"}),d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok||!d.url)return false;
    const f=await fetch(d.url,{headers:auth(),cache:"force-cache"});if(!f.ok)return false;
    const blob=await f.blob();
    if(hybridObjectUrl)try{URL.revokeObjectURL(hybridObjectUrl)}catch{}
    hybridObjectUrl=URL.createObjectURL(blob);
    let out=hybridObjectUrl;
    try{if(typeof window.visual17Cutout==="function")out=await window.visual17Cutout(hybridObjectUrl,"avatar")}catch(e){console.warn("hybrid cutout",e)}
    hybridCutout=out;applyHybrid();
    window.visual17GetMasterCutout=()=>hybridCutout;
    window.visual17RestoreMaster=async()=>{applyHybrid();return Boolean(hybridCutout)};
    return true
  }catch(e){console.warn("hybrid current",e);return false}
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
  if(!setupMode())return;
  if(!window.confirm("자연 모션 6개를 AI 영상으로 생성합니다. Cloudflare AI 사용 비용이 발생할 수 있습니다. 지금 시작할까요?"))return;
  const btn=byId("motion26Generate");if(btn){btn.disabled=true;btn.textContent="자연 모션 생성 중…"}
  const progress=byId("motion26Progress");
  try{
    await loadHybrid();
    const ctx=context();
    for(let i=0;i<SLOTS.length;i++){
      const slot=SLOTS[i];
      if(has(slot))continue;
      if(progress)progress.textContent=`${i+1}/${SLOTS.length} · ${slot} 생성 중…`;
      const r=await fetch("/api/motion/generate",{method:"POST",headers:auth({"content-type":"application/json"}),body:JSON.stringify({slot,...ctx,confirm_cost:true}),cache:"no-store"});
      const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw new Error(`${slot}: ${d.error||r.status}`);
      await getStatus()
    }
    if(progress)progress.textContent="자연 모션 6개 생성 완료 · 일반 방에서 자동 사용됩니다.";
    if(btn){btn.disabled=true;btn.textContent="자연 모션 준비 완료"}
    await startAmbient(true)
  }catch(e){
    if(progress)progress.textContent=`생성 중단 · ${e.message}`;
    if(btn){btn.disabled=false;btn.textContent="실패한 모션부터 이어서 생성"}
  }
}

function renderSetup(error=""){
  if(!setupMode()){byId("motion26Setup")?.remove();return}
  let host=byId("motion26Setup");
  if(!host){
    host=document.createElement("div");host.id="motion26Setup";host.className="motion26Setup";
    const growth=document.querySelector("#home .growthCard");(growth?.parentElement||byId("home"))?.insertBefore(host,growth||null)
  }
  const ready=new Set((statusData?.slots||[]).filter(x=>x.video).map(x=>x.slot));
  host.innerHTML=`<b>🎬 P2 자연 모션 V26</b><div style="margin-top:4px">실사 30% + 애니풍 70% · 영화형 자연 움직임</div><div class="motion26Slots">${SLOTS.map(s=>`<div class="motion26Slot ${ready.has(s)?"ready":""}">${ready.has(s)?"✓ ":""}${s}</div>`).join("")}</div><div id="motion26Progress" style="margin-top:8px">${error?`상태 확인 오류 · ${error}`:`${ready.size}/${SLOTS.length}개 준비됨`}</div><button id="motion26Generate">${ready.size===SLOTS.length?"자연 모션 준비 완료":"자연 모션 6개 한 번에 만들기"}</button><div style="margin-top:5px;color:#bbb">※ 영상 생성 시 Cloudflare AI 비용이 발생할 수 있어 버튼을 누른 뒤 한 번만 확인합니다.</div>`;
  const b=byId("motion26Generate");if(b){b.disabled=ready.size===SLOTS.length;b.onclick=generateAll}
}

function wrap(name,after){
  const old=window[name];if(typeof old!=="function"||old.__motion26)return;
  const fn=function(){const r=old.apply(this,arguments);Promise.resolve(r).finally(()=>after(...arguments));return r};fn.__motion26=true;window[name]=fn
}

function install(){
  addStyle();ensureStage();
  wrap("applyHome",()=>setTimeout(()=>{applyHybrid();getStatus().then(()=>startAmbient(false))},500));
  wrap("setTime",t=>setTimeout(async()=>{applyHybrid();await getStatus();if(t==="morning"&&has("stretch"))playOneShot("stretch");else if(t==="return"&&has("walk-sit")){seated=true;playOneShot("walk-sit")}else startAmbient(false)},550));
  wrap("avatarTap",()=>setTimeout(async()=>{if(!statusData)await getStatus();const slot=seated?"stand-walk":"walk-sit";if(has(slot)){seated=!seated;playOneShot(slot)}else applyHybrid()},0));
  wrap("petTap",()=>setTimeout(async()=>{if(!statusData)await getStatus();if(has("pet-touch"))playOneShot("pet-touch")},0));
  setTimeout(async()=>{await loadHybrid();await getStatus();if(has("ambient"))startAmbient(false)},1400);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden){applyHybrid();getStatus().then(()=>startAmbient(false))}});
  window.motionV26={version:VERSION,status:()=>statusData,refresh:getStatus,play:playOneShot,startAmbient,applyHybrid,generateAll}
}

window.addEventListener("beforeunload",()=>{for(const u of blobCache.values())try{URL.revokeObjectURL(u)}catch{}if(hybridObjectUrl)try{URL.revokeObjectURL(hybridObjectUrl)}catch{}});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();
