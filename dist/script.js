(() => {
'use strict';
const config = window.SAM_CONFIG || {};
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const motionByElement = new WeakMap();
function animateElement(element, frames, options = {}) {
 if (!element || reduced.matches || !element.animate) return null;
 motionByElement.get(element)?.cancel();
 const animation = element.animate(frames, {duration: 560, easing: 'cubic-bezier(.2,.75,.2,1)', ...options});
 motionByElement.set(element, animation);
 return animation;
}
reduced.addEventListener('change', () => {
 if (reduced.matches) document.getAnimations().forEach(animation => animation.finish());
});
const toggle = document.getElementById('navToggle');
const nav = document.getElementById('primaryNav');
const narrow = window.matchMedia('(max-width: 760px)');
function closeMenu(focus=false) { if (!toggle || !nav) return; toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Открыть меню');nav.classList.remove('is-open');nav.inert=narrow.matches;if(focus)toggle.focus(); }
if (toggle && nav) { nav.inert=narrow.matches;toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');nav.classList.toggle('is-open',open);nav.inert=narrow.matches&&!open;if(open)animateElement(nav,[{opacity:0,transform:'translateY(-12px)'},{opacity:1,transform:'translateY(0)'}],{duration:320});}); nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>closeMenu()));narrow.addEventListener('change',()=>closeMenu()); }
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu(toggle?.getAttribute('aria-expanded')==='true');});
document.addEventListener('click',e=>{if(toggle?.getAttribute('aria-expanded')==='true'&&!e.target.closest('.header'))closeMenu();});
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',()=>{const target=document.getElementById(a.hash.slice(1));if(target){target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}}));

const dialog=document.getElementById('image-dialog'),dialogImage=document.getElementById('dialog-image');let lastFocus;
document.querySelectorAll('.screenshot-card').forEach(button=>button.addEventListener('click',()=>{lastFocus=button;dialogImage.src=button.dataset.fullImage;dialogImage.alt=button.dataset.imageAlt;document.getElementById('image-caption').textContent=dialogImage.alt;dialog.showModal();document.body.classList.add('modal-open');track('example_open',{example:button.dataset.fullImage});}));
dialog?.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
dialog?.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();dialog.querySelector('.dialog-close').focus();}});
dialog?.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
dialog?.addEventListener('close',()=>{document.body.classList.remove('modal-open');dialogImage.removeAttribute('src');lastFocus?.focus({preventScroll:true});});


