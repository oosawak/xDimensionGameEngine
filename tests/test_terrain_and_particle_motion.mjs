import assert from 'node:assert/strict';
import fs from 'node:fs';
import {areaTerrainHeight,mountainRoadZ} from '../src/area-maps.mjs';
import {PARTICLE_MOTION_PRESETS,particleVelocity} from '../src/particle-motion.mjs';
const wasm=new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(new URL('../dist/engine.wasm',import.meta.url)))).exports;
for(const map of [1,2]){
 wasm.set_map(map);
 for(let x=-24;x<=24;x+=3)for(let z=-19;z<=19;z+=2.5){
  const a=areaTerrainHeight(map,x,z),b=wasm.get_ground_y_at(x,z);
  assert(Math.abs(a-b)<.002,`WASM vs JS terrain mismatch m=${map} (${x},${z}): ${a} != ${b}`);
 }
}
assert(areaTerrainHeight(1,20,20)>3,'mountain outskirts must rise above trail');
assert(areaTerrainHeight(1,0,17)<-1,'river canyon must be lower than path');
assert.equal(areaTerrainHeight(1,0,2),.72,'bridge must retain exact deck height');
assert.equal(areaTerrainHeight(2,0,6),0,'town streets must remain level');
assert(areaTerrainHeight(2,25,20)>1,'town corners must slope upward');
for(const mode of Object.keys(PARTICLE_MOTION_PRESETS)){
 const v=particleVelocity(mode,2,10);for(const val of Object.values(v))assert(Number.isFinite(val));
}
assert(PARTICLE_MOTION_PRESETS.leaf.sway>PARTICLE_MOTION_PRESETS.snow.sway,'leaves flutter more than snow');
assert(PARTICLE_MOTION_PRESETS.firefly.bob>PARTICLE_MOTION_PRESETS.petal.bob,'fireflies bob more than petals');
assert(PARTICLE_MOTION_PRESETS.snow.fall<PARTICLE_MOTION_PRESETS.petal.fall,'snow falls faster in this stylized preset');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert(html.includes('particle-density-out">5%'));
assert(html.includes('id="particle-density" type="range" min="0" max="100" step="5" value="5"'));
assert(html.includes('particleTime.value=animationTime'));
assert(html.includes('const originalHighlands=newArea(0)'));
console.log('PASS: elevated mountain and alpine town edges, JS/C-WASM terrain parity, seasonal motion, 5% particles');
