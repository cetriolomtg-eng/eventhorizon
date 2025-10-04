/**
 * VirtualScroller - Gestione efficiente di lunghe liste
 * Versione 1.0.0 (2025)
 */
class VirtualScroller {
  constructor(options) {
    this.container = typeof options.container === 'string' 
      ? document.querySelector(options.container)
      : options.container;
    
    this.itemHeight = options.itemHeight || 48;
    this.buffer = options.buffer || 5;
    this.items = [];
    this.visibleItems = new Map();
    
    // Stato
    this.totalHeight = 0;
    this.scrollTop = 0;
    this.visibleCount = 0;
    
    // DOM
    this.viewport = document.createElement('div');
    this.viewport.className = 'virtual-viewport';
    this.viewport.style.cssText = 'position:relative;width:100%;height:100%;overflow-y:auto;';
    
    this.content = document.createElement('div');
    this.content.className = 'virtual-content';
    this.content.style.position = 'relative';
    
    this.viewport.appendChild(this.content);
    this.container.appendChild(this.viewport);
    
    // Event listeners
    this.viewport.addEventListener('scroll', this._onScroll.bind(this));
    this._resizeObserver = new ResizeObserver(this._onResize.bind(this));
    this._resizeObserver.observe(this.viewport);
    
    // Inizializzazione
    this._calculateVisibleCount();
  }

  // API Pubblica
  setItems(items) {
    this.items = items;
    this.totalHeight = items.length * this.itemHeight;
    this.content.style.height = `${this.totalHeight}px`;
    this._render();
  }

  // Gestione scroll
  _onScroll() {
    requestAnimationFrame(() => {
      this.scrollTop = this.viewport.scrollTop;
      this._render();
    });
  }

  // Gestione resize
  _onResize() {
    this._calculateVisibleCount();
    this._render();
  }

  // Calcola numero elementi visibili
  _calculateVisibleCount() {
    this.visibleCount = Math.ceil(this.viewport.clientHeight / this.itemHeight) + this.buffer * 2;
  }

  // Rendering elementi visibili
  _render() {
    const startIndex = Math.floor(this.scrollTop / this.itemHeight) - this.buffer;
    const endIndex = startIndex + this.visibleCount;
    
    // Rimuovi elementi non più visibili
    for (const [index, element] of this.visibleItems.entries()) {
      if (index < startIndex || index >= endIndex) {
        element.remove();
        this.visibleItems.delete(index);
      }
    }
    
    // Aggiungi nuovi elementi visibili
    for (let i = Math.max(0, startIndex); i < Math.min(this.items.length, endIndex); i++) {
      if (!this.visibleItems.has(i)) {
        const item = this.items[i];
        const element = this._createItemElement(item, i);
        this.visibleItems.set(i, element);
        this.content.appendChild(element);
      }
    }
  }

  // Crea elemento DOM per item
  _createItemElement(item, index) {
    const element = document.createElement('div');
    element.className = 'virtual-item';
    element.style.cssText = `
      position: absolute;
      top: ${index * this.itemHeight}px;
      width: 100%;
      height: ${this.itemHeight}px;
    `;
    
    // Se item è una stringa/numero, usa come contenuto
    // altrimenti delega al renderer personalizzato
    if (typeof item === 'object' && this.options?.itemRenderer) {
      this.options.itemRenderer(element, item);
    } else {
      element.textContent = item.toString();
    }
    
    return element;
  }
}

// Esporta per uso moduli
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VirtualScroller;
}