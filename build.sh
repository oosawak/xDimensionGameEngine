#!/usr/bin/env bash
# ./build.sh c | rust | assets
# Builds a standalone index.html with C/Rust WASM and all 5 sprite atlases embedded.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist
python3 tools/generate_colliders.py
python3 tools/generate_puzzle.py
lang="${1:-c}"
case "$lang" in
 c)
   command -v clang >/dev/null || { echo 'clang が必要です' >&2; exit 1; }
   clang --target=wasm32 -O2 -nostdlib -ffreestanding -fno-builtin \
     -Wl,--no-entry -Wl,--export=engine_version -Wl,--export=reset \
     -Wl,--export=move_player -Wl,--export=get_x -Wl,--export=get_z \
     -Wl,--export=get_frame_count -Wl,--export=get_collision_count \
     -Wl,--export=terrain_noise -Wl,--export=get_y -Wl,--export=get_ground_y \
     -Wl,--export=get_ground_y_at -Wl,--export=jump_player -Wl,--export=is_grounded \
     -Wl,--export=set_running -Wl,--export=set_view_collision -Wl,--export=set_map -Wl,--export=get_map \
     -Wl,--export=puzzle_count \
     -Wl,--export=puzzle_reset -Wl,--export=puzzle_set -Wl,--export=puzzle_push -Wl,--strip-all \
     src/engine.c -o dist/engine.wasm
   ;;
 rust)
   command -v cargo >/dev/null || { echo 'cargo が必要です。https://rustup.rs/' >&2; exit 1; }
   command -v rustup >/dev/null || { echo 'rustup が必要です' >&2; exit 1; }
   rustup target add wasm32-unknown-unknown
   cargo build --release --target wasm32-unknown-unknown
   cp target/wasm32-unknown-unknown/release/hd2d_engine.wasm dist/engine.wasm
   ;;
 assets)
   test -s dist/engine.wasm || { echo '最初に ./build.sh c を実行してください' >&2; exit 1; }
   if [[ assets/collision-world.json -nt dist/engine.wasm || assets/area-maps.json -nt dist/engine.wasm || assets/puzzles.json -nt dist/engine.wasm ]]; then
     echo '当たり判定のJSONがWASMより新しいため、./build.sh c または ./build.sh rust で再コンパイルしてください' >&2
     exit 1
   fi
   ;;
 *) echo '使い方: ./build.sh c | rust | assets' >&2; exit 2;;
esac
if ! python3 -c 'import PIL' 2>/dev/null; then
  echo 'Pillow が必要です: python3 -m pip install pillow （Ubuntu: sudo apt install python3-pil）' >&2
  exit 1
fi
for set in haruka legacy; do
  manifest="assets/sprites.json"
  if [[ "$set" == "legacy" ]]; then manifest="assets/legacy-sprites.json"; fi
  dest="assets/packed/$set"
  if [[ ! -f "$dest/index.json" ]] || \
     find assets/characters "$manifest" -type f -newer "$dest/index.json" 2>/dev/null | grep -q .; then
    python3 tools/pack_sprites.py --manifest "$manifest" --out "$dest"
  else
    echo "✓ ${set} 素材は既存シートを再利用"
  fi
