# Guida alla Migrazione HTML

## Overview

Questa guida spiega come aggiornare i template HTML esistenti per utilizzare la nuova architettura CSS refactorizzata.

## Cambiamenti principali

### 1. Import CSS

**Prima:**
```html
<!-- Vecchio sistema con multipli import -->
<link rel="stylesheet" href="/style/base/_fonts.css">
<link rel="stylesheet" href="/style/base/_style.css">
<link rel="stylesheet" href="/style/components/_cards.css">
<link rel="stylesheet" href="/style/layout/_subhero.css">
<!-- ... altri file ... -->
```

**Dopo:**
```html
<!-- Nuovo sistema unificato -->
<link rel="stylesheet" href="/style/main.css">
```

### 2. Struttura navbar

**Prima:**
```html
<nav class="nav" id="navbar">
  <div class="nav__inner">
    <a href="/" class="brand">
      <span class="brand__name">Event Horizon</span>
    </a>
    <button class="nav__toggle">
      <span class="nav__toggle-bar"></span>
      <span class="nav__toggle-bar"></span>
      <span class="nav__toggle-bar"></span>
    </button>
    <div class="nav__menu">
      <ul class="nav__list">
        <li class="nav__item">
          <a href="/" class="nav__link">Home</a>
        </li>
      </ul>
    </div>
  </div>
</nav>
```

**Dopo:**
```html
<nav class="c-navbar" id="navbar">
  <div class="c-navbar__inner o-container">
    <a href="/" class="c-navbar__brand">
      <span class="c-navbar__brand-name">Event Horizon</span>
    </a>
    <button class="c-navbar__toggle" aria-label="Toggle menu">
      <span class="c-navbar__toggle-bar"></span>
      <span class="c-navbar__toggle-bar"></span>
      <span class="c-navbar__toggle-bar"></span>
    </button>
    <div class="c-navbar__menu">
      <ul class="c-navbar__list">
        <li class="c-navbar__item">
          <a href="/" class="c-navbar__link">Home</a>
        </li>
      </ul>
    </div>
  </div>
</nav>
```

### 3. Sezione Hero

**Prima:**
```html
<section class="hero">
  <div class="hero__inner">
    <div class="hero__content">
      <img class="hero__logo" src="/images/logo.webp" alt="Logo">
      <h1 class="hero__title">Event Horizon</h1>
      <p class="hero__subtitle">Descrizione del sito</p>
    </div>
  </div>
</section>
```

**Dopo:**
```html
<section class="c-hero c-hero--full">
  <div class="c-hero__background"></div>
  <div class="c-hero__overlay"></div>
  <div class="c-hero__inner o-container">
    <div class="c-hero__content">
      <img class="c-hero__logo" src="/images/logo.webp" alt="Logo">
      <h1 class="c-hero__title">Event Horizon</h1>
      <p class="c-hero__subtitle">Descrizione del sito</p>
      <div class="c-hero__actions">
        <a href="#articles" class="btn btn--teal">Esplora Articoli</a>
      </div>
    </div>
  </div>
</section>
```

### 4. Sistema Cards

**Prima:**
```html
<section class="cards">
  <div class="cards__inner">
    <div class="cards__header">
      <h2 class="cards__title">Articoli Recenti</h2>
      <a href="/archive" class="cards__view-all">Vedi tutti</a>
    </div>
    <div class="cards__grid">
      <article class="card">
        <div class="card__media">
          <img src="/images/card.jpg" alt="Articolo">
        </div>
        <div class="card__body">
          <h3 class="card__title">
            <a href="/article">Titolo Articolo</a>
          </h3>
          <p class="card__excerpt">Descrizione...</p>
        </div>
      </article>
    </div>
  </div>
</section>
```

**Dopo:**
```html
<section class="c-cards">
  <div class="c-cards__inner o-container">
    <div class="c-cards__header">
      <h2 class="c-cards__title">Articoli Recenti</h2>
      <a href="/archive" class="c-cards__view-all">Vedi tutti</a>
    </div>
    <div class="c-cards__grid">
      <article class="c-card">
        <div class="c-card__media">
          <img src="/images/card.jpg" alt="Articolo">
        </div>
        <div class="c-card__body">
          <h3 class="c-card__title">
            <a href="/article">Titolo Articolo</a>
          </h3>
          <p class="c-card__excerpt">Descrizione...</p>
          <div class="c-card__meta">
            <span class="c-card__date">15 Ottobre 2025</span>
            <span class="c-card__category">Magic</span>
          </div>
        </div>
      </article>
    </div>
  </div>
</section>
```

