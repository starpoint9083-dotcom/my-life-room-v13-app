(()=>{
"use strict";
const VERSION="v30-smart-program";
const RECENT_MAX=8;
let token=0,running=false,lastMode="",recent=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function scene(){return window.sceneV28||null}
function safeGlobal(name,fallback=""){try{return window[name]??eval(name)??fallback}catch{return fallback}}
function appTime(){return String(safeGlobal("currentTime","evening")||"evening")}
function dayResult(){return String(safeGlobal("day","")||"")}
function connectionSaveData(){try{return Boolean(navigator.connection?.saveData)}catch{return false}}
function manifest(){return scene()?.manifest?.()||null}
function all(){const m=manifest();return Array.isArray(m?.scenes)?m.scenes:[]}
function ready(){return all().filter(s=>s.ready===true)}
function status(){const s=scene()?.status?.()||{};return {version:VERSION,running,lastMode,readyScenes:ready().length,currentLocation:s.currentLocation||"home",currentPose:s.currentPose||"standing",recent:[...recent],freeOnly:true}}
function tagsFor(mode){const tags=[mode,appTime()];const d=dayResult();if(d==="success")tags.push("success","calm");else if(d==="reduce")tags.push("calm");else if(d==="slip")tags.push("recovery","calm");return [...new Set(tags.filter(Boolean))]}
function cfg(mode){const p=manifest()?.programs?.[mode]||{};return {groups:Array.isArray(p.groups)?p.groups:[],maxClips:Math.max(1,Math.min(4,Number(p.maxClips)||2)),preferredLocation:p.preferredLocation||""}}
function score(s,ctx){let n=0;const tags=new Set(s.tags||[]);if(s.start?.location===ctx.location)n+=9;if(s.start?.pose===ctx.pose)n+=5;if(ctx.preferredLocation&&s.start?.location===ctx.preferredLocation)n+=3;for(const t of ctx.tags)if(tags.has(t))n+=2;if(recent[0]===s.id)n-=20;else if(recent.includes(s.id))n-=7;if(s.type==="transition")n-=4;return n}
function candidates(groups,ctx){const set=new Set(groups);return ready().filter(s=>s.type==="ambient"&&set.has(s.group)).map(s=>({s,n:score(s,ctx)})).sort((a,b)=>b.n-a.n)}
function remember(id){recent=[id,...recent.filter(x=>x!==id)].slice(0,RECENT_MAX)}
async function ensureLocation(target){if(!target)return true;const sc=scene(),st=sc?.status?.()||{};if(st.currentLocation===target)return true;const ok=await sc?.goTo?.(target);return Boolean(ok)}
async function playCandidate(item,ctx){const sc=scene();if(!sc||!item?.s)return false;const target=item.s.start?.location||"";let st=sc.status?.()||{};if(target&&st.currentLocation!==target){const same=candidates(ctx.groups,{...ctx,location:st.currentLocation,pose:st.currentPose}).find(x=>x.s.start?.location===st.currentLocation);if(same&&same.s.id!==item.s.id)item=same;else if(!await ensureLocation(target))return false}
 const ok=await sc.playScene?.(item.s.id,{fallback:false,keepStage:false});if(ok)remember(item.s.id);return Boolean(ok)}
async function fallback(mode){const sc=scene();if(!sc)return false;const t=mode==="return"?"return":mode==="morning"?"morning":mode==="night"?"night":mode==="day"?"day":"evening";return Boolean(await sc.playContext?.(t))}
async function playMode(mode,{force=false}={}){
 const sc=scene();if(!sc)return false;const m=manifest();if(!m||m.plannerVersion!==VERSION)return fallback(mode);
 const my=++token;running=true;lastMode=mode;sc.stop?.();
 try{
   const conf=cfg(mode),st=sc.status?.()||{},ctx={groups:conf.groups,tags:tagsFor(mode),preferredLocation:conf.preferredLocation,location:st.currentLocation||"home",pose:st.currentPose||"standing"};
   let max=conf.maxClips;if(connectionSaveData())max=1;if(!force&&document.hidden)return false;
   if(mode==="return"){
     const returns=candidates(["return_home"],{...ctx,groups:["return_home"],location:"entry",pose:"standing"});
     if(returns.length&&my===token){const first=returns[Math.floor(Math.random()*Math.min(3,returns.length))];const ok=await sc.playScene?.(first.s.id,{fallback:false,keepStage:false});if(ok)remember(first.s.id);await sleep(80)}
     if(my===token){const moved=await sc.goTo?.("sofa");if(moved)await sleep(60)}
     ctx.groups=["sofa_relax"];ctx.location="sofa";ctx.pose="seated";max=Math.max(1,max-1)
   }
   let played=0,tries=0;
   while(my===token&&played<max&&tries<max*4){tries++;const stNow=sc.status?.()||{};const ranked=candidates(ctx.groups,{...ctx,location:stNow.currentLocation||ctx.location,pose:stNow.currentPose||ctx.pose});if(!ranked.length)break;const top=ranked[0].n,choicePool=ranked.filter(x=>x.n>=top-2).slice(0,4),choice=choicePool[Math.floor(Math.random()*choicePool.length)]||ranked[0];if(await playCandidate(choice,ctx)){played++;await sleep(90)}else recent=[choice.s.id,...recent.filter(x=>x!==choice.s.id)].slice(0,RECENT_MAX)}
   if(played===0&&mode!=="return")return fallback(mode);return played>0||mode==="return"
 }finally{if(my===token)running=false}
}
function mapTime(t){const x=String(t||appTime());if(x==="morning")return "morning";if(x==="return")return "return";if(x==="day")return "day";if(x==="night")return "night";return "evening"}
function playCurrent(t){return playMode(mapTime(t))}
function playRisk(){return playMode("risk",{force:true})}
function stop(){token++;running=false;scene()?.stop?.()}
async function boot(){if(!scene())return;window.sceneProgramV30={version:VERSION,status,playMode,playCurrent,playRisk,stop,refresh:()=>({ok:true,readyScenes:ready().length})};window.dispatchEvent(new CustomEvent("p2:scene-v30-ready",{detail:status()}))}
window.addEventListener("p2:scene-v28-ready",()=>setTimeout(boot,60),{once:true});
if(window.sceneV28)setTimeout(boot,80);
document.addEventListener("visibilitychange",()=>{if(document.hidden)stop()});
})();
