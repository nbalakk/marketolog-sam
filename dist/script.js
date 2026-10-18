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
const narrow = window.matchMedia('(max-width: 680px)');
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
post:{label:'Пост',prompt:'Анонс осеннего меню кофейни.\nДружелюбно, без рекламных клише.',draftTitle:'Осень — повод встретиться',draft:['Начать с повода: осеннее меню уже в кофейне.','Добавить детали: напиток, атмосфера, тёплый вкус.','Закончить простым приглашением без громких обещаний.']},
plan:{label:'Контент-план',prompt:'План на неделю для кофейни.\nПознакомить с меню и командой, вовлечь гостей.',draftTitle:'Чередуем продукт, людей и общение',draft:['Показать сезонный напиток и рассказать о его вкусе.','Познакомить с бариста и повседневной жизнью кофейни.','Задать гостям простой вопрос и пригласить на выходные.']},
audit:{label:'Разбор страницы',prompt:'Разбор страницы кофейни.\nПонятно ли новым гостям, что у нас есть и как нас найти?',draftTitle:'Смотрим глазами нового гостя',draft:['Понятна ли кофейня из описания профиля?','Есть ли адрес, часы работы и актуальное меню?','Что в публикациях помогает человеку решить, стоит ли зайти?']}
};
const panel=document.getElementById('demo-panel'),output=document.getElementById('demo-output');
const tabs=[...document.querySelectorAll('[data-example]')];let example='post',stage=2;
const initialPost=output?.innerHTML;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(announce=true,direction=1) {
 if(!panel||!output)return;
 const model=examples[example];
 tabs.forEach(t=>{const selected=t.dataset.example===example;t.setAttribute('aria-selected',String(selected));t.tabIndex=selected?0:-1;});
 panel.setAttribute('aria-labelledby','tab-'+example);
 document.getElementById('demo-prompt').textContent=model.prompt;
 document.getElementById('stage-title').textContent=['Уточняем задачу','Вариант структуры','Пример результата'][stage];
 document.querySelectorAll('[data-stage]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.stage)===stage)));
 output.classList.toggle('single',stage!==2||example!=='post');
 if(stage===0) output.innerHTML='<div><h3 class="draft-heading">Чем точнее запрос,<br>тем полезнее материал.</h3><ul class="draft-list"><li><b>01</b><span>Что за бизнес и для кого вы пишете?</span></li><li><b>02</b><span>Какую задачу должен решить материал?</span></li><li><b>03</b><span>Какие факты, тон и формат важно учесть?</span></li></ul><p class="draft-note">'+esc(model.prompt)+'</p></div>';
 else if(stage===1) output.innerHTML='<div><h3 class="draft-heading">'+esc(model.draftTitle)+'</h3><ul class="draft-list">'+model.draft.map((s,i)=>'<li><b>0'+(i+1)+'</b><span>'+esc(s)+'</span></li>').join('')+'</ul><p class="draft-note">Черновик — отправная точка. Детали бизнеса и финальный голос добавляете вы.</p></div>';
 else if(example==='post')output.innerHTML=initialPost;
 else if(example==='plan')output.innerHTML='<div><h3 class="draft-heading">Неделя в вашей кофейне</h3><table class="plan-table"><thead><tr><th>День</th><th>Тема и формат</th></tr></thead><tbody><tr><td>Пн</td><td>Осенний напиток: фото и история вкуса</td></tr><tr><td>Вт</td><td>Знакомство с бариста: короткое интервью</td></tr><tr><td>Ср</td><td>Любимый десерт гостей: опрос</td></tr><tr><td>Чт</td><td>Как готовим кофе: небольшой процесс</td></tr><tr><td>Пт</td><td>Идея для выходных: приглашение зайти</td></tr></tbody></table><p class="fine-print">Редакционный пример. Адаптируйте темы под своё меню.</p></div>';
 else output.innerHTML='<div><h3 class="draft-heading">Что проверить в первую очередь</h3><ul class="audit-list"><li><span class="audit-tag">01</span><div><strong>Описание профиля</strong><p>Новый гость должен быстро понять, где вы находитесь и чем интересна кофейня.</p></div></li><li><span class="audit-tag">02</span><div><strong>Меню и контакты</strong><p>Проверьте, что адрес, часы работы и актуальное меню легко найти.</p></div></li><li><span class="audit-tag">03</span><div><strong>Следующий шаг</strong><p>Подскажите, как забронировать стол, задать вопрос или проложить маршрут.</p></div></li></ul><p class="fine-print">Образец структуры разбора, не аудит реального бизнеса.</p></div>';
 if(announce)animateElement(output,[{opacity:0,transform:'translateX('+direction*18+'px)'},{opacity:1,transform:'translateX(0)'}],{duration:380});
 if(announce){document.getElementById('demo-status').textContent=model.label+': '+['Задача','Черновик','Ваш материал'][stage];track('demo_interaction',{example,stage});}
}
tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>{const direction=tabs.findIndex(t=>t.dataset.example===example)<=i?1:-1;example=tab.dataset.example;stage=2;render(true,direction);});tab.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;if(e.key==='ArrowLeft')next=(i-1+tabs.length)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();tabs[next].focus();tabs[next].click();}});});
document.querySelectorAll('[data-stage]').forEach(button=>button.addEventListener('click',()=>{stage=Number(button.dataset.stage);render();}));
document.getElementById('demo-next')?.addEventListener('click',()=>{stage=(stage+1)%3;render();});
document.getElementById('demo-prev')?.addEventListener('click',()=>{stage=(stage+2)%3;render(true,-1);});
document.querySelectorAll('[data-show-example]').forEach(button=>button.addEventListener('click',()=>{example=button.dataset.showExample;stage=2;render();document.getElementById('examples').scrollIntoView({block:'start',behavior:reduced.matches?'auto':'smooth'});tabs.find(t=>t.dataset.example===example).focus({preventScroll:true});}));
let touchX,touchY;
panel?.addEventListener('touchstart',e=>{touchX=e.changedTouches[0].clientX;touchY=e.changedTouches[0].clientY;},{passive:true});
panel?.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-touchX,dy=e.changedTouches[0].clientY-touchY;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.5){stage=(stage+(dx<0?1:2))%3;render(true,dx<0?1:-1);}},{passive:true});
if(panel)render(false);
document.getElementById('copy-prompt')?.addEventListener('click',async()=>{const text='Напиши пост для кофейни про осенний пряный латте. Аудитория — гости по утрам, цель — пригласить зайти. Тёплый дружелюбный тон. Без скидок и выдуманных фактов.';const status=document.querySelector('.copy-status');try{await navigator.clipboard.writeText(text);status.textContent='Готово. Вставьте запрос в чат с Сэмом.';}catch{status.textContent='Скопируйте текст: '+text;}});

