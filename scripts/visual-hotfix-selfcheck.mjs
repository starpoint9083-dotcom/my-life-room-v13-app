import fs from "node:fs";
const visual=fs.readFileSync("public/visual-runtime-v17.js","utf8");
const pose=fs.readFileSync("public/pose-runtime-v20.js","utf8");
const serverVisual=fs.readFileSync("src/visual-engine.js","utf8");
const avatarBridge=fs.readFileSync("public/avatar-runtime-v15.js","utf8");
const sw=fs.readFileSync("public/sw.js","utf8");
const errors=[];
for(const s of ["borderStats","alphaAudit","removeUniformBackground","keepPrimaryComponent","secondarySignificant","safe-cutout-v2","visual17CutoutAudit","lastAvatarCutout","lastPetCutout","visual17Cutout=cutout","visual17GetMasterCutout"])if(!visual.includes(s))errors.push(`visual missing ${s}`);
for(const s of ["visual17RestoreMaster","visual17GetMasterCutout","visual integrity engine not ready"])if(!pose.includes(s))errors.push(`pose missing ${s}`);
for(const s of ["VISUAL_VERSION=\"v26-hybrid3070\"","visual-v26/hybrid3070/","HYBRID_RULE","30-real-70-animation","pose-${pose}-hybrid3070-v26.jpg","/api/avatar/hybrid-current","/api/avatar/hybrid/file","ensureHybridAvatar","Exactly one adult person only","Remove and do not reproduce any animal or pet"])if(!serverVisual.includes(s))errors.push(`server visual missing ${s}`);
for(const s of ["30:70 애니영화형","loadMotion26","motion-runtime-v26.js?v=26"])if(!avatarBridge.includes(s))errors.push(`avatar bridge missing ${s}`);
if(serverVisual.includes('PREFIX="visual-v17/shared/"'))errors.push("legacy visual-v17 shared cache prefix returned");
if(serverVisual.includes('"Photorealistic premium pet portrait'))errors.push("legacy photorealistic pet prompt returned");
if(serverVisual.includes('"Create a photorealistic full-body lifestyle avatar'))errors.push("legacy photorealistic avatar prompt returned");
if(pose.includes("img.src=selectedAvatar"))errors.push("raw rectangular master restore present");
if(visual.includes("<6400")||pose.includes("<7200"))errors.push("legacy destructive cutout threshold present");
if(!sw.includes('const BUILD="visualfix1"')||!sw.includes('const PATCH="cleanup2"'))errors.push("service worker cleanup2 marker missing");
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log("VISUAL V26 HYBRID 30/70 SELFCHECK PASSED");
