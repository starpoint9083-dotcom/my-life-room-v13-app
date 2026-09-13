import fs from 'node:fs';

const js = fs.readFileSync('public/master-motion-v32.js','utf8');
const manifest = JSON.parse(fs.readFileSync('public/master-motion-v32-manifest.json','utf8'));
const program = fs.readFileSync('public/scene-program-v30.js','utf8');

const fail = (m) => { console.error(`V32 SELFCHECK FAIL: ${m}`); process.exit(1); };

if (manifest.version !== 'v32-natural-motion-engine') fail('wrong manifest version');
if (manifest.masterCount !== 8 || manifest.profiles?.length !== 8) fail('must have exactly eight master profiles');
if (manifest.freeOnly !== true || manifest.paidGeneration !== false) fail('free-only lock missing');
for (let i=1;i<=8;i++) {
  const id = `master_${String(i).padStart(2,'0')}_`;
  if (!manifest.profiles.some(p => p.id.startsWith(id))) fail(`missing master ${i}`);
}
const extra = manifest.profiles.filter(p => p.requiresExtraFrames).map(p => p.id);
for (const id of ['master_04_return_home','master_05_sit_down','master_06_walk_to_window']) {
  if (!extra.includes(id)) fail(`full-body frame requirement missing for ${id}`);
}
for (const needle of ['mm32Breath','mm32Look','mm32PetTouch','mm32Return','mm32Sit','mm32WalkWindow','mm32Morning','mm32Night']) {
  if (!js.includes(needle)) fail(`motion primitive missing: ${needle}`);
}
if (!js.includes('window.masterMotionV32')) fail('runtime global missing');
if (!program.includes('/master-motion-v32.js?v=32') || !program.includes('playForMode')) fail('V30 bridge missing');
if (/motion\/generate|confirm_cost\s*:\s*true|hailuo|minimax/i.test(js)) fail('paid video path found in V32 runtime');

console.log('P2 V32 master motion selfcheck: OK');
