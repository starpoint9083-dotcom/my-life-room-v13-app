import fs from "node:fs";
const server=fs.readFileSync("src/visual-engine.js","utf8");
const runtime=fs.readFileSync("public/motion-runtime-v26.js","utf8");
const avatar=fs.readFileSync("public/avatar-runtime-v15.js","utf8");
const errors=[];
for(const s of ["MOTION_VERSION=\"v26-natural-motion\"","minimax/hailuo-2.3-fast","MOTION_DURATION=6","ambient","walk-sit","stand-walk","pet-touch","window-look","stretch","/api/motion/status","/api/motion/generate","/api/motion/file","confirm_cost!==true","Natural adult anatomy","weight transfer","No foot sliding","no morphing","motion-v26/hybrid3070/"])if(!server.includes(s))errors.push(`motion server missing ${s}`);
for(const s of ["v26-natural-motion","motion26Stage","walk-sit","stand-walk","pet-touch","window-look","startAmbient","playOneShot","loadHybrid","/api/avatar/hybrid-current","/api/motion/status","/api/motion/file","/api/motion/generate","confirm_cost:true","30:70 애니영화형"]){if(!runtime.includes(s)&&s!=="30:70 애니영화형")errors.push(`motion runtime missing ${s}`)}
for(const s of ["loadMotion26","motion-runtime-v26.js?v=26"]){if(!avatar.includes(s))errors.push(`avatar loader missing ${s}`)}
if(runtime.includes("setInterval(()=>{avatar")||runtime.includes("translateY")&&runtime.includes("robot"))errors.push("puppet-style fake motion heuristic detected");
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log("MOTION V26 NATURAL FILM SELFCHECK PASSED");