### 5. Pager/Slideshow

**Prima:**
```html
<div class="sub-hero">
  <div class="sub-hero__inner">
    <div class="pager__viewport">
      <ul class="pager__track">
        <li class="pager__slide is-active">
          <h3 class="slide__title">Titolo</h3>
          <p class="slide__desc">Descrizione</p>
          <div class="slide__cta">
            <a href="#" class="btn btn--teal">Action</a>
          </div>
        </li>
      </ul>
    </div>
    <div class="pager__dots">
      <button class="pager__dot is-active"></button>
      <button class="pager__dot"></button>
    </div>
  </div>
</div>
```

**Dopo:**
```html
<div class="l-subhero">
  <div class="l-subhero__inner o-container">
    <div class="c-pager">
      <div class="c-pager__viewport">
        <ul class="c-pager__track">
          <li class="c-pager__slide is-active">
            <h3 class="c-pager__slide-title">Titolo</h3>
            <p class="c-pager__slide-description">Descrizione</p>
            <div class="c-pager__slide-actions">
              <a href="#" class="btn btn--teal">Action</a>
            </div>
          </li>
        </ul>
      </div>
      <div class="c-pager__dots">
        <button class="c-pager__dot is-active" aria-label="Slide 1"></button>
        <button class="c-pager__dot" aria-label="Slide 2"></button>
      </div>
    </div>
  </div>
</div>
```

### 6. Footer

**Prima:**
```html
<footer class="site-footer">
  <div class="site-footer__inner">
    <div class="footer__brand">Event Horizon</div>
    <div class="footer__legal">
      <p class="site-footer__disclaimer">
        Disclaimer legale...
      </p>
    </div>
  </div>
</footer>
```

**Dopo:**
```html
<footer class="c-footer">
  <div class="c-footer__inner o-container">
    <div class="c-footer__section">
      <div class="c-footer__brand">Event Horizon</div>
      <div class="c-footer__legal">Informazioni legali</div>
    </div>
    <div class="c-footer__section">
      <h4 class="c-footer__section-title">Link</h4>
      <nav class="c-footer__nav">
        <ul class="c-footer__nav-list">
          <li><a href="/" class="c-footer__nav-link">Home</a></li>
          <li><a href="/archive" class="c-footer__nav-link">Archivio</a></li>
        </ul>
      </nav>
    </div>
    <div class="c-footer__copyright">
      <p class="c-footer__disclaimer">
        Disclaimer legale completo...
      </p>
    </div>
  </div>
</footer>
```

### 7. Pagina Archive

**Prima:**
```html
<div class="archive-hero">
  <div class="container">
    <h1 class="page-title">Archivio</h1>
    <p class="filter-note">Esplora tutti gli articoli</p>
  </div>
</div>
<div class="archive-search">
  <div class="container">
    <!-- form di ricerca -->
  </div>
</div>
```

**Dopo:**
```html
<div class="p-archive__hero">
  <div class="p-archive__hero-inner o-container">
    <h1 class="p-archive__title">Archivio</h1>
    <p class="p-archive__subtitle">Esplora tutti gli articoli</p>
  </div>
</div>
<div class="p-archive__search">
  <div class="p-archive__search-inner o-container">
    <form class="p-archive__search-form">
      <div class="p-archive__search-field">
        <input type="search" class="p-archive__search-input" placeholder="Cerca articoli...">
        <svg class="p-archive__search-icon"><!-- icona --></svg>
      </div>
    </form>
  </div>
</div>
```

### 8. Pagina Article

**Prima:**
```html
<article class="article">
  <div class="article-hero">
    <div class="container">
      <div class="article-meta">
        <span>15 Ottobre 2025</span>
      </div>
      <h1 class="article-title">Titolo Articolo</h1>
      <p class="article-desc">Descrizione</p>
    </div>
  </div>
  <div class="article-body container">
    <p>Contenuto articolo...</p>
  </div>
</article>
```

