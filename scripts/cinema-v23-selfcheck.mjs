import fs from "node:fs";
const server=fs.readFileSync("src/cinema-engine.js","utf8");
const worker=fs.readFileSync("src/index.js","utf8");
const runtime=fs.readFileSync("public/cinema-runtime-v23.js","utf8");
const sw=fs.readFileSync("public/sw.js","utf8");
const errors=[];
for(const s of ["v23-pilot","minimax/hailuo-2.3-fast","base-morning","base-evening","base-night","state-success","state-steady","state-recovery","action-avatar","action-pet","action-room","confirm_cost!==true","/api/cinema/status","/api/cinema/generate","/api/cinema/file","cinema-v23/pilot/"])if(!server.includes(s))errors.push(`cinema server missing ${s}`);
for(const s of ["handleCinemaRoute","CINEMA_INFO","/cinema-runtime-v23.js","cinemaEngine:CINEMA_INFO.version"] )if(!worker.includes(s))errors.push(`worker bridge missing ${s}`);
for(const s of ["cinema23Stage","cinema23Video","blobUrl","URL.createObjectURL","playOneShot","playAction","base-morning","state-success","action-avatar","combinations:27","clipSlots:9","cinemaSetup","confirm_cost:true"] )if(!runtime.includes(s))errors.push(`cinema runtime missing ${s}`);
if(runtime.includes("<source")||runtime.includes("src=\"/api/cinema/file"))errors.push("cinema video must not bypass authenticated blob fetch");
if(!sw.includes("/cinema-runtime-v23.js")||!sw.includes('const CINEMA="pilot1"'))errors.push("service worker missing cinema pilot runtime");
const slots=(server.match(/"(?:base|state|action)-[a-z]+"/g)||[]).filter((x,i,a)=>a.indexOf(x)===i);if(slots.length!==9)errors.push(`expected 9 unique cinema slots, found ${slots.length}`);
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log("CINEMA V23 PILOT SELFCHECK PASSED: 9 clips -> 27 flows, authenticated playback, explicit-cost generation guard");
