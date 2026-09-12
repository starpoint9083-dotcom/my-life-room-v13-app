const VISUAL_MODEL="@cf/black-forest-labs/flux-2-klein-4b";
const MOTION_MODEL="minimax/hailuo-2.3-fast";
const VISUAL_TIMEOUT_MS=75000;
const MOTION_TIMEOUT_MS=180000;
const MOTION_DURATION=6;
const VISUAL_VERSION="v26-hybrid3070";
const MOTION_VERSION="v26-natural-motion";
const PREFIX="visual-v26/hybrid3070/";
const POSES=["window","pet","relax","stretch"];
const MOTION_SLOTS=["ambient","walk-sit","stand-walk","pet-touch","window-look","stretch"];

function safeChoice(value,allowed,fallback){const s=String(value||"").trim();return allowed.includes(s)?s:fallback}
function slug(value){return encodeURIComponent(String(value||"").trim().toLowerCase()).replaceAll("%","-")}
function fileUrl(key){return `/api/visual/file?key=${encodeURIComponent(key)}`}
function hybridFileUrl(key){return `/api/avatar/hybrid/file?key=${encodeURIComponent(key)}`}
function motionFileUrl(slot){return `/api/motion/file?slot=${encodeURIComponent(slot)}`}
function avatarPrefix(key){const s=String(key||"");return s.endsWith("master.jpg")?s.slice(0,-"master.jpg".length):s.replace(/[^/]+$/,"")}
async function withTimeout(promise,ms=VISUAL_TIMEOUT_MS){let timer;const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("AI generation timed out.")),ms)});try{return await Promise.race([promise,timeout])}finally{clearTimeout(timer)}}
async function runFlux(ai,{prompt,width,height,inputImage=null,seed=null}){const form=new FormData();form.append("prompt",prompt);if(inputImage)form.append("input_image_0",inputImage,"reference.jpg");form.append("width",String(width));form.append("height",String(height));form.append("guidance","3.8");if(seed!==null)form.append("seed",String(seed));const serialized=new Response(form);const result=await withTimeout(ai.run(VISUAL_MODEL,{multipart:{body:serialized.body,contentType:serialized.headers.get("content-type")}}));if(!result||typeof result.image!=="string"||result.image.length<1000)throw new Error("Workers AI did not return a usable image.");return result.image}
function b64Bytes(b64){const raw=atob(b64),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
function bytesToBase64(bytes){let out="";const step=0x8000;for(let i=0;i<bytes.length;i+=step)out+=String.fromCharCode(...bytes.subarray(i,i+step));return btoa(out)}

const HYBRID_RULE="Premium animated feature-film visual language: approximately 70 percent refined animation illustration and 30 percent realistic physical detail. Keep believable anatomy, perspective, materials, lighting and shadows, but the overall image must clearly read as a polished animated movie frame rather than a photograph. Soft cinematic linework, elegant simplified forms, expressive but natural faces, subtle painterly texture, cohesive warm color design. Avoid photorealism, plastic 3D toy look, flat web cartoon, chibi proportions and game-avatar stiffness.";

function roomPrompt(style,level,time){
  const styleText={warm:"warm modern Korean apartment, premium natural oak, cream fabric, tasteful plants",modern:"refined contemporary Korean apartment, pale stone, oak, linen, clean premium styling",cozy:"warm cozy Korean apartment, soft linen, oak furniture, subtle plants, inviting textures"}[style]||"warm modern Korean apartment, premium natural oak, cream fabric";
  const timeText={morning:"clear golden morning sunlight entering from a large window, fresh calm atmosphere",leave:"bright clean late-morning daylight, tidy ready-for-the-day atmosphere",day:"soft natural daytime light, bright balanced interior",return:"late afternoon golden light, welcoming return-home atmosphere",evening:"warm evening lamps with faint blue hour outside, relaxed premium mood",night:"calm sophisticated night lighting, warm lamps, deep blue city glow outside"}[time]||"soft natural daytime light";
  const levelText={1:"comfortable starter studio living room",2:"upgraded spacious one-bedroom living room",3:"beautiful premium apartment living room",4:"luxurious but believable high-end apartment living room"}[level]||"comfortable starter studio living room";
  return [HYBRID_RULE,`Create the same ${levelText} as a 70/30 animation-film environment, ${styleText}.`,timeText+".","The room must feel lived-in and emotionally warm, not a showroom and not a game UI.","Camera at human eye level with a cinematic 28mm-like interior perspective, stable geometry and believable scale.","Keep a clear open floor area in the center foreground for the same adult character and companion pet to appear later.","Sofa in the middle background, small side table, rug, healthy plants, subtle books and everyday objects.","Preserve realistic wood grain, fabric texture, contact shadows and light falloff only as the 30 percent realistic layer.","No people, no animals, no text, no letters, no logos, no UI, no surreal objects, no photographic look."].join(" ")
}

function petPrompt(kind,mode){
  const personality={"집사취급형":"independent confident cat, slightly aloof but charming, composed posture and intelligent gaze","개냥이형":"very affectionate friendly cat, warm eyes, gently leaning forward as if approaching its person","듬직이형":"calm loyal medium-small dog, steady posture, trustworthy gentle expression","댕댕이형":"bright playful small dog, happy open expression, energetic but natural posture"}[mode]||"friendly companion pet with a warm natural expression";
  const animal=kind==="cat"?"domestic companion cat":"domestic companion dog";
  return [HYBRID_RULE,`One ${animal}, ${personality}.`,"70 percent premium animated-film pet design with 30 percent realistic fur, eyes, paws and lighting detail.","Natural animal anatomy and believable weight, full body from ears to paws and tail, expressive but not exaggerated.","Sitting or standing naturally in three-quarter view, home-companion scale.","Isolated on a perfectly plain uniform warm light-gray studio background with strong clean subject separation and only a soft contact shadow under the paws.","Exactly one animal only. No people, no second animal, no furniture, no toys, no text, no logo, no costume, no photorealistic pet photography."].join(" ")
}

function avatarPrompt(style,variant){
  const styleMap={"나답게":"natural, recognizable, understated and warm","더 예쁘게":"subtly more polished and attractive while fully preserving identity and age","더 멋지게":"confident, refined and stylish while fully preserving identity and age","더 귀엽게":"friendlier and softer expression while fully preserving adult identity and age","세련된 현실형":"premium contemporary styling, sophisticated but believable"};
  const variants=["relaxed natural expression, premium smart-casual outfit","gentle approachable expression, refined everyday outfit","calm confident expression, sophisticated contemporary outfit"];
  const v=Math.max(0,Math.min(2,Number(variant)||0));
  return [HYBRID_RULE,"Use input image 0 as the identity reference for the exact same adult person.","Preserve recognizable facial identity, age, skin tone, hairstyle, facial proportions and adult body build. Do not turn the person into a different face.",`Direction: ${styleMap[style]||styleMap["나답게"]}; ${variants[v]}.`,"Create a full-body premium animated-film character: 70 percent elegant animation illustration, 30 percent realistic skin, hair, fabric, hands, shoes and lighting detail.","Natural adult proportions, subtle facial expression, relaxed front three-quarter standing pose, entire body visible.","The result must look like a frame from a sophisticated contemporary animated movie, not a photograph, not a game avatar, not a plastic 3D doll, not chibi.","Exactly one adult person only. No animals, no pets, no second person and no extra body parts.","Plain uniform warm light-gray studio background with clean separation and only a small soft contact shadow under the shoes.","No furniture, no text, no logo, no frame."].join(" ")
}

function posePrompt(pose){
  const p={window:"standing naturally with torso and gaze gently turned toward a window, calm reflective posture, arms relaxed",pet:"slightly bending and looking down warmly toward where a companion pet would be near the feet, one hand naturally lowered; do not show the pet itself",relax:"comfortable relaxed standing pose with weight shifted naturally to one leg, shoulders loose, gentle expression",stretch:"subtle healthy morning stretch, shoulders opening and arms raised naturally without exaggerated anatomy"}[pose]||"comfortable relaxed standing pose";
  return [HYBRID_RULE,"Use input image 0 as the exact identity, outfit and 70/30 animation-film style reference for the same adult person.","Keep the same face, age, hairstyle, skin tone, body build, clothing design and illustration style. Do not redesign the person.",`Change only the body pose: ${p}.`,"Keep natural adult anatomy, believable balance, weight transfer, shoulders, hips, elbows, knees, hands and feet.","Maintain 70 percent polished animation-film rendering with 30 percent realistic texture and cinematic light.","Exactly one adult person only. Remove and do not reproduce any animal or pet that may appear in the reference image.","Entire body visible from head to shoes, isolated on a perfectly plain uniform warm light-gray studio background with clean subject separation.","No furniture, no animal, no text, no logo, no frame, no photorealistic look."].join(" ")
}

async function latestAvatar(env,deviceId){return await env.DB.prepare("SELECT r2_key,style FROM avatars WHERE device_id=?1 ORDER BY id DESC LIMIT 1").bind(deviceId).first()}
function hybridKey(row){return `${avatarPrefix(row.r2_key)}hybrid-v26/master.jpg`}
async function ensureHybridAvatar(env,row){
  const key=hybridKey(row),existing=await env.AVATAR_ASSETS.head(key);
  if(existing)return {key,cached:true};
  const src=await env.AVATAR_ASSETS.get(row.r2_key);if(!src)throw new Error("Saved avatar master was not found");
  const b64=await runFlux(env.AI,{prompt:avatarPrompt(row.style||"나답게",0),width:640,height:960,inputImage:await src.blob(),seed:Math.floor(Math.random()*1000000000)});
  const bytes=b64Bytes(b64);
  await env.AVATAR_ASSETS.put(key,bytes,{httpMetadata:{contentType:"image/jpeg",cacheControl:"private, max-age=31536000"},customMetadata:{engine:VISUAL_VERSION,role:"hybrid-avatar",styleBlend:"30-real-70-animation",source:row.r2_key}});
  return {key,cached:false,bytes:bytes.byteLength}
}

async function serveShared(url,env){
  if(!env.AVATAR_ASSETS)return new Response("R2 unavailable",{status:503});
  const key=String(url.searchParams.get("key")||"");
  if(!key.startsWith(PREFIX)||key.includes(".."))return new Response("Not found",{status:404});
  const obj=await env.AVATAR_ASSETS.get(key);if(!obj)return new Response("Not found",{status:404});
  const headers=new Headers();obj.writeHttpMetadata(headers);headers.set("etag",obj.httpEtag);headers.set("cache-control","public, max-age=31536000, immutable");if(!headers.get("content-type"))headers.set("content-type","image/jpeg");
  return new Response(obj.body,{headers})
}

async function serveHybrid(request,env,ensureAuth){
  if(!env.AVATAR_ASSETS)return new Response("R2 unavailable",{status:503});
  const auth=await ensureAuth(request,env,true);if(!auth.ok)return auth.response;
  const url=new URL(request.url),key=String(url.searchParams.get("key")||"");
  if(!key.startsWith(`avatars/${auth.deviceId}/`)||!key.includes("/hybrid-v26/")||key.includes(".."))return new Response("Not found",{status:404});
  const obj=await env.AVATAR_ASSETS.get(key);if(!obj)return new Response("Not found",{status:404});
  const headers=new Headers();obj.writeHttpMetadata(headers);headers.set("cache-control","private, max-age=31536000");if(!headers.get("content-type"))headers.set("content-type","image/jpeg");
  return new Response(obj.body,{headers})
}

async function hybridCurrent(request,env,ensureAuth,json){
  if(!env.AI||!env.AVATAR_ASSETS||!env.DB)return json({ok:false,error:"AI, R2 or D1 unavailable"},503);
  const auth=await ensureAuth(request,env,true);if(!auth.ok)return auth.response;
  const row=await latestAvatar(env,auth.deviceId);if(!row?.r2_key)return json({ok:false,error:"저장된 본캐가 먼저 필요합니다."},409);
  try{const out=await ensureHybridAvatar(env,row);return json({ok:true,engine:VISUAL_VERSION,styleBlend:"30-real-70-animation",cached:out.cached,key:out.key,url:hybridFileUrl(out.key),bytes:out.bytes||null})}
  catch(error){return json({ok:false,error:error?.message||"30:70 본캐 변환 실패"},500)}
}

async function ensureShared(request,env,ensureAuth,json){
  if(!env.AI||!env.AVATAR_ASSETS)return json({ok:false,error:"AI or R2 binding unavailable"},503);
  const auth=await ensureAuth(request,env,true);if(!auth.ok)return auth.response;
  const b=await request.json().catch(()=>({})),type=safeChoice(b.type,["room","pet"],"");if(!type)return json({ok:false,error:"Invalid visual type"},400);
  let key,prompt,width,height,meta;
  if(type==="room"){
    const style=safeChoice(b.roomStyle,["warm","modern","cozy"],"warm"),level=Math.max(1,Math.min(4,Math.round(Number(b.level)||1))),time=safeChoice(b.time,["morning","leave","day","return","evening","night"],"morning");
    key=`${PREFIX}rooms/${style}/lv${level}/${time}.jpg`;prompt=roomPrompt(style,level,time);width=1024;height=768;meta={type,style,level,time}
  }else{
    const mode=safeChoice(b.petMode,["집사취급형","개냥이형","듬직이형","댕댕이형"],"댕댕이형"),kind=safeChoice(b.petKind,["cat","dog"],mode==="집사취급형"||mode==="개냥이형"?"cat":"dog");
    key=`${PREFIX}pets/${slug(mode)}.jpg`;prompt=petPrompt(kind,mode);width=640;height=640;meta={type,kind,mode}
  }
  const existing=await env.AVATAR_ASSETS.head(key);if(existing)return json({ok:true,cached:true,key,url:fileUrl(key),meta,engine:VISUAL_VERSION});
  const image=await runFlux(env.AI,{prompt,width,height,seed:Math.floor(Math.random()*1000000000)}),bytes=b64Bytes(image);
  await env.AVATAR_ASSETS.put(key,bytes,{httpMetadata:{contentType:"image/jpeg",cacheControl:"public, max-age=31536000"},customMetadata:{engine:VISUAL_VERSION,styleBlend:"30-real-70-animation",...Object.fromEntries(Object.entries(meta).map(([k,v])=>[k,String(v)]))}});
  return json({ok:true,cached:false,key,url:fileUrl(key),bytes:bytes.byteLength,meta,engine:VISUAL_VERSION})
}

async function avatarV17(request,env,json){
  if(!env.AI)return json({ok:false,error:"Workers AI binding unavailable"},503);
  const data=await request.formData(),image=data.get("image");if(!(image instanceof Blob)||image.size===0)return json({ok:false,error:"사진 파일이 필요합니다."},400);if(image.size>4000000)return json({ok:false,error:"사진 파일이 너무 큽니다."},413);
  const style=String(data.get("style")||"나답게"),variant=Math.max(0,Math.min(2,Math.round(Number(data.get("variant"))||0)));
  try{const out=await runFlux(env.AI,{prompt:avatarPrompt(style,variant),width:640,height:960,inputImage:image,seed:Math.floor(Math.random()*1000000000)+variant*9973});return json({ok:true,engine:VISUAL_VERSION,model:VISUAL_MODEL,image:`data:image/jpeg;base64,${out}`,variant,styleBlend:"30-real-70-animation"})}
  catch(error){return json({ok:false,error:error?.message||"AI 생성 중 오류가 발생했습니다."},500)}
}

async function ensurePose(request,env,ensureAuth,json){
  if(!env.AI||!env.AVATAR_ASSETS||!env.DB)return json({ok:false,error:"AI, R2 or D1 unavailable"},503);
  const auth=await ensureAuth(request,env,true);if(!auth.ok)return auth.response;
  const b=await request.json().catch(()=>({})),pose=safeChoice(b.pose,POSES,"");if(!pose)return json({ok:false,error:"Invalid pose"},400);
  const row=await latestAvatar(env,auth.deviceId);if(!row?.r2_key)return json({ok:false,error:"저장된 본캐가 먼저 필요합니다."},409);
  const base=avatarPrefix(row.r2_key),key=`${base}pose-${pose}-hybrid3070-v26.jpg`;
  const cached=await env.AVATAR_ASSETS.head(key);if(cached)return json({ok:true,cached:true,key,pose,engine:VISUAL_VERSION});
  try{
    const hybrid=await ensureHybridAvatar(env,row),source=await env.AVATAR_ASSETS.get(hybrid.key);if(!source)throw new Error("30:70 본캐를 찾지 못했습니다.");
    const out=await runFlux(env.AI,{prompt:posePrompt(pose),width:640,height:960,inputImage:await source.blob(),seed:Math.floor(Math.random()*1000000000)}),bytes=b64Bytes(out);
    await env.AVATAR_ASSETS.put(key,bytes,{httpMetadata:{contentType:"image/jpeg",cacheControl:"private, max-age=31536000"},customMetadata:{engine:VISUAL_VERSION,deviceId:auth.deviceId,pose,source:hybrid.key,styleBlend:"30-real-70-animation"}});
    return json({ok:true,cached:false,key,pose,bytes:bytes.byteLength,engine:VISUAL_VERSION})
  }catch(error){return json({ok:false,error:error?.message||"포즈 생성 실패"},500)}
}

async function servePose(request,env,ensureAuth){
  if(!env.AVATAR_ASSETS)return new Response("R2 unavailable",{status:503});
  const auth=await ensureAuth(request,env,true);if(!auth.ok)return auth.response;
  const url=new URL(request.url),key=String(url.searchParams.get("key")||"");
  if(!key.startsWith(`avatars/${auth.deviceId}/`)||!key.includes("/pose-")||key.includes(".."))return new Response("Not found",{status:404});
  const obj=await env.AVATAR_ASSETS.get(key);if(!obj)return new Response("Not found",{status:404});
  const headers=new Headers();obj.writeHttpMetadata(headers);headers.set("cache-control","private, max-age=31536000");if(!headers.get("content-type"))headers.set("content-type","image/jpeg");
  return new Response(obj.body,{headers})
}

function petDescriptor(kind,mode){
  if(kind==="cat")return mode==="집사취급형"?"one elegant animated companion cat, composed and slightly aloof":"one affectionate animated companion cat with warm curious eyes";
  return mode==="듬직이형"?"one calm loyal animated medium-small companion dog":"one bright friendly animated small companion dog"
}
function roomDescriptor(style){return style==="modern"?"refined contemporary Korean apartment living room with pale stone, oak and linen":style==="cozy"?"cozy premium Korean apartment living room with warm linen, oak and soft natural textures":"warm modern Korean apartment living room with cream fabric, natural oak and tasteful plants"}

function motionFramePrompt(slot,{roomStyle,petKind,petMode,time}){
  const room=roomDescriptor(roomStyle),pet=petDescriptor(petKind,petMode);
  const start={
    ambient:"The adult stands naturally near the sofa with relaxed arms while the pet rests nearby.",
    "walk-sit":"The adult stands two to three natural steps away from the sofa, body oriented toward a clear walking path, pet safely off the path.",
    "stand-walk":"The adult is seated naturally at the front edge of the sofa with both feet planted, ready to stand, pet resting nearby.",
    "pet-touch":"The adult stands one small step from the pet, torso relaxed, one hand free, with enough floor space to bend naturally.",
    "window-look":"The adult stands a few steps from the window with a clear path, shoulders relaxed, pet nearby but not blocking the path.",
    stretch:"The adult stands in open floor space, feet naturally planted, arms relaxed at the sides, ready for a gentle stretch."
  }[slot]||"The adult stands naturally in open floor space.";
  return [HYBRID_RULE,"Use input image 0 as the exact identity and visual-style reference for the same adult character.","Preserve the same recognizable face, age, hairstyle, body build, clothing design and 70/30 animated-film rendering.",`Place exactly one adult and ${pet} together inside the same ${room}.`,start,`Lighting corresponds to ${time||"a calm home moment"} and must match across character, pet and room.`,"Keep the sofa, window, rug, table, plants and major room geometry stable so every motion clip appears to happen in one continuous home.","Believable contact shadows, depth and occlusion; natural adult and animal anatomy.","No second person, no second animal, no text, no logo, no UI, no photorealistic photography, no game-avatar look."].join(" ")
}

function motionPrompt(slot){
  const common="Preserve the exact same adult identity, pet, room layout, clothing, colors, lighting and 70 percent animation / 30 percent realistic feature-film style from the first frame. Motion must feel like high-quality character animation, not a puppet and not a robot: use anticipation, natural weight transfer, ease-in and ease-out, overlapping action, subtle follow-through in shoulders and clothing, correct foot planting, stable hands and limbs, and believable balance. No foot sliding, no teleporting, no morphing, no extra limbs, no camera cut, no identity drift, no room transformation. End in a calm stable pose.";
  const action={
    ambient:"Locked cinematic camera. The person breathes naturally, blinks, makes a tiny posture adjustment and shifts weight almost imperceptibly. The pet makes one small head or ear movement. Curtains and plant leaves move very gently. Seamless calm living-room ambience.",
    "walk-sit":"The person looks toward the sofa, initiates with a subtle weight shift, then walks two to three natural steps with heel-to-toe footfalls, opposite arm swing and gentle hip/shoulder counter-rotation. They decelerate near the sofa, turn naturally, bend hips and knees with the torso leaning slightly forward, lower their weight onto the sofa, make soft contact, then settle into a relaxed seated pose. The pet stays clear of the walking path.",
    "stand-walk":"Starting seated, the person leans the torso forward, plants both feet, shifts weight over the feet, pushes smoothly through the legs, extends hips and knees, rises to standing without snapping, stabilizes for a moment, then takes two natural steps forward with relaxed opposite arm swing and realistic foot planting.",
    "pet-touch":"The person takes one small natural step toward the pet, slows, bends through hips and knees rather than folding stiffly, reaches with a relaxed hand, gives one gentle stroke, pauses as the pet responds naturally, then straightens partway into a comfortable relaxed posture.",
    "window-look":"The person walks two easy steps toward the window, slows, places the final foot with clear weight transfer, lets the arms settle, turns the head and upper torso naturally toward the view, breathes once and remains relaxed. The pet gives a small natural glance.",
    stretch:"The person inhales, shifts weight evenly, rolls the shoulders softly, raises the arms in a gentle morning stretch with elbows and wrists relaxed, lengthens through the torso, then lowers the arms with natural follow-through and returns to a neutral stance."
  }[slot]||"Natural subtle movement.";
  return `${action} ${common}`
}

function motionFrameKey(row,slot){return `${avatarPrefix(row.r2_key)}motion-v26/hybrid3070/${slot}.jpg`}
function motionVideoKey(row,slot){return `${avatarPrefix(row.r2_key)}motion-v26/hybrid3070/${slot}.mp4`}

async function generateMotionVideo(env,frameBytes,prompt){
  const firstFrame=`data:image/jpeg;base64,${bytesToBase64(frameBytes)}`;
  const result=await withTimeout(env.AI.run(MOTION_MODEL,{prompt,duration:MOTION_DURATION,fast_pretreatment:true,first_frame_image:firstFrame,prompt_optimizer:true,resolution:"768P"}),MOTION_TIMEOUT_MS);
  const url=result?.result?.video||result?.video;if(!url)throw new Error(`Motion video model returned no video (${result?.state||result?.result?.status||"unknown"})`);
  const r=await fetch(url);if(!r.ok)throw new Error(`Generated motion video download failed: ${r.status}`);
  const type=r.headers.get("content-type")||"video/mp4",bytes=new Uint8Array(await r.arrayBuffer());
  if(!type.includes("video")&&!url.includes(".mp4"))throw new Error("Generated motion asset is not a video");
  if(bytes.byteLength<50000||bytes.byteLength>60000000)throw new Error(`Generated motion video size is suspicious: ${bytes.byteLength}`);
  return {bytes,type}
}

async function motionStatus(env,row){
  const slots=[];for(const slot of MOTION_SLOTS){const [frame,video]=await Promise.all([env.AVATAR_ASSETS.head(motionFrameKey(row,slot)),env.AVATAR_ASSETS.head(motionVideoKey(row,slot))]);slots.push({slot,frame:Boolean(frame),video:Boolean(video),url:video?motionFileUrl(slot):null})}
  return slots
}

async function serveMotion(request,env,row,slot){
  const obj=await env.AVATAR_ASSETS.get(motionVideoKey(row,slot));if(!obj)return new Response("Not found",{status:404});
  const headers=new Headers();obj.writeHttpMetadata(headers);headers.set("cache-control","private, max-age=3600");headers.set("x-motion-engine",MOTION_VERSION);if(!headers.get("content-type"))headers.set("content-type","video/mp4");
  return new Response(obj.body,{headers})
}

async function handleMotionRoute(request,env,ensureAuth,json){
  const url=new URL(request.url);if(!url.pathname.startsWith("/api/motion/"))return null;
  if(!env.DB||!env.AVATAR_ASSETS)return json({ok:false,error:"Motion engine requires D1 and R2"},503);
  const auth=await ensureAuth(request,env,true);if(!auth.ok)return auth.response;
  const row=await latestAvatar(env,auth.deviceId);if(!row?.r2_key)return json({ok:false,error:"본캐를 먼저 만들어 저장해야 합니다."},409);

  if(url.pathname==="/api/motion/status"&&request.method==="GET"){
    const slots=await motionStatus(env,row);return json({ok:true,engine:MOTION_VERSION,videoModel:MOTION_MODEL,duration:MOTION_DURATION,styleBlend:"30-real-70-animation",slots,ready:slots.filter(x=>x.video).length,total:MOTION_SLOTS.length})
  }
  if(url.pathname==="/api/motion/file"&&request.method==="GET"){
    const slot=safeChoice(url.searchParams.get("slot"),MOTION_SLOTS,"");if(!slot)return new Response("Not found",{status:404});return serveMotion(request,env,row,slot)
  }
  if(url.pathname==="/api/motion/generate"&&request.method==="POST"){
    if(!env.AI)return json({ok:false,error:"Workers AI binding is required"},503);
    const b=await request.json().catch(()=>({})),slot=safeChoice(b.slot,MOTION_SLOTS,"");if(!slot)return json({ok:false,error:"Invalid motion slot"},400);
    if(b.confirm_cost!==true)return json({ok:false,error:"AI video generation may incur Cloudflare charges. Explicit confirm_cost=true is required."},402);
    const roomStyle=safeChoice(b.roomStyle,["warm","modern","cozy"],"warm"),petKind=safeChoice(b.petKind,["dog","cat"],"dog"),petMode=String(b.petMode||"댕댕이형").slice(0,30),time=safeChoice(b.time,["morning","leave","day","return","evening","night"],"evening"),force=Boolean(b.force);
    try{
      const vKey=motionVideoKey(row,slot),existing=await env.AVATAR_ASSETS.head(vKey);if(existing&&!force)return json({ok:true,engine:MOTION_VERSION,slot,cached:true,url:motionFileUrl(slot)});
      const fKey=motionFrameKey(row,slot);let frameObj=await env.AVATAR_ASSETS.get(fKey),frameBytes;
      if(frameObj&&!force)frameBytes=new Uint8Array(await frameObj.arrayBuffer());
      else{
        const hybrid=await ensureHybridAvatar(env,row),source=await env.AVATAR_ASSETS.get(hybrid.key);if(!source)throw new Error("30:70 본캐 기준 이미지를 찾지 못했습니다.");
        const out=await runFlux(env.AI,{prompt:motionFramePrompt(slot,{roomStyle,petKind,petMode,time}),width:896,height:1024,inputImage:await source.blob(),seed:Math.floor(Math.random()*1000000000)});
        frameBytes=b64Bytes(out);
        await env.AVATAR_ASSETS.put(fKey,frameBytes,{httpMetadata:{contentType:"image/jpeg",cacheControl:"private, max-age=31536000"},customMetadata:{engine:MOTION_VERSION,slot,role:"motion-frame",styleBlend:"30-real-70-animation"}});
      }
      const video=await generateMotionVideo(env,frameBytes,motionPrompt(slot));
      await env.AVATAR_ASSETS.put(vKey,video.bytes,{httpMetadata:{contentType:"video/mp4",cacheControl:"private, max-age=31536000"},customMetadata:{engine:MOTION_VERSION,model:MOTION_MODEL,slot,role:"motion-video",duration:String(MOTION_DURATION),bytes:String(video.bytes.byteLength),styleBlend:"30-real-70-animation"}});
      return json({ok:true,engine:MOTION_VERSION,slot,cached:false,url:motionFileUrl(slot),duration:MOTION_DURATION,bytes:video.bytes.byteLength})
    }catch(error){return json({ok:false,error:error?.message||"Motion generation failed",slot},500)}
  }
  return json({ok:false,error:"Not found"},404)
}

export async function handleVisualRoute(request,env,ensureAuth,json){
  const motion=await handleMotionRoute(request,env,ensureAuth,json);if(motion)return motion;
  const url=new URL(request.url);
  if(url.pathname==="/api/avatar/generate-v17"&&request.method==="POST")return avatarV17(request,env,json);
  if(url.pathname==="/api/avatar/hybrid-current"&&request.method==="POST")return hybridCurrent(request,env,ensureAuth,json);
  if(url.pathname==="/api/avatar/hybrid/file"&&request.method==="GET")return serveHybrid(request,env,ensureAuth);
  if(url.pathname==="/api/avatar/pose"&&request.method==="POST")return ensurePose(request,env,ensureAuth,json);
  if(url.pathname==="/api/avatar/pose/file"&&request.method==="GET")return servePose(request,env,ensureAuth);
  if(url.pathname==="/api/visual/file"&&request.method==="GET")return serveShared(url,env);
  if(url.pathname==="/api/visual/ensure"&&request.method==="POST")return ensureShared(request,env,ensureAuth,json);
  if(url.pathname.startsWith("/api/visual/"))return json({ok:false,error:"Not found"},404);
  return null
}
