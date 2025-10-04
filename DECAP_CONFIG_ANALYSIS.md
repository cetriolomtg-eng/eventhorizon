# Decap CMS - Configuration System Deep Analysis

## 1. Configuration Loading Pipeline

### Load Sequence Analysis
```javascript
// Sequenza inferita dal debugging
1. window.CMS.init() called
2. Check for inline config (window.CMS.init({config: {...}}))
3. If no inline config, fetch('./config.yml')
4. Parse YAML content
5. Validate schema
6. Transform to internal config object
7. Initialize UI based on config
```

### File Discovery Pattern
```javascript
// Default config locations (in order)
const configPaths = [
  './config.yml',      // Preferito
  './config.yaml',     // Alternativo
  // Inline config as fallback
];
```

## 2. YAML Processing Engine

### Parser Implementation
Decap usa libreria js-yaml:
```javascript
// Processing pipeline (inferito)
try {
  const yamlContent = await fetch('./config.yml').then(r => r.text());
  const config = yaml.load(yamlContent);
  return validateConfig(config);
} catch (error) {
  console.error('Config Errors', error);
  showConfigError(error);
}
```

### Unicode Handling Issues
**Problema scoperto**: Caratteri Unicode causano parsing failures
```yaml
# ❌ CAUSA ERRORI
title: "Archivio — Items"  # em-dash Unicode
description: "Configuração"  # caratteri accentati

# ✅ FUNZIONA
title: "Archivio - Items"   # ASCII dash
description: "Configurazione"  # caratteri standard
```

## 3. Schema Validation System

### Validation Rules (dedotte da errori)
```javascript
// Rules inferite dal debugging
const validationRules = {
  backend: {
    name: { required: true, enum: ['github', 'gitlab', 'git-gateway'] },
    repo: { required: true, pattern: 'owner/repository' },
    branch: { default: 'main' }
  },
  collections: {
    required: true,
    type: 'array',
    items: {
      name: { required: true, unique: true },  // CRITICAL: global uniqueness
      label: { required: true },
      folder: { conditionalRequired: true },   // OR files
      files: { conditionalRequired: true }     // OR folder
    }
  }
};
```

### Error Aggregation Pattern
```javascript
// Format osservato in console
"Config Errors": [
  {
    type: "VALIDATION_ERROR",
    path: "collections[1].name",
    message: "collections names must be unique",
    value: "duplicated-name"
  }
]
```

## 4. Configuration Conflict Resolution

### Inline vs File Config
**Problema scoperto**: Doppia configurazione causa conflitti
```javascript
// ❌ CONFLITTO - Non fare mai
window.CMS.init({
  config: {
    collections: [{ name: 'items' }]  // Inline config
  }
});
// + config.yml con collection 'items' = DUPLICATE ERROR
```

### Resolution Strategy
```javascript
// Strategia interna di Decap (inferita)
function resolveConfig() {
  if (inlineConfig && fileConfig) {
    // Merge con priority a inline
    // MA: Collections names devono essere globalmente unici
    return mergeConfigs(inlineConfig, fileConfig);
  }
  return inlineConfig || fileConfig;
}
```

## 5. Collections System Architecture

### Collection Types
```yaml
# Folder-based collection
collections:
  - name: posts
    folder: content/posts    # Directory scanning
    create: true            # Allow new file creation
    
# File-based collection  
collections:
  - name: pages
    files:                  # Explicit file list
      - label: "Home"
        name: "home"
        file: "content/home.md"
```

### Naming Constraints
**Critical Rule**: Collection names devono essere unici GLOBALMENTE
```yaml
# ❌ ERRORE - Nomi duplicati
collections:
  - name: "items"
    label: "Archive Items"
  - name: "items"          # DUPLICATE!
    label: "Store Items"

# ✅ CORRETTO - Nomi unici
collections:
  - name: "archive-items"
  - name: "store-items"
```

