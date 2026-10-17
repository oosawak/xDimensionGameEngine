"""Browser smoke for standalone UI (no network or GPU dependencies)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
root=Path(__file__).resolve().parents[1]
markup=(root/'index.html').read_text(encoding='utf-8')
markup=re.sub(r'<script type="module">.*?</script>','',markup,flags=re.S)
markup=re.sub(r'<script type="importmap">.*?</script>','',markup,flags=re.S)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for width,height in ((1220,760),(390,820),(320,680)):
        page=browser.new_page(viewport={'width':width,'height':height})
        page.set_content(markup)
        assert page.locator('#panel').is_hidden(),f'{width}: panel must start folded'
        assert page.locator('#panel-toggle').get_attribute('aria-expanded')=='false'
        page.get_by_role('button',name='設定を開く').click()
        assert page.locator('#panel').is_visible()
        assert page.locator('#panel-toggle').get_attribute('aria-expanded')=='true'
        assert page.locator('#tune-scale').count()==1
        assert page.locator('#tune-y').count()==1
        assert page.locator('#tune-action').input_value()=='attack'
        page.screenshot(path=str(root/f'tests/ui-{width}.png'))
        page.keyboard.press('Escape')
        assert page.locator('#panel').is_hidden()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{width}: horizontal overflow'
        page.close()
    browser.close()
print('PASS: initial collapsed panel, toggle, Esc close, mobile widths')
