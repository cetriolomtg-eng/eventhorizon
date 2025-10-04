# Decap CMS - Analisi Tecnica Approfondita

## 1. Architettura Core

### Moduli Principali (dai log di console)
```
decap-cms-app 3.8.4      # Layer UI React
decap-cms-core 3.9.0     # Engine principale
decap-cms 3.8.4          # Wrapper/Bundle
```

### Differenze di Versione
- **Core più recente**: 3.9.0 vs App 3.8.4 (architettura modulare)
- **Backward compatibility**: Core evolve indipendentemente dall'UI

## 2. Inizializzazione System

### Sequenza di Bootstrap
Dal debug possiamo vedere:

1. **Script Loading**: `decap-cms.js` da unpkg CDN
2. **Module Resolution**: 
   - `bootstrap.js:53` → carica decap-cms-core
   - `index.js:7` → inizializza decap-cms-app
   - `index.js:27` → espone API pubbliche
3. **DOM Ready**: `window.CMS` diventa disponibile
4. **Config Loading**: Cerca `config.yml` o configurazione inline

### Punti di Ingresso API
```javascript
// Quello che abbiamo osservato funzionare
window.CMS.init()              // Inizializzazione standard
window.CMS.registerPreviewTemplate()  // Preview customization
window.CMS.registerWidget()    // Widget custom
```

## 3. Sistema di Autenticazione

### Token Storage Mechanism
```javascript
// Formato specifico richiesto (scoperto tramite debugging)
localStorage.setItem('netlify-cms-user', JSON.stringify({
  token: 'gho_...',           // GitHub Personal Access Token
  login: 'username',          // GitHub username (NON generico)
  name: 'Display Name',       // Nome utente
  avatar_url: 'https://...',  // Avatar GitHub
  backendName: 'github'       // Backend identifier (CRITICO)
}));
```

### Riconoscimento Autenticazione
Dal debug sappiamo che Decap:
1. **Cerca la chiave specifica**: `netlify-cms-user` (eredità Netlify CMS)
2. **Valida backendName**: Deve corrispondere al backend in config.yml
3. **Verifica token format**: Se manca un campo, ignora l'autenticazione

## 4. Configuration System

### YAML Parsing Pipeline
Quello che abbiamo osservato dagli errori:

1. **Load config.yml**: Fetch HTTP al file
2. **YAML Parse**: Libreria yaml-js con validazione Unicode
3. **Schema Validation**: 
   - Collections names uniqueness
   - Required fields validation
   - Backend configuration check
4. **Error Aggregation**: "Config Errors [{...}]" se fallisce

### Validation Rules (dedotte dagli errori)
```yaml
# REGOLE CRITICHE scoperte
collections:
  - name: "unique-name"  # DEVE essere unico in tutto il config
    # ...
  - name: "altro-nome"   # NO duplicati anche con label diversi
```

## 5. React UI Architecture

### Component Lifecycle
Dal debugging delle DOM manipulation errors:

1. **Initial Render**: React monta l'interfaccia
2. **Auth Check**: Verifica localStorage per user state
3. **Conditional Rendering**: 
   - Login screen se non autenticato
   - CMS interface se autenticato
4. **State Management**: Redux/Context per gestire state globale

### Interferenza con DOM Manipulation
Abbiamo visto che il codice di debug causava errori perché:
- React controlla il DOM
- Modifiche esterne confondono il Virtual DOM
- **Lesson learned**: Non manipolare DOM dopo init()

## 6. Backend Integration Pattern

### GitHub Backend (quello che usiamo)
```yaml
backend:
  name: github
  repo: owner/repo
  branch: main
  base_url: https://oauth-endpoint
  auth_endpoint: /auth
```

### API Call Pattern (dal fetch intercept)
Osservazioni dalle fetch calls intercettate:

1. **OAuth Flow**: 
   - Popup al custom auth endpoint
   - Token exchange con GitHub
   - Token salvato in formato specifico

2. **Content Operations**: (da studiare ancora)
   - GET per leggere file
   - PUT/POST per modifiche
   - Tree API per navigation

## 7. Message Passing System

### OAuth Callback Protocol
```javascript
// Pattern che funziona (dal nostro debugging)
window.addEventListener('message', (event) => {
  if (event.data.startsWith('authorization:github:success:')) {
    const token = event.data.slice('authorization:github:success:'.length);
    // Salva token e reload
  }
});
```

### Cross-Origin Communication
- **Popup** ↔ **Parent Window**: postMessage API
- **Worker Domain** → **CMS Domain**: Specific message format
- **Security**: Origin validation critica

## 8. Error Handling Patterns

### Configuration Errors
Pattern osservato:
```
Config Errors [{
  type: "VALIDATION_ERROR",
  message: "collections names must be unique",
  // ...altri dettagli
}]
```

### Recovery Mechanisms
- **Fallback**: Se config.yml fail, prova inline config
- **User Feedback**: Error display in UI
- **Debug Mode**: Console logging per troubleshooting

## 9. Performance Considerations

### CDN Loading Strategy
```html
<script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script>
```
- **Bundle size**: ~500KB+ (tutto in un file)
- **Loading**: Blocca until complete load
- **Caching**: Dipende da CDN headers

### Runtime Performance
- **Initial Load**: Heavy (React + tutti i widgets)
- **Navigation**: SPA routing, no page reload
- **File Operations**: Background fetch, UI responsive

---

## Prossimi Passi di Analisi

### Da Investigare
1. **Widget System**: Come i field types diventano UI components
2. **Preview Templates**: Rendering mechanism
3. **Git Operations**: Come le modifiche diventano commit
4. **Extension Points**: API per customization
5. **Error Recovery**: Gestione stati inconsistenti

### Strumenti di Debug
- **Browser DevTools**: Network tab per API calls
- **React Developer Tools**: Component tree analysis
- **Console Hooks**: Intercept internal functions
- **Source Maps**: Se disponibili per debugging interno

*Analisi basata su osservazioni dirette durante debugging - Ottobre 2025*