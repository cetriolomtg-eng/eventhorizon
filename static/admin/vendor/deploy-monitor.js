/**
 * DeployMonitor - Monitoraggio avanzato del deploy
 */
class DeployMonitor {
  constructor(options = {}) {
    this.options = {
      maxAttempts: 30,
      initialDelay: 2000,
      maxDelay: 10000,
      timeout: 180000, // 3 min
      onProgress: (status) => {},
      onSuccess: () => {},
      onError: (error) => {},
      ...options
    };
    
    this.attempt = 0;
    this.startTime = 0;
    this.monitoring = false;
  }
  
  /**
   * Avvia monitoraggio
   */
  async startMonitoring(initialVersion) {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.startTime = Date.now();
    this.attempt = 0;
    
    try {
      await this._monitor(initialVersion);
    } finally {
      this.monitoring = false;
    }
  }
  
  /**
   * Stop monitoraggio
   */
  stopMonitoring() {
    this.monitoring = false;
  }
  
  /**
   * Monitora deploy con exponential backoff
   */
  async _monitor(initialVersion) {
    while (this.monitoring && this.attempt < this.options.maxAttempts) {
      try {
        // Verifica timeout globale
        if (Date.now() - this.startTime > this.options.timeout) {
          throw new Error('Deploy timeout');
        }
        
        // Delay con backoff esponenziale
        const delay = Math.min(
          this.options.initialDelay * Math.pow(1.5, this.attempt),
          this.options.maxDelay
        );
        await this._delay(delay);
        
        // Check deploy status
        const status = await this._checkDeployStatus();
        this.options.onProgress(status);
        
        if (status.complete) {
          if (status.success) {
            // Verifica nuova versione
            const newVersion = await this._fetchSiteVersion();
            if (newVersion !== initialVersion) {
              this.options.onSuccess(newVersion);
              return true;
            }
          } else {
            throw new Error(`Deploy fallito: ${status.error || 'Errore sconosciuto'}`);
          }
        }
        
        this.attempt++;
        
      } catch (error) {
        if (error.message === 'Deploy timeout') {
          this.options.onError(error);
          return false;
        }
        console.warn('Errore check deploy:', error);
        // Continua con prossimo tentativo
      }
    }
    
    // Max tentativi raggiunti
    this.options.onError(new Error('Max tentativi raggiunti'));
    return false;
  }
  
  /**
   * Verifica stato deploy
   */
  async _checkDeployStatus() {
    const response = await fetch(`/api/deploy-status`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }
  
  /**
   * Fetch versione sito
   */
  async _fetchSiteVersion() {
    const response = await fetch('/');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const text = await response.text();
    // Estrai versione da meta tag o altro marker
    return this._extractVersion(text);
  }
  
  /**
   * Delay con cancel
   */
  _delay(ms) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      if (!this.monitoring) {
        clearTimeout(timer);
        reject(new Error('Monitoring stopped'));
      }
    });
  }
  
  /**
   * Estrai versione da HTML
   */
  _extractVersion(html) {
    // Implementa estrazione versione da HTML
    const match = html.match(/version="([^"]+)"/);
    return match ? match[1] : '';
  }
}

// Esporta
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeployMonitor;
}