import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const src=fs.readFileSync(new URL('../index.template.html',import.meta.url),'utf8');
const get=(start,end)=>{const a=src.indexOf(start), b=src.indexOf(end,a);assert.ok(a>=0 && b>a);return src.slice(a,b);};
const stateAndActions=get("let heroAction='idle'",'function directionFromInput');
const framePicker=get(" const preview=$('char-preview').value;",' drawSprite(action,frame,heroFacing,dx,dz);');
const controls={value:'auto'};
const $=id=>id==='char-preview'?controls:null;
const SPRITE_CONFIG={idle:{frames:21,fps:10},walk:{frames:23,fps:12},run:{frames:24,fps:12},jump:{frames:25,fps:12},attack:{frames:22,fps:12}};
const spriteSheets={idle:{},walk:{},run:{},jump:{},attack:{}};
let context={$,SPRITE_CONFIG,spriteSheets,Math,engine:{jump_player:()=>1,is_grounded:()=>1},indoor:{active:false,y:0}};
vm.createContext(context);
vm.runInContext(stateAndActions,context);
vm.runInContext('beginHeroAction("attack")',context);
let sawAttack=false,ended=false;
for(let i=0;i<130;i++){
  vm.runInContext(`{let dt=0.035,dx=0,dz=0,inputs=new Set(),mobileRun=false;${framePicker} globalThis.result={action,frame,preview};}`,context);
  if(context.result.action==='attack')sawAttack=true;
  if(sawAttack && context.result.action==='idle'){ended=true;break;}
}
assert.ok(sawAttack,'should attack'); assert.ok(ended,'must return to idle after one attack');
vm.runInContext('document=undefined;',context);
// Explicit preview is canceled by physical attack input.
controls.value='attack';
vm.runInContext('beginHeroAction("attack")',context);
assert.equal(controls.value,'auto');
for(let i=0;i<130;i++){
  vm.runInContext(`{let dt=0.035,dx=0,dz=0,inputs=new Set(),mobileRun=false;${framePicker} globalThis.result={action,frame,preview};}`,context);
  if(context.result.action==='idle')break;
}
assert.equal(context.result.action,'idle');
console.log('PASS: attack one-shot returns to idle; action key exits attack preview');
