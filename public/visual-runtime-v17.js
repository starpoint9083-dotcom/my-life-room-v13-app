(()=>{
"use strict";
const byId=id=>document.getElementById(id);
const memory=new Map();
let visualBusy=false,lastSceneKey="",lastAvatarSource="",lastAvatarCutout="";

function addStyle(){
  if(byId("visual17Style"))return;
  const s=document.createElement("style");s.id="visual17Style";s.textContent=`
  .room.visual17{background:#e8dfd2;isolation:isolate}
  .room.visual17 .roomArt{display:block;object-fit:cover;object-position:center center;filter:saturate(.96) contrast(1.025);animation:v17fade .55s ease both}
  .room.visual17.hasArt .window,.room.visual17.hasArt .rug,.room.visual17.hasArt .sofa,.room.visual17.hasArt .table{display:none}
  .room.visual17.hasArt .plant{opacity:0;pointer-events:auto}
  .room.visual17 .assetBadge{display:none}
  .room.visual17 .avatar{left:52%;bottom:91px;width:118px;height:238px;transform:translateX(-50%);z-index:18}
  .room.visual17 .avatar.away{opacity:0;transform:translate(90px,0) scale(.92)}
  .room.visual17 .avatar.ai .avatarFull{display:block;inset:-6px -22px -5px -22px;width:162px;height:248px;object-fit:contain;object-position:50% 100%;filter:drop-shadow(0 9px 7px rgba(33,25,20,.28))}
  .room.visual17 .pet{left:22%;bottom:71px;width:94px;height:79px;background:transparent!important;border-radius:0;z-index:19;filter:none}
  .room.visual17 .pet:before,.room.visual17 .pet:after{display:none!important}
  .room.visual17 .pet.assetMode .petAsset{display:block;inset:-11px -16px -9px -16px;width:126px;height:101px;object-fit:contain;object-position:50% 100%;filter:drop-shadow(0 7px 5px rgba(38,28,20,.25));animation:v17pet .45s ease both}
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
function auth(extra={}){
  try{return typeof authHeaders==="function"?authHeaders(extra):extra}catch{return extra}
}
function styleKey(){
  try{return [roomStyle||"warm",roomLevel||1,currentTime||"morning",petKind||"dog",petMode||"댕댕이형"].join("|")}catch{return "warm|1|morning|dog|댕댕이형"}
}
function normalizeStyle(){
  try{return roomStyle==="modern"?"modern":roomStyle==="cozy"?"cozy":"warm"}catch{return "warm"}
}
function getDay(){try{return day||"success"}catch{return "success"}}
function setMood(){
  const room=byId("room");if(!room)return;
  room.classList.remove("visual-success","visual-reduce","visual-slip","pet-affection","pet-boss","pet-steady","pet-playful");
  const d=getDay();room.classList.add(d==="slip"?"visual-slip":d==="reduce"?"visual-reduce":"visual-success");
  let mode="";try{mode=petMode||""}catch{}
  if(mode==="개냥이형")room.classList.add("pet-affection");
  else if(mode==="집사취급형")room.classList.add("pet-boss");
  else if(mode==="듬직이형")room.classList.add("pet-steady");
  else room.classList.add("pet-playful");
}
function imageLoad(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src})}
function avgCorner(data,w,h){
  const pts=[];const n=7;
  for(const [ox,oy] of [[0,0],[w-n,0],[0,h-n],[w-n,h-n]]){
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const i=((oy+y)*w+(ox+x))*4;pts.push([data[i],data[i+1],data[i+2]]);
    }
  }
  const sum=pts.reduce((a,p)=>[a[0]+p[0],a[1]+p[1],a[2]+p[2]],[0,0,0]);
  return sum.map(v=>v/pts.length);
}
async function cutout(src){
  if(!src)return src;if(memory.has(src))return memory.get(src);
  const img=await imageLoad(src);const maxW=720,maxH=1080,scale=Math.min(1,maxW/img.naturalWidth,maxH/img.naturalHeight);
  const w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
  const c=document.createElement("canvas");c.width=w;c.height=h;const ctx=c.getContext("2d",{willReadFrequently:true});ctx.drawImage(img,0,0,w,h);
  const frame=ctx.getImageData(0,0,w,h),d=frame.data,bg=avgCorner(d,w,h),count=w*h;
  const seen=new Uint8Array(count),q=new Int32Array(count);let head=0,tail=0;
  const near=i=>{const p=i*4,dr=d[p]-bg[0],dg=d[p+1]-bg[1],db=d[p+2]-bg[2];return dr*dr+dg*dg+db*db<6400};
  const push=i=>{if(i<0||i>=count||seen[i]||!near(i))return;seen[i]=1;q[tail++]=i};
  for(let x=0;x<w;x++){push(x);push((h-1)*w+x)}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1)}
  while(head<tail){const i=q[head++],x=i%w;d[i*4+3]=0;if(x>0)push(i-1);if(x<w-1)push(i+1);if(i>=w)push(i-w);if(i<count-w)push(i+w)}
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
    const i=y*w+x;if(seen[i])continue;
    const adjacent=seen[i-1]||seen[i+1]||seen[i-w]||seen[i+w];if(!adjacent)continue;
    const p=i*4,dr=d[p]-bg[0],dg=d[p+1]-bg[1],db=d[p+2]-bg[2],dist=Math.sqrt(dr*dr+dg*dg+db*db);
    if(dist<105)d[p+3]=Math.min(d[p+3],Math.max(35,Math.round((dist-70)/35*255)));
  }
  ctx.putImageData(frame,0,0);const out=c.toDataURL("image/png");memory.set(src,out);return out;
}
async function enhanceAvatar(){
  let src=null;try{src=selectedAvatar||null}catch{}
  const a=byId("avatar"),img=byId("avatarFull");if(!a||!img||!src)return;
  if(src===lastAvatarSource&&lastAvatarCutout){img.src=lastAvatarCutout;a.classList.add("ai");return}
  lastAvatarSource=src;
  try{lastAvatarCutout=await cutout(src);img.src=lastAvatarCutout;a.classList.add("ai")}catch{img.src=src;a.classList.add("ai")}
}
async function ensureAsset(payload){
  const key=JSON.stringify(payload);if(memory.has("asset:"+key))return memory.get("asset:"+key);
  const p=(async()=>{const r=await fetch("/api/visual/ensure",{method:"POST",cache:"no-store",headers:auth({"content-type":"application/json"}),body:JSON.stringify(payload)});const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok||!d.url)throw new Error(d.error||`visual ${r.status}`);return d.url})();
  memory.set("asset:"+key,p);try{return await p}catch(e){memory.delete("asset:"+key);throw e}
}
async function enhanceRoom(){
  const room=byId("room"),img=byId("roomArt");if(!room||!img)return;
  let level=1,time="morning";try{level=roomLevel||1;time=currentTime||"morning"}catch{}
  const url=await ensureAsset({type:"room",roomStyle:normalizeStyle(),level,time});
  if(img.src!==new URL(url,location.href).href){await imageLoad(url);img.src=url}
  room.classList.add("visual17","hasArt");
}
async function enhancePet(){
  const pet=byId("pet"),img=byId("petAsset"),room=byId("room");if(!pet||!img)return;
  let kind="dog",mode="댕댕이형";try{kind=petKind||kind;mode=petMode||mode}catch{}
  const url=await ensureAsset({type:"pet",petKind:kind,petMode:mode});
  let source=url;try{source=await cutout(url)}catch{}
  img.src=source;pet.classList.add("assetMode");if(room)room.classList.add("visual17");
}
async function applyVisual(){
  addStyle();setMood();const room=byId("room");if(room)room.classList.add("visual17");
  await enhanceAvatar();
  const key=styleKey();if(visualBusy&&key===lastSceneKey)return;lastSceneKey=key;visualBusy=true;
  try{await enhanceRoom();await enhancePet();setMood()}catch(e){console.warn("visual-v17 fallback",e)}finally{visualBusy=false}
}
function wrap(name,after){
  const old=window[name];if(typeof old!=="function"||old.__visual17)return;
  const fn=function(){const r=old.apply(this,arguments);Promise.resolve(r).finally(()=>after());return r};fn.__visual17=true;window[name]=fn;
}
function install(){
  addStyle();
  wrap("applyHome",()=>setTimeout(applyVisual,0));
  wrap("applySceneAssets",()=>setTimeout(applyVisual,0));
  wrap("setTime",()=>setTimeout(applyVisual,0));
  wrap("setDay",()=>setTimeout(()=>{setMood();applyVisual()},0));
  wrap("renderPetModes",()=>setTimeout(applyVisual,0));
  setTimeout(applyVisual,30);
  window.applyVisualV17=applyVisual;
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();
