(()=>{
"use strict";
const VERSION="v42-real-frame-sequence";
const MANIFEST_URL="/master-frames-v42-manifest.json?v=42";
let manifest=null,loading=null,seq=0,currentRoute="",played=0,lastMaster="",suppressEvents=0,autoBridge=true;
const preloadCache=new Map();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function loadManifest(){if(manifest)return manifest;if(loading)return loading;loading=(async()=>{try{const r=await fetch(MANIFEST_URL,{cache:"no-store"});if(!r.ok)throw new Error(`manifest ${r.status}`);const d=await r.json();if(d?.version!==VERSION||d?.fakeMotion!==false||d?.paidVideo!==false||!Array.isArray(d?.routes))throw new Error("manifest validation");manifest=d;return d}catch(e){console.warn("master frames v42 manifest",e);return null}})();return loading}
function routeFor(from,to){return manifest?.routes?.find?.(r=>r.from===from&&r.to===to)||null}
function masterSrc(id){return window.masterSceneV40?.manifest?.()?.masters?.find?.(m=>m.id===id)?.src||""}
async function preload(src){if(preloadCache.has(src))return preloadCache.get(src);const p=new Promise(resolve=>{const i=new Image();let done=false;const finish=v=>{if(done)return;done=true;resolve(v)};i.onload=()=>finish(true);i.onerror=()=>finish(false);i.src=src;setTimeout(()=>finish(false),2500)});preloadCache.set(src,p);return p}
async function prepareRoute(route){if(!route?.frames?.length)return {ok:false,ready:0,total:route?.frames?.length||0};const checks=await Promise.all(route.frames.map(preload));const ready=checks.filter(Boolean).length;return {ok:ready===checks.length,ready,total:checks.length}}
async function directMaster(id,source){const e=window.masterSceneV40;if(!e?.showMaster)return false;suppressEvents++;try{return await e.showMaster(id,{source})}finally{suppressEvents--}}
async function runRoute(route,from,to,{frameMs,alreadyTarget=false}={}){
 const my=++seq;const prep=await prepareRoute(route);if(!prep.ok||my!==seq)return false;
 const img=document.getElementById("masterScene40");if(!img)return false;const fromSrc=masterSrc(from),toSrc=masterSrc(to);if(!fromSrc||!toSrc)return false;
 currentRoute=route.id;const ms=Math.max(70,Math.min(220,Number(frameMs||manifest.frameMs||120)));
 img.src=fromSrc;await new Promise(r=>requestAnimationFrame(()=>r()));
 for(const src of route.frames){if(my!==seq)return false;img.src=src;await sleep(ms)}
 if(my!==seq)return false;img.src=toSrc;lastMaster=to;played+=1;currentRoute="";
 if(!alreadyTarget){const room=document.getElementById("room");if(room){room.dataset.master40=to;room.dataset.master40Source=`v42:${route.id}:end`}}
 window.dispatchEvent(new CustomEvent("p2:master-frames-v42-played",{detail:{route:route.id,from,to,frameCount:route.frames.length,frameMs:ms,realFrames:true}}));return true
}
async function playBetween(from,to,{frameMs}={}){if(!manifest&&!await loadManifest())return false;const route=routeFor(from,to);if(!route)return false;const start=await directMaster(from,`v42:${route.id}:start`);if(!start)return false;const ok=await runRoute(route,from,to,{frameMs,alreadyTarget:false});if(ok)await directMaster(to,`v42:${route.id}:end`);return ok}
function onMaster(e){const id=String(e?.detail?.id||"");if(!id)return;if(suppressEvents){lastMaster=id;return}const from=lastMaster;lastMaster=id;if(!autoBridge||!from||from===id)return;const route=routeFor(from,id);if(!route)return;const img=document.getElementById("masterScene40"),src=masterSrc(from);if(img&&src)img.src=src;queueMicrotask(()=>runRoute(route,from,id,{alreadyTarget:true}))}
function stop(){seq++;currentRoute="";return true}
async function routeStatus(){if(!manifest&&!await loadManifest())return [];const out=[];for(const r of manifest.routes){const p=await prepareRoute(r);out.push({id:r.id,from:r.from,to:r.to,ready:p.ok,readyFrames:p.ready,totalFrames:p.total})}return out}
async function warm(){if(!manifest&&!await loadManifest())return false;Promise.all(manifest.routes.flatMap(r=>r.frames).map(preload)).catch(()=>{});return true}
async function status(){if(!manifest)await loadManifest();return {version:VERSION,currentRoute,played,lastMaster,routeCount:manifest?.routes?.length||0,autoBridge,mode:"real-intermediate-images-only",fakeMotion:false,paidVideo:false}}
async function boot(){if(!await loadManifest())return;for(let n=0;n<60&&!window.masterSceneV40;n++)await sleep(50);lastMaster=String(document.getElementById("room")?.dataset?.master40||"");window.addEventListener("p2:master-scene-v40-show",onMaster);window.masterFramesV42={version:VERSION,status,routeStatus,playBetween,stop,warm,manifest:()=>manifest,setAutoBridge:v=>autoBridge=Boolean(v)};warm();window.dispatchEvent(new CustomEvent("p2:master-frames-v42-ready",{detail:await status()}))}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,1400),{once:true});else setTimeout(boot,1400);
})();
