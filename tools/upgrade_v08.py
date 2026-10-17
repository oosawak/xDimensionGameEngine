#!/usr/bin/env python3
"""Apply the HD-2D v0.8 look extensions to a v0.7 index.template.html.
Run once on a fresh copy of v0.7; keep the resulting template for subsequent builds.
"""
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'index.template.html'
s=p.read_text(encoding='utf-8')
def replace(old,new):
 global s
 count=s.count(old)
 if count!=1: raise RuntimeError(f'expected exactly one anchor, got {count}: {old[:100]}')
 s=s.replace(old,new,1)

replace('HD-2D Lab v0.7 — Pixel Diorama × Cinematic Lighting × WASM',
        'HD-2D Lab v0.8 — Cinematic Depth & Light × Three.js × WASM')
replace('Pixel-art scenery · cinematic light · WebGPU particles · WASM',
        'Cinematic depth · dappled light · GPU particles · WASM')
replace('    <div class="section">ATMOSPHERE / GPU PARTICLES</div>', '''    <div class="section">CINEMATIC / v0.8 映像効果</div>
    <p class="look-note">v0.7の見た目と比較可能です。これらは表示演出だけで、移動・衝突判定は変えません。</p>
    <div class="look-presets"><button type="button" id="cinematic-on" aria-pressed="true">✧ v0.8 演出</button><button type="button" id="cinematic-off" aria-pressed="false">◇ v0.7 相当</button></div>
    <div class="field"><div class="line"><label for="focus-offset">被写界深度：ピント位置（キャラ基準）</label><output id="focus-offset-out">±0.0</output></div><input id="focus-offset" type="range" min="-6" max="6" step="0.5" value="0"></div>
    <p class="look-note">プラスでピントを遠くに、マイナスで近くに。DOFがONの時に反映されます。</p>
    <label class="switch">足元の柔らかい影 <input id="contact-shadow-enabled" type="checkbox" checked></label>
    <div class="field"><div class="line"><label for="contact-shadow-opacity">足元の影の濃さ</label><output id="contact-shadow-opacity-out">85%</output></div><input id="contact-shadow-opacity" type="range" min="0" max="100" step="5" value="85"></div>
    <label class="switch">木漏れ日 <input id="dapple-enabled" type="checkbox" checked></label>
    <div class="field"><div class="line"><label for="dapple-strength">木漏れ日の強さ</label><output id="dapple-strength-out">45%</output></div><input id="dapple-strength" type="range" min="0" max="100" step="5" value="45"></div>
    <label class="switch">光の筋（簡易光芒） <input id="shafts-enabled" type="checkbox" checked></label>
    <div class="field"><div class="line"><label for="shafts-strength">光の筋の強さ</label><output id="shafts-strength-out">35%</output></div><input id="shafts-strength" type="range" min="0" max="100" step="5" value="35"></div>
    <label class="switch">噴水の波紋・きらめき <input id="water-ripple-enabled" type="checkbox" checked></label>
    <div class="field"><div class="line"><label for="water-ripple-strength">波紋の強さ</label><output id="water-ripple-strength-out">60%</output></div><input id="water-ripple-strength" type="range" min="0" max="100" step="5" value="60"></div>
    <div class="section">CAMERA / カメラ演出</div>
    <div class="field"><div class="line"><label for="follow-speed">カメラの追従速度</label><output id="follow-speed-out">2.0</output></div><input id="follow-speed" type="range" min="1" max="10" step="0.5" value="2"></div>
    <div class="field"><div class="line"><label for="camera-lead">移動方向への先読み</label><output id="camera-lead-out">0.6</output></div><input id="camera-lead" type="range" min="0" max="2.5" step="0.1" value="0.6"></div>
    <div class="section">ATMOSPHERE / GPU PARTICLES</div>''')
# Slightly improve color gradation without changing old tint/tonemapping
replace('const focusDistance=uniform(25),focalLength=uniform(8.5),bokehScale=uniform(.75);',
        'const focusDistance=uniform(25),focalLength=uniform(8.5),bokehScale=uniform(.75);')
