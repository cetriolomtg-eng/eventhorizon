/* cards-carousel.js — homepage cards slider */
(function () {
  'use strict';

  function initCarousel(viewport) {
    const section = viewport.closest('.cards');
    const track = viewport.querySelector('.cards__track');
    if (!track) return;
    const slides = Array.from(track.querySelectorAll('.slide'));
    if (slides.length === 0) return;

    const btnPrev = section.querySelector('.cards__nav--prev');
    const btnNext = section.querySelector('.cards__nav--next');
    const overEl = section.querySelector('.cards__details-over');
    const titleEl = section.querySelector('.cards__details-title');
    const descEl = section.querySelector('.cards__details-desc');

    let current = 0;
    let ticking = false;

    function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

    function centerFor(index, smooth = true) {
      const slide = slides[index];
      if (!slide) return;
      const vpRect = viewport.getBoundingClientRect();
      const slRect = slide.getBoundingClientRect();
      const currentLeft = viewport.scrollLeft;
      const delta = (slRect.left - vpRect.left) + (slRect.width / 2) - (vpRect.width / 2);
      const target = currentLeft + delta;
      viewport.scrollTo({ left: target, behavior: smooth ? 'smooth' : 'auto' });
    }

    function applyState(index) {
      slides.forEach((s, i) => {
        s.classList.remove('is-active', 'is-prev', 'is-next');
        if (i === index) {
          s.classList.add('is-active');
          s.setAttribute('aria-current', 'true');
        } else {
          s.removeAttribute('aria-current');
        }
        if (i === index - 1) s.classList.add('is-prev');
        if (i === index + 1) s.classList.add('is-next');
      });
      // live details
      const s = slides[index];
      if (s) {
        if (overEl) overEl.textContent = s.getAttribute('data-overline') || '';
        if (titleEl) titleEl.textContent = s.getAttribute('data-title') || '';
        if (descEl) descEl.textContent = s.getAttribute('data-desc') || '';
      }
    }

    function setCurrent(index, opts = { smooth: true, focus: false }) {
      current = clamp(index, 0, slides.length - 1);
      applyState(current);
      centerFor(current, opts.smooth);
      if (opts.focus) {
        const focusable = slides[current].querySelector('a,button,[tabindex]');
        (focusable || slides[current]).focus({ preventScroll: true });
      }
    }

    function nearestToCenter() {
      const vpRect = viewport.getBoundingClientRect();
      const vpCenter = vpRect.left + vpRect.width / 2;
      let best = 0;
      let bestDist = Infinity;
      slides.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        const c = r.left + r.width / 2;
        const d = Math.abs(c - vpCenter);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      return best;
    }

    // Events
    viewport.addEventListener('scroll', () => {
      if (ticking) return;
      window.requestAnimationFrame(() => {
        const idx = nearestToCenter();
        if (idx !== current) {
          current = idx;
          applyState(current);
        }
        ticking = false;
      });
      ticking = true;
    }, { passive: true });

    btnPrev && btnPrev.addEventListener('click', () => setCurrent(current - 1));
    btnNext && btnNext.addEventListener('click', () => setCurrent(current + 1));

    // Keyboard navigation
    viewport.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); setCurrent(current - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); setCurrent(current + 1); }
    });

    // Click a slide to focus it
    track.addEventListener('click', (e) => {
      const slide = e.target.closest('.slide');
      if (!slide) return;
      const index = slides.indexOf(slide);
      if (index >= 0) setCurrent(index);
    });

    // Resize handling keeps active centered
    window.addEventListener('resize', () => centerFor(current, false));

    // Init
    // Make viewport focusable for keyboard arrows
    viewport.setAttribute('tabindex', '0');
    applyState(current);
    centerFor(current, false);
  }

  function ready(fn){
    if (document.readyState !== 'loading') { fn(); }
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    document.querySelectorAll('.js-cards-carousel').forEach(initCarousel);
  });
})();

