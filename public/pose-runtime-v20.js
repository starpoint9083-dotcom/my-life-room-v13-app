(()=>{
"use strict";
const POSES=["window","pet","relax","stretch"],labels={window:"창밖을 바라봐요",pet:"펫을 바라보며 몸을 낮춰요",relax:"편안하게 자세를 풀어요",stretch:"가볍게 스트레칭해요"};
const cache=new Map();let loading=false,timer=null,lastPose="";
const byId=id=>document.getElementById(id);
function auth(extra={}){try{return typeof authHeaders==="function"?authHeaders(extra):extra}catch{return extra}}
function ready(){try{return Boolean(storageGet("myroomAvatarKey"))}catch{return Boolean(localStorage.getItem("myroomAvatarKey"))}}
function imageLoad(src){return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src})}
function bgCorner(data,w,h){const pts=[],n=6;for(const [ox,oy] of [[0,0],[w-n,0],[0,h-n],[w-n,h-n]])for(let y=0;y<n;y++)for(let x=0;x<n;x++){const p=((oy+y)*w+ox+x)*4;pts.push([data[p],data[p+1],data[p+2]])}const sum=pts.reduce((a,p)=>[a[0]+p[0],a[1]+p[1],a[2]+p[2]],[0,0,0]);return sum.map(v=>v/pts.length)}
async function cutout(src){
 const img=await imageLoad(src),maxW=700,maxH=1050,scale=Math.min(1,maxW/img.naturalWidth,maxH/img.naturalHeight),w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale)),c=document.createElement("canvas");c.width=w;c.height=h;const ctx=c.getContext("2d",{willReadFrequently:true});ctx.drawImage(img,0,0,w,h);const frame=ctx.getImageData(0,0,w,h),d=frame.data,bg=bgCorner(d,w,h),count=w*h,seen=new Uint8Array(count),q=new Int32Array(count);let head=0,tail=0;const near=i=>{const p=i*4,dr=d[p]-bg[0],dg=d[p+1]-bg[1],db=d[p+2]-bg[2];return dr*dr+dg*dg+db*db<7200},push=i=>{if(i<0||i>=count||seen[i]||!near(i))return;seen[i]=1;q[tail++]=i};for(let x=0;x<w;x++){push(x);push((h-1)*w+x)}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1)}while(head<tail){const i=q[head++],x=i%w;d[i*4+3]=0;if(x>0)push(i-1);if(x<w-1)push(i+1);if(i>=w)push(i-w);if(i<count-w)push(i+w)}ctx.putImageData(frame,0,0);return c.toDataURL("image/png")
}
async function ensurePose(pose){
 if(cache.has(pose))return cache.get(pose);if(!ready())throw new Error("master avatar not saved");
 const r=await fetch("/api/avatar/pose",{method:"POST",cache:"no-store",headers:auth({"content-type":"application/json"}),body:JSON.stringify({pose})}),d=await r.json().catch(()=>({}));if(!r.ok||!d.ok||!d.key)throw new Error(d.error||`pose ${r.status}`);
 const f=await fetch(`/api/avatar/pose/file?key=${encodeURIComponent(d.key)}`,{headers:auth(),cache:"force-cache"});if(!f.ok)throw new Error(`pose file ${f.status}`);const blob=await f.blob(),url=URL.createObjectURL(blob);let out=url;try{out=await cutout(url);URL.revokeObjectURL(url)}catch{}cache.set(pose,out);return out
}
async function preload(){if(loading||!ready())return;loading=true;for(const p of POSES){if(cache.has(p))continue;try{await ensurePose(p)}catch(e){console.warn("pose-v20",p,e);break}await new Promise(r=>setTimeout(r,700))}loading=false}
function showPose(pose,announce=false){const src=cache.get(pose),img=byId("avatarFull"),a=byId("avatar");if(!src||!img||!a||a.classList.contains("away"))return false;img.src=src;a.classList.add("ai");lastPose=pose;if(announce)try{show("🙂 "+labels[pose])}catch{}return true}
function nextPose(announce=false){const available=POSES.filter(p=>cache.has(p)&&p!==lastPose);if(!available.length){preload();return false}return showPose(available[Math.floor(Math.random()*available.length)],announce)}
function restoreMaster(){try{const img=byId("avatarFull");if(img&&selectedAvatar){img.src=selectedAvatar;lastPose=""}}catch{}}
function wrap(name,after){const old=window[name];if(typeof old!=="function"||old.__pose20)return;const fn=function(){const r=old.apply(this,arguments);Promise.resolve(r).finally(()=>after(...arguments));return r};fn.__pose20=true;window[name]=fn}
function install(){
 wrap("avatarTap",()=>{if(!nextPose(true))try{toast("새 포즈를 준비하고 있어요.")}catch{}});
 wrap("setTime",t=>{if(t==="day"||t==="leave")return;if(cache.size)setTimeout(()=>nextPose(false),900);else preload()});
 wrap("applyHome",()=>{setTimeout(()=>{preload();if(cache.size)nextPose(false)},1200)});
 timer=setInterval(()=>{const home=byId("home"),a=byId("avatar");if(home?.classList.contains("active")&&!a?.classList.contains("away")){if(Math.random()<.72)nextPose(false);else restoreMaster()}},14000);
 setTimeout(preload,1800);window.poseV20={preload,nextPose,restoreMaster,cacheSize:()=>cache.size}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();