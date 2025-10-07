# CSS Architecture Documentation

## Overview

Il sistema CSS di Event Horizon è stato completamente refactorizzato utilizzando la metodologia **ITCSS (Inverted Triangle CSS)** combinata con le convenzioni di naming **BEM (Block Element Modifier)**.

## Struttura delle cartelle

```
assets/style/
├── 01-settings/          # Design tokens e variabili globali
│   ├── _tokens.css       # Variabili CSS custom properties
│   └── _fonts.css        # Caricamento font
├── 03-generic/           # Reset e normalize
│   └── _reset.css        # CSS reset moderno
├── 04-elements/          # Stili base per elementi HTML
│   └── _base.css         # Typography e elementi base
├── 05-objects/           # Pattern di layout riutilizzabili
│   ├── _container.css    # Sistema container
│   └── _grid.css         # Sistema griglia
├── 06-components/        # Componenti UI specifici
│   ├── _navbar.css       # Barra di navigazione
│   ├── _hero.css         # Sezione hero
│   ├── _cards.css        # Sistema di card
│   ├── _modal.css        # Modal e dialog
│   ├── _pager.css        # Carosello/slideshow
│   ├── _subhero.css      # Layout subhero
│   ├── _contacts.css     # Sezione contatti
│   ├── _links.css        # Sezione link
│   └── _footer.css       # Footer del sito
├── 07-pages/             # Stili specifici per pagine
│   ├── _homepage.css     # Homepage
│   ├── _archive.css      # Pagina archivio
│   └── _article.css      # Pagina articolo
├── 08-utilities/         # Classi utility
│   └── _utilities.css    # Utilities atomiche
└── main.css              # File principale di import
```

## Metodologie utilizzate

### ITCSS (Inverted Triangle CSS)

La struttura segue il principio del triangolo invertito di ITCSS:

1. **Settings** - Variabili globali e configurazione
2. **Generic** - Reset, normalize, box-sizing
3. **Elements** - Stili base per elementi HTML nudi
4. **Objects** - Pattern di layout orientati agli oggetti
5. **Components** - Componenti UI progettati
6. **Pages** - Stili specifici per pagine
7. **Utilities** - Classi utility di supporto

### BEM (Block Element Modifier)

Convenzioni di naming per i componenti:

```css
/* Block */
.c-navbar { }

/* Element */
.c-navbar__brand { }
.c-navbar__menu { }
.c-navbar__link { }

/* Modifier */
.c-navbar--scrolled { }
.c-navbar__link--active { }
```

### Prefissi di classe

- `c-` = Component (es. `.c-navbar`, `.c-hero`)
- `o-` = Object (es. `.o-container`, `.o-grid`)
- `u-` = Utility (es. `.u-hidden`, `.u-text-center`)
- `p-` = Page (es. `.p-homepage`, `.p-archive`)
- `is-` / `has-` = State (es. `.is-active`, `.has-bg`)

## Design Tokens

### Sistema di colori

```css
/* Palette base */
--color-indigo-900: #2F2760;
--color-teal-600: #007A7C;
--color-neutral-00: #FFFFFF;
--color-neutral-900: #0E0F1A;

/* Colori semantici */
--color-bg-primary: var(--color-neutral-00);
--color-text-primary: var(--color-neutral-900);
--color-accent-primary: var(--color-teal-600);
```

### Sistema tipografico

```css
/* Font families */
--font-sans: "Lexend Deca", system-ui, sans-serif;
--font-display: "Lexend Giga", var(--font-sans);
--font-body: "Roboto", var(--font-sans);

/* Font sizes (fluide) */
--font-size-h1: clamp(2rem, 4.5vw + 0.3rem, 3.25rem);
--font-size-body: clamp(1rem, 0.5vw + 0.9rem, 1.125rem);
```

### Sistema di spaziature

```css
/* Scala base (griglia 4pt) */
--space-1: 0.25rem;   /* 4px */
--space-4: 1rem;      /* 16px */
--space-8: 2rem;      /* 32px */

/* Spaziature fluide per sezioni */
--space-section-sm: clamp(3rem, 7vw, 5rem);
--space-section-lg: clamp(5rem, 11vw, 8rem);
```

## Componenti principali

### Navbar (`.c-navbar`)

Barra di navigazione fissa con menu hamburger responsive.

**Elementi:**
- `.c-navbar__brand` - Logo e brand
- `.c-navbar__toggle` - Pulsante menu mobile
- `.c-navbar__menu` - Contenitore menu
- `.c-navbar__link` - Link di navigazione

