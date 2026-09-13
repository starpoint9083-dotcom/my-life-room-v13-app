(()=>{
"use strict";
const VERSION="v37-motion-qc";
if(!new URLSearchParams(location.search).has("motionQC"))return;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let manifest=null,index=0,items=[],busy=false,autoToken=0;
const stateKey="p2-motion-qc-v37";
function engine(){return window.masterMotionV36||null}
function saved(){try{return JSON.parse(localStorage.getItem(stateKey)||"{}")||{}}catch{return {}}}
function persist(v){try{localStorage.setItem(stateKey,JSON.stringify(v))}catch{}}
function css(){if(document.getElementById("motionQc37Style"))return;const s=document.createElement("style");s.id="motionQc37Style";s.textContent=`
#motionQc37{position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;max-width:424px;margin:auto;background:rgba(20,20,20,.94);color:#fff;border-radius:18px;padding:10px;box-shadow:0 14px 40px rgba(0,0,0,.35);font-family:system-ui,-apple-system,"Noto Sans KR",sans-serif}
#motionQc37 .qtop{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;margin-bottom:7px}#motionQc37 .qtitle{font-weight:800;font-size:12px}#motionQc37 .qstatus{opacity:.78;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#motionQc37 .qrow{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:6px}#motionQc37 button{border:0;border-radius:11px;padding:9px 3px;font-size:10px;font-weight:700;background:#fff;color:#222}#motionQc37 button.primary{background:#ffe0a9}#motionQc37 button.good{background:#dff5df}#motionQc37 button.bad{background:#ffd9d9}#motionQc37 button:disabled{opacity:.45}
#motionQc37 .qmeta{font-size:9px;opacity:.72;margin-top:6px;display:flex;justify-content:space-between;gap:8px}
`;document.head.appendChild(s)}
function ui(){let p=document.getElementById("motionQc37");if(p)return p;css();p=document.createElement("div");p.id="motionQc37";p.innerHTML=`<div class="qtop"><div class="qtitle">P2 모션 검수 V37</div><div class="qstatus" id="mq37Status">준비 중</div></div><div class="qrow"><button id="mq37Prev">이전</button><button class="primary" id="mq37Play">재생</button><button id="mq37Next">다음</button><button id="mq37All8">1~8 자동</button></div><div class="qrow"><button class="good" id="mq37Good">문제없음</button><button class="bad" id="mq37Bad">어색함</button><button id="mq37All50">50 자동</button><button id="mq37Copy">결과복사</button></div><div class="qmeta"><span id="mq37Pos">0/0</span><span id="mq37Count">좋음 0 · 어색 0</span></div>`;document.body.appendChild(p);return p}
function setStatus(t){const e=document.getElementById("mq37Status");if(e)e.textContent=t}
function update(){const it=items[index]||null;const d=saved(),vals=Object.values(d);const pos=document.getElementById("mq37Pos"),count=document.getElementById("mq37Count");if(pos)pos.textContent=it?`${index+1}/${items.length} · ${it.label}`:`0/${items.length}`;if(count)count.textContent=`좋음 ${vals.filter(x=>x==="good").length} · 어색 ${vals.filter(x=>x==="bad").length}`;setStatus(it?(d[it.key]==="bad"?"⚠ 어색함 기록":d[it.key]==="good"?"✓ 문제없음":"미검수"):"준비 중")}
async function loadManifest(){try{const r=await fetch("/scene-library-v28-manifest.json?v=28",{cache:"no-store"});const d=await r.json();if(!Array.isArray(d?.scenes)||d.scenes.length!==50)return false;manifest=d;return true}catch{return false}}
function masterItems(){return [
["master_01_sofa_relax","1 소파 휴식"],["master_02_window_gaze","2 창밖 바라보기"],["master_03_pet_touch","3 펫 쓰다듬기"],["master_04_return_home","4 현관 귀가"],["master_05_sit_down","5 소파 앉기"],["master_06_walk_to_window","6 창가로 걷기"],["master_07_morning_life","7 아침 생활"],["master_08_night_rest","8 밤 휴식"]
].map(([id,label])=>({kind:"master",id,key:`master:${id}`,label}))}
function sceneItems(){return (manifest?.scenes||[]).map((s,i)=>({kind:"slot",id:s.id,key:`slot:${s.id}`,label:`${i+1} ${s.label||s.id}`}))}
async function play(it=items[index]){if(!it||busy)return false;const e=engine();if(!e)return false;busy=true;setStatus("재생 중…");try{e.stop?.();const ok=it.kind==="master"?await e.playMaster(it.id,{qcV37:true}):await e.playForSlot(it.id,{qcV37:true});setStatus(ok?"재생 완료":"재생 실패");return Boolean(ok)}catch(err){console.warn("motion qc v37",err);setStatus("재생 오류");return false}finally{busy=false}}
function nav(delta){autoToken++;if(!items.length)return;index=(index+delta+items.length)%items.length;update()}
function mark(value){const it=items[index];if(!it)return;const d=saved();d[it.key]=value;persist(d);update();if(index<items.length-1){index++;update()}}
async function auto(list){if(busy)return;const t=++autoToken;items=list;index=0;update();for(let i=0;i<items.length&&t===autoToken;i++){index=i;update();await play(items[i]);if(t!==autoToken)break;await sleep(items[i].kind==="master"?520:260)}setStatus(t===autoToken?"자동검수 재생 완료":"자동검수 중단")}
async function copyReport(){const d=saved();const bad=Object.entries(d).filter(([,v])=>v==="bad").map(([k])=>k);const good=Object.values(d).filter(v=>v==="good").length;const text=`P2 V37 모션 검수\n문제없음: ${good}\n어색함: ${bad.length}\n${bad.join("\n")}`;try{await navigator.clipboard.writeText(text);setStatus("검수 결과 복사됨")}catch{setStatus("복사 실패")}}
async function boot(){ui();const ok=await loadManifest();if(!ok){setStatus("50장면 목록 로드 실패");return}for(let n=0;n<50&&!engine();n++)await sleep(60);if(!engine()){setStatus("V36 엔진 로드 실패");return}items=masterItems();index=0;update();document.getElementById("mq37Prev").onclick=()=>nav(-1);document.getElementById("mq37Next").onclick=()=>nav(1);document.getElementById("mq37Play").onclick=()=>play();document.getElementById("mq37Good").onclick=()=>mark("good");document.getElementById("mq37Bad").onclick=()=>mark("bad");document.getElementById("mq37All8").onclick=()=>auto(masterItems());document.getElementById("mq37All50").onclick=()=>auto(sceneItems());document.getElementById("mq37Copy").onclick=copyReport;window.motionQcV37={version:VERSION,masterItems,sceneItems,play,autoMasters:()=>auto(masterItems()),autoScenes:()=>auto(sceneItems()),report:()=>saved(),clear:()=>{persist({});update()}};window.dispatchEvent(new CustomEvent("p2:motion-qc-v37-ready",{detail:{version:VERSION,masters:8,scenes:50,freeOnly:true}}));setStatus("검수 준비 완료")}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,1280),{once:true});else setTimeout(boot,1280);
})();
