/* ============================================================
   Links.js - Stack/Deck Carousel
   ============================================================ */
(() => {
  // ===== Config =====
  const DEFAULT_INTERVAL = 5000;    // ms tra le card (autoplay)
  const DEFAULT_DURATION = 400;     // ms animazione transizione

  function initStackCarousel() {
    const section = document.querySelector('.links');
    if (!section) return;

    const carousel = section.querySelector('.links__carousel');
    const track = section.querySelector('.links__track');
    if (!track) return;

    // Raccogli tutte le card
    const cards = Array.from(track.querySelectorAll('.link-card'));
    if (cards.length === 0) return;

    // Media query per prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    // ===== Stato =====
    let currentIndex = 0;
    let autoplayTimer = null;
    let isAnimating = false;
    let isPaused = false;

    // ===== Leggi parametri da CSS =====
    const getInterval = () => {
      const val = parseInt(getComputedStyle(section).getPropertyValue('--links-stack-interval'), 10);
      return (val && val > 0) ? val : DEFAULT_INTERVAL;
    };

    const ignoreRMW = () => {
      const val = parseFloat(getComputedStyle(section).getPropertyValue('--links-auto-ignore-rmw'));
      return val > 0;
    };

    // ===== Update stack visuale =====
    const updateStack = () => {
      cards.forEach((card, i) => {
        // Rimuovi tutte le classi di stato
        card.classList.remove('is-active', 'is-next', 'is-after-next', 'is-prev');

        if (i === currentIndex) {
          // Card attiva (in primo piano)
          card.classList.add('is-active');
        } else if (i === (currentIndex + 1) % cards.length) {
          // Card successiva (visibile dietro)
          card.classList.add('is-next');
        } else if (i === (currentIndex + 2) % cards.length) {
          // Card dopo la successiva (ancora più dietro)
          card.classList.add('is-after-next');
        } else if (i === (currentIndex - 1 + cards.length) % cards.length) {
          // Card precedente (esce)
          card.classList.add('is-prev');
        }
        // Tutte le altre restano nascoste (opacity: 0)
      });

      // Aggiorna dots
      updateDots();
    };

    // ===== Navigazione =====
    const goToSlide = (index, skipAnimation = false) => {
      if (isAnimating && !skipAnimation) return;
      if (index < 0 || index >= cards.length) return;

      isAnimating = true;
      currentIndex = index;
      updateStack();

      // Reset animating flag dopo la transizione
      const duration = skipAnimation ? 0 : DEFAULT_DURATION;
      setTimeout(() => {
        isAnimating = false;
      }, duration);

      // Resetta autoplay
      resetAutoplay();
    };

    const nextSlide = () => {
      goToSlide((currentIndex + 1) % cards.length);
    };

    const prevSlide = () => {
      goToSlide((currentIndex - 1 + cards.length) % cards.length);
    };

    // ===== Autoplay =====
    const startAutoplay = () => {
      if (autoplayTimer) clearTimeout(autoplayTimer);

      const rmwActive = prefersReduced.matches && !ignoreRMW();
      if (rmwActive || isPaused || document.visibilityState === 'hidden') return;

      autoplayTimer = setTimeout(() => {
        nextSlide();
      }, getInterval());
    };

    const stopAutoplay = () => {
      if (autoplayTimer) {
        clearTimeout(autoplayTimer);
        autoplayTimer = null;
      }
    };

    const resetAutoplay = () => {
      stopAutoplay();
      startAutoplay();
    };

    // ===== Dots =====
    let dotsContainer = section.querySelector('.links__dots');

    const createDots = () => {
      if (!dotsContainer) {
        // Crea container controlli se non esiste
        let controlsContainer = section.querySelector('.links__controls');
        if (!controlsContainer) {
          controlsContainer = document.createElement('div');
          controlsContainer.className = 'links__controls';
          carousel.parentElement.appendChild(controlsContainer);
        }

        // Crea freccia prev
        const prevArrow = document.createElement('button');
        prevArrow.className = 'links__arrow prev';
        prevArrow.setAttribute('type', 'button');
        prevArrow.setAttribute('aria-label', 'Card precedente');
        prevArrow.innerHTML = '‹';
        controlsContainer.appendChild(prevArrow);

        // Crea dots container
        dotsContainer = document.createElement('div');
        dotsContainer.className = 'links__dots';
        dotsContainer.setAttribute('role', 'tablist');
        dotsContainer.setAttribute('aria-label', 'Selettore card');
        controlsContainer.appendChild(dotsContainer);

        // Crea freccia next
        const nextArrow = document.createElement('button');
        nextArrow.className = 'links__arrow next';
        nextArrow.setAttribute('type', 'button');
        nextArrow.setAttribute('aria-label', 'Card successiva');
        nextArrow.innerHTML = '›';
        controlsContainer.appendChild(nextArrow);

        // Bind arrows
        prevArrow.addEventListener('click', () => {
          prevSlide();
          pauseTemporarily();
        });

        nextArrow.addEventListener('click', () => {
          nextSlide();
          pauseTemporarily();
        });
      }

      // Crea dots
      dotsContainer.innerHTML = '';
      cards.forEach((card, i) => {
        const dot = document.createElement('button');
        dot.className = 'links__dot';
        dot.setAttribute('type', 'button');
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', `Vai alla card ${i + 1} di ${cards.length}`);
        dot.setAttribute('aria-controls', card.id || `link-card-${i}`);

        if (i === currentIndex) {
          dot.classList.add('is-active');
          dot.setAttribute('aria-current', 'true');
        }

        dot.addEventListener('click', () => {
          goToSlide(i);
          pauseTemporarily();
        });

        dotsContainer.appendChild(dot);
      });
    };

    const updateDots = () => {
      if (!dotsContainer) return;
      const dots = dotsContainer.querySelectorAll('.links__dot');
      dots.forEach((dot, i) => {
        if (i === currentIndex) {
          dot.classList.add('is-active');
          dot.setAttribute('aria-current', 'true');
        } else {
          dot.classList.remove('is-active');
          dot.removeAttribute('aria-current');
        }
      });
    };

    // ===== Keyboard navigation =====
    const onKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          prevSlide();
          pauseTemporarily();
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextSlide();
          pauseTemporarily();
          break;
        case 'Home':
          e.preventDefault();
          goToSlide(0);
          pauseTemporarily();
          break;
        case 'End':
          e.preventDefault();
          goToSlide(cards.length - 1);
          pauseTemporarily();
          break;
      }
    };

    // ===== Touch/Swipe support =====
    let touchStartX = 0;
    let touchEndX = 0;
    const SWIPE_THRESHOLD = 50; // px

    const onTouchStart = (e) => {
      touchStartX = e.changedTouches[0].screenX;
    };

    const onTouchEnd = (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    };

    const handleSwipe = () => {
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) < SWIPE_THRESHOLD) return;

      if (diff > 0) {
        // Swipe left → next
        nextSlide();
      } else {
        // Swipe right → prev
        prevSlide();
      }

      pauseTemporarily();
    };

    // ===== Hover pause =====
    const pauseTemporarily = () => {
      isPaused = true;
      stopAutoplay();
      setTimeout(() => {
        isPaused = false;
        startAutoplay();
      }, 3000);
    };

    const onMouseEnter = () => {
      isPaused = true;
      stopAutoplay();
    };

    const onMouseLeave = () => {
      isPaused = false;
      startAutoplay();
    };

    // ===== Visibility change =====
    const onVisibilityChange = () => {
      if (document.hidden) {
        stopAutoplay();
      } else {
        startAutoplay();
      }
    };

    // ===== IntersectionObserver (pausa fuori viewport) =====
    let io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.intersectionRatio < 0.3) {
          isPaused = true;
          stopAutoplay();
        } else {
          if (!document.hidden) {
            isPaused = false;
            startAutoplay();
          }
        }
      }, { root: null, threshold: [0, 0.3, 1] });

      io.observe(section);
    }

    // ===== Init =====
    const init = () => {
      // Assegna ID alle card se mancano
      cards.forEach((card, i) => {
        if (!card.id) card.id = `link-card-${i}`;
      });

      // Crea dots
      createDots();

      // Setup iniziale
      updateStack();

      // A11y
      track.setAttribute('role', 'region');
      track.setAttribute('aria-label', 'Carousel collegamenti');

      // Bind eventi
      carousel.addEventListener('keydown', onKeyDown);
      carousel.addEventListener('touchstart', onTouchStart, { passive: true });
      carousel.addEventListener('touchend', onTouchEnd, { passive: true });
      carousel.addEventListener('mouseenter', onMouseEnter);
      carousel.addEventListener('mouseleave', onMouseLeave);
      document.addEventListener('visibilitychange', onVisibilityChange);

      // Avvia autoplay
      startAutoplay();

      // Marca come inizializzato
      section.dataset.linksReady = '1';
    };

    // ===== Cleanup =====
    const destroy = () => {
      stopAutoplay();
      carousel.removeEventListener('keydown', onKeyDown);
      carousel.removeEventListener('touchstart', onTouchStart);
      carousel.removeEventListener('touchend', onTouchEnd);
      carousel.removeEventListener('mouseenter', onMouseEnter);
      carousel.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (io) {
        io.disconnect();
        io = null;
      }
      delete section.dataset.linksReady;
    };

    // Start
    init();

    // Esponi API per debug (opzionale)
    if (typeof window !== 'undefined') {
      window.__linksCarousel = {
        next: nextSlide,
        prev: prevSlide,
        goto: goToSlide,
        destroy: destroy
      };
    }
  }

  // ===== Mount =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStackCarousel, { once: true });
  } else {
    initStackCarousel();
  }
})();
