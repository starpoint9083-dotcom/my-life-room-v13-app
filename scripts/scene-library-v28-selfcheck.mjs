import fs from "node:fs";

const runtime=fs.readFileSync("public/scene-runtime-v28.js","utf8");
const bridge=fs.readFileSync("public/motion-runtime-v26.js","utf8");
const manifest=JSON.parse(fs.readFileSync("public/scene-library-v28-manifest.json","utf8"));
const errors=[];

for(const s of [
  'v28-scene-library','sceneV28Stage','sceneV28Video','playClip','startAmbient','playScene','runRoutine','playContext','fallbackFor','frameMotionV27','p2:scene-v28-ready','PRELOAD_GROUPS'
]) if(!runtime.includes(s)) errors.push(`V28 runtime missing ${s}`);

for(const s of [
  '/scene-runtime-v28.js?v=30','/scene-program-v30.js?v=30','loadSceneV28','loadProgramV30','sceneV28','sceneProgramV30','/frame-motion-v27.js?v=27','Paid video generation is disabled in P2'
]) if(!bridge.includes(s)) errors.push(`V30 bridge missing ${s}`);

if(manifest.version!=="v28-scene-library")errors.push("V28 manifest version mismatch");
if(manifest.plannerVersion!=="v30-smart-program")errors.push("V30 planner version mismatch");
if(manifest.freeOnly!==true)errors.push("V28 manifest freeOnly must be true");
if(manifest.paidGeneration!==false)errors.push("V28 manifest paidGeneration must be false");
if(manifest.styleBlend!=="30-real-70-animation")errors.push("V28 styleBlend mismatch");
if(!Array.isArray(manifest.scenes)||manifest.scenes.length!==50)errors.push("P2 V30 must reserve exactly 50 reusable scene slots");

const ids=new Set();
for(const scene of manifest.scenes||[]){
  if(!scene.id||ids.has(scene.id))errors.push(`duplicate or missing scene id ${scene.id||"?"}`);ids.add(scene.id);
  if(!scene.label)errors.push(`${scene.id} needs a mobile label`);
  if(!["ambient","transition"].includes(scene.type))errors.push(`${scene.id} invalid type`);
  if(scene.type==="ambient"&&(scene.durationMs<4000||scene.durationMs>6500))errors.push(`${scene.id} ambient duration out of range`);
  if(scene.type==="transition"&&(scene.durationMs<1000||scene.durationMs>3500))errors.push(`${scene.id} transition duration out of range`);
  if(scene.ready===true&&(!scene.src||typeof scene.src!=="string"))errors.push(`${scene.id} ready scene needs src`);
  if(!scene.start?.location||!scene.end?.location)errors.push(`${scene.id} needs start/end location`);
}

for(const required of ["morning","return_home","sofa_relax","window","pet","risk_calm","night","transition"]){
 if(!(manifest.scenes||[]).some(s=>s.group===required))errors.push(`missing scene group ${required}`)
}
for(const required of ["morning","return","day","evening","risk","night"]){
 if(!manifest.programs?.[required])errors.push(`missing V30 program ${required}`)
}
for(const [name,steps] of Object.entries(manifest.routines||{})){
  if(!Array.isArray(steps)||steps.length===0)errors.push(`routine ${name} is empty`);
  for(const step of steps){const isScene=ids.has(step),isGroup=(manifest.scenes||[]).some(s=>s.group===step);if(!isScene&&!isGroup)errors.push(`routine ${name} references unknown ${step}`)}
}

if(runtime.includes('/api/motion/generate')||runtime.includes('confirm_cost:true')||runtime.includes('minimax/hailuo'))errors.push("V28 runtime must not contain paid video generation path");
if(!bridge.includes('PROGRAM_ENGINE')||!bridge.includes('program()?.playCurrent')&&!bridge.includes('p.playCurrent'))errors.push("V30 program must be the primary scene path in bridge");
if(!bridge.includes('t==="day"||t==="leave"'))errors.push("V30 must stop human scenes while the avatar is away");

if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log(`SCENE LIBRARY V30 SELFCHECK PASSED: ${manifest.scenes.length} reusable scene slots + smart program + frame fallback + free-only policy`);
