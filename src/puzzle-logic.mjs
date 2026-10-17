/** Data-independent puzzle helper functions, shared by Node tests and browser. */
export const PUZZLE_STORAGE_KEY='xdimension-game-engine-puzzle-v1';
export function nearestPuzzleBox(px,pz,boxes,maxDist=2.25){
 let result=null,nearest=maxDist*maxDist;
 for(let i=0;i<boxes.length;i++){
  const b=boxes[i],d=(b.x-px)**2+(b.z-pz)**2;
  const dir=puzzlePushDirection(px,pz,b.x,b.z);
  const ax=b.x-px,az=b.z-pz;
  const forward=ax*dir.x+az*dir.z;
  const sideways=Math.abs(ax*dir.z-az*dir.x);
  if(d<nearest&&forward>=.67&&forward<=2.25&&sideways<=.85){nearest=d;result=i;}
 }
 return result;
}
/** Direction is always FROM the player TOWARD the box: E pushes AWAY. */
export function puzzlePushDirection(px,pz,bx,bz){
 const dx=bx-px,dz=bz-pz;
 if(Math.abs(dx)>=Math.abs(dz))return {x:dx>=0?1:-1,z:0};
 return {x:0,z:dz>=0?1:-1};
}
export function puzzleProgress(boxes,targets,tolerance=.28){
 let placed=0;
 for(const target of targets){
  if(boxes.some(b=>Math.hypot(b.x-target.x,b.z-target.z)<tolerance))placed++;
 }
 return {placed,total:targets.length,solved:placed===targets.length};
}
export function validSavedPuzzleBoxes(raw,initial,step=1.5){
 if(!Array.isArray(raw)||raw.length!==initial.length)return null;
 const restored=[];
 for(let i=0;i<raw.length;i++){
  const p=raw[i];
  if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.z))return null;
  // Push positions stay on a discrete lattice: fail closed on corrupt saves.
  const deltaX=(p.x-initial[i].x)/step,deltaZ=(p.z-initial[i].z)/step;
  if(Math.abs(deltaX-Math.round(deltaX))>.005||Math.abs(deltaZ-Math.round(deltaZ))>.005)return null;
  if(Math.abs(p.x)>20||p.z<19||p.z>58)return null;
  restored.push({x:p.x,z:p.z});
 }
 if(restored.length===2&&Math.hypot(restored[0].x-restored[1].x,restored[0].z-restored[1].z)<1.35)return null;
 return restored;
}
