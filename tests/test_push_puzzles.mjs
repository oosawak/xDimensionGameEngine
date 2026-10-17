import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nearestPuzzleBox,puzzlePushDirection,puzzleProgress,validSavedPuzzleBoxes} from '../src/puzzle-logic.mjs';
const path=new URL('../',import.meta.url);
const config=JSON.parse(fs.readFileSync(new URL('assets/puzzles.json',path),'utf8'));
const p=config.puzzles[0];
const wasm=fs.readFileSync(new URL('dist/engine.wasm',path));
const engine=new WebAssembly.Instance(new WebAssembly.Module(wasm)).exports;
assert.equal(engine.puzzle_count(),2);
const getBoxes=()=>p.crates.map((_,i)=>({x:engine.puzzle_x(i),z:engine.puzzle_z(i)}));
const eq=(x,y)=>Math.abs(x-y)<.001;
engine.set_map(0);engine.set_view_collision(.65,.76,1);
assert.equal(puzzleProgress(getBoxes(),p.targets).placed,0);
assert.equal(nearestPuzzleBox(6.5,27.5,getBoxes()),0);
assert.equal(nearestPuzzleBox(7.85,27.5,getBoxes()),null,'offset between two crates should not expose unusable push prompt');
assert.deepEqual(puzzlePushDirection(6.5,27.5,6.5,29),{x:0,z:1});
// Reach the puzzle naturally: starting village -> south forest path -> east clearing.
engine.reset(0,3.5);
for(let i=0;i<122;i++)engine.move_player(0,1,.05);
assert(Math.abs(engine.get_z()-25.46)<.1&&engine.get_collision_count()===0,'initial street must reach the forest path');
for(let i=0;i<46;i++)engine.move_player(1,0,.05);
assert(Math.abs(engine.get_x()-8.28)<.12&&engine.get_collision_count()===0,'clearing entrance must be walkable from the main path');
// A standing hero should collide with the crate; movement cannot phase through it.
engine.reset(6.5,26.8);
for(let n=0;n<30;n++)engine.move_player(0,1,.05);
assert(engine.get_z()<27.8,`walked through crate: ${engine.get_z()}`);
assert(engine.get_collision_count()>0);
assert.equal(engine.puzzle_push(0,0,1),1,'first E press pushes one step');
assert(eq(engine.puzzle_z(0),30.5));
assert.equal(engine.puzzle_push(0,0,1),0,'cannot push a moved-away crate from too far');
for(let n=0;n<20;n++)engine.move_player(0,1,.05);
assert(engine.get_z()>28.7&&engine.get_z()<29.3,`hero cannot approach moved crate: ${engine.get_z()}`);
assert.equal(engine.puzzle_push(0,0,1),1,'second E press to target');
assert(eq(engine.puzzle_z(0),32));
assert.equal(puzzleProgress(getBoxes(),p.targets).placed,1);
// The second crate requires the same real WASM movement and push cycle.
engine.reset(9.2,26.8);
for(let n=0;n<30;n++)engine.move_player(0,1,.05);
assert(engine.get_z()<27.8,'second crate must block hero');
assert.equal(engine.puzzle_push(1,0,1),1);
for(let n=0;n<20;n++)engine.move_player(0,1,.05);
assert.equal(engine.puzzle_push(1,0,1),1);
assert(eq(engine.puzzle_z(1),32));
assert.equal(puzzleProgress(getBoxes(),p.targets).solved,true);
// Push cannot overlap a neighboring crate, even if the player is well aligned.
engine.puzzle_reset();engine.reset(5.0,29);
assert.equal(engine.puzzle_push(0,1,0),0,'must not push first crate into second');
assert(eq(engine.puzzle_x(0),6.5));
// Remote pushing and blocked push directions fail closed.
engine.reset(0,25);
assert.equal(engine.puzzle_push(0,0,1),0);
assert.equal(engine.puzzle_push(0,1,1),0);
assert.equal(engine.puzzle_push(2,1,0),0);
// Saved puzzle state accepts only valid lattice-aligned, non-overlapping positions.
assert.deepEqual(validSavedPuzzleBoxes([{x:6.5,z:32},{x:9.2,z:32}],p.crates,p.pushStep),[{x:6.5,z:32},{x:9.2,z:32}]);
assert.equal(validSavedPuzzleBoxes([{x:6.7,z:32},{x:9.2,z:32}],p.crates,p.pushStep),null);
assert.equal(validSavedPuzzleBoxes([{x:6.5,z:32},{x:6.5,z:32}],p.crates,p.pushStep),null);
// Test restoration via WebAssembly methods, including solved state.
engine.puzzle_reset();
assert.equal(engine.puzzle_set(0,6.5,32),1);assert.equal(engine.puzzle_set(1,9.2,32),1);
assert(puzzleProgress(getBoxes(),p.targets).solved);
engine.puzzle_reset();assert(eq(engine.puzzle_z(0),29));assert(eq(engine.puzzle_z(1),29));
// Map transitions do not reset puzzle progress; crates are absent from MAP 02.
engine.set_map(0);engine.reset(6.5,27.5);assert.equal(engine.puzzle_push(0,0,1),1);
engine.set_map(1);engine.reset(-23.5,-4);
assert.equal(engine.puzzle_push(0,0,1),0);
engine.set_map(0);assert(eq(engine.puzzle_z(0),30.5));
const html=fs.readFileSync(new URL('index.html',path),'utf8');
for(const mark of ['PuzzleLogic','puzzle_push','puzzle-hud','puzzle-reset','test-puzzle','PUZZLE']){

 assert(html.includes(mark),`missing HTML integration: ${mark}`);
}
assert(!html.includes('{{PUZZLE_DATA}}'));
console.log('PASS: 2 crates, full puzzle completion, push range, overlapping boxes, persistence validation, map continuity');
