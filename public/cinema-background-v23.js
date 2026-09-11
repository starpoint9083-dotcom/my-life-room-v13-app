(()=>{
"use strict";
const JOB_KEY="myroomCinemaV23BackgroundJob";
const QC_JOB_KEY="myroomCinemaV23VisualQcJob";
let polling=null,qcPolling=null,lastReady=-1;
const byId=id=>document.getElementById(id);
function auth(extra={}){try{return typeof authHeaders==="function"?authHeaders(extra):extra}catch{return extra}}
function ctx(){let roomStyle="warm",petKind="dog",petMode="댕댕이형";try{roomStyle=window.roomStyle||roomStyle}catch{}try{petKind=window.petKind||petKind}catch{}try{petMode=window.petMode||petMode}catch{}return {roomStyle,petKind,petMode}}
function jobId(){try{return localStorage.getItem(JOB_KEY)||""}catch{return ""}}
function saveJob(id){try{id?localStorage.setItem(JOB_KEY,id):localStorage.removeItem(JOB_KEY)}catch{}}
function qcJobId(){try{return localStorage.getItem(QC_JOB_KEY)||""}catch{return ""}}
function saveQcJob(id){try{id?localStorage.setItem(QC_JOB_KEY,id):localStorage.removeItem(QC_JOB_KEY)}catch{}}
function progressEl(){return document.querySelector("#cinema23Setup .cinema23Progress")}
function generateBtn(){return byId("cinema23Generate")}
function qcBtn(){return byId("cinema23VisualQc")}
function qcProgress(){return byId("cinema23VisualQcProgress")}
function paint(text,{done=false,error=false}={}){const p=progressEl();if(p)p.textContent=text;const b=generateBtn();if(b){b.disabled=!error;b.textContent=done?"시험영상 9개 준비 완료":error?"서버 생성 다시 시작":"서버에서 생성 중 · 화면 닫아도 됩니다"}}
function paintQc(text,{done=false,error=false}={}){ensureQcUi();const p=qcProgress();if(p)p.textContent=text;const b=qcBtn();if(b){b.disabled=!error&&!done;b.textContent=done?"시각검사 완료":error?"시각검사 다시 실행 (비용 발생)":"시각검사 진행 중 · 화면 닫아도 됩니다"}}
function localAvatar(){
  try{if(typeof selectedAvatar!=="undefined"&&selectedAvatar)return selectedAvatar}catch{}
  try{if(typeof photoData!=="undefined"&&photoData)return photoData}catch{}
  try{const s=JSON.parse(localStorage.getItem("myroomV13")||"{}");if(s?.selectedAvatar)return s.selectedAvatar;if(s?.photoData)return s.photoData}catch{}
  try{for(const sel of [".avatarFull",".avatarAsset",".avatarPhoto img"]){const src=document.querySelector(sel)?.src;if(src&&/^(data:|blob:|https?:)/i.test(src))return src}}catch{}
  return null
}
function credentials(){try{return {id:localStorage.getItem("myroomDeviceId")||"",token:localStorage.getItem("myroomDeviceToken")||""}}catch{return {id:"",token:""}}}
async function ensureServerAvatar(){
  let probe=null;
  try{const r=await fetch("/api/cinema/status",{headers:auth(),cache:"no-store"});probe=await r.json().catch(()=>({}));if(r.ok&&probe.ok)return true;if(r.status!==409&&!String(probe?.error||"").includes("본캐"))throw new Error(probe?.error||`본캐 확인 실패 (${r.status})`)}catch(e){if(!String(e?.message||"").includes("본캐"))throw e}
  const dataUrl=localAvatar();if(!dataUrl)throw new Error("현재 선택된 본캐 원본이나 원본 사진을 휴대폰에서 찾지 못했습니다.");
  const {id,token}=credentials();if(!id||!token)throw new Error("기기 인증정보를 찾지 못했습니다.");
  const blob=await (await fetch(dataUrl)).blob();
  const fd=new FormData();fd.append("image",blob,"master.jpg");let style="나답게";try{if(typeof charStyle!=="undefined"&&charStyle)style=charStyle}catch{}fd.append("style",style);fd.append("device_id",id);fd.append("device_token",token);
  const r=await fetch("/api/avatar/save",{method:"POST",body:fd,cache:"no-store"}),d=await r.json().catch(()=>({}));if(!r.ok||!d.ok||!d.stored)throw new Error(d.error||d.reason||`본캐 서버 저장 실패 (${r.status})`);
  try{localStorage.setItem("myroomAvatarKey",d.key)}catch{}try{if(typeof scheduleServerSync==="function")scheduleServerSync("cinema-avatar-recovered")}catch{}
  const check=await fetch("/api/cinema/status",{headers:auth(),cache:"no-store"}),cd=await check.json().catch(()=>({}));if(!check.ok||!cd.ok)throw new Error(cd.error||"본캐 복구 확인에 실패했습니다.");return true
}
async function readyCount(){try{const r=await fetch("/api/cinema/status",{headers:auth(),cache:"no-store"}),d=await r.json();if(r.ok&&d.ok)return Number(d.ready||0)}catch{}return lastReady<0?0:lastReady}
async function pollOnce(){const id=jobId();if(!id)return false;let d;try{const r=await fetch(`/api/cinema/batch/status?id=${encodeURIComponent(id)}`,{headers:auth(),cache:"no-store"});d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||`status ${r.status}`)}catch(e){paint("서버 작업 상태를 다시 확인하는 중…");return true}const ready=await readyCount();lastReady=ready;if(d.status==="complete"){saveJob("");paint(`완료 · ${ready}/9개 영화 클립 준비됨`,{done:ready>=9,error:ready<9});clearInterval(polling);polling=null;try{window.cinemaV23?.refresh?.(true)}catch{}setTimeout(ensureQcUi,300);if(ready>=9){try{navigator.vibrate?.([100,70,160])}catch{}try{if(Notification.permission==="granted")new Notification("Cinema Room 준비 완료",{body:"9개 영화 클립이 모두 준비됐습니다."})}catch{}}return false}if(d.status==="errored"||d.status==="terminated"){saveJob("");paint(`서버 작업 중단 · ${ready}/9개까지 보존됨. 다시 누르면 없는 영상만 이어서 만듭니다.`,{error:true});clearInterval(polling);polling=null;return false}paint(`서버에서 생성 중 · ${ready}/9개 준비됨 · 화면을 닫아도 계속됩니다.`);return true}
function startPolling(){clearInterval(polling);pollOnce();polling=setInterval(pollOnce,7000)}
async function startBackground(){if(!window.confirm("Cinema Room 시험영상 생성에는 Cloudflare AI 비용이 발생할 수 있습니다. 서버가 빠진 영상만 끝까지 생성하도록 시작할까요?"))return;const b=generateBtn();if(b){b.disabled=true;b.textContent="본캐 서버 연결 확인 중…"}try{await ensureServerAvatar();if(b)b.textContent="서버 작업 시작 중…";const r=await fetch("/api/cinema/batch/start",{method:"POST",headers:auth({"content-type":"application/json"}),body:JSON.stringify({...ctx(),confirm_cost:true})}),d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||`start ${r.status}`);saveJob(d.id);paint("서버 작업을 시작했습니다. 이제 이 화면을 닫아도 됩니다.");startPolling()}catch(e){paint(`서버 작업 시작 실패 · ${e.message}`,{error:true})}}
function ensureQcUi(){const host=byId("cinema23Setup");if(!host)return;let ready=0;try{ready=Number(window.cinemaV23?.ready?.()||0)}catch{}if(ready<9)return;if(byId("cinema23VisualQc"))return;const wrap=document.createElement("div");wrap.id="cinema23VisualQcWrap";wrap.style.cssText="margin-top:10px;padding-top:9px;border-top:1px solid #333";wrap.innerHTML='<div id="cinema23VisualQcProgress" style="color:#ddd;line-height:1.45">9개 기준 프레임 시각검사 대기</div><button id="cinema23VisualQc" style="width:100%;border:0;border-radius:12px;padding:11px;margin-top:8px;font-weight:800">유료 시각검사 시작 (9장)</button><div style="margin-top:5px;color:#bbb">※ 영상 재생성은 하지 않고 검사만 합니다.</div>';host.appendChild(wrap);if(qcJobId())startQcPolling();else refreshQcPublic().catch(()=>{})}
async function refreshQcPublic(){ensureQcUi();try{const r=await fetch("/api/cinema/batch/visual-qc/latest-public",{cache:"no-store"}),d=await r.json();if(!r.ok||!d.ok)return null;const p=qcProgress(),b=qcBtn();if(d.status==="complete"&&d.complete===true){if(p)p.textContent=`완료 · ${d.scoredCount??d.ready}/9 점수화 · 시각점수 ${d.visualScore}점 · 재검토 ${d.candidates?.length||0}개`;if(b){b.disabled=true;b.textContent="시각검사 완료"}}else if(d.status==="error"){if(p)p.textContent=`검사기 오류 · ${d.scoredCount||0}/9 점수화 · 영상 재생성 판정 없음`;if(b){b.disabled=false;b.textContent="시각검사 다시 실행 (비용 발생)"}}else if(d.status==="running"||d.status==="queued"){if(p)p.textContent=`시각검사 중 · ${d.ready||0}/9 · 점수화 ${d.scoredCount||0}개`;if(b){b.disabled=true;b.textContent="시각검사 진행 중 · 화면 닫아도 됩니다"}}return d}catch{return null}}
async function pollQcOnce(){const id=qcJobId();if(!id){await refreshQcPublic();return false}let job=null;try{const r=await fetch(`/api/cinema/batch/status?id=${encodeURIComponent(id)}`,{headers:auth(),cache:"no-store"});job=await r.json();if(!r.ok||!job.ok)throw new Error(job.error||`status ${r.status}`)}catch(e){paintQc("시각검사 서버 상태를 다시 확인하는 중…");return true}const q=await refreshQcPublic();if(job.status==="complete"){saveQcJob("");clearInterval(qcPolling);qcPolling=null;if(q?.status==="error")paintQc(`검사기 오류 · ${q?.scoredCount||0}/9 점수화 · 영상은 재생성하지 않았습니다.`,{error:true});else paintQc(`완료 · ${q?.scoredCount??q?.ready??9}/9 점수화 · 시각점수 ${q?.visualScore??"-"}점 · 재검토 ${q?.candidates?.length||0}개`,{done:true});return false}if(job.status==="errored"||job.status==="terminated"){saveQcJob("");clearInterval(qcPolling);qcPolling=null;paintQc(`시각검사 중단 · ${q?.scoredCount||0}/9 점수화`,{error:true});return false}paintQc(`시각검사 중 · ${q?.ready||0}/9 · 점수화 ${q?.scoredCount||0}개`);return true}
function startQcPolling(){clearInterval(qcPolling);pollQcOnce();qcPolling=setInterval(pollQcOnce,7000)}
async function startVisualQc(){if(!window.confirm("완성된 9개 Cinema 기준 프레임을 Workers AI가 시각검사합니다. AI 사용 비용이 발생할 수 있습니다. 검사를 다시 시작할까요?"))return;ensureQcUi();const b=qcBtn();if(b){b.disabled=true;b.textContent="시각검사 시작 중…"}try{const r=await fetch("/api/cinema/batch/visual-qc/start",{method:"POST",headers:auth({"content-type":"application/json"}),body:JSON.stringify({confirm_cost:true})}),d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||`visual qc ${r.status}`);saveQcJob(d.id);paintQc("유료 시각검사를 시작했습니다. 이제 화면을 닫아도 됩니다.");startQcPolling()}catch(e){paintQc(`시각검사 시작 실패 · ${e.message}`,{error:true})}}
function intercept(e){const el=e.target instanceof Element?e.target.closest("#cinema23Generate,#cinema23VisualQc"):null;if(!el)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(el.id==="cinema23VisualQc")startVisualQc();else startBackground()}
function watchButton(){const obs=new MutationObserver(()=>{const b=generateBtn();if(b&&jobId()&&!b.disabled){b.textContent="서버 작업 상태 확인 중…";b.disabled=true;startPolling()}ensureQcUi()});obs.observe(document.documentElement,{childList:true,subtree:true});if(jobId())setTimeout(startPolling,800);setTimeout(ensureQcUi,900)}
document.addEventListener("click",intercept,true);
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",watchButton,{once:true});else watchButton();
window.cinemaBackgroundV23={start:startBackground,status:pollOnce,job:jobId,startVisualQc,visualQcStatus:pollQcOnce,visualQcJob:qcJobId};
})();