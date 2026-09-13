(()=>{
"use strict";
const VERSION="v30-smart-program";
const MASTER_ENGINE="/master-motion-v36.js?v=36";
const MASTER_ENGINE_V35_COMPAT="/master-motion-v35.js?v=35";
const MASTER_ENGINE_V34_COMPAT="/master-motion-v34.js?v=34";
const MASTER_ENGINE_V33_COMPAT="/master-motion-v33.js?v=33";
const MASTER_ENGINE_V32_COMPAT="/master-motion-v32.js?v=32";
const RECENT_MAX=8;
let token=0,running=false,lastMode="",recent=[],masterRequested=false;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function scene(){return window.sceneV28||null}
function master(){return window.masterMotionV36||window.masterMotionV35||window.masterMotionV34||window.masterMotionV33||window.masterMotionV32||null}
function safeGlobal(name,fallback=""){try{return window[name]??eval(name)??fallback}catch{return fallback}}
function appTime(){return String(safeGlobal("currentTime","evening")||"evening")}
function dayResult(){return String(safeGlobal("day","")||"")}
function connectionSaveData(){try{return Boolean(navigator.connection?.saveData)}catch{return false}}
function manifest(){return scene()?.manifest?.()||null}
function all(){const m=manifest();return Array.isArray(m?.scenes)?m.scenes:[]}
function ready(){return all().filter(s=>s.ready===true)}
function effectiveState(){const s=scene()?.status?.()||{},m=master()?.status?.()||{};return {currentLocation:m.logicalLocation||s.currentLocation||"home",currentPose:m.logicalPose||s.currentPose||"standing"}}
function status(){const st=effectiveState(),mm=master()?.status?.()||null;return {version:VERSION,running,lastMode,readyScenes:ready().length,mappedFallbackSlots:mm?.mappedSlots||0,currentLocation:st.currentLocation,currentPose:st.currentPose,recent:[...recent],continuityQC:mm?.continuityCounts||null,roughSlotCount:mm?.roughSlotCount||0,motionPolish:mm?.settleMs||null,masterMotion:mm,freeOnly:true}}
function tagsFor(mode){const tags=[mode,appTime()];const d=dayResult();if(d==="success")tags.push("success","calm");else if(d==="reduce")tags.push("calm");else if(d==="slip")tags.push("recovery","calm");return [...new Set(tags.filter(Boolean))]}
function cfg(mode){const p=manifest()?.programs?.[mode]||{};return {groups:Array.isArray(p.groups)?p.groups:[],maxClips:Math.max(1,Math.min(4,Number(p.maxClips)||2)),preferredLocation:p.preferredLocation||""}}
function score(s,ctx){let n=0;const tags=new Set(s.tags||[]),mm=master();if(s.start?.location===ctx.location)n+=9;if(s.start?.pose===ctx.pose)n+=5;if(ctx.preferredLocation&&s.start?.location===ctx.preferredLocation)n+=3;for(const t of ctx.tags)if(tags.has(t))n+=2;if(s.ready===true)n+=2;if(mm?.naturalScore)n+=Number(mm.naturalScore(s.id,{currentLocation:ctx.location})||0);else n+=Number(mm?.scoreSlot?.(s.id)||0);if(recent[0]===s.id)n-=24;else if(recent.includes(s.id))n-=8;if(s.type==="transition")n-=4;return n}
function canFallback(s){return Boolean(master()?.canPlaySlot?.(s.id))}
function candidates(groups,ctx){const set=new Set(groups);return all().filter(s=>s.type==="ambient"&&set.has(s.group)&&(s.ready===true||canFallback(s))).map(s=>({s,n:score(s,ctx)})).sort((a,b)=>b.n-a.n)}
function remember(id){recent=[id,...recent.filter(x=>x!==id)].slice(0,RECENT_MAX)}
function loadMaster(){if(window.masterMotionV36||masterRequested||document.querySelector('script[data-master-motion-v36]'))return;masterRequested=true;const s=document.createElement("script");s.src=MASTER_ENGINE;s.async=true;s.dataset.masterMotionV36="1";document.head.appendChild(s)}
async function waitMaster(){loadMaster();for(let n=0;n<44&&!master();n++)await sleep(50);return master()}
async function ensureLocation(target){if(!target)return true;const st=effectiveState(),mm=await waitMaster();const normal=mm?.normalizeLocation?.(target)||target,current=mm?.normalizeLocation?.(st.currentLocation)||st.currentLocation;if(current===normal)return true;if(mm?.canRoute&&!mm.canRoute(st.currentLocation,target))return false;try{if(await mm?.playTransition?.(st.currentLocation,target))return true}catch(e){console.warn("master transition fallback",e)}const sc=scene();try{const ok=await sc?.goTo?.(target);if(ok)return true}catch{}return false}
async function playCandidate(item,ctx){const sc=scene();if(!item?.s)return false;const s=item.s,target=s.start?.location||"",mm=await waitMaster();if(s.ready===true&&sc?.playScene){const st=effectiveState();if(target&&st.currentLocation!==target&&!await ensureLocation(target))return false;const ok=await sc.playScene(s.id,{fallback:false,keepStage:false});if(ok){remember(s.id);return true}}
 if(mm?.playForSlot&&mm.canPlaySlot?.(s.id)){const st=effectiveState(),a=mm?.normalizeLocation?.(st.currentLocation)||st.currentLocation,b=mm?.normalizeLocation?.(target)||target;if(target&&a!==b&&!await ensureLocation(target))return false;const ok=await mm.playForSlot(s.id,{slotFallback:true});if(ok){remember(s.id);return true}}
 return false}
async function fallback(mode){const mm=await waitMaster();if(mm?.playForMode){try{if(await mm.playForMode(mode))return true}catch(e){console.warn("master motion fallback",e)}}const sc=scene();if(!sc)return false;const t=mode==="return"?"return":mode==="morning"?"morning":mode==="night"?"night":mode==="day"?"day":"evening";return Boolean(await sc.playContext?.(t))}
async function playMode(mode,{force=false}={}){
 const sc=scene();await waitMaster();if(!sc)return fallback(mode);const m=manifest();if(!m||m.plannerVersion!==VERSION)return fallback(mode);
 const my=++token;running=true;lastMode=mode;master()?.stop?.();sc.stop?.();
 try{
   if(!force&&document.hidden)return false;
   if(mode==="day")return fallback("day");
   const conf=cfg(mode),st=effectiveState(),ctx={groups:conf.groups,tags:tagsFor(mode),preferredLocation:conf.preferredLocation,location:st.currentLocation,pose:st.currentPose};
   let max=conf.maxClips;if(connectionSaveData())max=1;
   if(mode==="return"){
     const mm=master();if(mm?.playForMode&&my===token){try{if(await mm.playForMode("return")){remember("master_v36_return_chain");return true}}catch(e){console.warn("v36 return",e)}}
   }
   let played=0,tries=0;
   while(my===token&&played<max&&tries<max*6){tries++;const stNow=effectiveState();const ranked=candidates(ctx.groups,{...ctx,location:stNow.currentLocation||ctx.location,pose:stNow.currentPose||ctx.pose});if(!ranked.length)break;const top=ranked[0].n,choicePool=ranked.filter(x=>x.n>=top-3).slice(0,5),choice=choicePool[Math.floor(Math.random()*choicePool.length)]||ranked[0];if(await playCandidate(choice,ctx)){played++;await sleep(40)}else recent=[choice.s.id,...recent.filter(x=>x!==choice.s.id)].slice(0,RECENT_MAX)}
   if(played===0)return fallback(mode);return true
 }finally{if(my===token)running=false}
}
function mapTime(t){const x=String(t||appTime());if(x==="morning")return "morning";if(x==="return")return "return";if(x==="day")return "day";if(x==="night")return "night";return "evening"}
function playCurrent(t){return playMode(mapTime(t))}
function playRisk(){return playMode("risk",{force:true})}
function stop(){token++;running=false;master()?.stop?.();scene()?.stop?.()}
async function boot(){loadMaster();if(!scene()&&!master())return;window.sceneProgramV30={version:VERSION,status,playMode,playCurrent,playRisk,stop,refresh:()=>({ok:true,readyScenes:ready().length,master:master()?.status?.()||null})};window.dispatchEvent(new CustomEvent("p2:scene-v30-ready",{detail:status()}))}
window.addEventListener("p2:scene-v28-ready",()=>setTimeout(boot,60),{once:true});
window.addEventListener("p2:master-motion-v36-ready",()=>{if(!window.sceneProgramV30)setTimeout(boot,14)},{once:true});
window.addEventListener("p2:master-motion-v35-ready",()=>{if(!window.sceneProgramV30)setTimeout(boot,16)},{once:true});
window.addEventListener("p2:master-motion-v34-ready",()=>{if(!window.sceneProgramV30)setTimeout(boot,18)},{once:true});
window.addEventListener("p2:master-motion-v33-ready",()=>{if(!window.sceneProgramV30)setTimeout(boot,22)},{once:true});
window.addEventListener("p2:master-motion-v32-ready",()=>{if(!window.sceneProgramV30)setTimeout(boot,25)},{once:true});
if(window.sceneV28)setTimeout(boot,80);else setTimeout(()=>{loadMaster();boot()},120);
document.addEventListener("visibilitychange",()=>{if(document.hidden)stop()});
})();