# Insert v08 group after water creation, before tree: all water geometry can be transparent/unlit
anchor="water.position.set(0,.826,-3.5);scene.add(water);"
replace(anchor,anchor+'''
// v0.8: stylized water highlights/ripples on the existing fountain (not SSR).
// Tiny unlit translucent rings avoid another render pass and work in WebGL fallback.
const waterRipples=[];
for(let k=0;k<4;k++){
  const ring=new THREE.Mesh(new THREE.RingGeometry(.93,.955,48),new THREE.MeshBasicMaterial({
    color:k%2?'#fff2ce':'#c5fcff',transparent:true,opacity:0,side:THREE.DoubleSide,
    depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2
  }));
  ring.rotation.x=-Math.PI/2;ring.position.set(0,.863+k*.0008,-3.5);
  ring.userData.phase=k/4;scene.add(ring);waterRipples.push(ring);
}
const waterGlints=[];
for(let k=0;k<7;k++){
  const a=k*2.399963229728653;
  const r=.20+(k%3)*.20;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.17,.027),new THREE.MeshBasicMaterial({
    color:'#edffff',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,
    blending:THREE.AdditiveBlending
  }));
  mesh.rotation.x=-Math.PI/2;mesh.rotation.z=a*.1;
  mesh.position.set(Math.cos(a)*r,.867+k*.0003,-3.5+Math.sin(a)*r);
  scene.add(mesh);waterGlints.push(mesh);
}
''')
# Dapple patches after trees (need positions)
replace('collisionWorld.trees.forEach((p,i)=>tree(p.x,p.z,i));', '''collisionWorld.trees.forEach((p,i)=>tree(p.x,p.z,i));
// Warm leaf-filtered light on the ground, drawn procedurally and independent of physics.
const dappleCanvas=document.createElement('canvas');dappleCanvas.width=256;dappleCanvas.height=256;
const dapCtx=dappleCanvas.getContext('2d');
let dapSeed=214923;
function dRand(){dapSeed=(1664525*dapSeed+1013904223)>>>0;return dapSeed/4294967296;}
for(let n=0;n<70;n++){
 const xx=18+dRand()*220,yy=18+dRand()*220,rad=5+dRand()*14;
 const grad=dapCtx.createRadialGradient(xx,yy,0,xx,yy,rad);
 grad.addColorStop(0,'rgba(255,242,185,.38)');grad.addColorStop(.7,'rgba(255,232,168,.13)');grad.addColorStop(1,'rgba(255,230,170,0)');
 dapCtx.fillStyle=grad;dapCtx.beginPath();dapCtx.arc(xx,yy,rad,0,Math.PI*2);dapCtx.fill();
}
const dappleTexture=new THREE.CanvasTexture(dappleCanvas);dappleTexture.colorSpace=THREE.SRGBColorSpace;
const dappleMaterial=new THREE.MeshBasicMaterial({map:dappleTexture,transparent:true,opacity:0,
  depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-2});
const dappleMeshes=[];
for(const p of collisionWorld.trees){
 const patch=new THREE.Mesh(new THREE.PlaneGeometry(4.1,4.1),dappleMaterial);
 patch.rotation.x=-Math.PI/2;patch.rotation.z=(p.x*7+p.z)*.18;
 patch.position.set(p.x+.6,.095,p.z+.5);patch.renderOrder=1;scene.add(patch);dappleMeshes.push(patch);
}
// Screen-facing subtle shafts near trees. Decorative 2D approximation, not raymarching.
const shaftsCanvas=document.createElement('canvas');shaftsCanvas.width=64;shaftsCanvas.height=256;
const shCtx=shaftsCanvas.getContext('2d');
const shaftGrad=shCtx.createLinearGradient(0,0,0,256);
shaftGrad.addColorStop(0,'rgba(255,240,184,0)');shaftGrad.addColorStop(.32,'rgba(255,233,175,.12)');
shaftGrad.addColorStop(.8,'rgba(255,232,168,.08)');shaftGrad.addColorStop(1,'rgba(255,238,180,0)');
shCtx.fillStyle=shaftGrad;shCtx.fillRect(0,0,64,256);
const shaftTexture=new THREE.CanvasTexture(shaftsCanvas);shaftTexture.colorSpace=THREE.SRGBColorSpace;
const shaftsMaterial=new THREE.SpriteMaterial({map:shaftTexture,transparent:true,opacity:0,
  depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending,toneMapped:false});
const shaftSprites=[];
for(const p of collisionWorld.trees.slice(0,5)){
 const sp=new THREE.Sprite(shaftsMaterial);sp.position.set(p.x+.42,2.1,p.z+.40);sp.scale.set(2.3,4.2,1);
 scene.add(sp);shaftSprites.push(sp);
}
''')
# add visual controls + default on & compare after shadow creation, simple object state
anchor='heroShadow.rotation.x=-Math.PI/2;heroShadow.position.set(0,.07,3.5);scene.add(heroShadow);'
replace(anchor,anchor+'''
// All v0.8 enhancements can be disabled independently or together for comparison.
const V08_CONTROLS=['focus-offset','contact-shadow-enabled','contact-shadow-opacity','dapple-enabled',
 'dapple-strength','shafts-enabled','shafts-strength','water-ripple-enabled',
 'water-ripple-strength','follow-speed','camera-lead'];
function applyCinematicControls(){
 for(const id of V08_CONTROLS){
   const el=$(id),out=$(id+'-out');
   if(!out)continue;
   const value=Number(el.value);
   out.textContent=id==='focus-offset'?(value===0?'±0.0':(value>0?'+':'')+value.toFixed(1)):
     (id==='follow-speed'||id==='camera-lead')?value.toFixed(1):`${value}%`;
 }
 heroShadow.visible=$('contact-shadow-enabled').checked;
 shadowMat.opacity=Number($('contact-shadow-opacity').value)/100;
 const v08On=['dapple-enabled','shafts-enabled','water-ripple-enabled'].some(id=>$(id).checked);
 $('cinematic-on').setAttribute('aria-pressed',String(v08On));
 $('cinematic-off').setAttribute('aria-pressed',String(!v08On));
}
function setCinematicPreset(enabled){
 const values={
  'focus-offset':0,'contact-shadow-enabled':true,'contact-shadow-opacity':85,
  'dapple-enabled':enabled,'dapple-strength':45,'shafts-enabled':enabled,
  'shafts-strength':35,'water-ripple-enabled':enabled,'water-ripple-strength':60,
  'follow-speed':2,'camera-lead':enabled?.6:0
 };
 for(const [id,value] of Object.entries(values)){
   if($(id).type==='checkbox')$(id).checked=value;else $(id).value=String(value);
 }
 applyCinematicControls();
}
for(const id of V08_CONTROLS)$(id).addEventListener($(id).type==='checkbox'?'change':'input',applyCinematicControls);
$('cinematic-on').addEventListener('click',()=>setCinematicPreset(true));
$('cinematic-off').addEventListener('click',()=>setCinematicPreset(false));
applyCinematicControls();
''')
# skyClock set daylight factor for shafts and dapple, referenced by animation; initialize before skyClock
replace('function skyClock(v){','let cinematicDaylight=1;\nfunction skyClock(v){')
replace(' const twilight=Math.max(0,1-Math.min(Math.abs(v-6.5),Math.abs(v-18.5))/3);',
        ' const twilight=Math.max(0,1-Math.min(Math.abs(v-6.5),Math.abs(v-18.5))/3);\n cinematicDaylight=dayFactor;')
