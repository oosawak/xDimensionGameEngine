import assert from 'node:assert/strict';
import {computeInteriorFitDistance} from '../src/interior-camera.mjs';
import {stepInteriorPlayer,nearIndoorExit} from '../src/door-logic.mjs';
function verifyProjection(aspect,azimuth,elevation){
 const fovDeg=52, focusY=1;
 const d=computeInteriorFitDistance({aspect,fovDeg,azimuth,elevation,focusY,margin:.8});
 const ce=Math.cos(elevation),se=Math.sin(elevation),ca=Math.cos(azimuth),sa=Math.sin(azimuth);
 const right=[ca,0,-sa],up=[-sa*se,ce,-ca*se],toward=[sa*ce,se,ca*ce];
 const t=Math.tan(fovDeg*Math.PI/360);
 for(const x of [-4.3,4.3])for(const y of [-.25,3.3])for(const z of [-4.18,4.06]){
   const p=[x,y-focusY,z];const dot=q=>p.reduce((acc,v,i)=>acc+v*q[i],0);
   const depth=d-dot(toward); assert(depth>0,`geometry behind eye (${aspect})`);
   const xNDC=dot(right)/(depth*t*aspect),yNDC=dot(up)/(depth*t);
   assert(Math.abs(xNDC)<=.803,`horizontal view clipped aspect ${aspect}: ${xNDC}`);
   assert(Math.abs(yNDC)<=.803,`vertical view clipped aspect ${aspect}: ${yNDC}`);
 }
 return d;
}
const dimensions=[[320,720],[390,844],[768,1024],[1024,768],[1280,800],[1600,900],[812,375]];
for(const [w,h] of dimensions){
  for(const angle of [0,.08,.7,1.9,3.0])verifyProjection(w/h,angle,1.12);
  console.log(`PASS: room entire bounds visible: ${w}x${h}, distance ${verifyProjection(w/h,.08,1.12).toFixed(2)}`);
}
const next=(p,dx,dz,frames=120)=>{
 for(let i=0;i<frames;i++)p=stepInteriorPlayer(p.x,p.z,dx,dz,1/60);
 return p;
};
for(const axis of ['x','z'])for(const sign of [-1,1]){
 const start={x:0,z:1.1},move=axis==='x'?[sign,0]:[0,sign];
 const edge=next(start,...move);
 assert(edge.x>=-3.56&&edge.x<=3.56&&edge.z>=-3.24&&edge.z<=2.9);
 const escape=next(edge,-move[0],-move[1],36);
 assert(Math.hypot(escape.x-edge.x,escape.z-edge.z)>.1,`${axis} side ${sign} trapped`);
}
for(const pos of [{x:3.55,z:-2.1},{x:-3.55,z:1.8},{x:0,z:-3.2},{x:0,z:2.85}]){
 const q=next(pos,-Math.sign(pos.x),-Math.sign(pos.z),30);
 assert(Math.hypot(q.x-pos.x,q.z-pos.z)>.12,`stuck at boundary ${JSON.stringify(pos)} => ${JSON.stringify(q)}`);
}
assert(nearIndoorExit(0,2.4));
console.log('PASS: wall-edge movement can reverse, all exits preserved');
