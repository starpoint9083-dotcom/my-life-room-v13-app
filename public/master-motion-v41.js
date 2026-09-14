(()=>{
"use strict";
const VERSION="v41-cinematic-master-motion";
const DURATIONS={master_01_sofa_relax:7000,master_02_window_gaze:6500,master_03_pet_touch:5500,master_04_return_home:2200,master_05_sit_down:2300,master_06_walk_to_window:3000,master_07_morning_life:7000,master_08_night_rest:8000};
let current="",runs=0;
function room(){return document.getElementById("room")}
function image(){return document.getElementById("masterScene40")}
function play(id){const r=room(),img=image();if(!r||!img||!DURATIONS[id])return false;current=id;runs+=1;r.dataset.master41=id;r.style.setProperty("--m41-duration",`${DURATIONS[id]}ms`);r.classList.remove("master41-run");void r.offsetWidth;r.classList.add("master41-run");window.dispatchEvent(new CustomEvent("p2:master-motion-v41-play",{detail:{id,duration:DURATIONS[id],run:runs}}));return true}
function stop(){const r=room();if(r){r.classList.remove("master41-run");delete r.dataset.master41;r.style.removeProperty("--m41-duration")}current="";return true}
function status(){return {version:VERSION,current,runs,profileCount:Object.keys(DURATIONS).length,freeOnly:true,paidGeneration:false,mode:"cinematic-still-motion"}}
function onMaster(e){const id=String(e?.detail?.id||"");if(id)requestAnimationFrame(()=>play(id))}
function boot(){window.addEventListener("p2:master-scene-v40-show",onMaster);const r=room();if(r?.dataset?.master40)play(r.dataset.master40);window.masterMotionV41={version:VERSION,play,stop,status,durations:()=>({...DURATIONS})};window.dispatchEvent(new CustomEvent("p2:master-motion-v41-ready",{detail:status()}))}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,1350),{once:true});else setTimeout(boot,1350);
})();
