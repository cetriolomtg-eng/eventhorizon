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
      const workerBase = config.auth?.workerBase;
      const authEndpoint = config.auth?.authEndpoint || 'auth';
      const scope = config.auth?.scope || 'repo';
      const origin = location.origin;

      // Prova prima il worker
      if (workerBase) {
        console.log('Tentativo login via worker:', workerBase);
        const url = `${workerBase}/${authEndpoint}?origin=${encodeURIComponent(origin)}&scope=${encodeURIComponent(scope)}`;
        
        try {
          // Test se il worker accetta la nostra origin
          const testUrl = `${workerBase}/auth?origin=${encodeURIComponent(origin)}&scope=${encodeURIComponent(scope)}`;
          const testResponse = await fetch(testUrl, { method: 'HEAD' });
          
          if (testResponse.ok) {
            this.popup = window.open(url, 'github-oauth', this.getPopupOptions());
            if (!this.popup) {
              throw new Error('Popup bloccato');
            }
            return;
          } else {
            const errorText = await testResponse.text();
            console.warn('Worker rifiuta origin:', origin, errorText);
            throw new Error(`Worker error: ${testResponse.status}`);
          }
        } catch (workerError) {
          console.warn('Worker non disponibile per origin:', origin, 'Errore:', workerError.message);
          ui.showToast(`Worker non disponibile da ${origin}. Uso fallback GitHub diretto.`, 'warning');
        }
      }

      // Fallback: GitHub diretto (per sviluppo)
      console.log('Login fallback via GitHub diretto');
      const clientId = config.auth?.clientId;
      if (!clientId) {
        throw new Error('Né worker né clientId configurato');
      }

      const redirectUri = `${origin}/admin/callback.html`;
      const state = Math.random().toString(36).substring(7);
      Storage.set('oauth_state', state);

      const authUrl = new URL(config.auth.authUrl);
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', scope);
      authUrl.searchParams.set('state', state);

      this.popup = window.open(authUrl.toString(), 'github-oauth', this.getPopupOptions());
      if (!this.popup) {
        throw new Error('Popup bloccato: abilita i popup per questo sito');
      }
    } catch (error) {
      console.error('Errore avvio OAuth:', error);
      ui.showToast('Errore durante il login: ' + error.message, 'error');
    }
  }

  getPopupOptions() {
    const width = 600;
    const height = 700;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    return `width=${width},height=${height},left=${left},top=${top}`;
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
      if (!isAllowedOrigin) {
        console.log('Ignored message from origin:', event.origin);
        return;
      }

      // Payload atteso: { type: 'oauth-callback', token, error } o { type: 'oauth-callback', code, state }
      const payload = event.data || {};
      const { type, token, error, code, state } = payload;
      if (type !== 'oauth-callback') {
        console.log('Ignored non-oauth message:', payload);
        return;
      }

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

      // Se abbiamo già il token (dal worker)
      if (token) {
        this.token = token;
        Storage.set(config.storage.token, token);
        await this.fetchUserData();
        this.notifyListeners();
        ui.showToast('Login effettuato', 'success');
        return;
      }

      // Se abbiamo code/state (flusso GitHub diretto), scambia con worker
      if (code && state) {
        console.log('Scambio code->token tramite worker...');
        const workerBase = config.auth?.workerBase || 'https://auth.eventhorizon-mtg.workers.dev';
        const tokenEndpoint = config.auth?.tokenEndpoint || 'token';
        
        const response = await fetch(`${workerBase}/${tokenEndpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state })
        });

        if (!response.ok) {
          throw new Error(`Errore scambio token: ${response.status}`);
        }

        const { access_token } = await response.json();
        if (!access_token) {
          throw new Error('Token non ricevuto dal worker');
        }

        this.token = access_token;
        Storage.set(config.storage.token, access_token);
        await this.fetchUserData();
        this.notifyListeners();
        ui.showToast('Login effettuato', 'success');
        return;
      }

      console.error('Payload incompleto:', payload);
      ui.showToast('Errore: dati OAuth incompleti', 'error');
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