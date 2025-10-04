/**
 * AutoSave - Sistema di salvataggio automatico con gestione errori
 * Versione 1.0.0 (2025)
 */
class AutoSave {
  constructor(options) {
    this.options = {
      interval: 30000, // 30 secondi
      maxRetries: 3,
      retryDelay: 1000,
      ...options
    };
    
    this.saveCallback = options.onSave;
    this.notifyCallback = options.onNotify;
    this.pending = null;
    this.timeout = null;
    this.retries = 0;
    this.lastSavedContent = null;
    
    // Bind methods
    this._save = this._save.bind(this);
    this.scheduleAutoSave = this.scheduleAutoSave.bind(this);
    this.forceSave = this.forceSave.bind(this);
    
    // Storage locale per recovery
    this.storageKey = options.storageKey || 'autosave_backup';
    
    // Recupera backup se presente
    this._loadBackup();
  }
  
  // API Pubblica
  scheduleAutoSave(content) {
    // Cancella timeout precedente
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    
    // Salva in localStorage
    this._saveBackup(content);
    
    // Schedule nuovo save
    this.pending = content;
    this.timeout = setTimeout(() => {
      this._save(content);
    }, this.options.interval);
  }
  
  // Forza salvataggio immediato
  async forceSave(content) {
    clearTimeout(this.timeout);
    this.pending = content;
    return this._save(content);
  }
  
  // Implementazione salvataggio
  async _save(content) {
    // Skip se contenuto uguale
    if (this.lastSavedContent === JSON.stringify(content)) {
      return;
    }
    
    try {
      await this.saveCallback(content);
      
      // Reset dopo successo
      this.retries = 0;
      this.lastSavedContent = JSON.stringify(content);
      this._clearBackup();
      
      // Notifica successo
      this.notifyCallback?.({
        type: 'success',
        message: 'Contenuto salvato'
      });
      
    } catch (error) {
      // Gestione retry
      if (this.retries < this.options.maxRetries) {
        this.retries++;
        
        // Notifica retry
        this.notifyCallback?.({
          type: 'warning',
          message: `Errore salvataggio, nuovo tentativo ${this.retries}/${this.options.maxRetries}`
        });
        
        // Ritenta dopo delay
        setTimeout(() => {
          this._save(content);
        }, this.options.retryDelay * this.retries);
        
      } else {
        // Notifica errore finale
        this.notifyCallback?.({
          type: 'error',
          message: 'Impossibile salvare i contenuti'
        });
      }
    }
  }
  
  // Gestione backup locale
  _saveBackup(content) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        content,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('Errore salvataggio backup locale:', e);
    }
  }
  
  _loadBackup() {
    try {
      const backup = localStorage.getItem(this.storageKey);
      if (backup) {
        const { content, timestamp } = JSON.parse(backup);
        const age = Date.now() - timestamp;
        
        // Backup più vecchio di 1 ora
        if (age > 3600000) {
          this._clearBackup();
          return null;
        }
        
        return content;
      }
    } catch (e) {
      console.warn('Errore caricamento backup:', e);
    }
    return null;
  }
  
  _clearBackup() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (e) {
      console.warn('Errore rimozione backup:', e);
    }
  }
}

// Esporta per uso moduli
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AutoSave;
}