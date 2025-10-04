/**
 * AssetManager - Gestione ottimizzata delle risorse media
 * Versione 1.0.0 (2025)
 */
class AssetManager {
  constructor(options = {}) {
    this.options = {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.85,
      format: 'webp',
      ...options
    };
    
    // Bind methods
    this.optimizeImage = this.optimizeImage.bind(this);
    this.processFile = this.processFile.bind(this);
    
    // Setup cache
    this.cache = new Map();
  }
  
  /**
   * Ottimizza un'immagine
   * @param {File|Blob} file - File immagine da ottimizzare
   * @returns {Promise<Blob>} Blob ottimizzato
   */
  async optimizeImage(file) {
    try {
      // Check cache
      const cacheKey = await this._generateHash(file);
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }
      
      // Crea Image Bitmap
      const img = await createImageBitmap(file);
      
      // Calcola dimensioni ottimali
      const { width, height } = this._calculateDimensions(img);
      
      // Crea canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      // Disegna immagine riscalata
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // Converti in blob ottimizzato
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, `image/${this.options.format}`, this.options.quality);
      });
      
      // Salva in cache
      this.cache.set(cacheKey, blob);
      
      return blob;
      
    } catch (error) {
      console.error('Errore ottimizzazione immagine:', error);
      throw error;
    }
  }
  
  /**
   * Processa un file
   * @param {File} file - File da processare
   * @returns {Promise<{blob: Blob, meta: Object}>}
   */
  async processFile(file) {
    // Verifica tipo file
    if (!file.type.startsWith('image/')) {
      throw new Error('Tipo file non supportato');
    }
    
    // Ottimizza immagine
    const blob = await this.optimizeImage(file);
    
    // Estrai metadati
    const meta = await this._extractMetadata(file);
    
    return { blob, meta };
  }
  
  /**
   * Calcola dimensioni ottimali
   * @private
   */
  _calculateDimensions(img) {
    const { maxWidth, maxHeight } = this.options;
    
    let width = img.width;
    let height = img.height;
    
    // Scala mantenendo aspect ratio
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(
        maxWidth / width,
        maxHeight / height
      );
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }
    
    return { width, height };
  }
  
  /**
   * Genera hash per cache
   * @private
   */
  async _generateHash(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Estrae metadati immagine
   * @private
   */
  async _extractMetadata(file) {
    return {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    };
  }
}

// Esporta per uso moduli
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AssetManager;
}