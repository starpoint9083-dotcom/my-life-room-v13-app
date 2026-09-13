import baseApp from "./index.js";
import {handleSceneLibraryRoute,SCENE_LIBRARY_INFO} from "./scene-library.js";
import {handleP3ControlRoute,P3_CONTROL_INFO} from "./p3-control.js";
export {CinemaBatchWorkflow} from "./index.js";

const JSON_HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:JSON_HEADERS})}
function safeDeviceId(value){const s=String(value||"").trim();return s&&s.length<=128&&/^[A-Za-z0-9._:-]+$/.test(s)?s:null}
function safeToken(value){const s=String(value||"").trim();return s&&s.length>=24&&s.length<=160&&/^[A-Za-z0-9._:-]+$/.test(s)?s:null}
async function sha256Hex(text){const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));return Array.from(new Uint8Array(buf),b=>b.toString(16).padStart(2,"0")).join("")}
async function ensureAuth(request,env,allowCreate=true){
 if(!env.DB)return {ok:false,response:json({ok:false,error:"D1 binding is not connected."},503)};
 const deviceId=safeDeviceId(request.headers.get("x-device-id")),token=safeToken(request.headers.get("x-device-token"));
 if(!deviceId||!token)return {ok:false,response:json({ok:false,error:"Device credentials missing"},401)};
 const tokenHash=await sha256Hex(token),row=await env.DB.prepare("SELECT token_hash FROM device_auth WHERE device_id=?1").bind(deviceId).first();
 if(!row){if(!allowCreate)return {ok:false,response:json({ok:false,error:"Device not registered"},401)};await env.DB.prepare("INSERT INTO device_auth (device_id,token_hash) VALUES (?1,?2)").bind(deviceId,tokenHash).run()}
 else if(row.token_hash!==tokenHash)return {ok:false,response:json({ok:false,error:"Invalid device credentials"},403)};
 await env.DB.prepare("UPDATE device_auth SET last_seen_at=datetime('now') WHERE device_id=?1").bind(deviceId).run();return {ok:true,deviceId}
}
async function injectSceneManager(request,response){
 if(request.method!=="GET"||!response?.ok)return response;const type=response.headers.get("content-type")||"";if(!type.includes("text/html"))return response;
 const html=await response.text();if(html.includes("/scene-manager-v29.js"))return new Response(html,response);
 const tag='<script src="/scene-manager-v29.js?v=29" defer></script>',body=html.includes("</body>")?html.replace("</body>",tag+"</body>"):html+tag,headers=new Headers(response.headers);headers.set("cache-control","no-cache");headers.delete("content-length");return new Response(body,{status:response.status,statusText:response.statusText,headers})
}

export default {
 async fetch(request,env,ctx){
   const url=new URL(request.url);
   if(url.pathname==="/api/p3/info"&&request.method==="GET")return json({ok:true,...P3_CONTROL_INFO,d1:Boolean(env.DB),r2:Boolean(env.AVATAR_ASSETS),ai:Boolean(env.AI)});
   if(url.pathname.startsWith("/api/p3/")){const p3=await handleP3ControlRoute(request,env,ensureAuth,json);if(p3)return p3}
   if(url.pathname==="/api/scene-library/info"&&request.method==="GET")return json({ok:true,...SCENE_LIBRARY_INFO,d1:Boolean(env.DB),r2:Boolean(env.AVATAR_ASSETS)});
   if(url.pathname.startsWith("/api/scene-library/")){const scene=await handleSceneLibraryRoute(request,env,ensureAuth,json);if(scene)return scene}
   const response=await baseApp.fetch(request,env,ctx);return injectSceneManager(request,response)
 }
};
