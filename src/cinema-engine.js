const CINEMA_VERSION="v23-pilot";
const FRAME_MODEL="@cf/black-forest-labs/flux-2-klein-4b";
const VIDEO_MODEL="minimax/hailuo-2.3-fast";
const VIDEO_DURATION=6;
const SLOTS=[
  "base-morning","base-evening","base-night",
  "state-success","state-steady","state-recovery",
  "action-avatar","action-pet","action-room"
];
const BASES=["morning","evening","night"];
const STATES=["success","steady","recovery"];
const ACTIONS=["avatar","pet","room"];
function safeSlot(v){const s=String(v||"").trim();return SLOTS.includes(s)?s:null}
function safeChoice(v,allowed,fallback){const s=String(v||"").trim();return allowed.includes(s)?s:fallback}
function avatarPrefix(key){const s=String(key||"");return s.endsWith("master.jpg")?s.slice(0,-"master.jpg".length):s.replace(/[^/]+$/,"")}
async function latestAvatar(env,deviceId){return await env.DB.prepare("SELECT r2_key,style FROM avatars WHERE device_id=?1 ORDER BY id DESC LIMIT 1").bind(deviceId).first()}
function frameKey(row,slot){return `${avatarPrefix(row.r2_key)}cinema-v23/pilot/${slot}.jpg`}
function videoKey(row,slot){return `${avatarPrefix(row.r2_key)}cinema-v23/pilot/${slot}.mp4`}
function fileUrl(slot,type="video"){return `/api/cinema/file?slot=${encodeURIComponent(slot)}&type=${type}`}
function bytesToBase64(bytes){let out="";const step=0x8000;for(let i=0;i<bytes.length;i+=step)out+=String.fromCharCode(...bytes.subarray(i,i+step));return btoa(out)}
async function withTimeout(promise,ms,label){let timer;const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`${label} timed out`)),ms)});try{return await Promise.race([promise,timeout])}finally{clearTimeout(timer)}}
function petDescriptor(kind,mode){if(kind==="cat")return mode==="집사취급형"?"one elegant silver-tabby companion cat, composed and slightly aloof":"one affectionate silver-tabby companion cat with warm curious eyes";return mode==="듬직이형"?"one calm loyal medium-small warm-brown companion dog":"one bright friendly small warm-brown companion dog"}
function roomDescriptor(style){return style==="modern"?"refined contemporary Korean apartment living room with pale stone, oak and linen":style==="cozy"?"cozy premium Korean apartment living room with warm linen, oak and soft natural textures":"warm modern Korean apartment living room with cream fabric, natural oak and tasteful plants"}
function framePrompt(slot,{roomStyle,petKind,petMode}){
  const room=roomDescriptor(roomStyle),pet=petDescriptor(petKind,petMode);
  const shared=[
    "Use input image 0 as the exact identity reference for the same adult person.",
    "Preserve recognizable face, age, hairstyle, skin tone, body build and realistic adult proportions.",
    `Place exactly one adult person and ${pet} together inside a ${room}.`,
    "The person and pet must be physically present in the same photographed scene, not composited cutouts.",
    "Natural contact shadows, matching light direction, realistic depth, believable occlusion by furniture, cinematic Korean lifestyle film still, 35mm lens, shallow but natural depth of field.",
    "No second person, no second animal, no collage, no floating subject, no studio backdrop, no text, no logo, no UI, no illustration, no cartoon."
  ];
  const scene={
    "base-morning":"Wide establishing shot. Early morning sunlight through curtains, the person quietly standing near the sofa while the pet rests nearby, subtle lived-in calm.",
    "base-evening":"Wide establishing shot. Warm blue-hour evening, practical lamps on, the person has just returned home and relaxes near the sofa while the pet stays close.",
    "base-night":"Wide establishing shot. Calm late-night room with warm lamps and deep blue city light outside, the person winding down quietly with the pet nearby.",
    "state-success":"Medium cinematic insert. The person looks quietly proud and relieved after keeping a healthy promise; the pet is relaxed nearby, room feels a little brighter and more alive.",
    "state-steady":"Medium cinematic insert. A normal steady day, relaxed breathing, neutral warm expression, tidy room, pet calm, no exaggerated celebration.",
    "state-recovery":"Medium cinematic insert. A gentle recovery mood after a difficult day, the person sits or stands calmly with tea or water, soft supportive light, no shame, pet quietly close.",
    "action-avatar":"Medium shot designed for a tap reaction. The person naturally turns toward the window, takes one easy breath and stretches shoulders slightly, then settles.",
    "action-pet":"Medium-low shot designed for a pet tap. The pet approaches the person; the person bends slightly and gives one brief affectionate touch, then both settle.",
    "action-room":"Wide insert designed for a room tap. Curtain and plant leaves move gently in a small breeze while the person and pet notice subtly, then the room becomes still again."
  }[slot];
  return [...shared,scene].join(" ")
}
function motionPrompt(slot){
  const common="Keep the exact same person, pet, room layout, clothing, face and camera continuity from the first frame. Photorealistic cinematic motion only. No morphing, no extra people, no extra animals, no cuts to another room, no text. Movement must be subtle and physically natural. End in a calm stable pose suitable for a smooth return to an ambient loop.";
  const motion={
    "base-morning":"Locked cinematic camera with extremely subtle handheld breathing. Curtain moves slightly in morning air, sunlight shifts softly, person breathes and blinks naturally, pet makes one small head movement. Seamless calm ambience.",
    "base-evening":"Locked cinematic camera. Warm lamp glow, tiny curtain movement, person shifts weight naturally and breathes, pet looks up once. Quiet blue-hour ambience.",
    "base-night":"Locked cinematic camera. Very subtle city light outside, person settles shoulders and blinks, pet relaxes, lamp exposure breathes gently. Quiet night ambience.",
    "state-success":"The person shows a small genuine smile, shoulders loosen with relief, pet responds warmly with one subtle movement, plant catches gentle light. No celebration gesture.",
    "state-steady":"The person takes one normal breath and small posture adjustment, pet remains calm, light and curtains move almost imperceptibly. Everyday steadiness.",
    "state-recovery":"The person takes a slow calming breath, glances down briefly, holds water or tea naturally, pet stays quietly supportive. Soft light, restrained emotion.",
    "action-avatar":"The person turns slightly toward the window, gently opens shoulders in a small stretch, looks outside for a moment, then returns to a relaxed neutral pose.",
    "action-pet":"The pet takes a few natural steps toward the person. The person bends slightly, gives one brief gentle pet, then both return to relaxed positions. Correct anatomy and paws/hands.",
    "action-room":"A soft breeze moves the curtain and plant leaves; the person glances subtly toward the movement and the pet reacts with a small head turn, then everything settles."
  }[slot];
  return `${motion} ${common}`
}
async function generateFrame(env,sourceBlob,prompt,seed){const form=new FormData();form.append("prompt",prompt);form.append("input_image_0",sourceBlob,"identity.jpg");form.append("width","768");form.append("height","1024");form.append("guidance","3.8");form.append("seed",String(seed));const serialized=new Response(form);const result=await withTimeout(env.AI.run(FRAME_MODEL,{multipart:{body:serialized.body,contentType:serialized.headers.get("content-type")}}),90000,"Cinema frame generation");if(!result||typeof result.image!=="string"||result.image.length<1000)throw new Error("Cinema frame model did not return an image");const raw=atob(result.image),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes}
async function generateVideo(env,frameBytes,prompt){const firstFrame=`data:image/jpeg;base64,${bytesToBase64(frameBytes)}`;const result=await withTimeout(env.AI.run(VIDEO_MODEL,{prompt,duration:VIDEO_DURATION,fast_pretreatment:true,first_frame_image:firstFrame,prompt_optimizer:true,resolution:"768P"}),180000,"Cinema video generation");const url=result?.result?.video||result?.video;if(!url)throw new Error(`Cinema video model returned no video (${result?.state||result?.result?.status||"unknown"})`);const r=await fetch(url);if(!r.ok||!r.body)throw new Error(`Generated video download failed: ${r.status}`);const type=r.headers.get("content-type")||"video/mp4";if(!type.includes("video")&&!url.includes(".mp4"))throw new Error("Generated asset is not a video");return {body:r.body,type}}
async function ensureFrame(env,row,slot,opts,force=false){const key=frameKey(row,slot),head=await env.AVATAR_ASSETS.head(key);if(head&&!force){const obj=await env.AVATAR_ASSETS.get(key);return {key,bytes:new Uint8Array(await obj.arrayBuffer()),cached:true}}const src=await env.AVATAR_ASSETS.get(row.r2_key);if(!src)throw new Error("Saved avatar master was not found");const bytes=await generateFrame(env,await src.blob(),framePrompt(slot,opts),Math.floor(Math.random()*1000000000));await env.AVATAR_ASSETS.put(key,bytes,{httpMetadata:{contentType:"image/jpeg",cacheControl:"private, max-age=31536000"},customMetadata:{engine:CINEMA_VERSION,slot,role:"cinema-frame"}});return {key,bytes,cached:false}}
async function status(env,row){const slots=[];for(const slot of SLOTS){const [frame,video]=await Promise.all([env.AVATAR_ASSETS.head(frameKey(row,slot)),env.AVATAR_ASSETS.head(videoKey(row,slot))]);slots.push({slot,frame:Boolean(frame),video:Boolean(video),url:video?fileUrl(slot):null})}return slots}
async function serveFile(request,env,row,slot,type){const key=type==="frame"?frameKey(row,slot):videoKey(row,slot),obj=await env.AVATAR_ASSETS.get(key);if(!obj)return new Response("Not found",{status:404});const headers=new Headers();obj.writeHttpMetadata(headers);headers.set("cache-control","private, max-age=3600");headers.set("x-cinema-engine",CINEMA_VERSION);if(!headers.get("content-type"))headers.set("content-type",type==="frame"?"image/jpeg":"video/mp4");return new Response(obj.body,{headers})}
export async function handleCinemaRoute(request,env,ensureAuth,json){
  const url=new URL(request.url);if(!url.pathname.startsWith("/api/cinema/"))return null;
  if(!env.DB||!env.AVATAR_ASSETS)return json({ok:false,error:"Cinema Room requires D1 and R2"},503);
  const auth=await ensureAuth(request,env,true);if(!auth.ok)return auth.response;const row=await latestAvatar(env,auth.deviceId);if(!row?.r2_key)return json({ok:false,error:"본캐를 먼저 만들어 저장해야 합니다."},409);
  if(url.pathname==="/api/cinema/status"&&request.method==="GET"){const slots=await status(env,row);return json({ok:true,engine:CINEMA_VERSION,frameModel:FRAME_MODEL,videoModel:VIDEO_MODEL,pilot:{bases:BASES,states:STATES,actions:ACTIONS,combinations:BASES.length*STATES.length*ACTIONS.length,clipSlots:SLOTS.length},slots,ready:slots.filter(x=>x.video).length})}
  if(url.pathname==="/api/cinema/file"&&request.method==="GET"){const slot=safeSlot(url.searchParams.get("slot")),type=url.searchParams.get("type")==="frame"?"frame":"video";if(!slot)return new Response("Not found",{status:404});return serveFile(request,env,row,slot,type)}
  if(url.pathname==="/api/cinema/generate"&&request.method==="POST"){
    if(!env.AI)return json({ok:false,error:"Workers AI binding is required"},503);const b=await request.json().catch(()=>({})),slot=safeSlot(b.slot);if(!slot)return json({ok:false,error:"Invalid cinema slot"},400);if(b.confirm_cost!==true)return json({ok:false,error:"AI video generation may incur Cloudflare charges. Explicit confirm_cost=true is required."},402);
    const opts={roomStyle:safeChoice(b.roomStyle,["warm","modern","cozy"],"warm"),petKind:safeChoice(b.petKind,["dog","cat"],"dog"),petMode:String(b.petMode||"댕댕이형").slice(0,30)},force:Boolean(b.force);
    try{const vKey=videoKey(row,slot),existing=await env.AVATAR_ASSETS.head(vKey);if(existing&&!opts.force)return json({ok:true,engine:CINEMA_VERSION,slot,cached:true,url:fileUrl(slot)});const frame=await ensureFrame(env,row,slot,opts,opts.force),video=await generateVideo(env,frame.bytes,motionPrompt(slot));await env.AVATAR_ASSETS.put(vKey,video.body,{httpMetadata:{contentType:"video/mp4",cacheControl:"private, max-age=31536000"},customMetadata:{engine:CINEMA_VERSION,model:VIDEO_MODEL,slot,role:"cinema-video",duration:String(VIDEO_DURATION)}});return json({ok:true,engine:CINEMA_VERSION,slot,cached:false,frameCached:frame.cached,url:fileUrl(slot),duration:VIDEO_DURATION})}catch(error){return json({ok:false,error:error?.message||"Cinema Room generation failed",slot},500)}
  }
  return json({ok:false,error:"Not found"},404)
}
export const CINEMA_INFO={version:CINEMA_VERSION,frameModel:FRAME_MODEL,videoModel:VIDEO_MODEL,slots:SLOTS,bases:BASES,states:STATES,actions:ACTIONS};