const examples={
 post:{label:'Пост',prompt:'У меня небольшой бренд керамики. Нужно придумать пост для Telegram о новой коллекции кружек. Аудитория — люди, которые ценят уют в доме и ручную работу. Тон — тёплый и искренний.'},
 plan:{label:'Контент-план',prompt:'Составь контент-план на неделю для небольшого бренда керамики. Цель — познакомить подписчиков с коллекцией кружек, показать ручную работу и начать разговор. Формат — Telegram. Без выдуманных скидок и фактов.'},
 audit:{label:'Разбор',prompt:'Помоги проверить страницу бренда керамики перед запуском новой коллекции. В описании сейчас только «Керамика ручной работы». Какие сведения стоит добавить, чтобы посетитель понял, что можно купить и как оформить заказ?'}
};
const panel=document.getElementById('demo-panel'),output=document.getElementById('demo-output');
const tabs=[...document.querySelectorAll('[data-example]')];let example='post';const initialPost=output?.innerHTML;
const contents={
 plan:'<h3>Неделя вокруг новой коллекции</h3><table class="plan-table"><thead><tr><th>День</th><th>Тема и формат</th></tr></thead><tbody><tr><td>Пн</td><td>Знакомство с коллекцией: пост и детали кружек</td></tr><tr><td>Вт</td><td>Работа мастера: короткое видео процесса</td></tr><tr><td>Ср</td><td>Вопрос подписчикам: какая форма ближе?</td></tr><tr><td>Чт</td><td>Уход за керамикой: памятка на основе ваших рекомендаций</td></tr><tr><td>Пт</td><td>Как выбрать и заказать: понятная инструкция</td></tr></tbody></table>',
 audit:'<h3>Что уточнить в описании страницы</h3><ul class="audit-list"><li><strong>Что именно можно купить</strong><p>«Керамика ручной работы» не называет изделия. Добавьте кружки и другие позиции, которые есть в ассортименте.</p></li><li><strong>Как оформить заказ</strong><p>Укажите рабочую ссылку на каталог или контакт для заказа.</p></li><li><strong>Куда возможна доставка</strong><p>Добавьте реальные города и условия. Утверждения о сроках и наличии сначала проверьте.</p></li></ul>'
};
function render(announce=true){if(!panel||!output)return;const model=examples[example];tabs.forEach(t=>{const selected=t.dataset.example===example;t.setAttribute('aria-selected',String(selected));t.tabIndex=selected?0:-1});panel.setAttribute('aria-labelledby','tab-'+example);document.getElementById('demo-prompt').textContent=model.prompt;output.innerHTML=example==='post'?initialPost:contents[example];document.querySelector('.copy-status').textContent='';if(announce){animateElement(output,[{opacity:.65,filter:'blur(2px)',transform:'translateY(6px)'},{opacity:1,filter:'blur(0)',transform:'translateY(0)'}],{duration:300});document.getElementById('demo-status').textContent=model.label+': редакционный пример';track('demo_interaction',{example})}}
tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>{example=tab.dataset.example;render()});tab.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();tabs[next].focus();tabs[next].click()}})});
document.querySelectorAll('[data-show-example]').forEach(button=>button.addEventListener('click',()=>{example=button.dataset.showExample;render();document.getElementById('examples').scrollIntoView({block:'start',behavior:reduced.matches?'auto':'smooth'});tabs.find(t=>t.dataset.example===example).focus({preventScroll:true})}));
document.getElementById('copy-prompt')?.addEventListener('click',async()=>{const text=examples[example].prompt;const status=document.querySelector('.copy-status');try{await navigator.clipboard.writeText(text);status.textContent='Скопировано. Вставьте запрос в чат с Сэмом.'}catch{status.textContent='Не удалось скопировать автоматически. Выделите текст запроса выше и скопируйте его.';const range=document.createRange();range.selectNodeContents(document.getElementById('demo-prompt'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range)}});
// The light field opens into a readable working surface once. Content starts visible.
if(!reduced.matches){(document.fonts?.ready||Promise.resolve()).then(()=>requestAnimationFrame(()=>{animateElement(document.querySelector('.hero-copy'),[{opacity:.7,filter:'blur(2px)'},{opacity:1,filter:'blur(0)'}],{duration:680});animateElement(document.querySelector('.demo'),[{opacity:.75,clipPath:'inset(0 0 8% 0 round 14px)'},{opacity:1,clipPath:'inset(0 0 0% 0 round 14px)'}],{duration:720})}))}
// Animate the real details element so native links and keyboard behavior remain intact.
const detailsTargets = new WeakMap();
document.querySelectorAll('.faq-item').forEach(details => {
 details.querySelector('summary').addEventListener('click',event => {
  if (reduced.matches || !details.animate) return;
  event.preventDefault();
  const opening=!(detailsTargets.get(details) ?? details.open);
  detailsTargets.set(details,opening);
  const from=details.getBoundingClientRect().height;
  motionByElement.get(details)?.cancel();
  details.style.height='';
  details.open=true;
  const to=opening?details.getBoundingClientRect().height:details.querySelector('summary').getBoundingClientRect().height+1;
  details.style.overflow='hidden';
  const animation=animateElement(details,[{height:from+'px'},{height:to+'px'}],{duration:320});
  if (!animation) {details.open=opening;details.style.overflow='';return;}
  animation.finished.then(() => {
   if (motionByElement.get(details)!==animation) return;
   details.open=opening;
   details.style.overflow='';
   detailsTargets.delete(details);
  }).catch(()=>{});
 });
});
  // Public prices appear only after the owner supplies and verifies the terms.
  const pricing = config.pricing;
  if (pricing?.verified && pricing.freeDescription && pricing.renewalDescription && pricing.plans?.length && pricing.plans.every(p => p.name && p.price && p.period && p.limits)) {
    const container = document.getElementById('pricing-content');
    if (container) {
      container.replaceChildren();
      for (const plan of [{ name: 'Бесплатный старт', price: '0 ₽', period: '', limits: pricing.freeDescription }, ...pricing.plans]) {
        const card = document.createElement('article'); card.className = 'pricing-plan';
        for (const [tag, text] of [['h3', plan.name], ['p', [plan.price, plan.period].filter(Boolean).join(' / ')], ['p', plan.limits]]) { const el = document.createElement(tag); el.textContent = text; card.append(el); }
        container.append(card);
      }
      const terms = document.createElement('p'); terms.textContent = pricing.renewalDescription; terms.style.gridColumn = '1/-1'; container.append(terms);
    }
  }

  const CONSENT_KEY = 'sam.analytics.v1';
  const banner = document.getElementById('cookieBanner');
  let consent = null;
  let analyticsLoaded = false;
  const allowedHost = (config.analyticsHosts || []).includes(location.hostname);
  try { consent = localStorage.getItem(CONSENT_KEY); } catch {}
  function track(goal, params = {}) {
    if (consent !== 'accepted' || !allowedHost) return;
    if (typeof window.ym === 'function') window.ym(config.yandexCounter, 'reachGoal', goal, params);
  }
  function loadAnalytics() {
    if (analyticsLoaded || !allowedHost || consent !== 'accepted') return;
    analyticsLoaded = true;
    window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
    window.ym.l = Date.now();
    const script = document.createElement('script'); script.src = 'https://mc.yandex.ru/metrika/tag.js'; script.async = true; script.id = 'sam-yandex'; document.head.append(script);
    window.ym(config.yandexCounter, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
    window._tmr = window._tmr || []; window._tmr.push({ id: config.mailCounter, type: 'pageView', start: Date.now() });
    const mail = document.createElement('script'); mail.src = 'https://top-fwz1.mail.ru/js/code.js'; mail.async = true; mail.id = 'sam-mail'; document.head.append(mail);
  }
  function choose(value) {
    const wasAccepted = consent === 'accepted';
    consent = value;
    try { localStorage.setItem(CONSENT_KEY, value); } catch {}
    banner.hidden = true;
    if (value === 'accepted') loadAnalytics();
    else if (wasAccepted && analyticsLoaded) location.reload();
  }
  document.getElementById('cookieAccept')?.addEventListener('click', () => choose('accepted'));
  document.getElementById('cookieReject')?.addEventListener('click', () => choose('rejected'));
  document.querySelectorAll('.cookie-settings').forEach(button => button.addEventListener('click', () => { banner.hidden = false; banner.scrollIntoView({ block: 'center', behavior: 'auto' }); document.getElementById('cookieReject').focus({ preventScroll: true }); }));
  if (banner) {
    if (consent === 'accepted') loadAnalytics();
    else if (consent !== 'rejected') banner.hidden = false;
  }
  document.querySelectorAll('.js-open-bot').forEach(a => a.addEventListener('click', () => track('telegram_click', { placement: a.dataset.placement || 'unknown' })));
  const observed = document.getElementById('pricing');
  if (observed && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { if (consent === 'accepted') { track('pricing_view'); observer.disconnect(); } } }, { threshold: 0.25 });
    observer.observe(observed);
  }

})();
