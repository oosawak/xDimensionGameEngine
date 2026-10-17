import assert from 'node:assert/strict';
import fs from 'node:fs';
import {findPortal,mountainRoadZ,areaTerrainHeight} from '../src/area-maps.mjs';
import {nearOutdoorDoor} from '../src/door-logic.mjs';
const root=new URL('../',import.meta.url);
const spec=JSON.parse(fs.readFileSync(new URL('assets/area-maps.json',root),'utf8'));
const wasm=fs.readFileSync(new URL('dist/engine.wasm',root));
const engine=new WebAssembly.Instance(new WebAssembly.Module(wasm)).exports;
assert.equal(spec.maps.length,3);
assert.equal(spec.portals.length,4);
engine.set_view_collision(.65,.76,1);
function move(dx,dz,steps){for(let i=0;i<steps;i++)engine.move_player(dx,dz,.05);}
function travel(to){
 const p=findPortal(engine.get_map(),engine.get_x(),engine.get_z(),spec.portals);
 assert(p,`no portal at area=${engine.get_map()}, pos=${engine.get_x().toFixed(2)},${engine.get_z().toFixed(2)}`);
 assert.equal(p.to,to);
 engine.set_map(to);engine.reset(p.spawn.x,p.spawn.z);
 assert.equal(engine.get_map(),to);
 assert(Math.abs(engine.get_x()-p.spawn.x)<.05,'destination spawn must be outside colliders');
 assert(Math.abs(engine.get_z()-p.spawn.z)<.05,'destination spawn must be outside colliders');
}
// Regression: the v0.0.9 test RESET THE PLAYER INSIDE THE PORTAL.
// This passed even though walking east from the town's central street hit a house.
// Verify actual WASM player motion from a real, free town street position.
engine.set_map(0);engine.reset(0,78.5);
move(1,0,130);
assert(engine.get_x()<6,'old Z=78.5 straight line runs into the house');
assert.equal(findPortal(0,engine.get_x(),engine.get_z(),spec.portals),null);
// Take the actual northward turn from the central plaza, not a debug reset.
engine.reset(0,78.5);
move(0,-1,21); // W/up from the plaza to the unobstructed Z≈74.7 lane.
assert(Math.abs(engine.get_z()-74.72)<.15,'the turn into the east-west street must be walkable');
assert(engine.get_collision_count()===0,'approach from Aoba central plaza must be free of collision');
let reachedEastGate=false;
for(let i=0;i<160;i++){
 engine.move_player(1,0,.05);
 if(findPortal(0,engine.get_x(),engine.get_z(),spec.portals)){
   reachedEastGate=true;break;
 }
}
assert(reachedEastGate,`east gate NOT walkable from the Aoba street: x=${engine.get_x()},z=${engine.get_z()}, collisions=${engine.get_collision_count()}`);
assert(engine.get_collision_count()===0,'east gate road must be free of collisions, even with camera margin');
travel(1);
// Cross the mountain path in small segments, descending/ascending the bridge.
let maxY=0;
for(let n=1;n<=100;n++){
 const desiredX=-23.5+n*.50;
 const desiredZ=mountainRoadZ(desiredX);
 for(let q=0;q<9;q++){
  const dx=Math.max(-1,Math.min(1,(desiredX-engine.get_x())/.18));
  const dz=Math.max(-1,Math.min(1,(desiredZ-engine.get_z())/.18));
  engine.move_player(dx,dz,.05);
 }
 maxY=Math.max(maxY,engine.get_y());
 assert(Math.abs(engine.get_z()-mountainRoadZ(engine.get_x()))<1.7,
 `left the footpath at n=${n}: ${engine.get_x()},${engine.get_z()}`);
}
assert(maxY>.55,`not walking UP onto bridge, maxY=${maxY}`);
assert(engine.get_x()>25.5,`failed to cross mountain ${engine.get_x()}`);
assert(engine.get_collision_count()<30,'the footpath should not collide repeatedly');
travel(2);
// New village houses have matching doorway and WASM collisions.
for(const [i,h] of spec.maps[2].houses.entries()){
 engine.reset(h.x,h.z+3.75);
 assert(Math.abs(engine.get_x()-h.x)<.03,'house entrance spawn should not be blocked');
 assert.equal(nearOutdoorDoor(engine.get_x(),engine.get_z(),spec.maps[2].houses),i);
 engine.reset(h.x,h.z-4.5);move(0,1,85);
 assert(engine.get_z()<h.z-h.halfZ-.4,`building ${i} can be walked through`);
}
engine.reset(-24.56,6);travel(1);
engine.reset(-25.56,-4);travel(0);
assert.equal(engine.get_map(),0);
assert(Math.abs(engine.get_x()-17.0)<.05);
assert(Math.abs(engine.get_z()-75.0)<.05);
// After returning through the mountain portal, walk west without retriggering.
move(-1,0,20);assert(engine.get_x()<16.9);
assert.equal(findPortal(0,engine.get_x(),engine.get_z(),spec.portals),null);
// Off-bridge mountain river cannot be walked through.
engine.set_map(1);engine.reset(-4,13);
move(1,0,28);
assert(engine.get_x()<-2.7,`crossed the river outside bridge: ${engine.get_x()}`);
for(const [x,z] of [[-24,-4],[-12,-1],[0,2],[12,4.5],[24,7]]){
 const expected=areaTerrainHeight(1,x,z);const actual=engine.get_ground_y_at(x,z);
 assert(Math.abs(expected-actual)<.001,`terrain mismatch at ${x},${z}: JS=${expected},WASM=${actual}`);
}
engine.set_map(0);engine.reset(0,3.5);
console.log('PASS: 3-map round-trip transitions, mountain walking, river barrier, terrain parity, six doors');
