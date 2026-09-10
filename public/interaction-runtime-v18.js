(()=>{
"use strict";
const $=s=>document.querySelector(s),byId=id=>document.getElementById(id);
let actorTimer=null,petTimer=null,envTimer=null,actualSummary=null;
const ITEM_KEY="myroomV18Items";
const rand=(a,b)=>Math.random()*(b-a)+a;
const pick=a=>a[Math.floor(Math.random()*a.length)];

function addStyle(){
  if(byId("interaction18Style"))return;
  const s=document.createElement("style");s.id="interaction18Style";s.textContent=`
  .room.v18{--v18-x:0px;--v18-y:0px;--v18-s:1;--v18-r:0deg;--pet-x:0px;--pet-y:0px;--pet-s:1;--pet-r:0deg}
  .room.v18 .avatar:not(.away){transform:translateX(calc(-50% + var(--v18-x))) translateY(var(--v18-y)) scale(var(--v18-s)) rotate(var(--v18-r))!important;transition:transform 1.9s cubic-bezier(.22,.7,.2,1),opacity .35s;animation:v18Breath 4.8s ease-in-out infinite}
  .room.v18 .avatar.v18walking:not(.away){animation:v18WalkBob .62s ease-in-out infinite alternate}
  .room.v18 .pet{transform:translate(var(--pet-x),var(--pet-y)) scale(var(--pet-s)) rotate(var(--pet-r));transition:transform 1.45s cubic-bezier(.22,.7,.2,1),left 1.45s,bottom 1.45s}
  .room.v18 .pet.v18moving{animation:v18PetBob .48s ease-in-out infinite alternate}
  .room.v18 .plant{transform-origin:50% 100%}
  .room.v18 .plant.v18sway{animation:v18PlantSway 1.9s ease-in-out 2}
  .v18SunBeam,.v18Breeze,.v18LeafShadow,.v18WarmLamp,.v18PetBed{position:absolute;pointer-events:none;z-index:5}
  .v18SunBeam{left:-8%;top:-8%;width:72%;height:88%;background:linear-gradient(115deg,rgba(255,245,194,.42),rgba(255,230,160,.12) 52%,transparent 72%);clip-path:polygon(0 0,62% 0,100% 100%,24% 100%);mix-blend-mode:screen;opacity:0;animation:v18SunPulse 6s ease-in-out infinite}
  .v18Breeze{inset:0;overflow:hidden;opacity:0}.v18Breeze:before,.v18Breeze:after{content:"";position:absolute;width:54%;height:1px;left:-60%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);box-shadow:0 26px 0 rgba(255,255,255,.24),0 52px 0 rgba(255,255,255,.18);animation:v18Breeze 5.5s linear infinite}.v18Breeze:after{top:41%;animation-delay:2.1s;opacity:.72}
  .v18LeafShadow{right:-6%;top:18%;width:34%;height:53%;opacity:.08;background:radial-gradient(ellipse at 20% 22%,#183b20 0 8%,transparent 9%),radial-gradient(ellipse at 63% 34%,#183b20 0 10%,transparent 11%),radial-gradient(ellipse at 34% 62%,#183b20 0 9%,transparent 10%),radial-gradient(ellipse at 75% 74%,#183b20 0 11%,transparent 12%);filter:blur(5px);transform-origin:100% 100%;animation:v18LeafShadow 4s ease-in-out infinite}
  .v18Dust{position:absolute;inset:0;z-index:6;pointer-events:none;overflow:hidden}.v18Dust i{position:absolute;width:3px;height:3px;border-radius:50%;background:rgba(255,248,218,.62);animation:v18Dust 8s linear infinite;opacity:0}
  .room.v18.env-morning .v18SunBeam,.room.v18.env-day .v18SunBeam{opacity:.72}.room.v18.env-return .v18SunBeam{opacity:.43}.room.v18.env-evening .v18SunBeam{opacity:.18}
  .room.v18.env-morning .v18Breeze,.room.v18.env-day .v18Breeze,.room.v18.env-return .v18Breeze{opacity:.36}.room.v18.env-night .v18Breeze{opacity:.08}
  .room.v18.env-night .v18LeafShadow{opacity:.025}.room.v18.env-evening .v18LeafShadow{opacity:.05}
  .room.v18.env-morning .roomArt{filter:saturate(1) contrast(1.02) brightness(1.04)!important}.room.v18.env-day .roomArt{filter:saturate(.98) contrast(1.02) brightness(1.015)!important}.room.v18.env-return .roomArt{filter:saturate(1.02) contrast(1.02) brightness(.99)!important}.room.v18.env-evening .roomArt{filter:saturate(1.03) contrast(1.03) brightness(.94)!important}.room.v18.env-night .roomArt{filter:saturate(.88) contrast(1.04) brightness(.76)!important}
  .levels button.v18locked{opacity:.48;filter:saturate(.3);position:relative}.levels button.v18locked:after{content:"🔒";font-size:8px;margin-left:2px}.levels button.v18unlocked:not(.active){opacity:.86}
  .v18WarmLamp{right:2%;top:16%;width:34%;height:40%;border-radius:50%;background:radial-gradient(circle,rgba(255,212,139,.22),transparent 67%);display:none}.room.item-lamp .v18WarmLamp{display:block}
  .v18PetBed{left:8%;bottom:8%;width:22%;height:8%;border-radius:50%;background:radial-gradient(ellipse,rgba(164,119,81,.2),transparent 70%);display:none}.room.item-petbed .v18PetBed{display:block}
  .room.item-plant .v18LeafShadow{opacity:.18}
  .v18SheetGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:10px 0}.v18SheetGrid button{border:1px solid var(--line);background:#fff;border-radius:12px;padding:12px 5px;font-size:11px}.v18SheetGrid button.active{background:#242424;color:#fff}
  @keyframes v18Breath{0%,100%{filter:drop-shadow(0 9px 7px rgba(33,25,20,.22))}50%{filter:drop-shadow(0 11px 8px rgba(33,25,20,.28))}}
  @keyframes v18WalkBob{from{margin-bottom:0}to{margin-bottom:3px}}
  @keyframes v18PetBob{from{margin-bottom:0}to{margin-bottom:2px}}
  @keyframes v18PlantSway{0%,100%{rotate:0deg}25%{rotate:-2.4deg}70%{rotate:1.8deg}}
  @keyframes v18SunPulse{0%,100%{filter:brightness(.94)}50%{filter:brightness(1.08)}}
  @keyframes v18Breeze{0%{transform:translateX(0) translateY(0);opacity:0}15%{opacity:.7}100%{transform:translateX(320%) translateY(36px);opacity:0}}
  @keyframes v18LeafShadow{0%,100%{transform:rotate(-1deg) scale(1)}50%{transform:rotate(2.2deg) scale(1.02)}}
  @keyframes v18Dust{0%{transform:translate(0,18px);opacity:0}12%{opacity:.7}100%{transform:translate(52px,-170px);opacity:0}}
  `;document.head.appendChild(s);
}
function addAmbient(){
  const room=byId("room");if(!room||room.querySelector(".v18SunBeam"))return;
  room.classList.add("v18");
  const sun=document.createElement("div");sun.className="v18SunBeam";
  const breeze=document.createElement("div");breeze.className="v18Breeze";
  const leaf=document.createElement("div");leaf.className="v18LeafShadow";
  const lamp=document.createElement("div");lamp.className="v18WarmLamp";
  const bed=document.createElement("div");bed.className="v18PetBed";
  const dust=document.createElement("div");dust.className="v18Dust";
  for(let i=0;i<7;i++){const p=document.createElement("i");p.style.left=`${12+i*11}%`;p.style.top=`${55+((i*17)%28)}%`;p.style.animationDelay=`${i*.9}s`;p.style.animationDuration=`${7+i*.55}s`;dust.appendChild(p)}
  room.prepend(sun,breeze,leaf,lamp,bed,dust);applyItems();
}
function envClass(){try{return currentTime||"morning"}catch{return "morning"}}
function applyEnvironment(){
  const room=byId("room");if(!room)return;addAmbient();
  ["morning","leave","day","return","evening","night"].forEach(t=>room.classList.remove(`env-${t}`));room.classList.add(`env-${envClass()}`);
}
function mainHabit(){try{return habit||"금주"}catch{return "금주"}}
function deriveGrowth(s){
  const dry=Math.max(0,Number(s?.dryStreak||0)),smoke=Math.max(0,Number(s?.smokeStreak||0));
  let xp=18,h=mainHabit();
  if(h==="금주")xp+=Math.min(82,dry*2);
  else if(h==="금연")xp+=Math.min(82,smoke*2);
  else xp+=Math.min(41,dry*1.5)+Math.min(41,smoke*1.5);
  return Math.max(18,Math.min(100,Math.round(xp)));
}
function levelFromXP(xp){return xp>=90?4:xp>=60?3:xp>=30?2:1}
function applyActualGrowth(s){
  if(!s)return;actualSummary=s;
  const xp=deriveGrowth(s),lv=levelFromXP(xp);
  try{growthXP=xp;roomLevel=lv;if(typeof applyRoomLevel==="function")applyRoomLevel()}catch{}
  const buttons=document.querySelectorAll(".levels button");
  buttons.forEach((b,i)=>{const n=i+1;b.classList.toggle("v18locked",n>lv);b.classList.toggle("v18unlocked",n<=lv);b.classList.toggle("active",n===lv);b.setAttribute("aria-disabled",n>lv?"true":"false")});
}
function actualDay(s){
  const t=s?.today;if(!t)return null;
  if(t.alcohol_result)return t.alcohol_result;
  if(t.smoking_count!==null&&t.smoking_count!==undefined){const n=Number(t.smoking_count),base=Number(t.smoking_baseline||0);if(n===0)return "success";if(base>0&&n<base)return "reduce";return "slip"}
  return null;
}
function applyActualBadge(s){
  const d=actualDay(s),badge=byId("badge");if(!badge)return;
  if(!d){
    try{day="neutral";todayHidden=[];foundHiddenIds=[];hidden=0}catch{}
    badge.textContent="오늘 기록 전";return;
  }
  try{day=d}catch{}
  if(d==="success"&&(!Array.isArray(todayHidden)||!todayHidden.length)){try{prepareHiddenChanges()}catch{}}
  if(d==="reduce"&&(!Array.isArray(todayHidden)||!todayHidden.length)){try{prepareHiddenChanges()}catch{}}
  if(d==="slip"){try{todayHidden=[];foundHiddenIds=[]}catch{};badge.textContent="오늘은 회복하는 날";return}
  try{badge()}catch{}
}
async function fetchActual(){
  try{
    if(typeof ensureDeviceIdentity==="function")ensureDeviceIdentity();
    const h=typeof authHeaders==="function"?authHeaders():{};
    const r=await fetch("/api/life/summary",{headers:h,cache:"no-store"});const d=await r.json();
    if(r.ok&&d.ok&&d.summary){applyActualGrowth(d.summary);applyActualBadge(d.summary);return d.summary}
  }catch(e){console.warn("v18 actual sync",e)}
  return null;
}
window.previewLevel=function(n){
  const lv=levelFromXP(deriveGrowth(actualSummary));
  if(n>lv){try{toast(`Lv.${n}는 아직 잠겨 있어요. 실제 금주·금연 기록이 쌓이면 자동으로 열립니다.`)}catch{};try{show(`🔒 현재는 Lv.${lv}. 기록이 쌓이면 다음 공간이 자동으로 열립니다.`)}catch{};return}
  if(n<lv){try{toast(`Lv.${n}는 이미 지나온 공간입니다. 현재 방은 Lv.${lv}입니다.`)}catch{};return}
  try{toast(`현재 실제 성장 단계는 Lv.${lv}입니다.`)}catch{}
};
function moveAvatar(force=false){
  const room=byId("room"),a=byId("avatar");if(!room||!a||a.classList.contains("away")||!byId("home")?.classList.contains("active"))return;
  const time=envClass();if(time==="night"&&!force&&Math.random()<.55)return;
  const x=pick([-78,-48,-18,12,38,66]),y=pick([0,0,0,-3,2]),s=pick([.985,1,1.015]),r=pick([-1.2,-.5,0,.5,1]);
  room.style.setProperty("--v18-x",`${x}px`);room.style.setProperty("--v18-y",`${y}px`);room.style.setProperty("--v18-s",s);room.style.setProperty("--v18-r",`${r}deg`);
  a.classList.add("v18walking");setTimeout(()=>a.classList.remove("v18walking"),rand(1500,2400));
}
function poseAvatar(){
  const room=byId("room"),a=byId("avatar");if(!room||!a||a.classList.contains("away"))return;
  const pose=pick(["window","pet","relax","stretch"]);
  if(pose==="window"){room.style.setProperty("--v18-x","-58px");room.style.setProperty("--v18-r","-1deg")}
  if(pose==="pet"){room.style.setProperty("--v18-x","-28px");room.style.setProperty("--v18-y","4px");room.style.setProperty("--v18-s",".985")}
  if(pose==="relax"){room.style.setProperty("--v18-x","28px");room.style.setProperty("--v18-r",".7deg")}
  if(pose==="stretch"){room.style.setProperty("--v18-y","-4px");room.style.setProperty("--v18-s","1.02")}
}
function movePet(force=false){
  const room=byId("room"),pet=byId("pet");if(!room||!pet||!byId("home")?.classList.contains("active"))return;
  if(envClass()==="night"&&!force&&Math.random()<.5)return;
  let x=pick([-32,-12,0,20,42,66]),y=pick([0,-3,2]),s=pick([.96,1,1.04]),r=pick([-3,-1,0,1,3]);
  try{if(petMode==="개냥이형"||petMode==="댕댕이형"){if(Math.random()<.5)x=34}else if(petMode==="집사취급형"&&Math.random()<.55)x=-28}catch{}
  room.style.setProperty("--pet-x",`${x}px`);room.style.setProperty("--pet-y",`${y}px`);room.style.setProperty("--pet-s",s);room.style.setProperty("--pet-r",`${r}deg`);
  pet.classList.add("v18moving");setTimeout(()=>pet.classList.remove("v18moving"),rand(950,1650));
}
function plantBreeze(){const p=byId("plant"),leaf=$(".v18LeafShadow");if(p){p.classList.remove("v18sway");void p.offsetWidth;p.classList.add("v18sway")}if(leaf){leaf.animate([{transform:"rotate(-1deg)"},{transform:"rotate(4deg)"},{transform:"rotate(-2deg)"},{transform:"rotate(0)"}],{duration:1900,easing:"ease-in-out"})}}
function ambientTap(e){
  const room=byId("room");if(!room||e.target.closest(".avatar,.pet,.badge,.event"))return;
  const r=room.getBoundingClientRect(),x=(e.clientX-r.left)/r.width;
  if(x>.64){try{plantTap()}catch{}plantBreeze();return}
  const breeze=$(".v18Breeze");if(breeze)breeze.animate([{opacity:.1},{opacity:.72},{opacity:.2}],{duration:1800});
  try{show("🍃 방 안으로 바람이 조용히 지나갑니다.")}catch{}
}
function wrapAction(name,after){
  const old=window[name];if(typeof old!=="function"||old.__v18)return;
  const fn=function(){const r=old.apply(this,arguments);Promise.resolve(r).finally(()=>after(...arguments));return r};fn.__v18=true;window[name]=fn;
}
function installActorHooks(){
  wrapAction("avatarTap",()=>{moveAvatar(true);setTimeout(poseAvatar,1000)});
  wrapAction("petTap",()=>movePet(true));
  wrapAction("plantTap",()=>plantBreeze());
  wrapAction("setTime",()=>{setTimeout(()=>{applyEnvironment();moveAvatar(true);movePet(true)},80)});
  wrapAction("setDay",()=>setTimeout(fetchActual,600));
  wrapAction("smokeResult",()=>setTimeout(fetchActual,600));
  wrapAction("saveCond",()=>setTimeout(fetchActual,600));
  wrapAction("applyHome",()=>setTimeout(()=>{addAmbient();applyEnvironment();applyActualGrowth(actualSummary);moveAvatar(true);movePet(true)},80));
}
function loadItems(){try{return JSON.parse(localStorage.getItem(ITEM_KEY)||"[]")}catch{return []}}
function saveItems(items){try{localStorage.setItem(ITEM_KEY,JSON.stringify([...new Set(items)]))}catch{}}
function applyItems(){const room=byId("room");if(!room)return;const items=loadItems();room.classList.toggle("item-lamp",items.includes("lamp"));room.classList.toggle("item-plant",items.includes("plant"));room.classList.toggle("item-petbed",items.includes("petbed"))}
window.v18Buy=function(id,cost,label){
  const items=loadItems();if(items.includes(id)){try{toast(`${label}은 이미 방에 있어요.`)}catch{};return}
  try{if(Number(P)<cost){toast(`포인트가 부족해요. ${cost.toLocaleString()}P가 필요합니다.`);return}P-=cost;items.push(id);saveItems(items);applyItems();if(typeof updateStats==="function")updateStats();toast(`${label}을 방에 놓았습니다.`)}catch{}
};
window.v18Style=function(style,label){
  try{roomStyle=style;if(typeof applyHome==="function")applyHome();if(typeof saveState==="function")saveState();if(typeof closeSheet==="function")closeSheet();toast(`${label}로 바꿨습니다.`)}catch{}
};
function decorate(){
  if(typeof openSheet!=="function")return;
  openSheet(`<h2>방 꾸미기</h2><p>방 분위기를 바로 바꿀 수 있어요. 실제 성장 레벨은 기록으로만 올라갑니다.</p><div class="v18SheetGrid"><button onclick="v18Style('','햇살방')">☀️<br>햇살방</button><button onclick="v18Style('modern','모던룸')">🪟<br>모던룸</button><button onclick="v18Style('cozy','포근한 방')">🧸<br>포근한 방</button></div><button class="big alt" onclick="closeSheet()">닫기</button>`)
}
async function invite(){
  const data={title:"나의 방",text:"내 생활이 조금씩 달라지는 나의 방을 같이 봐요.",url:location.origin};
  try{if(navigator.share){await navigator.share(data);return}await navigator.clipboard.writeText(location.origin);toast("초대 주소를 복사했습니다.")}catch(e){if(e?.name!=="AbortError")try{toast("초대 공유를 열지 못했습니다.")}catch{}}
}
function shop(){
  if(typeof openSheet!=="function")return;const have=loadItems();
  const item=(id,icon,label,cost)=>`<button class="big alt" onclick="v18Buy('${id}',${cost},'${label}')">${icon} ${label} · ${have.includes(id)?"보유 중":cost.toLocaleString()+"P"}</button>`;
  openSheet(`<h2>포인트 꾸미기 상점</h2><p>현금 결제가 아니라 생활 포인트로 방에 작은 변화를 놓습니다.</p>${item("lamp","🪔","따뜻한 조명",120)}${item("plant","🌿","풍성한 식물",180)}${item("petbed","🐾","펫 쿠션",150)}<button class="big alt" onclick="closeSheet()">닫기</button>`)
}
function wireNav(){
  const nav=byId("nav");if(!nav)return;const b=[...nav.querySelectorAll("button")];
  if(b[0])b[0].onclick=decorate;
  if(b[1])b[1].onclick=()=>{try{petTap()}catch{}movePet(true)};
  if(b[2])b[2].onclick=invite;
  if(b[3])b[3].onclick=shop;
}
function wireRoom(){const room=byId("room");if(room&&!room.__v18){room.__v18=true;room.addEventListener("click",ambientTap)}}
function schedule(){
  clearInterval(actorTimer);clearInterval(petTimer);clearInterval(envTimer);
  actorTimer=setInterval(()=>Math.random()<.66?moveAvatar():poseAvatar(),rand(6500,8500));
  petTimer=setInterval(()=>movePet(),rand(4200,6200));
  envTimer=setInterval(()=>{applyEnvironment();if(Math.random()<.45)plantBreeze()},12000);
}
window.v18Audit=function(){
  const buttons=[...document.querySelectorAll("button")];return {buttons:buttons.length,buttonsWithAction:buttons.filter(b=>b.onclick||b.getAttribute("onclick")).length,room:Boolean(byId("room")),avatar:Boolean(byId("avatar")),pet:Boolean(byId("pet")),plant:Boolean(byId("plant")),ambient:Boolean($(".v18SunBeam")),summary:Boolean(actualSummary)};
};
async function init(){
  addStyle();addAmbient();wireNav();wireRoom();installActorHooks();applyEnvironment();applyItems();await fetchActual();schedule();moveAvatar(true);movePet(true);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();