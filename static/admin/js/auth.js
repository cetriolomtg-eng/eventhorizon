/**
 * Gestione autenticazione GitHub OAuth
 * @module auth
 */

import { config, UI_TEXTS } from './config.js';
import { Toast } from './ui.js';
import { storage } from './utils.js';

export class AuthManager {
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
  addListener(callback) {
    this.listeners.add(callback);
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
        callback(this.isAuthenticated(), this.user);
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
   * Avvia flusso login
   */
  async login() {
    if (this.popup) {
      this.popup.focus();
      return;
    }
    
    try {
      const { workerBase, authEndpoint, appId, scope } = config.auth;
      const origin = location.origin;
      const url = `${workerBase}/${authEndpoint}?origin=${encodeURIComponent(origin)}&scope=${scope}${appId?`&client_id=${encodeURIComponent(appId)}`:""}`;
      
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
      Toast.error(UI_TEXTS.errors.AUTH_ERROR);
    }
  }
  
  /**
   * Logout utente
   */
  async logout() {
    try {
      this.token = null;
      this.user = null;
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