**Stati:**
- `.is-scrolled` - Navbar quando si fa scroll
- `.is-open` - Menu mobile aperto

### Hero (`.c-hero`)

Sezione hero con supporto per background images e overlay.

**Varianti:**
- `.c-hero--full` - Hero a schermo intero
- `.c-hero--compact` - Hero compatto
- `.c-hero--layout-split` - Layout a due colonne

### Cards (`.c-cards`)

Sistema di griglia per card responsive.

**Elementi:**
- `.c-cards__grid` - Griglia container
- `.c-card` - Singola card
- `.c-card__media` - Area immagine
- `.c-card__body` - Contenuto card

**Varianti:**
- `.c-card--featured` - Card in evidenza

## Responsive Design

### Breakpoint

```css
--breakpoint-sm: 480px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
```

### Approccio Mobile-First

Tutti i componenti sono progettati mobile-first con progressive enhancement:

```css
/* Mobile default */
.c-navbar__menu {
  display: none;
}

/* Desktop enhancement */
@media (min-width: 1024px) {
  .c-navbar__menu {
    display: flex;
  }
}
```

## Performance

### Ottimizzazioni implementate

1. **CSS Custom Properties** per ridurre duplicazioni
2. **Contain** property per isolamento di layout
3. **Content-visibility** per virtualizzazione contenuti
4. **Font-display: swap** per caricamento font ottimale
5. **Will-change** solo dove necessario

### Lazy loading

```css
.c-cards__grid {
  content-visibility: auto;
  contain-intrinsic-size: 480px;
}
```

## Accessibilità

### Focus management

Tutti i componenti interattivi hanno stili di focus accessibili:

```css
.c-navbar__link:focus-visible {
  outline: 2px solid var(--color-accent-primary);
  outline-offset: 2px;
}
```

### Reduced motion

Rispetto delle preferenze di movimento ridotto:

```css
@media (prefers-reduced-motion: reduce) {
  .c-hero__chevron {
    animation: none;
  }
}
```

### Screen reader support

Utilizzo della classe `.sr-only` per contenuti solo per screen reader:

```css
.sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  /* ... */
}
```

## Migrazione dai file esistenti

### Mapping delle classi

| Vecchia classe | Nuova classe | Note |
|----------------|--------------|------|
| `.nav` | `.c-navbar` | Componente navbar |
| `.hero` | `.c-hero` | Componente hero |
| `.cards` | `.c-cards` | Sistema cards |
| `.site-footer` | `.c-footer` | Footer componente |

### Variabili CSS aggiornate

| Vecchia variabile | Nuova variabile | Note |
|-------------------|-----------------|------|
| `--fs-h1` | `--font-size-h1` | Più descrittivo |
| `--space-3` | `--space-3` | Mantenuto |
| `--teal-600` | `--color-teal-600` | Prefisso colore |

## Utilizzo

### Import del CSS principale

```html
<link rel="stylesheet" href="/style/main.css">
```

### Esempio di markup con nuove classi

```html
<nav class="c-navbar" id="navbar">
  <div class="c-navbar__inner o-container">
    <a href="/" class="c-navbar__brand">
      <span class="c-navbar__brand-name">Event Horizon</span>
    </a>
    <button class="c-navbar__toggle" aria-label="Menu">
      <span class="c-navbar__toggle-bar"></span>
      <span class="c-navbar__toggle-bar"></span>
      <span class="c-navbar__toggle-bar"></span>
    </button>
  </div>
</nav>
```

## Manutenzione

### Aggiunta di nuovi componenti

1. Creare il file nella cartella appropriata (06-components/)
2. Seguire le convenzioni BEM
3. Aggiungere l'import in main.css
4. Documentare il componente

### Modifiche ai design tokens

Tutte le modifiche ai colori, font e spaziature devono essere fatte nel file `_tokens.css`.

### Testing

Verificare sempre:
- [ ] Responsive design su tutti i breakpoint
- [ ] Accessibilità (focus, contrast, screen reader)
- [ ] Performance (lighthouse, devtools)
- [ ] Cross-browser compatibility

## Note per sviluppatori

1. **Non modificare direttamente main.css** - usare i file separati
2. **Rispettare l'ordine ITCSS** - non saltare livelli
3. **Usare i design tokens** - evitare valori hardcoded
4. **Documentare i componenti complessi** - specialmente animazioni
5. **Testare l'accessibilità** - ogni nuovo componente

Questa architettura fornisce una base solida, scalabile e manutenibile per il futuro sviluppo del sito.