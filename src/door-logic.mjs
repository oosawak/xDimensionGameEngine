/**
 * HD-2D Lab interior/world transition geometry.
 * This is shared between the single-file HTML build and Node.js tests.
 * World houses are fixed, with their doors on the +Z facade.
 */
export function nearOutdoorDoor(x,z,houses){
  let nearest=null, best=Infinity;
  houses.forEach((house,index)=>{
    // The interaction point is outside the WASM collider (including camera-side padding).
    const dx=x-house.x, dz=z-(house.z+3.75);
    if(Math.abs(dx)>1.28||Math.abs(dz)>1.18)return;
    const distance=dx*dx+dz*dz;
    if(distance<best){nearest=index;best=distance;}
  });
  return nearest;
}
export function nearIndoorExit(x,z){
  return Math.abs(x)<=1.35&&z>=2.15;
}
// Shared exact footprints for Three.js room rendering and collision.
// +Z is the camera-facing side; extra clearance prevents sprite-body overlap.
export const INTERIOR_FURNITURE = Object.freeze([
 {id:'bed',x:-2.45,z:-1.05,w:1.55,d:2.05,padX:.14,padZ:.10,frontPad:.27},
 {id:'table',x:.72,z:-.73,w:1.60,d:1.30,padX:.14,padZ:.11,frontPad:.33},
 {id:'chair-left',x:-.50,z:-.73,w:.45,d:.55,padX:.11,padZ:.10,frontPad:.22},
 {id:'chair-right',x:1.95,z:-.73,w:.45,d:.55,padX:.11,padZ:.10,frontPad:.22},
 {id:'cabinet',x:2.99,z:-2.82,w:1.34,d:.92,padX:.12,padZ:.12,frontPad:.18},
]);
const actorRadius=.31;
export function interiorFurnitureBounds(b){
 return {minX:b.x-b.w/2-b.padX-actorRadius,maxX:b.x+b.w/2+b.padX+actorRadius,
 minZ:b.z-b.d/2-b.padZ-actorRadius,maxZ:b.z+b.d/2+b.padZ+b.frontPad+actorRadius};
}
export function interiorFurnitureCollision(x,z){
 for(const b of INTERIOR_FURNITURE){
   const q=interiorFurnitureBounds(b);
   // Exact circle versus padded AABB; bounds above also include the radius.
   const left=q.minX+actorRadius,right=q.maxX-actorRadius;
   const back=q.minZ+actorRadius,front=q.maxZ-actorRadius;
   const tx=Math.max(left,Math.min(x,right)),tz=Math.max(back,Math.min(z,front));
   if((x-tx)**2+(z-tz)**2 < actorRadius**2-1e-8)return true;
 }
 return false;
}
const collision=interiorFurnitureCollision;
// Recover safely if a stale save/state or numerical overlap starts the actor
// inside a collider. Standard positions never invoke the search.
function recoverInteriorPosition(x,z){
  const clampX=v=>Math.max(-3.56,Math.min(3.56,v));
  const clampZ=v=>Math.max(-3.24,Math.min(2.90,v));
  x=clampX(x);z=clampZ(z);
  if(!collision(x,z))return {x,z};
  // Search outward in increasing radius; take the nearest collision-free cell.
  for(let r=.05;r<=1.55;r+=.05){
    for(let k=0;k<32;k++){
      const a=(k/32)*Math.PI*2;
      const tx=clampX(x+Math.cos(a)*r),tz=clampZ(z+Math.sin(a)*r);
      if(!collision(tx,tz))return {x:tx,z:tz};
    }
  }
  // Unrecoverable layout state: reset to the clear entrance landing.
  return {x:0,z:1.1};
}
export function stepInteriorPlayer(x,z,dx,dz,dt,speed=3.6){
 ({x,z}=recoverInteriorPosition(x,z));
 const len=Math.hypot(dx,dz);if(len>1){dx/=len;dz/=len;}
 dt=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.05));
 speed=Math.max(0,Math.min(Number.isFinite(speed)?speed:3.6,10));
 const mx=dx*speed*dt,mz=dz*speed*dt;
 const steps=Math.max(1,Math.ceil(Math.max(Math.abs(mx),Math.abs(mz))/.075));
 for(let i=0;i<steps;i++){
   const nx=Math.max(-3.56,Math.min(3.56,x+mx/steps));
   if(!collision(nx,z))x=nx;
   const nz=Math.max(-3.24,Math.min(2.90,z+mz/steps));
   if(!collision(x,nz))z=nz;
 }
 return {x,z};
}
