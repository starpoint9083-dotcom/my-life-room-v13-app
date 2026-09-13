const MAX_VIDEO_BYTES=24_000_000;
const SCENE_ID_RE=/^[a-z0-9][a-z0-9_-]{2,63}$/;
const MIME_TO_EXT={"video/mp4":"mp4","video/webm":"webm"};
const JSON_HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};

function jsonLocal(data,status=200){return new Response(JSON.stringify(data),{status,headers:JSON_HEADERS})}
function safeSceneId(v){const s=String(v||"").trim();return SCENE_ID_RE.test(s)?s:null}
function safeSceneType(v){const s=String(v||"").trim();return s==="transition"?"transition":"ambient"}
function validDuration(type,ms){const n=Number(ms);if(!Number.isFinite(n))return null;if(type==="transition")return n>=700&&n<=4500?Math.round(n):null;return n>=3000&&n<=7500?Math.round(n):null}
function validQc(v){const s=String(v||"").trim();return ["ready","rejected","draft"].includes(s)?s:null}
async function requireBindings(env,json){if(!env.DB)return json({ok:false,error:"D1 binding is not connected."},503);if(!env.AVATAR_ASSETS)return json({ok:false,error:"R2 binding is not connected."},503);return null}

async function listAssets(request,env,ensureAuth,json){
 const missing=await requireBindings(env,json);if(missing)return missing;
 const auth=await ensureAuth(request,env,true);if(!auth.ok)return auth.response;
 const rows=await env.DB.prepare("SELECT scene_id,mime_type,duration_ms,scene_type,qc_status,size_bytes,updated_at FROM scene_assets WHERE device_id=?1 ORDER BY updated_at DESC").bind(auth.deviceId).all();
 return json({ok:true,assets:(rows.results||[]).map(r=>({...r,file_api:`/api/scene-library/file?scene_id=${encodeURIComponent(r.scene_id)}`}))});
}

async function uploadAsset(request,env,ensureAuth,json){
 const missing=await requireBindings(env,json);if(missing)return missing;
 const auth=await ensureAuth(request,env,true);if(!auth.ok)return auth.response;
 const data=await request.formData();
 const sceneId=safeSceneId(data.get("scene_id")),sceneType=safeSceneType(data.get("scene_type")),video=data.get("video");
 if(!sceneId)return json({ok:false,error:"Invalid scene id"},400);
 if(!(video instanceof Blob)||video.size===0)return json({ok:false,error:"Video file is required"},400);
 if(video.size>MAX_VIDEO_BYTES)return json({ok:false,error:"Video file is too large"},413);
 const mime=String(video.type||"").toLowerCase(),ext=MIME_TO_EXT[mime];
 if(!ext)return json({ok:false,error:"Only MP4 or WebM video is supported"},415);
 const durationMs=validDuration(sceneType,data.get("duration_ms"));
 if(durationMs===null)return json({ok:false,error:sceneType==="transition"?"Transition clip must be about 0.7–4.5 seconds":"Lifestyle clip must be about 3–7.5 seconds"},400);
 const old=await env.DB.prepare("SELECT r2_key FROM scene_assets WHERE device_id=?1 AND scene_id=?2").bind(auth.deviceId,sceneId).first();
 const key=`scene-library/${auth.deviceId}/${sceneId}/${crypto.randomUUID()}.${ext}`;
 await env.AVATAR_ASSETS.put(key,video,{httpMetadata:{contentType:mime,cacheControl:"private, max-age=3600"},customMetadata:{deviceId:auth.deviceId,sceneId,sceneType,durationMs:String(durationMs),role:"p2-lifestyle-scene",updatedAt:new Date().toISOString()}});
 try{
   await env.DB.prepare("INSERT INTO scene_assets (device_id,scene_id,r2_key,mime_type,duration_ms,scene_type,qc_status,size_bytes,updated_at) VALUES (?1,?2,?3,?4,?5,?6,'ready',?7,datetime('now')) ON CONFLICT(device_id,scene_id) DO UPDATE SET r2_key=excluded.r2_key,mime_type=excluded.mime_type,duration_ms=excluded.duration_ms,scene_type=excluded.scene_type,qc_status='ready',size_bytes=excluded.size_bytes,updated_at=datetime('now')").bind(auth.deviceId,sceneId,key,mime,durationMs,sceneType,video.size).run();
 }catch(e){try{await env.AVATAR_ASSETS.delete(key)}catch{}throw e}
 if(old?.r2_key&&old.r2_key!==key)try{await env.AVATAR_ASSETS.delete(old.r2_key)}catch{}
 return json({ok:true,scene_id:sceneId,duration_ms:durationMs,scene_type:sceneType,size_bytes:video.size,file_api:`/api/scene-library/file?scene_id=${encodeURIComponent(sceneId)}`});
}

