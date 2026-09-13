import fs from "node:fs";
import {execFileSync} from "node:child_process";

for(const f of ["public/scene-program-v30.js","public/scene-runtime-v28.js","public/motion-runtime-v26.js","public/scene-manager-v29.js"]){
  execFileSync(process.execPath,["--check",f],{stdio:"inherit"});
}
const planner=fs.readFileSync("public/scene-program-v30.js","utf8");
const bridge=fs.readFileSync("public/motion-runtime-v26.js","utf8");
const manager=fs.readFileSync("public/scene-manager-v29.js","utf8");
const manifest=JSON.parse(fs.readFileSync("public/scene-library-v28-manifest.json","utf8"));
const errors=[];
for(const s of ["v30-smart-program","playMode","playCurrent","playRisk","ensureLocation","RECENT_MAX","saveData","p2:scene-v30-ready"]){if(!planner.includes(s))errors.push(`V30 planner missing ${s}`)}
for(const s of ["PROGRAM_ENGINE","scene-program-v30.js?v=30","playCurrentOrFallback","playRisk","openAlcohol","openSmoking","stopHumanScenes"]){if(!bridge.includes(s))errors.push(`V30 bridge missing ${s}`)}
for(const s of ["생활장면 50개 관리","sm29Filters","return_home","risk_calm","s.label||s.id","sceneProgramV30"]){if(!manager.includes(s))errors.push(`V30 manager missing ${s}`)}
if(manifest.plannerVersion!=="v30-smart-program")errors.push("manifest plannerVersion mismatch");
if(manifest.scenes?.length!==50)errors.push(`expected 50 scenes, got ${manifest.scenes?.length||0}`);
const ambient=(manifest.scenes||[]).filter(s=>s.type==="ambient").length,transitions=(manifest.scenes||[]).filter(s=>s.type==="transition").length;
if(ambient!==44||transitions!==6)errors.push(`expected 44 ambient + 6 transition, got ${ambient}+${transitions}`);
for(const text of [planner,manager])if(text.includes("/api/motion/generate")||text.includes("confirm_cost:true")||text.includes("minimax/hailuo"))errors.push("V30 must not contain paid video generation calls");
if(!planner.includes('document.hidden')||!bridge.includes('t==="day"||t==="leave"'))errors.push("V30 away/visibility safety missing");
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log("SCENE PROGRAM V30 SELFCHECK PASSED: 50 slots + smart context selection + mobile filters + free-only playback");
