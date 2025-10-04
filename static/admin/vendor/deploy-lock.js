/**
 * DeployLockManager - Gestione avanzata dei lock per deploy
 */
class DeployLockManager {
  constructor(options = {}) {
    this.options = {
      timeout: 180000, // 3 min default
      checkInterval: 5000, // Check ogni 5s
      storage: localStorage,
      keyPrefix: 'deploy_lock_',
      ...options
    };
    
    this.activeLocks = new Map();
    this.checkInterval = null;
  }
  
  /**
   * Acquisisce un lock con heartbeat
   */
  async acquireLock(id, metadata = {}) {
    const lockKey = this._getLockKey(id);
    
    // Verifica lock esistente
    if (await this._checkExistingLock(lockKey)) {
      throw new Error('Lock già acquisito');
    }
    
    // Crea nuovo lock
    const lock = {
      id,
      timestamp: Date.now(),
      metadata,
      heartbeat: Date.now()
    };
    
    // Salva lock
    await this._saveLock(lockKey, lock);
    this.activeLocks.set(id, lock);
    
    // Avvia heartbeat
    this._startHeartbeat(id);
    
    return lock;
  }
  
  /**
   * Rilascia un lock
   */
  async releaseLock(id) {
    const lockKey = this._getLockKey(id);
    
    // Rimuovi da storage
    try {
      this.options.storage.removeItem(lockKey);
    } catch (e) {
      console.warn('Errore rimozione lock:', e);
    }
    
    // Rimuovi da memoria
    this.activeLocks.delete(id);
    
    // Stop heartbeat
    this._stopHeartbeat(id);
  }
  
  /**
   * Verifica se un lock è attivo
   */
  async isLocked(id) {
    return this._checkExistingLock(this._getLockKey(id));
  }
  
  /**
   * Verifica lock esistente
   */
  async _checkExistingLock(key) {
    try {
      const stored = this.options.storage.getItem(key);
      if (!stored) return false;
      
      const lock = JSON.parse(stored);
      const age = Date.now() - lock.heartbeat;
      
      // Lock scaduto
      if (age > this.options.timeout) {
        this.options.storage.removeItem(key);
        return false;
      }
      
      return true;
    } catch (e) {
      console.warn('Errore check lock:', e);
      return false;
    }
  }
  
  /**
   * Salva lock in storage
   */
  async _saveLock(key, lock) {
    try {
      this.options.storage.setItem(key, JSON.stringify(lock));
    } catch (e) {
      console.warn('Errore salvataggio lock:', e);
      throw new Error('Impossibile salvare lock');
    }
  }
  
  /**
   * Aggiorna heartbeat
   */
  async _updateHeartbeat(id) {
    const lock = this.activeLocks.get(id);
    if (!lock) return;
    
    lock.heartbeat = Date.now();
    await this._saveLock(this._getLockKey(id), lock);
  }
  
  /**
   * Avvia heartbeat periodico
   */
  _startHeartbeat(id) {
    const interval = setInterval(async () => {
      await this._updateHeartbeat(id);
    }, this.options.checkInterval);
    
    this.checkInterval = interval;
  }
  
  /**
   * Ferma heartbeat
   */
  _stopHeartbeat(id) {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
  
  /**
   * Genera chiave lock
   */
  _getLockKey(id) {
    return `${this.options.keyPrefix}${id}`;
  }
}

// Esporta
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeployLockManager;
}