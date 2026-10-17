// Regression: extra clearance must exist ONLY on camera-facing sides,
// while original collision hulls and movement remain unchanged with margin 0.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const buf=fs.readFileSync(new URL('../dist/engine.wasm',import.meta.url));
const e=new WebAssembly.Instance(new WebAssembly.Module(buf),{}).exports;
assert.equal(typeof e.set_view_collision,'function');
const tree={x:11.7,z:-1}; // isolated tree at the edge of the village
function approach(x,z,dz,margin){
 e.set_view_collision(0,1,margin);
 e.reset(x,z);
 const original=e.get_z();assert(Math.abs(original-z)<.01,'spawn valid');
 let collided=false;
 for(let i=0;i<150;i++)collided=Boolean(e.move_player(0,dz,0.035))||collided;
 assert(collided,'must stop');
 return e.get_z();
}
// Approach the FRONT (+Z, toward camera). Increased clearance must stop earlier.
const near0=approach(tree.x,tree.z+3.5,-1,0);
const near1=approach(tree.x,tree.z+3.5,-1,1);
const near2=approach(tree.x,tree.z+3.5,-1,2);
assert(near1>near0+.85,`near side expanded: ${near0} ${near1}`);
assert(near2>near1+.85,`slider controls expansion: ${near1} ${near2}`);
// The back (-Z, away from camera) should not become less traversable.
const far0=approach(tree.x,tree.z-3.4,+1,0);
const far1=approach(tree.x,tree.z-3.4,+1,1);
assert(Math.abs(far0-far1)<.15,`back side unchanged: ${far0} ${far1}`);
// Rotate camera 180 degrees: extra clearance moves to the opposite side.
e.set_view_collision(0,-1,1);
e.reset(tree.x,tree.z-3.4);
for(let i=0;i<90;i++)e.move_player(0,1,.035);
const newNear=e.get_z();
assert(newNear<far0-.8,`rotating camera moves front clearance: ${newNear} ${far0}`);
console.log('PASS: camera-side clearance 0/1/2, far side unchanged, 180-degree rotation');
