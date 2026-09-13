import fs from "node:fs";
import {execFileSync} from "node:child_process";
const qcPath="public/motion-qc-v37.js";
const v36Path="public/master-motion-v36.js";
for(const f of [qcPath,v36Path])execFileSync(process.execPath,["--check",f],{stdio:"inherit"});
const qc=fs.readFileSync(qcPath,"utf8"),v36=fs.readFileSync(v36Path,"utf8");
const errors=[];
for(const s of ["v37-motion-qc","motionQC","P2 모션 검수 V37","1~8 자동","50 자동","문제없음","어색함","localStorage","autoMasters","autoScenes","p2:motion-qc-v37-ready"]){if(!qc.includes(s))errors.push(`V37 QC missing ${s}`)}
for(const s of ["/motion-qc-v37.js?v=37","motionQC","data-motion-qc-v37","requestQc()"]){if(!v36.includes(s))errors.push(`V36 QC loader missing ${s}`)}
if(!qc.includes('if(!new URLSearchParams(location.search).has("motionQC"))return'))errors.push("V37 must be query-gated");
if(/motion\/generate|confirm_cost\s*:\s*true|hailuo|minimax/i.test(qc+v36))errors.push("paid generation path found in V37");
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log("P2 V37 MOTION QC SELFCHECK PASSED: hidden mobile QA + 8 masters + 50 slots + local feedback + free-only");