# camera lead & speed in update, direct Math constants change
replace('if(follow)target.set(x,y,z);else target.set(0,0,0);\n cameraTarget.lerp(target,1-Math.exp(-dt*2.0));', '''if(follow){
   target.set(x,y,z);
   const lead=Number($('camera-lead').value);
   if(dx||dz){const inv=1/Math.hypot(dx,dz);target.x+=dx*inv*lead;target.z+=dz*inv*lead;}
 } else target.set(0,0,0);
 const followSpeed=Number($('follow-speed').value);
 cameraTarget.lerp(target,1-Math.exp(-dt*followSpeed));''')
# water animated every frame and setting on/off
replace(' water.rotation.y+=dt*.08;',''' water.rotation.y+=dt*.08;
 const waterOn=$('water-ripple-enabled').checked;
 const rippleGain=Number($('water-ripple-strength').value)/100;
 for(const ring of waterRipples){
   const phase=(animationTime*.22+ring.userData.phase)%1;
   const radius=.12+.91*phase;
   ring.scale.setScalar(radius);
   ring.material.opacity=waterOn?Math.max(0,Math.sin(Math.PI*phase))*.23*rippleGain:0;
   ring.visible=waterOn;
 }
 for(let i=0;i<waterGlints.length;i++){
   const glint=waterGlints[i];glint.visible=waterOn;
   glint.material.opacity=waterOn?(.10+.12*(.5+.5*Math.sin(animationTime*2.2+i*1.8)))*rippleGain:0;
 }
 const dappleOn=$('dapple-enabled').checked;
 dappleMaterial.opacity=dappleOn?cinematicDaylight*Number($('dapple-strength').value)/100*.7:0;
 dappleMeshes.forEach((mesh,i)=>{mesh.visible=dappleOn&&cinematicDaylight>.04;mesh.rotation.z=(i*.37)+Math.sin(animationTime*.22+i)*.12;});
 const shaftsOn=$('shafts-enabled').checked;
 shaftsMaterial.opacity=shaftsOn?cinematicDaylight*Number($('shafts-strength').value)/100*.75:0;
 for(const sp of shaftSprites)sp.visible=shaftsOn&&cinematicDaylight>.05;''')
replace('focusDistance.value=camera.position.distanceTo(new THREE.Vector3(x,y+1,z));',
        'focusDistance.value=Math.max(1,camera.position.distanceTo(new THREE.Vector3(x,y+1,z))+Number($(\'focus-offset\').value));')
# Update text near footer
replace('WebGPU非対応時はWebGL2表示に切り替えます。',
        'WebGPU非対応時はWebGL2表示に切り替えます。v0.8光芒・波紋は軽量な描画演出で、物理的な反射計算ではありません。')
p.write_text(s,encoding='utf-8')
print('Applied v0.8 patch:',len(s),'characters')
