import assert from 'node:assert/strict';
import {INTERIOR_FURNITURE,interiorFurnitureCollision,interiorFurnitureBounds,stepInteriorPlayer} from '../src/door-logic.mjs';
assert.equal(INTERIOR_FURNITURE.length,5);
// Every furniture item shares its visual footprint dimensions with the collision system.
for(const b of INTERIOR_FURNITURE){
 assert(b.w>0&&b.d>0&&b.frontPad>0,`${b.id} malformed`);
 assert(interiorFurnitureCollision(b.x,b.z),`${b.id} center needs blocking`);
 const bounds=interiorFurnitureBounds(b);
 assert(bounds.maxZ-(b.z+b.d/2)>.5,`${b.id} camera-side padding missing`);
 for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[.7,.7],[-.7,.7]]){
  // Begin in clear space from different directions, only if within room.
  let x=b.x+dx*2.7,z=b.z+dz*2.7;
  x=Math.min(3.56,Math.max(-3.56,x));z=Math.min(2.9,Math.max(-3.24,z));
  if(interiorFurnitureCollision(x,z))continue;
  for(let k=0;k<90;k++){
   const p=stepInteriorPlayer(x,z,-dx,-dz,1/30,5.94);
   assert(!interiorFurnitureCollision(p.x,p.z),`${b.id} collision bypass @ ${p.x},${p.z}`);
   x=p.x;z=p.z;
  }
 }
}
// A hard drive diagonally through the middle must never enter the table or chairs.
for(const [sx,sz,dx,dz] of [[0,1.1,1,-1],[0,1.1,0,-1],[-2.7,1.1,1,-1],[2.7,1.1,-1,-1]]){
 let p={x:sx,z:sz};
 for(let i=0;i<140;i++){
  p=stepInteriorPlayer(p.x,p.z,dx,dz,.05,10);
  assert(!interiorFurnitureCollision(p.x,p.z),`through furniture: ${JSON.stringify(p)}`);
 }
}
// Exit lane must remain free, and blocked movement can reverse immediately.
let p={x:0,z:1.1};for(let i=0;i<35;i++)p=stepInteriorPlayer(p.x,p.z,0,1,1/60);
assert(p.z>=2.15,'exit lane blocked');
for(let i=0;i<35;i++)p=stepInteriorPlayer(p.x,p.z,0,-1,1/60);
assert(p.z<1.8,'cannot reverse from exit');
console.log('PASS: 5 furniture footprints, 4 cardinal + 2 diagonal approaches, high-speed substeps, exit and reverse');
