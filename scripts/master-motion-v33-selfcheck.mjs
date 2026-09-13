import fs from "node:fs";
import {execFileSync} from "node:child_process";
const runtime="public/master-motion-v33.js";
const program="public/scene-program-v30.js";
execFileSync(process.execPath,["--check",runtime],{stdio:"inherit"});
execFileSync(process.execPath,["--check",program],{stdio:"inherit"});
const js=fs.readFileSync(runtime,"utf8"),pg=fs.readFileSync(program,"utf8");
const errors=[];
for(const s of ["v33-keyframe-motion","v33.1-return-chain","playReturnChain","master_04_return_home","master_05_sit_down","master_06_walk_to_window","04_return_a.webp","04_return_b.webp","05_sit_a.webp","05_sit_b.webp","06_walk_a.webp","06_walk_b.webp","placeholderIdentity:true","paidGeneration:false","window.masterMotionV33","p2:master-motion-v33-ready"]){if(!js.includes(s))errors.push(`V33 runtime missing ${s}`)}
for(const f of ["04_return_a.webp","04_return_b.webp","05_sit_a.webp","05_sit_b.webp","06_walk_a.webp","06_walk_b.webp"]){if(!fs.existsSync(`public/assets/master-motion-v33/${f}`))errors.push(`missing keyframe ${f}`)}
for(const s of ["/master-motion-v33.js?v=33","/master-motion-v32.js?v=32","window.masterMotionV33||window.masterMotionV32","master()?.playForMode"]){if(!pg.includes(s))errors.push(`planner bridge missing ${s}`)}
if(!js.includes('const first=await play("master_04_return_home")')||!js.includes('const second=await play("master_05_sit_down")'))errors.push("return chain must await 04 then 05");
if(!js.includes("await sleep(swapAt)")||!js.includes("await sleep(remaining)"))errors.push("keyframe playback must await its full duration");
if(!js.includes("Math.min(1400,cfg.duration)")||!js.includes("cleanupVisual();current=\"\";source=\"\";return true"))errors.push("reduced-motion cleanup missing");
if(js.includes("returnToggle"))errors.push("legacy alternating return behavior must be removed");
if(/motion\/generate|confirm_cost\s*:\s*true|hailuo|minimax/i.test(js))errors.push("paid generation path found");
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log("P2 V33.1 SELFCHECK PASSED: return 04->05 chain + evening 06 + awaited keyframes + V32 fallback + free-only");
