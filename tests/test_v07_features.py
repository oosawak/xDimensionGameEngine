from pathlib import Path
import re
base=Path(__file__).resolve().parents[1]
t=(base/'index.template.html').read_text()
a=(base/'index.html').read_text()
assert t.count('const wall=mat(')==1
for s in ['makePixelTexture(', 'look-hd2d', 'look-classic', 'surface-texture', 'dof-strength', 'bloom-strength', 'fog-density', 'vignette', 'contactCanvas', 'set_view_collision', "glowContext.createRadialGradient"]:
    assert s in t, s
for s in ['{{WASM_BASE64}}','{{SPRITE_BUNDLES}}','{{COLLISION_WORLD}}']:
    assert s in t and s not in a
assert a.count('data:image/webp;base64,')>=10
assert len(re.findall(r'<script type="module">.*?</script>',a,re.S))==1
print('PASS: v0.7 cinematic visual controls, procedural textures, WASM + sprites embedded')
