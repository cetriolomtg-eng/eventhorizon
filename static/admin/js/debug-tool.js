// Decap CMS Advanced Debugging Tool
// Include questo script DOPO il caricamento di Decap CMS per analisi approfondita

(function() {
  'use strict';
  
  console.log('🔬 Decap CMS Advanced Debugger Loaded');
  
  // === 1. API MONITORING ===
  const apiCalls = [];
  const originalFetch = window.fetch;
  
  window.fetch = function(...args) {
    const url = args[0];
    const options = args[1] || {};
    const timestamp = new Date().toISOString();
    
    const callData = {
      timestamp,
      url,
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body
    };
    
    apiCalls.push(callData);
    
    console.group(`🌐 API Call: ${callData.method} ${url}`);
    console.log('Time:', timestamp);
    console.log('Headers:', callData.headers);
    if (callData.body) console.log('Body:', callData.body);
    
    return originalFetch.apply(this, args)
      .then(response => {
        console.log(`✅ Response: ${response.status} ${response.statusText}`);
        console.groupEnd();
        
        callData.response = {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        };
        
        return response;
      })
      .catch(error => {
        console.error(`❌ Error:`, error);
        console.groupEnd();
        
        callData.error = error.message;
        throw error;
      });
  };
  
  // === 2. LOCALSTORAGE MONITORING ===
  const originalSetItem = localStorage.setItem;
  const originalRemoveItem = localStorage.removeItem;
  
  localStorage.setItem = function(key, value) {
    if (key.includes('cms') || key.includes('netlify')) {
      console.log('💾 LocalStorage SET:', key, '→', value);
    }
    return originalSetItem.call(this, key, value);
  };
  
  localStorage.removeItem = function(key) {
    if (key.includes('cms') || key.includes('netlify')) {
      console.log('🗑️ LocalStorage REMOVE:', key);
    }
    return originalRemoveItem.call(this, key);
  };
  
  // === 3. CMS STATE INSPECTOR ===
  function inspectCMSState() {
    const state = {
      timestamp: new Date().toISOString(),
      cmsLoaded: !!window.CMS,
      config: null,
      user: null,
      registry: {},
      dom: {}
    };
    
    // Config analysis
    if (window.CMS && window.CMS.getConfig) {
      try {
        state.config = window.CMS.getConfig();
      } catch (e) {
        state.config = { error: e.message };
      }
    }
    
    // User state
    const userData = localStorage.getItem('netlify-cms-user');
    if (userData) {
      try {
        state.user = JSON.parse(userData);
      } catch (e) {
        state.user = { error: 'Invalid JSON' };
      }
    }
    
    // Widget registry (if accessible)
    if (window.CMS && window.CMS.getWidget) {
      const widgets = ['string', 'text', 'markdown', 'date', 'datetime', 'boolean', 'image', 'file'];
      widgets.forEach(widget => {
        try {
          state.registry[widget] = !!window.CMS.getWidget(widget);
        } catch (e) {
          state.registry[widget] = false;
        }
      });
    }
    
    // DOM analysis
    state.dom.loginButtons = document.querySelectorAll('button, a').length;
    state.dom.errorElements = document.querySelectorAll('[class*="error"], .error').length;
    state.dom.cmsElements = document.querySelectorAll('[class*="cms"], [class*="CMS"]').length;
    
    return state;
  }
  
  // === 4. EVENT MONITORING ===
  const events = [];
  const originalAddEventListener = window.addEventListener;
  
  window.addEventListener = function(type, listener, options) {
    if (type === 'message' || type.includes('cms')) {
      console.log('👂 Event Listener Added:', type);
      events.push({ type, timestamp: Date.now() });
    }
    return originalAddEventListener.call(this, type, listener, options);
  };
  
  // Monitor postMessage
  const originalPostMessage = window.postMessage;
  window.postMessage = function(message, targetOrigin) {
    console.log('📤 PostMessage:', message, '→', targetOrigin);
    return originalPostMessage.call(this, message, targetOrigin);
  };
  
  // === 5. CONFIGURATION VALIDATOR ===
  function validateCurrentConfig() {
    const issues = [];
    
    // Check localStorage user
    const user = localStorage.getItem('netlify-cms-user');
    if (!user) {
      issues.push('No user in localStorage');
    } else {
      try {
        const parsed = JSON.parse(user);
        if (!parsed.token) issues.push('Missing token in user data');
        if (!parsed.login) issues.push('Missing login in user data');
        if (!parsed.backendName) issues.push('Missing backendName in user data');
        if (!parsed.token?.startsWith('gho_')) issues.push('Token doesn\'t look like GitHub PAT');
      } catch (e) {
        issues.push('Invalid JSON in user data');
      }
    }
    
    // Check config
    if (window.CMS && window.CMS.getConfig) {
      try {
        const config = window.CMS.getConfig();
        if (!config.backend) issues.push('Missing backend config');
        if (!config.collections) issues.push('Missing collections config');
        
        if (config.collections) {
          const names = config.collections.map(c => c.name);
          const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
          if (duplicates.length > 0) {
            issues.push(`Duplicate collection names: ${duplicates.join(', ')}`);
          }
        }
      } catch (e) {
        issues.push(`Config error: ${e.message}`);
      }
    }
    
    return issues;
  }
  
  // === 6. DEBUGGING INTERFACE ===
  window.DecapDebugger = {
    // State inspection
    getState: inspectCMSState,
    getAPIHistory: () => apiCalls,
    getEvents: () => events,
    
    // Validation
    validate: validateCurrentConfig,
    
    // Utilities
    clearAPIHistory: () => apiCalls.length = 0,
    exportDebugData: () => ({
      state: inspectCMSState(),
      apiCalls: apiCalls,
      events: events,
      validation: validateCurrentConfig(),
      timestamp: new Date().toISOString()
    }),
    
    // Real-time monitoring
    startMonitoring: (interval = 5000) => {
      return setInterval(() => {
        console.group('🔍 Decap CMS State Report');
        console.log('State:', inspectCMSState());
        console.log('Validation:', validateCurrentConfig());
        console.log('Recent API calls:', apiCalls.slice(-5));
        console.groupEnd();
      }, interval);
    },
    
    // Force actions (for testing)
    forceReInit: () => {
      if (window.CMS && window.CMS.init) {
        console.log('🔄 Force Re-initializing CMS...');
        window.CMS.init();
      }
    },
    
    clearAuth: () => {
      localStorage.removeItem('netlify-cms-user');
      console.log('🔐 Authentication cleared');
    },
    
    setTestAuth: () => {
      const testUser = {
        token: 'gho_test_token_for_debugging',
        login: 'eventhorizon-mtg',
        name: 'Test User',
        avatar_url: 'https://github.com/eventhorizon-mtg.png',
        backendName: 'github'
      };
      localStorage.setItem('netlify-cms-user', JSON.stringify(testUser));
      console.log('🧪 Test authentication set');
    }
  };
  
  // === 7. AUTO-START MONITORING ===
  console.log('🚀 Starting automatic monitoring...');
  console.log('Use window.DecapDebugger for manual debugging');
  
  // Initial state report
  setTimeout(() => {
    console.group('🔬 Initial Decap CMS Analysis');
    console.log('State:', inspectCMSState());
    console.log('Validation:', validateCurrentConfig());
    console.groupEnd();
  }, 2000);
  
  // Periodic state monitoring
  window.DecapDebugger.monitoringInterval = window.DecapDebugger.startMonitoring(10000);
  
})();

// === USAGE EXAMPLES ===
/*
// In browser console:

// Get current state
window.DecapDebugger.getState();

// Check for issues
window.DecapDebugger.validate();

// See API call history
window.DecapDebugger.getAPIHistory();

// Export all debug data
window.DecapDebugger.exportDebugData();

// Clear authentication and test
window.DecapDebugger.clearAuth();
window.DecapDebugger.setTestAuth();

// Force CMS re-initialization
window.DecapDebugger.forceReInit();
*/