done
python3 - <<'PY'
import base64
import json
import re
from pathlib import Path
root=Path('.')
text=(root/'index.template.html').read_text(encoding='utf-8')
wasm=(root/'dist/engine.wasm').read_bytes()
assert text.count('{{WASM_BASE64}}')==1
text=text.replace('{{WASM_BASE64}}',base64.b64encode(wasm).decode('ascii'))
# Embed exactly the same pure door/collision functions imported by Node tests.
door_source=(root/'src/door-logic.mjs').read_text(encoding='utf-8')
door_source=door_source.replace('export function ','function ').replace('export const ','const ')
assert text.count('{{DOOR_LOGIC_SOURCE}}')==1
text=text.replace('{{DOOR_LOGIC_SOURCE}}',door_source)
camera_source=(root/'src/interior-camera.mjs').read_text(encoding='utf-8').replace('export function ','function ')
assert text.count('{{INTERIOR_CAMERA_SOURCE}}')==1
text=text.replace('{{INTERIOR_CAMERA_SOURCE}}',camera_source)
clock_source=(root/'src/world-clock.mjs').read_text(encoding='utf-8').replace('export function ','function ').replace('export const ','const ')
assert text.count('{{WORLD_CLOCK_SOURCE}}')==1
text=text.replace('{{WORLD_CLOCK_SOURCE}}',clock_source)
season_source=(root/'src/world-seasons.mjs').read_text(encoding='utf-8').replace('export function ','function ').replace('export const ','const ')
assert text.count('{{WORLD_SEASONS_SOURCE}}')==1
text=text.replace('{{WORLD_SEASONS_SOURCE}}',season_source)
particle_shape_source=(root/'src/particle-shapes.mjs').read_text(encoding='utf-8').replace('export function ','function ').replace('export const ','const ')
assert text.count('{{PARTICLE_SHAPES_SOURCE}}')==1
text=text.replace('{{PARTICLE_SHAPES_SOURCE}}',particle_shape_source)
particle_motion_source=(root/'src/particle-motion.mjs').read_text(encoding='utf-8').replace('export function ','function ').replace('export const ','const ')
assert text.count('{{PARTICLE_MOTION_SOURCE}}')==1
text=text.replace('{{PARTICLE_MOTION_SOURCE}}',particle_motion_source)
bundles={set_name:json.loads((root/'assets/packed'/set_name/'index.json').read_text(encoding='utf-8')) for set_name in ('haruka','legacy')}
world=json.loads((root/'assets/collision-world.json').read_text(encoding='utf-8'))
area_maps=json.loads((root/'assets/area-maps.json').read_text(encoding='utf-8'))
puzzles=json.loads((root/'assets/puzzles.json').read_text(encoding='utf-8'))
puzzle_source=(root/'src/puzzle-logic.mjs').read_text(encoding='utf-8').replace('export function ','function ').replace('export const ','const ')
assert text.count('{{PUZZLE_LOGIC_SOURCE}}')==1
text=text.replace('{{PUZZLE_LOGIC_SOURCE}}',puzzle_source)
assert text.count('{{PUZZLE_DATA}}')==1
text=text.replace('{{PUZZLE_DATA}}',json.dumps(puzzles,ensure_ascii=False,separators=(',',':')))
area_source=(root/'src/area-maps.mjs').read_text(encoding='utf-8').replace('export function ','function ')
assert text.count('{{AREA_MAPS_SOURCE}}')==1
text=text.replace('{{AREA_MAPS_SOURCE}}',area_source)
assert text.count('{{AREA_MAPS_DATA}}')==1
text=text.replace('{{AREA_MAPS_DATA}}',json.dumps(area_maps,ensure_ascii=False,separators=(',',':')))
assert text.count('{{COLLISION_WORLD}}')==1
text=text.replace('{{COLLISION_WORLD}}',json.dumps(world,ensure_ascii=False,separators=(',',':')))
for set_name, index in bundles.items():
    for action in index['actions'].values():
        for direction, file in action['directions'].items():
            data=(root/'assets/packed'/set_name/file).read_bytes()
            action['compressedBytes']=action.get('compressedBytes',len(data))
            action['directions'][direction]='data:image/webp;base64,'+base64.b64encode(data).decode('ascii')
assert text.count('{{SPRITE_BUNDLES}}')==1
text=text.replace('{{SPRITE_BUNDLES}}',json.dumps(bundles,ensure_ascii=False,separators=(',',':')))
assert not re.search(r'\{\{[A-Z_]+\}\}',text)
(root/'index.html').write_text(text,encoding='utf-8')
print(f'✓ index.html: {len(text):,} characters; WASM {len(wasm):,} bytes; {sum(len(c['directions']) for bundle in bundles.values() for c in bundle['actions'].values())} atlas(es) embedded')
PY
