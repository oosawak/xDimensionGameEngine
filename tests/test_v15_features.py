#!/usr/bin/env python3
"""New and legacy sprite set switch, metadata, and world particle anchor tests."""
import json
import base64
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
src=(root/'index.template.html').read_text()
html=(root/'index.html').read_text()
for marker in ['sprite-set','pixel-resolution','sprite-info-body','particleAnchorShift','recenterParticleField','{{SPRITE_BUNDLES}}']:
    assert marker in src,marker
assert '{{SPRITE_BUNDLES}}' not in html
assert html.count('data:image/webp;base64,') == 10
assert 'particleOrigin.value.set(x,' not in src
assert 'fallbackFlies.position.set(x,' not in src
assert 'recenterParticleField(x,y,z)' in src
assert src.index('id="sprite-info"') < src.index('id="char-preview"')
sets={}
for set_name,dims in {'legacy':(512,320),'haruka':(512,512)}.items():
    index=json.loads((root/'assets/packed'/set_name/'index.json').read_text())
    assert tuple(index['cell'][k] for k in ('width','height'))==dims
    assert set(index['actions'])=={'idle','walk','run','jump','attack'}
    for action,cfg in index['actions'].items():
        assert all(k in cfg for k in ['frames','fps','directions','sourceFrame','compressedBytes'])
    source=index['actions']['idle']
    path=root/'assets/packed'/set_name/source['directions']['side']
    sets[set_name]={'cell':index['cell'],'actions':{'idle':{'frames':source['frames'],'fps':source['fps'],'directions':{'side':'data:image/webp;base64,'+base64.b64encode(path.read_bytes()).decode()}}}}
assert sets['haruka']['actions']['idle']['frames']==25
assert sets['legacy']['actions']['idle']['frames']==21
start=src.index('const SPRITE_BUNDLES={{SPRITE_BUNDLES}};')
end=src.index('// v0.0.14: NEVER resize',start)
loader=src[start:end].replace('{{SPRITE_BUNDLES}}','window.TEST_BUNDLES')
particle=src[src.index('const particleOrigin=uniform('):src.index('let particleBaseOpacity=.78;')]
js='''const $=id=>document.getElementById(id);
const localStorage={getItem:()=>null,setItem:()=>{}};
''' +loader+'''
window.ready=true;
window.switchSet=async name=>{await loadSpriteSet(name);return {name:currentSpriteSet,width:spriteSheets.idle.side.width,height:spriteSheets.idle.side.height,count:SPRITE_CONFIG.idle.frames};};
'''
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page()
    page.on('pageerror',lambda e:print('Browser error:',e))
    markup='<html><body><select id="sprite-set"><option value="haruka">Haruka</option><option value="legacy">Legacy</option></select><script>window.TEST_BUNDLES='+json.dumps(sets)+';</script><script type="module">'+js+'</script></body></html>'
    page.set_content(markup,wait_until='load')
    page.wait_for_function('window.ready===true',timeout=30000)
    initial=page.evaluate('switchSet("haruka")')
    legacy=page.evaluate('switchSet("legacy")')
    again=page.evaluate('switchSet("haruka")')
    assert (initial['width'],initial['height'],initial['count'])==(2560,2560,25),initial
    assert (legacy['width'],legacy['height'],legacy['count'])==(2560,1600,21),legacy
    assert again==initial,(initial,again)
    browser.close()

# Execute original particle recenter code in Node to verify world coordinates stay unchanged.
js='''const THREE={Vector3:class{constructor(x=0,y=0,z=0){this.set(x,y,z)}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}copy(v){return this.set(v.x,v.y,v.z)}}};
const uniform=value=>({value});
let point=[0,1,0];
const attr={count:1,getX:()=>point[0],getY:()=>point[1],getZ:()=>point[2],setXYZ:(i,x,y,z)=>{point=[x,y,z]}};
const fallbackFlies={geometry:{attributes:{position:attr}},position:new THREE.Vector3()};
''' +particle+'''
function world(){return [point[0]+particleAnchor.x,point[1]+particleAnchor.y,point[2]+particleAnchor.z]}
const before=world();
const same=()=>world().every((v,i)=>Math.abs(v-before[i])<1e-7);
recenterParticleField(3,0,4);if(!same())throw Error('moved within zone');
recenterParticleField(9,0,3.5);
if(!same())throw Error('world particle moved when player crossed recenter threshold');
if(particleAnchorShift.value.x!==9)throw Error('GPU offset missing');
recenterParticleField(10,0,3.5);
if(!same())throw Error('world particle moved with player');
console.log('PASS: particle world coordinates stable as player moves; GPU recenter shift tracked');
'''
import subprocess
result=subprocess.run(['node','--input-type=module','-e',js],capture_output=True,text=True)
assert result.returncode==0,(result.stdout,result.stderr)
print(result.stdout.strip())
print('PASS: new/old atlas sets switch, 10 embedded sprites, per-source metadata and UI')
