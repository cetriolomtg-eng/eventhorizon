# Decap CMS - Best Practices e Guida Implementazione

## Panoramica
Questa guida raccoglie le migliori prassi per implementare Decap CMS basate sull'esperienza di debugging di una implementazione reale con Hugo e OAuth personalizzato.

## Architettura Consigliata

### Struttura File Admin
```
static/admin/
├── index.html          # Interfaccia principale Decap CMS
├── config.yml         # Configurazione CMS (UNICO file config)
└── callback.html      # Handler OAuth (se necessario)
```

## 1. Configurazione OAuth e Autenticazione

### Token Format per Decap CMS
Decap CMS richiede un formato specifico per i token in localStorage:

```javascript
// ✅ CORRETTO - Formato token Decap CMS
localStorage.setItem('netlify-cms-user', JSON.stringify({
  token: 'gho_tokenGitHub',
  login: 'username-github-reale',  // NON 'user' generico
  name: 'Nome Completo',
  avatar_url: 'https://github.com/username.png',
  backendName: 'github'  // ESSENZIALE per riconoscimento
}));

// ❌ SBAGLIATO - Token generico
localStorage.setItem('user-token', 'gho_token');
```

### Chiavi localStorage Specifiche
- **Chiave richiesta**: `netlify-cms-user` (eredità Netlify CMS)
- **Formato**: JSON string con campi specifici
- **Campo critico**: `backendName: 'github'` per riconoscimento backend

## 2. Configurazione YAML (config.yml)

### Regole Fondamentali
```yaml
# ✅ CONFIGURAZIONE PULITA
backend:
  name: github
  repo: owner/repository
  branch: main
  base_url: https://your-oauth-worker.workers.dev
  auth_endpoint: /auth

collections:
  - name: "unique-collection-name"  # DEVE essere unico
    label: "Collection Label"
    folder: "path/to/content"
    create: true
    fields:
      - { label: "Title", name: "title", widget: "string" }
```

### Errori Comuni da Evitare
- **Unicode characters** in YAML (causano parsing errors)
- **Nomi collection duplicati** (validation failure)
- **Configurazione doppia** (file + inline JavaScript)

## 3. Inizializzazione Decap CMS

### Pattern Corretto
```html
<script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script>
<script>
  // Solo gestione OAuth, NO configurazione inline
  window.addEventListener('message', (event) => {
    if (event.data.startsWith('authorization:github:success:')) {
      const token = event.data.slice('authorization:github:success:'.length);
      
      localStorage.setItem('netlify-cms-user', JSON.stringify({
        token: token,
        login: 'real-github-username',
        name: 'Full Name',
        avatar_url: 'https://github.com/username.png',
        backendName: 'github'
      }));
      
      window.location.reload();
    }
  });
</script>
```

### Anti-Pattern da Evitare
```javascript
// ❌ NON fare configurazione doppia
window.CMS.registerPreviewTemplate(/* ... */);
window.CMS.init({
  config: { /* configurazione inline */ }  // Conflitto con config.yml
});
```

## 4. Debugging e Diagnostica

### Console Logging Utile
```javascript
// Debug stato inizializzazione
console.log('- window.CMS:', !!window.CMS);
console.log('- localStorage token:', !!localStorage.getItem('netlify-cms-user'));
console.log('- Token details:', JSON.parse(localStorage.getItem('netlify-cms-user')));

// Intercettare fetch calls per debug API
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('🌐 Fetch call:', args[0], args[1]?.method || 'GET');
  return originalFetch.apply(this, args);
};
```

### Indicatori di Problemi
- **Pulsante login ancora presente**: Token non riconosciuto
- **"Config Errors"**: YAML malformato o configurazione duplicata
- **"collections names must be unique"**: Nomi collection duplicati
- **React DOM errors**: Interferenza con inizializzazione CMS

## 5. Integrazione Hugo

### Struttura Consigliata
```yaml
# hugo.toml
[params]
  cms_admin = true  # Flag per includere admin in build

[[menu.main]]
  name = "Admin"
  url = "/admin/"
  weight = 100
```

### Content Collections
```yaml
# Mappatura con struttura Hugo
collections:
  - name: "articles"
    label: "Articoli"
    folder: "content/articles"  # Corrisponde a Hugo content
    create: true
    slug: "{{year}}-{{month}}-{{day}}-{{slug}}"
```

## 6. Worker OAuth (Cloudflare)

### Response Format
```javascript
// Worker deve rispondere con formato specifico
return new Response(`
  <script>
    window.opener.postMessage(
      'authorization:github:success:${token}', 
      'https://your-domain.com'
    );
    window.close();
  </script>
`, {
  headers: { 'Content-Type': 'text/html' }
});
```

## 7. Checklist Pre-Deploy

### Validazione Configurazione
- [ ] Un solo file config.yml (no configurazione inline)
- [ ] Nomi collection unici in tutto il config
- [ ] YAML valido senza caratteri Unicode
- [ ] Base_url pointing al worker OAuth corretto
- [ ] Repository GitHub corretto nel backend config

### Test Autenticazione
- [ ] Token salvato come 'netlify-cms-user' in localStorage
- [ ] Username GitHub reale (non 'user' generico)
- [ ] Campo backendName: 'github' presente
- [ ] Avatar_url configurato correttamente

### Verifica Funzionalità
- [ ] Popup OAuth si apre correttamente
- [ ] Redirect al worker funziona
- [ ] Token viene ricevuto e salvato
- [ ] Interface Decap CMS appare dopo autenticazione
- [ ] Collections visibili e editabili

## 8. Troubleshooting Comune

### "Pulsante Login Sempre Presente"
**Causa**: Token non nel formato corretto
**Soluzione**: Verificare formato 'netlify-cms-user' con tutti i campi

### "Config Errors"
**Causa**: YAML malformato o configurazione duplicata
**Soluzione**: Validare YAML e rimuovere configurazione inline

### "React DOM Manipulation Errors"
**Causa**: Interferenza con inizializzazione CMS
**Soluzione**: Rimuovere codice debug che manipola DOM

### "Collections Names Must Be Unique"
**Causa**: Configurazione doppia o nomi duplicati
**Soluzione**: Usare solo config.yml con nomi unici

## Versioni Testate
- **Decap CMS**: 3.8.4
- **Hugo**: Latest
- **Browser**: Chrome, Firefox, Safari
- **OAuth**: Cloudflare Workers

## Risorse Aggiuntive
- [Decap CMS Documentation](https://decapcms.org/docs/)
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Hugo Static Site Generator](https://gohugo.io/documentation/)

---
*Documento aggiornato basato su debugging reale - Ottobre 2025*