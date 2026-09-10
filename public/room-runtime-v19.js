(()=>{
"use strict";
const $=s=>document.querySelector(s),byId=id=>document.getElementById(id);
let actorTimer=null,petTimer=null,envTimer=null,actualSummary=null;
const ITEM_KEY="myroomV19Items";
const rand=(a,b)=>Math.random()*(b-a)+a,pick=a=>a[Math.floor(Math.random()*a.length)];
function addStyle(){
 if(byId("room19Style"))return;
 const s=document.createElement("style");s.id="room19Style";s.textContent=`
 .room.v19{--actor-x:0px;--actor-y:0px;--actor-s:1;--actor-r:0deg;--pet-x:0px;--pet-y:0px;--pet-s:1;--pet-r:0deg}
 .room.v19 .avatar:not(.away){transform:translateX(calc(-50% + var(--actor-x))) translateY(var(--actor-y)) scale(var(--actor-s)) rotate(var(--actor-r))!important;transition:transform 1.9s cubic-bezier(.22,.7,.2,1),opacity .35s}
 .room.v19 .avatar.v19walk:not(.away){animation:v19Walk .58s ease-in-out infinite alternate}
 .room.v19 .pet{transform:translate(var(--pet-x),var(--pet-y)) scale(var(--pet-s)) rotate(var(--pet-r))!important;transition:transform 1.35s cubic-bezier(.22,.7,.2,1)!important}
 .room.v19 .pet.v19walk{animation:v19Pet .45s ease-in-out infinite alternate}
 .room.v19 .plant{transform-origin:50% 100%}.room.v19 .plant.v19sway{animation:v19Plant 1.9s ease-in-out 2}
 .v19Sun,.v19Wind,.v19Leaves,.v19Lamp,.v19PetBed{position:absolute;pointer-events:none;z-index:5}
 .v19Sun{left:-8%;top:-8%;width:72%;height:88%;background:linear-gradient(115deg,rgba(255,245,194,.44),rgba(255,230,160,.12) 52%,transparent 72%);clip-path:polygon(0 0,62% 0,100% 100%,24% 100%);mix-blend-mode:screen;opacity:0;animation:v19Sun 6s ease-in-out infinite}
 .v19Wind{inset:0;overflow:hidden;opacity:0}.v19Wind:before,.v19Wind:after{content:"";position:absolute;width:54%;height:1px;left:-60%;top:26%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);box-shadow:0 28px 0 rgba(255,255,255,.22),0 55px 0 rgba(255,255,255,.15);animation:v19Wind 5.4s linear infinite}.v19Wind:after{top:51%;animation-delay:2.2s;opacity:.66}
 .v19Leaves{right:-5%;top:18%;width:35%;height:53%;opacity:.08;background:radial-gradient(ellipse at 20% 22%,#183b20 0 8%,transparent 9%),radial-gradient(ellipse at 63% 34%,#183b20 0 10%,transparent 11%),radial-gradient(ellipse at 34% 62%,#183b20 0 9%,transparent 10%),radial-gradient(ellipse at 75% 74%,#183b20 0 11%,transparent 12%);filter:blur(5px);transform-origin:100% 100%;animation:v19Leaves 4s ease-in-out infinite}
 .v19Dust{position:absolute;inset:0;z-index:6;pointer-events:none;overflow:hidden}.v19Dust i{position:absolute;width:3px;height:3px;border-radius:50%;background:rgba(255,248,218,.62);animation:v19Dust 8s linear infinite;opacity:0}
 .room.v19.env-morning .v19Sun,.room.v19.env-day .v19Sun{opacity:.72}.room.v19.env-return .v19Sun{opacity:.42}.room.v19.env-evening .v19Sun{opacity:.17}.room.v19.env-night .v19Sun{opacity:0}
 .room.v19.env-morning .v19Wind,.room.v19.env-day .v19Wind,.room.v19.env-return .v19Wind{opacity:.34}.room.v19.env-evening .v19Wind{opacity:.15}.room.v19.env-night .v19Wind{opacity:.06}
 .room.v19.env-night .v19Leaves{opacity:.025}.room.v19.env-evening .v19Leaves{opacity:.05}
 .room.v19.env-morning .roomArt{filter:saturate(1) contrast(1.02) brightness(1.04)!important}.room.v19.env-day .roomArt{filter:saturate(.98) contrast(1.02) brightness(1.015)!important}.room.v19.env-return .roomArt{filter:saturate(1.02) contrast(1.02) brightness(.99)!important}.room.v19.env-evening .roomArt{filter:saturate(1.03) contrast(1.03) brightness(.94)!important}.room.v19.env-night .roomArt{filter:saturate(.88) contrast(1.04) brightness(.76)!important}
 .levels button.v19locked{opacity:.46;filter:saturate(.25)}.levels button.v19locked:after{content:" 🔒";font-size:8px}.levels button.v19open:not(.active){opacity:.86}
 .v19Lamp{right:2%;top:15%;width:35%;height:42%;border-radius:50%;background:radial-gradient(circle,rgba(255,212,139,.22),transparent 67%);display:none}.room.item-lamp .v19Lamp{display:block}
 .v19PetBed{left:8%;bottom:8%;width:24%;height:8%;border-radius:50%;background:radial-gradient(ellipse,rgba(164,119,81,.2),transparent 70%);display:none}.room.item-petbed .v19PetBed{display:block}.room.item-plant .v19Leaves{opacity:.18}
 .v19Grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:10px 0}.v19Grid button{border:1px solid var(--line);background:#fff;border-radius:12px;padding:12px 5px;font-size:11px}
 @keyframes v19Walk{from{margin-bottom:0}to{margin-bottom:3px}}@keyframes v19Pet{from{margin-bottom:0}to{margin-bottom:2px}}@keyframes v19Plant{0%,100%{rotate:0deg}25%{rotate:-2.5deg}70%{rotate:1.8deg}}@keyframes v19Sun{0%,100%{filter:brightness(.94)}50%{filter:brightness(1.08)}}@keyframes v19Wind{0%{transform:translateX(0) translateY(0);opacity:0}15%{opacity:.7}100%{transform:translateX(320%) translateY(36px);opacity:0}}@keyframes v19Leaves{0%,100%{transform:rotate(-1deg) scale(1)}50%{transform:rotate(2.2deg) scale(1.02)}}@keyframes v19Dust{0%{transform:translate(0,18px);opacity:0}12%{opacity:.7}100%{transform:translate(52px,-170px);opacity:0}}
 `;document.head.appendChild(s)
}
function addAmbient(){
 const room=byId("room");if(!room)return;room.classList.add("v19");if(room.querySelector(".v19Sun"))return;
 const mk=c=>{const x=document.createElement("div");x.className=c;return x};
 const sun=mk("v19Sun"),wind=mk("v19Wind"),leaves=mk("v19Leaves"),lamp=mk("v19Lamp"),bed=mk("v19PetBed"),dust=mk("v19Dust");
 for(let i=0;i<7;i++){const p=document.createElement("i");p.style.left=`${12+i*11}%`;p.style.top=`${54+((i*17)%29)}%`;p.style.animationDelay=`${i*.9}s`;p.style.animationDuration=`${7+i*.55}s`;dust.appendChild(p)}
 room.prepend(sun,wind,leaves,lamp,bed,dust);applyItems()
}
function timeNow(){try{return currentTime||"morning"}catch{return "morning"}}
function applyEnvironment(){const room=byId("room");if(!room)return;addAmbient();["morning","leave","day","return","evening","night"].forEach(t=>room.classList.remove(`env-${t}`));room.classList.add(`env-${timeNow()}`)}
function chosenHabit(){try{return habit||"금주"}catch{return "금주"}}
function growth(s){const dry=Math.max(0,Number(s?.dryStreak||0)),smoke=Math.max(0,Number(s?.smokeStreak||0));let xp=18,h=chosenHabit();if(h==="금주")xp+=Math.min(82,dry*2);else if(h==="금연")xp+=Math.min(82,smoke*2);else xp+=Math.min(41,dry*1.5)+Math.min(41,smoke*1.5);return Math.max(18,Math.min(100,Math.round(xp)))}
const level=x=>x>=90?4:x>=60?3:x>=30?2:1;
function applyGrowth(s){
 if(!s)return;actualSummary=s;const xp=growth(s),lv=level(xp);
 try{growthXP=xp;roomLevel=lv;if(typeof applyRoomLevel==="function")applyRoomLevel()}catch{}
 document.querySelectorAll(".levels button").forEach((b,i)=>{const n=i+1;b.classList.toggle("v19locked",n>lv);b.classList.toggle("v19open",n<=lv);b.classList.toggle("active",n===lv);b.setAttribute("aria-disabled",n>lv?"true":"false")})
}
function dayFrom(s){const t=s?.today;if(!t)return null;if(t.alcohol_result)return t.alcohol_result;if(t.smoking_count!==null&&t.smoking_count!==undefined){const n=Number(t.smoking_count),base=Number(t.smoking_baseline||0);if(n===0)return "success";if(base>0&&n<base)return "reduce";return "slip"}return null}
function applyBadge(s){
 const d=dayFrom(s),badgeEl=byId("badge");if(!badgeEl)return;
 if(!d){try{day="neutral";todayHidden=[];foundHiddenIds=[];hidden=0}catch{}badgeEl.textContent="오늘 기록 전";return}
 try{day=d}catch{}
 if(d==="slip"){try{todayHidden=[];foundHiddenIds=[]}catch{}badgeEl.textContent="오늘은 회복하는 날";return}
 try{if(!Array.isArray(todayHidden)||!todayHidden.length)prepareHiddenChanges()}catch{}
 try{if(typeof window.badge==="function")window.badge();else badgeEl.textContent=d==="success"?"오늘 좋은 변화 2개":"오늘 좋은 변화 1개"}catch{badgeEl.textContent=d==="success"?"오늘 좋은 변화 2개":"오늘 좋은 변화 1개"}
}
async function refreshActual(){
 try{if(typeof ensureDeviceIdentity==="function")ensureDeviceIdentity();const h=typeof authHeaders==="function"?authHeaders():{};const r=await fetch("/api/life/summary",{headers:h,cache:"no-store"});const d=await r.json();if(r.ok&&d.ok&&d.summary){applyGrowth(d.summary);applyBadge(d.summary);return d.summary}}catch(e){console.warn("room-v19 sync",e)}return null
}
window.previewLevel=function(n){const lv=level(growth(actualSummary));if(n>lv){try{toast(`Lv.${n}는 아직 잠겨 있어요. 실제 기록이 쌓이면 자동으로 열립니다.`);show(`🔒 현재 실제 성장 단계는 Lv.${lv}입니다.`)}catch{};return}try{toast(n===lv?`현재 실제 성장 단계는 Lv.${lv}입니다.`:`Lv.${n}는 이미 지나온 공간입니다.`)}catch{}};
function moveActor(force=false){const room=byId("room"),a=byId("avatar");if(!room||!a||a.classList.contains("away")||!byId("home")?.classList.contains("active"))return;if(timeNow()==="night"&&!force&&Math.random()<.55)return;room.style.setProperty("--actor-x",`${pick([-78,-48,-18,12,38,66])}px`);room.style.setProperty("--actor-y",`${pick([0,0,-3,2])}px`);room.style.setProperty("--actor-s",pick([.985,1,1.015]));room.style.setProperty("--actor-r",`${pick([-1.1,-.4,0,.4,1])}deg`);a.classList.add("v19walk");setTimeout(()=>a.classList.remove("v19walk"),rand(1500,2400))}
function poseActor(){const room=byId("room"),a=byId("avatar");if(!room||!a||a.classList.contains("away"))return;const p=pick(["window","pet","relax","stretch"]);if(p==="window"){room.style.setProperty("--actor-x","-58px");room.style.setProperty("--actor-r","-1deg")}if(p==="pet"){room.style.setProperty("--actor-x","-28px");room.style.setProperty("--actor-y","4px");room.style.setProperty("--actor-s",".985")}if(p==="relax"){room.style.setProperty("--actor-x","28px");room.style.setProperty("--actor-r",".7deg")}if(p==="stretch"){room.style.setProperty("--actor-y","-4px");room.style.setProperty("--actor-s","1.02")}}
function movePet(force=false){const room=byId("room"),pet=byId("pet");if(!room||!pet||!byId("home")?.classList.contains("active"))return;if(timeNow()==="night"&&!force&&Math.random()<.5)return;let x=pick([-32,-12,0,20,42,66]);try{if((petMode==="개냥이형"||petMode==="댕댕이형")&&Math.random()<.5)x=34;if(petMode==="집사취급형"&&Math.random()<.55)x=-28}catch{}room.style.setProperty("--pet-x",`${x}px`);room.style.setProperty("--pet-y",`${pick([0,-3,2])}px`);room.style.setProperty("--pet-s",pick([.96,1,1.04]));room.style.setProperty("--pet-r",`${pick([-3,-1,0,1,3])}deg`);pet.classList.add("v19walk");setTimeout(()=>pet.classList.remove("v19walk"),rand(950,1650))}
function swayPlant(){const p=byId("plant"),l=$(".v19Leaves");if(p){p.classList.remove("v19sway");void p.offsetWidth;p.classList.add("v19sway")}if(l)l.animate([{transform:"rotate(-1deg)"},{transform:"rotate(4deg)"},{transform:"rotate(-2deg)"},{transform:"rotate(0)"}],{duration:1900,easing:"ease-in-out"})}
function roomTap(e){const room=byId("room");if(!room||e.target.closest(".avatar,.pet,.badge,.event"))return;const r=room.getBoundingClientRect(),x=(e.clientX-r.left)/r.width;if(x>.64){try{plantTap()}catch{}swayPlant();return}const w=$(".v19Wind");if(w)w.animate([{opacity:.1},{opacity:.72},{opacity:.2}],{duration:1800});try{show("🍃 방 안으로 바람이 조용히 지나갑니다.")}catch{}}
function wrap(name,after){const old=window[name];if(typeof old!=="function"||old.__room19)return;const fn=function(){const r=old.apply(this,arguments);Promise.resolve(r).finally(()=>after(...arguments));return r};fn.__room19=true;window[name]=fn}
function hooks(){wrap("avatarTap",()=>{moveActor(true);setTimeout(poseActor,1000)});wrap("petTap",()=>movePet(true));wrap("plantTap",()=>swayPlant());wrap("setTime",()=>setTimeout(()=>{applyEnvironment();moveActor(true);movePet(true)},80));wrap("setDay",()=>setTimeout(refreshActual,650));wrap("smokeResult",()=>setTimeout(refreshActual,650));wrap("saveCond",()=>setTimeout(refreshActual,650));wrap("applyHome",()=>setTimeout(()=>{addAmbient();applyEnvironment();applyGrowth(actualSummary);moveActor(true);movePet(true)},80))}
function items(){try{return JSON.parse(localStorage.getItem(ITEM_KEY)||"[]")}catch{return []}}
function saveItems(a){try{localStorage.setItem(ITEM_KEY,JSON.stringify([...new Set(a)]))}catch{}}
function applyItems(){const room=byId("room");if(!room)return;const a=items();room.classList.toggle("item-lamp",a.includes("lamp"));room.classList.toggle("item-plant",a.includes("plant"));room.classList.toggle("item-petbed",a.includes("petbed"))}
window.v19Buy=function(id,cost,label){const a=items();if(a.includes(id)){try{toast(`${label}은 이미 방에 있어요.`)}catch{};return}try{if(Number(P)<cost){toast(`포인트가 부족해요. ${cost.toLocaleString()}P가 필요합니다.`);return}P-=cost;a.push(id);saveItems(a);applyItems();if(typeof updateStats==="function")updateStats();toast(`${label}을 방에 놓았습니다.`)}catch{}};
window.v19Style=function(style,label){try{roomStyle=style;if(typeof applyHome==="function")applyHome();if(typeof saveState==="function")saveState();if(typeof closeSheet==="function")closeSheet();toast(`${label}로 바꿨습니다.`)}catch{}};
function decorate(){if(typeof openSheet!=="function")return;openSheet(`<h2>방 꾸미기</h2><p>방 분위기는 바로 바꿀 수 있고 성장 레벨은 실제 기록으로만 올라갑니다.</p><div class="v19Grid"><button onclick="v19Style('','햇살방')">☀️<br>햇살방</button><button onclick="v19Style('modern','모던룸')">🪟<br>모던룸</button><button onclick="v19Style('cozy','포근한 방')">🧸<br>포근한 방</button></div><button class="big alt" onclick="closeSheet()">닫기</button>`)}
async function invite(){const data={title:"나의 방",text:"내 생활이 조금씩 달라지는 나의 방을 같이 봐요.",url:location.origin};try{if(navigator.share){await navigator.share(data);return}await navigator.clipboard.writeText(location.origin);toast("초대 주소를 복사했습니다.")}catch(e){if(e?.name!=="AbortError")try{toast("초대 공유를 열지 못했습니다.")}catch{}}}
function shop(){if(typeof openSheet!=="function")return;const have=items(),item=(id,icon,label,cost)=>`<button class="big alt" onclick="v19Buy('${id}',${cost},'${label}')">${icon} ${label} · ${have.includes(id)?"보유 중":cost.toLocaleString()+"P"}</button>`;openSheet(`<h2>포인트 꾸미기 상점</h2><p>현금 결제가 아니라 생활 포인트로 방의 작은 변화를 추가합니다.</p>${item("lamp","🪔","따뜻한 조명",120)}${item("plant","🌿","풍성한 식물",180)}${item("petbed","🐾","펫 쿠션",150)}<button class="big alt" onclick="closeSheet()">닫기</button>`)}
function wire(){const nav=byId("nav"),room=byId("room");if(nav){const b=[...nav.querySelectorAll("button")];if(b[0])b[0].onclick=decorate;if(b[1])b[1].onclick=()=>{try{petTap()}catch{}movePet(true)};if(b[2])b[2].onclick=invite;if(b[3])b[3].onclick=shop}if(room&&!room.__room19){room.__room19=true;room.addEventListener("click",roomTap)}}
function schedule(){clearInterval(actorTimer);clearInterval(petTimer);clearInterval(envTimer);actorTimer=setInterval(()=>Math.random()<.66?moveActor():poseActor(),7200);petTimer=setInterval(()=>movePet(),5100);envTimer=setInterval(()=>{applyEnvironment();if(Math.random()<.45)swayPlant()},12000)}
window.roomV19Audit=function(){const b=[...document.querySelectorAll("button")];return {buttons:b.length,buttonsWithAction:b.filter(x=>x.onclick||x.getAttribute("onclick")).length,room:Boolean(byId("room")),avatar:Boolean(byId("avatar")),pet:Boolean(byId("pet")),plant:Boolean(byId("plant")),sun:Boolean($(".v19Sun")),wind:Boolean($(".v19Wind")),summary:Boolean(actualSummary)}};
async function init(){addStyle();addAmbient();wire();hooks();applyEnvironment();applyItems();await refreshActual();schedule();moveActor(true);movePet(true)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();