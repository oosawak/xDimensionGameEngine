import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const tpl=fs.readFileSync(new URL('../index.template.html',import.meta.url),'utf8');
assert.match(tpl,/id="indoor-room-light"[^>]*value="80"/);
assert.match(tpl,/if\(active\).*?applyIndoorLighting\(\)/);
assert.match(tpl,/else skyClock\(worldClock\.minuteOfDay\/60\)/);
const start=tpl.indexOf('function applyIndoorLighting(){');
const end=tpl.indexOf("$('indoor-room-light').addEventListener",start);
assert(start>=0&&end>start);
const code=tpl.slice(start,end);
const mock={
 indoor:{active:false},
 value:'80',
 ambient:{intensity:1.3}, sun:{intensity:2},
 fillLight:{intensity:.72},rimLight:{intensity:.72},roomLamp:{intensity:18},
 renderer:{toneMappingExposure:1.15},
 heroMaterial:{color:{copy(){return this;},multiplyScalar(v){this.tint=v;return this;}}},
 indoorRoomLightColor:{},
 THREE:{Color:class{constructor(v){this.v=v;}}},
 $(id){return {value:mock.value}},
};
vm.createContext(mock);
vm.runInContext(code,mock);
mock.applyIndoorLighting();
assert.equal(mock.ambient.intensity,1.3,'outside stays unchanged');
mock.indoor.active=true;
mock.applyIndoorLighting();
assert(mock.ambient.intensity<.5 && mock.sun.intensity<.5);
assert(mock.renderer.toneMappingExposure<.9);
const v60=mock.ambient.intensity;
mock.value='120';mock.applyIndoorLighting();
assert(mock.ambient.intensity>v60);
assert(mock.renderer.toneMappingExposure>.9);
assert(mock.roomLamp.intensity>8);
console.log('PASS: room lighting 80% dim default, adjustable brighter, outdoor untouched, exit restores daylight via skyClock');
