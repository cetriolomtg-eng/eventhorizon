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

      if (!workerBase) {
        throw new Error('Worker base URL non configurato');
      }

      console.log('🚀 Tentativo login via worker:', workerBase);
      const url = `${workerBase}/${authEndpoint}?origin=${encodeURIComponent(origin)}&scope=${encodeURIComponent(scope)}`;
      
      console.log('🔗 URL OAuth:', url);
      this.popup = window.open(url, 'github-oauth', this.getPopupOptions());
      
      if (!this.popup) {
        throw new Error('Popup bloccato: abilita i popup per questo sito');
      }
      
    } catch (error) {
      console.error('❌ Errore avvio login:', error);
      ui.showToast('Errore durante il login: ' + error.message, 'error');
    }
  }
  
  /**
   * Opzioni popup
   */
  getPopupOptions() {
    const width = 600;
    const height = 700;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    return `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`;
  }
  
  /**
   * Gestisce callback OAuth dal worker
   */
  async handleCallback(event) {
    try {
      // Verifica origine worker
      const workerBase = config.auth?.workerBase;
      if (!workerBase) return;
      
      const workerOrigin = new URL(workerBase).origin;
      const isValidOrigin = event.origin === workerOrigin || event.origin === location.origin;
      
      if (!isValidOrigin) {
        console.log('🚫 Origine non valida:', event.origin);
        return;
      }

      console.log('📨 Messaggio ricevuto:', event.data);
      
      // Gestisci diversi formati di messaggio
      let token = null;
      
      // Formato stringa: "authorization:github:success:TOKEN"
      if (typeof event.data === 'string' && event.data.startsWith('authorization:github:success:')) {
        token = event.data.slice('authorization:github:success:'.length);
        console.log('✅ Token estratto dal formato stringa');
      }
      // Formato oggetto: { type: 'oauth-callback', token: 'TOKEN' }
      else if (typeof event.data === 'object' && event.data.type === 'oauth-callback') {
        if (event.data.error) {
          console.error('❌ Errore OAuth:', event.data.error);
          ui.showToast('Errore OAuth: ' + event.data.error, 'error');
          return;
        }
        token = event.data.token;
        console.log('✅ Token estratto dal formato oggetto');
      }
      
      if (!token || token.length < 10) {
        console.error('❌ Token non valido:', token);
        return;
      }
      
      // Chiudi popup
      if (this.popup) {
        this.popup.close();
        this.popup = null;
      }
      
      // Salva token
      this.token = token;
      Storage.set(config.storage.token, token);
      console.log('💾 Token salvato, lunghezza:', token.length);
      
      // Carica dati utente
      await this.fetchUserData();
      
      // Notifica listeners
      this.notifyListeners();
      ui.showToast('Login effettuato con successo!', 'success');
      
    } catch (error) {
      console.error('❌ Errore gestione callback:', error);
      ui.showToast('Errore durante l\'autenticazione', 'error');
      
      if (this.popup) {
        this.popup.close();
        this.popup = null;
      }
    }
  }
  
  /**
   * Verifica sessione esistente
   */
  async checkSession() {
    try {
      console.log('🔍 Controllo sessione esistente...');
      
      // Prova prima la nuova chiave di storage
      let token = Storage.get(config.storage.token);
      
      // Fallback alla vecchia chiave se necessario
      if (!token) {
        token = Storage.get('github_token');
        if (token) {
          console.log('📦 Migrazione token dalla vecchia chiave');
          Storage.set(config.storage.token, token);
          Storage.remove('github_token');
        }
      }
      
      if (!token) {
        console.log('🚫 Nessuna sessione esistente');
        return;
      }
      
      console.log('✅ Token trovato, verifica validità...');
      this.token = token;
      await this.fetchUserData();
      this.notifyListeners();
      
    } catch (error) {
      console.warn('⚠️ Errore verifica sessione:', error);
      this.token = null;
      this.user = null;
      Storage.remove(config.storage.token);
      Storage.remove('github_token');
    }
  }
  
  /**
   * Effettua logout
   */
  async logout() {
    try {
      console.log('👋 Logout in corso...');
      this.token = null;
      this.user = null;
      Storage.remove(config.storage.token);
      Storage.remove('github_token');
      this.notifyListeners();
      ui.showToast('Logout effettuato', 'success');
    } catch (error) {
      console.error('❌ Errore durante logout:', error);
      ui.showToast('Errore durante il logout', 'error');
    }
  }
  
  /**
   * Carica dati utente da GitHub
   */
  async fetchUserData() {
    if (!this.token) {
      throw new Error('Token non disponibile');
    }
    
    try {
      console.log('👤 Caricamento dati utente...');
      
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `token ${this.token}`,
          'X-GitHub-Api-Version': config.auth.apiVersion || '2022-11-28'
        }
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      this.user = await response.json();
      console.log('✅ User data caricato:', this.user.login);
      
    } catch (error) {
      console.error('❌ Errore caricamento dati utente:', error);
      this.user = null;
      throw error;
    }
  }
}

export const auth = new AuthManager();