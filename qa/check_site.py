from pathlib import Path
import os,sys,threading,http.server,functools,json,re,hashlib
from html.parser import HTMLParser
if os.environ.get('SAM_DEV_TOOLS'):sys.path.insert(0,os.environ['SAM_DEV_TOOLS'])
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];D=ROOT/'dist';OUT=ROOT/'qa/screenshots/calm';OUT.mkdir(parents=True,exist_ok=True)
baseline=json.loads((ROOT/'qa/fixtures/calm-baseline.json').read_text(encoding='utf-8'))
results={'checks':[],'errors':[],'failedResources':[],'viewports':[]}
def check(name,passed):
 results['checks'].append({'name':name,'passed':bool(passed)})
 if not passed:raise AssertionError(name)
class Main(HTMLParser):
 def __init__(self):super().__init__();self.active=False;self.text=[];self.ids=[]
 def handle_starttag(self,tag,attrs):
  if tag=='main':self.active=True
  if self.active:
   self.ids += [v for k,v in attrs if k=='id']
 def handle_endtag(self,tag):
  if tag=='main':self.active=False
 def handle_data(self,data):
  if self.active:self.text.append(data)
for name in ['privacy.html','offer.html']:
 parser=Main();parser.feed((D/name).read_text(encoding='utf-8'));text=' '.join(' '.join(parser.text).split())
 check(name+' legal copy unchanged',hashlib.sha256(text.encode()).hexdigest()==baseline[name]['textSha256'])
 check(name+' section anchors retained',set(baseline[name]['anchors'])<=set(parser.ids))
