import assert from 'node:assert/strict';
import fs from 'node:fs';
import {collidesExtra,areaTerrainHeight,mountainRoadZ} from '../src/area-maps.mjs';
import {seasonAtDay} from '../src/world-seasons.mjs';
import {createWorldClock,migratePreviousSeasonClock,worldClockSnapshot} from '../src/world-clock.mjs';
import {PARTICLE_SHAPE_MODES,paintParticleMask} from '../src/particle-shapes.mjs';
const base=new URL('../',import.meta.url);
const data=JSON.parse(fs.readFileSync(new URL('assets/area-maps.json',base),'utf8'));
const wasm=new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(new URL('dist/engine.wasm',base)))).exports;
const river=data.maps[1].river;
const playerRadius=JSON.parse(fs.readFileSync(new URL('assets/collision-world.json',base),'utf8')).playerRadius;
const effectiveHalf=river.bridgeHalfWidth-playerRadius-river.railHalfThickness;
assert(effectiveHalf>1.1&&effectiveHalf<1.4,'bridge must leave a useful central path');
assert.equal(collidesExtra(1,0,river.bridgeCenterZ,data.maps),false);
assert.equal(collidesExtra(1,0,river.bridgeCenterZ+effectiveHalf+.20,data.maps),true,'rail-side crossing must be blocked');
assert.equal(collidesExtra(1,0,river.bridgeCenterZ-effectiveHalf-.20,data.maps),true,'both rail sides must block');
assert.equal(collidesExtra(1,0,15,data.maps),true);
assert.equal(collidesExtra(1,0,river.bridgeCenterZ+effectiveHalf-.1,data.maps),false);
wasm.set_map(1);
function cross(z,expectedX,blocked){
  wasm.reset(-4,z);
  for(let i=0;i<70;i++)wasm.move_player(1,0,.05);
  const x=wasm.get_x();
  if(blocked)assert(x< -2.68,`river side z=${z} should stop, got x=${x}`);
  else assert(x>expectedX,`bridge path z=${z} should cross, got x=${x}`);
  return x;
}
cross(river.bridgeCenterZ,3,false);
cross(river.bridgeCenterZ+.9,3,false);
cross(river.bridgeCenterZ-.9,3,false);
cross(river.bridgeCenterZ+1.7,0,true);
cross(river.bridgeCenterZ-1.7,0,true);
// Approach should stay navigable all the way from map01's portal spawn.
wasm.reset(-23.5,-4);
for(let n=1;n<=100;n++){
 const x=-23.5+n*.50,z=mountainRoadZ(x);
 for(let q=0;q<9;q++)wasm.move_player(Math.max(-1,Math.min(1,(x-wasm.get_x())/.18)),Math.max(-1,Math.min(1,(z-wasm.get_z())/.18)),.05);
 assert(Math.abs(wasm.get_z()-mountainRoadZ(wasm.get_x()))<1.7,`blocked in mountain route near x=${wasm.get_x()},z=${wasm.get_z()}`);
}
assert(wasm.get_x()>25.5,'mountain crossing should finish');
assert(Math.abs(wasm.get_ground_y_at(0,2)-areaTerrainHeight(1,0,2))<.001);
for(let d=1;d<=8;d++)assert.equal(seasonAtDay(d).key,['spring','summer','autumn','winter'][(d-1)%4]);
assert.equal(createWorldClock().seasonDays,1);
for(const days of [1,2,7,12,31,365])assert.equal(createWorldClock({seasonDays:days}).seasonDays,days);
assert.equal(createWorldClock({seasonDays:999}).seasonDays,365);
assert.equal(createWorldClock({seasonDays:0}).seasonDays,1);
const old={day:19,minuteOfDay:730,minutesPerRealSecond:24,paused:true,seasonDays:7};
assert.deepEqual(worldClockSnapshot(createWorldClock(migratePreviousSeasonClock(old))),{...old,seasonDays:1});
assert.equal(migratePreviousSeasonClock({...old,seasonDays:14}).seasonDays,14);
assert.equal(seasonAtDay(31,10).key,'winter');
const calls={};
const context=new Proxy({}, {get(_,name){
 if(name==='createRadialGradient')return ()=>({addColorStop(){}});
 if(name==='canvas')return null;
 return (...args)=>{calls[name]=(calls[name]??0)+1;};
},set(_,name,value){calls[`set_${name}`]=(calls[`set_${name}`]??0)+1;return true;}});
for(const mode of PARTICLE_SHAPE_MODES){paintParticleMask(context,mode);}
assert.equal(PARTICLE_SHAPE_MODES.length,4);
assert(calls.bezierCurveTo>=7,'petal and leaf must use curved outlines');
assert(calls.rotate>=8,'snowflake has 6 branches and shapes have distinct orientations');
assert(calls.lineTo>=15,'snowflake and veins must be lines');
const html=fs.readFileSync(new URL('index.html',base),'utf8');
assert(html.includes('texture(particleMasks[mode]||particleMasks.firefly,uv()).a'));
assert(html.includes('fallbackFlies.material.map=particleMasks[mode]'));
assert(html.includes('stepFallbackParticles(dt,activeParticleMode)'));
assert(html.includes('WORLD_CLOCK_PREVIOUS_STORAGE_KEY'));
assert(html.includes('type="number" min="1" max="365"'));
console.log('PASS: bridge rail clearance (JS+C WASM), walkable mountain route, 1–365-day season calendar/migration, non-circular particle masks (GPU+WebGL)');
