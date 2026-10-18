from pathlib import Path
import os,sys,json,threading,http.server,functools,re
from urllib.parse import urljoin,urlparse,unquote
if os.environ.get('SAM_DEV_TOOLS'):sys.path.insert(0,os.environ['SAM_DEV_TOOLS'])
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/'qa';SHOTS=QA/'screenshots';SHOTS.mkdir(exist_ok=True)
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/'
result={'checks':[],'viewports':[],'console_errors':[],'failed_resources':[]}
def check(name,condition):
 result['checks'].append({'name':name,'passed':bool(condition)})
 if not condition:raise AssertionError(name)
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path=os.environ.get('SAM_BROWSER_PATH') or None,headless=True)
  c=b.new_context(viewport={'width':1374,'height':1145},reduced_motion='reduce',device_scale_factor=1)
  page=c.new_page();page.on('pageerror',lambda e:result['console_errors'].append(str(e)));page.on('response',lambda r:result['failed_resources'].append({'url':r.url,'status':r.status}) if r.status>=400 else None)
  page.goto(base,wait_until='networkidle');page.evaluate('document.fonts.ready')
  check('No trackers before consent',page.locator('script[src*="mc.yandex"],script[src*="mail.ru"]').count()==0)
  check('Single main heading',page.locator('h1').count()==1)
  check('Correct font actually loaded',page.evaluate('document.fonts.check(\'900 80px "Roboto Condensed"\')'))
  check('No placeholder links',page.locator('[href*="example.com"],[href*="VK_COMMUNITY_URL"]').count()==0)
  check('Exactly three example tabs',page.get_by_role('tab').count()==3)
  # Verify every demonstration state, then responsive stability in representative viewports.
  for w,h in [(320,800),(360,800),(390,844),(457,572),(768,1024),(1024,900),(1374,1145),(1440,1000)]:
   page.set_viewport_size({'width':w,'height':h});page.goto(base,wait_until='networkidle');page.evaluate('document.fonts.ready')
   metric=page.evaluate('''()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,cta:document.querySelector('#hero .js-open-bot').getBoundingClientRect().toJSON(),headingFits:[...document.querySelectorAll('h1 span')].every(e=>e.scrollWidth<=e.clientWidth+2)})''')
   result['viewports'].append(metric)
   check(f'No horizontal scroll at {w}',metric['sw']<=w)
   check(f'Headline contained at {w}',metric['headingFits'])
   check(f'CTA in first viewport at {w}',metric['cta']['bottom']<=h)
   heights=[]
   for name in ['post','plan','audit']:
    page.locator(f'[data-example="{name}"]').click()
    check(f'{name} tab selected at {w}',page.locator(f'[data-example="{name}"]').get_attribute('aria-selected')=='true')
    for stage in range(3):
     page.locator(f'[data-stage="{stage}"]').click()
     check(f'{name} stage {stage} pressed {w}',page.locator(f'[data-stage="{stage}"]').get_attribute('aria-pressed')=='true')
     check(f'{name} stage {stage} content {w}',len(page.locator('#demo-output').inner_text())>50)
     check(f'{name} stage {stage} no overflow {w}',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
     heights.append(page.locator('.demo').bounding_box()['height'])
   result.setdefault('demo_height_ranges',[]).append({'width':w,'range':round(max(heights)-min(heights),1)})
   check(f'Demo controls do not jump at {w}',max(heights)-min(heights)<2)
   if w in [390,1374]:
    page.locator('[data-example="post"]').click();page.locator('[data-stage="2"]').click();page.evaluate('window.scrollTo(0,0)')
    page.screenshot(path=str(SHOTS/f'final-{w}.png'))
    if w==1374:page.screenshot(path=str(SHOTS/'final-full.png'),full_page=True)
  page.set_viewport_size({'width':390,'height':844});page.goto(base)
  check('Mobile menu closed initially',not page.locator('#primaryNav').is_visible())
  page.get_by_role('button',name='Открыть меню',exact=True).click();check('Mobile CTA visible in menu',page.locator('#primaryNav .js-open-bot').is_visible());page.screenshot(path=str(SHOTS/'menu.png'))
  page.keyboard.press('Escape');check('Escape closes menu',page.locator('#navToggle').get_attribute('aria-expanded')=='false')
  page.get_by_role('button',name='Открыть меню',exact=True).click();page.locator('#primaryNav a[href="#pricing"]').click();check('Menu closes after navigation',page.locator('#navToggle').get_attribute('aria-expanded')=='false');page.screenshot(path=str(SHOTS/'pricing.png'))
  page.locator('#tab-post').focus();page.keyboard.press('ArrowRight');check('Keyboard switches example tabs',page.locator('#tab-plan').get_attribute('aria-selected')=='true');page.keyboard.press('End');check('End selects final tab',page.locator('#tab-audit').get_attribute('aria-selected')=='true');page.keyboard.press('Home');check('Home selects first tab',page.locator('#tab-post').get_attribute('aria-selected')=='true')
  page.locator('#demo-next').click();check('Next wraps stage 2 to 0',page.locator('[data-stage="0"]').get_attribute('aria-pressed')=='true');page.locator('#demo-prev').click();check('Previous wraps 0 to 2',page.locator('[data-stage="2"]').get_attribute('aria-pressed')=='true')
  page.locator('#demo-panel').dispatch_event('touchstart',{'changedTouches':[{'identifier':1,'clientX':250,'clientY':200}]});page.locator('#demo-panel').dispatch_event('touchend',{'changedTouches':[{'identifier':1,'clientX':120,'clientY':205}]});check('Horizontal swipe advances stage',page.locator('[data-stage="0"]').get_attribute('aria-pressed')=='true')
  page.locator('[data-show-example="audit"]').click();check('Capability link opens matching example',page.locator('#tab-audit').get_attribute('aria-selected')=='true')
  page.get_by_text('Как выглядит сам бот в Telegram',exact=True).click();page.get_by_role('button',name='Увеличить: Меню инструментов',exact=True).click();check('Image dialog opens',page.locator('#image-dialog').evaluate('(e)=>e.open'));page.keyboard.press('Tab');check('Modal keeps focus',page.evaluate('document.querySelector("#image-dialog").contains(document.activeElement)'));page.keyboard.press('Escape');check('Image dialog closes',not page.locator('#image-dialog').evaluate('(e)=>e.open'));check('Focus returns to image',page.evaluate('document.activeElement.classList.contains("screenshot-card")'))
  page.get_by_text('Что происходит с моими данными?',exact=True).click();check('Privacy answer is linked',page.locator('.faq-item[open] a[href="privacy.html#s2"]').is_visible());page.screenshot(path=str(SHOTS/'faq.png'))
  page.get_by_role('button',name='Скопировать пример запроса',exact=True).click();page.wait_for_function('document.querySelector(".copy-status").textContent.length>0');check('Copy feedback appears',bool(page.locator('.copy-status').inner_text()))
  check('Source bot start parameters preserved',all(re.search(r'start=(landing|cmd_run_3318292060)$',href) for href in page.locator('.js-open-bot').evaluate_all('(els)=>els.map(e=>e.href)')))
  page.get_by_role('button',name='Без аналитики',exact=True).click();page.reload();check('Reject persisted',not page.locator('#cookieBanner').is_visible());page.get_by_role('button',name='Настройки аналитики',exact=True).click();check('Consent settings reopen',page.locator('#cookieBanner').is_visible());page.get_by_role('button',name='Разрешить',exact=True).click();check('Preview does not send production analytics',page.locator('script[src*="mc.yandex"],script[src*="mail.ru"]').count()==0)
  # Relative resources and in-document anchors must work on GitHub Pages subpaths.
  page.goto(base)
  refs=page.locator('[src],[href],[data-full-image]').evaluate_all('(els)=>els.flatMap(e=>[e.getAttribute("src"),e.getAttribute("href"),e.getAttribute("data-full-image")].filter(Boolean))')
  for ref in set(refs):
   target=urlparse(urljoin(base,ref))
   if target.netloc!=urlparse(base).netloc:continue
   response=c.request.get(target._replace(fragment='').geturl());check('Local file '+ref,response.ok)
   if target.fragment:
    tp=c.new_page();tp.goto(target._replace(fragment='').geturl());check('Local anchor '+ref,tp.locator('[id="'+unquote(target.fragment)+'"]').count()>0);tp.close()
  for w in [320,390,1024]:
   page.set_viewport_size({'width':w,'height':844})
   for doc in ['privacy.html','offer.html']:
    page.goto(base+doc,wait_until='networkidle');check(f'Legal heading {doc} {w}',page.locator('h1').count()==1);check(f'Legal back link {doc} {w}',page.get_by_role('link',name='Вернуться на главную страницу',exact=True).is_visible());check(f'Legal no overflow {doc} {w}',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
  # Production routes simulated locally: trackers intercepted, no telemetry transmitted.
  prod=b.new_context(viewport={'width':390,'height':844},reduced_motion='reduce');tracked=[]
  def route_prod(route):
   u=urlparse(route.request.url)
   if u.hostname=='marketolog-sam.ru':
    path=(ROOT/'dist'/unquote(u.path.lstrip('/') or 'index.html')).resolve()
    if path.is_file() and path.is_relative_to((ROOT/'dist').resolve()):route.fulfill(path=str(path))
    else:route.fulfill(status=404,body='not found')
   else:tracked.append(route.request.url);route.fulfill(status=200,body='')
  prod.route('**/*',route_prod);pp=prod.new_page();pp.goto('https://marketolog-sam.ru/',wait_until='networkidle');check('Production no third party before consent',not tracked);pp.get_by_role('button',name='Разрешить',exact=True).click();pp.wait_for_load_state('networkidle');check('Counters load after explicit consent',any('mc.yandex.ru' in u for u in tracked) and any('top-fwz1.mail.ru' in u for u in tracked))
  pp.evaluate('window.__goals=[];window.ym=(...a)=>window.__goals.push(a)');pp.locator('#hero .js-open-bot').evaluate('(e)=>e.addEventListener("click",event=>event.preventDefault())');pp.locator('#hero .js-open-bot').click();check('One click sends one goal',len(pp.evaluate('window.__goals.filter(a=>a[2]==="telegram_click")'))==1)
  pp.get_by_role('button',name='Настройки аналитики',exact=True).click();pp.get_by_role('button',name='Без аналитики',exact=True).click();pp.wait_for_load_state('networkidle');check('Revoking consent stops counters after reload',pp.locator('script[src*="mc.yandex"],script[src*="mail.ru"]').count()==0)
  nojs=b.new_context(java_script_enabled=False,viewport={'width':390,'height':844});np=nojs.new_page();np.goto(base);check('CTA visible with JavaScript disabled',np.locator('#hero .js-open-bot').is_visible());check('Static example still readable without JS',len(np.locator('#demo-output').inner_text())>150);check('No JS means no analytics',np.locator('script[src*="mc.yandex"],script[src*="mail.ru"]').count()==0)
  # Reduced motion must not create an animated content transition.
  page.goto(base);page.locator('#tab-plan').click();check('Reduced motion disables demo animation',page.locator('#demo-output').evaluate('(e)=>e.getAnimations().length')==0)
  motion=b.new_context(viewport={'width':1374,'height':1145},reduced_motion='no-preference');mp=motion.new_page();mp.goto(base,wait_until='networkidle');mp.locator('#tab-plan').click();check('Normal motion has a short transition',mp.locator('#demo-output').evaluate('(e)=>e.getAnimations().length')>0)
  b.close()
 check('No browser JavaScript errors',not result['console_errors']);check('No failed resources',not result['failed_resources'])
finally:
 server.shutdown();(QA/'redesign-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'checks':len(result['checks']),'failed':[x for x in result['checks'] if not x['passed']],'demo_height_ranges':result.get('demo_height_ranges'),'errors':result['console_errors']}))
