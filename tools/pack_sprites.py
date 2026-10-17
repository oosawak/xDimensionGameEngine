#!/usr/bin/env python3
"""Pack fixed-pivot character atlases; interchangeable 4/8 direction sprites.

Physical character size stays consistent across actions: only one CALIBRATED
scale per action, never per-frame bbox fitting (which would resize sword poses).
Animated jumps retain their drawn vertical motion. Originals aren't modified.
"""
import json
import argparse
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--manifest', default='assets/sprites.json')
parser.add_argument('--out', default='assets/packed')
args=parser.parse_args()
manifest = json.loads((ROOT / args.manifest).read_text(encoding='utf-8'))
W, H = manifest['cell_width'], manifest['cell_height']
PIVOT_X, PIVOT_Y = manifest['pivot_x'], manifest['pivot_y']
OUT = ROOT / args.out
OUT.mkdir(parents=True, exist_ok=True)
index = {
    'cell': {'width': W, 'height': H, 'pivotX': PIVOT_X, 'pivotY': PIVOT_Y, 'columns': 5},
    'actions': {}
}
for action, cfg in manifest['actions'].items():
    cols, rows = int(cfg['columns']), int(cfg['rows'])
    count = int(cfg['frames'])
    entry = {'frames': count, 'fps': cfg['fps'], 'directions': {}}
    for direction, setting in cfg['directions'].items():
        # Each view may override its own calibration when later supplied.
        # String = same source geometry; object = independent front/back geometry.
        overrides={'file': setting} if isinstance(setting,str) else setting
        filename=overrides['file']
        scale = manifest['target_body_height_px'] / float(overrides.get('body_reference_px',cfg['body_reference_px']))
        source_center=float(overrides.get('source_center',cfg['source_center']))
        source_baseline=float(overrides.get('source_baseline',cfg['source_baseline']))
        source_path = ROOT / 'assets/characters' / filename
        if not source_path.is_file():
            raise FileNotFoundError(f'{action}/{direction}: {source_path}')
        source = Image.open(source_path).convert('RGBA')
        original_frame={'width':source.width//cols,'height':source.height//rows}
        if source.width % cols or source.height % rows:
            raise ValueError(f'{source_path}: sheet {source.size} not divisible by {cols}x{rows}')
        entry['sourceFrame']=original_frame
        # Optional original atlas metadata: respect exact frame coordinates.
        # Haruka provides these JSON files; old hand-drawn placeholders do not.
        rectangles=None
        atlas_json = overrides.get('atlas_json', cfg.get('atlas_json'))
        if atlas_json:
            data=json.loads((ROOT/'assets/characters'/atlas_json).read_text(encoding='utf-8'))
            if len(data['frames']) != count:
                raise ValueError(f'{action}/{direction}: atlas frame count mismatch')
            rectangles=[data['frames'][str(i)] for i in range(count)]
            for rect in rectangles:
                x,y,w,h=(int(rect[t]) for t in ('x','y','w','h'))
                if x<0 or y<0 or x+w>source.width or y+h>source.height:
                    raise ValueError(f'{action}/{direction}: atlas frame out of bounds')
            sizes={(int(r['w']),int(r['h'])) for r in rectangles}
            if len(sizes)!=1:raise ValueError(f'{action}/{direction}: mixed frame cell sizes require normalization')
            sw,sh=next(iter(sizes))
            entry['sourceFrame']={'width':sw,'height':sh}
        else:
            sw,sh=source.width//cols,source.height//rows
        fw, fh = round(sw * scale), round(sh * scale)
        # New blank atlas. No shifting based on frame bounding boxes.
        atlas = Image.new('RGBA', (W * cols, H * rows), (0, 0, 0, 0))
        clipped = 0
        for frame in range(count):
            ix, iy = frame % cols, frame // cols
            if rectangles:
                r=rectangles[frame]; x,y,ww,hh=(int(r[t]) for t in ('x','y','w','h'))
                piece=source.crop((x,y,x+ww,y+hh))
            else:
                piece=source.crop((ix*sw,iy*sh,(ix+1)*sw,(iy+1)*sh))
            piece = piece.resize((fw, fh), Image.Resampling.LANCZOS)
            offset_x = round(PIVOT_X - source_center * scale)
            offset_y = round(PIVOT_Y - source_baseline * scale)
            bounds = piece.getchannel('A').getbbox()
            if bounds and (bounds[0]+offset_x < 0 or bounds[1]+offset_y < 0 or
                           bounds[2]+offset_x > W or bounds[3]+offset_y > H):
                clipped += 1
            # Cropping to the atlas cell prevents paint bleeding into next frames.
            cell = Image.new('RGBA', (W, H), (0,0,0,0))
            cell.paste(piece, (offset_x, offset_y))
            atlas.paste(cell, (ix*W, iy*H))
        if clipped:
            raise ValueError(f'{action}/{direction}: {clipped} frames clipped; increase cell area or tune pivot')
        target = OUT / f'{action}_{direction}.webp'
        atlas.save(target, 'WEBP', lossless=True, method=5)
        entry['directions'][direction] = target.name
        entry['compressedBytes'] = entry.get('compressedBytes',0) + target.stat().st_size
        print(f'{action:7} {direction:12} {count:2}f  scale={scale:.3f}  {target.stat().st_size:,} bytes')
    index['actions'][action] = entry
(OUT / 'index.json').write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding='utf-8')
