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
