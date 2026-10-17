import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../index.template.html',import.meta.url),'utf8');
const start=source.indexOf('function projectedSide(');
const stop=source.indexOf('function beginHeroAction(',start);
assert.ok(start>=0 && stop>start);
const code=source.slice(start,stop);
const ctx=vm.createContext({Math});
vm.runInContext(code,ctx);
const side=(dx,dz,yaw,old='right')=>vm.runInContext(`projectedSide(${dx},${dz},${yaw},'${old}')`,ctx);
// Camera yaw 0: +world X is right; -world X is left.
assert.equal(side(1,0,0),'right');
assert.equal(side(-1,0,0),'left');
// At default diagonal camera yaw, moving along world Z has a clear screen side.
const a=.71;
assert.equal(side(0,-1,a),'right','up projects screen right');
assert.equal(side(0,1,a),'left','down projects screen left');
assert.equal(side(1,-1,a),'right','right/up');
assert.equal(side(-1,-1,a),'left','left/up');
assert.equal(side(1,1,a),'right','right/down');
assert.equal(side(-1,1,a),'left','left/down');
// Rotating camera can reverse apparent motion. No movement preserves the last direction.
assert.equal(side(1,0,Math.PI),'left');
assert.equal(side(0,0,a,'left'),'left');
// Motion directly into camera: near-zero horizontal projection should not jitter.
assert.equal(side(0,1,0,'left'),'left');
assert.equal(side(0,1,0,'right'),'right');
console.log('PASS: projected left/right sprite fallback across diagonals, Z moves, camera rotation');
