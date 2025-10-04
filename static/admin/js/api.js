import { config } from './config.js';
import { auth } from './auth.js';

class GitHubAPI {
    constructor() {
        this.baseUrl = 'https://api.github.com';
        this.rateLimitRemaining = null;
        this.rateLimitReset = null;
        this.queuedRequests = [];
        this.isProcessingQueue = false;
    }

    async request(endpoint, options = {}) {
        // Aggiungi richiesta alla coda
        return new Promise((resolve, reject) => {
            this.queuedRequests.push({
                endpoint,
                options,
                resolve,
                reject
            });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.isProcessingQueue || this.queuedRequests.length === 0) return;
        
        this.isProcessingQueue = true;
        
        // Verifica rate limit
        if (this.rateLimitRemaining === 0) {
            const now = Date.now() / 1000;
            if (now < this.rateLimitReset) {
                const waitTime = (this.rateLimitReset - now + 1) * 1000;
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }

        const { endpoint, options, resolve, reject } = this.queuedRequests.shift();
        
        try {
            const token = await auth.getToken();
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    ...options.headers
                }
            });

            // Aggiorna rate limit
            this.rateLimitRemaining = parseInt(response.headers.get('x-ratelimit-remaining'));
            this.rateLimitReset = parseInt(response.headers.get('x-ratelimit-reset'));

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status} ${await response.text()}`);
            }

            const data = await response.json();
            resolve(data);
        } catch (error) {
            reject(error);
        } finally {
            this.isProcessingQueue = false;
            this.processQueue(); // Processa prossima richiesta se presente
        }
    }

    // Metodi helper per operazioni comuni
    async getRepository() {
        const repoFullName = `${config.repo.owner}/${config.repo.name}`;
        return this.request(`/repos/${repoFullName}`);
    }

    async getContent(path) {
        const repoFullName = `${config.repo.owner}/${config.repo.name}`;
        return this.request(`/repos/${repoFullName}/contents/${path}`);
    }

    async createOrUpdateFile(path, content, sha = null) {
        const repoFullName = `${config.repo.owner}/${config.repo.name}`;
        const endpoint = `/repos/${repoFullName}/contents/${path}`;
        const body = {
            message: `Update ${path}`,
            content: btoa(content),
            branch: config.repo.branch
        };

        if (sha) {
            body.sha = sha;
        }

        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }

    async deleteFile(path, sha) {
        const repoFullName = `${config.repo.owner}/${config.repo.name}`;
        return this.request(`/repos/${repoFullName}/contents/${path}`, {
            method: 'DELETE',
            body: JSON.stringify({
                message: `Delete ${path}`,
                sha,
                branch: config.repo.branch
            })
        });
    }
}

export const api = new GitHubAPI();