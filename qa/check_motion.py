from pathlib import Path
import os,sys,json,threading,http.server,functools
if os.environ.get('SAM_DEV_TOOLS'):sys.path.insert(0,os.environ['SAM_DEV_TOOLS'])
from playwright.sync_api import sync_playwright
ROOT=Path(os.environ['SAM_PROJECT']) if os.environ.get('SAM_PROJECT') else Path(__file__).resolve().parents[1]
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/'
checks=[];errors=[]
def check(label,condition):
 checks.append({'name':label,'passed':bool(condition)})
 assert condition,label
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('SAM_BROWSER_PATH') or None,headless=True)
  for width in [390,1374]:
   context=browser.new_context(viewport={'width':width,'height':900},reduced_motion='no-preference');page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(base,wait_until='domcontentloaded');page.evaluate('document.fonts.ready')
   page.wait_for_function('document.querySelector(".hero .demo").getAnimations().length>0')
   check(f'Hero introduction {width}',page.locator('.hero .demo').evaluate('(e)=>e.getAnimations()[0].effect.getTiming().duration')==760)
   page.wait_for_function('!document.querySelector(".hero .demo").getAnimations().some(a=>a.playState==="running")')
   check(f'Hero settles without inline hiding {width}',page.locator('.hero h1').evaluate('(e)=>getComputedStyle(e).opacity')=='1')
   page.locator('#tab-plan').click()
   check(f'Slide duration {width}',page.locator('#demo-output').evaluate('(e)=>e.getAnimations()[0].effect.getTiming().duration')==380)
   page.locator('#demo-prev').click()
   check(f'Previous slide moves from left {width}',page.locator('#demo-output').evaluate('(e)=>e.getAnimations()[0].effect.getKeyframes()[0].transform')=='translateX(-18px)')
   page.evaluate('for(let i=0;i<8;i++)document.querySelector("#demo-next").click()')
   check(f'Rapid slides replace prior animation {width}',page.locator('#demo-output').evaluate('(e)=>e.getAnimations().length')==1)
   page.wait_for_function('document.querySelector("#demo-output").getAnimations().length===0')
   check(f'Slides settle {width}',page.locator('#demo-output').evaluate('(e)=>getComputedStyle(e).transform')=='none')
   page.evaluate('document.querySelector("#pricing").scrollIntoView({behavior:"instant"})')
   page.wait_for_function('document.querySelector(".pricing-intro").getAnimations().length>0')
   check(f'Scroll reveal {width}',page.locator('.pricing-intro').evaluate('(e)=>e.getAnimations()[0].effect.getTiming().duration')==660)
   summary=page.locator('.faq-item summary').first;summary.scroll_into_view_if_needed();summary.click()
   check(f'FAQ expands with animation {width}',page.locator('.faq-item').first.evaluate('(e)=>e.open&&e.getAnimations().length===1'))
   page.wait_for_function('document.querySelector(".faq-item").style.overflow===""')
   summary.click();page.wait_for_function('!document.querySelector(".faq-item").open')
   check(f'FAQ collapses cleanly {width}',page.locator('.faq-item').first.evaluate('(e)=>e.style.height===""&&e.style.overflow===""'))
   page.evaluate('const s=document.querySelector(".faq-item summary");s.click();s.click();s.click()')
   page.wait_for_function('document.querySelector(".faq-item").style.overflow===""')
   check(f'Rapid FAQ toggles keep intended state {width}',page.locator('.faq-item').first.evaluate('(e)=>e.open'))
   page.locator('#tab-post').click();page.emulate_media(reduced_motion='reduce')
   page.wait_for_function('document.getAnimations().every(a=>a.playState!=="running")')
   check(f'Changing reduced motion stops running animation {width}',page.locator('#demo-output').evaluate('(e)=>e.getAnimations().every(a=>a.playState!=="running")'))
   page.locator('#tab-plan').click();check(f'Reduced motion skips new transitions {width}',page.locator('#demo-output').evaluate('(e)=>e.getAnimations().length')==0)
   check(f'Yellow is updated {width}',page.locator('.hero').evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgb(255, 220, 87)')
   check(f'No sideways overflow {width}',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   context.close()
  browser.close()
 check('No browser errors',not errors)
finally:
 server.shutdown();(ROOT/'qa/motion-results.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2),encoding='utf-8');print(json.dumps({'checks':len(checks),'failed':[x for x in checks if not x['passed']],'errors':errors}))
