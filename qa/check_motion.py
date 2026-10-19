from pathlib import Path
import os,sys,threading,http.server,functools,json,hashlib
if os.environ.get('SAM_DEV_TOOLS'):sys.path.insert(0,os.environ['SAM_DEV_TOOLS'])
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1] if Path(__file__).parent.name=='qa' else Path('C:/Users/user/Documents/mine/private/Site marketolog-sam_personal project/marketolog-sam')
OUT=ROOT/'qa/screenshots/motion';OUT.mkdir(parents=True,exist_ok=True)
result={'checks':[],'errors':[]}
def check(name,okay):
 result['checks'].append({'name':name,'passed':bool(okay)})
 if not okay:raise AssertionError(name)
for asset in json.loads((ROOT/'qa/fixtures/motion-assets.json').read_text(encoding='utf-8'))['files']:
 check('Unchanged user export: '+asset['file'],hashlib.sha256((ROOT/asset['file']).read_bytes()).hexdigest()==asset['sha256'])
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/frontend-design/'
def media_requests(page,requests):page.on('request',lambda r:requests.append(r.url) if '/motion/sam-' in r.url else None)
def load(page):page.goto(base,wait_until='networkidle');page.evaluate('document.fonts.ready')
def wait_playing(page):page.wait_for_function("(()=>{const v=document.getElementById('sam-motion');return !v.paused&&v.readyState>=2&&v.videoWidth>0})()")
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path=os.environ.get('SAM_BROWSER_PATH') or 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless=True)
  for width,height,name in [(1440,1120,'desktop'),(390,844,'mobile')]:
   context=b.new_context(viewport={'width':width,'height':height},reduced_motion='no-preference');page=context.new_page();requests=[];media_requests(page,requests);page.on('pageerror',lambda e:result['errors'].append(str(e)))
   load(page);wait_playing(page)
   check(name+' actual video decoded',page.locator('#sam-motion').evaluate('v=>v.videoWidth')==(1920 if name=='desktop' else 1080))
   check(name+' 15 second duration',abs(page.locator('#sam-motion').evaluate('v=>v.duration')-15)<.1)
   check(name+' silent inline playback',page.locator('#sam-motion').evaluate('v=>v.muted&&v.playsInline'))
   check(name+' no opposite video loaded',requests and all('sam-'+name+'.' in u for u in requests))
   check(name+' source aspect preserved',page.locator('#sam-motion').evaluate('v=>Math.abs(v.clientWidth/v.clientHeight-v.videoWidth/v.videoHeight)<.005'))
   page.evaluate("document.getElementById('sam-motion').currentTime=7.5")
   page.wait_for_function("Math.abs(document.getElementById('sam-motion').currentTime-7.5)<1 && !document.getElementById('sam-motion').seeking")
   page.locator('#motion-control').click();check(name+' user can pause',page.locator('#sam-motion').evaluate('v=>v.paused'))
   page.screenshot(path=str(OUT/f'{name}-film.png'))
   page.evaluate('scrollTo(0,document.documentElement.scrollHeight)');page.wait_for_timeout(150);page.evaluate('scrollTo(0,0)');page.wait_for_timeout(150)
   check(name+' manual pause persists after scroll',page.locator('#sam-motion').evaluate('v=>v.paused'))
   page.locator('#motion-control').click();wait_playing(page)
   page.evaluate('scrollTo(0,document.documentElement.scrollHeight)');page.wait_for_function("document.getElementById('sam-motion').paused")
   check(name+' pauses outside viewport',page.locator('#sam-motion').evaluate('v=>v.paused'))
   page.evaluate('scrollTo(0,0)');wait_playing(page)
   page.emulate_media(reduced_motion='reduce');page.wait_for_function("document.getElementById('sam-motion').paused")
   check(name+' live reduced motion stops film',page.locator('#sam-motion').evaluate('v=>v.paused') and 'has-video' not in page.locator('#motion-frame').get_attribute('class'))
   page.locator('#motion-control').click();wait_playing(page)
   check(name+' explicit play allowed with reduced motion',not page.locator('#sam-motion').evaluate('v=>v.paused'))
   page.evaluate("document.getElementById('sam-motion').currentTime=14.8")
   page.wait_for_function("document.getElementById('motion-control').dataset.state==='ended'")
   check(name+' once only with stable poster at end',page.locator('#sam-motion').evaluate('v=>v.paused&&!v.loop') and 'has-video' not in page.locator('#motion-frame').get_attribute('class'))
   page.locator('#motion-control').click();wait_playing(page);check(name+' replay restarts',page.locator('#sam-motion').evaluate('v=>v.currentTime<2'))
   context.close()
  # No video fetch until a deliberate action when movement is reduced.
  c=b.new_context(viewport={'width':390,'height':844},reduced_motion='reduce');page=c.new_page();requests=[];media_requests(page,requests);load(page)
  check('Reduced motion loads no video bytes',not requests and page.locator('#sam-motion source').count()==0)
  check('Mobile Telegram action visible before playing',page.locator('.mobile-header-action').is_visible() and page.locator('.mobile-header-action').bounding_box()['y']<844)
  page.screenshot(path=str(OUT/'mobile-poster.png'));page.locator('.motion-transcript summary').click();check('Accessible written story opens',page.locator('.motion-transcript').get_attribute('open') is not None)
  page.set_viewport_size({'width':1440,'height':1120});page.evaluate('scrollTo(0,0)');page.wait_for_function("document.getElementById('motion-frame').dataset.format==='desktop'")
  check('Resize under reduced motion still avoids media downloads',not requests)
  page.screenshot(path=str(OUT/'desktop-poster.png'));page.locator('#motion-control').click();wait_playing(page);check('Resize chooses new requested format',all('sam-desktop.' in u for u in requests));c.close()
  # H264 path: native playback is still real, only the advertised WebM capability is removed.
  c=b.new_context(viewport={'width':1440,'height':1120});c.add_init_script("const original=HTMLMediaElement.prototype.canPlayType;HTMLMediaElement.prototype.canPlayType=function(t){return t.includes('webm')?'':original.call(this,t)}")
  page=c.new_page();requests=[];media_requests(page,requests);load(page);wait_playing(page)
  check('H264 fallback actually decodes',page.locator('#sam-motion').evaluate("v=>v.currentSrc.endsWith('.mp4')&&v.videoWidth===1920"))
  check('H264 fallback never requests unsupported WebM',all('.mp4' in u for u in requests));c.close()
  c=b.new_context();c.add_init_script("Object.defineProperty(navigator,'connection',{value:{saveData:true,addEventListener(){}}})");page=c.new_page();requests=[];media_requests(page,requests);load(page)
  check('Data saving avoids auto download',not requests);page.locator('#motion-control').click();wait_playing(page);check('Data saving permits intentional play',bool(requests));c.close()
  c=b.new_context();c.add_init_script("const play=HTMLMediaElement.prototype.play;window.blockedPlays=0;HTMLMediaElement.prototype.play=function(){if(!window.blockedPlays++){return Promise.reject(new DOMException('Blocked','NotAllowedError'))}return play.call(this)}")
  page=c.new_page();load(page);page.wait_for_function('window.blockedPlays>0');page.wait_for_function("document.getElementById('motion-control').dataset.state==='paused'")
  check('Blocked autoplay leaves working play control',page.locator('#motion-control').is_visible());page.locator('#motion-control').click();wait_playing(page);check('Gesture recovers blocked autoplay',not page.locator('#sam-motion').evaluate('v=>v.paused'));c.close()
  c=b.new_context();page=c.new_page();page.route('**/motion/sam-*',lambda route:route.abort());load(page);page.locator('#motion-error').wait_for(state='visible')
  check('Failed video leaves poster and direct link',page.locator('#motion-error').is_visible() and 'has-video' not in page.locator('#motion-frame').get_attribute('class') and page.locator('#motion-direct-link').get_attribute('href').endswith('.mp4'));c.close()
  c=b.new_context(java_script_enabled=False,viewport={'width':390,'height':844});page=c.new_page();page.goto(base,wait_until='networkidle')
  check('Without JS poster and real Telegram action remain',page.locator('.motion-poster img').is_visible() and page.locator('.mobile-header-action').is_visible() and not page.locator('#motion-control').is_visible());c.close()
  check('No video-player script errors',not result['errors']);b.close()
finally:
 server.shutdown();(OUT/'checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'passed':sum(c['passed'] for c in result['checks']),'total':len(result['checks']),'errors':result['errors']}))
