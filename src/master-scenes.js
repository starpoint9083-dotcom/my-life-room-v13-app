const VERSION="v40-eight-master-assets";
const PREFIX="master-scenes/v40/";
const IDS=[
  "master_01_sofa_relax","master_02_window_gaze","master_03_pet_touch","master_04_return_home",
  "master_05_sit_down","master_06_walk_to_window","master_07_morning_life","master_08_night_rest"
];
const ID_SET=new Set(IDS);
const MAX_BYTES=3_000_000;
function keyFor(id){return `${PREFIX}${id}.webp`}
function validId(id){return ID_SET.has(String(id||""))}
function responseJson(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}})}
export const MASTER_SCENES_INFO={version:VERSION,masterCount:8,freeOnly:true,paidGeneration:false,ids:[...IDS]};
export async function handleMasterScenesRoute(request,env,ensureAuth,json=responseJson){
  const url=new URL(request.url);
  if(!url.pathname.startsWith("/api/master-scenes/"))return null;
  if(url.pathname==="/api/master-scenes/info"&&request.method==="GET"){
    return json({ok:true,...MASTER_SCENES_INFO,r2:Boolean(env.AVATAR_ASSETS)});
  }
  if(!env.AVATAR_ASSETS)return json({ok:false,error:"R2 binding is not connected."},503);
  if(url.pathname==="/api/master-scenes/status"&&request.method==="GET"){
    const assets=[];
    for(const id of IDS){
      const head=await env.AVATAR_ASSETS.head(keyFor(id));
      assets.push({id,ready:Boolean(head),size:head?.size||0,etag:head?.httpEtag||""});
    }
    return json({ok:true,version:VERSION,readyCount:assets.filter(x=>x.ready).length,total:IDS.length,assets,freeOnly:true,paidGeneration:false});
  }
  if(url.pathname==="/api/master-scenes/file"&&request.method==="GET"){
    const id=url.searchParams.get("id");
    if(!validId(id))return json({ok:false,error:"Invalid master scene id."},400);
    const object=await env.AVATAR_ASSETS.get(keyFor(id));
    if(!object)return json({ok:false,error:"Master scene not found."},404);
    const headers=new Headers();
    object.writeHttpMetadata(headers);
    headers.set("content-type",headers.get("content-type")||"image/webp");
    headers.set("cache-control","public, max-age=86400, stale-while-revalidate=604800");
    if(object.httpEtag)headers.set("etag",object.httpEtag);
    headers.set("x-p2-master-scene",id);
    return new Response(object.body,{status:200,headers});
  }
  if(url.pathname==="/api/master-scenes/upload"&&request.method==="POST"){
    const auth=await ensureAuth(request,env,true);
    if(!auth.ok)return auth.response;
    let form;
    try{form=await request.formData()}catch{return json({ok:false,error:"multipart/form-data required"},400)}
    const id=String(form.get("id")||"");
    const file=form.get("file");
    if(!validId(id))return json({ok:false,error:"Invalid master scene id."},400);
    if(!file||typeof file.arrayBuffer!=="function")return json({ok:false,error:"Image file is required."},400);
    const type=String(file.type||"").toLowerCase();
    if(type!=="image/webp")return json({ok:false,error:"Only image/webp is accepted."},415);
    if(Number(file.size||0)<=0||Number(file.size)>MAX_BYTES)return json({ok:false,error:"Master scene image must be between 1 byte and 3 MB."},413);
    const bytes=await file.arrayBuffer();
    await env.AVATAR_ASSETS.put(keyFor(id),bytes,{httpMetadata:{contentType:"image/webp",cacheControl:"public, max-age=86400"},customMetadata:{role:"p2-master-scene-v40",masterId:id,version:VERSION,uploadedByDevice:auth.deviceId}});
    const head=await env.AVATAR_ASSETS.head(keyFor(id));
    return json({ok:true,id,key:keyFor(id),size:head?.size||bytes.byteLength,version:VERSION});
  }
  return null;
}
