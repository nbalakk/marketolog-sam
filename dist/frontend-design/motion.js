(() => {
  'use strict';
  const film = document.getElementById('sam-motion');
  const frame = document.getElementById('motion-frame');
  const control = document.getElementById('motion-control');
  const error = document.getElementById('motion-error');
  const direct = document.getElementById('motion-direct-link');
  if (!film || !frame || !control) return;

  const narrow = matchMedia('(max-width:760px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  let visible = false;
  let manualPaused = false;
  let manualPlay = false;
  let finished = false;
  let pending = false;
  let sourceFormat = null;
  let attempt = 0;
  let sourceFailed = false;

  film.muted = true;
  film.defaultMuted = true;
  film.playsInline = true;

  const format = () => narrow.matches ? 'mobile' : 'desktop';
  const url = (name, extension) => `motion/sam-${name}.${extension}`;
  function wantsPlayback() {
    return visible && !document.hidden && !manualPaused && !finished &&
      (manualPlay || (!reduced.matches && !connection?.saveData));
  }
  function syncControl() {
    const playing = pending || (!film.paused && !film.ended);
    control.textContent = playing ? 'Пауза' : finished ? 'Повторить' : 'Смотреть';
    control.setAttribute('aria-label', playing ? 'Приостановить ролик' : finished ? 'Повторить ролик' : 'Воспроизвести ролик');
    control.dataset.state = playing ? 'playing' : finished ? 'ended' : 'paused';
  }
  function pause() {
    attempt++;
    pending = false;
    film.pause();
    syncControl();
  }
  function setPresentation() {
    const name = format();
    film.poster = `motion/poster-${name}.png`;
    film.width = name === 'mobile' ? 1080 : 1920;
    film.height = name === 'mobile' ? 1920 : 1080;
    frame.dataset.format = name;
    if (direct) direct.href = url(name, 'mp4');
  }
  function load() {
    const name = format();
    if (sourceFormat === name && !film.error && !sourceFailed) return;
    sourceFailed = false;
    sourceFormat = name;
    error.hidden = true;
    frame.classList.remove('has-video');
    film.replaceChildren();
    // Never attach the other device's files. Use H264 if WebM isn't supported.
    if (film.canPlayType('video/webm; codecs="vp9"')) {
      const webm = document.createElement('source');
      webm.src = url(name, 'webm');
      webm.type = 'video/webm; codecs="vp9"';
      film.append(webm);
    }
    const mp4 = document.createElement('source');
    mp4.src = url(name, 'mp4');
    mp4.type = 'video/mp4';
    film.append(mp4);
    const sources = [...film.querySelectorAll('source')];
    const failed = new Set();
    sources.forEach(source => source.addEventListener('error', () => {
      failed.add(source);
      if (failed.size === sources.length) {
        sourceFailed = true;
        pause();
        frame.classList.remove('has-video');
        error.hidden = false;
      }
    }));
    film.load();
  }
  function start() {
    if (!wantsPlayback() || pending || (!film.paused && sourceFormat === format())) return;
    setPresentation();
    load();
    if (film.ended) film.currentTime = 0;
    const token = ++attempt;
    pending = true;
    syncControl();
    film.play().then(() => {
      if (token !== attempt) return;
      pending = false;
      if (!wantsPlayback()) film.pause();
      syncControl();
    }).catch(() => {
      if (token !== attempt) return;
      pending = false;
      syncControl();
    });
  }
  function applyPolicy() {
    if (wantsPlayback()) start();
    else pause();
  }
  control.addEventListener('click', () => {
    if (pending || !film.paused) {
      manualPaused = true;
      manualPlay = false;
      pause();
    } else {
      manualPaused = false;
      manualPlay = true;
      finished = false;
      visible = true;
      start();
    }
  });
  film.addEventListener('playing', () => {
    if (wantsPlayback()) frame.classList.add('has-video');
    else pause();
    syncControl();
  });
  film.addEventListener('pause', syncControl);
  film.addEventListener('ended', () => {
    finished = true;
    manualPlay = false;
    pending = false;
    frame.classList.remove('has-video');
    syncControl();
  });
  film.addEventListener('error', () => {
    pause();
    frame.classList.remove('has-video');
    error.hidden = false;
  });
  narrow.addEventListener('change', () => {
    pause();
    frame.classList.remove('has-video');
    setPresentation();
    applyPolicy();
  });
  reduced.addEventListener('change', () => {
    manualPlay = false;
    if (reduced.matches) frame.classList.remove('has-video');
    applyPolicy();
  });
  connection?.addEventListener?.('change', applyPolicy);
  document.addEventListener('visibilitychange', applyPolicy);
  setPresentation();
  control.hidden = false;
  syncControl();
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .12);
      applyPolicy();
    }, { threshold: [0, .12] });
    observer.observe(frame);
  } else {
    visible = true;
    applyPolicy();
  }
})();
