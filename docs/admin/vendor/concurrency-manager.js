/**
 * ConcurrencyManager - Gestione modifiche concorrenti
 */
class ConcurrencyManager {
  constructor(options = {}) {
    this.options = {
      storage: localStorage,
      keyPrefix: 'concurrency_',
      ...options
    };
    
    this.activeEdits = new Map();
  }
  
  /**
   * Inizia sessione di modifica
   */
  async startEdit(fileId, metadata = {}) {
    const key = this._getKey(fileId);
    
    // Verifica modifiche in corso
    const activeEdit = await this._getActiveEdit(key);
    if (activeEdit && Date.now() - activeEdit.timestamp < 300000) { // 5min timeout
      throw new Error('File in modifica da altro utente');
    }
    
    // Registra modifica
    const edit = {
      fileId,
      timestamp: Date.now(),
      metadata: {
        user: metadata.user,
        session: metadata.session,
        ...metadata
      }
    };
    
    await this._saveEdit(key, edit);
    this.activeEdits.set(fileId, edit);
    
    return edit;
  }
  
  /**
   * Completa modifica
   */
  async completeEdit(fileId) {
    const key = this._getKey(fileId);
    
    try {
      this.options.storage.removeItem(key);
    } catch (e) {
      console.warn('Errore rimozione edit:', e);
    }
    
    this.activeEdits.delete(fileId);
  }
  
  /**
   * Verifica SHA prima del salvataggio
   */
  async validateSha(fileId, currentSha) {
    // Fetch SHA corrente da GitHub
    const remoteSha = await this._fetchRemoteSha(fileId);
    
    if (remoteSha !== currentSha) {
      throw new Error('File modificato da altro utente');
    }
    
    return true;
  }
  
  /**
   * Ottiene modifica attiva
   */
  async _getActiveEdit(key) {
    try {
      const stored = this.options.storage.getItem(key);
      if (!stored) return null;
      
      return JSON.parse(stored);
    } catch (e) {
      console.warn('Errore lettura edit:', e);
      return null;
    }
  }
  
  /**
   * Salva modifica
   */
  async _saveEdit(key, edit) {
    try {
      this.options.storage.setItem(key, JSON.stringify(edit));
    } catch (e) {
      console.warn('Errore salvataggio edit:', e);
      throw new Error('Impossibile salvare stato modifica');
    }
  }
  
  /**
   * Fetch SHA remoto
   */
  async _fetchRemoteSha(fileId) {
    // Implementa chiamata GitHub API per ottenere SHA corrente
    const response = await fetch(`/api/sha/${fileId}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.sha;
  }
  
  /**
   * Genera chiave storage
   */
  _getKey(fileId) {
    return `${this.options.keyPrefix}${fileId}`;
  }
}

// Esporta
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConcurrencyManager;
}