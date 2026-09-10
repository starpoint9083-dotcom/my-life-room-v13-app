(()=>{
"use strict";
const byId=id=>document.getElementById(id);
const cache=new Map();
function loadImage(src){return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src})}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function statsBorder(d,w,h){
  const samples=[];const band=Math.max(2,Math.round(Math.min(w,h)*.018));
  const take=(x,y)=>{const p=(y*w+x)*4;samples.push([d[p],d[p+1],d[p+2]])};
  for(let y=0;y<band;y++)for(let x=0;x<w;x+=2){take(x,y);take(x,h-1-y)}
  for(let x=0;x<band;x++)for(let y=0;y<h;y+=2){take(x,y);take(w-1-x,y)}
  const mean=[0,0,0];for(const s of samples){mean[0]+=s[0];mean[1]+=s[1];mean[2]+=s[2]}
  mean[0]/=samples.length;mean[1]/=samples.length;mean[2]/=samples.length;
  let variance=0;for(const s of samples){const dr=s[0]-mean[0],dg=s[1]-mean[1],db=s[2]-mean[2];variance+=(dr*dr+dg*dg+db*db)/3}variance/=samples.length;
  return {mean,sd:Math.sqrt(variance)};
}
function alphaAudit(d,w,h){
  let opaque=0,transparent=0,edgeTransparent=0,edgeCount=0,minX=w,minY=h,maxX=-1,maxY=-1;
  const band=Math.max(2,Math.round(Math.min(w,h)*.025));
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const a=d[(y*w+x)*4+3];
    if(a>24){opaque++;if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y}else transparent++;
    if(x<band||x>=w-band||y<band||y>=h-band){edgeCount++;if(a<24)edgeTransparent++}
  }
  const total=w*h,opaqueRatio=opaque/total,edgeClear=edgeCount?edgeTransparent/edgeCount:0;
  const boxW=maxX>=minX?maxX-minX+1:0,boxH=maxY>=minY?maxY-minY+1:0;
  return {opaqueRatio,edgeClear,boxW,boxH,boxRatio:boxW*boxH/total};
}
async function safeCutout(src,kind="avatar"){
  if(!src)return null;const key=kind+"|"+src;if(cache.has(key))return cache.get(key);
  const img=await loadImage(src),maxW=720,maxH=1080,scale=Math.min(1,maxW/img.naturalWidth,maxH/img.naturalHeight),w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
  const c=document.createElement("canvas");c.width=w;c.height=h;const ctx=c.getContext("2d",{willReadFrequently:true});ctx.drawImage(img,0,0,w,h);
  const frame=ctx.getImageData(0,0,w,h),d=frame.data,bg=statsBorder(d,w,h),count=w*h;
  const seen=new Uint8Array(count),q=new Int32Array(count);let head=0,tail=0;
  const base=kind==="pet"?30:34,threshold=clamp(base+bg.sd*.45,26,46),threshold2=threshold*threshold*3;
  const near=i=>{const p=i*4,dr=d[p]-bg.mean[0],dg=d[p+1]-bg.mean[1],db=d[p+2]-bg.mean[2];return dr*dr+dg*dg+db*db<threshold2};
  const push=i=>{if(i<0||i>=count||seen[i]||!near(i))return;seen[i]=1;q[tail++]=i};
  for(let x=0;x<w;x++){push(x);push((h-1)*w+x)}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1)}
  while(head<tail){const i=q[head++],x=i%w;d[i*4+3]=0;if(x>0)push(i-1);if(x<w-1)push(i+1);if(i>=w)push(i-w);if(i<count-w)push(i+w)}
  // Feather only immediately outside the subject edge; never erode interior pixels.
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
    const i=y*w+x;if(!seen[i])continue;let neighborSubject=false;for(const n of [i-1,i+1,i-w,i+w])if(!seen[n]){neighborSubject=true;break}if(!neighborSubject)continue;
    const p=i*4;d[p+3]=Math.min(d[p+3],80);
  }
  const audit=alphaAudit(d,w,h);
  const minOpaque=kind==="pet"?.025:.055,maxOpaque=kind==="pet"?.58:.52,minEdge=.58;
  if(audit.opaqueRatio<minOpaque||audit.opaqueRatio>maxOpaque||audit.edgeClear<minEdge||audit.boxH<h*.30){throw new Error(`unsafe cutout ${JSON.stringify(audit)}`)}
  ctx.putImageData(frame,0,0);const out=c.toDataURL("image/png");cache.set(key,out);return out;
}
function fitActor(img,kind="avatar"){
  if(!img)return;img.style.objectFit="contain";img.style.objectPosition="50% 100%";
  if(kind==="avatar"){img.style.width="154px";img.style.height="238px";img.style.inset="0 -18px 0 -18px"}
  else{img.style.width="118px";img.style.height="94px";img.style.inset="-7px -12px -7px -12px"}
}
function install(){
  window.visualIntegrityV22={safeCutout,fitActor};
  window.visual17Cutout=safeCutout;
  window.visual17FitActor=fitActor;
  const style=document.createElement("style");style.id="visualIntegrityV22Style";style.textContent=`
    .room.visual17 .avatar.ai .avatarFull{object-fit:contain!important;object-position:50% 100%!important;max-width:none!important;background:transparent!important}
    .room.visual17 .pet.assetMode .petAsset{object-fit:contain!important;object-position:50% 100%!important;background:transparent!important}
    .room.visual17 .avatar{overflow:visible}
    .room.visual17 .pet{overflow:visible}
  `;if(!byId(style.id))document.head.appendChild(style);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();
