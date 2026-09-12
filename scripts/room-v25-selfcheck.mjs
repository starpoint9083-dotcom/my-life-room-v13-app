import fs from "node:fs";
const room=fs.readFileSync("public/room-experience-v25.js","utf8");
const sw=fs.readFileSync("public/sw.js","utf8");
const errors=[];
for(const s of ["v25-room-experience-1","v25product","v25room","MY LIFE ROOM","roomExperience25Style","riskStrip","growthCard"])if(!room.includes(s))errors.push(`room v25 missing ${s}`);
for(const s of ["/room-experience-v25.js","injectRoomExperience","my-life-room-v25-room-shell"])if(!sw.includes(s))errors.push(`service worker missing ${s}`);
if(room.includes("/api/")||room.includes("confirm_cost")||room.includes("AI.run")||room.includes("fetch("))errors.push("room v25 must remain zero-cost UI only");
if(!room.includes('display:none!important')||!room.includes('.roomArt'))errors.push("legacy photoreal room art guard missing");
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log("ROOM V25 SELFCHECK PASSED: premium warm-animation shell, no AI generation, no paid calls");
