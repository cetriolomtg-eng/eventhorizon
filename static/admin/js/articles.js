import { api } from './api.js';
import { config } from './config.js';

class ArticlesManager {
    constructor() {
        this.articles = new Map();
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            console.log('📰 Inizializzazione articles...');

            // Carica tutti gli articoli
            const articlesDir = await api.getContent('content/article');
            let loadedCount = 0;
            let errorCount = 0;

            for (const file of articlesDir) {
                if (file.type === 'file' && file.name.endsWith('.md')) {
                    try {
                        const response = await api.getContent(file.path);
                        const content = atob(response.content);

                        // Estrai frontmatter e contenuto
                        const { frontmatter, body } = this.parseFrontmatter(content);

                        this.articles.set(file.name, {
                            path: file.path,
                            sha: response.sha,
                            frontmatter,
                            content: body
                        });
                        loadedCount++;
                    } catch (err) {
                        console.error(`❌ Errore caricamento ${file.name}:`, err.message);
                        errorCount++;
                    }
                }
            }

            console.log(`✅ Articles caricati: ${loadedCount} (errori: ${errorCount})`);
            this.initialized = true;
        } catch (error) {
            console.error('❌ Errore critico inizializzazione articles:', error);
            throw new Error(`Impossibile caricare articles: ${error.message}`);
        }
    }

    parseFrontmatter(content) {
        const fmRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
        const match = content.match(fmRegex);
        
        if (!match) {
            return {
                frontmatter: {},
                body: content
            };
        }

        try {
            const frontmatter = jsyaml.load(match[1]);
            return {
                frontmatter,
                body: match[2]
            };
        } catch (error) {
            console.error('Error parsing frontmatter:', error);
            return {
                frontmatter: {},
                body: content
            };
        }
    }

    generateFrontmatter(data) {
        // Opzioni safe per evitare encoding issues
        const yamlOptions = {
            indent: 2,
            lineWidth: -1, // No line wrapping
            noRefs: true,
            sortKeys: false
        };
        const yaml = jsyaml.dump(data, yamlOptions);
        return `---\n${yaml}---\n`;
    }

    async saveArticle(filename, frontmatter, content) {
        await this.initialize();

        // Validazione base
        if (!filename.endsWith('.md')) {
            filename += '.md';
        }

        // Genera contenuto completo
        const fullContent = this.generateFrontmatter(frontmatter) + content;

        // Path completo
        const path = `content/article/${filename}`;
        
        // Recupera sha se esiste
        const existingArticle = this.articles.get(filename);
        const sha = existingArticle?.sha;

        // Salva su GitHub
        const response = await api.createOrUpdateFile(
            path,
            fullContent,
            sha
        );

        // Aggiorna cache locale
        this.articles.set(filename, {
            path,
            sha: response.content.sha,
            frontmatter,
            content
        });

        return response;
    }

    async deleteArticle(filename) {
        await this.initialize();

        if (!filename.endsWith('.md')) {
            filename += '.md';
        }

        const article = this.articles.get(filename);
        if (!article) {
            throw new Error(`Article ${filename} non trovato`);
        }

        await api.deleteFile(article.path, article.sha);
        this.articles.delete(filename);
    }

    getArticle(filename) {
        if (!filename.endsWith('.md')) {
            filename += '.md';
        }
        return this.articles.get(filename);
    }

    getAllArticles() {
        return Array.from(this.articles.values());
    }

    searchArticles(query) {
        const normalizedQuery = query.toLowerCase();
        return this.getAllArticles().filter(article => {
            // Cerca nel frontmatter
            const frontmatterMatch = Object.entries(article.frontmatter).some(
                ([key, value]) => {
                    if (typeof value === 'string') {
                        return value.toLowerCase().includes(normalizedQuery);
                    }
                    return false;
                }
            );

            // Cerca nel contenuto
            const contentMatch = article.content.toLowerCase().includes(normalizedQuery);

            return frontmatterMatch || contentMatch;
        });
    }
}

export const articles = new ArticlesManager();