/**
 * Gestione autenticazione GitHub OAuth
 * @module auth
 */

import { config } from './config.js';
import { ui } from './ui.js';
import { Storage } from './utils.js';

class AuthManager {
  constructor() {
    this.token = null;
    this.user = null;
    this.popup = null;
    this.listeners = new Set();
    
    // Bind methods
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.handleCallback = this.handleCallback.bind(this);
    this.checkSession = this.checkSession.bind(this);
    
    // Init
    window.addEventListener('message', this.handleCallback);
    this.checkSession();
  }
  
  /**
   * Aggiunge listener per cambi di stato auth
   */
  onAuthStateChanged(callback) {
    this.listeners.add(callback);
    // Chiama subito con lo stato corrente
    callback(this.user);
  }
  
  /**
   * Rimuove listener
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }
  
  /**
   * Notifica listeners
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.user);
      } catch (err) {
        console.error('Error in auth listener:', err);
      }
    });
  }
  
  /**
   * Verifica se utente è autenticato
   */
  isAuthenticated() {
    return !!this.token;
  }

  /**
   * Recupera token
   */
  async getToken() {
    if (!this.token) {
      throw new Error('User not authenticated');
    }
    return this.token;
  }
  
  /**
   * Avvia flusso login
   */
  async login() {
    if (this.popup) {
      this.popup.focus();
      return;
    }
    
    try {
      // Usa valori di default se non configurati
      const workerBase = config.auth?.workerBase || 'https://auth.eventhorizon-mtg.workers.dev';
      const authEndpoint = config.auth?.authEndpoint || 'auth';
      const scope = config.auth?.scope || 'repo';
      const clientId = config.auth?.clientId;
      
      const origin = location.origin;
      const url = `${workerBase}/${authEndpoint}?origin=${encodeURIComponent(origin)}&scope=${scope}${clientId?`&client_id=${encodeURIComponent(clientId)}`:""}`;
      
      // Apri popup centrato
      const width = 600;
      const height = 700;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;
      
      this.popup = window.open(
        url,
        'github-oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
    } catch (error) {
      console.error('Error starting OAuth flow:', error);
      ui.showToast('Errore durante il login', 'error');
    }
  }
  
  /**
   * Logout utente
   */
  async logout() {
    try {
      this.token = null;
      this.user = null;
      Storage.remove('github_token');
      Storage.remove('github_user');
      this.notifyListeners();
      ui.showToast('Logout effettuato', 'success');
    } catch (error) {
      console.error('Error during logout:', error);
      ui.showToast('Errore durante il logout', 'error');
    }
  }

  /**
   * Gestisce callback OAuth
   */
  async handleCallback(event) {
    // Verifica origine
    const workerBase = config.auth?.workerBase || 'https://auth.eventhorizon-mtg.workers.dev';
    if (!event.origin.startsWith(workerBase)) return;
    
    try {
      const { token, user } = event.data;
      
      if (token && user) {
        this.token = token;
        this.user = user;
        
        // Salva in storage
        Storage.set('github_token', token);
        Storage.set('github_user', user);
        
        // Chiudi popup
        if (this.popup) {
          this.popup.close();
          this.popup = null;
        }
        
        this.notifyListeners();
        ui.showToast('Login effettuato', 'success');
      }
      
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      ui.showToast('Errore durante il login', 'error');
    }
  }

  /**
   * Verifica sessione esistente
   */
  async checkSession() {
    try {
      const token = Storage.get('github_token');
      const user = Storage.get('github_user');
      
      if (token && user) {
        this.token = token;
        this.user = user;
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error checking session:', error);
    }
  }
}

export const auth = new AuthManager();
      storage.remove(config.storage.token);
      this.notifyListeners();
      Toast.info('Logout effettuato');
    } catch (error) {
      console.error('Error during logout:', error);
      Toast.error(UI_TEXTS.errors.AUTH_ERROR);
    }
  }
  
  /**
   * Gestisce callback OAuth
   */
  async handleCallback(event) {
    // Validazione formato messaggio
    if (!event.data?.startsWith?.('authorization:github:success:')) {
      return;
    }
    
    // Validazione source (deve essere il popup aperto da noi)
    if (this.popup && event.source !== this.popup) {
      console.warn('OAuth message from unauthorized source');
      return;
    }
    
    try {
      // Estrai token
      const token = event.data.slice('authorization:github:success:'.length);
      if (!token || token.length < 10) {
        throw new Error('Invalid OAuth token');
      }
      
      // Salva token
      this.token = token;
      storage.set(config.storage.token, token);
      
      // Carica dati utente
      await this.fetchUserData();
      
      // Chiudi popup
      if (this.popup) {
        this.popup.close();
        this.popup = null;
      }
      
      // Notifica
      this.notifyListeners();
      Toast.success('Login effettuato');
      
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      Toast.error(UI_TEXTS.errors.AUTH_ERROR);
    }
  }
  
  /**
   * Verifica sessione esistente
   */
  async checkSession() {
    try {
      const token = storage.get(config.storage.token);
      if (!token) return;
      
      this.token = token;
      await this.fetchUserData();
      this.notifyListeners();
      
    } catch (error) {
      console.warn('Error checking session:', error);
      this.token = null;
      this.user = null;
      storage.remove(config.storage.token);
    }
  }
  
  /**
   * Carica dati utente da GitHub
   */
  async fetchUserData() {
    if (!this.token) {
      this.user = null;
      return;
    }
    
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `token ${this.token}`,
          'X-GitHub-Api-Version': config.auth.apiVersion
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      this.user = await response.json();
      
    } catch (error) {
      console.error('Error fetching user data:', error);
      this.user = null;
      throw error;
    }
  }
  
  /**
   * Ottieni token corrente
   */
  getToken() {
    return this.token;
  }
  
  /**
   * Ottieni utente corrente
   */
  getUser() {
    return this.user;
  }
}

// Singleton instance
export const auth = new AuthManager();