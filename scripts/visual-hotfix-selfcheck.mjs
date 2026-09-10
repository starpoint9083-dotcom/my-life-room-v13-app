import fs from "node:fs";
const visual=fs.readFileSync("public/visual-runtime-v17.js","utf8");
const pose=fs.readFileSync("public/pose-runtime-v20.js","utf8");
const sw=fs.readFileSync("public/sw.js","utf8");
const errors=[];
for(const s of ["borderStats","alphaAudit","removeUniformBackground","keepPrimaryComponent","secondarySignificant","safe-cutout-v2","visual17CutoutAudit","visual17SegmentationVersion=\"v22-clean2\"","lastAvatarCutout","lastPetCutout","visual17Cutout=cutout","visual17GetMasterCutout"])if(!visual.includes(s))errors.push(`visual missing ${s}`);
for(const s of ["visual17RestoreMaster","visual17GetMasterCutout","visual integrity engine not ready"])if(!pose.includes(s))errors.push(`pose missing ${s}`);
if(pose.includes("img.src=selectedAvatar"))errors.push("raw rectangular master restore present");
if(visual.includes("<6400")||pose.includes("<7200"))errors.push("legacy destructive cutout threshold present");
if(!sw.includes('const BUILD="visualfix1"')||!sw.includes('const PATCH="cleanup2"'))errors.push("service worker cleanup2 marker missing");
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log("VISUAL CLEANUP2 SELFCHECK PASSED");
