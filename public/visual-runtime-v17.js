(()=>{
"use strict";
const byId=id=>document.getElementById(id);
const memory=new Map();
let visualBusy=false,lastSceneKey="",lastAvatarSource="",lastAvatarCutout="",lastPetCutout="";

function addStyle(){
  if(byId("visual17Style"))return;
  const s=document.createElement("style");s.id="visual17Style";s.textContent=`
  .room.visual17{background:#e8dfd2;isolation:isolate}
  .room.visual17 .roomArt{display:block;object-fit:cover;object-position:center center;filter:saturate(.96) contrast(1.025);animation:v17fade .55s ease both}
  .room.visual17.hasArt .window,.room.visual17.hasArt .rug,.room.visual17.hasArt .sofa,.room.visual17.hasArt .table{display:none}
  .room.visual17.hasArt .plant{opacity:0;pointer-events:auto}
  .room.visual17 .assetBadge{display:none}
  .room.visual17 .avatar{left:52%;bottom:91px;width:118px;height:238px;transform:translateX(-50%);z-index:18;overflow:visible}
  .room.visual17 .avatar.away{opacity:0;transform:translate(90px,0) scale(.92)}
  .room.visual17 .avatar.ai .avatarFull{display:block;inset:0 -18px 0 -18px;width:154px;height:238px;object-fit:contain;object-position:50% 100%;background:transparent;filter:drop-shadow(0 9px 7px rgba(33,25,20,.28))}
  .room.visual17 .pet{left:22%;bottom:71px;width:94px;height:79px;z-index:19;filter:none;overflow:visible}
  .room.visual17 .pet.assetMode{background:transparent!important;border-radius:0}
  .room.visual17 .pet.assetMode:before,.room.visual17 .pet.assetMode:after{display:none!important}
  .room.visual17 .pet.assetMode .petAsset{display:block;inset:-7px -12px -7px -12px;width:118px;height:94px;object-fit:contain;object-position:50% 100%;background:transparent;filter:drop-shadow(0 7px 5px rgba(38,28,20,.25));animation:v17pet .45s ease both}
  .room.visual17.pet-affection .pet{left:34%;bottom:69px}
  .room.visual17.pet-boss .pet{left:12%;bottom:76px;transform:scale(.92)}
  .room.visual17.pet-steady .pet{left:23%;bottom:70px;transform:scale(1.02)}
  .room.visual17.pet-playful .pet{left:31%;bottom:68px;transform:rotate(-2deg) scale(1.05)}
  .room.visual17.visual-success .roomArt{filter:saturate(1.01) contrast(1.025) brightness(1.02)}
  .room.visual17.visual-slip .roomArt{filter:saturate(.88) contrast(1.01) brightness(.96)}
  .room.visual17 .event{backdrop-filter:blur(10px);background:rgba(255,255,255,.90);border-color:rgba(255,255,255,.72);box-shadow:0 8px 20px rgba(35,27,20,.10)}
  @keyframes v17fade{from{opacity:.35;transform:scale(1.015)}to{opacity:1;transform:scale(1)}}
  @keyframes v17pet{from{opacity:.25;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
  `;document.head.appendChild(s);
}
function auth(extra={}){try{return typeof authHeaders==="function"?authHeaders(extra):extra}catch{return extra}}
function styleKey(){try{return [roomStyle||"warm",roomLevel||1,currentTime||"morning",petKind||"dog",petMode||"댕댕이형"].join("|")}catch{return "warm|1|morning|dog|댕댕이형"}}
function normalizeStyle(){try{return roomStyle==="modern"?"modern":roomStyle==="cozy"?"cozy":"warm"}catch{return "warm"}}
function getDay(){try{return day||"pending"}catch{return "pending"}}
function setMood(){
  const room=byId("room");if(!room)return;
  room.classList.remove("visual-success","visual-reduce","visual-slip","pet-affection","pet-boss","pet-steady","pet-playful");
  const d=getDay();if(d==="slip")room.classList.add("visual-slip");else if(d==="reduce")room.classList.add("visual-reduce");else if(d==="success")room.classList.add("visual-success");
  let mode="";try{mode=petMode||""}catch{}
  if(mode==="개냥이형")room.classList.add("pet-affection");else if(mode==="집사취급형")room.classList.add("pet-boss");else if(mode==="듬직이형")room.classList.add("pet-steady");else room.classList.add("pet-playful");
}
function imageLoad(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src})}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function borderStats(d,w,h){
  const samples=[];const band=Math.max(2,Math.round(Math.min(w,h)*.018));
  const take=(x,y)=>{const p=(y*w+x)*4;samples.push([d[p],d[p+1],d[p+2]])};
  for(let y=0;y<band;y++)for(let x=0;x<w;x+=2){take(x,y);take(x,h-1-y)}
  for(let x=0;x<band;x++)for(let y=0;y<h;y+=2){take(x,y);take(w-1-x,y)}
  const mean=[0,0,0];for(const s of samples){mean[0]+=s[0];mean[1]+=s[1];mean[2]+=s[2]}mean[0]/=samples.length;mean[1]/=samples.length;mean[2]/=samples.length;
  let variance=0;for(const s of samples){const dr=s[0]-mean[0],dg=s[1]-mean[1],db=s[2]-mean[2];variance+=(dr*dr+dg*dg+db*db)/3}variance/=samples.length;
  return {mean,sd:Math.sqrt(variance)};
}
function alphaAudit(d,w,h){
  let opaque=0,edgeTransparent=0,edgeCount=0,minX=w,minY=h,maxX=-1,maxY=-1;const band=Math.max(2,Math.round(Math.min(w,h)*.025));
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const a=d[(y*w+x)*4+3];if(a>24){opaque++;if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y}if(x<band||x>=w-band||y<band||y>=h-band){edgeCount++;if(a<24)edgeTransparent++}}
  const total=w*h,boxW=maxX>=minX?maxX-minX+1:0,boxH=maxY>=minY?maxY-minY+1:0;return {opaqueRatio:opaque/total,edgeClear:edgeCount?edgeTransparent/edgeCount:0,boxW,boxH,boxRatio:boxW*boxH/total};
}
async function cutout(src,kind="avatar"){
  if(!src)return null;const key=`safe-cutout:${kind}:${src}`;if(memory.has(key))return memory.get(key);
  const img=await imageLoad(src),maxW=720,maxH=1080,scale=Math.min(1,maxW/img.naturalWidth,maxH/img.naturalHeight),w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
  const c=document.createElement("canvas");c.width=w;c.height=h;const ctx=c.getContext("2d",{willReadFrequently:true});ctx.drawImage(img,0,0,w,h);const frame=ctx.getImageData(0,0,w,h),d=frame.data,bg=borderStats(d,w,h),count=w*h,seen=new Uint8Array(count),q=new Int32Array(count);let head=0,tail=0;
  // Conservative flood-fill. A faint studio halo is safer than deleting faces, hands, sleeves or fur.
  const base=kind==="pet"?28:30,threshold=clamp(base+bg.sd*.35,24,40),threshold2=threshold*threshold;
  const near=i=>{const p=i*4,dr=d[p]-bg.mean[0],dg=d[p+1]-bg.mean[1],db=d[p+2]-bg.mean[2];return dr*dr+dg*dg+db*db<threshold2};
  const push=i=>{if(i<0||i>=count||seen[i]||!near(i))return;seen[i]=1;q[tail++]=i};
  for(let x=0;x<w;x++){push(x);push((h-1)*w+x)}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1)}
  while(head<tail){const i=q[head++],x=i%w;d[i*4+3]=0;if(x>0)push(i-1);if(x<w-1)push(i+1);if(i>=w)push(i-w);if(i<count-w)push(i+w)}
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(!seen[i])continue;let touchesSubject=false;for(const n of [i-1,i+1,i-w,i+w])if(!seen[n]){touchesSubject=true;break}if(touchesSubject)d[i*4+3]=Math.min(d[i*4+3],72)}
  const audit=alphaAudit(d,w,h),minOpaque=kind==="pet"?.025:.055,maxOpaque=kind==="pet"?.62:.56;
  if(audit.opaqueRatio<minOpaque||audit.opaqueRatio>maxOpaque||audit.edgeClear<.55||audit.boxH<h*.30)throw new Error(`unsafe cutout ${JSON.stringify(audit)}`);
  ctx.putImageData(frame,0,0);const out=c.toDataURL("image/png");memory.set(key,out);return out;
}
function fit(img,kind="avatar"){
  if(!img)return;img.style.objectFit="contain";img.style.objectPosition="50% 100%";
  if(kind==="avatar"){img.style.width="154px";img.style.height="238px";img.style.inset="0 -18px 0 -18px"}else{img.style.width="118px";img.style.height="94px";img.style.inset="-7px -12px -7px -12px"}
}
async function enhanceAvatar(){
  let src=null;try{src=selectedAvatar||null}catch{}
  const a=byId("avatar"),img=byId("avatarFull");if(!a||!img||!src)return false;
  if(src===lastAvatarSource&&lastAvatarCutout){img.src=lastAvatarCutout;fit(img,"avatar");a.classList.add("ai");return true}
  lastAvatarSource=src;
  try{const out=await cutout(src,"avatar");if(!out)throw new Error("empty avatar cutout");lastAvatarCutout=out;img.src=out;fit(img,"avatar");a.classList.add("ai");return true}
  catch(e){console.warn("avatar cutout rejected",e);if(lastAvatarCutout){img.src=lastAvatarCutout;fit(img,"avatar");a.classList.add("ai");return true}img.removeAttribute("src");a.classList.remove("ai");return false}
}
async function restoreMasterVisual(){return enhanceAvatar()}
async function ensureAsset(payload){
  const key=JSON.stringify(payload);if(memory.has("asset:"+key))return memory.get("asset:"+key);
  const p=(async()=>{let lastError=new Error("비주얼 생성 실패");for(let attempt=1;attempt<=2;attempt++){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),85000);try{const r=await fetch("/api/visual/ensure",{method:"POST",cache:"no-store",signal:controller.signal,headers:auth({"content-type":"application/json"}),body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok||!d.ok||!d.url)throw new Error(d.error||`visual ${r.status}`);return d.url}catch(e){lastError=e?.name==="AbortError"?new Error("비주얼 생성 시간이 길어 자동으로 다시 시도합니다."):e;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,1200))}finally{clearTimeout(timer)}}throw lastError})();
  memory.set("asset:"+key,p);try{return await p}catch(e){memory.delete("asset:"+key);throw e}
}
async function enhanceRoom(){const room=byId("room"),img=byId("roomArt");if(!room||!img)return;let level=1,time="morning";try{level=roomLevel||1;time=currentTime||"morning"}catch{}const url=await ensureAsset({type:"room",roomStyle:normalizeStyle(),level,time});if(img.src!==new URL(url,location.href).href){await imageLoad(url);img.src=url}room.classList.add("visual17","hasArt")}
async function enhancePet(){
  const pet=byId("pet"),img=byId("petAsset"),room=byId("room");if(!pet||!img)return false;let kind="dog",mode="댕댕이형";try{kind=petKind||kind;mode=petMode||mode}catch{}
  try{const url=await ensureAsset({type:"pet",petKind:kind,petMode:mode}),source=await cutout(url,"pet");if(!source)throw new Error("empty pet cutout");lastPetCutout=source;img.src=source;fit(img,"pet");pet.classList.add("assetMode");if(room)room.classList.add("visual17");return true}
  catch(e){console.warn("pet cutout rejected",e);if(lastPetCutout){img.src=lastPetCutout;fit(img,"pet");pet.classList.add("assetMode");return true}img.removeAttribute("src");pet.classList.remove("assetMode");return false}
}
async function applyVisual(){addStyle();setMood();const room=byId("room");if(room)room.classList.add("visual17");await enhanceAvatar();const key=styleKey();if(visualBusy&&key===lastSceneKey)return;lastSceneKey=key;visualBusy=true;try{await enhanceRoom();await enhancePet();setMood()}catch(e){console.warn("visual-v17 fallback",e)}finally{visualBusy=false}}
function wrap(name,after){const old=window[name];if(typeof old!=="function"||old.__visual17)return;const fn=function(){const r=old.apply(this,arguments);Promise.resolve(r).finally(()=>after());return r};fn.__visual17=true;window[name]=fn}
function install(){
  addStyle();wrap("applyHome",()=>setTimeout(applyVisual,0));wrap("applySceneAssets",()=>setTimeout(applyVisual,0));wrap("setTime",()=>setTimeout(applyVisual,0));wrap("setDay",()=>setTimeout(()=>{setMood();applyVisual()},0));wrap("renderPetModes",()=>setTimeout(applyVisual,0));setTimeout(applyVisual,30);
  window.applyVisualV17=applyVisual;window.visual17Cutout=cutout;window.visual17FitActor=fit;window.visual17RestoreMaster=restoreMasterVisual;window.visual17GetMasterCutout=()=>lastAvatarCutout;window.visual17GetPetCutout=()=>lastPetCutout;
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();
