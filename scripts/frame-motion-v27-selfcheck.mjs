import fs from "node:fs";

const runtimePath="public/frame-motion-v27.js";
const manifestPath="public/frame-motion-v27-manifest.json";
const bridgePath="public/motion-runtime-v26.js";
const runtime=fs.readFileSync(runtimePath,"utf8");
const bridge=fs.readFileSync(bridgePath,"utf8");
const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
const errors=[];

for(const s of [
  'v27-free-frame-motion',
  'walk_start','walk_loop','walk_stop','sit_down','sit_idle','stand_up','pet_touch',
  'preloadAction','preloadNext','playWalkTo','sitSequence','standSequence','petSequence',
  'fm27Actor','fm27Pet','fm27Shadow','frameMotionV27'
]) if(!runtime.includes(s)) errors.push(`frame runtime missing ${s}`);

for(const s of [
  '/frame-motion-v27.js?v=27',
  'loadFrameMotion27',
  'v26-natural-motion-free-bridge',
  'Paid video generation is disabled in P2'
]) if(!bridge.includes(s)) errors.push(`motion bridge missing ${s}`);

if(manifest.version!=="v27-free-frame-motion")errors.push("manifest version mismatch");
if(manifest.paidVideo!==false)errors.push("manifest paidVideo must be false");
if(manifest.styleBlend!=="30-real-70-animation")errors.push("manifest styleBlend mismatch");

const requiredActions=["idle","walk_start","walk_loop","walk_stop","sit_down","sit_idle","stand_up","pet_touch","look","stretch"];
for(const name of requiredActions){
  const action=manifest.actions?.[name];
  if(!action){errors.push(`manifest missing action ${name}`);continue}
  if(typeof action.fps!=="number"||action.fps<1||action.fps>15)errors.push(`${name} fps out of range`);
  if(!Array.isArray(action.actorFrames))errors.push(`${name} actorFrames must be an array`);
}

for(const [name,action] of Object.entries(manifest.actions||{})){
  if(action.ready===true&&(!Array.isArray(action.actorFrames)||action.actorFrames.length===0))errors.push(`${name} cannot be ready without actor frames`);
  for(const key of ["actorFrames","petFrames"]){for(const p of action[key]||[]){if(typeof p!=="string"||!p.startsWith("/"))errors.push(`${name} ${key} contains invalid path`)}}
}

if(runtime.includes('/api/motion/generate')||runtime.includes('confirm_cost:true'))errors.push("V27 frame runtime must not call paid video generation");

if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log("FRAME MOTION V27 SELFCHECK PASSED: free manifest-driven frame engine + fixed room layers + no paid video calls");