/**
 * Gestione autenticazione GitHub OAuth
 * @module auth
 */

import { config } from './config.js';

// Minimal UI helper until ui.js is fixed
const ui = {
  showError: (message) => {
    console.error(message);
    alert(message);
  }
};

// Minimal Storage helper until utils.js is fixed  
const Storage = {
  get: (key) => {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  },
  set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
  remove: (key) => localStorage.removeItem(key)
};

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
      
      const origin = location.origin;
      const url = `${workerBase}/${authEndpoint}?origin=${encodeURIComponent(origin)}&scope=${scope}`;
      
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
      
      if (!this.popup) {
        throw new Error('Popup blocked - please enable popups for this site');
      }
      
    } catch (err) {
      console.error('Login failed:', err);
      ui.showError('Login failed: ' + err.message);
    }
  }
  
  /**
   * Gestisce callback OAuth
   */
  handleCallback(event) {
    // Ignora messaggi da altre origini
    if (event.origin !== location.origin) return;
    
    const { type, token, error } = event.data;
    
    if (type === 'oauth-callback') {
      if (this.popup) {
        this.popup.close();
        this.popup = null;
      }
      
      if (error) {
        console.error('OAuth error:', error);
        ui.showError('Authentication failed: ' + error);
        return;
      }
      
      if (!token) {
        console.error('No token received');
        ui.showError('Authentication failed: No token received');
        return;
      }
      
      this.token = token;
      Storage.set('github_token', token);
      
      this.fetchUserData()
        .catch(err => {
          console.error('Error fetching user data:', err);
          ui.showError('Error loading user data: ' + err.message);
        });
    }
  }
  
  /**
   * Verifica sessione esistente
   */
  async checkSession() {
    const token = Storage.get('github_token');
    if (!token) return;
    
    this.token = token;
    
    try {
      await this.fetchUserData();
    } catch (err) {
      console.error('Session check failed:', err);
      this.logout();
    }
  }
  
  /**
   * Effettua logout
   */
  logout() {
    this.token = null;
    this.user = null;
    Storage.remove('github_token');
    this.notifyListeners();
  }
  
  /**
   * Recupera dati utente da GitHub
   */
  async fetchUserData() {
    if (!this.token) {
      throw new Error('Not authenticated');
    }
    
    const workerBase = config.auth?.workerBase || 'https://auth.eventhorizon-mtg.workers.dev';
    const userEndpoint = config.auth?.userEndpoint || 'user';
    
    const response = await fetch(`${workerBase}/${userEndpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user data: ' + response.status);
    }
    
    const data = await response.json();
    this.user = data;
    this.notifyListeners();
  }
}

export const auth = new AuthManager();
      
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
      Storage.remove(config.storage.token);
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
    if (!event.origin.startsWith(workerBase)) {
      return;
    }
    
    try {
      // Estrai token dal messaggio
      let token;
      if (typeof event.data === 'string' && event.data.startsWith('authorization:github:success:')) {
        token = event.data.slice('authorization:github:success:'.length);
      } else if (typeof event.data === 'object' && event.data.token) {
        token = event.data.token;
      } else {
        return;
      }
      
      // Valida token
      if (!token || token.length < 10) {
        throw new Error('Token non valido');
      }
      
      // Salva token
      this.token = token;
      Storage.set(config.storage.token, token);
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const tokenData = await response.json();
      if (!tokenData.access_token) {
        throw new Error('No access token in response');
      }
      
      // Salva token
      this.token = tokenData.access_token;
      Storage.set(config.storage.token, this.token);
      
      // Carica dati utente
      await this.fetchUserData();
      
      // Chiudi popup
      if (this.popup) {
        this.popup.close();
        this.popup = null;
      }
      
      // Notifica
      this.notifyListeners();
      ui.showToast('Login effettuato', 'success');
      
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
      // Prova prima la nuova chiave di storage
      let token = Storage.get(config.storage.token);
      
      // Fallback alla vecchia chiave se necessario
      if (!token) {
        token = Storage.get('github_token');
        if (token) {
          // Migra alla nuova chiave
          Storage.set(config.storage.token, token);
          Storage.remove('github_token');
        }
      }
      
      if (!token) return;
      
      this.token = token;
      await this.fetchUserData();
      this.notifyListeners();
      
    } catch (error) {
      console.warn('Error checking session:', error);
      this.token = null;
      this.user = null;
      Storage.remove(config.storage.token);
      Storage.remove('github_token'); // Pulisci anche la vecchia chiave
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
}

export const auth = new AuthManager();