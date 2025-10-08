+++
title = "Benvenuto su EventHorizon.mtg"
date = "2025-09-27T12:00:00.000Z"
draft = false
description = "Che cos'è la sezione Articoli e come verrà usata sul sito."
tags = ["benvenuto"]
cover = ""
+++
## Benvenuto!

Questa è una pagina **Articolo** di esempio generata nella sezione `article`.

* Ha un header con data, tag, titolo, descrizione e un'immagine di copertina (parametro `cover`).
* Il contenuto è Markdown normale: titoli, liste, link, immagini, ecc.
* L'URL è configurato come `/articles/benvenuto-su-eventhorizon.mtg/` tramite i `permalinks` in `hugo.toml`.

### Come creare un nuovo articolo

1. `hugo new article/<slug>.md`
2. Compila i campi nel front matter (titolo, descrizione, tag, cover)
3. Imposta `draft = false` quando vuoi pubblicarlo

### Esempio di immagine inline

Puoi inserire immagini dal tuo `static/images/...`:

![Hero]()

Oppure, meglio, organizza le immagini per ogni articolo in `static/images/articles/<slug>/` e referenziale come `images/articles/<slug>/file.webp`.

Buona scrittura!

### Esempi di pulsanti

Di seguito alcuni esempi dei pulsanti disponibili sul sito:

```html
<a class="btn btn--primary" href="#">Primary</a>
<a class="btn btn--secondary" href="#">Secondary</a>
<a class="btn btn--accent" href="#">Accent</a>
<a class="btn btn--yt" href="#">YouTube</a>
<a class="btn btn--scry" href="#">Scryfall</a>
```

Come riutilizzarli:

1. Copia il blocco HTML qui sopra e incollalo nel punto desiderato dell'articolo.
2. Sostituisci la variante (`btn--primary`, `btn--yt`, ecc.) e personalizza testo e link.
3. Se usi l'editor "Visual" di Decap, passa alla vista Markdown/Code per incollare il codice HTML.
4. Non servono shortcode: la combinazione `btn` + `btn--variant` funziona direttamente grazie al renderer HTML abilitato.

#### Anteprima diretta

<div class="article-button-demo">
  <a class="btn btn--primary" href="#">Primary</a>
  <a class="btn btn--secondary" href="#">Secondary</a>
  <a class="btn btn--accent" href="#">Accent</a>
  <a class="btn btn--yt" href="#">YouTube</a>
  <a class="btn btn--scry" href="#">Scryfall</a>
</div>

