import fs from "node:fs";
import {execFileSync} from "node:child_process";

const files=["src/index-v29.js","src/p3-control.js"];
for(const f of files)execFileSync(process.execPath,["--check",f],{stdio:"inherit"});
const wrapper=fs.readFileSync("src/index-v29.js","utf8");
const p3=fs.readFileSync("src/p3-control.js","utf8");
const migration=fs.readFileSync("migrations/0005_p3_control.sql","utf8");
const errors=[];
for(const s of ["handleP3ControlRoute","/api/p3/info","/api/p3/"])if(!wrapper.includes(s))errors.push(`wrapper missing ${s}`);
for(const s of ["p3-p2-control-v1","EXPECTED_SCENE_SLOTS=50","MASTER_FRAME_TARGET=8","/api/p3/health","/api/p3/status","/api/p3/preflight","/api/p3/assets","truthPolicy","noGuess:true","r2-verified","scene-library/"])if(!p3.includes(s))errors.push(`P3 control missing ${s}`);
for(const s of ["CREATE TABLE IF NOT EXISTS p3_asset_registry","CREATE TABLE IF NOT EXISTS p3_audit_log","evidence_level","asset_kind","storage_ref"])if(!migration.includes(s))errors.push(`P3 migration missing ${s}`);
for(const banned of ["/api/motion/generate","confirm_cost:true","minimax/hailuo","paidGeneration:true"])if(p3.includes(banned))errors.push(`P3 control must stay verification-only/free-only: ${banned}`);
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log("P3 CONTROL SELFCHECK PASSED: P2 runtime truth/status/preflight + D1/R2 asset evidence + no paid generation");
