/* ============================================================
   Links.js
   ============================================================ */
(() => {
  // ===== Config =====
  const MOBILE_BP = 0;             // carosello sempre attivo (mobile-first)
  const IDLE_RESUME_MS = 3000;     // pausa autoplay dopo interazione manuale
  const DEFAULT_SPEED  = 16;       // px/sec mobile (override via CSS: --links-auto-speed)
  const DRAG_THRESHOLD = 8;        // px per distinguere click vs drag (hardening)

  function initLinksLoop() {
    const section  = document.querySelector('.links');
    if (!section) return;

    const carousel = section.querySelector('.links__carousel') || section;
    const track    = section.querySelector('.links__track');
    if (!track) return;

    // A11y base
    track.setAttribute('tabindex', '0');
    track.setAttribute('aria-label', 'Elenco collegamenti scorrevole orizzontale');

    // Media queries & prefers
    const mqCarousel     = window.matchMedia(`(min-width: ${MOBILE_BP}px)`); // sempre true
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    // ===== Stato misure/loop =====
    let gapPx = 16;
    let cardStep = 240;
    let originalWidth = 0;
    let leftAnchor = 0;
    let loopEnabled = false;

    // ===== Stato virtual scroll =====
    let virtualX = 0;
    let wrapMargin = 480;

    // ===== Stato drag =====
    let dragging = false;
    let draggingActive = false;
    let startX = 0;
    let startLeft = 0;
    let capturedId = null;
    let dragPrevSnap = '';

    // ===== Stato autoplay =====
    let rafId = 0;
    let lastTs = 0;
    let autoPaused = false;
    let idleTimer = 0;

    // Cache per scroll-snap
    let snapCache = '';

    // IntersectionObserver
    let io = null;

    // ===== Utils =====
    const cssNumber = (name, el = section) => {
      const s = getComputedStyle(el).getPropertyValue(name).trim();
      const v = parseFloat(s);
      return Number.isFinite(v) ? v : 0;
    };
    const readSpeed = () => {
      const v = cssNumber('--links-auto-speed', section);
      return (Number.isFinite(v) && v > 0) ? Math.max(8, Math.min(120, v)) : DEFAULT_SPEED;
    };
    const ignoreRMW = () => cssNumber('--links-auto-ignore-rmw', section) > 0;

    // Riconoscimento cloni retro-compatibile
    const isClone = (li) =>
      !!li && ((li.dataset && li.dataset.clone === '1') || li.classList.contains('is-clone'));

    const originals = () =>
      Array.from(track.querySelectorAll('.link-card')).filter(li => !isClone(li));

    const cleanupClones = () => {
      track.querySelectorAll('.link-card[data-clone="1"], .link-card.is-clone').forEach(n => n.remove());
    };

    const duplicateSet = (nodes) => {
      const frag = document.createDocumentFragment();
      nodes.forEach(n => {
        const c = n.cloneNode(true);
        c.dataset.clone = '1';
        c.classList.add('is-clone');
        c.setAttribute('aria-hidden', 'true');
        c.removeAttribute('id');
        c.querySelectorAll('a,button').forEach(el => el.setAttribute('tabindex', '-1'));
        frag.appendChild(c);
      });
      return frag;
    };

    const measureGapsAndStep = () => {
      const styles = getComputedStyle(track);
      gapPx = parseFloat(styles.columnGap) || parseFloat(styles.gap) || 0;
      const first = track.querySelector('.link-card');
      if (first) {
        const r = first.getBoundingClientRect();
        cardStep = Math.round(r.width + gapPx);
      }
    };

    const measureAnchors = () => {
      const orig = originals();
      if (!orig.length) { originalWidth = 0; leftAnchor = 0; return; }
      const first = orig[0];
      const last  = orig[orig.length - 1];
      leftAnchor = first.offsetLeft;
      const lastRight = last.offsetLeft + last.getBoundingClientRect().width;
      originalWidth = Math.max(0, Math.round(lastRight - leftAnchor));
    };

    const updateWrapMargin = () => {
      const vw = (carousel.clientWidth || track.clientWidth || 0);
      wrapMargin = Math.max(cardStep * 3, Math.round(vw * 0.5));
    };

    // ===== Stili forzati in modalità carosello (JS garantisce funzionamento) =====
    const forceCarouselStyles = () => {
      // CSS già imposta nowrap/overflow, qui aggiungiamo JS safety
      track.style.touchAction = 'pan-y pinch-zoom'; // permette scroll verticale pagina
      track.classList.add('is-initializing');
    };
    const clearCarouselStyles = () => {
      track.style.touchAction = '';
      track.classList.remove('is-initializing', 'is-ready', 'is-dragging');
    };

    // ===== Costruzione banda + cloni (robusta) =====
    const buildLoopAdaptive = () => {
      cleanupClones();
      const orig = originals();
      if (orig.length < 1) { loopEnabled = false; return; }

      // Misure base con soli originali
      measureGapsAndStep();
      measureAnchors();
      updateWrapMargin();

      const viewportW = (carousel.clientWidth || track.clientWidth || 0);

      let minWidthNeeded = viewportW + (2 * wrapMargin) + (2 * originalWidth) + Math.max(cardStep, 1);

      // Duplica set a sinistra e destra fino a superare la soglia (limite sicurezza)
      let copies = 0;
      const MAX_COPIES = 10;
      while (((track.scrollWidth || 0) < minWidthNeeded) && copies < MAX_COPIES) {
        track.insertBefore(duplicateSet(orig), orig[0]);
        track.appendChild(duplicateSet(orig));
        copies++;

        // Rimisuro dopo il reflow
        measureGapsAndStep();
        measureAnchors();
        updateWrapMargin();

        // Ricalcola la soglia con i nuovi numeri
        minWidthNeeded = viewportW + (2 * wrapMargin) + (2 * originalWidth) + Math.max(cardStep, 1);
      }

      // Posiziona la vista sulla banda originale
      track.scrollTo({ left: leftAnchor, behavior: 'auto' });
      virtualX = track.scrollLeft;
      loopEnabled = true;
    };

    // ===== Loop infinito: wrap "off-screen" con isteresi (robusto) =====
    const wrapOffscreenIfNeeded = () => {
      if (!loopEnabled || originalWidth <= 0) return;

      // Range esteso: centro sulla banda originale e concedo isteresi ai lati
      const minX = leftAnchor - wrapMargin;
      const maxX = leftAnchor + originalWidth + wrapMargin;

      if (virtualX >= minX && virtualX < maxX) return;

      // Normalizza sempre nella [leftAnchor, leftAnchor + originalWidth)
      const rel = virtualX - leftAnchor;
      const norm = ((rel % originalWidth) + originalWidth) % originalWidth;
      virtualX = leftAnchor + norm;

      // Applicazione diretta: niente scatti (autoplay ha snap disattivato)
      track.scrollLeft = virtualX;
    };

    // ===== Autoplay =====
    const setPaused = (val) => {
      autoPaused = !!val;
      // Ripristina snap quando in pausa completa; disattivalo quando attivo
      if (autoPaused) {
        if (snapCache) track.style.scrollSnapType = snapCache;
      } else {
        snapCache = track.style.scrollSnapType || '';
        track.style.scrollSnapType = 'none';
      }
    };

    const pauseAutoTemporarily = () => {
      setPaused(true);
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => setPaused(false), IDLE_RESUME_MS);
    };

    const tick = (ts) => {
      rafId = requestAnimationFrame(tick);

      // Rispetta RMW a meno che non sia forzato da CSS
      const rmwActive = prefersReduced.matches && !ignoreRMW();
      if (autoPaused || rmwActive || document.visibilityState === 'hidden') {
        lastTs = ts;
        return;
      }

      if (!lastTs) { lastTs = ts; return; }

      const dt = (ts - lastTs) / 1000;
      if (dt <= 0) { lastTs = ts; return; }
      lastTs = ts;

      const spd = readSpeed();
      if (spd <= 0) return;

      // Avanza posizione virtuale (float), poi applica al DOM
      virtualX += spd * dt;
      track.scrollLeft = virtualX;

      // Eventuale wrap solo quando "fuori" dal cono visibile + margine
      wrapOffscreenIfNeeded();
    };

    const startAutoplay = () => {
      if (!rafId) {
        lastTs = 0;
        setPaused(false);
        rafId = requestAnimationFrame(tick);
      }
    };
    const stopAutoplay  = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      setPaused(true);
    };

    // ===== Controls / Input =====
    const behavior = prefersReduced.matches && !ignoreRMW() ? 'auto' : 'smooth';

    const scrollByStep = (dir) => {
      track.scrollBy({ left: dir * cardStep, behavior });
      pauseAutoTemporarily();
    };

    const onKey = (e) => {
      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); scrollByStep(-1); break;
        case 'ArrowRight': e.preventDefault(); scrollByStep(1);  break;
        case 'Home':       e.preventDefault(); track.scrollTo({ left: leftAnchor, behavior }); pauseAutoTemporarily(); break;
        case 'End':        e.preventDefault(); track.scrollTo({ left: track.scrollWidth, behavior }); pauseAutoTemporarily(); break;
      }
    };

    const onWheel = (e) => {
      if (track.scrollWidth > track.clientWidth) {
        e.preventDefault();
        track.scrollLeft += e.deltaY;
        virtualX = track.scrollLeft;
        pauseAutoTemporarily();
      }
    };

    // ===== Drag con soglia + pointer capture tardiva =====
    const onPointerDown = (e) => {
      if (e.button !== 0) return;
      dragging = true;
      draggingActive = false;
      startX = e.clientX;
      startLeft = track.scrollLeft;

      // Pausa soft (non tocco snap globale qui)
      autoPaused = true;

      // Disattivo snap solo per la durata del drag (se era attivo inline)
      dragPrevSnap = track.style.scrollSnapType || '';
      track.style.scrollSnapType = 'none';
      // NIENTE preventDefault qui: lascia passare i click finché non stai davvero trascinando
    };

    const onPointerMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;

      // Attiva il drag solo oltre la soglia → i link restano cliccabili sui micro-movimenti
      if (!draggingActive && Math.abs(dx) > DRAG_THRESHOLD) {
        draggingActive = true;
        track.classList.add('is-dragging');
        try { track.setPointerCapture(e.pointerId); capturedId = e.pointerId; } catch(_) {}
      }

      if (draggingActive) {
        track.scrollLeft = startLeft - dx;
        virtualX = track.scrollLeft;
        e.preventDefault();
      }
    };

    const onPointerUp = (e) => {
      if (!dragging) return;

      if (draggingActive) {
        track.classList.remove('is-dragging');
        if (capturedId != null) { try { track.releasePointerCapture(capturedId); } catch(_) {} capturedId = null; }
      }

      // Ripristina lo snap com'era prima del drag (inline)
      track.style.scrollSnapType = dragPrevSnap || '';
      dragPrevSnap = '';

      // Riprendi autoplay al prossimo frame (pausa soft → false)
      requestAnimationFrame(() => { autoPaused = false; });

      dragging = false;
      draggingActive = false;
    };

    // ===== Hover soft (pausa senza toccare snap) =====
    const pauseSoft = () => { autoPaused = true; };
    const resumeSoft = () => { autoPaused = false; };
    const onMouseEnter = () => pauseSoft();
    const onMouseLeave = () => resumeSoft();

    // ===== Resize / Reflow =====
    let resizeT;
    const onResize = () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => {
        if (!loopEnabled) return;
        const prev = (virtualX || track.scrollLeft) - leftAnchor;
        buildLoopAdaptive();
        virtualX = leftAnchor + prev;
        track.scrollLeft = virtualX;
      }, 50);
    };

    // ===== Visibility change (hardening) =====
    const onVisibility = () => {
      if (document.hidden) {
        if (rafId) stopAutoplay();
      } else {
        const rmwActive = prefersReduced.matches && !ignoreRMW();
        if (mqCarousel.matches && !rmwActive && section.dataset.linksReady === '1') {
          startAutoplay();
        }
      }
    };

    // ===== Mount / Unmount =====
    const enableCarousel = () => {
      if (section.dataset.linksReady === '1') return;
      section.dataset.linksReady = '1';
      carousel.dataset.linksReady = '1';

      forceCarouselStyles();
      buildLoopAdaptive();

      // Bind eventi
      track.addEventListener('keydown', onKey);
      track.addEventListener('wheel', onWheel, { passive: false });
      track.addEventListener('pointerdown', onPointerDown, { passive: false });
      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', onPointerUp, { passive: false });
      window.addEventListener('resize', onResize, { passive: true });

      // Hover = pausa soft / leave = riprendi (senza cambiare snap)
      track.addEventListener('mouseenter', onMouseEnter);
      track.addEventListener('mouseleave', onMouseLeave);

      // Al load delle immagini ricostruiamo e manteniamo lo stato
      track.querySelectorAll('img').forEach(img => {
        img.addEventListener('load', onResize, { passive: true });
      });

      // Pausa quando fuori viewport
      if ('IntersectionObserver' in window) {
        io = new IntersectionObserver((entries) => {
          const e = entries[0];
          if (!e) return;
          if (e.intersectionRatio < 0.3) {
            autoPaused = true;
          } else {
            autoPaused = false;
          }
        }, { root: null, threshold: [0, 0.3, 1] });
        io.observe(section);
      }

      // Visibility
      document.addEventListener('visibilitychange', onVisibility);

      // Avvia autoplay
      startAutoplay();

      // Fade-in + kickstart autoplay (nudge + riallineo virtuale) + watchdog
      requestAnimationFrame(() => {
        track.classList.remove('is-initializing');
        track.classList.add('is-ready');

        const before = track.scrollLeft;
        const nudge = Math.max(8, Math.round(cardStep * 0.1));
        virtualX = before + nudge;
        track.scrollLeft = virtualX;
        wrapOffscreenIfNeeded();

        // Watchdog: se dopo 700ms non si è mosso, riavvia il RAF
        setTimeout(() => {
          const after = track.scrollLeft;
          if (Math.abs(after - before) < 1) {
            stopAutoplay();
            lastTs = 0;
            startAutoplay();
          }
        }, 700);
      });
    };

    const disableCarousel = () => {
      if (!section.dataset.linksReady) return;
      delete section.dataset.linksReady;
      delete carousel.dataset.linksReady;

      stopAutoplay();

      // Unbind
      track.removeEventListener('keydown', onKey);
      track.removeEventListener('wheel', onWheel);
      track.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      track.querySelectorAll('img').forEach(img => {
        img.removeEventListener('load', onResize);
      });
      track.removeEventListener('mouseenter', onMouseEnter);
      track.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('visibilitychange', onVisibility);

      // Disconnetti IO
      if (io) { try { io.disconnect(); } catch(_) {} io = null; }

      clearCarouselStyles();
      cleanupClones();
      track.scrollTo({ left: 0, behavior: 'auto' });
      virtualX = 0;
      loopEnabled = false;
    };

    // ===== Attivazione modalità carosello (sempre, mobile-first) =====
    const handleMQ = () => {
      const hasCards = originals().length > 0;
      // Carosello sempre attivo se ci sono card
      if (hasCards) {
        enableCarousel();
      } else {
        disableCarousel();
      }
    };
    let _mqResizeT;
    const onGlobalResize = () => {
      clearTimeout(_mqResizeT);
      _mqResizeT = setTimeout(handleMQ, 120);
    };
    window.addEventListener('resize', onGlobalResize, { passive: true });

    // Avvio immediato
    handleMQ();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLinksLoop, { once: true });
  } else {
    initLinksLoop();
  }
})();
