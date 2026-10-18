/* ==========================================================================
   ИИ-Помощник — Landing Page Scripts
   Без внешних зависимостей. Все обращения к DOM защищены проверками.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Утилита: медиа-запрос prefers-reduced-motion                        */
  /* ------------------------------------------------------------------ */
  var prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ */
  /* 1. Мобильное меню                                                   */
  /* ------------------------------------------------------------------ */
  function initMobileMenu() {
    var navToggle = document.getElementById('navToggle');
    var primaryNav = document.getElementById('primaryNav');

    if (!navToggle || !primaryNav) {
      return;
    }

    function closeMenu() {
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Открыть меню');
      primaryNav.classList.remove('is-open');
    }

    function openMenu() {
      navToggle.setAttribute('aria-expanded', 'true');
      navToggle.setAttribute('aria-label', 'Закрыть меню');
      primaryNav.classList.add('is-open');
    }

    navToggle.addEventListener('click', function () {
      var isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    var navLinks = primaryNav.querySelectorAll('a');
    navLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        closeMenu();
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeMenu();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 860) {
        closeMenu();
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* 2. Плавная прокрутка к разделам (якорные ссылки)                    */
  /* ------------------------------------------------------------------ */
  function initSmoothScroll() {
    var anchorLinks = document.querySelectorAll('a[href^="#"]');

    if (!anchorLinks || anchorLinks.length === 0) {
      return;
    }

    anchorLinks.forEach(function (link) {
      link.addEventListener('click', function (event) {
        var href = link.getAttribute('href');

        if (!href || href === '#' || href.length < 2) {
          return;
        }

        var targetId = href.slice(1);
        var targetEl = document.getElementById(targetId);

        if (!targetEl) {
          return;
        }

        event.preventDefault();

        targetEl.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'start'
        });

        if (typeof targetEl.focus === 'function') {
          targetEl.setAttribute('tabindex', '-1');
          targetEl.focus({ preventScroll: true });
        }

        if (window.history && window.history.pushState) {
          window.history.pushState(null, '', href);
        }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* 3. FAQ-аккордеон (один открытый вопрос за раз)                      */
  /* ------------------------------------------------------------------ */
  function initFaqAccordion() {
    var faqItems = document.querySelectorAll('.faq-item');

    if (!faqItems || faqItems.length === 0) {
      return;
    }

    faqItems.forEach(function (item) {
      item.addEventListener('toggle', function () {
        if (!item.open) {
          return;
        }

        faqItems.forEach(function (otherItem) {
          if (otherItem !== item && otherItem.open) {
            otherItem.open = false;
          }
        });
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* 4. Ненавязчивая анимация появления блоков при прокрутке             */
  /* ------------------------------------------------------------------ */
  function initScrollReveal() {
    var revealTargets = document.querySelectorAll(
      '.card, .feature-card, .step, .example-card, .audience__badge, .image-placeholder, .faq-item, .screenshot-card'
    );

    if (!revealTargets || revealTargets.length === 0) {
      return;
    }

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      revealTargets.forEach(function (el) {
        el.classList.add('is-visible');
      });
      return;
    }

    revealTargets.forEach(function (el) {
      el.classList.add('reveal-init');
    });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -60px 0px',
        threshold: 0.1
      }
    );

    revealTargets.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ------------------------------------------------------------------ */
  /* 5. Обработка Telegram-кнопок                                        */
  /* ------------------------------------------------------------------ */
  function initTelegramButtons() {
  var telegramButtons = document.querySelectorAll('.js-open-bot');

  if (!telegramButtons || telegramButtons.length === 0) {
    return;
  }

  telegramButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      if (typeof ym === 'function') {
        ym(112918749, 'reachGoal', 'telegram_click');
      }
      // preventDefault не нужен — это обычная ссылка на https://t.me/...,
      // браузер сам откроет её естественным образом.
    });
  });
}
document.addEventListener('DOMContentLoaded', function () {
 initTelegramButtons();
});

  /* ------------------------------------------------------------------ */
  /* 6. Лайтбокс для скриншотов                                          */
  /*    Открывает увеличенное изображение поверх сайта.                  */
  /*    Закрытие: кнопка, клик по подложке, клавиша Escape.              */
  /* ------------------------------------------------------------------ */
  function initScreenshotLightbox() {
    var screenshotLightbox = document.getElementById('screenshot-lightbox');
    var screenshotCards = document.querySelectorAll('.screenshot-card');

    if (!screenshotLightbox || !screenshotCards || screenshotCards.length === 0) {
      return;
    }

    var screenshotLightboxImage = screenshotLightbox.querySelector(
      '.screenshot-lightbox__image'
    );
    var screenshotCloseButtons = screenshotLightbox.querySelectorAll(
      '[data-lightbox-close]'
    );

    if (!screenshotLightboxImage) {
      return;
    }

    var lastFocusedScreenshotButton = null;

    function openScreenshotLightbox(button) {
      var imageSource = button.getAttribute('data-full-image');
      var imageAlt = button.getAttribute('data-image-alt') || 'Увеличенный скриншот';

      if (!imageSource) {
        return;
      }

      lastFocusedScreenshotButton = button;

      screenshotLightboxImage.src = imageSource;
      screenshotLightboxImage.alt = imageAlt;

      screenshotLightbox.hidden = false;
      document.body.classList.add('lightbox-open');

      var closeButton = screenshotLightbox.querySelector(
        '.screenshot-lightbox__close'
      );

      if (closeButton) {
        closeButton.focus();
      }
    }

    function closeScreenshotLightbox() {
      screenshotLightbox.hidden = true;
      screenshotLightboxImage.src = '';
      screenshotLightboxImage.alt = '';

      document.body.classList.remove('lightbox-open');

      if (lastFocusedScreenshotButton && typeof lastFocusedScreenshotButton.focus === 'function') {
        lastFocusedScreenshotButton.focus();
      }
    }

    screenshotCards.forEach(function (button) {
      button.addEventListener('click', function () {
        openScreenshotLightbox(button);
      });
    });

    screenshotCloseButtons.forEach(function (button) {
      button.addEventListener('click', closeScreenshotLightbox);
    });

    // Закрытие по клику на затемнённую подложку (вне картинки)
    screenshotLightbox.addEventListener('click', function (event) {
      if (event.target === screenshotLightbox) {
        closeScreenshotLightbox();
      }
    });

    // Закрытие по Escape, только если лайтбокс открыт
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !screenshotLightbox.hidden) {
        closeScreenshotLightbox();
      }
    });
  }
  /* ------------------------------------------------------------------ */
  /* 7. Cookie-баннер и отложенная загрузка аналитики                    */
  /*    Яндекс.Метрика и VK Пиксель подключаются только после согласия.  */
  /* ------------------------------------------------------------------ */
  var COOKIE_CONSENT_KEY = 'cookieConsent';

  function loadAnalytics() {
    /* --- Яндекс.Метрика --- */
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      for (var j = 0; j < document.scripts.length; j++) {
        if (document.scripts[j].src === r) { return; }
      }
      k = e.createElement(t), a = e.getElementsByTagName(t)[0], k.async = 1, k.src = r, a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');

    if (typeof ym === 'function') {
      ym(112918749, 'init', {
        clickmap: true,
        trackLinks: true,
        accurateTrackBounce: true,
        webvisor: true
      });
    }

    /* --- Top.Mail.Ru (счётчик VK/Mail.ru) --- */
    window._tmr = window._tmr || [];
    window._tmr.push({ id: '3796172', type: 'pageView', start: (new Date()).getTime() });

    (function (d, w, id) {
      if (d.getElementById(id)) {
        return;
      }
      var ts = d.createElement('script');
      ts.type = 'text/javascript';
      ts.async = true;
      ts.id = id;
      ts.src = 'https://top-fwz1.mail.ru/js/code.js';
      var f = function () {
        var s = d.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(ts, s);
      };
      if (w.opera === '[object Opera]') {
        d.addEventListener('DOMContentLoaded', f, false);
      } else {
        f();
      }
    })(document, window, 'tmr-code');
  }

  function initCookieConsent() {
    var banner = document.getElementById('cookieBanner');
    var acceptButton = document.getElementById('cookieAccept');

    if (!banner || !acceptButton) {
      return;
    }

    var consent = null;
    try {
      consent = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    } catch (error) {
      consent = null;
    }

    // Баннер теперь только уведомляет — аналитика запускается независимо от него (см. init()).
    if (consent === 'accepted') {
      return;
    }

    banner.hidden = false;

    acceptButton.addEventListener('click', function () {
      try {
        window.localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
      } catch (error) {
        // localStorage недоступен — баннер всё равно скроется в рамках текущей сессии
      }

      banner.hidden = true;
    });
  }
  /* ------------------------------------------------------------------ */
  /* Инициализация после загрузки DOM                                    */
  /* ------------------------------------------------------------------ */
  function init() {
    initMobileMenu();
    initSmoothScroll();
    initFaqAccordion();
    initScrollReveal();
    initTelegramButtons();
    initScreenshotLightbox();
    initCookieConsent();
    loadAnalytics();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();