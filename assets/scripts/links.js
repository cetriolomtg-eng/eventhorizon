/* ============================================================
   Links.js - Stack Deck Style (Semplificato)
   ============================================================ */
(() => {
  function initLinksSimple() {
    const section = document.querySelector('.links');
    if (!section) return;

    const track = section.querySelector('.links__track');
    if (!track) return;

    // A11y base
    track.setAttribute('tabindex', '0');
    track.setAttribute('aria-label', 'Elenco collegamenti');

    const mqDesktop = window.matchMedia('(min-width: 1024px)');

    // Su mobile: crea indicatori basati su scroll position
    let indicators = [];
    let indicatorsContainer = null;

    const createIndicators = () => {
      if (mqDesktop.matches) return;

      const cards = Array.from(track.querySelectorAll('.link-card'));
      if (cards.length === 0) return;

      // Crea container indicatori se non esiste
      if (!indicatorsContainer) {
        indicatorsContainer = document.createElement('div');
        indicatorsContainer.className = 'links__indicators';
        indicatorsContainer.setAttribute('role', 'tablist');
        indicatorsContainer.setAttribute('aria-label', 'Indicatori pagine');
        section.querySelector('.links__carousel').appendChild(indicatorsContainer);
      }

      indicatorsContainer.innerHTML = '';
      indicators = [];

      cards.forEach((card, i) => {
        const btn = document.createElement('button');
        btn.className = 'links__indicator';
        btn.setAttribute('type', 'button');
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-label', `Vai alla card ${i + 1}`);
        if (i === 0) {
          btn.classList.add('is-active');
          btn.setAttribute('aria-selected', 'true');
        } else {
          btn.setAttribute('aria-selected', 'false');
        }

        btn.addEventListener('click', () => {
          card.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          });
        });

        indicatorsContainer.appendChild(btn);
        indicators.push(btn);
      });
    };

    const updateIndicators = () => {
      if (mqDesktop.matches || indicators.length === 0) return;

      const cards = Array.from(track.querySelectorAll('.link-card'));
      const trackRect = track.getBoundingClientRect();
      const centerX = trackRect.left + trackRect.width / 2;

      let closestIndex = 0;
      let minDistance = Infinity;

      cards.forEach((card, i) => {
        const cardRect = card.getBoundingClientRect();
        const cardCenterX = cardRect.left + cardRect.width / 2;
        const distance = Math.abs(centerX - cardCenterX);

        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      });

      indicators.forEach((ind, i) => {
        if (i === closestIndex) {
          ind.classList.add('is-active');
          ind.setAttribute('aria-selected', 'true');
        } else {
          ind.classList.remove('is-active');
          ind.setAttribute('aria-selected', 'false');
        }
      });
    };

    const destroyIndicators = () => {
      if (indicatorsContainer) {
        indicatorsContainer.remove();
        indicatorsContainer = null;
        indicators = [];
      }
    };

    const handleMQ = () => {
      if (mqDesktop.matches) {
        destroyIndicators();
      } else {
        createIndicators();
      }
    };

    // Init
    handleMQ();

    // Update indicators on scroll (mobile)
    let scrollTimeout;
    track.addEventListener('scroll', () => {
      if (!mqDesktop.matches) {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(updateIndicators, 100);
      }
    }, { passive: true });

    // Resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleMQ, 150);
    }, { passive: true });

    // Media query change
    if (mqDesktop.addEventListener) {
      mqDesktop.addEventListener('change', handleMQ);
    } else if (mqDesktop.addListener) {
      mqDesktop.addListener(handleMQ);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLinksSimple, { once: true });
  } else {
    initLinksSimple();
  }
})();
