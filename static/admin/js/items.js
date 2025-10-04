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
            console.log('📦 Inizializzazione items...');

            // Carica schema (opzionale - non blocca se manca)
            try {
                const schemaResponse = await api.getContent('data/archive/_schema.yml');
                this.schema = jsyaml.load(atob(schemaResponse.content));
                console.log('✅ Schema caricato:', this.schema);
            } catch (err) {
                console.warn('⚠️ Schema non trovato, validazione disabilitata');
                this.schema = {};
            }

            // Carica aliases (opzionale)
            try {
                const aliasesResponse = await api.getContent('data/archive/aliases.yml');
                this.aliases = jsyaml.load(atob(aliasesResponse.content));
                console.log('✅ Aliases caricati');
            } catch (err) {
                console.warn('⚠️ Aliases non trovati');
                this.aliases = {};
            }

            // Carica tutti gli items
            const itemsDir = await api.getContent('data/archive/items');
            let loadedCount = 0;
            let errorCount = 0;

            for (const file of itemsDir) {
                if (file.type === 'file' && file.name.endsWith('.yml')) {
                    try {
                        const response = await api.getContent(file.path);
                        const content = jsyaml.load(atob(response.content));
                        this.items.set(content.id || file.name, {
                            ...content,
                            sha: response.sha,
                            path: file.path
                        });
                        loadedCount++;
                    } catch (err) {
                        console.error(`❌ Errore caricamento ${file.name}:`, err.message);
                        errorCount++;
                    }
                }
            }

            console.log(`✅ Items caricati: ${loadedCount} (errori: ${errorCount})`);
            this.initialized = true;
        } catch (error) {
            console.error('❌ Errore critico inizializzazione items:', error);
            throw new Error(`Impossibile caricare items: ${error.message}`);
        }
    }

    validateItem(item) {
        const errors = [];

        // Validazione base (sempre attiva)
        if (!item.id) {
            errors.push('Campo richiesto mancante: id');
        }
        if (!item.title) {
            errors.push('Campo richiesto mancante: title');
        }
        if (!item.date) {
            errors.push('Campo richiesto mancante: date');
        }

        // Se schema non disponibile, skip validazione avanzata
        if (!this.schema || Object.keys(this.schema).length === 0) {
            console.warn('⚠️ Schema non disponibile, validazione limitata');
            return errors;
        }

        // Verifica campi required dallo schema
        for (const [field, fieldSchema] of Object.entries(this.schema)) {
            // Skip se lo schema del campo è null/undefined
            if (!fieldSchema || typeof fieldSchema !== 'object') {
                console.warn(`⚠️ Schema per campo "${field}" non valido:`, fieldSchema);
                continue;
            }

            if (fieldSchema.required && !item[field]) {
                errors.push(`Campo richiesto mancante: ${field}`);
                continue;
            }

            const value = item[field];
            if (!value) continue;

            // Validazione tipo
            switch (fieldSchema.type) {
                case 'string':
                    if (typeof value !== 'string') {
                        errors.push(`${field} deve essere una stringa`);
                    } else if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
                        errors.push(`${field} deve essere uno di: ${fieldSchema.enum.join(', ')}`);
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
        console.log('💾 ItemsManager.saveItem() chiamato con:', item);

        await this.initialize();

        // Validazione
        console.log('🔍 Validazione item...');
        const errors = this.validateItem(item);
        if (errors.length > 0) {
            console.error('❌ Errori di validazione:', errors);
            throw new Error(`Validation errors:\n${errors.join('\n')}`);
        }
        console.log('✅ Validazione passata');

        // Genera path del file
        const path = `data/archive/items/${item.id}.yml`;
        console.log('📁 Path file:', path);

        // Recupera sha se esiste
        const existingItem = this.items.get(item.id);
        const sha = existingItem?.sha;
        console.log('🔑 SHA esistente:', sha || 'nuovo file');

        // Genera YAML
        const yamlContent = jsyaml.dump(item);
        console.log('📝 YAML generato (primi 200 chars):', yamlContent.substring(0, 200));

        // Salva su GitHub
        console.log('☁️ Inizio upload su GitHub...');
        const response = await api.createOrUpdateFile(
            path,
            yamlContent,
            sha
        );
        console.log('✅ Upload GitHub completato:', response);

        // Aggiorna cache locale
        this.items.set(item.id, {
            ...item,
            sha: response.content.sha,
            path
        });

        console.log('✅ Item salvato con successo in cache');
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