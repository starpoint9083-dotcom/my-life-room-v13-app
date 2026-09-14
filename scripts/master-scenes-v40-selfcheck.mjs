import fs from 'node:fs';
const manifestPath='public/master-scenes-v40-manifest.json';
const runtimePath='public/master-scenes-v40.js';
const workerPath='src/index-v29.js';
const required=[
 'master_01_sofa_relax','master_02_window_gaze','master_03_pet_touch','master_04_return_home',
 'master_05_sit_down','master_06_walk_to_window','master_07_morning_life','master_08_night_rest'
];
const errors=[];
if(!fs.existsSync(manifestPath))errors.push('missing V40 manifest');
if(!fs.existsSync(runtimePath))errors.push('missing V40 runtime');
if(!fs.existsSync(workerPath))errors.push('missing worker entry');
if(!errors.length){
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 const runtime=fs.readFileSync(runtimePath,'utf8');
 const worker=fs.readFileSync(workerPath,'utf8');
 if(manifest.version!=='v40-eight-master-assets'||manifest.freeOnly!==true||manifest.paidGeneration!==false)errors.push('invalid V40 policy/version');
 if(!Array.isArray(manifest.masters)||manifest.masters.length!==8)errors.push('V40 must have 8 masters');
 const ids=new Set(manifest.masters.map(x=>x.id));
 for(const id of required)if(!ids.has(id))errors.push(`missing master ${id}`);
 for(const m of manifest.masters){
   const disk=`public${m.src}`;
   if(!fs.existsSync(disk))errors.push(`missing canonical asset ${m.src}`);
 }
 for(const s of ['v40-eight-master-assets','showMaster','showForSlot','masterMotionV34','master_04_return_home','master_08_night_rest'])if(!runtime.includes(s))errors.push(`runtime missing ${s}`);
 if(!worker.includes('master-scenes-v40.js'))errors.push('worker does not inject V40 runtime');
 if(/hailuo|minimax|motion\/generate|confirm_cost\s*:\s*true/i.test(runtime))errors.push('paid generation path found');
}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('P2 V40 MASTER SCENES SELFCHECK PASSED: 8 canonical originals + V34/50-slot display bridge + free-only');