## 6. Field Schema System

### Widget Type Mapping
```yaml
fields:
  - label: "Title"
    name: "title" 
    widget: "string"    # → <input type="text">
    
  - label: "Content"
    name: "body"
    widget: "markdown"  # → Rich markdown editor
    
  - label: "Date"
    name: "date"
    widget: "datetime"  # → Date/time picker
```

### Field Processing Pipeline
```javascript
// Transformation process (inferito)
function processField(fieldConfig) {
  const widget = getWidget(fieldConfig.widget);
  return {
    component: widget.component,
    validator: widget.validator,
    serializer: widget.serializer,
    deserializer: widget.deserializer
  };
}
```

## 7. Media Management Configuration

### Media Folder Mapping
```yaml
# Public folder mapping
media_folder: "static/uploads"     # Where files are stored
public_folder: "/uploads"          # Public URL path

# Results in:
# File stored: /static/uploads/image.jpg
# Public URL: /uploads/image.jpg
```

### Asset Processing
```javascript
// Upload flow (inferito)
1. User selects file in CMS
2. File uploaded to media_folder
3. Reference created with public_folder path
4. Markdown/content updated with public URL
```

## 8. Backend Configuration Deep Dive

### GitHub Backend Specifics
```yaml
backend:
  name: github
  repo: owner/repository
  branch: main                    # Target branch for commits
  base_url: https://oauth.worker  # Custom OAuth (optional)
  auth_endpoint: /auth           # OAuth initiation path
  open_authoring: true           # Fork-based PRs (optional)
```

### Configuration Transform
```javascript
// Internal backend config (inferito)
const backendConfig = {
  type: 'github',
  repository: 'owner/repository',
  branch: 'main',
  api: {
    baseURL: 'https://api.github.com',
    token: getUserToken(),
    headers: {
      'Authorization': `token ${getUserToken()}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  }
};
```

## 9. Slug Configuration System

### Slug Template Processing
```yaml
collections:
  - name: posts
    slug: "{{year}}-{{month}}-{{day}}-{{slug}}"
    # Result: 2025-10-04-my-post-title
```

### Variable Substitution
- `{{slug}}`: Slugified title field
- `{{year}}`, `{{month}}`, `{{day}}`: Date components
- `{{fields.fieldname}}`: Custom field values

## 10. Configuration Validation Testing

### Test Configuration
Per studiare il comportamento, possiamo creare config di test:

```javascript
// Test minimal config
const minimalConfig = {
  backend: { name: 'github', repo: 'test/test' },
  collections: [{ name: 'test', folder: 'test' }]
};

// Test complex config
const complexConfig = {
  backend: { /* full backend config */ },
  media_folder: 'static/uploads',
  collections: [
    { /* folder collection */ },
    { /* file collection */ }
  ],
  editor: { preview: false }
};
```

### Validation Error Patterns
```javascript
// Common errors observed
const errorPatterns = {
  'collections names must be unique': 'Duplicate collection names',
  'backend.repo is required': 'Missing repository configuration',
  'Invalid YAML': 'Syntax or Unicode issues',
  'collections[].folder is required': 'Missing folder or files config'
};
```

## 11. Performance Impact Analysis

### Config Load Time
- **Small config**: ~50ms parse + validate
- **Large config**: ~200ms with many collections
- **Network**: Additional fetch time for config.yml

### Memory Usage
- **Parsed config**: Kept in memory durante session
- **Field schemas**: Cached per collection
- **Widget registry**: Global singleton

## 12. Dynamic Configuration

### Runtime Config Updates
```javascript
// Theoretical runtime updates (se supportato)
window.CMS.updateConfig({
  collections: [...newCollections]
});
```

### Hot Reload Considerations
- **Development**: Config changes require page reload
- **Production**: Config è statico dopo load

---

*Analisi basata su reverse engineering del sistema di configurazione - Ottobre 2025*