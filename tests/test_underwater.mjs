import assert from 'node:assert/strict';
import {createSwim2D, underwaterPalette, UNDERWATER_MODE} from '../src/underwater.mjs';

assert.deepEqual(UNDERWATER_MODE, {environmentMode:'underwater',cameraMode:'side',movementMode:'swim2d'});
const swim=createSwim2D({depthMax:10});
swim.step({down:true},.25);
assert(swim.state.depth>0 && swim.state.vy>0);
for(let i=0;i<20;i++)swim.step({down:true},.25);
assert.equal(swim.state.depth,10);
swim.step({up:true},.5);
assert(swim.state.depth<10);
assert(underwaterPalette(240).light<underwaterPalette(0).light);
console.log('PASS: swim2d acceleration, drag, bounds and depth palette');
