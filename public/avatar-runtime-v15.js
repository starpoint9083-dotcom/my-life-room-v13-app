(()=>{
"use strict";
const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function setStatus(message,loading=false){
  try{setAIStatus(message,loading)}catch{
    const el=$("aiStatus");
    if(el){el.classList.add("show");el.textContent=message;}
  }
}
function showCandidate(index,dataUrl){
  const boxes=document.querySelectorAll('.candidate .img');
  const box=boxes[index];
  if(!box)return;
  box.innerHTML='';
  const img=document.createElement('img');
  img.src=dataUrl;
  img.alt='본캐 후보 '+(index+1);
  box.appendChild(img);
}
function showPending(index,text){
  const boxes=document.querySelectorAll('.candidate .img');
  const box=boxes[index];
  if(!box)return;
  box.innerHTML=`<div style="font-size:12px;line-height:1.45;color:#777;padding:18px 8px;text-align:center">${text}</div>`;
}
function revealCandidates(){const box=$("candidates");if(box)box.classList.add('show')}
async function fetchOneAvatar(blob,variant){
  let lastError=new Error('AI 생성 실패');
  for(let attempt=1;attempt<=2;attempt++){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),85000);
    try{
      const fd=new FormData();fd.append('image',blob,'selfie.jpg');fd.append('style',typeof charStyle!=='undefined'?charStyle:'나답게');fd.append('variant',String(variant));
      const res=await fetch('/api/avatar/generate-v17',{method:'POST',body:fd,signal:controller.signal,cache:'no-store'});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data.ok||!data.image)throw new Error(data.error||`AI 응답 오류 (${res.status})`);
      return data.image;
    }catch(err){
      lastError=err?.name==='AbortError'?new Error('생성 시간이 길어 자동으로 다시 시도합니다.'):err;
      if(attempt<2)await sleep(900);
    }finally{clearTimeout(timer)}
  }
  throw lastError;
}
async function progressiveGenerate(){
  const btn=$("generateBtn");if(!btn)return;btn.disabled=true;
  try{
    if(typeof photoData==='undefined'||!photoData){setStatus('먼저 사진을 한 장 선택해주세요.');return}
    if(location.protocol==='file:'){setStatus('Cloudflare 배포 주소에서 열면 실제 AI 본캐가 생성됩니다.');return}
    setStatus('사진을 안전한 크기로 준비하고 있습니다…',true);
    const blob=await resizeSelfieForAI(photoData);
    if(typeof generatedCandidates==='undefined')throw new Error('후보 저장공간을 찾지 못했습니다.');
    if(!Array.isArray(generatedCandidates)||generatedCandidates.length!==3)generatedCandidates=[null,null,null];
    revealCandidates();
    for(let i=0;i<3;i++){
      if(generatedCandidates[i]){showCandidate(i,generatedCandidates[i]);continue}
      showPending(i,`${i+1}번 후보 생성 중…`);setStatus(`현실형 본캐 후보 ${i+1}/3 생성 중…`,true);
      try{
        const image=await fetchOneAvatar(blob,i);generatedCandidates[i]=image;showCandidate(i,image);setStatus(`현실형 본캐 후보 ${i+1}/3 완료`,i<2);
      }catch(err){showPending(i,'생성 실패 · 다시 누르면 이 후보만 재시도');setStatus(`${i+1}번 후보 생성 실패: ${err.message}`)}
    }
    const completed=generatedCandidates.filter(Boolean).length;
    if(completed===3){
      candidate=1;selectedAvatar=generatedCandidates[0];document.querySelectorAll('.candidate').forEach((x,i)=>x.classList.toggle('active',i===0));
      const next=$("characterNext");if(next)next.style.display='block';setStatus('현실형 후보 3개가 완성됐어요. 마음에 드는 본캐를 고르세요.');
    }else{const next=$("characterNext");if(next)next.style.display='none';setStatus(`${completed}/3개 완료. 버튼을 다시 누르면 실패한 후보만 이어서 만듭니다.`)}
  }catch(err){setStatus('생성 오류: '+(err?.message||'알 수 없는 오류')+' — 사진은 그대로 보존됩니다.')}finally{btn.disabled=false}
}
function resetCandidateUI(){
  try{generatedCandidates=[];selectedAvatar=null}catch{}
  const c=$("candidates");if(c)c.classList.remove('show');
  const n=$("characterNext");if(n)n.style.display='none';
}
function applyChosenPhoto(file){
  if(!file)return;
  if(!String(file.type||'').startsWith('image/')){setStatus('이미지 파일을 선택해주세요.');return}
  const reader=new FileReader();
  reader.onload=ev=>{
    try{photoData=ev.target.result}catch{}
    const preview=$("photoPreview"),hint=$("photoHint");
    if(preview){preview.src=ev.target.result;preview.style.display='block'}
    if(hint)hint.style.display='none';
    resetCandidateUI();
    setStatus('사진을 선택했습니다. 아래에서 본캐 스타일을 고른 뒤 생성해주세요.');
  };
  reader.onerror=()=>setStatus('사진을 읽지 못했습니다. 다른 사진을 선택해주세요.');
  reader.readAsDataURL(file);
}
function installPhotoPicker(){
  const input=$("photoInput");if(!input)return;
  input.removeAttribute('capture');
  input.setAttribute('accept','image/*');
  const hint=$("photoHint");if(hint)hint.textContent='📷 사진을 선택해주세요';
  if(!input.dataset.albumFix){
    input.dataset.albumFix='1';
    input.addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];if(f)applyChosenPhoto(f)});
  }
  if($("photoPickerActions"))return;
  const box=input.closest('.photoBox');if(!box)return;
  const actions=document.createElement('div');actions.id='photoPickerActions';
  actions.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px';
  const album=document.createElement('button');album.type='button';album.className='big alt';album.style.marginTop='0';album.textContent='앨범에서 선택';
  album.onclick=e=>{e.preventDefault();e.stopPropagation();input.value='';input.removeAttribute('capture');input.click()};
  const camera=document.createElement('button');camera.type='button';camera.className='big alt';camera.style.marginTop='0';camera.textContent='카메라로 촬영';
  const cameraInput=document.createElement('input');cameraInput.type='file';cameraInput.accept='image/*';cameraInput.setAttribute('capture','user');cameraInput.hidden=true;cameraInput.id='cameraPhotoInput';
  camera.onclick=e=>{e.preventDefault();e.stopPropagation();cameraInput.value='';cameraInput.click()};
  cameraInput.onchange=e=>{const f=e.target.files&&e.target.files[0];if(f)applyChosenPhoto(f)};
  actions.append(album,camera,cameraInput);box.insertAdjacentElement('afterend',actions);
}
async function fullReset(){
  try{
    if(typeof toast==='function')toast('설정과 서버 기록을 초기화하고 있습니다.');
    const id=localStorage.getItem('myroomDeviceId')||'',token=localStorage.getItem('myroomDeviceToken')||'';
    if(id&&token&&location.protocol!=='file:'){
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);let res;
      try{res=await fetch('/api/life/reset',{method:'POST',cache:'no-store',signal:controller.signal,headers:{'x-device-id':id,'x-device-token':token,'cache-control':'no-cache'}})}finally{clearTimeout(timer)}
      const data=await res.json().catch(()=>({}));if(!res.ok||!data.ok||!data.reset)throw new Error(data.error||`서버 초기화 실패 (${res.status})`);
    }
    const localKeys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('myroom'))localKeys.push(k)}localKeys.forEach(k=>localStorage.removeItem(k));
    try{const sessionKeys=[];for(let i=0;i<sessionStorage.length;i++){const k=sessionStorage.key(i);if(k&&k.startsWith('myroom'))sessionKeys.push(k)}sessionKeys.forEach(k=>sessionStorage.removeItem(k))}catch{}
    if('caches' in window){try{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('my-life-room')).map(k=>caches.delete(k)))}catch{}}
    location.replace('/?reset='+Date.now());
  }catch(err){if(typeof toast==='function')toast('초기화 실패: '+(err?.message||'서버 연결 오류'));else alert('초기화 실패: '+(err?.message||'서버 연결 오류'))}
}
function loadVisual17(){
  if(document.querySelector('script[data-visual-v17]'))return;
  const s=document.createElement('script');s.src='/visual-runtime-v17.js?v=17';s.async=true;s.dataset.visualV17='1';document.head.appendChild(s);
}
function install(){
  installPhotoPicker();
  if(typeof window.generateCandidates==='function')window.generateCandidates=progressiveGenerate;
  const btn=$("generateBtn");if(btn)btn.onclick=progressiveGenerate;
  window.resetAll=fullReset;loadVisual17();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
