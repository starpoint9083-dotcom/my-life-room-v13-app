(()=>{
"use strict";
const VERSION="v25-room-experience-1";
const byId=id=>document.getElementById(id);
const q=s=>document.querySelector(s);

function addStyle(){
  if(byId("roomExperience25Style"))return;
  const s=document.createElement("style");
  s.id="roomExperience25Style";
  s.textContent=`
  :root{--v25-cream:#f8f3eb;--v25-paper:#fffdf9;--v25-ink:#2b2926;--v25-muted:#81786f;--v25-line:rgba(97,76,57,.12);--v25-gold:#dcae71;--v25-wood:#b9895f}
  body.v25product{background:#d8d0c8}
  body.v25product .app{background:linear-gradient(180deg,#fdfbf7 0%,#f6f0e8 100%)}
  body.v25product #home{padding:15px 14px 102px;background:transparent}
  body.v25product #home>.top{align-items:center;margin:0 2px 10px}
  body.v25product #home>.top h2{font-size:21px;letter-spacing:-.5px;margin:0;color:#26231f}
  body.v25product #home>.top .small{font-size:11px;color:#81786f;margin-top:3px}
  body.v25product #home>.top>div:last-child{display:flex;gap:6px;align-items:center}
  body.v25product #home>.top .installBtn{border:1px solid var(--v25-line);background:rgba(255,255,255,.86);color:#4b443d;border-radius:999px;padding:7px 10px;font-size:10px;font-weight:700}
  body.v25product #home>.top button[onclick="resetAll()"]{display:none}
  body.v25product #home .cloudState{font-size:9px;opacity:.72;margin-top:3px}

  body.v25product #home>.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:0 0 9px}
  body.v25product #home>.stats .stat{padding:8px 3px 7px;border-radius:15px;background:rgba(255,255,255,.72);backdrop-filter:blur(12px);border:1px solid rgba(116,91,66,.10);box-shadow:none;color:#8b8074;font-size:9px}
  body.v25product #home>.stats .stat b{font-size:12px;color:#2c2926;margin-top:2px;letter-spacing:-.2px}

  body.v25product #home>.riskStrip{border:0!important;background:linear-gradient(135deg,rgba(255,248,237,.93),rgba(246,236,222,.93))!important;box-shadow:0 8px 22px rgba(95,69,48,.07)!important;border-radius:18px!important;margin:0 0 10px!important;padding:10px 12px!important}
  body.v25product #home>.riskStrip .riskMeter{height:5px!important;background:rgba(109,82,59,.10)!important}
  body.v25product #home>.riskStrip .riskFill{background:linear-gradient(90deg,#d7b17d,#bd8b55)!important}

  body.v25product #home>.timeline,body.v25product #home>.engineCard,body.v25product #home>.actions{display:none!important}
  body.v25product.dev-room #home>.timeline,body.v25product.dev-room #home>.engineCard,body.v25product.dev-room #home>.actions{display:grid!important}

  body.v25product .room.v25room{height:560px;border-radius:30px;border:1px solid rgba(112,84,61,.13);box-shadow:0 22px 55px rgba(70,51,37,.15);overflow:hidden;isolation:isolate;background:
    radial-gradient(circle at 17% 13%,rgba(255,248,214,.98) 0 13%,rgba(255,248,214,0) 34%),
    linear-gradient(180deg,#ece3d7 0 58%,#d5bfa9 58% 100%)!important}
  body.v25product .room.v25room:before{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(115deg,rgba(255,255,255,.52) 0 11%,rgba(255,244,211,.25) 20%,rgba(255,255,255,0) 44%)}
  body.v25product .room.v25room:after{content:"";position:absolute;left:0;right:0;bottom:0;height:39%;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(138,98,65,0),rgba(109,73,45,.09))}
  body.v25product .room.v25room .roomArt{display:none!important}
  body.v25product .room.v25room .assetBadge{display:none!important}

  body.v25product .room.v25room .window{display:block!important;left:23px;top:47px;width:169px;height:194px;border:11px solid rgba(251,249,242,.96);border-radius:4px;background:linear-gradient(180deg,#d8e6eb 0 52%,#f4d8b0 52% 100%);box-shadow:0 10px 30px rgba(69,56,43,.08);z-index:2;overflow:hidden}
  body.v25product .room.v25room .window:before{left:49%;width:4px;background:rgba(255,255,255,.92)}
  body.v25product .room.v25room .window:after{top:50%;height:4px;background:rgba(255,255,255,.92)}
  body.v25product .room.v25room .sun{right:18px;top:20px;width:30px;height:30px;background:#fff0ae;box-shadow:0 0 35px 13px rgba(255,233,160,.52)}

  body.v25product .room.v25room .sofa{display:block!important;left:56px;bottom:126px;width:271px;height:114px;border-radius:34px 34px 26px 26px;background:linear-gradient(180deg,#eadfce,#d8c4aa);box-shadow:0 16px 0 #b99e80,0 26px 34px rgba(92,67,48,.17);z-index:4}
  body.v25product .room.v25room .sofa:before{left:13px;top:-32px;width:244px;height:62px;border-radius:32px;background:linear-gradient(180deg,#f0e7d9,#dfcfb9);box-shadow:inset 0 -4px 8px rgba(113,87,65,.05)}
  body.v25product .room.v25room .sofa:after{content:"";position:absolute;left:22px;top:16px;width:98px;height:62px;border-radius:20px;background:rgba(255,249,240,.45);box-shadow:132px 7px 0 rgba(248,239,226,.35)}

  body.v25product .room.v25room .rug{display:block!important;left:34px;bottom:28px;width:340px;height:110px;border-radius:50%;background:radial-gradient(ellipse at 50% 47%,#e8d5bb 0 48%,#cfb38f 70%,rgba(177,143,106,.12) 72%);z-index:2;filter:none}
  body.v25product .room.v25room .table{display:block!important;right:19px;bottom:105px;width:91px;height:15px;border-radius:12px;background:linear-gradient(180deg,#b98251,#8f643f);box-shadow:0 7px 14px rgba(90,62,40,.12);z-index:6}
  body.v25product .room.v25room .table:before,body.v25product .room.v25room .table:after{top:13px;width:7px;height:62px;background:#7f5738}

  body.v25product .room.v25room .plant{right:30px;bottom:134px;width:54px;height:116px;z-index:8}
  body.v25product .room.v25room .pot{width:50px;height:35px;background:linear-gradient(180deg,#b47a52,#8c5a3e);border-radius:7px 7px 16px 16px}
  body.v25product .room.v25room .leaf{background:linear-gradient(135deg,#6d9c6f,#47784f);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}

  .v25Shelf{position:absolute;right:22px;top:84px;width:118px;height:10px;background:#b58761;border-radius:6px;z-index:3;box-shadow:0 42px 0 #b58761}
  .v25Shelf:before,.v25Shelf:after{content:"";position:absolute;bottom:8px;width:30px;height:38px;border-radius:4px 4px 1px 1px;background:linear-gradient(90deg,#caa98b 0 29%,#71806c 30% 58%,#d4b96f 59% 100%)}
  .v25Shelf:before{left:10px}.v25Shelf:after{left:62px;height:28px;background:linear-gradient(90deg,#8b7261 0 36%,#d7c9a8 37% 68%,#809c84 69% 100%)}
  .v25Frame{position:absolute;left:219px;top:52px;width:88px;height:67px;border:6px solid #b89371;background:linear-gradient(145deg,#f4eee5,#e7d8c5);z-index:3;box-shadow:0 5px 12px rgba(77,55,39,.08)}
  .v25Frame:after{content:"";position:absolute;left:22px;top:16px;width:35px;height:24px;border-radius:50% 50% 42% 42%;background:linear-gradient(145deg,#cba783,#7b927b);opacity:.72}
  .v25Lamp{position:absolute;right:88px;bottom:151px;width:27px;height:54px;z-index:7}
  .v25Lamp:before{content:"";position:absolute;left:5px;top:0;width:18px;height:24px;background:#f1d7a2;clip-path:polygon(22% 0,78% 0,100% 100%,0 100%);box-shadow:0 0 22px rgba(255,214,143,.55)}
  .v25Lamp:after{content:"";position:absolute;left:13px;top:23px;width:3px;height:29px;background:#7a624e;box-shadow:-8px 29px 0 6px #8e745d}
  .v25Curtain{position:absolute;left:3px;top:26px;width:37px;height:250px;border-radius:0 0 30px 0;background:linear-gradient(90deg,rgba(224,211,193,.92),rgba(247,240,229,.72));z-index:3;opacity:.82;filter:drop-shadow(8px 2px 10px rgba(80,62,47,.06));transform-origin:top left;animation:v25Curtain 7s ease-in-out infinite}
  .v25Glow{position:absolute;left:0;top:0;width:62%;height:60%;z-index:2;pointer-events:none;background:linear-gradient(120deg,rgba(255,245,202,.28),rgba(255,255,255,0) 68%);clip-path:polygon(0 0,54% 0,100% 100%,0 79%);mix-blend-mode:screen;animation:v25Glow 6s ease-in-out infinite}

  body.v25product .room.v25room .avatar{left:53%;bottom:103px;width:136px;height:266px;z-index:13;transform:translateX(-50%);filter:drop-shadow(0 13px 13px rgba(61,44,31,.20))}
  body.v25product .room.v25room .avatar.ai .avatarFull{width:174px;height:268px;inset:-2px -19px 0 -19px;object-fit:contain;object-position:50% 100%;filter:drop-shadow(0 8px 5px rgba(61,44,31,.13))}
  body.v25product .room.v25room .pet{left:19%;bottom:82px;width:101px;height:82px;z-index:14;filter:drop-shadow(0 9px 8px rgba(61,44,31,.16))}
  body.v25product .room.v25room .pet.assetMode .petAsset{width:131px;height:104px;inset:-12px -15px -10px -15px}

  body.v25product .room.v25room .badge{top:14px;left:50%;padding:8px 13px;border:1px solid rgba(101,78,58,.09);background:rgba(255,253,249,.88);backdrop-filter:blur(10px);color:#3e3731;box-shadow:0 6px 16px rgba(78,58,43,.07);font-size:10px}
  body.v25product .room.v25room .event{left:14px;right:14px;bottom:14px;min-height:48px;border:1px solid rgba(101,78,58,.10);border-radius:18px;background:rgba(255,253,249,.88);backdrop-filter:blur(12px);box-shadow:0 9px 26px rgba(78,58,43,.10);color:#4b433c;font-size:11px;padding:11px 13px;z-index:31}

  body.v25product #home>.growthCard{margin-top:12px;border:1px solid rgba(108,82,61,.10);border-radius:21px;background:rgba(255,253,249,.84);box-shadow:0 8px 24px rgba(81,59,42,.06);padding:13px}
  body.v25product #home>.growthCard>.small{display:none}
  body.v25product #home>.growthCard .growthTop{font-size:11px;margin-bottom:8px}
  body.v25product #home>.growthCard .growthTop b{font-size:13px}
  body.v25product #home>.growthCard .progress{height:7px;background:#eee4d8}
  body.v25product #home>.growthCard .progressFill{background:linear-gradient(90deg,#e7c692,#c99a61)}
  body.v25product #home>.growthCard .levels{gap:6px;margin-top:9px}
  body.v25product #home>.growthCard .levels button{border:1px solid rgba(108,82,61,.10);background:#fffaf4;border-radius:12px;padding:8px 3px;color:#8a7c6d}
  body.v25product #home>.growthCard .levels button.active{background:#302b26;color:#fff;border-color:#302b26}

  body.v25product .nav{height:82px;padding-bottom:max(10px,env(safe-area-inset-bottom));background:rgba(255,253,249,.86);backdrop-filter:blur(18px);border-top:1px solid rgba(102,80,61,.10);box-shadow:0 -8px 24px rgba(70,51,37,.05)}
  body.v25product .nav button{color:#766b61;font-size:10px}
  body.v25product .nav button span{font-size:20px;margin-bottom:2px}

  .v25RoomLabel{position:absolute;left:15px;top:16px;z-index:26;color:#6c6259;font-size:8px;letter-spacing:.14em;text-transform:uppercase;font-weight:800;opacity:.68}
  @keyframes v25Curtain{0%,100%{transform:skewX(0deg)}50%{transform:skewX(-2deg)}}
  @keyframes v25Glow{0%,100%{opacity:.7}50%{opacity:1}}
  `;
  document.head.appendChild(s);
}

function addDecor(){
  const room=byId("room");if(!room)return;
  room.classList.add("v25room");
  const classes=["v25Shelf","v25Frame","v25Lamp","v25Curtain","v25Glow"];
  for(const c of classes){if(room.querySelector("."+c))continue;const el=document.createElement("div");el.className=c;room.prepend(el)}
  if(!room.querySelector(".v25RoomLabel")){const l=document.createElement("div");l.className="v25RoomLabel";l.textContent="MY LIFE ROOM";room.appendChild(l)}
}
function rewriteCopy(){
  const home=byId("home");if(!home)return;
  const title=home.querySelector(".top h2");if(title)title.textContent="My Life Room";
  const sub=byId("subtitle");if(sub)sub.textContent="내가 지킨 시간이 오늘의 방을 바꿔요.";
  const risk=home.querySelector(".riskStrip b");if(risk)risk.textContent="오늘 흔들릴 수 있는 시간";
  const levelHint=byId("levelHint");if(levelHint&&/시작|채워|공간|달라|최고/.test(levelHint.textContent||""))levelHint.textContent="오늘도 조금씩 살아나는 공간";
}
function applyMode(){
  document.body.classList.add("v25product");
  if(new URL(location.href).searchParams.get("roomDev")==="1")document.body.classList.add("dev-room");
  addDecor();rewriteCopy();
}
function wrap(name){
  const old=window[name];if(typeof old!=="function"||old.__v25room)return;
  const fn=function(){const r=old.apply(this,arguments);Promise.resolve(r).finally(()=>setTimeout(applyMode,40));return r};fn.__v25room=true;window[name]=fn;
}
function install(){
  addStyle();applyMode();
  ["applyHome","setTime","setDay","applyRoomLevel"].forEach(wrap);
  window.addEventListener("pageshow",()=>setTimeout(applyMode,40));
  window.mlrRoomV25={version:VERSION,refresh:applyMode};
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();
