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
def check(name,condition):
 checks.append({'name':name,'passed':bool(condition)});assert condition,name
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('SAM_BROWSER_PATH') or None,headless=True)
  context=browser.new_context(viewport={'width':1374,'height':1145},reduced_motion='reduce');page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  for width in [320,360,390,457,768,1024,1374,1440]:
   page.set_viewport_size({'width':width,'height':1145});page.goto(base,wait_until='networkidle');page.evaluate('document.fonts.ready')
   check(f'Local handwritten Cyrillic font loaded {width}',page.evaluate('document.fonts.check("500 26px Caveat", "Была только мысль")'))
   check(f'Pen assets load {width}',page.locator('.editor-underline,.thought-note img').evaluate_all('(els)=>els.every(e=>e.complete&&e.naturalWidth>0)'))
   check(f'Prompt note stays clear of task label {width}',page.evaluate('document.querySelector(".thought-note").getBoundingClientRect().left>document.querySelector(".field-label").getBoundingClientRect().left+55'))
   for name in ['post','plan','audit']:
    page.locator(f'#tab-{name}').click()
    for stage,label in enumerate(['Сначала — ваша мысль','Намечаем главное','Теперь есть с чем работать']):
     page.locator(f'[data-stage="{stage}"]').click()
     check(f'Annotation follows selected stage {width}/{name}/{stage}',page.locator('#editor-result-note').inner_text()==label)
     check(f'Note clears result content {width}/{name}/{stage}',page.evaluate('document.querySelector("#editor-result-note").getBoundingClientRect().top>=document.querySelector("#demo-output").getBoundingClientRect().bottom+2'))
   page.locator('#tab-post').click();page.locator('[data-stage="1"]').click()
   check(f'Draft contains real semantic editing {width}',page.locator('.edit-sample del').count()==1 and page.locator('.edit-sample ins mark').count()==1)
   if width in [390,1374]:page.locator('#demo-output').screenshot(path=str(ROOT/f'qa/screenshots/editorial-draft-{width}.png'))
  motion=browser.new_context(viewport={'width':1374,'height':1145},reduced_motion='no-preference');mp=motion.new_page();mp.goto(base,wait_until='domcontentloaded');mp.evaluate('document.fonts.ready')
  mp.wait_for_function('document.querySelector(".editor-underline").getAnimations().length>0')
  check('Underline is progressively drawn',mp.locator('.editor-underline').evaluate('(e)=>e.getAnimations()[0].effect.getKeyframes()[0].clipPath.includes("100%")'))
  mp.locator('#tab-post').click();mp.locator('[data-stage="1"]').click();check('Draft corrections have staggered transitions',mp.locator('.edit-sample').evaluate('(e)=>e.getAnimations({subtree:true}).length')>=3)
  browser.close()
 check('No browser errors',not errors)
finally:
 server.shutdown();(ROOT/'qa/editorial-results.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2),encoding='utf-8');print(json.dumps({'checks':len(checks),'failed':[c for c in checks if not c['passed']],'errors':errors}))
