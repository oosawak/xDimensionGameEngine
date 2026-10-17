"""DOM/CSS smoke test. Explicitly DOES NOT test Three.js rendering.
The browser sandbox blocks local URLs and CDN, so the module is omitted and
v0.8's still-usable independent HTML control panel is tested via set_content.
"""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
base=Path(__file__).resolve().parents[1]
html=(base/'index.template.html').read_text(encoding='utf-8')
html=re.sub(r'<script type="module">.*?</script>', '', html, flags=re.S)
for width,height in [(390,844),(1280,800),(844,390)]:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':width,'height':height})
        page.set_content(html,wait_until='domcontentloaded')
        assert page.locator('#panel').is_hidden(), 'settings should start collapsed'
        assert page.locator('#actions').is_visible() and page.locator('#pad').is_visible()
        page.locator('#panel-toggle').click()
        assert page.locator('#panel').is_visible()
        assert page.locator('#cinematic-on').count()==1
        assert page.locator('#water-ripple-enabled').is_checked()
        assert page.locator('#focus-offset').input_value()=='0'
        assert page.locator('#jump-btn').is_visible() and page.locator('#attack-btn').is_visible()
        assert page.evaluate("getComputedStyle(document.querySelector('#actions')).zIndex") == '12'
        assert page.evaluate("getComputedStyle(document.querySelector('#panel')).zIndex") == '9'
        page.locator('#panel-toggle').click()
        assert page.locator('#panel').is_hidden()
        if width==390:
            page.locator('#panel-toggle').click()
            page.locator('#panel').evaluate('(el)=>el.scrollTop = el.scrollHeight')
            page.screenshot(path=str(base/'tests/ui-v08-mobile.png'))
        browser.close()
    print(f'PASS: v0.8 UI {width}x{height} panel/control visibility')
