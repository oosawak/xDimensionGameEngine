#!/usr/bin/env python3
"""Offline atlas geometry, pivot, source resolution, and alpha clipping checks."""
import json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
for set_name,expected in [('haruka',(512,512,256,451)),('legacy',(512,320,256,284))]:
    m=json.loads((root/('assets/sprites.json' if set_name=='haruka' else 'assets/legacy-sprites.json')).read_text())
    idx=json.loads((root/'assets/packed'/set_name/'index.json').read_text())
    W,H=idx['cell']['width'],idx['cell']['height']
    assert (W,H,idx['cell']['pivotX'],idx['cell']['pivotY'])==expected
    for action,cfg in m['actions'].items():
        index_cfg=idx['actions'][action]
        assert index_cfg['frames']==cfg['frames']
        for direction,filename in index_cfg['directions'].items():
            atlas=Image.open(root/'assets/packed'/set_name/filename).convert('RGBA')
            assert atlas.size==(W*5,H*5),(set_name,action,atlas.size)
            for n in range(cfg['frames']):
                x,y=(n%5)*W,(n//5)*H
                cell=atlas.crop((x,y,x+W,y+H))
                bbox=cell.getchannel('A').getbbox()
                assert bbox,(set_name,action,n,'empty frame')
                assert bbox[0]>0 and bbox[2]<W and bbox[1]>0 and bbox[3]<H,(set_name,action,n,bbox)
        print(f'{set_name}/{action:7}: {cfg["frames"]} frames, no clipped edges, fixed pivot')
print('PASS: Both sprite atlases and source metadata')