check('Analytics configuration unchanged',(D/'site-config.js').read_text(encoding='utf-8')==baseline['config'])
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(D)))
threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('SAM_BROWSER_PATH') or ('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' if Path('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe').exists() else None),headless=True)
  context=browser.new_context(viewport={'width':1422,'height':1106},reduced_motion='reduce',permissions=['clipboard-read','clipboard-write'])
  page=context.new_page();page.on('pageerror',lambda e:results['errors'].append(str(e)));page.on('response',lambda r:results['failedResources'].append({'url':r.url,'status':r.status}) if r.status>=400 else None)
  page.goto(base,wait_until='networkidle');page.evaluate('document.fonts.ready')
  check('No analytics before consent',page.locator('#sam-yandex,#sam-mail').count()==0)
  page.locator('#cookieReject').click();check('Reject consent persists',page.evaluate("localStorage.getItem('sam.analytics.v1')")=='rejected')
  check('One main and one H1',page.locator('main').count()==1 and page.locator('h1').count()==1)
  check('Onest font loaded',page.evaluate("document.fonts.check('800 61px Onest')"))
  check('Three simple demo tabs',page.get_by_role('tab').count()==3 and page.locator('[data-stage]').count()==0)
  for width,height in [(320,800),(360,800),(390,844),(457,572),(768,1024),(1024,900),(1280,1000),(1422,1106),(1440,1120),(1600,1200)]:
   page.set_viewport_size({'width':width,'height':height});page.goto(base,wait_until='networkidle');page.evaluate('document.fonts.ready')
   for example in ['post','plan','audit']:
    page.locator('#tab-'+example).click()
    check(f'{width}px {example} no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    check(f'{width}px {example} correct selected tab',page.locator('#tab-'+example).get_attribute('aria-selected')=='true')
    check(f'{width}px {example} visible provenance',page.locator('.result-heading').inner_text().find('не ответ бота')>=0)
   page.locator('#tab-post').click();page.evaluate('scrollTo(0,0)')
   check(f'{width}px no broken images',page.evaluate('[...document.images].filter(i=>i.loading!=="lazy"&&i.hasAttribute("src")).every(i=>i.complete&&i.naturalWidth>0)'))
   results['viewports'].append({'width':width,'height':height,'documentHeight':page.evaluate('document.documentElement.scrollHeight')})
   if width==1422:page.screenshot(path=str(OUT/'hero-repro.png'))
   if width==1440:page.screenshot(path=str(OUT/'desktop.png'),full_page=True)
   if width==390:page.screenshot(path=str(OUT/'mobile.png'),full_page=True);page.screenshot(path=str(OUT/'mobile-first.png'))
  page.set_viewport_size({'width':1440,'height':1120});page.goto(base,wait_until='networkidle')
  page.locator('#tab-post').focus();page.keyboard.press('ArrowRight');check('Keyboard tabs change result',page.locator('#tab-plan').get_attribute('aria-selected')=='true')
  page.keyboard.press('End');check('End selects last tab',page.locator('#tab-audit').get_attribute('aria-selected')=='true')
  page.locator('#copy-prompt').click();check('Copy selected task',page.evaluate('navigator.clipboard.readText()').find('Помоги проверить')==0)
  page.evaluate("()=>{navigator.clipboard.writeText=()=>Promise.reject(new Error('denied'))}")
  page.locator('#copy-prompt').click();check('Clipboard failure recovery',page.locator('.copy-status').inner_text().find('Выделите')>=0)
  check('Clipboard fallback selects full request',page.evaluate('getSelection().toString()')==page.locator('#demo-prompt').inner_text())
  page.locator('[data-show-example="plan"]').click();check('Capability opens matching example',page.locator('#tab-plan').get_attribute('aria-selected')=='true')
  page.locator('.faq-item summary').first.click();check('FAQ opens',page.locator('.faq-item').first.get_attribute('open') is not None)
  page.locator('.interface-preview summary').click();page.locator('.screenshot-card').first.click();check('Real screenshot opens modal',page.locator('dialog').evaluate('e=>e.open'))
  page.keyboard.press('Escape');check('Modal closes and returns focus',page.locator('.screenshot-card').first.evaluate('e=>e===document.activeElement'))
  for name in ['privacy.html','offer.html']:
   for width in [390,1440]:
    page.set_viewport_size({'width':width,'height':1000});page.goto(base+name,wait_until='networkidle');check(f'{name} {width}px fits',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    if width==1440:page.screenshot(path=str(OUT/name.replace('.html','-desktop.png')),full_page=True)
  page.set_viewport_size({'width':390,'height':844});page.goto(base,wait_until='networkidle');page.locator('#navToggle').click();check('Mobile menu opens',page.locator('#navToggle').get_attribute('aria-expanded')=='true');page.screenshot(path=str(OUT/'menu.png'))
  page.keyboard.press('Escape');check('Escape closes menu',page.locator('#navToggle').get_attribute('aria-expanded')=='false')
  page.locator('.cookie-settings').click();page.locator('#cookieAccept').click();check('Local preview never sends analytics',page.locator('#sam-yandex,#sam-mail').count()==0)
  page.reload(wait_until='networkidle');check('Accepted consent remembered',not page.locator('#cookieBanner').is_visible())
  page.locator('.cookie-settings').click();page.locator('#cookieReject').click()
  for a in page.locator('.js-open-bot').all():check('Valid Telegram destination',a.get_attribute('href').startswith('https://t.me/smm_platform_sam_bot?start='))
  check('Reduced motion has no active animations',page.evaluate('document.getAnimations().filter(a=>a.playState==="running").length')==0)
  motion=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='no-preference');mp=motion.new_page();mp.add_init_script("localStorage.setItem('sam.analytics.v1','rejected')");mp.goto(base,wait_until='domcontentloaded');mp.wait_for_timeout(300);check('Authored entrance runs',mp.evaluate('document.getAnimations().length')>0);mp.wait_for_timeout(1000)
  mp.locator('#tab-plan').click();check('Tab change animates',mp.evaluate('document.getAnimations().some(a=>a.playState==="running")'))
  mp.emulate_media(reduced_motion='reduce');mp.wait_for_timeout(50);check('Live motion preference stops animation',mp.evaluate('document.getAnimations().filter(a=>a.playState==="running").length')==0)
  check('No script errors',not results['errors']);check('No failed local resources',not results['failedResources'])
  browser.close()
finally:
 server.shutdown();(OUT/'checks.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({'passed':sum(c['passed'] for c in results['checks']),'total':len(results['checks']),'errors':results['errors'],'failedResources':results['failedResources']},ensure_ascii=False))
