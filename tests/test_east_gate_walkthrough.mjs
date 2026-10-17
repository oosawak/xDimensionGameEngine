import assert from 'node:assert/strict';
import fs from 'node:fs';
import {findPortal,findNearbyPortal} from '../src/area-maps.mjs';
const root=new URL('../',import.meta.url);
const {portals}=JSON.parse(fs.readFileSync(new URL('assets/area-maps.json',root)));
const wasm=new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(new URL('dist/engine.wasm',root)))).exports;
wasm.set_map(0);
function simulate(viewX,viewZ){
  wasm.set_view_collision(viewX,viewZ,1.0);
  wasm.reset(0,78.5); // The user starts on the central street, not inside the gate.
  // Old map: east immediately collides with a house at x~5.
  for(let i=0;i<130;i++)wasm.move_player(1,0,.05);
  assert(wasm.get_x()<6,'old straight route should still be blocked by the house');
  wasm.reset(0,78.5);
  // Follow marked opening BETWEEN the house rows: from z=78.5 north to 75.
  for(let i=0;i<20;i++)wasm.move_player(0,-1,.05);
  assert(Math.abs(wasm.get_z()-74.9)<.3,`approach cannot be reached: z=${wasm.get_z()}`);
  let near=false,enter=false;
  for(let i=0;i<145;i++){
    wasm.move_player(1,0,.05);
    if(findNearbyPortal(0,wasm.get_x(),wasm.get_z(),portals))near=true;
    if(findPortal(0,wasm.get_x(),wasm.get_z(),portals)){enter=true;break;}
  }
  assert(near,'E/touch fallback never became available before the gate');
  assert(enter,`character cannot WALK through gate: x=${wasm.get_x()} z=${wasm.get_z()} hits=${wasm.get_collision_count()}`);
  assert.equal(wasm.get_collision_count(),0,'there must be NO invisible collision on marked road');
  const portal=findPortal(0,wasm.get_x(),wasm.get_z(),portals);
  wasm.set_map(1);wasm.reset(portal.spawn.x,portal.spawn.z);
  assert.equal(wasm.get_map(),1);
  wasm.set_map(0);wasm.reset(portals[1].spawn.x,portals[1].spawn.z);
  assert.equal(findPortal(0,wasm.get_x(),wasm.get_z(),portals),null,'return must not instantly send the player back');
}
for(const v of [[.65,.76],[0,1],[1,0],[-.7,.7]])simulate(...v);
console.log('PASS: street -> marker -> stone gate -> mountain -> safe return (4 camera angles), including E fallback');