**Dopo:**
```html
<article class="p-article">
  <div class="p-article__hero">
    <div class="p-article__hero-inner o-container">
      <div class="p-article__meta">
        <div class="p-article__meta-item">
          <svg class="p-article__meta-icon"><!-- calendar icon --></svg>
          <span class="p-article__date">15 Ottobre 2025</span>
        </div>
        <a href="/category/magic" class="p-article__category">Magic</a>
      </div>
      <h1 class="p-article__title">Titolo Articolo</h1>
      <p class="p-article__description">Descrizione</p>
    </div>
  </div>
  <div class="p-article__body o-container">
    <p>Contenuto articolo...</p>
  </div>
</article>
```

## Aggiornamenti alle variabili CSS

### CSS Custom Properties

Aggiornare le variabili CSS nei template dove necessario:

**Prima:**
```css
.custom-element {
  background: var(--teal-600);
  font-size: var(--fs-h2);
  margin: var(--space-3);
}
```

**Dopo:**
```css
.custom-element {
  background: var(--color-teal-600);
  font-size: var(--font-size-h2);
  margin: var(--space-3); /* Mantenuto uguale */
}
```

## Nuove classi utility disponibili

Puoi ora utilizzare classi utility per modifiche rapide:

```html
<!-- Spaziature -->
<div class="u-mt-4 u-mb-6">Contenuto</div>

<!-- Typography -->
<p class="u-text-center u-font-medium">Testo centrato</p>

<!-- Layout -->
<div class="u-flex u-items-center u-justify-between">
  <span>Sinistra</span>
  <span>Destra</span>
</div>

<!-- Responsive visibility -->
<div class="u-hidden-mobile">Nascosto su mobile</div>
<div class="u-visible-desktop">Visibile solo su desktop</div>
```

## Stati e modificatori

I nuovi stati utilizzano convenzioni standard:

```html
<!-- Stati attivi -->
<a class="c-navbar__link is-active">Link attivo</a>
<button class="c-pager__dot is-active">Dot attivo</button>

<!-- Stati dinamici (gestiti da JavaScript) -->
<nav class="c-navbar is-scrolled">Navbar dopo scroll</nav>
<nav class="c-navbar is-open">Navbar con menu aperto</nav>

<!-- Modificatori di stile -->
<section class="c-hero c-hero--compact">Hero compatto</section>
<article class="c-card c-card--featured">Card in evidenza</article>
```

## Miglioramenti all'accessibilità

Sono stati aggiunti attributi di accessibilità:

```html
<!-- ARIA labels -->
<button class="c-navbar__toggle" aria-label="Apri menu di navigazione">

<!-- Focus management -->
<a class="c-card__title-link" tabindex="0">Link accessibile</a>

<!-- Semantic HTML -->
<nav role="navigation" aria-label="Navigazione principale">
<main role="main" id="main-content">
```

## Checklist di migrazione

### Per ogni template:

- [ ] Aggiornato l'import CSS a `main.css`
- [ ] Rinominate le classi seguendo le nuove convenzioni
- [ ] Aggiunte le classi `o-container` dove necessario
- [ ] Verificati gli stati e modificatori
- [ ] Aggiunti attributi di accessibilità
- [ ] Testate le funzionalità responsive
- [ ] Verificata la compatibilità con JavaScript esistente

### Testing post-migrazione:

- [ ] Layout corretto su tutti i breakpoint
- [ ] Animazioni e transizioni funzionanti
- [ ] Accessibilità con screen reader
- [ ] Performance non degradate
- [ ] Cross-browser compatibility

## Supporto JavaScript

Il JavaScript esistente potrebbe richiedere aggiornamenti per le nuove classi:

**Prima:**
```javascript
const navbar = document.querySelector('.nav');
navbar.classList.add('is-scrolled');
```

**Dopo:**
```javascript
const navbar = document.querySelector('.c-navbar');
navbar.classList.add('is-scrolled');
```

## Note finali

- La nuova architettura è retrocompatibile per un periodo di transizione
- I vecchi file CSS possono essere rimossi gradualmente
- Documenta eventuali customizzazioni specifiche del progetto
- Mantieni coerenza nell'uso delle nuove convenzioni