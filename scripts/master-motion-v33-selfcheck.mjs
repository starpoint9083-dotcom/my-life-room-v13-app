import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const runtimePath='public/master-motion-v33.js';
const assetsPath='public/master-motion-v33-assets.js';
const programPath='public/scene-program-v30.js';
for(const f of [runtimePath,assetsPath,programPath])execFileSync(process.execPath,['--check',f],{stdio:'inherit'});

const runtime=fs.readFileSync(runtimePath,'utf8');
const assets=fs.readFileSync(assetsPath,'utf8');
const program=fs.readFileSync(programPath,'utf8');
const errors=[];
const need=(text,items,label)=>{for(const item of items)if(!text.includes(item))errors.push(`${label} missing ${item}`)};

need(runtime,[
  'v33-keyframe-motion-456','window.masterMotionV33','playKeyframes','mm33Stage',
  'master_04_return_home','master_05_sit_down','master_06_walk_to_window',
  '/master-motion-v32.js?v=32','freeOnly:true','paidGeneration:false'
],'V33 runtime');
need(assets,[
  '/assets/motion-v33/return-01.jpg','/assets/motion-v33/return-02.jpg',
  '/assets/motion-v33/sit-01.jpg','/assets/motion-v33/sit-02.jpg',
  '/assets/motion-v33/walk-window-01.jpg','/assets/motion-v33/walk-window-02.jpg'
],'V33 registry');
need(program,['/master-motion-v33.js?v=33','window.masterMotionV33||window.masterMotionV32','p2:master-motion-v33-ready','/master-motion-v32.js?v=32'],'V30/V33 bridge');

for(const f of [
  'public/assets/motion-v33/return-01.jpg','public/assets/motion-v33/return-02.jpg',
  'public/assets/motion-v33/sit-01.jpg','public/assets/motion-v33/sit-02.jpg',
  'public/assets/motion-v33/walk-window-01.jpg','public/assets/motion-v33/walk-window-02.jpg'
]) if(!fs.existsSync(f))errors.push(`missing keyframe asset ${f}`);

for(const text of [runtime,assets,program]){
  if(/\/api\/motion\/generate|confirm_cost\s*:\s*true|hailuo|minimax/i.test(text))errors.push('paid video generation path found in V33');
}
if(!runtime.includes('prefers-reduced-motion'))errors.push('reduced-motion guard missing');
if(!runtime.includes('object-fit:cover'))errors.push('full-room keyframe compositor missing');

if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('P2 V33 keyframe motion selfcheck: OK — masters 4/5/6 connected, V32 fallback retained, free-only');
