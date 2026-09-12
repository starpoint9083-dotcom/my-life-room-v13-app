(()=>{
"use strict";
const SLOTS=["base-morning","base-evening","base-night","state-success","state-steady","state-recovery","action-avatar","action-pet","action-room"];
const JOB_KEY="myroomCinemaV23MotionQcJob";
let polling=null,wakeLock=null,installTimer=null;
const byId=id=>document.getElementById(id);
function auth(extra={}){try{return typeof authHeaders==="function"?authHeaders(extra):extra}catch{return extra}}
function jobId(){try{return localStorage.getItem(JOB_KEY)||""}catch{return ""}}
function saveJob(id){try{id?localStorage.setItem(JOB_KEY,id):localStorage.removeItem(JOB_KEY)}catch{}}
function host(){return byId("cinema23Setup")}
function progress(){return byId("cinema23MotionQcProgress")}
function button(){return byId("cinema23MotionQc")}
function setText(text,{done=false,error=false}={}){const p=progress();if(p)p.textContent=text;const b=button();if(b){b.disabled=!done&&!error;b.textContent=done?"모션검사 완료":error?"모션검사 다시 실행 (비용 발생)":"모션검사 진행 중"}}
async function publicVisual(){try{const r=await fetch("/api/cinema/batch/visual-qc/latest-public",{cache:"no-store"}),d=await r.json();return r.ok&&d.ok?d:null}catch{return null}}
async function publicMotion(){try{const r=await fetch("/api/cinema/batch/motion-qc/latest-public",{cache:"no-store"}),d=await r.json();return r.ok&&d.ok?d:null}catch{return null}}
async function ensureUi(){
  const h=host();if(!h)return false;
  const v=await publicVisual();if(!v||v.status!=="complete"||v.complete!==true)return false;
  if(!byId("cinema23MotionQcWrap")){
    const wrap=document.createElement("div");wrap.id="cinema23MotionQcWrap";wrap.style.cssText="margin-top:10px;padding-top:9px;border-top:1px solid #333";
    wrap.innerHTML='<div id="cinema23MotionQcProgress" style="color:#ddd;line-height:1.45">6초 영상 모션 샘플검사 대기 · 영상당 4시점 비교</div><button id="cinema23MotionQc" style="width:100%;border:0;border-radius:12px;padding:11px;margin-top:8px;font-weight:800">모션검사 시작 (비용 발생)</button><div style="margin-top:5px;color:#bbb">※ 영상은 다시 만들지 않습니다. 4시점 샘플로 얼굴·펫·몸·방·카메라 연속성을 검사합니다.</div>';
    h.appendChild(wrap);
  }
  const q=await publicMotion();
  if(q?.status==="complete"&&q.complete===true){const p=progress(),b=button();if(p)p.textContent=`완료 · ${q.scoredCount??q.ready}/9 점수화 · 모션점수 ${q.motionScore}점 · 재검토 ${q.candidates?.length||0}개`;if(b){b.disabled=true;b.textContent="모션검사 완료"}}
  else if(q?.status==="error"){setText(`모션검사 오류 · ${q.scoredCount||0}/9 점수화 · 자동 재생성 없음`,{error:true})}
  else if(q?.status==="running"||q?.status==="queued"){const p=progress(),b=button();if(p)p.textContent=`서버 모션검사 중 · ${q.ready||0}/9 · 점수화 ${q.scoredCount||0}개 · 화면 닫아도 됩니다`;if(b){b.disabled=true;b.textContent="모션검사 진행 중"}}
  return true;
}
function waitEvent(target,name,timeout=15000){return new Promise((resolve,reject)=>{let timer;const clean=()=>{clearTimeout(timer);target.removeEventListener(name,onOk);target.removeEventListener("error",onErr)};const onOk=()=>{clean();resolve()};const onErr=()=>{clean();reject(new Error(`video ${name} failed`))};target.addEventListener(name,onOk,{once:true});target.addEventListener("error",onErr,{once:true});timer=setTimeout(()=>{clean();reject(new Error(`video ${name} timed out`))},timeout)})}
async function seekVideo(video,time){const t=Math.max(0.05,Math.min(Number(video.duration||6)-0.05,time));if(Math.abs(Number(video.currentTime||0)-t)<0.03)return;const pending=waitEvent(video,"seeked",12000);video.currentTime=t;await pending}
function drawContained(ctx,video,x,y,w,h){const vw=video.videoWidth||1,vh=video.videoHeight||1,scale=Math.min(w/vw,h/vh),dw=vw*scale,dh=vh*scale,dx=x+(w-dw)/2,dy=y+(h-dh)/2;ctx.fillStyle="#151515";ctx.fillRect(x,y,w,h);ctx.drawImage(video,dx,dy,dw,dh)}
async function canvasBlob(canvas){return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("contact sheet encode failed")),"image/jpeg",0.82))}
async function captureSheet(slot){
  const r=await fetch(`/api/cinema/file?slot=${encodeURIComponent(slot)}&type=video`,{headers:auth(),cache:"no-store"});if(!r.ok)throw new Error(`${slot} 영상 읽기 실패 (${r.status})`);const blob=await r.blob(),url=URL.createObjectURL(blob),video=document.createElement("video");
  video.muted=true;video.playsInline=true;video.preload="auto";video.style.cssText="position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:.01";document.body.appendChild(video);
  try{
    const meta=waitEvent(video,"loadedmetadata",15000);video.src=url;video.load();await meta;if(!video.videoWidth||!video.videoHeight)throw new Error(`${slot} 영상 크기를 읽지 못했습니다.`);
    const canvas=document.createElement("canvas");canvas.width=720;canvas.height=720;const ctx=canvas.getContext("2d",{alpha:false});if(!ctx)throw new Error("canvas unavailable");
    const d=Number(video.duration||6),times=[Math.min(.4,d*.08),Math.min(2,d*.34),Math.min(3.8,d*.64),Math.max(.1,d-.4)],cells=[[0,0],[360,0],[0,360],[360,360]];
    for(let i=0;i<times.length;i++){await seekVideo(video,times[i]);drawContained(ctx,video,cells[i][0],cells[i][1],360,360)}
    const out=await canvasBlob(canvas);if(out.size<10000||out.size>2000000)throw new Error(`${slot} 샘플 이미지 크기 오류`);return out;
  }finally{try{video.pause()}catch{}video.remove();URL.revokeObjectURL(url)}
}
async function uploadSheet(slot,captureId,blob){const fd=new FormData();fd.append("slot",slot);fd.append("capture_id",captureId);fd.append("image",blob,`${slot}.jpg`);const r=await fetch("/api/cinema/batch/motion-qc/upload",{method:"POST",headers:auth(),body:fd,cache:"no-store"}),d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw new Error(d.error||`${slot} 샘플 업로드 실패`);return d}
async function acquireWake(){try{wakeLock=await navigator.wakeLock?.request?.("screen")}catch{wakeLock=null}}
async function releaseWake(){try{await wakeLock?.release?.()}catch{}wakeLock=null}
function makeCaptureId(){try{return `motion_${crypto.randomUUID()}`.slice(0,95)}catch{return `motion_${Date.now()}_${Math.random().toString(36).slice(2,12)}`}}
async function startMotionQc(){
  if(!window.confirm("완성된 9개 영상을 각각 4시점으로 샘플링한 뒤 Workers AI가 시간 흐름의 얼굴·펫·몸·방·카메라 연속성을 검사합니다. AI 사용 비용이 발생할 수 있습니다. 영상 재생성은 하지 않습니다. 시작할까요?"))return;
  await ensureUi();const b=button();if(b){b.disabled=true;b.textContent="영상 샘플 준비 중…"}const captureId=makeCaptureId();await acquireWake();
  try{
    for(let i=0;i<SLOTS.length;i++){const slot=SLOTS[i],p=progress();if(p)p.textContent=`영상 샘플 추출·업로드 중 · ${i+1}/9 · 잠시 화면을 유지해 주세요`;const sheet=await captureSheet(slot);await uploadSheet(slot,captureId,sheet)}
    const p=progress();if(p)p.textContent="9개 샘플 준비 완료 · 서버 모션검사 시작 중…";
    const r=await fetch("/api/cinema/batch/motion-qc/start",{method:"POST",headers:auth({"content-type":"application/json"}),body:JSON.stringify({confirm_cost:true,capture_id:captureId}),cache:"no-store"}),d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw new Error(d.error||`motion qc ${r.status}`);
    saveJob(d.id);if(p)p.textContent="서버 모션검사를 시작했습니다 · 이제 화면을 닫아도 됩니다";await releaseWake();startPolling();
  }catch(e){await releaseWake();setText(`모션검사 시작 실패 · ${e.message}`,{error:true})}
}
async function pollOnce(){
  const id=jobId();if(!id){await ensureUi();return false}let job=null;
  try{const r=await fetch(`/api/cinema/batch/status?id=${encodeURIComponent(id)}`,{headers:auth(),cache:"no-store"});job=await r.json();if(!r.ok||!job.ok)throw new Error(job.error||`status ${r.status}`)}catch{const p=progress();if(p)p.textContent="모션검사 서버 상태를 다시 확인하는 중…";return true}
  const q=await publicMotion();
  if(job.status==="complete"){saveJob("");clearInterval(polling);polling=null;if(q?.status==="complete"&&q.complete===true)setText(`완료 · ${q.scoredCount??q.ready}/9 점수화 · 모션점수 ${q.motionScore}점 · 재검토 ${q.candidates?.length||0}개`,{done:true});else setText(`모션검사 결과 확인 필요 · ${q?.scoredCount||0}/9 점수화`,{error:true});return false}
  if(job.status==="errored"||job.status==="terminated"){saveJob("");clearInterval(polling);polling=null;setText(`모션검사 중단 · ${q?.scoredCount||0}/9 점수화 · 자동 재생성 없음`,{error:true});return false}
  const p=progress(),b=button();if(p)p.textContent=`서버 모션검사 중 · ${q?.ready||0}/9 · 점수화 ${q?.scoredCount||0}개 · 화면 닫아도 됩니다`;if(b){b.disabled=true;b.textContent="모션검사 진행 중"}return true;
}
function startPolling(){clearInterval(polling);pollOnce();polling=setInterval(pollOnce,7000)}
function intercept(e){const b=e.target instanceof Element?e.target.closest("#cinema23MotionQc"):null;if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();startMotionQc()}
function install(){clearInterval(installTimer);const obs=new MutationObserver(()=>ensureUi().catch(()=>{}));obs.observe(document.documentElement,{childList:true,subtree:true});ensureUi().catch(()=>{});installTimer=setInterval(()=>ensureUi().catch(()=>{}),10000);if(jobId())setTimeout(startPolling,1000)}
document.addEventListener("click",intercept,true);if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
window.cinemaMotionQcV23={start:startMotionQc,status:pollOnce,job:jobId,refresh:ensureUi};
})();
