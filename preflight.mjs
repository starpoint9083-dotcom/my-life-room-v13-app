import fs from "node:fs";
const html=fs.readFileSync("public/index.html","utf8");
const runtime=fs.readFileSync("public/runtime-v14.js","utf8");
const worker=fs.readFileSync("src/index.js","utf8");
const life=fs.readFileSync("src/life-engine.js","utf8");
const sql1=fs.readFileSync("migrations/0001_init.sql","utf8");
const sql2=fs.readFileSync("migrations/0002_auth_and_risk.sql","utf8");
const sql3=fs.readFileSync("migrations/0003_life_engine.sql","utf8");
const manifest=JSON.parse(fs.readFileSync("public/manifest.webmanifest","utf8"));
const sw=fs.readFileSync("public/sw.js","utf8");
const wrangler=JSON.parse(fs.readFileSync("wrangler.jsonc","utf8"));
const settings=JSON.parse(fs.readFileSync("deploy.settings.json","utf8"));
const prepare=fs.readFileSync("scripts/prepare-cloudflare.mjs","utf8");
const verify=fs.readFileSync("scripts/verify-deployment.mjs","utf8");

const errors=[];
for(const fn of ["finishSetup","applyHome","setTime","setDay","openMorning","openAlcohol","openSmoking","generateCandidates","saveState","checkServerSync","pushServerState","loadServerState","applySceneAssets","fetchRiskProfile","recordHabitSignal","setupPWAInstall"]){
  if(!html.includes(`function ${fn}(`)&&!html.includes(`async function ${fn}(`))errors.push(`missing function ${fn}`);
}
for(const route of ["/api/health","/api/avatar/generate","/api/avatar/save","/api/state","/api/event","/api/signal","/api/risk-profile"]){
  if(!worker.includes(route))errors.push(`missing route ${route}`);
}
for(const route of ["/api/life/summary","/api/life/profile","/api/life/daily","/api/life/smoking","/api/life/condition","/api/life/message"]){
  if(!life.includes(route))errors.push(`missing life route ${route}`);
}
for(const t of ["app_state","app_events","avatars"]){if(!sql1.includes(`CREATE TABLE IF NOT EXISTS ${t}`))errors.push(`missing table ${t}`)}
for(const t of ["device_auth","habit_signals"]){if(!sql2.includes(`CREATE TABLE IF NOT EXISTS ${t}`))errors.push(`missing table ${t}`)}
for(const t of ["life_profiles","life_daily","clear_messages"]){if(!sql3.includes(`CREATE TABLE IF NOT EXISTS ${t}`))errors.push(`missing table ${t}`)}
for(const key of ["const ACTIONS = [","const HIDDEN_CHANGES=[","const ASSET_MANIFEST ="]){if(!html.includes(key))errors.push(`missing engine ${key}`)}
for(const key of ["실사용 엔진","맑은 나의 메시지","syncDaily","syncSmoking","syncCondition","riskTick"]){if(!runtime.includes(key))errors.push(`missing runtime feature ${key}`)}
if(!worker.includes("crypto.subtle.digest"))errors.push("device token hashing missing");
if(!worker.includes("env.DB"))errors.push("worker D1 binding usage missing");
if(!worker.includes("env.AVATAR_ASSETS"))errors.push("worker R2 binding usage missing");
if(!worker.includes("handleLifeRoute"))errors.push("life engine route bridge missing");
if(!worker.includes("/runtime-v14.js"))errors.push("live runtime injection missing");
if(manifest.display!=="standalone")errors.push("PWA manifest invalid");
if(!sw.includes("serviceWorker")&&!sw.includes("fetch"))errors.push("service worker invalid");
for(const f of ["deploy.settings.json","scripts/prepare-cloudflare.mjs","scripts/verify-deployment.mjs","src/life-engine.js","public/runtime-v14.js","migrations/0003_life_engine.sql"]){
  if(!fs.existsSync(f))errors.push(`missing deploy file ${f}`);
}
if(wrangler.name!==settings.worker_name)errors.push(`worker name mismatch: ${wrangler.name} != ${settings.worker_name}`);
if(wrangler.main!=="src/index.js")errors.push("wrangler main entry invalid");
if(wrangler.ai?.binding!==settings.ai_binding)errors.push("Workers AI binding mismatch");
if(wrangler.assets?.binding!=="ASSETS")errors.push("static assets binding mismatch");
if(wrangler.assets?.directory!=="./public")errors.push("static assets directory mismatch");
for(const needle of ["d1\",\"create", "r2\",\"bucket\",\"create", "d1_databases", "r2_buckets", "migrations\",\"apply", "wrangler.production.jsonc"]){
  if(!prepare.includes(needle))errors.push(`prepare script missing ${needle}`);
}
for(const needle of ["/api/health", "d?.ai===true", "d?.d1===true", "d?.r2===true", "DEPLOYMENT VERIFIED"]){
  if(!verify.includes(needle))errors.push(`verify script missing ${needle}`);
}
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log("V13 live-room preflight passed");