// Entrance choreography is an enhancement; static content remains available.
function revealHero() {
 document.querySelectorAll('.hero-copy > *').forEach((element,index) => {
  animateElement(element,[{opacity:0,transform:'translateY(22px)'},{opacity:1,transform:'translateY(0)'}],{duration:640,delay:index*65,fill:'backwards'});
 });
 animateElement(document.querySelector('.hero .demo'),[{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'translateY(0)'}],{duration:760,delay:160,fill:'backwards'});
}
if (!reduced.matches) {
 (document.fonts?.ready || Promise.resolve()).then(() => requestAnimationFrame(revealHero));
}
if ('IntersectionObserver' in window) {
 const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
   if (!entry.isIntersecting) return;
   const element=entry.target;
   const siblings=[...element.parentElement.children].filter(node=>node.matches('.tool,.how-grid>li'));
   const stagger=Math.max(0,siblings.indexOf(element))*90;
   animateElement(element,[{opacity:0,transform:'translateY(28px)'},{opacity:1,transform:'translateY(0)'}],{duration:660,delay:stagger,fill:'backwards'});
   observer.unobserve(element);
  });
 },{threshold:.12});
 document.querySelectorAll('.section-heading,.tools .section-title,.tool,.how-grid>li,.pricing-intro,.terms-panel,.faq-grid>.section-title,.final-inner').forEach(element=>observer.observe(element));
}

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
