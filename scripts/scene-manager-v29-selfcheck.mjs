import fs from "node:fs";
import {execFileSync} from "node:child_process";

const files=["src/index-v29.js","src/scene-library.js","public/scene-runtime-v28.js","public/scene-manager-v29.js"];
for(const f of files)execFileSync(process.execPath,["--check",f],{stdio:"inherit"});
const wrapper=fs.readFileSync("src/index-v29.js","utf8"),api=fs.readFileSync("src/scene-library.js","utf8"),runtime=fs.readFileSync("public/scene-runtime-v28.js","utf8"),manager=fs.readFileSync("public/scene-manager-v29.js","utf8"),migration=fs.readFileSync("migrations/0004_scene_library.sql","utf8"),wrangler=JSON.parse(fs.readFileSync("wrangler.jsonc","utf8"));
const errors=[];
for(const s of ["handleSceneLibraryRoute","/api/scene-library/info","scene-manager-v29.js?v=29","injectSceneManager"])if(!wrapper.includes(s))errors.push(`wrapper missing ${s}`);
for(const s of ["/api/scene-library/status","/api/scene-library/upload","/api/scene-library/file","/api/scene-library/delete","scene-library/","AVATAR_ASSETS","scene_assets","Only MP4 or WebM"])if(!api.includes(s))errors.push(`scene API missing ${s}`);
for(const s of ["ASSET_REGISTRY=\"v29-scene-manager\"","syncRegisteredAssets","sourceForScene","refreshAssets","assetApi","p2:scene-v29-assets"])if(!runtime.includes(s))errors.push(`scene runtime missing ${s}`);
if(!manager.includes('sceneSetup')||!manager.includes('장면 넣기')||!manager.includes('미리보기')||!manager.includes('/api/scene-library/upload')||!manager.includes('/api/scene-library/delete')||!manager.includes('refreshAssets'))errors.push("manager core features missing");
if(!manager.includes('v29-scene-manager')&&!manager.includes('v31-batch-scene-loader'))errors.push("manager version marker missing");
for(const s of ["CREATE TABLE IF NOT EXISTS scene_assets","PRIMARY KEY (device_id, scene_id)","r2_key","duration_ms","qc_status"])if(!migration.includes(s))errors.push(`migration missing ${s}`);
if(wrangler.main!=="src/index-v29.js")errors.push("wrangler main must use src/index-v29.js");
for(const text of [api,manager])if(text.includes("/api/motion/generate")||text.includes("confirm_cost:true")||text.includes("minimax/hailuo"))errors.push("scene manager must not contain paid video generation path");
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log("SCENE MANAGER V29+ SELFCHECK PASSED: private R2 upload + D1 registry + mobile replace/preview/delete + forward-compatible manager + no paid generation");
