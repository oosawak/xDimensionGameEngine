import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const dir=new URL('../', import.meta.url);
const w=JSON.parse(fs.readFileSync(new URL('../assets/collision-world.json', import.meta.url), 'utf8'));
const wasm=fs.readFileSync(new URL('../dist/engine.wasm',import.meta.url));
const e=new WebAssembly.Instance(new WebAssembly.Module(wasm), {}).exports;
const EPS=.001;
assert.equal(w.accessSideWalls.halfThickness,.12);
for(const [name, access, direction] of [
  ['low deck',w.elevation.access, 1],
  ['high deck',w.upperVillage.access, -1]
]) {
  // The edge collision must physically stop lateral crossing near the center.
  const z=(access.zMin+access.zMax)/2;
  const boundary=access.halfX+w.accessSideWalls.halfThickness+w.playerRadius;
  for(const sign of [-1,1]){
    const x=access.x+sign*(access.halfX+1.2);
    e.set_view_collision(0,1,0);
    e.reset(x,z);
    const start=e.get_x();
    for(let i=0;i<80;i++) e.move_player(-sign,0,1/60);
    const after=e.get_x();
    assert(Math.abs(after-access.x)>boundary-.12,`${name} ${sign}: side wall crossed, x=${after}, threshold=${boundary}`);
    assert(Math.abs(after-start)>.1,`${name} ${sign}: no movement? start=${start}, end=${after}`);
  }
  // Uphill corridor remains passable in the middle of the ramp and staircase.
  for(const [lane,word] of [[-0.85,'ramp'],[0.85,'stair']]){
    e.reset(lane, direction===1?access.zMin-.25:access.zMax+.25);
    for(let i=0;i<90;i++)e.move_player(0,direction,1/60);
    const h=e.get_y();
    assert(h>=1.28,`${name} ${word}: did not ascend, y=${h}`);
  }
  console.log(`PASS: ${name} both sides blocked; central ramp & stair traversable`);
}
// Script should retain reduced *global* default without changing animation calibration.
const template=fs.readFileSync(new URL('../index.template.html',import.meta.url),'utf8');
assert.match(template,/id="char-size-out">55%/);
assert.match(template,/<input id="char-size"[^>]*min="25"[^>]*max="150"[^>]*step="5"[^>]*value="55"/);
assert.match(template,/xDimension Game Engine \/ 0\.0\.\d+/);
assert.match(template,/accessSideWalls\(access,deck\.height,1\)/);
assert.match(template,/accessSideWalls\(upperAccess,upperDeck\.height,-1\)/);
assert.match(template,/for\(const access of \[collisionWorld\.elevation\.access,collisionWorld\.upperVillage\.access\]\)/);
console.log('PASS: current version label, 55% global size, visible stair edging & debug guides');
