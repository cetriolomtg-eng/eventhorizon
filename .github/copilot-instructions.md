# EventHorizon.mtg - AI Coding Instructions

This is a Hugo-based Magic: The Gathering content site with a sophisticated data-driven archive system and modern frontend architecture.

## Architecture Overview

**Content Types:**
- **Articles** (`content/article/`): Traditional blog posts with markdown content
- **Archive Items** (`data/archive/items/*.yml`): Data-driven content cards (videos, resources, portals) rendered dynamically

**Key Data Flow:**
1. Archive YAML files → JSON API endpoint (`/archive/list.json`) 
2. JavaScript fetches JSON and renders interactive archive timeline
3. Hugo Pipes bundle and fingerprint all assets with SRI validation

## Content Management Patterns

### Adding Archive Items
Create YAML files in `data/archive/items/` following the schema in `data/archive/_schema.yml`:
```yaml
id: eh-0003
slug: deck-analysis-video  
kind: video  # or "content", "portal"
date: 2025-10-07
title: "Commander Deck Analysis"
overline: "YouTube · Strategy"
desc: "Deep dive into deck construction and synergies"
thumb: /images/thumbs/deck-analysis.webp
tags: ["commander", "analysis", "strategy"]
links:
  - label: Watch on YouTube
    href: "https://youtube.com/watch?v=..."
    btn_class: btn--yt
    sort_order: 1
    primary: true
```

### Adding Articles  
Use Hugo archetypes: `hugo new article/my-article.md`
- URLs follow pattern: `/articles/slug/` (configured in `hugo.toml` permalinks)
- Cover images go in `static/images/articles/slug/`

## Build & Asset Pipeline

**Cache Busting Strategy:**
- `appVer` parameter (Git SHA) appended to images: `?v={{ site.Params.appVer }}`
- CSS/JS bundles use Hugo fingerprinting with 64-char hashes
- SRI validation ensures integrity of all bundled assets

**JavaScript Architecture:**
- Modular ES modules in `assets/scripts/` (script.js, archive.js, links.js, privacy.js)
- Hugo Pipes concatenates, minifies, and fingerprints into single bundle
- Archive page uses sophisticated mobile-first interactions (bottom sheets, focus traps)

**SCSS Structure:**
- ITCSS methodology with design tokens in `01-settings/_tokens.scss`
- Dark theme with CSS custom properties for responsive spacing/typography
- Component-based architecture with BEM naming

## Development Workflows

**Local Development:**
```bash
hugo server --buildDrafts --buildFuture
```

**Production Build:**
```bash
# Set cache-busting version
export HUGO_PARAMS_APPVER=$(git rev-parse --short HEAD)
hugo --minify
```

**Deployment:**
- GitHub Actions workflow (`.github/workflows/build.yml`) 
- Validates SRI hashes and cache-busting markers before deployment
- Deploys to GitHub Pages with proper asset fingerprinting

## Project-Specific Conventions

**Template Patterns:**
- `baseof.html` injects dynamic data attributes for JS consumption
- Archive modtime detection for cache invalidation: `data-archive-ver`
- Custom output format `ArchiveList` generates JSON API at `/archive/list.json`

**JavaScript Patterns:**  
- Feature detection gates (e.g., `if (!document.querySelector('section.archive')) return`)
- Responsive behavior switches via `matchMedia` queries
- Focus management for accessibility (bottom sheets, modals)

**Asset Organization:**
- Self-hosted fonts with WOFF2 preloading configured in `hugo.toml`
- Images organized by content type: `/images/articles/`, `/images/thumbs/`, `/images/cards/`
- SVG icons in `/icons/` directory

## Integration Points

**Data Sources:**
- Archive items are pure YAML data, not markdown content
- Hugo's `site.Data.archive.items` provides template access
- JSON transformation via `list.archivelist.json` template

**Frontend/Backend Boundary:**
- Hugo generates static JSON API endpoints
- JavaScript handles all dynamic interactions (search, filtering, pagination)
- No server-side search - all filtering happens client-side

## Critical Files to Understand

- `hugo.toml`: Site config, custom output formats, permalink patterns
- `layouts/_default/baseof.html`: Base template with dynamic data attributes  
- `layouts/archive/list.archivelist.json`: Archive JSON API generator
- `data/archive/_schema.yml`: Archive item data structure documentation
- `assets/scripts/archive.js`: Complex mobile-first archive interactions
- `.github/workflows/build.yml`: Deployment pipeline with asset validation