// Storage utility
export const Storage = {
    get(key) {
        try {
            return JSON.parse(localStorage.getItem(key));
        } catch (e) {
            return null;
        }
    },
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },
    remove(key) {
        localStorage.removeItem(key);
    }
};

// Date formatting
export function formatDate(date, format = 'YYYY-MM-DD') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes);
}

// String manipulation
export function slugify(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

// Debounce function
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function
export function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Deep clone
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (obj instanceof Date) {
        return new Date(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item));
    }

    return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [key, deepClone(value)])
    );
}

// Deep compare
export function deepEqual(a, b) {
    if (a === b) return true;
    
    if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime();
    }

    if (!a || !b || (typeof a !== 'object' && typeof b !== 'object')) {
        return a === b;
    }

    if (a === null || a === undefined || b === null || b === undefined) {
        return false;
    }

    if (a.prototype !== b.prototype) return false;

    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;

    return keys.every(k => deepEqual(a[k], b[k]));
}

// Error handling
export class AppError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.details = details;
    }
}

// Validation helpers
export const validators = {
    required: value => value ? null : 'Campo richiesto',
    email: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Email non valida',
    url: value => /^https?:\/\/\S+$/.test(value) ? null : 'URL non valido',
    min: min => value => value.length >= min ? null : `Minimo ${min} caratteri`,
    max: max => value => value.length <= max ? null : `Massimo ${max} caratteri`,
    pattern: (pattern, message) => value => pattern.test(value) ? null : message
};

// LocalStorage wrapper with expiration
export class Storage {
    static set(key, value, ttl = null) {
        const item = {
            value,
            timestamp: Date.now(),
            ttl
        };
        localStorage.setItem(key, JSON.stringify(item));
    }

    static get(key) {
        const item = localStorage.getItem(key);
        if (!item) return null;

        const { value, timestamp, ttl } = JSON.parse(item);
        
        if (ttl && Date.now() - timestamp > ttl) {
            localStorage.removeItem(key);
            return null;
        }

        return value;
    }

    static remove(key) {
        localStorage.removeItem(key);
    }

    static clear() {
        localStorage.clear();
    }
}

// Download helper
export function downloadFile(content, filename, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Retry function with backoff
export async function retry(fn, retries = 3, backoff = 300) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, backoff * Math.pow(2, i)));
        }
    }
}