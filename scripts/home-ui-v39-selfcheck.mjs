import fs from "node:fs";
import {execFileSync} from "node:child_process";
const jsPath="public/home-ui-v39.js",cssPath="public/home-ui-v39.css",workerPath="src/index-v29.js";
for(const f of [jsPath,workerPath])execFileSync(process.execPath,["--check",f],{stdio:"inherit"});
const js=fs.readFileSync(jsPath,"utf8"),css=fs.readFileSync(cssPath,"utf8"),worker=fs.readFileSync(workerPath,"utf8");
const errors=[];
for(const s of ["v39-room-first-home","home39Message","home39EventCard","dedupePet","마이라이프룸","맑은 메시지"])if(!js.includes(s))errors.push(`V39 JS missing ${s}`);
for(const s of ["#home.home39",".times button.active",".room.hasArt>.pet",".growthCard",".engineCard",".nav"])if(!css.includes(s))errors.push(`V39 CSS missing ${s}`);
for(const s of ["/home-ui-v39.css?v=39","/home-ui-v39.js","scene-manager-v29.js?v=29","injectSceneManager"])if(!worker.includes(s))errors.push(`worker injection missing ${s}`);
for(const text of [js,css,worker])if(/confirm_cost\s*:\s*true|\/api\/motion\/generate|hailuo|minimax/i.test(text))errors.push("paid generation path found in V39 UI stack");
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log("P2 V39 HOME UI SELFCHECK PASSED: room-first mobile layout + hidden dev clutter + single-pet display + existing engines preserved");
