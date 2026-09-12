export const CINEMA_WORLD_VERSION="cinema-world-v1";
export const CINEMA_WORLD_ANCHOR_SLOT="base-morning";

const SLOT_FAMILY={
  "base-morning":"morning","base-evening":"evening","base-night":"night",
  "state-success":"neutral","state-steady":"neutral","state-recovery":"neutral",
  "action-avatar":"neutral","action-pet":"neutral","action-room":"neutral"
};

function petDescriptor(kind,mode){
  if(kind==="cat")return mode==="집사취급형"
    ?"one elegant silver-tabby companion cat, composed and slightly aloof"
    :"one affectionate silver-tabby companion cat with warm curious eyes";
  return mode==="듬직이형"
    ?"one calm loyal medium-small warm-brown companion dog"
    :"one bright friendly small warm-brown companion dog";
}

function roomMaterial(style){
  if(style==="modern")return "pale stone, natural oak, cream linen and restrained black accents";
  if(style==="cozy")return "warm natural oak, cream linen, soft woven textures and muted beige accents";
  return "natural oak, cream fabric, warm ivory walls and tasteful green plants";
}

function lightingFamily(slot){
  const family=SLOT_FAMILY[slot]||"neutral";
  if(family==="morning")return "soft early-morning daylight from the rear window, warm sunlight direction from camera-left, gentle natural fill";
  if(family==="evening")return "blue-hour daylight outside with the same practical floor lamp and warm interior lamps turned on";
  if(family==="night")return "deep blue city light outside with the same warm practical lamps, low-key but readable faces";
  return "balanced soft daylight-practical mix that preserves the same room geometry and shadow direction as the canonical home";
}

export function buildCinemaWorldPack({roomStyle="warm",petKind="dog",petMode="댕댕이형"}={}){
  const pet=petDescriptor(petKind,petMode);
  const material=roomMaterial(roomStyle);
  return {
    version:CINEMA_WORLD_VERSION,
    anchorSlot:CINEMA_WORLD_ANCHOR_SLOT,
    identity:"the exact same adult person across every shot; same recognizable face, age, hairstyle, skin tone, body build and adult proportions",
    wardrobe:"the exact same outfit across every shot; when a world-reference image exists, copy its clothing exactly and do not restyle it",
    pet:`the exact same companion pet across every shot: ${pet}; preserve coat color, markings, scale and facial identity`,
    room:`one single canonical premium Korean apartment living room using ${material}; fixed layout: cream three-seat sofa centered against the rear window wall, natural-oak sofa arms and side furniture, tall floor lamp on camera-left, broad rear windows with cream sheer curtains, one tall green plant on camera-right, low oak coffee table toward camera-right foreground, neutral woven rug, uncluttered floor`,
    camera:"one coherent film language: full-frame 35mm look, eye-level camera around 1.45m, same room axis and left-right orientation, natural perspective, restrained depth of field, no fisheye or dramatic lens change",
    physical:"person and pet are physically inside the room with matching light direction, contact shadows, believable occlusion, floor contact and scale; never pasted cutouts",
    forbidden:"no second person, no second animal, no duplicate body parts, no floating subject, no room-layout swap, no furniture teleportation, no wardrobe change, no pet-breed change, no text, no logo, no UI, no collage, no illustration"
  };
}

export function worldReferenceInstruction(hasReference){
  return hasReference
    ?"Input image 0 is the exact adult identity reference. Input image 1 is the canonical world reference. Copy the room architecture, furniture layout, wardrobe, pet identity, camera axis and overall material palette from input image 1 while preserving the person's identity from input image 0."
    :"Input image 0 is the exact adult identity reference. Establish the canonical world described below; this frame will become the room, wardrobe, pet and camera reference for later shots.";
}

export function worldPromptPrefix(slot,opts,{hasReference=false}={}){
  const w=buildCinemaWorldPack(opts);
  return [
    worldReferenceInstruction(hasReference),
    `WORLD LOCK ${w.version}.`,
    `IDENTITY LOCK: ${w.identity}.`,
    `WARDROBE LOCK: ${w.wardrobe}.`,
    `PET LOCK: ${w.pet}.`,
    `ROOM LOCK: ${w.room}.`,
    `CAMERA LOCK: ${w.camera}.`,
    `LIGHTING FOR THIS SHOT: ${lightingFamily(slot)}.`,
    `PHYSICAL INTEGRATION: ${w.physical}.`,
    `FORBIDDEN: ${w.forbidden}.`
  ].join(" ");
}

export function motionWorldLock(){
  const w=buildCinemaWorldPack();
  return `WORLD LOCK ${w.version}: keep the exact same person identity, pet identity, wardrobe, furniture layout, room geometry, left-right orientation, camera axis and material palette from the first frame for the full 6 seconds. No morphing, no identity drift, no pet drift, no room drift, no wardrobe change, no object teleportation, no sudden exposure jump, no cut to another angle.`;
}

export function stableWorldSeed(avatarKey,slot){
  const text=`${CINEMA_WORLD_VERSION}|${String(avatarKey||"")}|${String(slot||"")}`;
  let h=2166136261;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}
  return (h>>>0)%1000000000;
}

export const CINEMA_WORLD_INFO={
  version:CINEMA_WORLD_VERSION,
  anchorSlot:CINEMA_WORLD_ANCHOR_SLOT,
  locks:["identity","wardrobe","pet","room-layout","camera-axis","materials","physical-lighting"],
  referenceImages:2,
  regenerationPolicy:"reuse-canonical-world-reference"
};
