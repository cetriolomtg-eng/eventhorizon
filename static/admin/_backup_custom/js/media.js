import { config } from './config.js';
import { api } from './api.js';
import { ui } from './ui.js';
import { Storage } from './utils.js';

class MediaManager {
    constructor() {
        this.mediaCache = new Map();
        this.imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.dropZones = new Set();
    }

    /**
     * Inizializza le aree di drop e il browser media
     */
    initialize(galleryContainerId) {
        this.loadCachedMedia();

        if (galleryContainerId) {
            this.galleryContainer = document.getElementById(galleryContainerId);
            this.setupGalleryBrowser();
        }
    }

    /**
     * Aggiunge una drop zone per il drag & drop
     */
    addDropZone(element, onUpload) {
        if (this.dropZones.has(element)) return;

        element.addEventListener('dragenter', e => {
            e.preventDefault();
            element.classList.add('dragover');
        });

        element.addEventListener('dragleave', () => {
            element.classList.remove('dragover');
        });

        element.addEventListener('dragover', e => {
            e.preventDefault();
        });

        element.addEventListener('drop', async e => {
            e.preventDefault();
            element.classList.remove('dragover');

            const files = Array.from(e.dataTransfer.files);
            try {
                const uploadedFiles = await this.uploadFiles(files);
                if (onUpload) {
                    onUpload(uploadedFiles);
                }
            } catch (error) {
                ui.showToast(error.message, 'error');
            }
        });

        this.dropZones.add(element);
    }

    /**
     * Configura il browser delle immagini
     */
    setupGalleryBrowser() {
        if (!this.galleryContainer) return;

        // Aggiunge area di drop
        this.addDropZone(this.galleryContainer, () => this.refreshGallery());

        // Aggiunge pulsante upload
        const uploadBtn = document.createElement('button');
        uploadBtn.className = 'btn upload-btn';
        uploadBtn.innerHTML = '<span class="material-icons">upload</span> Upload';
        uploadBtn.onclick = () => this.showUploadDialog();
        this.galleryContainer.appendChild(uploadBtn);

        // Container per la griglia di immagini
        this.mediaGrid = document.createElement('div');
        this.mediaGrid.className = 'media-grid';
        this.galleryContainer.appendChild(this.mediaGrid);

        this.refreshGallery();
    }

    /**
     * Mostra dialog per upload file
     */
    showUploadDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = this.imageTypes.join(',');
        input.onchange = async () => {
            if (input.files.length) {
                try {
                    await this.uploadFiles(Array.from(input.files));
                    this.refreshGallery();
                } catch (error) {
                    ui.showToast(error.message, 'error');
                }
            }
        };
        input.click();
    }

    /**
     * Upload multiplo di file
     */
    async uploadFiles(files) {
        const uploadedFiles = [];
        const errors = [];

        // Validazione
        for (const file of files) {
            if (!this.imageTypes.includes(file.type)) {
                errors.push(`${file.name}: tipo file non supportato`);
                continue;
            }
            if (file.size > this.maxFileSize) {
                errors.push(`${file.name}: file troppo grande (max 5MB)`);
                continue;
            }
        }

        if (errors.length) {
            throw new Error(errors.join('\\n'));
        }

        // Upload
        const uploads = files.map(async file => {
            try {
                const optimizedFile = await this.optimizeImage(file);
                const uploaded = await this.uploadToGitHub(optimizedFile, file.name);
                uploadedFiles.push(uploaded);
                return uploaded;
            } catch (error) {
                errors.push(`${file.name}: ${error.message}`);
            }
        });

        await Promise.all(uploads);

        if (errors.length) {
            ui.showToast(`Alcuni file non sono stati caricati:\\n${errors.join('\\n')}`, 'warning');
        } else {
            ui.showToast('Upload completato', 'success');
        }

        return uploadedFiles;
    }

    /**
     * Ottimizza immagine prima dell'upload
     */
    async optimizeImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Max dimensions
                    const maxWidth = 1920;
                    const maxHeight = 1080;
                    let width = img.width;
                    let height = img.height;

                    // Scale if needed
                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width *= ratio;
                        height *= ratio;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to WebP if supported
                    if (file.type === 'image/jpeg' || file.type === 'image/png') {
                        canvas.toBlob(resolve, 'image/webp', 0.85);
                    } else {
                        canvas.toBlob(resolve, file.type, 0.85);
                    }
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Carica file su GitHub
     */
    async uploadToGitHub(file, filename) {
        const reader = new FileReader();
        const content = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        // Genera path
        const ext = filename.split('.').pop();
        const path = `static/uploads/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;

        // Upload
        const response = await api.createOrUpdateFile(path, content);

        // Aggiorna cache
        const fileInfo = {
            path,
            url: `/${path}`,
            sha: response.content.sha,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString()
        };
        this.mediaCache.set(path, fileInfo);
        this.saveCache();

        return fileInfo;
    }

    /**
     * Aggiorna vista galleria
     */
    async refreshGallery() {
        if (!this.mediaGrid) return;

        this.mediaGrid.innerHTML = '';
        const files = await this.getMediaFiles();

        files.forEach(file => {
            const item = document.createElement('div');
            item.className = 'media-item';
            
            const img = document.createElement('img');
            img.src = file.url;
            img.alt = file.path.split('/').pop();
            img.loading = 'lazy';
            
            const info = document.createElement('div');
            info.className = 'media-info';
            info.innerHTML = `
                <div class="media-name">${file.path.split('/').pop()}</div>
                <div class="media-meta">${this.formatFileSize(file.size)}</div>
                <button class="btn-copy" data-path="${file.url}">
                    <span class="material-icons">content_copy</span>
                </button>
            `;

            item.appendChild(img);
            item.appendChild(info);
            this.mediaGrid.appendChild(item);

            // Copy URL
            const copyBtn = info.querySelector('.btn-copy');
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(file.url);
                ui.showToast('URL copiato', 'success');
            };
        });
    }

    /**
     * Recupera lista file media
     */
    async getMediaFiles() {
        try {
            const response = await api.getContent('static/uploads');
            const files = response.filter(f => f.type === 'file' && this.isImage(f.name));
            
            files.forEach(f => {
                if (!this.mediaCache.has(f.path)) {
                    this.mediaCache.set(f.path, {
                        path: f.path,
                        url: `/${f.path}`,
                        sha: f.sha,
                        size: f.size,
                        type: this.getFileType(f.name),
                        uploadedAt: new Date().toISOString()
                    });
                }
            });

            this.saveCache();
            return Array.from(this.mediaCache.values());
            
        } catch (error) {
            console.error('Error loading media files:', error);
            return [];
        }
    }

    /**
     * Carica cache dal localStorage
     */
    loadCachedMedia() {
        const cached = Storage.get('media_cache');
        if (cached) {
            cached.forEach(file => this.mediaCache.set(file.path, file));
        }
    }

    /**
     * Salva cache nel localStorage
     */
    saveCache() {
        Storage.set('media_cache', Array.from(this.mediaCache.values()));
    }

    /**
     * Utility per verificare se un file è un'immagine
     */
    isImage(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    }

    /**
     * Recupera tipo MIME da estensione
     */
    getFileType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const types = {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            gif: 'image/gif',
            webp: 'image/webp'
        };
        return types[ext] || 'application/octet-stream';
    }

    /**
     * Formatta dimensione file
     */
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
}

export const media = new MediaManager();