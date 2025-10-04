/**
 * Configurazione Admin UI
 * @module config
 */

export const config = {
  // Repository
  repo: {
    owner: "eventhorizon-mtg",
    name: "eventhorizon-mtg.github.io",
    branch: "main",
    folder: "data/archive/items",
    extension: "yml"
  },

  // OAuth & API
  auth: {
    workerBase: "https://auth.eventhorizon-mtg.workers.dev",
    authEndpoint: "auth",
    scope: "repo",
    apiVersion: "2022-11-28"
  },

  // UI Settings
  ui: {
    toastDuration: 5000,
    autosaveInterval: 30000,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    supportedImageTypes: ["image/jpeg", "image/png", "image/webp"],
    defaultImageQuality: 0.85
  },

  // Deploy Settings
  deploy: {
    lockTimeout: 180000, // 3 min
    pollInterval: 3000,
    maxAttempts: 30,
    initialDelay: 2000
  },

  // Cache Settings
  cache: {
    stateRetention: 3600000, // 1h
    maxCacheSize: 100,
    version: "1.0.0"
  },

  // Rate Limiting
  rateLimit: {
    maxRequestsPerMinute: 30,
    burstSize: 5
  },

  // Storage Keys
  storage: {
    token: "gh_token",
    state: "admin_ui_state",
    deployLock: "admin_deploy_lock",
    drafts: "admin_drafts"
  },

  // Validation
  validation: {
    maxTitleLength: 100,
    maxDescLength: 500,
    maxTagsCount: 10,
    slugPattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  }
};

// Costanti UI
export const UI_CONSTANTS = {
  TOAST_TYPES: {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
  },
  
  MODAL_SIZES: {
    SMALL: 'sm',
    MEDIUM: 'md',
    LARGE: 'lg'
  },
  
  ITEM_TYPES: {
    VIDEO: 'video',
    CONTENT: 'content'
  },
  
  FILE_TYPES: {
    MARKDOWN: 'md',
    YAML: 'yml'
  }
};

// Testi localizzati
export const UI_TEXTS = {
  errors: {
    NETWORK_ERROR: 'Errore di rete. Verifica la connessione.',
    AUTH_ERROR: 'Errore di autenticazione. Effettua nuovamente il login.',
    VALIDATION_ERROR: 'Dati non validi. Verifica i campi evidenziati.',
    SAVE_ERROR: 'Errore durante il salvataggio. Riprova più tardi.',
    DELETE_ERROR: 'Errore durante l\'eliminazione. Riprova più tardi.',
    UPLOAD_ERROR: 'Errore durante l\'upload. Verifica il file e riprova.',
    DEPLOY_ERROR: 'Errore durante il deploy. Controlla i log di GitHub Actions.'
  },
  
  success: {
    SAVE_SUCCESS: 'Salvato con successo',
    DELETE_SUCCESS: 'Eliminato con successo',
    UPLOAD_SUCCESS: 'File caricato con successo',
    DEPLOY_SUCCESS: 'Deploy completato con successo'
  },
  
  warnings: {
    UNSAVED_CHANGES: 'Ci sono modifiche non salvate. Vuoi continuare?',
    DEPLOY_IN_PROGRESS: 'È in corso un deploy. Attendere il completamento.',
    FILE_IN_USE: 'Il file è in modifica da un altro utente'
  },
  
  info: {
    AUTOSAVE_ENABLED: 'Salvataggio automatico attivo',
    DEPLOY_STARTED: 'Deploy avviato...',
    UPLOAD_STARTED: 'Upload in corso...'
  }
};

// Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS = {
  SAVE: { key: 's', ctrl: true },
  NEW: { key: 'n', ctrl: true },
  DELETE: { key: 'd', ctrl: true },
  PREVIEW: { key: 'p', ctrl: true },
  SEARCH: { key: 'f', ctrl: true }
};