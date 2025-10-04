/**
 * Gestione autenticazione GitHub OAuth
 * @module auth
 */

import { config } from './config.js';
import { ui } from './ui.js';
import { Storage } from './utils.js';

const storage = Storage;

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
      const clientId = config.auth?.clientId;
      if (!clientId) {
        throw new Error('Client ID non configurato');
      }
      
      const scope = config.auth?.scope || 'repo';
      const redirectUri = `${config.auth.redirectBase}/admin/callback.html`;
      const state = Math.random().toString(36).substring(7);
      
      // Salva state per verifica
      Storage.set('oauth_state', state);
      
      const authUrl = new URL(config.auth.authUrl);
      authUrl.searchParams.append('client_id', clientId);
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('scope', scope);
      authUrl.searchParams.append('state', state);
      
      // Apri popup centrato
      const width = 600;
      const height = 700;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;
      
      this.popup = window.open(
        authUrl.toString(),
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
      // Verifica origine
      if (event.origin !== location.origin) {
        console.log('Ignoring message from unauthorized origin:', event.origin);
        return;
      }
      
      // Validazione source (deve essere il popup aperto da noi)
      if (this.popup && event.source !== this.popup) {
        console.warn('OAuth message from unauthorized source');
        return;
      }
      
      const data = event.data;
      if (typeof data !== 'object' || !data.code || !data.state) {
        console.log('Invalid callback data:', data);
        return;
      }
      
      // Verifica state
      const savedState = Storage.get('oauth_state');
      if (data.state !== savedState) {
        throw new Error('Invalid state parameter');
      }
      
      // Scambia il codice per un token usando il proxy CORS
      const response = await fetch(config.auth.tokenUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Origin': config.auth.redirectBase
        },
        body: JSON.stringify({
          client_id: config.auth.clientId,
          code: data.code,
          redirect_uri: `${config.auth.redirectBase}/admin/callback.html`
        })
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