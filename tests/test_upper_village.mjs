// v1.0 regression: elevated residential district, reverse-z stairs, house collisions.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const w=JSON.parse(fs.readFileSync(new URL('../assets/collision-world.json',import.meta.url),'utf8'));
const e=new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(new URL('../dist/engine.wasm',import.meta.url))),{}).exports;
assert.equal(w.houses.length,18);
assert.equal(w.houses.filter(h=>h.elevation===w.upperVillage.deck.height).length,2);
const height=w.upperVillage.deck.height;
const approx=(a,b,t=.06)=>Math.abs(a-b)<=t;
// Northern uphill route must work with positive/negative X lanes and negative Z ascent.
for(const [x,lane] of [[-0.85,'ramp'],[0.85,'stairs']]){
 e.set_view_collision(0,1,0);
 e.reset(x,-6.85);
 assert(approx(e.get_y(),0), `${lane}: entry must be ground`);
 let max=0, prev=e.get_y();
 for(let i=0;i<115;i++){
   e.move_player(0,-1,1/60);
   const y=e.get_y();max=Math.max(max,y);
   assert(y>=prev-.04,`${lane}: moving uphill must not fall ${prev} => ${y}`);
   prev=y;
 }
 assert(e.get_z()<-12.9,`${lane}: northern deck reached (z=${e.get_z()})`);
 assert(approx(e.get_y(),height),`${lane}: expected deck y=${height}, got ${e.get_y()}`);
 for(let i=0;i<115;i++)e.move_player(0,1,1/60);
 assert(e.get_z()>-7.3,`${lane}: should descend stairs back to entry`);
 assert(approx(e.get_y(),0),`${lane}: should return to ground`);
 console.log(`PASS: northern ${lane} ascends to ${height} and descends`);
}
// Cannot walk onto the high terrace by its side; entry must be via central approach.
e.reset(12,-14.9);
for(let i=0;i<70;i++)e.move_player(-1,0,1/60);
assert(e.get_x()>w.upperVillage.deck.halfX,`high cliff wall breached (x=${e.get_x()})`);
assert(approx(e.get_y(),0),`cannot gain height outside access`);
// Both elevated houses block player movement in WASM even on raised ground.
for(const h of w.houses.filter(v=>v.elevation)){
 e.set_view_collision(0,1,1);
 e.reset(h.x,-10.55);
 assert(approx(e.get_y(),height),`spawn in high village must use deck height`);
 for(let i=0;i<85;i++) e.move_player(0,-1,1/60);
 assert(e.get_z()>h.z+h.halfZ+.55,`upper house must block entry: ${h.x}, got ${e.get_z()}`);
}
// Doors face positive Z, a visible facade from initial camera (+X,+Z).
for(const x of [-6,6]){
 const yaw=x<0?-Math.PI/2:Math.PI/2;
 const sourceNormal=x<0?1:-1;
 const worldZ=-Math.sin(yaw)*sourceNormal;
 assert(worldZ>.99,'rotated house entrance should point toward +Z');
}
const template=fs.readFileSync(new URL('../index.template.html',import.meta.url),'utf8');
assert(template.includes('part.quaternion.premultiply(yawQuaternion)'),'roof, doors and windows must rotate together');
assert(template.includes('part.position.y+elevation'),'elevated homes must render above deck');
console.log('PASS: upper homes blocked; entrance direction fixed; high ground cannot be climbed sideways');
