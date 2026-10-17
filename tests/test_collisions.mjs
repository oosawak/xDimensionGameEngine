// Regression: collision hulls cover visible roof/threshold, and diagonals slide
// outside the hull rather than tunnelling through its corners.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const world=JSON.parse(fs.readFileSync(new URL('../assets/collision-world.json',import.meta.url),'utf8'));
const buffer=fs.readFileSync(new URL('../dist/engine.wasm',import.meta.url));
const wasm=new WebAssembly.Instance(new WebAssembly.Module(buffer),{}).exports;
const r=world.playerRadius;
const dis2=(x,z,b)=>{const dx=x-Math.max(b.x-b.halfX,Math.min(x,b.x+b.halfX));const dz=z-Math.max(b.z-b.halfZ,Math.min(z,b.z+b.halfZ));return dx*dx+dz*dz;};
function free(x,z){
  const b=world.bounds;
  if(x<b.minX-1e-4||x>b.maxX+1e-4||z<b.minZ-1e-4||z>b.maxZ+1e-4)return false;
  for(const h of world.houses)if(dis2(x,z,h)<(r-1e-4)**2)return false;
  for(const p of [...world.trees,world.fountain])if((x-p.x)**2+(z-p.z)**2<(r+p.radius-1e-4)**2)return false;
  return true;
}
let cases=0,collisions=0;
for(const h of world.houses){
  for(const [ox,oz,dx,dz] of [
    [-4,0,1,0],[4,0,-1,0],[0,-4,0,1],[0,4,0,-1],
    [-3.8,-3.5,1,1],[3.8,-3.5,-1,1],[-3.8,3.5,1,-1],[3.8,3.5,-1,-1]
  ]){
    const x0=h.x+ox,z0=h.z+oz;
    // On expanded maps, houses can stand next to a boundary or elevated
    // cliff: an approach starting outside the valid world is not a test case.
    if(!free(x0,z0))continue;
    wasm.reset(x0,z0);
    assert(Math.abs(wasm.get_x()-x0)<0.0001 && Math.abs(wasm.get_z()-z0)<0.0001,`spawn should be valid ${x0}, ${z0}`);
    let hit=false;
    for(let step=0;step<160;step++){
      hit=Boolean(wasm.move_player(dx,dz,0.05))||hit;
      const x=wasm.get_x(),z=wasm.get_z();
      assert(free(x,z),`overlap with geometry: house ${h.x},${h.z}, step=${step}, hero=${x},${z}`);
    }
    assert(hit,`must hit geometry for starting (${x0}, ${z0}), direction (${dx},${dz})`);
    if(hit)collisions++;cases++;
  }
}
// Approach fountain from all four directions. Its collision must account for hero radius.
for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const p=world.fountain,x0=p.x-dx*3.5,z0=p.z-dz*3.5;
  wasm.reset(x0,z0);
  assert(Math.abs(wasm.get_x()-x0)<0.001, 'fountain spawn x');
  for(let i=0;i<80;i++){
    wasm.move_player(dx,dz,0.05);
    assert(free(wasm.get_x(),wasm.get_z()), 'fountain penetration');
  }
}
// Existing side-sprite size (roughly 1 world unit visible) is larger than the
// former 0.36 collider, so the intentional collision radius is now >= 0.6.
assert(r>=0.6,'player collision radius matches sprite footprint');
assert(world.houses.every(h=>h.halfX>=2.65 && h.halfZ>=2.16),'roofs + doorsteps covered');
console.log(`PASS: ${cases} building approach paths (${collisions} collided); roof/threshold, diagonal sliding, fountain`);
