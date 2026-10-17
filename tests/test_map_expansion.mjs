import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const world=JSON.parse(fs.readFileSync(new URL('assets/collision-world.json',root),'utf8'));
const html=fs.readFileSync(new URL('index.html',root),'utf8');
const template=fs.readFileSync(new URL('index.template.html',root),'utf8');
assert(world.bounds.maxX-world.bounds.minX>45);
assert(world.bounds.maxZ-world.bounds.minZ>35);
assert.equal(world.houses.length,18);
assert(world.houses.slice(0,12).every(h=>h.region===undefined),'old 12 house indices must be stable');
assert.equal(world.trees.length,48);
assert(template.includes('left.rotation.z=pitch;') && template.includes('right.rotation.z=-pitch;'),'gable slope must rise towards center');
assert(template.includes('roofCenterOffset=2.76*.5*Math.cos(.51)'),'two roof slopes meet at a common ridge');
assert(template.includes('gableShape.closePath()'),'front/back gable triangles');
assert(template.includes('map-overview') && template.includes('zoom=70'),'map overview button');
assert(template.includes('for(const [i,p] of collisionWorld.houses.entries())house(p.x,p.z,i,p.elevation||0)'),'houses drawn from collision data with elevation');
const wasm = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(new URL('dist/engine.wasm',root)))).exports;
const oldBounds=[-13.3,13.3,-10.6,10.6];
const points=[[-22,0],[22,0],[0,-17],[0,17]];
for(const [x,z] of points){
  assert(x<oldBounds[0]||x>oldBounds[1]||z<oldBounds[2]||z>oldBounds[3]);
  wasm.reset(x,z);
  assert(Math.abs(wasm.get_x()-x)<.01 && Math.abs(wasm.get_z()-z)<.01,`new area spawn ${x},${z}`);
}
// New neighborhood houses actually block the player in C-WASM, including
// camera-facing presentation margin.
wasm.set_view_collision(0,1,1);
for(const b of world.houses.slice(4)){
  if (b.elevation) continue; // elevated homes have a separate northbound path test
  wasm.reset(b.x,b.z-3.8);
  for(let i=0;i<65;i++) wasm.move_player(0,1,.05);
  assert(wasm.get_z()<b.z-b.halfZ-.5,`new house must block: ${b.x},${b.z}`);
}
console.log(`PASS: expanded map ${world.bounds.maxX-world.bounds.minX} × ${world.bounds.maxZ-world.bounds.minZ}; ${world.houses.length} gable-roof houses, ${world.trees.length} trees; C-WASM collision + overview`);
