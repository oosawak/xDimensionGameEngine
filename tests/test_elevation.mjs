import assert from 'node:assert/strict';
import fs from 'node:fs';
const w=JSON.parse(fs.readFileSync(new URL('../assets/collision-world.json',import.meta.url)));
const m=new WebAssembly.Module(fs.readFileSync(new URL('../dist/engine.wasm',import.meta.url)));
const e=new WebAssembly.Instance(m,{}).exports;
for(const n of ['get_y','get_ground_y','get_ground_y_at','jump_player','set_running','is_grounded'])assert.equal(typeof e[n],'function',n);
const near=(a,b,t=.2)=>Math.abs(a-b)<t;
// Starting position gives immediate access to uphill path.
for(const [lane,label] of [[-1,'ramp'],[1,'stairs']]){
 e.reset(lane,3.5);
 assert.equal(e.is_grounded(),1);
 let samples=[];
 for(let i=0;i<90;i++){
   e.move_player(0,1,1/60);
   if(i%12===0)samples.push(e.get_y());
 }
 assert(e.get_z()>8.7, `${label}: must reach elevated deck, z=${e.get_z()}`);
 assert(near(e.get_y(),w.elevation.deck.height,.03),`${label}: must reach deck height; ${e.get_y()}`);
 assert(samples.every((h,i)=>i===0||h>=samples[i-1]-.001),`${label}: ascending height must not jump backward`);
 for(let i=0;i<90;i++)e.move_player(0,-1,1/60);
 assert(e.get_z()<4.5,`${label}: descend back to ground`);
 assert(e.get_y()<.25,`${label}: descend to ground y=${e.get_y()}`);
 console.log(`PASS: ${label} ascent and descent, samples ${samples.map(x=>x.toFixed(2)).join(' ')}`);
}
// Side access to high deck is blocked but edge exit causes a fall (gravity).
e.reset(3.1,8);
for(let i=0;i<70;i++) e.move_player(-1,0,1/60);
assert(e.get_x()>2.19,`must not step onto platform from side: x=${e.get_x()}`);
assert(near(e.get_y(),0,.03),`ground stays at zero beside deck`);
// Jump should physically rise and land.
e.reset(0,3.5);
assert.equal(e.jump_player(),1,'jump starts');assert.equal(e.jump_player(),0,'cannot double-jump');
let max=0,sawAir=false;
for(let i=0;i<90;i++){e.move_player(0,0,1/60);max=Math.max(max,e.get_y());sawAir||=e.is_grounded()===0;}
assert(max>.65,`physical jump height ${max}`);assert(sawAir);assert.equal(e.is_grounded(),1);assert(near(e.get_y(),0,.03));
console.log(`PASS: deck side blocked; physical jump max y=${max.toFixed(2)}, lands`);
