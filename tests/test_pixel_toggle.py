#!/usr/bin/env python3
"""Exercise the production sprite draw, Pixel Art toggle and resolution input in Chromium.
CanvasTexture WebGPU dimensions must stay fixed while the visible image changes.
"""
import base64
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
src=(root/'index.template.html').read_text()

def between(a,b):
    i=src.index(a);j=src.index(b,i)
    return src[i:j]

init=between("let pixelDisplay=$('pixels').checked;", "const hero=new THREE.Sprite")
draw=between('function drawSprite(action,frame,facing,dx=0,dz=0){',"drawSprite('idle',0,'right');")
toggle=between("$('pixels').addEventListener('change',e=>{", "$('follow').addEventListener")
toggle=toggle[:toggle.index('});')+3]
resolution=between("$('pixel-resolution').addEventListener('input',e=>{", "refreshSpriteInfo();\n// Shape textures")
resolution=resolution[:resolution.index('});')+3]
assert 'spriteCanvas.width=atlasWidth' in init
assert 'spriteCanvas.height=atlasHeight' in init
assert 'spriteCanvas.width=' not in toggle+resolution
js='''const $=id=>document.getElementById(id);
const atlasWidth=512,atlasHeight=512;
let atlasColumns=5,sourceAtlasWidth=512,sourceAtlasHeight=512,pivotX=256,currentSpriteSet='haruka';
const SPRITE_CONFIG={idle:{frames:25,fps:8}};
const THREE={CanvasTexture:class{constructor(image){this.image=image;this.needsUpdate=true;}},
SpriteMaterial:class{constructor(o){this.map=o.map;}},SRGBColorSpace:'srgb',LinearFilter:'linear'};
let lastDrawKey='',spriteFacingStatus='';
let spriteSheets={idle:{side:null}};
const resolveSprite=(action,facing)=>({image:spriteSheets.idle.side,flip:false,label:facing});
const refreshSpriteInfo=()=>{};
const localStorage={getItem:()=>null,setItem:()=>{}};
''' + init + '\n' + draw + '\n' + toggle + '\n' + resolution + '''
async function loadImage(){const img=new Image();img.src=window.SRC;await img.decode();spriteSheets.idle.side=img;drawSprite('idle',0,'right');}
function result(){const d=spriteCtx.getImageData(0,0,atlasWidth,atlasHeight).data;let alpha=0;const colors=new Set();for(let i=0;i<d.length;i+=4){if(d[i+3]>32){alpha++;if(i%16===0)colors.add(`${d[i]},${d[i+1]},${d[i+2]}`);}}return {alpha,colors:colors.size,w:spriteCanvas.width,h:spriteCanvas.height,low:pixelCanvas.width};}
window.check=result;
window.redraw=()=>drawSprite('idle',0,'right');
window.loadImage=loadImage;
'''
image_data=base64.b64encode((root/'assets/packed/haruka/idle_side.webp').read_bytes()).decode()
html='''<html><body><input id="pixels" type="checkbox"><input id="pixel-resolution" type="range" min="64" max="512" step="16" value="160"><p id="sprite-quality-status"></p><p id="pixel-resolution-out"></p><script>window.SRC="data:image/webp;base64,'''+image_data+'";'+js+'</script></body></html>'
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='load')
    page.evaluate('loadImage()')
    off=page.evaluate('check()')
    assert off['alpha']>3500 and off['colors']>250,off
    for i in range(5):
        page.locator('#pixels').check()
        page.evaluate('redraw()')
        on=page.evaluate('check()')
        assert on['alpha']>3500 and on['w']==512 and on['h']==512 and on['low']==160,on
        page.locator('#pixels').uncheck()
        page.evaluate('redraw()')
        again=page.evaluate('check()')
        assert again['alpha']>3500 and again['w']==512 and again['h']==512,again
    page.locator('#pixels').check()
    for px in [64,80,128,160,256,512]:
        page.locator('#pixel-resolution').fill(str(px))
        page.evaluate('redraw()')
        r=page.evaluate('check()')
        assert r['low']==px and r['w']==512 and r['alpha']>3500,(px,r)
    assert not errors,errors
    print('PASS: Pixel Art OFF/ON x5, live resolution 64→512, visible sprite and fixed 512px texture')
    browser.close()
