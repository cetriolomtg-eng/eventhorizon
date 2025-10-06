/* ============================================================
   Links.js - Carousel con carte sovrapposte
   ============================================================ */
(() => {
  // ===== Config =====
  const DESKTOP_BP = 1024;         // modalità carosello desktop (>=1024px)
  const MOBILE_AUTO_INTERVAL = 4000; // autoplay mobile (ms)
  const IDLE_RESUME_MS = 3000;     // pausa autoplay dopo interazione manuale
  const DEFAULT_SPEED  = 24;       // px/sec desktop (override via CSS: --links-auto-speed)
  const DRAG_THRESHOLD = 8;        // px per distinguere click vs drag

  function initLinksCarousel() {
    const section  = document.querySelector('.links');
    if (!section) return;

    const carousel = section.querySelector('.links__carousel') || section;
    const track    = section.querySelector('.links__track');
    if (!track) return;

    // A11y base
    track.setAttribute('tabindex', '0');
    track.setAttribute('aria-label', 'Elenco collegamenti scorrevole');

    // Media queries & prefers
    const mqDesktop      = window.matchMedia(`(min-width: ${DESKTOP_BP}px)`);
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    // ===== Stato mobile carousel =====
    let mobileCurrentIndex = 0;
    let mobileAutoTimer = null;
    let mobileCards = [];
    let mobileIndicators = [];
    let mobileIndicatorsContainer = null;

    // ===== Stato desktop carousel =====
    let gapPx = 16;
    let cardStep = 240;
    let originalWidth = 0;
    let leftAnchor = 0;
    let loopEnabled = false;

    // ===== Stato virtual scroll (desktop) =====
    let virtualX = 0;
    let wrapMargin = 480;

    // ===== Stato drag (desktop) =====
    let dragging = false;
    let draggingActive = false;
    let startX = 0;
    let startLeft = 0;
    let capturedId = null;
    let dragPrevSnap = '';

    // ===== Stato autoplay (desktop) =====
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

    // Riconoscimento cloni (desktop)
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

    // ===== MOBILE CAROUSEL =====
    const initMobileCarousel = () => {
      mobileCards = Array.from(track.querySelectorAll('.link-card')).filter(li => !isClone(li));
      if (mobileCards.length === 0) return;

      mobileCurrentIndex = 0;

      // Crea indicatori
      if (!mobileIndicatorsContainer) {
        mobileIndicatorsContainer = document.createElement('div');
        mobileIndicatorsContainer.className = 'links__indicators';
        mobileIndicatorsContainer.setAttribute('role', 'tablist');
        mobileIndicatorsContainer.setAttribute('aria-label', 'Indicatori carousel');
        carousel.appendChild(mobileIndicatorsContainer);
      }

      mobileIndicatorsContainer.innerHTML = '';
      mobileIndicators = [];

      mobileCards.forEach((card, i) => {
        const btn = document.createElement('button');
        btn.className = 'links__indicator';
        btn.setAttribute('type', 'button');
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-label', `Vai alla card ${i + 1}`);
        btn.setAttribute('aria-controls', card.id || `link-card-${i}`);
        if (i === 0) {
          btn.classList.add('is-active');
          btn.setAttribute('aria-selected', 'true');
        } else {
          btn.setAttribute('aria-selected', 'false');
        }
        btn.addEventListener('click', () => mobileGoToSlide(i));
        mobileIndicatorsContainer.appendChild(btn);
        mobileIndicators.push(btn);
      });

      updateMobileSlides();
      startMobileAutoplay();

      // Touch/swipe support
      let touchStartX = 0;
      let touchEndX = 0;

      track.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      track.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleMobileSwipe();
      }, { passive: true });

      const handleMobileSwipe = () => {
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
          if (diff > 0) {
            // Swipe left -> next
            mobileNextSlide();
          } else {
            // Swipe right -> prev
            mobilePrevSlide();
          }
        }
      };

      // Keyboard navigation
      track.addEventListener('keydown', onMobileKey);
    };

    const updateMobileSlides = () => {
      if (mobileCards.length === 0) return;

      const total = mobileCards.length;
      const prevIndex = (mobileCurrentIndex - 1 + total) % total;
      const nextIndex = (mobileCurrentIndex + 1) % total;

      mobileCards.forEach((card, i) => {
        card.classList.remove('is-active', 'is-prev', 'is-next');

        if (i === mobileCurrentIndex) {
          card.classList.add('is-active');
          card.setAttribute('aria-hidden', 'false');
        } else if (i === prevIndex) {
          card.classList.add('is-prev');
          card.setAttribute('aria-hidden', 'true');
        } else if (i === nextIndex) {
          card.classList.add('is-next');
          card.setAttribute('aria-hidden', 'true');
        } else {
          card.setAttribute('aria-hidden', 'true');
        }
      });

      // Update indicators
      mobileIndicators.forEach((ind, i) => {
        if (i === mobileCurrentIndex) {
          ind.classList.add('is-active');
          ind.setAttribute('aria-selected', 'true');
        } else {
          ind.classList.remove('is-active');
          ind.setAttribute('aria-selected', 'false');
        }
      });
    };

    const mobileGoToSlide = (index) => {
      if (index >= 0 && index < mobileCards.length) {
        mobileCurrentIndex = index;
        updateMobileSlides();
        stopMobileAutoplay();
        startMobileAutoplay();
      }
    };

    const mobileNextSlide = () => {
      mobileCurrentIndex = (mobileCurrentIndex + 1) % mobileCards.length;
      updateMobileSlides();
      stopMobileAutoplay();
      startMobileAutoplay();
    };

    const mobilePrevSlide = () => {
      mobileCurrentIndex = (mobileCurrentIndex - 1 + mobileCards.length) % mobileCards.length;
      updateMobileSlides();
      stopMobileAutoplay();
      startMobileAutoplay();
    };

    const startMobileAutoplay = () => {
      if (prefersReduced.matches && !ignoreRMW()) return;
      stopMobileAutoplay();
      mobileAutoTimer = setInterval(() => {
        mobileNextSlide();
      }, MOBILE_AUTO_INTERVAL);
    };

    const stopMobileAutoplay = () => {
      if (mobileAutoTimer) {
        clearInterval(mobileAutoTimer);
        mobileAutoTimer = null;
      }
    };

    const onMobileKey = (e) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          mobilePrevSlide();
          break;
        case 'ArrowRight':
          e.preventDefault();
          mobileNextSlide();
          break;
        case 'Home':
          e.preventDefault();
          mobileGoToSlide(0);
          break;
        case 'End':
          e.preventDefault();
          mobileGoToSlide(mobileCards.length - 1);
          break;
      }
    };

    const destroyMobileCarousel = () => {
      stopMobileAutoplay();
      if (mobileIndicatorsContainer) {
        mobileIndicatorsContainer.remove();
        mobileIndicatorsContainer = null;
      }
      mobileCards.forEach(card => {
        card.classList.remove('is-active', 'is-prev', 'is-next');
        card.removeAttribute('aria-hidden');
      });
      track.removeEventListener('keydown', onMobileKey);
    };

    // ===== DESKTOP CAROUSEL (existing code adapted) =====
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

    const forceDesktopStyles = () => {
      track.style.display = 'flex';
      track.style.flexWrap = 'nowrap';
      track.style.justifyContent = 'flex-start';
      track.style.overflowX = 'auto';
      track.style.overflowY = 'hidden';
      track.style.webkitOverflowScrolling = 'touch';
      track.style.scrollSnapType = 'x proximity';
      track.style.touchAction = 'none';
      track.style.userSelect  = 'none';
      track.classList.add('is-initializing');
    };

    const clearDesktopStyles = () => {
      track.style.display = '';
      track.style.flexWrap = '';
      track.style.justifyContent = '';
      track.style.overflowX = '';
      track.style.overflowY = '';
      track.style.webkitOverflowScrolling = '';
      track.style.scrollSnapType = '';
      track.style.touchAction = '';
      track.style.userSelect = '';
      track.classList.remove('is-initializing', 'is-ready', 'is-dragging');
    };

    const buildLoopAdaptive = () => {
      cleanupClones();
      const orig = originals();
      if (orig.length < 1) { loopEnabled = false; return; }

      measureGapsAndStep();
      measureAnchors();
      updateWrapMargin();

      const viewportW = (carousel.clientWidth || track.clientWidth || 0);
      let minWidthNeeded = viewportW + (2 * wrapMargin) + (2 * originalWidth) + Math.max(cardStep, 1);

      let copies = 0;
      const MAX_COPIES = 10;
      while (((track.scrollWidth || 0) < minWidthNeeded) && copies < MAX_COPIES) {
        track.insertBefore(duplicateSet(orig), orig[0]);
        track.appendChild(duplicateSet(orig));
        copies++;

        measureGapsAndStep();
        measureAnchors();
        updateWrapMargin();

        minWidthNeeded = viewportW + (2 * wrapMargin) + (2 * originalWidth) + Math.max(cardStep, 1);
      }

      track.scrollTo({ left: leftAnchor, behavior: 'auto' });
      virtualX = track.scrollLeft;
      loopEnabled = true;
    };

    const wrapOffscreenIfNeeded = () => {
      if (!loopEnabled || originalWidth <= 0) return;

      const minX = leftAnchor - wrapMargin;
      const maxX = leftAnchor + originalWidth + wrapMargin;

      if (virtualX >= minX && virtualX < maxX) return;

      const rel = virtualX - leftAnchor;
      const norm = ((rel % originalWidth) + originalWidth) % originalWidth;
      virtualX = leftAnchor + norm;

      track.scrollLeft = virtualX;
    };

    const setPaused = (val) => {
      autoPaused = !!val;
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

      virtualX += spd * dt;
      track.scrollLeft = virtualX;

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

    const onPointerDown = (e) => {
      if (e.button !== 0) return;
      dragging = true;
      draggingActive = false;
      startX = e.clientX;
      startLeft = track.scrollLeft;

      autoPaused = true;

      dragPrevSnap = track.style.scrollSnapType || '';
      track.style.scrollSnapType = 'none';
    };

    const onPointerMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;

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

      track.style.scrollSnapType = dragPrevSnap || '';
      dragPrevSnap = '';

      requestAnimationFrame(() => { autoPaused = false; });

      dragging = false;
      draggingActive = false;
    };

    const pauseSoft = () => { autoPaused = true; };
    const resumeSoft = () => { autoPaused = false; };
    const onMouseEnter = () => pauseSoft();
    const onMouseLeave = () => resumeSoft();

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

    const onVisibility = () => {
      if (document.hidden) {
        if (rafId) stopAutoplay();
      } else {
        const rmwActive = prefersReduced.matches && !ignoreRMW();
        if (mqDesktop.matches && !rmwActive && section.dataset.linksReady === '1') {
          startAutoplay();
        }
      }
    };

    const enableDesktop = () => {
      if (section.dataset.linksReady === '1') return;
      section.dataset.linksReady = '1';
      carousel.dataset.linksReady = '1';

      // Distruggi mobile se attivo
      destroyMobileCarousel();

      forceDesktopStyles();
      buildLoopAdaptive();

      track.addEventListener('keydown', onKey);
      track.addEventListener('wheel', onWheel, { passive: false });
      track.addEventListener('pointerdown', onPointerDown, { passive: false });
      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', onPointerUp, { passive: false });
      window.addEventListener('resize', onResize, { passive: true });

      track.addEventListener('mouseenter', onMouseEnter);
      track.addEventListener('mouseleave', onMouseLeave);

      track.querySelectorAll('img').forEach(img => {
        img.addEventListener('load', onResize, { passive: true });
      });

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

      document.addEventListener('visibilitychange', onVisibility);

      startAutoplay();

      requestAnimationFrame(() => {
        track.classList.remove('is-initializing');
        track.classList.add('is-ready');

        const before = track.scrollLeft;
        const nudge = Math.max(8, Math.round(cardStep * 0.1));
        virtualX = before + nudge;
        track.scrollLeft = virtualX;
        wrapOffscreenIfNeeded();

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

    const disableDesktop = () => {
      if (!section.dataset.linksReady) return;
      delete section.dataset.linksReady;
      delete carousel.dataset.linksReady;

      stopAutoplay();

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

      if (io) { try { io.disconnect(); } catch(_) {} io = null; }

      clearDesktopStyles();
      cleanupClones();
      track.scrollTo({ left: 0, behavior: 'auto' });
      virtualX = 0;
      loopEnabled = false;
    };

    const handleMQ = () => {
      const hasCards = originals().length > 0;
      if (mqDesktop.matches && hasCards) {
        enableDesktop();
      } else {
        disableDesktop();
        if (hasCards) {
          initMobileCarousel();
        }
      }
    };

    let _mqResizeT;
    const onGlobalResize = () => {
      clearTimeout(_mqResizeT);
      _mqResizeT = setTimeout(handleMQ, 120);
    };
    window.addEventListener('resize', onGlobalResize, { passive: true });

    handleMQ();
    if (mqDesktop.addEventListener) mqDesktop.addEventListener('change', handleMQ);
    else if (mqDesktop.addListener) mqDesktop.addListener(handleMQ);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLinksCarousel, { once: true });
  } else {
    initLinksCarousel();
  }
})();
