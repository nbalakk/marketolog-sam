from pathlib import Path
import sys,json,threading,http.server,functools,contextlib,re
import os
if os.environ.get('SAM_DEV_TOOLS'): sys.path.insert(0,os.environ['SAM_DEV_TOOLS'])
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/'qa';SHOTS=QA/'screenshots';SHOTS.mkdir(parents=True,exist_ok=True)
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}'
result={'viewports':[],'checks':[],'console_errors':[],'failed_resources':[]}
def check(name,condition):
    result['checks'].append({'name':name,'passed':bool(condition)})
    if not condition: raise AssertionError(name)

try:
  with sync_playwright() as p:
    browser=p.chromium.launch(**({'executable_path':os.environ['SAM_BROWSER_PATH']} if os.environ.get('SAM_BROWSER_PATH') else {}),headless=True,args=['--disable-gpu'])
    context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
    page=context.new_page()
    page.on('pageerror',lambda err:result['console_errors'].append(str(err)))
    page.on('response',lambda r:result['failed_resources'].append({'url':r.url,'status':r.status}) if r.status>=400 else None)
    page.goto(base,wait_until='networkidle')
    page.screenshot(path=str(SHOTS/'01-mobile.png'),full_page=False)
    check('No analytics requests before consent',page.locator('script[src*="mc.yandex"],script[src*="mail.ru"]').count()==0)
    check('Mobile menu is hidden at first load',not page.locator('#primaryNav').is_visible())
    check('Single main heading',page.get_by_role('heading',level=1).count()==1)
    check('No placeholder URLs',page.locator('[href*="example.com"],[href*="VK_COMMUNITY_URL"]').count()==0)
    check('Three source screenshots available',page.locator('img[src*="bot-screen"]').count()==3)
    for w,h in [(320,800),(360,800),(390,844),(457,572),(768,1024),(860,900),(1024,900),(1440,1000)]:
        page.set_viewport_size({'width':w,'height':h});page.goto(base,wait_until='networkidle')
        metrics=page.evaluate('''() => { const e=document.querySelector('#hero .js-open-bot').getBoundingClientRect();return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,ctaTop:e.top,ctaBottom:e.bottom,viewportHeight:innerHeight}; }''')
        result['viewports'].append(metrics)
        check(f'No horizontal overflow {w}',metrics['scrollWidth']<=w)
        check(f'CTA in first screen {w}x{h}',metrics['ctaBottom']<=h)
    page.screenshot(path=str(SHOTS/'02-desktop.png'),full_page=False)
    page.screenshot(path=str(SHOTS/'03-desktop-full.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844});page.goto(base)
    page.get_by_role('button',name='Открыть меню',exact=True).click()
    check('Mobile launch button visible',page.locator('#primaryNav .js-open-bot').is_visible())
    page.screenshot(path=str(SHOTS/'04-menu.png'))
    page.keyboard.press('Escape');check('Escape closes mobile menu',page.locator('#navToggle').get_attribute('aria-expanded')=='false')
    page.get_by_role('button',name='Открыть меню',exact=True).click()
    page.locator('#primaryNav a[href="#pricing"]').click()
    check('Selecting menu link closes it',page.locator('#navToggle').get_attribute('aria-expanded')=='false')
    page.screenshot(path=str(SHOTS/'05-pricing.png'))
    check('Source Telegram start preserved',all(re.search(r'start=(landing|cmd_run_3318292060)$',x) for x in page.locator('.js-open-bot').evaluate_all('(els)=>els.map(e=>e.href)')))
    page.get_by_role('button',name='Увеличить пример генерации изображения',exact=True).click()
    check('Native image dialog opens',page.locator('#image-dialog').evaluate('(e)=>e.open'))
    check('Dialog has accessible caption',bool(page.locator('#image-caption').inner_text()))
    page.keyboard.press('Tab');check('Focus trapped inside image dialog',page.evaluate('document.querySelector("#image-dialog").contains(document.activeElement)'))
    page.screenshot(path=str(SHOTS/'06-dialog.png'))
    page.keyboard.press('Escape');check('Escape closes image dialog',not page.locator('#image-dialog').evaluate('(e)=>e.open'))
    check('Focus returns to image trigger',page.evaluate('document.activeElement.getAttribute("data-full-image")')=='images/bot-screen-3.png')
    page.get_by_text('Что происходит с моими данными?',exact=True).click()
    check('FAQ privacy links available',page.locator('.faq-item[open] a[href="privacy.html#s2"]').is_visible())
    page.get_by_role('button',name='Скопировать запрос',exact=True).click()
    check('Copy button gives feedback',bool(page.locator('.copy-status').inner_text()))
    page.get_by_role('button',name='Без аналитики',exact=True).click()
    page.reload();check('Rejection persists',not page.locator('#cookieBanner').is_visible())
    page.get_by_role('button',name='Настройки аналитики',exact=True).click();check('Settings can reopen',page.locator('#cookieBanner').is_visible())
    page.get_by_role('button',name='Разрешить',exact=True).click()
    check('Preview cannot track on production counters',page.locator('script[src*="mc.yandex"],script[src*="mail.ru"]').count()==0)
    for doc in ['privacy.html','offer.html']:
        page.goto(base+'/'+doc,wait_until='networkidle');check(f'Legal main heading {doc}',page.locator('h1').count()==1)
        check(f'Legal mobile back link {doc}',page.get_by_role('link',name='Вернуться на главную страницу',exact=True).is_visible())
        check(f'No legal overflow {doc}',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        page.screenshot(path=str(SHOTS/doc.replace('.html','.png')))
    # Verify all reachable local files and anchor IDs without contacting external destinations.
    page.goto(base)
    refs=page.locator('[src],[href],[data-full-image]').evaluate_all('(els)=>els.flatMap(e=>[e.getAttribute("src"),e.getAttribute("href"),e.getAttribute("data-full-image")].filter(Boolean))')
    from urllib.parse import urljoin,urlparse,unquote
    for ref in set(refs):
        target=urlparse(urljoin(base+'/',ref))
        if target.netloc!=urlparse(base).netloc:continue
        response=context.request.get(target._replace(fragment='').geturl())
        check('Local resource '+ref,response.ok)
        if target.fragment:
            targetpage=context.new_page();targetpage.goto(target._replace(fragment='').geturl())
            check('Anchor '+ref,targetpage.locator('[id="'+unquote(target.fragment)+'"]').count()>0);targetpage.close()
    # Test real production consent flow with trackers intercepted, never transmitting analytics.
    prod=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
    prodpage=prod.new_page();tracked=[]
    def routes(route):
        u=urlparse(route.request.url)
        if u.hostname=='marketolog-sam.ru':
            target=(ROOT/'dist'/unquote(u.path.lstrip('/') or 'index.html')).resolve()
            if target.is_file() and target.is_relative_to((ROOT/'dist').resolve()): route.fulfill(path=str(target))
            else: route.fulfill(status=404,body='Not found')
        else:
            tracked.append(route.request.url);route.fulfill(status=200,body='')
    prod.route('**/*',routes)
    prodpage.goto('https://marketolog-sam.ru/',wait_until='networkidle')
    check('Production no third party before consent',not tracked)
    prodpage.get_by_role('button',name='Разрешить',exact=True).click();prodpage.wait_for_load_state('networkidle')
    check('Both counters load after consent',any('mc.yandex.ru' in u for u in tracked) and any('top-fwz1.mail.ru' in u for u in tracked))
    prodpage.evaluate('window.__goals=[];window.ym=(...args)=>window.__goals.push(args)')
    # Prevent opening an external bot while testing click registration.
    prodpage.locator('#hero .js-open-bot').evaluate('(e)=>e.addEventListener("click",event=>event.preventDefault())')
    prodpage.locator('#hero .js-open-bot').click()
    goals=prodpage.evaluate('window.__goals.filter(a=>a[1]==="reachGoal"&&a[2]==="telegram_click")')
    check('One click creates exactly one tracking goal',len(goals)==1)
    prodpage.get_by_role('button',name='Настройки аналитики',exact=True).click()
    prodpage.get_by_role('button',name='Без аналитики',exact=True).click();prodpage.wait_for_load_state('networkidle')
    check('Withdrawal reloads without trackers',prodpage.locator('script[src*="mc.yandex"],script[src*="mail.ru"]').count()==0)
    nojs=browser.new_context(java_script_enabled=False,viewport={'width':390,'height':844})
    static=nojs.new_page();static.goto(base)
    check('Core content visible without JS',static.locator('#hero .js-open-bot').is_visible() and static.locator('#examples h2').is_visible())
    check('No JS does not silently load analytics',static.locator('script[src*="mc.yandex"],script[src*="mail.ru"]').count()==0)
    browser.close()
  check('No browser JavaScript errors',not result['console_errors'])
  check('No failed resource responses',not result['failed_resources'])
finally:
  server.shutdown();(QA/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
  print(json.dumps({'checks':len(result['checks']),'failed':[x for x in result['checks'] if not x['passed']],'viewports':result['viewports'],'errors':result['console_errors']},ensure_ascii=False))
