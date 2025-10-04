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
   * Avvia flusso login via Cloudflare Worker
   */
  async login() {
    if (this.popup) {
      this.popup.focus();
      return;
    }

    try {
      const workerBase = config.auth?.workerBase || 'https://auth.eventhorizon-mtg.workers.dev';
      const authEndpoint = config.auth?.authEndpoint || 'auth';
      const scope = config.auth?.scope || 'repo';

      const origin = location.origin;
      const url = `${workerBase}/${authEndpoint}?origin=${encodeURIComponent(origin)}&scope=${encodeURIComponent(scope)}`;

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
        throw new Error('Popup bloccato: abilita i popup per questo sito');
      }
    } catch (error) {
      console.error('Errore avvio OAuth:', error);
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
    try {
      // Accetta messaggi dal nostro dominio (callback.html) o dal Worker
      let workerOrigin = null;
      try {
        workerOrigin = config.auth?.workerBase ? new URL(config.auth.workerBase).origin : null;
      } catch {}
      const isAllowedOrigin = (event.origin === location.origin) || (workerOrigin && event.origin === workerOrigin);
      if (!isAllowedOrigin) return;

      // Payload atteso dal worker (via callback.html relay): { type: 'oauth-callback', token, error }
      const payload = event.data || {};
      const { type, token, error } = payload;
      if (type !== 'oauth-callback') return; // ignora altri messaggi generici

      // Chiudi eventuale popup
      if (this.popup) {
        this.popup.close();
        this.popup = null;
      }

      if (error) {
        console.error('OAuth error:', error);
        ui.showToast('Errore durante il login', 'error');
        return;
      }

      if (!token) {
        console.error('Token non ricevuto dal worker');
        ui.showToast('Errore: token non ricevuto', 'error');
        return;
      }

      // Salva token e carica utente
      this.token = token;
      Storage.set(config.storage.token, token);
      await this.fetchUserData();
      this.notifyListeners();
      ui.showToast('Login effettuato', 'success');
    } catch (error) {
      console.error('Errore gestione callback OAuth:', error);
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
      // Se è configurato un endpoint user del worker, usiamolo per evitare CORS/versioning
      const workerBase = config.auth?.workerBase;
      const userEndpoint = config.auth?.userEndpoint;

      if (workerBase && userEndpoint) {
        const resp = await fetch(`${workerBase}/${userEndpoint}`, {
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        this.user = await resp.json();
        return;
      }

      // Fallback: chiamata diretta API GitHub
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `token ${this.token}`,
          'X-GitHub-Api-Version': config.auth.apiVersion
        }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.user = await response.json();
    } catch (error) {
      console.error('Error fetching user data:', error);
      this.user = null;
      throw error;
    }
  }
}

export const auth = new AuthManager();