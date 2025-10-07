/* ============================================================
   Subhero.js
   ============================================================ */
(function(){
  const container = document.querySelector('.sub-hero');
  if (!container) return;
  if (container.dataset.pagerReady === '1') return;
  container.dataset.pagerReady = '1';

  // NASCONDI qualunque dots/controls fuori dalla sub-hero (hardening)
  document.querySelectorAll('.pager__dots, .pager__controls').forEach(el => {
    if (!container.contains(el)) {
      el.style.display = 'none';
      el.setAttribute('aria-hidden', 'true');
    }
  });

  // DOM base
  const viewport = container.querySelector('.pager__viewport') || container;
  const trackEl  = container.querySelector('.pager__track');
  const slides   = Array.from(trackEl ? trackEl.querySelectorAll('.pager__slide') : []);

  // Deduplica eventuali doppi DENTRO la sub-hero, tieni il primo
  const dotsGroups = Array.from(container.querySelectorAll('.pager__dots'));
  if (dotsGroups.length > 1) dotsGroups.slice(1).forEach(n => n.remove());
  const controlsGroups = Array.from(container.querySelectorAll('.pager__controls'));
  if (controlsGroups.length > 1) controlsGroups.slice(1).forEach(n => n.remove());

  // Riferimenti AFTER clean
  const dotsWrap = container.querySelector('.pager__dots');
  const controls = container.querySelector('.pager__controls');
  const statusEl = container.querySelector('#carousel-status');

  /* >>>START subhero.js — align measure helpers >>> */
  let _alignRO = null;

  function syncSubheroAlign() {
    try {
      const ref =
        document.querySelector('.cards__inner') ||
        document.querySelector('.links__inner');

      if (!ref) {
        container.style.removeProperty('--subhero-align-left');
        return;
      }
      const { left } = ref.getBoundingClientRect();
      const px = Math.max(0, Math.round(left));
      container.style.setProperty('--subhero-align-left', px + 'px');
    } catch {
      container.style.removeProperty('--subhero-align-left');
    }
  }

  // throttle via rAF su resize/RO
  let _alignRAF = 0;
  function requestAlign() {
    if (_alignRAF) return;
    _alignRAF = requestAnimationFrame(() => {
      _alignRAF = 0;
      syncSubheroAlign();
    });
  }
  /* >>>END subhero.js — align measure helpers >>> */

  // Motion & timing
  const PRM = window.matchMedia('(prefers-reduced-motion: reduce)');
  const FADE_MS  = PRM.matches ? 80 : 420;
  const INTERVAL = 7000; // 7s
  let AUTOPLAY   = !PRM.matches;

  // Stato
  let index = Math.max(0, slides.findIndex(s => s.classList.contains('is-active')));
  if (index < 0) index = 0;

  // Viewport safety
  viewport.style.overflow = 'hidden';
  viewport.style.touchAction = 'pan-y';

  const clampIndex = (i) => (i + slides.length) % slides.length;

  // Background per-slide: data-attrs -> CSS vars
  function applySlideBackgrounds(){
    slides.forEach(slide => {
      const m = slide.getAttribute('data-bg-mobile');
      const d = slide.getAttribute('data-bg-desktop');
      if (m && m.trim() !== '') slide.style.setProperty('--slide-bg-mobile-url', `url("${m}")`);
      if (d && d.trim() !== '') slide.style.setProperty('--slide-bg-desktop-url', `url("${d}")`);
    });
  }

  // ARIA base
  function initAria(){
    container.setAttribute('aria-roledescription', 'carousel');
    slides.forEach((s, i) => {
      s.setAttribute('role', 'group');
      s.setAttribute('aria-roledescription', 'slide');
      const title = s.querySelector('.slide__title')?.textContent?.trim() || `Slide ${i+1}`;
      s.setAttribute('aria-label', `Slide ${i+1} di ${slides.length}: ${title}`);
      s.id = s.id || `subhero-slide-${i+1}`;
    });
  }
  function announce(i){
    if (!statusEl) return;
    const slide = slides[i];
    const title = slide?.querySelector('.slide__title')?.textContent?.trim() || `Slide ${i+1}`;
    statusEl.textContent = `Slide ${i+1} di ${slides.length}: ${title}`;
  }

  // Dots: refs (supporta markup con .dot o <button>)
  const dots = dotsWrap ? Array.from(dotsWrap.querySelectorAll('button, .dot')) : [];

  function initDotsA11y(){
    if (!dotsWrap || !slides?.length) return;
    // wrapper = tablist
    dotsWrap.setAttribute('role', 'tablist');
    const slideCount = slides.length;

    dots.forEach((d, di) => {
      // ogni dot è un "tab" che controlla la slide corrispondente
      d.setAttribute('role', 'tab');
      d.setAttribute('aria-controls', slides[di]?.id || `subhero-slide-${di+1}`);
      d.setAttribute('aria-label', `Vai alla slide ${di+1} di ${slideCount}`);
      // tabindex/selected saranno impostati in updateDots()
    });
  }

  function updateDots(){
    if (!dots.length) return;

    const LEGACY_TO_CLEAN = ['is-progress', 'is-filling', 'is-paused'];

    dots.forEach((d, di) => {
      // pulizia classi legacy eventualmente rimaste da vecchie versioni
      LEGACY_TO_CLEAN.forEach(c => d.classList.remove(c));

      const active = di === index;
      d.classList.toggle('is-active', active);

      // A11y stato
      d.setAttribute('aria-selected', active ? 'true' : 'false');
      d.setAttribute('aria-current',  active ? 'true' : 'false');
      d.setAttribute('tabindex',      active ? '0'    : '-1');
    });
  }

  // Inizializza interazione dots (eventi / tastiera)
  function initDots(){
    dots.forEach((d, i) => {
      d.setAttribute('role', 'tab'); // (rimane per retro-compatibilità)
      d.setAttribute('aria-controls', `subhero-slide-${i+1}`);
      d.addEventListener('click', () => {
        stopAutoplay();
        activate(i, true);
        startAutoplay();
      });
      d.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft'){ e.preventDefault(); stopAutoplay(); prev(true); startAutoplay(); }
        if (e.key === 'ArrowRight'){ e.preventDefault(); stopAutoplay(); next(true); startAutoplay(); }
      });
    });
    updateDots();
  }

  // Ottimizzazione immagini: prima slide eager + high; altre lazy
  function tuneImages(){
    slides.forEach((slide, i) => {
      slide.querySelectorAll('img').forEach(img => {
        if (i === 0) {
          img.loading = 'eager';
          img.fetchPriority = 'high';
          img.decoding = 'async';
        } else {
          img.loading = 'lazy';
          img.decoding = 'async';
        }
      });
    });
  }

  // Altezza viewport = max slide (clamp 240–520 per contenuti più lunghi)
  function measureViewport(){
    const maxH = slides.reduce((m, s) => Math.max(m, s.scrollHeight), 0);
    const target = Math.max(240, Math.min(520, maxH));
    viewport.style.height = target + 'px';
  }

  // MQs
  const mqDesktop = window.matchMedia('(min-width: 768px)');
  const mqMobile  = window.matchMedia('(max-width: 767.98px)');

  function updateControlsVisibility(){
    // Se mancano sia i controls sia i dots, esci
    if (!controls && !dotsWrap) return;

    if (mqMobile.matches){
      // Frecce: nascondi visivamente e agli screen reader, togli dal tab order
      if (controls){
        controls.style.display = 'none';
        controls.style.visibility = 'hidden';
        controls.style.pointerEvents = 'none';
        controls.setAttribute('aria-hidden', 'true');
        controls.querySelectorAll('.pager__arrow').forEach(b => b.setAttribute('tabindex', '-1'));
      }
      // Dots: su mobile restano visibili → nessun cambiamento A11y qui
    } else {
      // Frecce: ripristina visibilità e accessibilità
      if (controls){
        controls.style.display = '';
        controls.style.visibility = '';
        controls.style.pointerEvents = '';
        controls.removeAttribute('aria-hidden');
        controls.querySelectorAll('.pager__arrow').forEach(b => b.removeAttribute('tabindex'));
      }
    }
  }

  // Frecce: CSS-first → nessun posizionamento inline; pulizia residui
  function alignArrows(){
    if (!controls || mqMobile.matches) return;
    controls.style.top = '';
  }

  // Attivazione (fade silky: flag .is-animating su prev/next)
  function activate(i, userInitiated = false){
    const to = clampIndex(i);
    if (to === index) return;

    const prevSlide = slides[index];
    const nextSlide = slides[to];
    if (!nextSlide) return;

    prevSlide && prevSlide.classList.add('is-animating');
    nextSlide.classList.add('is-animating');

    prevSlide && prevSlide.classList.remove('is-active');
    nextSlide.classList.add('is-active');

    index = to;
    updateDots();        // aggiorna lo stato dei dots (senza progress)
    alignArrows?.();
    // Annuncio (sempre se userInitiated, oppure se PRM non attivo)
    if (userInitiated || !PRM.matches) announce(index);

    // Fine animazione: rimuovi flag
    window.setTimeout(() => {
      prevSlide && prevSlide.classList.remove('is-animating');
      nextSlide.classList.remove('is-animating');
    }, FADE_MS + 60);
  }

  // Navigazione
  const go   = (to, user=false) => activate(to, user);
  const next = (user=false) => go(index + 1, user);
  const prev = (user=false) => go(index - 1, user);

  // Autoplay
  let timer = null;
  function startAutoplay(){
    if (!AUTOPLAY || timer) return;
    timer = setInterval(() => activate(index + 1), INTERVAL);
    container.dataset.autoplay = '1';
  }
  function stopAutoplay(){
    if (!timer) return;
    clearInterval(timer);
    timer = null;
    container.dataset.autoplay = '0';
  }

  // Pausa quando fuori viewport (IntersectionObserver)
  let _io;
  if ('IntersectionObserver' in window) {
    _io = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (!e) return;
      if (e.isIntersecting && e.intersectionRatio >= 0.35) {
        startAutoplay();
      } else {
        stopAutoplay();
      }
    }, { root: null, threshold: [0, 0.35, 1] });
    _io.observe(container);
  }

  // Visibility (tab background)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAutoplay();
    else if (!_io) startAutoplay(); // se IO non supportato
  });

  // Dots (dopo init)
  initDots();

  // Frecce — event delegation + Enter/Space
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.pager__arrow');
    if (!btn || !container.contains(btn)) return;
    e.preventDefault();
    stopAutoplay();
    if (btn.classList.contains('prev')) prev(true);
    else if (btn.classList.contains('next')) next(true);
    btn.focus();
    startAutoplay();
  });

  // Tastiera globale (solo se non stai scrivendo in un campo)
  document.addEventListener('keydown', (e) => {
    const el = document.activeElement;
    const tag = el?.tagName?.toLowerCase();
    const isFormField = tag === 'input' || tag === 'textarea' || el?.isContentEditable;

    const btn = e.target.closest?.('.pager__arrow');
    if (btn && (e.key === 'Enter' || e.key === ' ' || e.code === 'Space')) {
      e.preventDefault();
      stopAutoplay();
      if (btn.classList.contains('prev')) prev(true);
      else if (btn.classList.contains('next')) next(true);
      btn.focus();
      startAutoplay();
      return;
    }

    if (!isFormField) {
      if (e.key === 'ArrowLeft'){ e.preventDefault(); stopAutoplay(); prev(true); startAutoplay(); }
      if (e.key === 'ArrowRight'){ e.preventDefault(); stopAutoplay(); next(true); startAutoplay(); }
    }
  });

  // Pausa gentile su hover/focus
  container.addEventListener('pointerenter', stopAutoplay);
  container.addEventListener('pointerleave', startAutoplay);
  container.addEventListener('focusin', stopAutoplay);
  container.addEventListener('focusout', startAutoplay);

  // Swipe touch
  let touchStartX = 0, touchDX = 0, touching = false;
  viewport.addEventListener('touchstart', (e) => {
    if (!e.touches?.length) return;
    touching = true;
    touchStartX = e.touches[0].clientX;
    touchDX = 0;
    stopAutoplay();
  }, {passive:true});
  viewport.addEventListener('touchmove', (e) => {
    if (!touching || !e.touches?.length) return;
    touchDX = e.touches[0].clientX - touchStartX;
  }, {passive:true});
  viewport.addEventListener('touchend', () => {
    if (!touching) return;
    touching = false;
    if (Math.abs(touchDX) > 40){
      activate(index + (touchDX < 0 ? 1 : -1), true);
    }
    startAutoplay();
  }, {passive:true});

  // Single slide mode
  function applySingleSlideMode(){
    if (slides.length > 1) return;

    AUTOPLAY = false;
    stopAutoplay();

    // Nascondi visivamente
    if (dotsWrap) dotsWrap.style.display = 'none';
    if (controls) controls.style.display = 'none';

    // Nascondi agli screen reader e rimuovi dal tab order
    if (dotsWrap) dotsWrap.setAttribute('aria-hidden', 'true');
    dots.forEach(d => d.setAttribute('tabindex', '-1'));

    if (controls){
      controls.setAttribute('aria-hidden', 'true');
      controls.querySelectorAll('.pager__arrow').forEach(b => b.setAttribute('tabindex', '-1'));
    }
  }

  // MQ listeners
  const onMQ = () => { if (mqDesktop.matches) alignArrows?.(); };
  (mqDesktop.addEventListener ? mqDesktop.addEventListener('change', onMQ)
                              : mqDesktop.addListener(onMQ));
  (mqMobile.addEventListener ? mqMobile.addEventListener('change', updateControlsVisibility)
                             : mqMobile.addListener(updateControlsVisibility));

  // Init sequence
  applySlideBackgrounds();
  initAria();
  initDotsA11y();
  updateDots();
  tuneImages();
  measureViewport();
  announce(index);
  applySingleSlideMode();
  updateControlsVisibility();
  startAutoplay();

  /* align init & observers >>> */
  // misura iniziale
  syncSubheroAlign();

  // osserva container Cards/Links e documento per cambi layout
  const refForRO =
    document.querySelector('.cards__inner') ||
    document.querySelector('.links__inner');

  // Unifica i ResizeObserver in uno solo per evitare overhead - OTTIMIZZATO
  if ('ResizeObserver' in window) {
    // Debounce per evitare troppi aggiornamenti
    let resizeTimeout = null;
    _alignRO = new ResizeObserver(() => {
      if (resizeTimeout) return;
      resizeTimeout = setTimeout(() => {
        resizeTimeout = null;
        requestAlign();
        measureViewport();
        alignArrows?.();
      }, 150);
    });

    // Osserva solo container e viewport, non ogni singola slide
    if (refForRO) _alignRO.observe(refForRO);
    _alignRO.observe(viewport);
    // Osserva documentElement solo per orientamento/zoom
    _alignRO.observe(document.documentElement);
  } else {
    // Fallback per browser senza ResizeObserver
    let resizeTimeout = null;
    window.addEventListener('resize', () => {
      if (resizeTimeout) return;
      resizeTimeout = setTimeout(() => {
        resizeTimeout = null;
        requestAlign();
        measureViewport();
        alignArrows?.();
      }, 150);
    });
  }

  window.addEventListener('load', requestAlign);

  // allinea quando il layout è pronto
  window.requestAnimationFrame(() => { alignArrows?.(); });
})();
