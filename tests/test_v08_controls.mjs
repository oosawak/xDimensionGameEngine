// Pure-DOM smoke tests for v0.8 controls. No Three.js CDN required.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';
const src=fs.readFileSync(path.join(import.meta.dirname,'../index.template.html'),'utf8');
const begin=src.indexOf('const V08_CONTROLS=');
const end=src.indexOf('applyCinematicControls();',src.indexOf("$('cinematic-off').addEventListener",begin));
assert.ok(begin>0 && end>begin,'v0.8 controls must be present');
const controlScript=src.slice(begin,end+'applyCinematicControls();'.length);
const defaults={
  'focus-offset':0,'contact-shadow-enabled':true,'contact-shadow-opacity':85,
  'dapple-enabled':true,'dapple-strength':45,'shafts-enabled':true,'shafts-strength':35,
  'water-ripple-enabled':true,'water-ripple-strength':60,'follow-speed':2,'camera-lead':0.6
};
const els={};
for(const [id,v] of Object.entries(defaults)){
  els[id]={type:typeof v==='boolean'?'checkbox':'range',value:String(v),checked:Boolean(v),listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}};
  if(typeof v==='number')els[id+'-out']={textContent:''};
}
for(const id of ['cinematic-on','cinematic-off'])els[id]={listeners:{},attrs:{},addEventListener(type,fn){this.listeners[type]=fn;},setAttribute(name,val){this.attrs[name]=val;}};
const ctx={$:(id)=>els[id],heroShadow:{visible:null},shadowMat:{opacity:null}};
vm.runInNewContext(controlScript+'; globalThis.__preset=setCinematicPreset;',ctx);
assert.equal(ctx.heroShadow.visible,true);
assert.equal(ctx.shadowMat.opacity,.85);
assert.equal(els['camera-lead-out'].textContent,'0.6');
ctx.__preset(false);
assert.equal(els['shafts-enabled'].checked,false);
assert.equal(els['dapple-enabled'].checked,false);
assert.equal(els['water-ripple-enabled'].checked,false);
assert.equal(els['camera-lead'].value,'0');
assert.equal(els['cinematic-off'].attrs['aria-pressed'],'true');
ctx.__preset(true);
assert.equal(els['water-ripple-enabled'].checked,true);
assert.equal(els['camera-lead'].value,'0.6');
assert.equal(els['cinematic-on'].attrs['aria-pressed'],'true');
els['contact-shadow-enabled'].checked=false;
els['contact-shadow-enabled'].listeners.change();
assert.equal(ctx.heroShadow.visible,false);
els['focus-offset'].value='-2.5';els['focus-offset'].listeners.input();
assert.equal(els['focus-offset-out'].textContent,'-2.5');
console.log('PASS: v0.8 visual preset, individual toggles, sliders and shadow controls');
