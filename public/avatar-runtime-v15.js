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
function revealCandidates(){
  const box=$("candidates");if(box)box.classList.add('show');
}
async function fetchOneAvatar(blob,variant){
  let lastError=new Error('AI 생성 실패');
  for(let attempt=1;attempt<=2;attempt++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),38000);
    try{
      const fd=new FormData();
      fd.append('image',blob,'selfie.jpg');
      fd.append('style',typeof charStyle!=='undefined'?charStyle:'나답게');
      fd.append('variant',String(variant));
      const res=await fetch('/api/avatar/generate',{method:'POST',body:fd,signal:controller.signal,cache:'no-store'});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data.ok||!data.image)throw new Error(data.error||`AI 응답 오류 (${res.status})`);
      return data.image;
    }catch(err){
      lastError=err?.name==='AbortError'?new Error('생성 시간이 너무 길어 자동으로 다시 시도합니다.'):err;
      if(attempt<2)await sleep(900);
    }finally{clearTimeout(timer)}
  }
  throw lastError;
}

async function progressiveGenerate(){
  const btn=$("generateBtn");
  if(!btn)return;
  btn.disabled=true;
  try{
    if(typeof photoData==='undefined'||!photoData){
      setStatus('먼저 사진을 한 장 선택해주세요.');
      return;
    }
    if(location.protocol==='file:'){
      setStatus('Cloudflare 배포 주소에서 열면 실제 AI 본캐가 생성됩니다.');
      return;
    }

    setStatus('사진을 줄이고 있습니다…',true);
    const blob=await resizeSelfieForAI(photoData);
    if(typeof generatedCandidates==='undefined')throw new Error('후보 저장공간을 찾지 못했습니다.');
    if(!Array.isArray(generatedCandidates)||generatedCandidates.length!==3)generatedCandidates=[null,null,null];

    revealCandidates();
    for(let i=0;i<3;i++){
      if(generatedCandidates[i]){
        showCandidate(i,generatedCandidates[i]);
        continue;
      }
      showPending(i,`${i+1}번 후보 생성 중…`);
      setStatus(`본캐 후보 ${i+1}/3 생성 중…`,true);
      try{
        const image=await fetchOneAvatar(blob,i);
        generatedCandidates[i]=image;
        showCandidate(i,image);
        setStatus(`본캐 후보 ${i+1}/3 완료`,i<2);
      }catch(err){
        showPending(i,'생성 실패 · 다시 누르면 이 후보만 재시도');
        setStatus(`${i+1}번 후보 생성 실패: ${err.message}`);
      }
    }

    const completed=generatedCandidates.filter(Boolean).length;
    if(completed===3){
      candidate=1;
      selectedAvatar=generatedCandidates[0];
      document.querySelectorAll('.candidate').forEach((x,i)=>x.classList.toggle('active',i===0));
      const next=$("characterNext");if(next)next.style.display='block';
      setStatus('후보 3개가 완성됐어요. 마음에 드는 본캐를 고르세요.');
    }else{
      const next=$("characterNext");if(next)next.style.display='none';
      setStatus(`${completed}/3개 완료. 버튼을 다시 누르면 실패한 후보만 이어서 만듭니다.`);
    }
  }catch(err){
    setStatus('생성 오류: '+(err?.message||'알 수 없는 오류')+' — 사진은 그대로 보존됩니다.');
  }finally{
    btn.disabled=false;
  }
}

function install(){
  if(typeof window.generateCandidates==='function')window.generateCandidates=progressiveGenerate;
  const btn=$("generateBtn");if(btn)btn.onclick=progressiveGenerate;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
