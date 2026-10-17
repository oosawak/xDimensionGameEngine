"""No-network UI regression tests for responsive controls and panel behavior."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
root=Path(__file__).resolve().parents[1]
markup=(root/'index.html').read_text(encoding='utf-8')
markup=re.sub(r'<script type="module">.*?</script>','',markup,flags=re.S)
markup=re.sub(r'<script type="importmap">.*?</script>','',markup,flags=re.S)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for width,height in ((1280,800),(900,650),(800,650),(600,550),(390,820),(320,680),(844,390),(320,360)):
        page=browser.new_page(viewport={'width':width,'height':height},has_touch=True,is_mobile=True)
        page.set_content(markup)
        assert page.locator('#panel').is_hidden(),f'{width}x{height} panel must start folded'
        for ident in ['pad','actions','attack-btn','jump-btn','run-btn']:
            assert page.locator('#'+ident).is_visible(),f'{width}x{height}: {ident} hidden'
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),f'{width}x{height}: overflow'
        page.locator('#panel-toggle').click()
        assert page.locator('#panel').is_visible()
        assert page.locator('#panel-toggle').get_attribute('aria-expanded')=='true'
        # Controls still clickable, not covered by the panel even at very low height.
        for ident in ['attack-btn','jump-btn','run-btn','left','up','down','right']:
            result=page.locator('#'+ident).evaluate('''e=>{const r=e.getBoundingClientRect();const x=Math.max(0,Math.min(innerWidth-1,r.left+r.width/2)),y=Math.max(0,Math.min(innerHeight-1,r.top+r.height/2));return {rect:[r.x,r.y,r.width,r.height], top:document.elementFromPoint(x,y)?.id}}''')
            assert result['top']==ident, f'{width}x{height} {ident} blocked by {result}'
        assert page.locator('#panel').evaluate('e=>e.scrollHeight>e.clientHeight') or height>650
        if width==390: page.screenshot(path=str(root/'tests/ui-fixed-390.png'))
        page.keyboard.press('Escape')
        assert page.locator('#panel').is_hidden()
        page.close()
    browser.close()
print('PASS: controls and settings accessible at 8 viewport sizes, no overlay, Esc close')
