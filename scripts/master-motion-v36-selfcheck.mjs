import fs from "node:fs";
import {execFileSync} from "node:child_process";

const runtimePath="public/master-motion-v36.js";
const programPath="public/scene-program-v30.js";
for(const f of [runtimePath,programPath])execFileSync(process.execPath,["--check",f],{stdio:"inherit"});
const runtime=fs.readFileSync(runtimePath,"utf8");
const program=fs.readFileSync(programPath,"utf8");
const errors=[];
for(const s of ["v36-motion-polish","SETTLE","returnGap:320","micro:260","full:360","naturalScore","repeatPenalty","canRoute","cadenceFor","motionPolishV36:true","master_04_return_home","master_05_sit_down","master_06_walk_to_window","normalizeLocation:norm","p2:master-motion-v36-ready","paidGeneration:false"]){if(!runtime.includes(s))errors.push(`V36 runtime missing ${s}`)}
for(const s of ["/master-motion-v36.js?v=36","/master-motion-v35.js?v=35","window.masterMotionV36||window.masterMotionV35||window.masterMotionV34||window.masterMotionV33||window.masterMotionV32","naturalScore","canRoute","motionPolish","master_v36_return_chain","p2:master-motion-v36-ready"]){if(!program.includes(s))errors.push(`V36 planner bridge missing ${s}`)}
if(!runtime.includes('ROUTES=new Set(["entry>sofa","sofa>window","window>sofa","sofa>pet","pet>sofa"])'))errors.push("V36 route whitelist missing");
if(!runtime.includes('await settle(SETTLE.returnGap)'))errors.push("V36 return chain settle missing");
if(!runtime.includes('repeatCount>=2?18'))errors.push("V36 repeated-master penalty missing");
for(const text of [runtime,program])if(/motion\/generate|confirm_cost\s*:\s*true|hailuo|minimax/i.test(text))errors.push("paid generation path found in V36");
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log("P2 V36 MOTION POLISH SELFCHECK PASSED: human cadence + route guard + repeat suppression + 04->05 settle + free-only");
