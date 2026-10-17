import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nearOutdoorDoor,nearIndoorExit,stepInteriorPlayer} from '../src/door-logic.mjs';
const config=JSON.parse(fs.readFileSync(new URL('../assets/collision-world.json',import.meta.url),'utf8'));
const wasm=fs.readFileSync(new URL('../dist/engine.wasm',import.meta.url));
const engine=new WebAssembly.Instance(new WebAssembly.Module(wasm),{}).exports;
engine.set_view_collision(Math.sin(.71),Math.cos(.71),1);
// All 12 approach points must be reachable, and map to the correct house.
for(let i=0;i<config.houses.length;i++){
  const h=config.houses[i];
  engine.reset(h.x,h.z+3.75);
  const p={x:engine.get_x(),z:engine.get_z()};
  assert(Math.abs(p.x-h.x)<.01&&Math.abs(p.z-(h.z+3.75))<.01,`house ${i+1}: exit point blocked or fell back: ${JSON.stringify(p)}`);
  assert.equal(nearOutdoorDoor(p.x,p.z,config.houses),i,`house ${i+1}: missing interaction at entrance`);
}
assert.equal(nearOutdoorDoor(0,3.5,config.houses),null,'should not enter any house in the plaza');
assert.equal(nearIndoorExit(0,1.1),false,'spawn must not immediately be at exit trigger');
assert.equal(nearIndoorExit(0,2.4),true,'walk to threshold to exit');
assert.equal(nearIndoorExit(2.7,2.4),false,'the exit should be at the center of front wall');
let x=0,z=1.1;
for(let k=0;k<27;k++){({x,z}=stepInteriorPlayer(x,z,0,1,1/60));}
assert(nearIndoorExit(x,z),`should be able to reach interior doorway: z=${z}`);
let side={x:3.2,z:2.2};
for(let k=0;k<90;k++){side=stepInteriorPlayer(side.x,side.z,1,1,1/60);}
assert(side.x<=3.56&&side.z<=2.9,'interior walls must stop actor');
let before={x:-1.0,z:-.9};
for(let k=0;k<110;k++){before=stepInteriorPlayer(before.x,before.z,-1,0,1/60);}
assert(before.x> -1.35,'bed should block movement from the side');
console.log('PASS: all 18 doors reachable by WASM, entrances map correctly, indoor furniture and exits work');
