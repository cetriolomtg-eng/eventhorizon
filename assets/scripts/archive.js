/**
 * /script/archive.js â€” EventHorizon.mtg (Archivio)
 * - Bottom-sheet mobile (overlay, focus-trap, drag handle)
 * - Chevron: sheet su mobile, pannello full-width su desktop
 * - Search: reset e placeholder responsive
 * - Filter mobile: popover "Tutti/Video/Contenuti" (non applica subito); bottone attivo se kind â‰  ""
 */

(() => {
  'use strict';
  // GATE: esegui solo nella pagina Archivio
  if (!document.querySelector('section.archive')) return;

  /* ==========================
   * Config & helpers (UI)
   * ========================== */
  const MQ_SHEET = '(max-width: 1023.98px)'; // mobile/tablet: sheet e popover
  const MQ_PHONE = '(max-width: 768px)';     // placeholder breve "Cerca"

  const TRUE = 'true';
  const FALSE = 'false';

  const qs  = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on  = (el, ev, cb, opts) => el && el.addEventListener(ev, cb, opts);
  const set = (el, name, val) => el && el.setAttribute(name, String(val));

  const mqSheet = window.matchMedia ? window.matchMedia(MQ_SHEET) : { matches: true, addEventListener(){} };
  const mqPhone = window.matchMedia ? window.matchMedia(MQ_PHONE) : { matches: false, addEventListener(){} };

  const getURL = () => new URL(window.location.href);
  const getParam = (name) => getURL().searchParams.get(name);

  /* ==========================
   * 1) Bottom-sheet (mobile) + Focus Trap
   * ========================== */
  (() => {
    const sheet    = qs('.archive-sheet');
    const backdrop = qs('.archive-sheet-backdrop');
    if (!sheet || !backdrop) return; // fail-safe

    const btnClose = qs('.archive-sheet__close', sheet);
    const handle   = qs('.archive-sheet__handle', sheet);
    const titleEl  = qs('#archive-sheet-title', sheet);
    const content  = qs('.archive-sheet__content', sheet);
    const ctas     = qs('.archive-sheet__ctas', sheet);

    let lastFocus = null;
    let currentItem = null;

    const trapFocus = (ev) => {
      if (ev.key !== 'Tab') return;
      const focusables = qsa('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])', sheet)
        .filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
      if (!focusables.length) return;
      const first = focusables[0];
      const last  = focusables[focusables.length - 1];
      if (ev.shiftKey && document.activeElement === first) { last.focus(); ev.preventDefault(); }
      else if (!ev.shiftKey && document.activeElement === last) { first.focus(); ev.preventDefault(); }
    };

    const openSheet = (payload, fromItem) => {
      if (!mqSheet.matches) return; // solo mobile/tablet
      lastFocus = document.activeElement;
      currentItem = fromItem || null;

      titleEl.textContent = payload.title || '';
      content.innerHTML   = payload.descHtml || '';
      ctas.innerHTML      = '';
      (payload.links || []).forEach(link => {
        const a = document.createElement('a');
        a.className   = link.cls || 'pill btn--primary';
        a.href        = link.url;
        a.target      = '_blank';
        a.rel         = 'noopener';
        a.title       = link.lab || 'Apri';
        a.textContent = link.lab || 'Apri';
        ctas.appendChild(a);
      });

      sheet.setAttribute('aria-hidden', 'false');
      backdrop.setAttribute('aria-hidden', 'false');
      sheet.classList.add('is-open');
      backdrop.classList.add('is-open');
      document.body.classList.add('is-sheet-open');
      if (currentItem) { try { currentItem.classList.add('is-sheet-open'); } catch(_) {} }

      sheet.addEventListener('keydown', trapFocus);
      (btnClose || sheet).focus();
    };

    const closeSheet = () => {
      sheet.setAttribute('aria-hidden', 'true');
      backdrop.setAttribute('aria-hidden', 'true');
      sheet.classList.remove('is-open');
      backdrop.classList.remove('is-open');
      document.body.classList.remove('is-sheet-open');
      if (currentItem) { try { currentItem.classList.remove('is-sheet-open'); } catch(_) {} currentItem = null; }
      sheet.removeEventListener('keydown', trapFocus);
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    };

    on(btnClose, 'click', closeSheet);
    on(backdrop, 'click', closeSheet);

    // Drag handle to close
    let startY = null, lastY = null;
    const onStart = (e) => { startY = (e.touches ? e.touches[0].clientY : e.clientY); lastY = startY; };
    const onMove  = (e) => { if (startY == null) return; lastY = (e.touches ? e.touches[0].clientY : e.clientY); };
    const onEnd   = () => { if (startY != null && lastY != null && (lastY - startY) > 60) closeSheet(); startY = lastY = null; };
    on(handle, 'mousedown', onStart);
    on(handle, 'mousemove', onMove);
    on(handle, 'mouseup',   onEnd);
    on(handle, 'touchstart', onStart, { passive: true });
    on(handle, 'touchmove',  onMove,  { passive: true });
    on(handle, 'touchend',   onEnd);

    // Apertura (mobile) dallo stesso pulsante usato su desktop
    document.addEventListener('click', (ev) => {
      const btn = ev.target && ev.target.closest('.item-actions-summary');
      if (!btn || !mqSheet.matches) return;

      const article = btn.closest('.item');
      const li = article && article.closest('.archive-item');
      if (!li) return;

      const panel = li.querySelector('.item-panel');
      const desc  = panel ? panel.querySelector('.item-summary') : null;
      const ctaEls = panel ? qsa('.item-ctas a', panel) : [];
      const title = article.querySelector('.item-title')?.textContent || '';

      const links = ctaEls.map(a => ({
        url: a.getAttribute('href'),
        lab: a.textContent.trim(),
        cls: a.className
      }));

      openSheet({
        title,
        descHtml: desc ? `<p class="item-summary">${desc.textContent}</p>` : '',
        links
      }, article);
      ev.preventDefault();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sheet.getAttribute('aria-hidden') === 'false') closeSheet();
    });
  })();

  /* ==========================
   * 2) Pannello desktop (in-row)
   * ========================== */
  (() => {
    const mqSheet2 = window.matchMedia ? window.matchMedia('(max-width: 1023.98px)') : { matches: true };
    const onDesktopToggle = (ev) => {
      if (mqSheet2.matches) return; // solo desktop
      const item = ev.target && ev.target.closest('.item'); if (!item) return;
      const li = item.closest('.archive-item'); if (!li) return;
      const panel = qs('.item-panel', li);
      const trigger = qs('.item-actions-summary', item);
      if (!panel || !trigger) return;
      const willOpen = !item.classList.contains('is-open');
      item.classList.toggle('is-open', willOpen);
      set(trigger, 'aria-expanded', willOpen ? TRUE : FALSE);
      try { panel.hidden = !willOpen; } catch {}
    };

    document.addEventListener('click', (ev) => {
      const btn = ev.target && ev.target.closest('.item-actions-summary');
      if (!btn) return;
      if (!mqSheet2.matches) onDesktopToggle(ev);
    });
  })();

  /* ==========================
   * 3) Search UI (placeholder responsive)
   * ========================== */
  (() => {
    const form = qs('#archive-search-form'); if (!form) return;
    const q = qs('#q', form);
    const onMQ = () => {
      if (!q) return;
      q.placeholder = mqPhone.matches ? 'Cerca' : 'Cerca per titolo, descrizione, tag';
    };
    onMQ();
    mqPhone.addEventListener && mqPhone.addEventListener('change', onMQ);
  })();

  /* ==========================
   * 4) Search Reset + Filter (popover mobile)
   * ========================== */
  (() => {
    const form   = qs('#archive-search-form');
    const qInput = qs('#q', form || document);
    const sel    = qs('#kind', form || document);
    const btn    = qs('.archive-search__filter-toggle', form || document);

    // Stato iniziale bottone filtro in base alla URL
    const urlKind = (getParam('kind') || '').toLowerCase();
    if (sel) sel.value = (urlKind === 'video' || urlKind === 'content') ? urlKind : '';
    const active = !!(sel && sel.value !== '');
    if (btn) {
      btn.setAttribute('aria-pressed', active ? TRUE : FALSE);
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-expanded', FALSE);
    }
    if (qInput) qInput.value = getParam('q') || '';

    // Popover
    let popoverEl = null;
    const closePopover = () => {
      if (popoverEl && popoverEl.parentNode) popoverEl.parentNode.removeChild(popoverEl);
      popoverEl = null;
      if (btn) btn.setAttribute('aria-expanded', FALSE);
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
    const onDocClick = (e) => {
      if (!popoverEl) return;
      const inside = e.target && (popoverEl.contains(e.target) || (btn && btn.contains(e.target)));
      if (!inside) closePopover();
    };
    const onKeyDown = (e) => { if (e.key === 'Escape') closePopover(); };

    const openPopover = () => {
      if (popoverEl) closePopover();

      popoverEl = document.createElement('div');
      popoverEl.className = 'filter-popover';
      popoverEl.setAttribute('role', 'menu');
      popoverEl.setAttribute('aria-label', 'Filtro contenuti');

      const current = sel ? sel.value : '';
      popoverEl.innerHTML = `
        <ul class="filter-popover__list" role="none">
          <li role="none">
            <button type="button" class="filter-popover__item" role="menuitemradio" aria-checked="${current===''?'true':'false'}" data-value="">Tutti</button>
          </li>
          <li role="none">
            <button type="button" class="filter-popover__item" role="menuitemradio" aria-checked="${current==='video'?'true':'false'}" data-value="video">Video</button>
          </li>
          <li role="none">
            <button type="button" class="filter-popover__item" role="menuitemradio" aria-checked="${current==='content'?'true':'false'}" data-value="content">Contenuti</button>
          </li>
        </ul>
      `;

      document.body.appendChild(popoverEl);

      // Posizionamento vicino al bottone
      const rect = btn.getBoundingClientRect();
      const gap = 8;
      const width = Math.max(rect.width, 180);
      const maxLeft = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left));
      Object.assign(popoverEl.style, {
        position: 'fixed',
        top: `${Math.min(window.innerHeight - 8, rect.bottom + gap)}px`,
        left: `${maxLeft}px`,
        minWidth: `${width}px`,
        zIndex: '10000'
      });

      // Focus al corrente
      const currentBtn = popoverEl.querySelector('.filter-popover__item[aria-checked="true"]')
                          || popoverEl.querySelector('.filter-popover__item');
      currentBtn && currentBtn.focus({ preventScroll: true });

      // Eventi globali per chiusura
      document.addEventListener('click', onDocClick, true);
      document.addEventListener('keydown', onKeyDown, true);

      // Scelta (NON applica subito; si applica alla submit del form)
      popoverEl.addEventListener('click', (e) => {
        const b = e.target && e.target.closest('.filter-popover__item');
        if (!b) return;
        const val = (b.getAttribute('data-value') || '').toLowerCase();
        if (sel) {
          sel.value = (val === 'video' || val === 'content') ? val : '';
          const isActive = sel.value !== '';
          if (btn) {
            btn.setAttribute('aria-pressed', isActive ? TRUE : FALSE);
            btn.classList.toggle('is-active', isActive);
          }
        }
        closePopover();
        btn && btn.focus();
      });

      btn && btn.setAttribute('aria-expanded', TRUE);
    };

    // Click bottone filtro
    document.addEventListener('click', (e) => {
      const t = e.target && e.target.closest('.archive-search__filter-toggle');
      if (!t) return;
      if (mqSheet.matches) { e.preventDefault(); popoverEl ? closePopover() : openPopover(); }
      else { const sel = document.getElementById('kind'); if (sel) sel.focus(); }
    });

    // Submit: riparti da pagina 1
    if (form) on(form, 'submit', () => {
      try { const u = new URL(form.action || window.location.href); u.searchParams.delete('p'); form.action = u.toString(); } catch {}
    });

    // Reset (delegato)
    document.addEventListener('click', (e) => {
      const resetBtn = e.target && e.target.closest('.archive-search__reset');
      if (!resetBtn) return;
      e.preventDefault();
      closePopover();

      const u = new URL(window.location.href);
      u.searchParams.delete('q');
      u.searchParams.delete('p');
      u.searchParams.delete('kind');

      if (qInput) qInput.value = '';
      if (sel)    sel.value = '';

      if (btn) {
        btn.setAttribute('aria-pressed', FALSE);
        btn.classList.remove('is-active');
        btn.setAttribute('aria-expanded', FALSE);
      }
      window.location.href = u.toString();
    });
  })();
})();

