import assert from 'node:assert/strict';
import {sphereHitsTriangle,createSwimTriangleCollider} from '../src/swim-collision.mjs';
import {createSwim2D,resolveSwimMotion} from '../src/underwater.mjs';
const v=(x,y,z)=>({x,y,z});
const a=v(2,-10,-2),b=v(2,10,-2),c=v(2,10,3),d=v(2,-10,3);
assert(sphereHitsTriangle(v(1.8,0,.75),.32,a,b,c));
assert(!sphereHitsTriangle(v(1,0,.75),.32,a,b,c));
assert(sphereHitsTriangle(v(2,-10,-2),.01,a,b,c),'triangle vertex');
assert(!sphereHitsTriangle(v(2,12,4),.32,a,b,c),'outside the triangle edges');
const wall={bounds:{minX:2,maxX:2,minY:-10,maxY:10,minZ:-2,maxZ:3},triangles:[[a,b,c],[a,c,d]]};
const collision=createSwimTriangleCollider([wall]);
assert(collision(1.8,0));assert(!collision(1,0));
assert(!createSwimTriangleCollider([wall],{z:5})(2,0),'distant foreground does not block swim plane');
const stopped=resolveSwimMotion(0,0,12,0,collision);
assert(stopped.x>1.5&&stopped.x<1.69,'fast motion cannot cross a thin triangle wall');
assert(stopped.blockedX);
const slide=resolveSwimMotion(1.6,0,8,12,collision);
assert(slide.x<1.69);assert(Math.abs(slide.depth-12)<1e-8,'vertical wall sliding');
const reverse=resolveSwimMotion(stopped.x,0,0,0,collision);
assert(Math.abs(reverse.x)<1e-8,'can reverse immediately after collision');
const floor={bounds:{minX:-30,maxX:30,minY:-5,maxY:-5,minZ:-20,maxZ:20},triangles:[
  [v(-30,-5,-20),v(30,-5,-20),v(30,-5,20)],
  [v(-30,-5,-20),v(30,-5,20),v(-30,-5,20)]
]};
const ground=createSwimTriangleCollider([floor]);
const dive=resolveSwimMotion(0,0,0,100,ground);
assert(dive.depth>17&&dive.depth<18,'feet stop at the visible seafloor');
assert(dive.blockedDepth);
const swim=createSwim2D({depthMax:240,verticalSpeedMultiplier:1.6});
swim.setCollisionQuery(collision);swim.setSpeedMultiplier(2.5);
for(let i=0;i<200;i++)swim.step({axisX:1,boost:true},.05);
assert(swim.state.x<1.69,'highest selectable speed obeys mesh collision');
assert.equal(swim.state.vx,0);
for(let i=0;i<20;i++)swim.step({axisX:-1},.05);
assert(swim.state.x<0,'movement away from the collider remains possible');
console.log('PASS: actual triangle contacts, swim-plane depth, high-speed wall/floor blocking, sliding and reversing');
