import fs from 'node:fs';
const manifestPath='public/master-scenes-v40-manifest.json';
const runtimePath='public/master-scenes-v40.js';
const cssPath='public/master-scenes-v40.css';
const workerPath='src/index-v29.js';
const apiPath='src/master-scenes.js';
const required=[
 'master_01_sofa_relax','master_02_window_gaze','master_03_pet_touch','master_04_return_home',
 'master_05_sit_down','master_06_walk_to_window','master_07_morning_life','master_08_night_rest'
];
const errors=[];
for(const f of [manifestPath,runtimePath,cssPath,workerPath,apiPath])if(!fs.existsSync(f))errors.push(`missing ${f}`);
if(!errors.length){
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 const runtime=fs.readFileSync(runtimePath,'utf8');
 const css=fs.readFileSync(cssPath,'utf8');
 const worker=fs.readFileSync(workerPath,'utf8');
 const api=fs.readFileSync(apiPath,'utf8');
 if(manifest.version!=='v40-eight-master-assets'||manifest.freeOnly!==true||manifest.paidGeneration!==false)errors.push('invalid V40 policy/version');
 if(!Array.isArray(manifest.masters)||manifest.masters.length!==8)errors.push('V40 must have 8 masters');
 const ids=new Set(manifest.masters.map(x=>x.id));
 for(const id of required)if(!ids.has(id))errors.push(`missing master ${id}`);
 for(const m of manifest.masters){if(m.src!==`/api/master-scenes/file?id=${m.id}`)errors.push(`invalid R2 file route for ${m.id}`)}
 for(const s of ['v40-eight-master-assets','showMaster','showForTime','keepMaster','master40-shell','MutationObserver','master_04_return_home','master_05_sit_down','master_08_night_rest'])if(!runtime.includes(s))errors.push(`runtime missing ${s}`);
 for(const s of ['master40-shell','masterScene40','Old room/avatar/pet/fake-motion layers must never reappear','animation:none','transition:none'])if(!css.includes(s))errors.push(`CSS missing ${s}`);
 for(const s of ['/api/master-scenes/status','/api/master-scenes/file','/api/master-scenes/upload','p2-master-scene-v40'])if(!api.includes(s))errors.push(`API missing ${s}`);
 if(!worker.includes('master-scenes-v40.js'))errors.push('worker does not inject V40 runtime');
 if(!worker.includes('master-frames-v42.js'))errors.push('worker does not inject V42 frame runtime');
 if(!worker.includes('handleMasterScenesRoute'))errors.push('worker does not route V40 master scene API');
 for(const legacy of ['frame-motion-v27.js','master-motion-v32.js','master-motion-v36.js','motion-auto-audit-v38.js'])if(worker.includes(`[\"/${legacy}\"`))errors.push(`legacy live motion still injected ${legacy}`);
 for(const text of [runtime,api,worker])if(/hailuo|minimax|motion\/generate|confirm_cost\s*:\s*true/i.test(text))errors.push('paid generation path found in V40 live stack');
}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('P2 V40 MASTER-ONLY SELFCHECK PASSED: 8 canonical originals + pinned room shell + legacy visual layers suppressed + V42 frame bridge + free-only');