/* ============================================================
 * Data & Render layer â€” Replica WHERE/ORDER BY/LIMIT/OFFSET del legacy
 * ============================================================ */
(() => {
  'use strict';
  // GATE: esegui solo nella pagina Archivio
  if (!document.querySelector('section.archive')) return;

  // Helpers (Data)
  const qs  = (sel, root = document) => root.querySelector(sel);
  const text = (v) => (v == null ? '' : String(v));
  const lower = (v) => text(v).toLowerCase();
  const trim = (v) => text(v).trim();
  const getURL = () => new URL(window.location.href);
  const getParam = (name) => getURL().searchParams.get(name);
  const LIKE = (haystack, needle) => lower(haystack).includes(lower(needle));
  const isAbsolute = (u) => /^(data:|https?:|\/\/)/i.test(u);
  const getBaseURL = () => {
    const b = (document.documentElement.getAttribute('data-base-url') || '').trim();
    return b.replace(/\/$/, '');
  };
  const toSiteURL = (u) => {
    if (!u) return '';
    if (isAbsolute(u)) return u;
    const base = getBaseURL();
    const clean = String(u).replace(/^\/+/, '');
    return base ? `${base}/${clean}` : `/${clean}`;
  };
  const bustIfLocal = (u, ver) => {
    const src = toSiteURL(u);
    if (!ver) return src;
    const sep = src.includes('?') ? '&' : '?';
    return `${src}${sep}v=${ver}`;
  };
  const buildArchiveEndpoint = (base, version) => {
    const cleanBase = trim(base || '');
    const finalBase = cleanBase || '/archive/list.json';
    const ver = trim(version || '');
    if (!ver) return finalBase;
    try {
      const url = new URL(finalBase, window.location.origin);
      url.searchParams.set('v', ver);
      return url.toString();
    } catch {
      const sep = finalBase.includes('?') ? '&' : '?';
      return `${finalBase}${sep}v=${ver}`;
    }
  };

  // Tag matching flessibile (token + frase)
  const makeTagsCSV = (tagsArr) => {
    const arr = Array.isArray(tagsArr) ? tagsArr : [];
    const csv = arr.map((t) => lower(t)).join(',');
    return `,${csv},`;
  };
  const matchTagsFlexible = (tagsArr, q) => {
    const wrapped = makeTagsCSV(tagsArr);
    const qLower  = lower(q).trim();
    if (!qLower) return false;
    const tokens = qLower.split(/\s+/).filter(Boolean);
    for (let i = 0; i < tokens.length; i++) if (wrapped.includes(tokens[i])) return true;
    if (wrapped.includes(qLower)) return true;
    return false;
  };

  // Pill mapping
  const normalizeBtnVariant = (raw) => {
    const t = lower(trim(raw));
    if (!t) return 'btn--primary';
    const m = t.match(/\\bbtn--[a-z0-9\\-]+\\b/); if (m) { if (m[0] === 'btn--teal') return 'btn--secondary'; if (m[0] === 'btn--base') return 'btn--primary'; if (m[0] === 'btn--gold') return 'btn--accent'; return m[0]; }
    const map = {
      'magenta':'btn--secondary',
      'youtube':'btn--yt','yt':'btn--yt',
      'scryfall':'btn--scry','scry':'btn--scry',
      'edhrec':'btn--edh','edh':'btn--edh',
      'moxfield':'btn--mox','mox':'btn--mox',
      
      'archidekt':'btn--archi','archi':'btn--archi',
      'indigostroke':'btn--base','tealstroke':'btn--base','alphab':'btn--base','acid':'btn--base','pink':'btn--base','orange':'btn--base',
      'teal':'btn--secondary','gold':'btn--accent','accent':'btn--accent',
      'primary':'primary',
      'indigo':'btn--primary','base':'btn--primary','default':'btn--primary',
    };
    const parts = t.split(/\s+/);
    for (const p of parts) if (map[p]) return map[p];
    for (const k in map) if (t.includes(k)) return map[k];
    return 'btn--primary';
  };
  const variantFromUrl = (url) => {
    try {
      const host = new URL(url, window.location.origin).host.toLowerCase();
      if (host.includes('youtube.com') || host.includes('youtu.be')) return 'btn--yt';
      if (host.includes('scryfall.com')) return 'btn--scry';
      if (host.includes('edhrec.com'))   return 'btn--edh';
      if (host.includes('moxfield.com')) return 'btn--mox';
      if (host.includes('archidekt.com'))return 'btn--archi';
    } catch {}
    return null;
  };
  const pillClassFrom = (btnRaw, url) => {
    let v = normalizeBtnVariant(btnRaw);
    if (v === 'btn--base') { const u = variantFromUrl(url); if (u) v = u; }
    return `pill ${v}`;
  };
  const pillLabel = (label, url) => {
    const L = trim(label);
    if (L) return L;
    try { const host = new URL(url, window.location.origin).host; return host || 'Apri'; }
    catch { return 'Apri'; }
  };

  // Stato/pager
  const getPage = () => {
    const n = parseInt(getParam('p') || '1', 10);
    return isNaN(n) || n < 1 ? 1 : n;
  };
  const getPageSize = () => {
    const attr = document.documentElement.getAttribute('data-archive-page-size');
    const n = parseInt(attr || '12', 10);
    return (isNaN(n) ? 12 : Math.max(5, Math.min(24, n)));
  };

  // Parametri URL correnti
  const q  = trim(getParam('q') || '');
  const k  = (getParam('kind') || '').toLowerCase().trim();

  // Render item (markup identico)
  const renderItem = (it) => {
    const idStr = text(it.id);
    const kindClass = lower(text(it.kind) || 'content');
    const over  = trim(it.overline || '');
    const tit   = trim(it.title || '');
    const desc  = trim(it.desc || '');

    let thumbWeb = trim(it.thumb || '');
    const appVer = document.documentElement.getAttribute('data-app-ver') || '';
    const thumbSrc = bustIfLocal(thumbWeb || 'images/cards/fblthp_placeholder.webp', appVer);

    const links = Array.isArray(it.links) ? it.links.slice().sort((a,b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)) : [];

    let primaryIndex = null;
    for (let i = 0; i < links.length; i++) {
      const raw = lower(links[i]?.btn_class || '');
      if (raw && /\bprimary\b/.test(raw)) { primaryIndex = i; break; }
    }
    const primaryUrl = (primaryIndex != null) ? trim(links[primaryIndex].href || '') : '';

    const otherPills = [];
    for (let i = 0; i < links.length; i++) {
      if (i === primaryIndex) continue;
      const L = links[i]; const url = trim(L?.href || ''); if (!url) continue;
      otherPills.push({ url, lab: pillLabel(L?.label || '', url), cls: pillClassFrom(L?.btn_class || '', url) });
    }

    const linksId = `links-${idStr.replace(/[^a-zA-Z0-9_\-]+/g, '-')}`;
    const otherCount = otherPills.length;
    const hasDropdown = (!!desc) || (otherCount > 0);
    const summaryLabel = otherCount > 0 ? `Dettagli e link (${otherCount})` : 'Dettagli';

    const pillCtas = otherCount
      ? `<div class="item-ctas" role="group" aria-label="Collegamenti">
           ${otherPills.map(P => `<a class="${P.cls}" href="${P.url}" target="_blank" rel="noopener" title="${P.lab}">${P.lab}</a>`).join('')}
         </div>` : '';

    const li = document.createElement('li');
    li.className = `archive-item is-${kindClass}`;
    li.innerHTML = `
      <article class="item" data-item-id="${idStr}" data-kind="${kindClass}">
        <header class="item-head">
          ${over ? `<p class="item-overline">${over}</p>` : ''}
          <h2 class="item-title">${tit}</h2>
        </header>
        ${
          primaryUrl
          ? `<a class="item-thumb${primaryUrl && /\bprimary\b/.test(lower(links[primaryIndex]?.btn_class || '')) ? ' primary' : ''}"
                href="${primaryUrl}" target="_blank" rel="noopener" aria-label="Apri: ${tit}">
               <img src="${thumbSrc}" alt="Anteprima: ${tit}" loading="lazy" decoding="async">
             </a>`
          : `<figure class="item-thumb">
               <img src="${thumbSrc}" alt="Anteprima: ${tit}" loading="lazy" decoding="async">
             </figure>`
        }
        ${ hasDropdown
            ? `<button class="item-actions-summary" type="button" aria-controls="${linksId}" aria-expanded="false">
                 <span class="sr-only">${summaryLabel}</span>
               </button>`
            : ''
        }
      </article>
      ${
        hasDropdown
        ? `<div class="item-panel" id="${linksId}" hidden>
             ${desc ? `<div class="item-descbar"><p class="item-summary">${desc}</p></div>` : ''}
             ${pillCtas}
           </div>`
        : ''
      }
    `;
    return li;
  };

  // Filtro / sort / paginazione
  const filterItems = (arr, q, kind) => {
    const Q = lower(q).trim();
    const K = lower(kind);
    return arr.filter((it) => {
      if (K && K !== lower(it.kind || '')) return false;
      if (!Q) return true;
      const inText = LIKE(it.title || '', Q) || LIKE(it.overline || '', Q) || LIKE(it.desc || '', Q);
      const inTags = matchTagsFlexible(it.tags || [], Q);
      return inText || inTags;
    });
  };
  const parseDate = (d) => { const t = Date.parse(d); return isNaN(t) ? 0 : t; };
  const sortItems = (arr) => arr.slice().sort((a, b) => {
    const ad = parseDate(a.date), bd = parseDate(b.date);
    if (ad !== bd) return bd - ad;
    const aid = text(a.id), bid = text(b.id);
    return (aid < bid) ? 1 : (aid > bid ? -1 : 0);
  });
  const paginate = (arr, page, pageSize) => {
    const total = arr.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const p = Math.min(Math.max(1, page), pages);
    const start = (p - 1) * pageSize;
    const end = start + pageSize;
    return { total, pages, page: p, slice: arr.slice(start, end) };
  };

  // Pager & count UI
  const updatePager = (state) => {
    const pager = qs('.archive-pager');
    if (!pager) return;
    const url = getURL();
    const { page, pages } = state;
    const prevA = pager.querySelector('a[rel="prev"]');
    const nextA = pager.querySelector('a[rel="next"]');
    const curr  = pager.querySelector('.curr');

    const setHref = (a, target) => {
      if (!a) return;
      const u = new URL(url);
      u.searchParams.set('p', target);
      const qVal = getParam('q'); const kVal = getParam('kind');
      if (qVal) u.searchParams.set('q', qVal); else u.searchParams.delete('q');
      if (kVal) u.searchParams.set('kind', kVal); else u.searchParams.delete('kind');
      a.href = u.toString();
    };

    const prevDisabled = page <= 1;
    if (prevA) {
      prevA.classList.toggle('disabled', prevDisabled);
      prevA.setAttribute('aria-disabled', prevDisabled ? 'true' : 'false');
      setHref(prevA, prevDisabled ? 1 : (page - 1));
      prevA.rel = 'prev';
    }
    if (curr) curr.textContent = `Pag. ${page} / ${pages}`;
    const nextDisabled = page >= pages;
    if (nextA) {
      nextA.classList.toggle('disabled', nextDisabled);
      nextA.setAttribute('aria-disabled', nextDisabled ? 'true' : 'false');
      setHref(nextA, nextDisabled ? pages : (page + 1));
      nextA.rel = 'next';
    }
  };
  const updateHeroCount = (n) => {
    const strong = qs('.archive-hero .filter-note strong');
    if (strong) strong.textContent = new Intl.NumberFormat('it-IT').format(n);
  };

  // Render lista (confinato nel container Archivio)
  const renderList = (arr) => {
    const sectionArchive = document.querySelector('section.archive');
    if (!sectionArchive) return; // safety
    const container = sectionArchive.querySelector('.container') || sectionArchive;

    // assicurati che esista l'OL
    let listOl = container.querySelector('ol.archive-timeline');
    if (!listOl) {
      listOl = document.createElement('ol');
      listOl.className = 'archive-timeline';
      container.appendChild(listOl);
    }

    // svuota e renderizza
    listOl.innerHTML = '';
    if (!arr.length) {
      // mostra messaggio e rimuovi l'OL
      const p = document.createElement('p');
      p.className = 'empty';
      p.setAttribute('role', 'status');
      p.setAttribute('aria-live', 'polite');
      const qVal = trim(getParam('q') || '');
      p.innerHTML = `Nessun risultato per <em>${qVal}</em>.`;
      listOl.replaceWith(p);
      return;
    } else {
      // se c'Ã¨ un vecchio <p.empty>, rimpiazzalo con un nuovo OL
      const oldEmpty = container.querySelector('p.empty');
      if (oldEmpty) {
        oldEmpty.remove();
        listOl = document.createElement('ol');
        listOl.className = 'archive-timeline';
        container.appendChild(listOl);
      }
    }

    const frag = document.createDocumentFragment();
    for (const it of arr) frag.appendChild(renderItem(it));
    listOl.appendChild(frag);
  };

  // Bootstrap
  const bootstrap = async () => {
    try {
      const appVer = trim(document.documentElement.getAttribute('data-app-ver') || '');
      const rawEndpoint = (typeof window !== 'undefined' && window.__ARCHIVE_ENDPOINT__ != null)
        ? window.__ARCHIVE_ENDPOINT__
        : '';
      const endpoint = buildArchiveEndpoint(rawEndpoint, appVer);
      const res = await fetch(endpoint, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json(); // [{id, kind, date, title, overline, desc, thumb, tags, links}]

      const pageSize = getPageSize();
      const curPage  = getPage();

      const filtered = filterItems(data, q, k);
      const sorted   = sortItems(filtered);
      const paged    = paginate(sorted, curPage, pageSize);

      updateHeroCount(paged.total);
      renderList(paged.slice);
      updatePager(paged);
    } catch (err) {
      // Gestione errore: mostra messaggio user-friendly
      const sectionArchive = document.querySelector('section.archive');
      if (!sectionArchive) return;
      const container = sectionArchive.querySelector('.container') || sectionArchive;

      const errorMsg = document.createElement('div');
      errorMsg.className = 'archive-error';
      errorMsg.setAttribute('role', 'alert');
      errorMsg.setAttribute('aria-live', 'assertive');
      errorMsg.innerHTML = `
        <p><strong>Impossibile caricare l'archivio.</strong></p>
        <p>Riprova più tardi o <a href="${window.location.origin}">torna alla home</a>.</p>
      `;
      container.appendChild(errorMsg);

      // Log solo in development (se presente flag data-debug)
      if (document.documentElement.hasAttribute('data-debug')) {
        console.error('[archive] dataset error:', err);
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();













