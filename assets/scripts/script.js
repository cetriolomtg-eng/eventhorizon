/* ============================================================
   Script.js
   ============================================================ */
// Shadow on scroll per la navbar
(function(){
  const nav = document.getElementById('site-nav');
  if(!nav) return;

  const onScroll = () => {
    if (window.scrollY > 0) nav.classList.add('is-scrolled');
    else nav.classList.remove('is-scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// Hero background da data-attribute -> imposta la CSS var usata in ::after
(function(){
  const hero = document.querySelector('.hero.has-hero-bg');
  if(!hero) return;

  const url = hero.getAttribute('data-bg');
  if(url && url.trim() !== ''){
    hero.style.setProperty('--hero-bg-url', `url("${url}")`);
  }
})();

// Navbar toggle / menu mobile
(function(){
  const nav = document.getElementById('site-nav');
  if (!nav) return;

  const toggleBtn = nav.querySelector('.nav__toggle');
  const menu = nav.querySelector('.nav__menu');
  if (!toggleBtn || !menu) return;

  const mqDesktop = window.matchMedia('(min-width: 1024px)');

  function closeMenu(){
    nav.classList.remove('is-open');
    toggleBtn.setAttribute('aria-expanded', 'false');
  }
  function openMenu(){
    nav.classList.add('is-open');
    toggleBtn.setAttribute('aria-expanded', 'true');
  }
  function toggleMenu(){
    const isOpen = nav.classList.contains('is-open');
    isOpen ? closeMenu() : openMenu();
  }

  // Click hamburger
  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    toggleMenu();
  });

  // Chiudi con ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  // Chiudi quando si clicca un link del menu (solo mobile/tablet)
  menu.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    if (!mqDesktop.matches) closeMenu();
  });

  // Reset stato quando si entra in desktop
  const onMQ = () => { if (mqDesktop.matches) closeMenu(); };
  (mqDesktop.addEventListener ? mqDesktop.addEventListener('change', onMQ)
                              : mqDesktop.addListener(onMQ));
})();

//chiudi al tap fuori dal menù
(() => {
  const mqlDesktop = window.matchMedia('(min-width: 1024px)');
  const toggle = document.querySelector('.nav__toggle');
  if (!toggle) return;

  const BACKDROP_CLASS = 'nav__backdrop';

  function addBackdrop() {
    if (document.querySelector('.' + BACKDROP_CLASS)) return;
    const bd = document.createElement('div');
    bd.className = BACKDROP_CLASS;
    bd.addEventListener('click', () => {
      // Usa la tua logica esistente: simula il click sul toggle per chiudere
      toggle.click();
    }, { passive: true });
    document.body.appendChild(bd);
  }

  function removeBackdrop() {
    const bd = document.querySelector('.' + BACKDROP_CLASS);
    if (bd) bd.remove();
  }

  // Osserva lo stato del toggle: quando aria-expanded diventa true → aggiungi backdrop; false → rimuovi
  const obs = new MutationObserver(() => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    if (expanded && !mqlDesktop.matches) addBackdrop();
    else removeBackdrop();
  });
  obs.observe(toggle, { attributes: true, attributeFilter: ['aria-expanded'] });

  // Cleanup su cambio viewport (entrata in desktop)
  mqlDesktop.addEventListener?.('change', (e) => {
    if (e.matches) removeBackdrop();
  });
})();

/* Hero chevrons: scroll to #portal (mobile only) >>> */
(function () {
  const chevrons = document.querySelector('.hero-cta--chevrons');
  if (!chevrons) return;

  if (chevrons.dataset.chevronsBound === '1') return;
  chevrons.dataset.chevronsBound = '1';

  const mqMobile = window.matchMedia('(max-width: 767.98px)');

  const onChevronClick = (ev) => {
    if (!mqMobile.matches) return;

    // Trova la sezione PORTAL (nuova logica)
    const target = document.getElementById('portal') || document.querySelector('#portal');
    if (!target) return; // fallback: lascia il default dell'anchor

    ev.preventDefault();
    try {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (_) {
      // Fallback robusto
      const y = target.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  chevrons.addEventListener('click', onChevronClick, { passive: false });
})();

/* Portal background parallax >>> */
(function(){
  const portal = document.querySelector('.portal');
  if(!portal) return;

  const portalBg = portal.querySelector('.portal::before') || portal;
  let ticking = false;

  const updateParallax = () => {
    const scrolled = window.scrollY;
    const portalTop = portal.offsetTop;
    const portalHeight = portal.offsetHeight;
    const windowHeight = window.innerHeight;

    // Calcola se la sezione è nel viewport
    if(scrolled + windowHeight > portalTop && scrolled < portalTop + portalHeight){
      const offset = (scrolled - portalTop) * 0.3; // Fattore parallax 0.3
      portal.style.setProperty('--portal-parallax', `${offset}px`);
    }
    ticking = false;
  };

  const onScroll = () => {
    if(!ticking){
      window.requestAnimationFrame(updateParallax);
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  updateParallax(); // Init
})();

/* Image fallback handler >>> */
(function() {
  // Placeholder path relativo alla base del sito
  const FALLBACK_IMAGE = 'images/cards/fblthp_placeholder.webp';

  const handleImageError = (img) => {
    // Evita loop infiniti
    if (img.dataset.fallbackApplied === '1') return;
    img.dataset.fallbackApplied = '1';

    // Ottieni base URL dal documento
    const base = document.documentElement.getAttribute('data-base-url') || window.location.origin;
    const normalized = base.replace(/\/$/, '');

    // Applica il fallback
    img.src = `${normalized}/${FALLBACK_IMAGE}`;
    img.alt = img.alt || 'Immagine non disponibile';

    // Aggiungi classe per styling opzionale
    img.classList.add('img-fallback');
  };

  // Gestione errori su tutte le immagini esistenti e future
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeName === 'IMG') {
          node.addEventListener('error', function() { handleImageError(this); }, { once: true });
        } else if (node.querySelectorAll) {
          node.querySelectorAll('img').forEach((img) => {
            img.addEventListener('error', function() { handleImageError(this); }, { once: true });
          });
        }
      });
    });
  });

  // Osserva tutto il documento per immagini dinamiche
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Gestisci immagini già presenti nel DOM
  document.querySelectorAll('img').forEach((img) => {
    img.addEventListener('error', function() { handleImageError(this); }, { once: true });
  });
})();
