import fs from "node:fs";
const html=fs.readFileSync("public/index.html","utf8");
const worker=fs.readFileSync("src/index.js","utf8");
const sql1=fs.readFileSync("migrations/0001_init.sql","utf8");
const sql2=fs.readFileSync("migrations/0002_auth_and_risk.sql","utf8");
const manifest=JSON.parse(fs.readFileSync("public/manifest.webmanifest","utf8"));
const sw=fs.readFileSync("public/sw.js","utf8");

const errors=[];
for(const fn of ["finishSetup","applyHome","setTime","setDay","openMorning","openAlcohol","openSmoking","generateCandidates","saveState","checkServerSync","pushServerState","loadServerState","applySceneAssets","fetchRiskProfile","recordHabitSignal","setupPWAInstall"]){
  if(!html.includes(`function ${fn}(`)&&!html.includes(`async function ${fn}(`))errors.push(`missing function ${fn}`);
}
for(const route of ["/api/health","/api/avatar/generate","/api/avatar/save","/api/state","/api/event","/api/signal","/api/risk-profile"]){
  if(!worker.includes(route))errors.push(`missing route ${route}`);
}
for(const t of ["app_state","app_events","avatars"]){if(!sql1.includes(`CREATE TABLE IF NOT EXISTS ${t}`))errors.push(`missing table ${t}`)}
for(const t of ["device_auth","habit_signals"]){if(!sql2.includes(`CREATE TABLE IF NOT EXISTS ${t}`))errors.push(`missing table ${t}`)}
for(const key of ["const ACTIONS = [","const HIDDEN_CHANGES=[","const ASSET_MANIFEST ="]){if(!html.includes(key))errors.push(`missing engine ${key}`)}
if(!worker.includes("crypto.subtle.digest"))errors.push("device token hashing missing");
if(manifest.display!=="standalone")errors.push("PWA manifest invalid");
if(!sw.includes("serviceWorker")&&!sw.includes("fetch"))errors.push("service worker invalid");
for(const f of ["deploy.settings.json","scripts/prepare-cloudflare.mjs","scripts/verify-deployment.mjs"]){
  if(!fs.existsSync(f))errors.push(`missing deploy file ${f}`);
}
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log("V13 preflight passed");
