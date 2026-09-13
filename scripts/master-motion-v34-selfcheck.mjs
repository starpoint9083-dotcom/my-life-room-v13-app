import fs from "node:fs";
import {execFileSync} from "node:child_process";

const runtimePath="public/master-motion-v34.js";
const mapPath="public/master-motion-v34-map.json";
const programPath="public/scene-program-v30.js";
const sceneManifestPath="public/scene-library-v28-manifest.json";
for(const f of [runtimePath,programPath])execFileSync(process.execPath,["--check",f],{stdio:"inherit"});

const runtime=fs.readFileSync(runtimePath,"utf8");
const program=fs.readFileSync(programPath,"utf8");
const map=JSON.parse(fs.readFileSync(mapPath,"utf8"));
const sceneManifest=JSON.parse(fs.readFileSync(sceneManifestPath,"utf8"));
const errors=[];
const slots=map.slots||{};
const sceneIds=(sceneManifest.scenes||[]).map(s=>s.id);
const transitionIds=(sceneManifest.scenes||[]).filter(s=>s.type==="transition").map(s=>s.id);
const masterIds=new Set(Object.values(slots));

if(map.version!=="v34-eight-to-fifty")errors.push("wrong V34 map version");
if(map.freeOnly!==true||map.paidGeneration!==false)errors.push("V34 free-only lock missing");
if(map.masterCount!==8||masterIds.size!==8)errors.push(`expected 8 masters, got ${masterIds.size}`);
if(map.slotCount!==50||Object.keys(slots).length!==50)errors.push(`expected 50 mapped slots, got ${Object.keys(slots).length}`);
if(sceneIds.length!==50)errors.push(`scene manifest must stay at 50 slots, got ${sceneIds.length}`);
for(const id of sceneIds)if(!slots[id])errors.push(`unmapped scene slot ${id}`);
for(const id of Object.keys(slots))if(!sceneIds.includes(id))errors.push(`unknown mapped slot ${id}`);
if(transitionIds.length!==6)errors.push(`expected 6 transition slots, got ${transitionIds.length}`);
for(const id of transitionIds)if(!slots[id])errors.push(`unmapped transition ${id}`);
for(let i=1;i<=8;i++){const p=`master_${String(i).padStart(2,"0")}_`;if(![...masterIds].some(id=>id.startsWith(p)))errors.push(`master ${i} absent from 50-slot map`)}
for(const s of ["v34-eight-to-fifty","playForSlot","playTransition","playAllMasters","mappedSlots","missingSlots","window.masterMotionV34","p2:master-motion-v34-ready","master_04_return_home","master_05_sit_down","master_06_walk_to_window"]){if(!runtime.includes(s))errors.push(`V34 runtime missing ${s}`)}
for(const s of ["/master-motion-v34.js?v=34","window.masterMotionV34||window.masterMotionV33||window.masterMotionV32","playForSlot","playTransition","mappedFallbackSlots","mode===\"day\""]){if(!program.includes(s))errors.push(`V30/V34 planner bridge missing ${s}`)}
for(const text of [runtime,program,JSON.stringify(map)])if(/motion\/generate|confirm_cost\s*:\s*true|hailuo|minimax/i.test(text))errors.push("paid generation path found in V34");
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log("P2 V34 SELFCHECK PASSED: 8 masters structurally cover all 50 slots + 6 transitions + V33/V32 fallback + free-only");
