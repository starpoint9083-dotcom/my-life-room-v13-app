import fs from "node:fs";
import {execFileSync} from "node:child_process";

const runtimePath="public/master-motion-v35.js";
const programPath="public/scene-program-v30.js";
const manifestPath="public/scene-library-v28-manifest.json";
const mapPath="public/master-motion-v34-map.json";
for(const f of [runtimePath,programPath])execFileSync(process.execPath,["--check",f],{stdio:"inherit"});

const runtime=fs.readFileSync(runtimePath,"utf8");
const program=fs.readFileSync(programPath,"utf8");
const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
const map=JSON.parse(fs.readFileSync(mapPath,"utf8"));
const errors=[];
const flexible=new Set(["master_01_sofa_relax","master_02_window_gaze","master_03_pet_touch","master_07_morning_life","master_08_night_rest"]);
const fixed={
 master_04_return_home:{start:{location:"entry",pose:"standing"},end:{location:"entry",pose:"standing"}},
 master_05_sit_down:{start:{location:"entry",pose:"standing"},end:{location:"sofa",pose:"seated"}},
 master_06_walk_to_window:{start:{location:"sofa",pose:"seated"},end:{location:"window",pose:"standing"}}
};
const norm=s=>({location:s?.location==="pet"?"sofa":String(s?.location||"home"),pose:String(s?.pose||"standing")});
const same=(a,b)=>{const x=norm(a),y=norm(b);return x.location===y.location&&x.pose===y.pose};
const counts={exact:0,adaptive:0,"end-match":0,"start-match":0,"soft-transition":0,rough:0,missing:0};
for(const s of manifest.scenes||[]){
 const m=map.slots?.[s.id];if(!m){counts.missing++;errors.push(`unmapped ${s.id}`);continue}
 if(flexible.has(m)){counts[s.type==="transition"?"soft-transition":"adaptive"]++;continue}
 const f=fixed[m];if(!f){counts.rough++;continue}
 const a=same(s.start,f.start),b=same(s.end,f.end);
 if(a&&b)counts.exact++;else if(b)counts["end-match"]++;else if(a)counts["start-match"]++;else counts.rough++
}
const total=Object.values(counts).reduce((a,b)=>a+b,0);
if(manifest.scenes?.length!==50||total!==50)errors.push(`expected 50 continuity classifications, got ${total}`);
if(counts.missing!==0)errors.push(`missing mapped slots: ${counts.missing}`);
if(counts.rough!==0)errors.push(`unroutable rough slots: ${counts.rough}`);
if((manifest.scenes||[]).filter(s=>s.type==="transition").length!==6)errors.push("transition count must remain 6");
for(const s of ["v35-continuity-qc","continuityReport","qualityForSlot","scoreSlot","normalizeLocation","routeTo","playForSlot","playTransition","logicalLocation","roughSlotCount","p2:master-motion-v35-ready","paidGeneration:false"]){if(!runtime.includes(s))errors.push(`V35 runtime missing ${s}`)}
for(const s of ["/master-motion-v35.js?v=35","/master-motion-v34.js?v=34","window.masterMotionV35||window.masterMotionV34||window.masterMotionV33||window.masterMotionV32","scoreSlot","continuityQC","roughSlotCount","p2:master-motion-v35-ready"]){if(!program.includes(s))errors.push(`V35 planner bridge missing ${s}`)}
for(const text of [runtime,program])if(/motion\/generate|confirm_cost\s*:\s*true|hailuo|minimax/i.test(text))errors.push("paid generation path found in V35");
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log(`P2 V35 CONTINUITY SELFCHECK PASSED: 50/50 classified; exact=${counts.exact}, adaptive=${counts.adaptive}, end-match=${counts["end-match"]}, start-match=${counts["start-match"]}, soft-transition=${counts["soft-transition"]}, rough=0; free-only`);
