"""Compare old/new sprite *visible* sizes for jump and attack using packed frames."""
from pathlib import Path
import re, json, statistics
from PIL import Image
root=Path(__file__).resolve().parents[1]
src=(root/'index.template.html').read_text()
legacy=json.loads((root/'assets/packed/legacy/index.json').read_text())
haruka=json.loads((root/'assets/packed/haruka/index.json').read_text())
assert re.search(r'haruka:\{idle:.*jump:\{scale:125.*attack:\{scale:103',src)
assert re.search(r'legacy:\{idle:.*jump:\{scale:110.*attack:\{scale:85',src)
assert 'xdimension-haruka-v16-action-size-migrated' in src
# alpha >100 excludes partially-transparent antialiasing and VFX wisps.
def bbox_height(set_name,action):
    meta=haruka if set_name=='haruka' else legacy
    c=meta['cell'];w,h=c['width'],c['height'];num=meta['actions'][action]['frames']
    im=Image.open(root/'assets/packed'/set_name/(action+'_side.webp')).convert('RGBA')
    heights=[]
    for idx in range(num):
        x=(idx%5)*w;y=(idx//5)*h
        alpha=im.crop((x,y,x+w,y+h)).getchannel('A')
        bbox=alpha.point(lambda v:255 if v>100 else 0).getbbox()
        heights.append(bbox[3]-bbox[1] if bbox else 0)
    return statistics.median(heights)
for action,old_scale,new_scale in [('jump',110,125),('attack',85,103)]:
    old=bbox_height('legacy',action)*old_scale/100
    new=bbox_height('haruka',action)*(172/275)*new_scale/100
    delta=abs(new/old-1)
    print(f'{action}: old {old:.2f}px world-equivalent; Haruka {new:.2f}px; difference {delta*100:.2f}%')
    assert delta < .04, f'{action} differs by more than 4%'
for action in ['idle','walk','run']:
    old=bbox_height('legacy',action)
    new=bbox_height('haruka',action)*(172/275)
    assert abs(new/old-1)<.04, (action,old,new)
assert 'id="tune-scale-out">103%' in src
assert "html('動作別の表示倍率'" in src
print('PASS: pose sizes match legacy reference; idle/walk/run unchanged')
