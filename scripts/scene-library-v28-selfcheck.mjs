import fs from "node:fs";

const runtime=fs.readFileSync("public/scene-runtime-v28.js","utf8");
const bridge=fs.readFileSync("public/motion-runtime-v26.js","utf8");
const manifest=JSON.parse(fs.readFileSync("public/scene-library-v28-manifest.json","utf8"));
const errors=[];

for(const s of [
  'v28-scene-library','sceneV28Stage','sceneV28Video','playClip','startAmbient','playScene','runRoutine','playContext','fallbackFor','frameMotionV27','p2:scene-v28-ready'
]) if(!runtime.includes(s)) errors.push(`V28 runtime missing ${s}`);

for(const s of [
  '/scene-runtime-v28.js?v=28','loadSceneV28','sceneV28','/frame-motion-v27.js?v=27','loadFrameMotion27','Paid video generation is disabled in P2'
]) if(!bridge.includes(s)) errors.push(`V28 bridge missing ${s}`);

if(manifest.version!=="v28-scene-library")errors.push("V28 manifest version mismatch");
if(manifest.freeOnly!==true)errors.push("V28 manifest freeOnly must be true");
if(manifest.paidGeneration!==false)errors.push("V28 manifest paidGeneration must be false");
if(manifest.styleBlend!=="30-real-70-animation")errors.push("V28 styleBlend mismatch");
if(!Array.isArray(manifest.scenes)||manifest.scenes.length<15)errors.push("V28 must reserve at least 15 reusable scenes");

const ids=new Set();
for(const scene of manifest.scenes||[]){
  if(!scene.id||ids.has(scene.id))errors.push(`duplicate or missing scene id ${scene.id||"?"}`);ids.add(scene.id);
  if(!["ambient","transition"].includes(scene.type))errors.push(`${scene.id} invalid type`);
  if(scene.type==="ambient"&&(scene.durationMs<4000||scene.durationMs>6500))errors.push(`${scene.id} ambient duration out of range`);
  if(scene.type==="transition"&&(scene.durationMs<1000||scene.durationMs>3500))errors.push(`${scene.id} transition duration out of range`);
  if(scene.ready===true&&(!scene.src||typeof scene.src!=="string"))errors.push(`${scene.id} ready scene needs src`);
  if(!scene.start?.location||!scene.end?.location)errors.push(`${scene.id} needs start/end location`);
}

for(const [name,steps] of Object.entries(manifest.routines||{})){
  if(!Array.isArray(steps)||steps.length===0)errors.push(`routine ${name} is empty`);
  for(const step of steps){const isScene=ids.has(step),isGroup=(manifest.scenes||[]).some(s=>s.group===step);if(!isScene&&!isGroup)errors.push(`routine ${name} references unknown ${step}`)}
}

if(runtime.includes('/api/motion/generate')||runtime.includes('confirm_cost:true')||runtime.includes('minimax/hailuo'))errors.push("V28 runtime must not contain paid video generation path");
if(!bridge.includes('SCENE_ENGINE')||!bridge.includes('scene()?.playContext')&&!bridge.includes('sc.playContext'))errors.push("V28 must be the primary scene path in bridge");

if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log(`SCENE LIBRARY V28 SELFCHECK PASSED: ${manifest.scenes.length} reusable scene slots + frame fallback + free-only policy`);
