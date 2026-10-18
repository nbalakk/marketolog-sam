(() => {
  'use strict';
  const config = window.SAM_CONFIG || {};
  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('primaryNav');
  const mobile = window.matchMedia('(max-width: 860px)');
  if (nav && toggle) nav.inert = mobile.matches;
  function closeMenu(returnFocus = false) {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Открыть меню');
    nav.classList.remove('is-open');
    nav.inert = mobile.matches;
    if (returnFocus) toggle.focus();
  }
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    nav.classList.toggle('is-open', open);
    nav.inert = mobile.matches && !open;
  });
  document.addEventListener('click', e => {
    if (toggle?.getAttribute('aria-expanded') === 'true' && !e.target.closest('.site-header')) closeMenu();
  });
  nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => closeMenu()));
  mobile.addEventListener('change', () => closeMenu());
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenu(toggle?.getAttribute('aria-expanded') === 'true');
  });
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', () => {
    const target = document.getElementById(a.hash.slice(1));
    if (!target) return;
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }));

  const dialog = document.getElementById('image-dialog');
  const image = document.getElementById('dialog-image');
  const caption = document.getElementById('image-caption');
  let previousFocus;
  document.querySelectorAll('.screenshot-card').forEach(button => button.addEventListener('click', () => {
    previousFocus = button;
    image.src = button.dataset.fullImage;
    image.alt = button.dataset.imageAlt;
    caption.textContent = image.alt;
    dialog.showModal();
    document.body.classList.add('modal-open');
    track('example_open', { example: button.dataset.fullImage });
  }));
  dialog?.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog?.addEventListener('keydown', e => {
    if (e.key === 'Tab') { e.preventDefault(); dialog.querySelector('.dialog-close').focus(); }
  });
  dialog?.addEventListener('click', e => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
  });
  dialog?.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    image.removeAttribute('src');
    previousFocus?.focus({ preventScroll: true });
  });
  document.querySelectorAll('.copy-prompt').forEach(button => button.addEventListener('click', async () => {
    const status = button.parentElement.querySelector('.copy-status');
    try { await navigator.clipboard.writeText(button.dataset.prompt); status.textContent = 'Запрос скопирован. Вставьте его в чат с Сэмом.'; }
    catch { status.textContent = 'Не удалось скопировать автоматически. Выделите и скопируйте текст запроса ниже.'; const text = document.createElement('p'); text.textContent = button.dataset.prompt; status.replaceChildren(document.createTextNode(status.textContent), text); }
  }));

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
