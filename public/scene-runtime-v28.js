(()=>{
"use strict";
const VERSION="v28-scene-library";
const ASSET_REGISTRY="v29-scene-manager";
const MANIFEST_URL="/scene-library-v28-manifest.json?v=28";
const STATUS_URL="/api/scene-library/status";
const byId=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let manifest=null,stage=null,videos=[],activeIndex=0,loaded=false,busy=false,cycleToken=0;
let currentScene="",currentLocation="home",currentPose="standing",lastPlayed=[];
const sceneCache=new Map(),objectUrls=new Map();

function room(){return byId("room")}
function fm(){return window.frameMotionV27||null}
function auth(extra={}){try{return typeof authHeaders==="function"?authHeaders(extra):extra}catch{return extra}}
function prefersReduced(){return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches}
function normalizeSrc(src){const s=String(src||"").trim();if(!s)return "";if(/^https?:\/\//i.test(s)||s.startsWith("blob:"))return s;return s.startsWith("/")?s:`/${s.replace(/^\/+/,"")}`}
function allScenes(){return Array.isArray(manifest?.scenes)?manifest.scenes:[]}
function sceneById(id){return allScenes().find(s=>s.id===id)||null}
function groupScenes(group){return allScenes().filter(s=>s.group===group)}
function sceneReady(s){return Boolean(s&&s.ready===true&&(normalizeSrc(s.src)||s.assetApi))}
function readyCount(){return allScenes().filter(sceneReady).length}

function addStyle(){
 if(byId("sceneV28Style"))return;
 const s=document.createElement("style");s.id="sceneV28Style";s.textContent=`
 .room .sceneV28Stage{position:absolute;inset:0;z-index:20;display:none;overflow:hidden;background:#171513;pointer-events:none}
 .room.scene-v28-active .sceneV28Stage{display:block}
 .room .sceneV28Video{position:absolute;inset:-1px;width:calc(100% + 2px);height:calc(100% + 2px);object-fit:cover;object-position:center center;opacity:0;transition:opacity .12s linear;background:#171513}
 .room .sceneV28Video.active{opacity:1}
 .room.scene-v28-active>.roomArt,.room.scene-v28-active>.window,.room.scene-v28-active>.sun,.room.scene-v28-active>.sofa,.room.scene-v28-active>.rug,.room.scene-v28-active>.table,.room.scene-v28-active>.plant,.room.scene-v28-active>.avatar,.room.scene-v28-active>.pet,.room.scene-v28-active>.fm27Actor,.room.scene-v28-active>.fm27Pet,.room.scene-v28-active>.sparkle,.room.scene-v28-active>.v19Sun,.room.scene-v28-active>.v19Wind,.room.scene-v28-active>.v19Leaves,.room.scene-v28-active>.v19Dust,.room.scene-v28-active>.v19Lamp,.room.scene-v28-active>.v19PetBed{visibility:hidden!important;pointer-events:none!important}
 .room.scene-v28-active>.badge,.room.scene-v28-active>.event{visibility:visible!important}
 @media (prefers-reduced-motion: reduce){.room .sceneV28Video{transition:none}}
 `;document.head.appendChild(s)
}

function ensureStage(){
 const r=room();if(!r)return false;if(stage?.isConnected)return true;
 stage=document.createElement("div");stage.id="sceneV28Stage";stage.className="sceneV28Stage";
 for(let i=0;i<2;i++){const v=document.createElement("video");v.className="sceneV28Video";v.muted=true;v.playsInline=true;v.preload="auto";v.disablePictureInPicture=true;v.setAttribute("webkit-playsinline","");stage.appendChild(v);videos.push(v)}
 r.appendChild(stage);return true
}
function activate(on){const r=room();if(!r)return;r.classList.toggle("scene-v28-active",Boolean(on))}
function pauseAll(){for(const v of videos){try{v.pause()}catch{}}}
function updateState(scene){if(scene?.end?.location)currentLocation=scene.end.location;if(scene?.end?.pose)currentPose=scene.end.pose;currentScene=scene?.id||""}
function revokeObjectUrls(){for(const u of objectUrls.values())try{URL.revokeObjectURL(u)}catch{}objectUrls.clear();sceneCache.clear()}

async function syncRegisteredAssets(){
 if(!manifest||location.protocol==="file:")return false;
 try{
   const r=await fetch(STATUS_URL,{headers:auth(),cache:"no-store"});if(!r.ok)return false;const d=await r.json();if(!d?.ok||!Array.isArray(d.assets))return false;
   const found=new Map(d.assets.map(a=>[a.scene_id,a]));
   for(const s of allScenes()){
     const a=found.get(s.id);if(!a)continue;
     s.assetApi=a.file_api||`/api/scene-library/file?scene_id=${encodeURIComponent(s.id)}`;s.assetUpdated=String(a.updated_at||"");s.assetMime=String(a.mime_type||"video/mp4");
     s.durationMs=Number(a.duration_ms)||s.durationMs;s.ready=a.qc_status==="ready";
   }
   window.dispatchEvent(new CustomEvent("p2:scene-v29-assets",{detail:{readyScenes:readyCount(),count:d.assets.length}}));return true
 }catch(e){console.warn("scene asset registry",e);return false}
}

async function sourceForScene(scene){
 if(!scene)return "";
 if(scene.assetApi){
   const key=`${scene.id}|${scene.assetUpdated||""}`;if(objectUrls.has(key))return objectUrls.get(key);
   const r=await fetch(scene.assetApi,{headers:auth(),cache:"force-cache"});if(!r.ok)return "";const blob=await r.blob();if(!blob.size)return "";const url=URL.createObjectURL(blob);objectUrls.set(key,url);return url
 }
 return normalizeSrc(scene.src)
}

function waitMedia(v,event,timeoutMs){return new Promise(resolve=>{let done=false;const finish=ok=>{if(done)return;done=true;clearTimeout(t);v.removeEventListener(event,onOk);v.removeEventListener("error",onErr);resolve(ok)};const onOk=()=>finish(true),onErr=()=>finish(false),t=setTimeout(()=>finish(false),timeoutMs);v.addEventListener(event,onOk,{once:true});v.addEventListener("error",onErr,{once:true})})}
function waitEnded(v,maxMs){return new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(t);v.removeEventListener("ended",finish);v.removeEventListener("error",finish);resolve()};const t=setTimeout(finish,maxMs);v.addEventListener("ended",finish,{once:true});v.addEventListener("error",finish,{once:true})})}

async function preloadScene(scene){
 if(!sceneReady(scene))return false;const cacheKey=`${scene.id}|${scene.assetUpdated||scene.src||""}`;if(sceneCache.has(cacheKey))return sceneCache.get(cacheKey);
 const p=(async()=>{const src=await sourceForScene(scene);if(!src)return false;return new Promise(resolve=>{const v=document.createElement("video");v.preload="metadata";v.muted=true;v.playsInline=true;v.src=src;const done=ok=>{v.onloadedmetadata=null;v.onerror=null;resolve(ok)};v.onloadedmetadata=()=>done(true);v.onerror=()=>done(false);try{v.load()}catch{done(false)}})})();sceneCache.set(cacheKey,p);return p
}
function preloadGroups(groups){for(const g of groups||[]){for(const s of groupScenes(g).filter(sceneReady).slice(0,3))preloadScene(s).catch(()=>{})}}

async function loadInto(v,scene){
 const src=await sourceForScene(scene);if(!src)return false;
 const key=`${scene.id}|${scene.assetUpdated||src}`;if(v.dataset.sceneKey!==key){v.pause();v.src=src;v.dataset.sceneId=scene.id;v.dataset.sceneKey=key;v.load()}
 v.loop=false;v.muted=true;v.playsInline=true;try{v.currentTime=0}catch{}
 if(v.readyState<2){const ok=await waitMedia(v,"canplay",3200);if(!ok)return false}
 try{await v.play();return true}catch{return false}
}

async function playClip(scene,{keepStage=true}={}){
 if(!sceneReady(scene)||prefersReduced())return false;ensureStage();busy=true;const next=1-activeIndex,nv=videos[next],ov=videos[activeIndex];
 try{const ok=await loadInto(nv,scene);if(!ok)return false;activate(true);requestAnimationFrame(()=>{nv.classList.add("active");ov?.classList.remove("active")});setTimeout(()=>{try{ov?.pause()}catch{}},160);activeIndex=next;currentScene=scene.id;const maxMs=Math.max(1200,Number(scene.durationMs)||6000)+1200;await waitEnded(nv,maxMs);updateState(scene);lastPlayed=[scene.id,...lastPlayed.filter(x=>x!==scene.id)].slice(0,4);return true}
 finally{busy=false;if(!keepStage){pauseAll();activate(false)}}
}

function scoreScene(scene,ctx={}){if(!sceneReady(scene))return -999;let score=0;const tags=new Set(scene.tags||[]),wanted=ctx.tags||[];if(ctx.location&&scene.start?.location===ctx.location)score+=5;if(ctx.pose&&scene.start?.pose===ctx.pose)score+=4;if(ctx.time&&tags.has(ctx.time))score+=3;for(const t of wanted)if(tags.has(t))score+=2;if(lastPlayed[0]===scene.id)score-=10;if(lastPlayed.includes(scene.id))score-=2;return score}
function pick(group,ctx={}){const list=groupScenes(group).filter(sceneReady).map(s=>({s,n:scoreScene(s,ctx)})).sort((a,b)=>b.n-a.n);if(!list.length)return null;const top=list[0].n,choices=list.filter(x=>x.n>=top-1).slice(0,3);return choices[Math.floor(Math.random()*choices.length)]?.s||list[0].s}

async function fallbackFor(scene){const f=fm();if(!f)return false;const id=scene?.id||"";if(id==="transition_entry_to_sofa"||id==="transition_window_to_sofa"||id==="transition_pet_to_sofa"){const ok=await f.sit?.();currentLocation="sofa";currentPose="seated";return Boolean(ok)}if(id==="transition_sofa_to_stand"){const ok=await f.stand?.();currentLocation="sofa";currentPose="standing";return Boolean(ok)}if(id==="transition_sofa_to_window"){if(f.stand)await f.stand();if(f.playWalkTo)await f.playWalkTo(72);currentLocation="window";currentPose="standing";return true}if(id==="transition_sofa_to_pet"){const ok=await f.pet?.();currentLocation="pet";currentPose="crouch";return Boolean(ok)}if(scene?.group==="morning")return Boolean(await f.play?.("stretch"));if(scene?.group==="window")return Boolean(await f.play?.("look"));if(scene?.group==="pet")return Boolean(await f.pet?.());return Boolean(await f.idle?.())}

async function playScene(id,{fallback=true,keepStage=false}={}){cycleToken++;const s=sceneById(id);if(!s)return false;if(sceneReady(s)){const ok=await playClip(s,{keepStage});if(ok)return true}if(fallback){activate(false);return fallbackFor(s)}return false}
async function playGroupOnce(group,ctx={}){cycleToken++;const scene=pick(group,{location:currentLocation,pose:currentPose,...ctx});if(scene)return playClip(scene,{keepStage:false});const placeholder=groupScenes(group)[0];activate(false);return placeholder?fallbackFor(placeholder):false}
async function startAmbient(group,ctx={}){const token=++cycleToken,ready=groupScenes(group).filter(sceneReady);if(!ready.length){activate(false);const placeholder=groupScenes(group)[0];return placeholder?fallbackFor(placeholder):false}while(token===cycleToken){const scene=pick(group,{location:currentLocation,pose:currentPose,...ctx});if(!scene)break;const ok=await playClip(scene,{keepStage:true});if(!ok)break;await sleep(40)}if(token===cycleToken){pauseAll();activate(false)}return true}
function findTransition(toLocation){const candidates=allScenes().filter(s=>s.type==="transition"&&s.end?.location===toLocation&&(!s.start?.location||s.start.location===currentLocation));return candidates.find(sceneReady)||candidates[0]||null}
async function goTo(toLocation){cycleToken++;const s=findTransition(toLocation);if(!s)return false;if(sceneReady(s)){const ok=await playClip(s,{keepStage:false});if(ok)return true}activate(false);return fallbackFor(s)}
async function runRoutine(name,ctx={}){cycleToken++;const steps=manifest?.routines?.[name];if(!Array.isArray(steps))return false;for(const step of steps){if(sceneById(step)){const ok=await playScene(step,{fallback:true,keepStage:false});if(!ok)return false;continue}if(groupScenes(step).length){startAmbient(step,ctx);return true}}return true}

function contextForTime(t){const time=String(t||"");if(time==="morning")return {routine:"morning",group:"morning",tags:["morning"]};if(time==="return")return {routine:"return_home",group:"sofa_relax",tags:["return","evening"]};if(time==="night")return {group:"sofa_relax",tags:["night","calm"]};if(time==="day")return {group:currentLocation==="window"?"window":"standing_idle",tags:["day"]};return {group:currentPose==="seated"?"sofa_relax":"standing_idle",tags:["evening"]}}
async function playContext(t){const c=contextForTime(t);if(c.routine)return runRoutine(c.routine,{time:t,tags:c.tags});return startAmbient(c.group,{time:t,tags:c.tags})}

async function loadManifest(){try{const r=await fetch(MANIFEST_URL,{cache:"no-store"});if(!r.ok)throw new Error(`scene manifest ${r.status}`);const d=await r.json();if(d?.version!==VERSION||d?.paidGeneration!==false||d?.freeOnly!==true)throw new Error("scene manifest policy mismatch");manifest=d;loaded=true;return true}catch(e){console.warn("scene v28 manifest",e);manifest=null;loaded=false;return false}}
async function refreshAssets(){revokeObjectUrls();const ok=await syncRegisteredAssets();preloadGroups(["sofa_relax","morning","window","pet","transition"]);return {ok,readyScenes:readyCount()}}
function stop(){cycleToken++;busy=false;pauseAll();activate(false);currentScene=""}
function status(){return {version:VERSION,assetRegistry:ASSET_REGISTRY,loaded,readyScenes:readyCount(),currentScene,currentLocation,currentPose,busy,freeOnly:true}}

async function boot(){addStyle();ensureStage();const ok=await loadManifest();if(!ok)return;await syncRegisteredAssets();preloadGroups(["sofa_relax","morning","window","pet","transition"]);window.sceneV28={version:VERSION,assetRegistry:ASSET_REGISTRY,status,manifest:()=>manifest,sceneById,playScene,playGroupOnce,startAmbient,goTo,runRoutine,playContext,stop,readyCount,refreshAssets};window.dispatchEvent(new CustomEvent("p2:scene-v28-ready",{detail:status()}))}
window.addEventListener("beforeunload",()=>{stop();revokeObjectUrls()});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,1000),{once:true});else setTimeout(boot,1000);
})();
