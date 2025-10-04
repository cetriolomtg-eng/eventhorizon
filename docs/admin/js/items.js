import { api } from './api.js';
import { config } from './config.js';

class ItemsManager {
    constructor() {
        this.items = new Map();
        this.schema = null;
        this.aliases = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            // Carica schema
            const schemaResponse = await api.getContent('data/archive/_schema.yml');
            this.schema = jsyaml.load(atob(schemaResponse.content));

            // Carica aliases
            const aliasesResponse = await api.getContent('data/archive/aliases.yml');
            this.aliases = jsyaml.load(atob(aliasesResponse.content));

            // Carica tutti gli items
            const itemsDir = await api.getContent('data/archive/items');
            for (const file of itemsDir) {
                if (file.type === 'file' && file.name.endsWith('.yml')) {
                    const response = await api.getContent(file.path);
                    const content = jsyaml.load(atob(response.content));
                    this.items.set(content.id, {
                        ...content,
                        sha: response.sha,
                        path: file.path
                    });
                }
            }

            this.initialized = true;
        } catch (error) {
            console.error('Error initializing items:', error);
            throw error;
        }
    }

    validateItem(item) {
        const errors = [];
        
        // Verifica campi required dallo schema
        for (const [field, schema] of Object.entries(this.schema)) {
            if (schema.required && !item[field]) {
                errors.push(`Campo richiesto mancante: ${field}`);
                continue;
            }

            const value = item[field];
            if (!value) continue;

            // Validazione tipo
            switch (schema.type) {
                case 'string':
                    if (typeof value !== 'string') {
                        errors.push(`${field} deve essere una stringa`);
                    } else if (schema.enum && !schema.enum.includes(value)) {
                        errors.push(`${field} deve essere uno di: ${schema.enum.join(', ')}`);
                    }
                    break;
                case 'number':
                    if (typeof value !== 'number') {
                        errors.push(`${field} deve essere un numero`);
                    }
                    break;
                case 'array':
                    if (!Array.isArray(value)) {
                        errors.push(`${field} deve essere un array`);
                    }
                    break;
                case 'boolean':
                    if (typeof value !== 'boolean') {
                        errors.push(`${field} deve essere un booleano`);
                    }
                    break;
            }
        }

        return errors;
    }

    async saveItem(item) {
        await this.initialize();

        // Validazione
        const errors = this.validateItem(item);
        if (errors.length > 0) {
            throw new Error(`Validation errors:\n${errors.join('\n')}`);
        }

        // Genera path del file
        const path = `data/archive/items/${item.id}.yml`;
        
        // Recupera sha se esiste
        const existingItem = this.items.get(item.id);
        const sha = existingItem?.sha;

        // Salva su GitHub
        const response = await api.createOrUpdateFile(
            path,
            jsyaml.dump(item),
            sha
        );

        // Aggiorna cache locale
        this.items.set(item.id, {
            ...item,
            sha: response.content.sha,
            path
        });

        return response;
    }

    async deleteItem(id) {
        await this.initialize();

        const item = this.items.get(id);
        if (!item) {
            throw new Error(`Item ${id} non trovato`);
        }

        await api.deleteFile(item.path, item.sha);
        this.items.delete(id);
    }

    getItem(id) {
        return this.items.get(id);
    }

    getAllItems() {
        return Array.from(this.items.values());
    }

    searchItems(query) {
        const normalizedQuery = query.toLowerCase();
        return this.getAllItems().filter(item => {
            // Cerca in tutti i campi testuali
            return Object.entries(item).some(([key, value]) => {
                if (typeof value === 'string') {
                    return value.toLowerCase().includes(normalizedQuery);
                }
                return false;
            });
        });
    }
}

export const items = new ItemsManager();