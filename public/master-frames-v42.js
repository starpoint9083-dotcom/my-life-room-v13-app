(()=>{
"use strict";
const VERSION="v42-real-frame-sequence";
const MANIFEST_URL="/master-frames-v42-manifest.json?v=42";
let manifest=null,loading=null,seq=0,currentRoute="",played=0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function loadManifest(){if(manifest)return manifest;if(loading)return loading;loading=(async()=>{try{const r=await fetch(MANIFEST_URL,{cache:"no-store"});if(!r.ok)throw new Error(`manifest ${r.status}`);const d=await r.json();if(d?.version!==VERSION||d?.fakeMotion!==false||d?.paidVideo!==false||!Array.isArray(d?.routes))throw new Error("manifest validation");manifest=d;return d}catch(e){console.warn("master frames v42 manifest",e);return null}})();return loading}
function routeFor(from,to){return manifest?.routes?.find?.(r=>r.from===from&&r.to===to)||null}
async function preload(src){return new Promise(resolve=>{const i=new Image();let done=false;const finish=v=>{if(done)return;done=true;resolve(v)};i.onload=()=>finish(true);i.onerror=()=>finish(false);i.src=src;setTimeout(()=>finish(false),2200)})}
async function prepareRoute(route){if(!route?.frames?.length)return {ok:false,ready:0,total:route?.frames?.length||0};const checks=await Promise.all(route.frames.map(preload));const ready=checks.filter(Boolean).length;return {ok:ready===checks.length,ready,total:checks.length}}
async function playBetween(from,to,{frameMs}={}){
 const my=++seq;if(!manifest&&!await loadManifest())return false;const route=routeFor(from,to);if(!route)return false;
 const prep=await prepareRoute(route);if(!prep.ok||my!==seq)return false;
 const engine=window.masterSceneV40,img=document.getElementById("masterScene40");if(!engine?.showMaster||!img)return false;
 currentRoute=route.id;await engine.showMaster(from,{source:`v42:${route.id}:start`});if(my!==seq)return false;
 const ms=Math.max(70,Math.min(240,Number(frameMs||manifest.frameMs||120)));
 for(const src of route.frames){if(my!==seq)return false;img.src=src;await sleep(ms)}
 if(my!==seq)return false;await engine.showMaster(to,{source:`v42:${route.id}:end`});played+=1;currentRoute="";
 window.dispatchEvent(new CustomEvent("p2:master-frames-v42-played",{detail:{route:route.id,from,to,frameCount:route.frames.length,frameMs:ms}}));return true
}
function stop(){seq++;currentRoute="";return true}
async function routeStatus(){if(!manifest&&!await loadManifest())return [];const out=[];for(const r of manifest.routes){const p=await prepareRoute(r);out.push({id:r.id,from:r.from,to:r.to,ready:p.ok,readyFrames:p.ready,totalFrames:p.total})}return out}
async function status(){if(!manifest)await loadManifest();return {version:VERSION,currentRoute,played,routeCount:manifest?.routes?.length||0,mode:"real-intermediate-images-only",fakeMotion:false,paidVideo:false}}
async function boot(){if(!await loadManifest())return;window.masterFramesV42={version:VERSION,status,routeStatus,playBetween,stop,manifest:()=>manifest};window.dispatchEvent(new CustomEvent("p2:master-frames-v42-ready",{detail:await status()}))}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,1400),{once:true});else setTimeout(boot,1400);
})();
