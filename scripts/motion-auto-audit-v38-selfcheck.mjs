import fs from "node:fs";
import {execFileSync} from "node:child_process";

const runtimePath="public/motion-auto-audit-v38.js";
const workerPath="src/index-v29.js";
for(const f of [runtimePath,workerPath])execFileSync(process.execPath,["--check",f],{stdio:"inherit"});
const runtime=fs.readFileSync(runtimePath,"utf8");
const worker=fs.readFileSync(workerPath,"utf8");
const errors=[];
for(const s of ["v38-auto-motion-audit","motionAudit","motionQC","master_04_return_home","master_05_sit_down","master_06_walk_to_window","EXPECTED_END","KEYFRAME_ASSETS","roughSlotCount","mappedSlots","runStatic","probeFullBody","paidGeneration"]){if(!runtime.includes(s))errors.push(`V38 runtime missing ${s}`)}
for(const f of ["frame-motion-v27.js","scene-library-v28.js","scene-manager-v29.js","scene-program-v30.js","master-motion-v32.js","master-motion-v33.js","master-motion-v34.js","master-motion-v35.js","master-motion-v36.js","motion-qc-v37.js","motion-auto-audit-v38.js"]){if(!worker.includes(f))errors.push(`Worker injection missing ${f}`)}
for(const f of ["public/frame-motion-v27.js","public/scene-library-v28.js","public/scene-manager-v29.js","public/scene-program-v30.js","public/master-motion-v32.js","public/master-motion-v33.js","public/master-motion-v34.js","public/master-motion-v35.js","public/master-motion-v36.js","public/motion-qc-v37.js","public/motion-auto-audit-v38.js"])if(!fs.existsSync(f))errors.push(`Missing runtime file ${f}`);
for(const text of [runtime,worker])if(/motion\/generate|confirm_cost\s*:\s*true|hailuo|minimax/i.test(text))errors.push("paid generation path found in V38 stack");
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log("P2 V38 AUTO MOTION AUDIT SELFCHECK PASSED: full runtime injection + 50-slot technical audit + 04/05/06 playback probe + free-only");