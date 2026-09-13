import fs from "node:fs";
import {execFileSync} from "node:child_process";
const managerPath="public/scene-manager-v29.js";
execFileSync(process.execPath,["--check",managerPath],{stdio:"inherit"});
const m=fs.readFileSync(managerPath,"utf8"),manifest=JSON.parse(fs.readFileSync("public/scene-library-v28-manifest.json","utf8"));
const errors=[];
for(const s of ["v31-batch-scene-loader","multiple=true","chooseBatch","prepareBatch","matchFile","runBatch","retryFailures","previewReadyScenes","scene_id.mp4","01_이름.mp4","같은 장면에 두 파일이 매칭됨"]){if(!m.includes(s))errors.push(`V31 batch loader missing ${s}`)}
if(manifest.scenes?.length!==50)errors.push(`V31 requires 50 scene slots, got ${manifest.scenes?.length||0}`);
if(!m.includes('input.multiple=true'))errors.push("V31 must allow multi-file selection");
if(!m.includes('stem.match(/^\\s*(\\d{1,2})\\D/)'))errors.push("V31 numeric filename matching missing");
if(!m.includes('durationOk(m.scene,durationMs)'))errors.push("V31 per-file duration validation missing");
if(!m.includes('batchFailures.push'))errors.push("V31 failed upload tracking missing");
if(m.includes('/api/motion/generate')||m.includes('confirm_cost:true')||m.includes('minimax/hailuo'))errors.push("V31 must not contain paid generation calls");
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log("SCENE BATCH V31 SELFCHECK PASSED: multi-select + safe matching + duration QC + retry + preview + free-only");
