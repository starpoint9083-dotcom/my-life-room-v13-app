import fs from "node:fs";

function read(path){ return fs.readFileSync(path,"utf8"); }
function write(path,text){ fs.writeFileSync(path,text); }
function replaceOnce(path,oldText,newText,label){
  let s=read(path);
  if(s.includes(newText)){ console.log(`already applied: ${label}`); return; }
  const i=s.indexOf(oldText);
  if(i<0) throw new Error(`repair marker not found: ${label}`);
  s=s.slice(0,i)+newText+s.slice(i+oldText.length);
  write(path,s);
  console.log(`applied: ${label}`);
}
function replaceSection(path,startMarker,endMarker,newSection,label){
  let s=read(path);
  if(s.includes(newSection.trim())){ console.log(`already applied: ${label}`); return; }
  const a=s.indexOf(startMarker);
  if(a<0) throw new Error(`start marker not found: ${label}`);
  const b=s.indexOf(endMarker,a+startMarker.length);
  if(b<0) throw new Error(`end marker not found: ${label}`);
  s=s.slice(0,a)+newSection+s.slice(b);
  write(path,s);
  console.log(`applied: ${label}`);
}

replaceOnce("src/visual-engine.js","const VISUAL_TIMEOUT_MS=45000;","const VISUAL_TIMEOUT_MS=75000;","server visual timeout 75s");
replaceOnce("public/avatar-runtime-v15.js","setTimeout(()=>controller.abort(),48000)","setTimeout(()=>controller.abort(),85000)","avatar browser timeout 85s");

replaceSection(
  "public/visual-runtime-v17.js",
  "async function ensureAsset(payload){",
  "async function enhanceRoom(){",
`async function ensureAsset(payload){
  const key=JSON.stringify(payload);if(memory.has("asset:"+key))return memory.get("asset:"+key);
  const p=(async()=>{
    let lastError=new Error("비주얼 생성 실패");
    for(let attempt=1;attempt<=2;attempt++){
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),85000);
      try{
        const r=await fetch("/api/visual/ensure",{method:"POST",cache:"no-store",signal:controller.signal,headers:auth({"content-type":"application/json"}),body:JSON.stringify(payload)});
        const d=await r.json().catch(()=>({}));
        if(!r.ok||!d.ok||!d.url)throw new Error(d.error||\`visual \${r.status}\`);
        return d.url;
      }catch(e){
        lastError=e?.name==="AbortError"?new Error("비주얼 생성 시간이 길어 자동으로 다시 시도합니다."):e;
        if(attempt<2)await new Promise(resolve=>setTimeout(resolve,1200));
      }finally{clearTimeout(timer)}
    }
    throw lastError;
  })();
  memory.set("asset:"+key,p);try{return await p}catch(e){memory.delete("asset:"+key);throw e}
}
`,
  "shared room/pet retries"
);

replaceSection(
  "scripts/verify-deployment.mjs",
  "async function verifyAvatarAI(){",
  "async function fetchVisualFile",
`async function verifyAvatarAI(){
 let lastError=new Error("avatar AI verification failed");
 for(let attempt=1;attempt<=3;attempt++){
  const fd=new FormData();fd.append("image",new Blob([makeFacePng()],{type:"image/png"}),"ci-face.png");fd.append("style","나답게");fd.append("variant","0");
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90000);
  try{
   const r=await fetch(base+"/api/avatar/generate-v17",{method:"POST",body:fd,cache:"no-store",signal:controller.signal}),d=await r.json().catch(()=>({}));
   if(!r.ok||!d.ok||d.engine!=="v17"||typeof d.image!=="string"||!d.image.startsWith("data:image/jpeg;base64,"))throw new Error(\`avatar v17 generation failed: \${r.status} \${JSON.stringify(d).slice(0,300)}\`);
   const bytes=Buffer.from(d.image.split(",")[1]||"","base64");if(bytes.length<10000)throw new Error(\`avatar v17 image too small: \${bytes.length} bytes\`);
   console.log(\`PASS Workers AI photoreal avatar v17 bytes=\${bytes.length} attempt=\${attempt}\`);return;
  }catch(e){lastError=e?.name==="AbortError"?new Error("avatar verifier request timed out"):e;console.log(\`WAIT Workers AI avatar attempt \${attempt}/3: \${lastError.message}\`);if(attempt<3)await sleep(5000*attempt)}finally{clearTimeout(timer)}
 }
 throw lastError;
}
`,
  "E2E avatar retry policy"
);

replaceSection(
  "scripts/verify-deployment.mjs",
  "async function verifySharedVisuals(auth){",
  "async function saveTestAvatar",
`async function retryVisualJson(label,path,options){let lastError=new Error(\`\${label} failed\`);for(let attempt=1;attempt<=3;attempt++){try{return await jsonCall(path,options)}catch(e){lastError=e;console.log(\`WAIT \${label} attempt \${attempt}/3: \${e.message}\`);if(attempt<3)await sleep(3000*attempt)}}throw lastError}
async function verifySharedVisuals(auth){const room=await retryVisualJson("premium room generation","/api/visual/ensure",{method:"POST",headers:auth,body:{type:"room",roomStyle:"warm",level:1,time:"morning"}});if(!room.url||!room.key?.startsWith("visual-v17/shared/rooms/"))throw new Error(\`room visual response invalid \${JSON.stringify(room).slice(0,300)}\`);await fetchVisualFile(room.url,"premium room v17");const pet=await retryVisualJson("premium pet generation","/api/visual/ensure",{method:"POST",headers:auth,body:{type:"pet",petKind:"dog",petMode:"댕댕이형"}});if(!pet.url||!pet.key?.startsWith("visual-v17/shared/pets/"))throw new Error(\`pet visual response invalid \${JSON.stringify(pet).slice(0,300)}\`);await fetchVisualFile(pet.url,"premium pet v17");console.log(\`PASS visual-v17 shared cache roomCached=\${Boolean(room.cached)} petCached=\${Boolean(pet.cached)}\`)}
`,
  "E2E room/pet retry policy"
);

replaceOnce("preflight.mjs","\"48000\"","\"85000\"","preflight browser timeout contract");

const checks=[
  ["src/visual-engine.js","VISUAL_TIMEOUT_MS=75000"],
  ["public/avatar-runtime-v15.js","controller.abort(),85000"],
  ["public/visual-runtime-v17.js","attempt<=2"],
  ["public/visual-runtime-v17.js","controller.abort(),85000"],
  ["scripts/verify-deployment.mjs","attempt<=3"],
  ["scripts/verify-deployment.mjs","controller.abort(),90000"],
  ["scripts/verify-deployment.mjs","retryVisualJson"],
  ["preflight.mjs","\"85000\""]
];
for(const [path,needle] of checks){ if(!read(path).includes(needle)) throw new Error(`post-repair check failed: ${path} missing ${needle}`); }
console.log("Workers AI resilience repair applied and verified.");
