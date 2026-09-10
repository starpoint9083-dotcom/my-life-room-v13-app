(()=>{
"use strict";
const KEY="myroomV13Live";
const $=s=>document.querySelector(s);
const byId=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const localDate=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
function localState(){try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch{return {}}}
function setLocal(patch){const n={...localState(),...patch};localStorage.setItem(KEY,JSON.stringify(n));return n}
function mainState(){try{return JSON.parse(localStorage.getItem("myroomV13")||"{}")}catch{return {}}}
function headers(extra={}){try{return typeof authHeaders==="function"?authHeaders(extra):extra}catch{return extra}}
async function api(path,options={}){
  const o={...options,headers:headers(options.headers||{})};
  const r=await fetch(path,o); const d=await r.json().catch(()=>({}));
  if(!r.ok||!d.ok)throw new Error(d.error||`HTTP ${r.status}`); return d;
}
let liveSummary=null,lastBucket=null,lastRiskKey="";
function style(){
  if(byId("liveEngineStyle"))return;
  const s=document.createElement("style");s.id="liveEngineStyle";s.textContent=`
  .liveEngine{background:#fff;border:1px solid var(--line);border-radius:16px;padding:10px 11px;margin:8px 0;box-shadow:var(--shadow)}
  .liveEngineTop{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px}.liveDot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#66a56f;margin-right:5px}
  .liveBtns{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}.liveBtns button{border:1px solid var(--line);background:#faf8f5;border-radius:11px;padding:9px 6px;font-size:10px}
  .liveNote{font-size:10px;color:var(--muted);margin-top:6px;line-height:1.4}.liveStrong{font-weight:800}
  .liveField{display:block;font-size:11px;margin:10px 0}.liveField input,.liveField textarea{width:100%;margin-top:5px;padding:11px;border:1px solid var(--line);border-radius:11px;background:#fff;font:inherit}.liveField textarea{min-height:110px;resize:vertical}
  `;document.head.appendChild(s);
}
function mount(){
  style();
  if(byId("liveEngine"))return;
  const stats=$(".stats"); if(!stats)return;
  const box=document.createElement("div");box.id="liveEngine";box.className="liveEngine";
  box.innerHTML=`<div class="liveEngineTop"><div><span class="liveDot"></span><b>실사용 엔진</b></div><span id="liveEngineState">연결 중</span></div>
  <div class="liveNote" id="liveEngineNote">오늘 기록과 실제 연속일을 서버에서 불러오고 있습니다.</div>
  <div class="liveBtns"><button type="button" id="liveSetupBtn">실사용 설정</button><button type="button" id="clearMessageBtn">맑은 나의 메시지</button></div>`;
  stats.insertAdjacentElement("afterend",box);
  byId("liveSetupBtn").onclick=openSetup;byId("clearMessageBtn").onclick=openMessage;
}
function render(s){
  liveSummary=s||liveSummary;if(!liveSummary)return;
  const dry=byId("dryStat"),smoke=byId("smokeStat"),savedEl=byId("saved");
  const actualSaved=Math.max(0,Number(liveSummary.savedEstimate||0));
  if(dry)dry.textContent=`${liveSummary.dryStreak||0}일`;
  if(smoke)smoke.textContent=`${liveSummary.smokeStreak||0}일`;
  if(savedEl){savedEl.textContent=`${actualSaved.toLocaleString()}원`;savedEl.title="실사용 시작일과 실제 기준금액으로 계산";}
  try{if(typeof saved!=="undefined")saved=actualSaved}catch{}
  const state=byId("liveEngineState");if(state)state.textContent="서버 동기화";
  const note=byId("liveEngineNote");
  if(note){
    const t=liveSummary.today;
    const parts=[];
    if(t?.alcohol_result)parts.push(`금주 ${t.alcohol_result==="success"?"성공":t.alcohol_result==="reduce"?"감량":"사용"}`);
    if(t?.smoking_count!==null&&t?.smoking_count!==undefined)parts.push(`담배 ${t.smoking_count}개비`);
    if(t?.condition_score!==null&&t?.condition_score!==undefined)parts.push(`컨디션 ${t.condition_score}/10`);
    note.innerHTML=parts.length?`오늘 실제 기록: <span class="liveStrong">${esc(parts.join(" · "))}</span>`:"오늘 실제 기록은 아직 없습니다.";
  }
}
async function refresh(){
  mount();
  try{
    const d=await api(`/api/life/summary?date=${localDate()}`);
    render(d.summary); setLocal({lastSummary:d.summary,lastSync:Date.now()});
    return d.summary;
  }catch(e){
    const state=byId("liveEngineState");if(state)state.textContent="기기 저장";
    const cached=localState().lastSummary;if(cached)render(cached);
    return cached||null;
  }
}
function openSetup(){
  const p=liveSummary?.profile||{};
  const main=mainState();
  const alcoholCost=Number(p.alcohol_daily_cost||main.alcoholCost||45000);
  const smokeDaily=Number(p.smoking_daily_cost||0);
  const html=`<h2>실사용 기준 설정</h2><p>여기부터는 예시가 아니라 내 실제 기록으로 계산합니다.</p>
  <label class="liveField">금주 시작일<input id="liveAlcoholStart" type="date" value="${esc(p.alcohol_start_date||"")}"></label>
  <label class="liveField">금연 시작일<input id="liveSmokingStart" type="date" value="${esc(p.smoking_start_date||"")}"></label>
  <label class="liveField">술을 마셨을 때 하루 평균 지출<input id="liveAlcoholCost" type="number" min="0" value="${alcoholCost}"></label>
  <label class="liveField">담배 하루 평균 지출<input id="liveSmokingCost" type="number" min="0" value="${smokeDaily}"></label>
  <button class="big" onclick="liveSaveProfile()">저장하고 실제 계산 시작</button><button class="big alt" onclick="closeSheet()">닫기</button>`;
  if(typeof openSheet==="function")openSheet(html);
}
window.liveSaveProfile=async function(){
  const payload={
    alcohol_start_date:byId("liveAlcoholStart")?.value||null,
    smoking_start_date:byId("liveSmokingStart")?.value||null,
    alcohol_daily_cost:Number(byId("liveAlcoholCost")?.value||0),
    smoking_daily_cost:Number(byId("liveSmokingCost")?.value||0)
  };
  try{
    const d=await api("/api/life/profile",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
    render(d.summary);if(typeof closeSheet==="function")closeSheet();if(typeof toast==="function")toast("실사용 기준 저장 완료");
  }catch(e){if(typeof toast==="function")toast("서버 저장 실패 — 잠시 후 다시 시도해주세요.");}
};
function openMessage(){
  const latest=liveSummary?.latestMessage||"";
  const html=`<h2>맑은 나의 메시지</h2><p>마음이 맑은 지금, 흔들리는 시간의 나에게 남겨두세요.</p>
  ${latest?`<div class="message"><b>최근 메시지</b><br><br>${esc(latest)}</div>`:""}
  <label class="liveField">새 메시지<textarea id="liveMessageText" placeholder="예: 오늘 아침 몸이 정말 가볍다. 오늘 밤의 나야, 이 느낌을 잊지 말자."></textarea></label>
  <button class="big" onclick="liveSaveMessage()">메시지 저장</button><button class="big alt" onclick="closeSheet()">닫기</button>`;
  if(typeof openSheet==="function")openSheet(html);
}
window.liveSaveMessage=async function(){
  const text=String(byId("liveMessageText")?.value||"").trim();if(!text){if(typeof toast==="function")toast("메시지를 한 줄이라도 적어주세요.");return}
  try{
    await api("/api/life/message",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({text})});
    if(typeof closeSheet==="function")closeSheet();if(typeof toast==="function")toast("맑은 나의 메시지를 저장했습니다.");await refresh();
  }catch(e){if(typeof toast==="function")toast("메시지 저장 실패");}
};
async function syncDaily(result){
  const main=mainState(),h=main.habit||"금주";
  try{
    if(h==="금주"||h==="둘 다")await api("/api/life/daily",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({date:localDate(),alcohol_result:result})});
    if((h==="금연"||h==="둘 다")&&result==="success"){
      await api("/api/life/smoking",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({date:localDate(),count:0,baseline:Number(main.smokeBase||20)})});
    }
    await refresh();
  }catch{}
}
async function syncSmoking(count,baseline){
  try{await api("/api/life/smoking",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({date:localDate(),count:Number(count),baseline:Number(baseline)})});await refresh()}catch{}
}
async function syncCondition(score){
  try{await api("/api/life/condition",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({date:localDate(),score:Number(score)})});await refresh()}catch{}
}
function wrap(){
  if(typeof window.updateStats==="function"&&!window.updateStats.__live){
    const old=window.updateStats;const fn=function(){const r=old.apply(this,arguments);if(liveSummary){render(liveSummary);try{if(typeof saveState==="function")saveState()}catch{}}return r};fn.__live=true;window.updateStats=fn;
  }
  if(typeof window.setDay==="function"&&!window.setDay.__live){
    const old=window.setDay;const fn=function(x){const r=old.apply(this,arguments);syncDaily(x);return r};fn.__live=true;window.setDay=fn;
  }
  if(typeof window.smokeResult==="function"&&!window.smokeResult.__live){
    const old=window.smokeResult;const fn=function(n,b){const r=old.apply(this,arguments);syncSmoking(n,b);return r};fn.__live=true;window.smokeResult=fn;
  }
  if(typeof window.saveCond==="function"&&!window.saveCond.__live){
    const old=window.saveCond;const fn=function(n){const r=old.apply(this,arguments);syncCondition(n);return r};fn.__live=true;window.saveCond=fn;
  }
  if(typeof window.openAlcohol==="function"&&!window.openAlcohol.__live){
    const old=window.openAlcohol;const fn=function(){const r=old.apply(this,arguments);const msg=liveSummary?.latestMessage;const m=$("#sheet .message");if(msg&&m)m.innerHTML=`<b>맑았던 내가 지금의 나에게</b><br><br>${esc(msg)}`;return r};fn.__live=true;window.openAlcohol=fn;
  }
  if(typeof window.startTimer==="function"){
    window.startTimer=function(min,type){
      let sec=Math.max(1,Math.round(Number(min)*60));
      if(typeof openSheet==="function")openSheet(`<h2>${esc(type)} 방어 모드</h2><p>정해진 시간만 넘겨봅니다. 중간 종료에는 보상이 붙지 않습니다.</p><div class="timer" id="timer">${Math.floor(sec/60)}:${String(sec%60).padStart(2,"0")}</div><button class="big alt" onclick="closeSheet()">방으로 돌아가기</button>`);
      if(window.__liveTimer)clearInterval(window.__liveTimer);
      window.__liveTimer=setInterval(()=>{sec--;const el=byId("timer");if(el)el.textContent=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,"0")}`;if(sec<=0){clearInterval(window.__liveTimer);window.__liveTimer=null;if(typeof finishTimer==="function")finishTimer(type)}},1000);
    };
  }
}
function timeBucket(){
  const h=new Date().getHours();return h<6?"night":h<9?"morning":h<18?"day":h<20?"return":h<23?"evening":"night";
}
function autoClock(){
  const b=timeBucket();if(b!==lastBucket){lastBucket=b;if(typeof setTime==="function")setTime(b,null)}
}
async function riskTick(){
  try{
    const r=await api("/api/risk-profile");const p=r.profile||{};const h=new Date().getHours();const key=`${localDate()}-${h}`;
    const alcohol=(p.alcoholHours||[]).includes(h),smoking=(p.smokingHours||[]).includes(h);
    if((alcohol||smoking)&&lastRiskKey!==key){
      lastRiskKey=key;
      const label=alcohol&&smoking?"술·담배":alcohol?"술":"담배";
      if(typeof show==="function")show(`⚠️ 지금은 ${label} 위험 패턴 시간대입니다. 방이 먼저 알아챘어요.`);
      if(typeof toast==="function")toast(`${label} 위험시간 감지 — 방어 버튼을 준비했어요.`);
    }
  }catch{}
}
async function init(){
  mount();wrap();autoClock();await refresh();riskTick();
  setInterval(autoClock,60000);setInterval(riskTick,15*60000);setInterval(refresh,5*60000);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
