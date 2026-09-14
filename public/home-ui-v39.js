(()=>{
"use strict";
const VERSION="v39-room-first-home";
const qs=new URLSearchParams(location.search);
const TIME_KEYS=["morning","leave","day","return","evening","night"];
function byId(id){return document.getElementById(id)}
function ensureDebugClasses(){document.body.classList.toggle("motion-qc-mode",qs.get("motionQC")==="1");document.body.classList.toggle("motion-audit-mode",qs.get("motionAudit")==="1")}
function addHeaderButtons(home){
 const right=home.querySelector(".top>div:last-child");if(!right)return;
 if(!right.querySelector(".home39Bell")){const bell=document.createElement("button");bell.className="home39Bell";bell.type="button";bell.setAttribute("aria-label","알림");bell.textContent="🔔";bell.onclick=()=>{try{window.toast?.("오늘 알림은 없어요.")}catch{}};right.prepend(bell)}
 if(!right.querySelector(".home39Message")){const b=document.createElement("button");b.className="home39Message";b.type="button";b.textContent="맑은 메시지  ›";b.onclick=()=>{try{window.toast?.("맑은 메시지 보관함은 다음 화면에서 연결합니다.")}catch{}};right.appendChild(b)}
}
function relabel(home){
 const title=home.querySelector(".top h2");if(title)title.textContent="마이라이프룸";
 const sub=byId("subtitle");if(sub)sub.textContent="오늘도, 더 좋은 하루를 위해";
 const timeBtns=[...home.querySelectorAll(".times button")],labels=["☀ 아침","▣ 출근","☀ 낮","◐ 퇴근","◐ 저녁","✦ 밤"];
 timeBtns.forEach((b,i)=>{if(labels[i])b.textContent=labels[i];b.dataset.home39Time=TIME_KEYS[i]||"day"});
}
function moveEventBelowRoom(){
 const room=byId("room"),event=byId("event");if(!room||!event)return;
 event.classList.add("home39EventCard");
 if(event.parentElement===room)room.insertAdjacentElement("afterend",event)
}
function simplifyGrowth(home){
 const card=home.querySelector(".growthCard");if(!card)return;
 const top=card.querySelector(".growthTop");if(top){const right=top.querySelector("span");if(right)right.textContent="시작하기 충분한 공간"}
 if(!card.querySelector(".home39LevelFoot")){const d=document.createElement("div");d.className="home39LevelFoot";d.innerHTML='<span>조금씩, 나만의 공간을 채워보세요.</span><b>1 / 4</b>';card.appendChild(d)}
}
function activeTimeKey(home){const btn=home.querySelector(".times button.active");return btn?.dataset?.home39Time||"day"}
function updateMood(forced){
 const badge=byId("badge"),home=byId("home");if(!badge||!home)return;
 const map={morning:"🌿 오늘은 가볍게 시작해요",leave:"🌿 오늘도 잘 다녀와요",day:"🌿 오늘은 평온해요",return:"🌿 잘 돌아왔어요",evening:"🌿 오늘도 잘 버텼어요",night:"🌿 오늘은 여기까지"};
 const key=forced||activeTimeKey(home);badge.textContent=map[key]||map.day
}
function dedupePet(){
 const room=byId("room"),pet=byId("pet");if(!room||!pet)return;
 /* Current room art already contains its pet. Hide the overlay only for those room-art assets. */
 if(room.classList.contains("hasArt")){pet.setAttribute("aria-hidden","true");pet.style.visibility="hidden"}else{pet.removeAttribute("aria-hidden");pet.style.removeProperty("visibility")}
}
function wireTimeButtons(home){
 home.querySelectorAll(".times button").forEach(btn=>btn.addEventListener("click",()=>setTimeout(()=>{updateMood(btn.dataset.home39Time);dedupePet()},80)))
}
function apply(){
 ensureDebugClasses();
 const home=byId("home");if(!home||home.dataset.ui39==="1")return;
 document.body.classList.add("home39-live");home.dataset.ui39="1";home.classList.add("home39");
 addHeaderButtons(home);relabel(home);moveEventBelowRoom();simplifyGrowth(home);wireTimeButtons(home);updateMood();dedupePet();
 const room=byId("room");if(room){new MutationObserver(()=>dedupePet()).observe(room,{attributes:true,attributeFilter:["class"]})}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(apply,80),{once:true});else setTimeout(apply,80);
window.homeUiV39={version:VERSION,apply};
})();