async function serveAsset(request,env,ensureAuth,json){
 const missing=await requireBindings(env,json);if(missing)return missing;
 const auth=await ensureAuth(request,env,false);if(!auth.ok)return auth.response;
 const sceneId=safeSceneId(new URL(request.url).searchParams.get("scene_id"));if(!sceneId)return json({ok:false,error:"Invalid scene id"},400);
 const row=await env.DB.prepare("SELECT r2_key,mime_type,qc_status FROM scene_assets WHERE device_id=?1 AND scene_id=?2").bind(auth.deviceId,sceneId).first();
 if(!row||row.qc_status==="rejected")return json({ok:false,error:"Scene asset not found"},404);
 const object=await env.AVATAR_ASSETS.get(row.r2_key);if(!object)return json({ok:false,error:"Scene file is missing"},404);
 const headers=new Headers();headers.set("content-type",object.httpMetadata?.contentType||row.mime_type||"video/mp4");headers.set("cache-control","private, max-age=3600");headers.set("accept-ranges","bytes");if(object.size)headers.set("content-length",String(object.size));
 return new Response(object.body,{status:200,headers});
}

async function setQc(request,env,ensureAuth,json){
 if(!env.DB)return json({ok:false,error:"D1 binding is not connected."},503);
 const auth=await ensureAuth(request,env,true);if(!auth.ok)return auth.response;
 const body=await request.json().catch(()=>null),sceneId=safeSceneId(body?.scene_id),status=validQc(body?.status);
 if(!sceneId||!status)return json({ok:false,error:"Invalid QC payload"},400);
 const out=await env.DB.prepare("UPDATE scene_assets SET qc_status=?3,updated_at=datetime('now') WHERE device_id=?1 AND scene_id=?2").bind(auth.deviceId,sceneId,status).run();
 return json({ok:true,scene_id:sceneId,status,changed:Number(out.meta?.changes||0)});
}

async function deleteAsset(request,env,ensureAuth,json){
 const missing=await requireBindings(env,json);if(missing)return missing;
 const auth=await ensureAuth(request,env,true);if(!auth.ok)return auth.response;
 const sceneId=safeSceneId(new URL(request.url).searchParams.get("scene_id"));if(!sceneId)return json({ok:false,error:"Invalid scene id"},400);
 const row=await env.DB.prepare("SELECT r2_key FROM scene_assets WHERE device_id=?1 AND scene_id=?2").bind(auth.deviceId,sceneId).first();
 if(!row)return json({ok:true,deleted:false,scene_id:sceneId});
 await env.DB.prepare("DELETE FROM scene_assets WHERE device_id=?1 AND scene_id=?2").bind(auth.deviceId,sceneId).run();
 try{await env.AVATAR_ASSETS.delete(row.r2_key)}catch{}
 return json({ok:true,deleted:true,scene_id:sceneId});
}

export async function handleSceneLibraryRoute(request,env,ensureAuth,json=jsonLocal){
 const url=new URL(request.url),p=url.pathname;
 if(p==="/api/scene-library/status"&&request.method==="GET")return listAssets(request,env,ensureAuth,json);
 if(p==="/api/scene-library/upload"&&request.method==="POST")return uploadAsset(request,env,ensureAuth,json);
 if(p==="/api/scene-library/file"&&request.method==="GET")return serveAsset(request,env,ensureAuth,json);
 if(p==="/api/scene-library/qc"&&request.method==="POST")return setQc(request,env,ensureAuth,json);
 if(p==="/api/scene-library/delete"&&request.method==="DELETE")return deleteAsset(request,env,ensureAuth,json);
 return null;
}

export const SCENE_LIBRARY_INFO={version:"v29-scene-manager",maxVideoBytes:MAX_VIDEO_BYTES,freeOnly:true};
