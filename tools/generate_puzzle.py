#!/usr/bin/env python3
"""Generate matching C and Rust WASM puzzle constants from JSON."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'assets/puzzles.json').read_text(encoding='utf-8'))
puzzles=data['puzzles']; assert len(puzzles)==1 and puzzles[0]['map']==0
p=puzzles[0]; crates=p['crates']; assert len(crates)==2
assert len(p['targets'])==len(crates) and p['pushStep']>0
for crate in crates:
    assert all(isinstance(crate[k],(int,float)) for k in ('x','z'))
f=lambda n: f'{n:.5f}'
(root/'src/puzzle.generated.h').write_text('\n'.join([
 '/* Generated from assets/puzzles.json; do not edit. */',
 f'#define PUZZLE_COUNT {len(crates)}',
 f'#define PUZZLE_STEP {f(p["pushStep"])}f',
 'static float puzzle_x[PUZZLE_COUNT]={'+','.join(f(c['x'])+'f' for c in crates)+'};',
 'static float puzzle_z[PUZZLE_COUNT]={'+','.join(f(c['z'])+'f' for c in crates)+'};',
 'static const float puzzle_initial_x[PUZZLE_COUNT]={'+','.join(f(c['x'])+'f' for c in crates)+'};',
 'static const float puzzle_initial_z[PUZZLE_COUNT]={'+','.join(f(c['z'])+'f' for c in crates)+'};',
 '']) ,encoding='utf-8')
(root/'src/puzzle.generated.rs').write_text('\n'.join([
 '// Generated from assets/puzzles.json; do not edit.',
 f'const PUZZLE_COUNT: usize={len(crates)};',
 f'const PUZZLE_STEP: f32={f(p["pushStep"])};',
 'const PUZZLE_START_X: [f32;PUZZLE_COUNT]=['+','.join(f(c['x']) for c in crates)+'];',
 'const PUZZLE_START_Z: [f32;PUZZLE_COUNT]=['+','.join(f(c['z']) for c in crates)+'];',
 'static mut PUZZLE_X: [f32;PUZZLE_COUNT]=PUZZLE_START_X;',
 'static mut PUZZLE_Z: [f32;PUZZLE_COUNT]=PUZZLE_START_Z;',
 '']) ,encoding='utf-8')
print('✓ generated puzzle constants for C and Rust')
