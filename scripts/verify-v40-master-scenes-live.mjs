const base=process.env.DEPLOYMENT_URL||process.env.WORKER_URL||'https://my-life-room-v13-live-0910.starpoint9083.workers.dev';
const must=async(path)=>{const r=await fetch(base+path,{redirect:'follow'});const text=await r.text();if(!r.ok)throw new Error(`${path} ${r.status} ${text.slice(0,180)}`);return {r,text}};
const info=JSON.parse((await must('/api/master-scenes/info')).text);
if(info.version!=='v40-eight-master-assets'||info.masterCount!==8||info.freeOnly!==true||info.paidGeneration!==false)throw new Error('V40 info mismatch');
const manifest=JSON.parse((await must('/master-scenes-v40-manifest.json?v=40')).text);
if(!Array.isArray(manifest.masters)||manifest.masters.length!==8)throw new Error('V40 manifest missing masters');
await must('/master-scenes-v40.js?v=40');
await must('/master-scenes-v40.css?v=40');
console.log('P2 V40 LIVE SHELL VERIFIED: 8-master manifest + runtime + CSS + R2 API present; asset readiness verified after upload.');
