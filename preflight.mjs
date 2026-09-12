import fs from "node:fs";
const html=fs.readFileSync("public/index.html","utf8");
const runtime=fs.readFileSync("public/runtime-v14.js","utf8");
const avatarRuntime=fs.readFileSync("public/avatar-runtime-v15.js","utf8");
const resetRuntime=fs.readFileSync("public/reset-runtime-v16.js","utf8");
const visualRuntime=fs.readFileSync("public/visual-runtime-v17.js","utf8");
const roomRuntime=fs.readFileSync("public/room-runtime-v19.js","utf8");
const poseRuntime=fs.readFileSync("public/pose-runtime-v20.js","utf8");
const coreRuntime=fs.readFileSync("public/core-runtime-v21.js","utf8");
const continuityRuntime=fs.readFileSync("public/continuity-runtime-v22.js","utf8");
const cinemaRuntime=fs.readFileSync("public/cinema-runtime-v23.js","utf8");
const cinemaBackgroundClient=fs.readFileSync("public/cinema-background-v23.js","utf8");
const worker=fs.readFileSync("src/index.js","utf8");
const life=fs.readFileSync("src/life-engine.js","utf8");
const visual=fs.readFileSync("src/visual-engine.js","utf8");
const cinema=fs.readFileSync("src/cinema-engine.js","utf8");
const cinemaBackground=fs.readFileSync("src/cinema-background.js","utf8");
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
for(const fn of ["finishSetup","applyHome","setTime","setDay","openMorning","openAlcohol","openSmoking","generateCandidates","saveState","checkServerSync","pushServerState","loadServerState","applySceneAssets","fetchRiskProfile","recordHabitSignal","setupPWAInstall","resetAll","avatarTap","petTap","plantTap","previewLevel"]){if(!html.includes(`function ${fn}(`)&&!html.includes(`async function ${fn}(`))errors.push(`missing function ${fn}`)}
for(const route of ["/api/health","/api/avatar/generate","/api/avatar/save","/api/state","/api/event","/api/signal","/api/risk-profile"]){if(!worker.includes(route))errors.push(`missing route ${route}`)}
for(const route of ["/api/life/summary","/api/life/profile","/api/life/daily","/api/life/smoking","/api/life/condition","/api/life/message","/api/life/reset"]){if(!life.includes(route))errors.push(`missing life route ${route}`)}
for(const route of ["/api/avatar/generate-v17","/api/avatar/pose","/api/avatar/pose/file","/api/visual/file","/api/visual/ensure"]){if(!visual.includes(route))errors.push(`missing visual route ${route}`)}
for(const route of ["/api/cinema/status","/api/cinema/generate","/api/cinema/file"]){if(!cinema.includes(route))errors.push(`missing cinema route ${route}`)}
for(const route of ["/api/cinema/batch/start","/api/cinema/batch/status","/api/cinema/batch/public"]){if(!cinemaBackground.includes(route))errors.push(`missing cinema background route ${route}`)}
for(const t of ["app_state","app_events","avatars"]){if(!sql1.includes(`CREATE TABLE IF NOT EXISTS ${t}`))errors.push(`missing table ${t}`)}
for(const t of ["device_auth","habit_signals"]){if(!sql2.includes(`CREATE TABLE IF NOT EXISTS ${t}`))errors.push(`missing table ${t}`)}
for(const t of ["life_profiles","life_daily","clear_messages"]){if(!sql3.includes(`CREATE TABLE IF NOT EXISTS ${t}`))errors.push(`missing table ${t}`)}
for(const key of ["const ACTIONS = [","const HIDDEN_CHANGES=[","const ASSET_MANIFEST ="]){if(!html.includes(key))errors.push(`missing engine ${key}`)}
for(const key of ["실사용 엔진","맑은 나의 메시지","syncDaily","syncSmoking","syncCondition","riskTick"]){if(!runtime.includes(key))errors.push(`missing runtime feature ${key}`)}
for(const key of ["progressiveGenerate","fetchOneAvatar","AbortController","85000","/api/avatar/generate-v17","loadVisual17"]){if(!avatarRuntime.includes(key))errors.push(`missing avatar v17 bridge ${key}`)}
for(const key of ["setupReset","fullReset","stopSaving","/api/life/reset","localStorage.removeItem","caches.keys()","window.resetAll=setupReset","window.__resetLock","loadP2Continuity","continuity-runtime-v22.js","p2-continuity"]){if(!resetRuntime.includes(key))errors.push(`missing authoritative reset/continuity feature ${key}`)}
for(const key of ["cutout","borderStats","alphaAudit","unsafe cutout","ensureAsset","enhanceAvatar","enhanceRoom","enhancePet","applyVisual","visual17Cutout=cutout","visual17GetMasterCutout","lastAvatarCutout","lastPetCutout","day||\"pending\""]){if(!visualRuntime.includes(key))errors.push(`missing safe visual runtime ${key}`)}
for(const key of ["roomPrompt","petPrompt","avatarPrompt","posePrompt","VISUAL_MODEL","visual-v17/shared/","AVATAR_ASSETS.put","Photorealistic"]){if(!visual.includes(key))errors.push(`missing premium visual server ${key}`)}
for(const key of ["v19Sun","v19Wind","v19Leaves","moveActor","poseActor","movePet","swayPlant","roomTap","previewLevel","v19Buy","v19Style","navigator.share","roomV19Audit","refreshActual","applyGrowth","오늘 기록 전"]){if(!roomRuntime.includes(key))errors.push(`missing V19 interaction feature ${key}`)}
for(const key of ["POSES","ensurePose","/api/avatar/pose","/api/avatar/pose/file","poseV20","nextPose","restoreMaster","preload","visual integrity engine not ready","visual17RestoreMaster","visual17GetMasterCutout"]){if(!poseRuntime.includes(key))errors.push(`missing safe V20 pose runtime ${key}`)}
if(poseRuntime.includes("img.src=selectedAvatar"))errors.push("pose runtime must never restore raw rectangular avatar source");
if(poseRuntime.includes("dr*dr+dg*dg+db*db<7200"))errors.push("destructive legacy pose cutout threshold returned");
for(const key of ["p2CoreV21","riskState","maybeNotify","/api/life/summary","/api/risk-profile"]){if(!coreRuntime.includes(key))errors.push(`missing V21 core runtime ${key}`)}
for(const key of ["p2ContinuityV22","continuity-v22","seedHidden","installRewardGuards","syncOverallResult","hiddenSource","smokePoints","conditionRewarded","timerRewards"]){if(!continuityRuntime.includes(key))errors.push(`missing V22 continuity runtime ${key}`)}
for(const key of ["combinations:27","clipSlots:9","URL.createObjectURL","playAction"]){if(!cinemaRuntime.includes(key))errors.push(`missing V23 cinema runtime ${key}`)}
for(const key of ["WorkflowEntrypoint","CinemaBatchWorkflow","step.do","confirm_cost!==true","successRetention"]){if(!cinemaBackground.includes(key))errors.push(`missing durable Cinema workflow ${key}`)}
for(const key of ["myroomCinemaV23BackgroundJob","/api/cinema/batch/start","/api/cinema/batch/status","화면을 닫아도 계속됩니다","stopImmediatePropagation"]){if(!cinemaBackgroundClient.includes(key))errors.push(`missing Cinema background client ${key}`)}
for(const key of ["resetSetup","resetFull","DELETE FROM clear_messages","DELETE FROM life_daily","DELETE FROM life_profiles","DELETE FROM habit_signals","DELETE FROM app_events","DELETE FROM avatars","DELETE FROM app_state","DELETE FROM device_auth","AVATAR_ASSETS.delete"]){if(!life.includes(key))errors.push(`incomplete server reset ${key}`)}
if(!life.includes("handleVisualRoute"))errors.push("visual engine is not bridged through life engine");
if(!worker.includes("crypto.subtle.digest"))errors.push("device token hashing missing");
if(!worker.includes("env.DB"))errors.push("worker D1 binding usage missing");
if(!worker.includes("env.AVATAR_ASSETS"))errors.push("worker R2 binding usage missing");
if(!worker.includes("handleLifeRoute"))errors.push("life engine route bridge missing");
if(!worker.includes("handleCinemaBackgroundRoute"))errors.push("Cinema background route bridge missing");
if(!worker.includes("CinemaBatchWorkflow"))errors.push("Cinema Workflow export missing");
if(!worker.includes("AI_TIMEOUT_MS"))errors.push("server AI timeout missing");
if(!worker.includes("variantRaw"))errors.push("legacy single avatar variant mode missing");
for(const f of ["/runtime-v14.js","/avatar-runtime-v15.js","/reset-runtime-v16.js","/visual-runtime-v17.js","/room-runtime-v19.js","/pose-runtime-v20.js","/cinema-runtime-v23.js","/cinema-background-v23.js"]){if(!worker.includes(f))errors.push(`runtime injection missing ${f}`)}
for(const mark of ['resetEngine:"v16"','visualEngine:"v17"','roomEngine:"v19"','poseEngine:"v20"','cinemaBackground:Boolean(env.CINEMA_WORKFLOW)'])if(!worker.includes(mark))errors.push(`health marker missing ${mark}`);
if(manifest.display!=="standalone")errors.push("PWA manifest invalid");
if(!sw.includes("serviceWorker")&&!sw.includes("fetch"))errors.push("service worker invalid");
for(const f of ["/avatar-runtime-v15.js","/reset-runtime-v16.js","/visual-runtime-v17.js","/room-runtime-v19.js","/pose-runtime-v20.js","/core-runtime-v21.js","/continuity-runtime-v22.js","/cinema-runtime-v23.js","/cinema-background-v23.js"]){if(!sw.includes(f))errors.push(`offline cache missing ${f}`)}
if(!sw.includes("my-life-room-v23-shell"))errors.push("service worker cache version is not v23");
if(!sw.includes('const BUILD="visualfix1"'))errors.push("service worker visualfix1 build marker missing");
for(const f of ["deploy.settings.json","scripts/prepare-cloudflare.mjs","scripts/verify-deployment.mjs","src/life-engine.js","src/visual-engine.js","src/cinema-engine.js","src/cinema-background.js","public/runtime-v14.js","public/avatar-runtime-v15.js","public/reset-runtime-v16.js","public/visual-runtime-v17.js","public/room-runtime-v19.js","public/pose-runtime-v20.js","public/core-runtime-v21.js","public/continuity-runtime-v22.js","public/cinema-runtime-v23.js","public/cinema-background-v23.js","migrations/0003_life_engine.sql"]){if(!fs.existsSync(f))errors.push(`missing deploy file ${f}`)}
if(wrangler.name!==settings.worker_name)errors.push(`worker name mismatch: ${wrangler.name} != ${settings.worker_name}`);
if(wrangler.main!=="src/index.js")errors.push("wrangler main entry invalid");
if(wrangler.ai?.binding!==settings.ai_binding)errors.push("Workers AI binding mismatch");
if(wrangler.assets?.binding!=="ASSETS")errors.push("static assets binding mismatch");
if(wrangler.assets?.directory!=="./public")errors.push("static assets directory mismatch");
const workflow=(wrangler.workflows||[]).find(x=>x.binding==="CINEMA_WORKFLOW");if(!workflow||workflow.name!=="my-life-room-cinema-v23"||workflow.class_name!=="CinemaBatchWorkflow")errors.push("Cinema Workflow binding invalid");
for(const needle of ["d1\",\"create","r2\",\"bucket\",\"create","d1_databases","r2_buckets","migrations\",\"apply","wrangler.production.jsonc"]){if(!prepare.includes(needle))errors.push(`prepare script missing ${needle}`)}
for(const needle of ["/api/health","/api/life/reset","scope:\"setup\"","scope:\"full\"","/api/avatar/save","/api/avatar/generate-v17","/api/visual/ensure","r2Deleted","stateAfterSetup.state!==null","profile===null","d?.ai===true","d?.d1===true","d?.r2===true","DEPLOYMENT VERIFIED"]){if(!verify.includes(needle))errors.push(`verify script missing ${needle}`)}
if(!cinemaBackground.includes('response_format:{type:"json_schema",json_schema:VISUAL_QC_SCHEMA}'))errors.push("Cinema visual QC must use Workers AI direct json_schema shape");
if(!cinemaBackground.includes('response_format:{type:"json_schema",json_schema:MOTION_QC_SCHEMA}'))errors.push("Cinema motion QC must use Workers AI direct json_schema shape");
if(cinemaBackground.includes('json_schema:{name:"cinema_visual_qc"')||cinemaBackground.includes('json_schema:{name:"cinema_motion_qc"'))errors.push("OpenAI wrapper-style json_schema must not be used with Workers AI binding");
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log("V23 preflight passed: V22 life/visual safety + Cinema durable background Workflow + 9 clips -> 27 flows");
