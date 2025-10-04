import { ui } from './ui.js';
import { Storage } from './utils.js';
import { marked } from 'https://cdn.jsdelivr.net/npm/marked@4.3.0/lib/marked.esm.js';

class MarkdownEditor {
    constructor() {
        this.editor = null;
        this.preview = null;
        this.toolbar = null;
        this.content = '';
        this.history = [];
        this.historyIndex = -1;
        this.lastSave = null;
    }

    async initialize(editorId, previewId, toolbarId) {
        // Get DOM elements
        this.editor = document.getElementById(editorId);
        this.preview = document.getElementById(previewId);
        this.toolbar = document.getElementById(toolbarId);

        if (!this.editor || !this.preview || !this.toolbar) {
            throw new Error('Editor elements not found');
        }

        // Setup CodeMirror
        await this.setupCodeMirror();
        
        // Setup preview
        this.setupPreview();
        
        // Setup toolbar
        this.setupToolbar();

        // Setup autosave
        this.setupAutosave();

        // Restore last content if available
        this.restoreContent();
    }

    async setupCodeMirror() {
        // Load CodeMirror dynamically
        await Promise.all([
            this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.js'),
            this.loadStyle('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.css'),
            this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/markdown/markdown.min.js'),
            this.loadStyle('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/monokai.min.css')
        ]);

        // Initialize CodeMirror
        this.cm = CodeMirror.fromTextArea(this.editor, {
            mode: 'markdown',
            theme: 'monokai',
            lineNumbers: true,
            lineWrapping: true,
            extraKeys: {
                'Ctrl-B': () => this.toggleFormat('bold'),
                'Ctrl-I': () => this.toggleFormat('italic'),
                'Ctrl-L': () => this.toggleFormat('link'),
                'Ctrl-K': () => this.toggleFormat('code'),
                'Ctrl-Z': () => this.undo(),
                'Ctrl-Y': () => this.redo(),
                'Ctrl-S': (cm) => {
                    cm.save();
                    this.saveContent();
                    return true;
                }
            }
        });

        // Update preview on change
        this.cm.on('change', () => {
            this.updatePreview();
            this.addToHistory();
        });
    }

    setupPreview() {
        // Configure marked options
        marked.use({
            breaks: true,
            gfm: true
        });

        // Initial preview
        this.updatePreview();
    }

    setupToolbar() {
        const tools = [
            { icon: 'format_bold', cmd: 'bold', text: '**text**' },
            { icon: 'format_italic', cmd: 'italic', text: '_text_' },
            { icon: 'link', cmd: 'link', text: '[text](url)' },
            { icon: 'code', cmd: 'code', text: '`code`' },
            { icon: 'format_quote', cmd: 'quote', text: '> quote' },
            { icon: 'format_list_bulleted', cmd: 'ul', text: '- item' },
            { icon: 'format_list_numbered', cmd: 'ol', text: '1. item' },
            { icon: 'title', cmd: 'h2', text: '## Heading' },
            { icon: 'image', cmd: 'image', text: '![alt](url)' }
        ];

        tools.forEach(tool => {
            const button = document.createElement('button');
            button.className = 'editor-btn';
            button.innerHTML = `<span class="material-icons">${tool.icon}</span>`;
            button.title = tool.cmd;
            button.addEventListener('click', () => this.toggleFormat(tool.cmd));
            this.toolbar.appendChild(button);
        });

        // Add preview toggle
        const previewBtn = document.createElement('button');
        previewBtn.className = 'editor-btn preview-toggle';
        previewBtn.innerHTML = '<span class="material-icons">visibility</span>';
        previewBtn.title = 'Toggle Preview';
        previewBtn.addEventListener('click', () => this.togglePreview());
        this.toolbar.appendChild(previewBtn);
    }

    setupAutosave() {
        // Autosave every 30 seconds if there are changes
        setInterval(() => {
            if (this.hasUnsavedChanges()) {
                this.saveContent();
            }
        }, 30000);

        // Save before unload
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges()) {
                this.saveContent();
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    toggleFormat(type) {
        const cm = this.cm;
        const selection = cm.getSelection();
        
        const formats = {
            bold: { prefix: '**', suffix: '**', placeholder: 'testo in grassetto' },
            italic: { prefix: '_', suffix: '_', placeholder: 'testo in corsivo' },
            link: { prefix: '[', suffix: '](url)', placeholder: 'testo del link' },
            code: { prefix: '`', suffix: '`', placeholder: 'codice' },
            quote: { prefix: '> ', suffix: '', placeholder: 'citazione' },
            ul: { prefix: '- ', suffix: '', placeholder: 'elemento lista' },
            ol: { prefix: '1. ', suffix: '', placeholder: 'elemento lista' },
            h2: { prefix: '## ', suffix: '', placeholder: 'titolo' },
            image: { prefix: '![', suffix: '](url)', placeholder: 'testo alternativo' }
        };

        const format = formats[type];
        if (!format) return;

        const text = selection || format.placeholder;
        const replacement = format.prefix + text + format.suffix;

        cm.replaceSelection(replacement);
        
        if (!selection) {
            const cursor = cm.getCursor();
            const start = cursor.ch - format.suffix.length - format.placeholder.length;
            cm.setSelection(
                { line: cursor.line, ch: start },
                { line: cursor.line, ch: start + format.placeholder.length }
            );
        }

        cm.focus();
    }

    updatePreview() {
        const content = this.cm.getValue();
        const html = marked.parse(content);
        this.preview.innerHTML = html;
    }

    togglePreview() {
        this.preview.classList.toggle('hidden');
        this.cm.getWrapperElement().classList.toggle('hidden');
    }

    // History management
    addToHistory() {
        const content = this.cm.getValue();
        
        // Don't add if content hasn't changed
        if (this.history[this.historyIndex] === content) return;
        
        // Remove future history if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        this.history.push(content);
        this.historyIndex++;
        
        // Limit history size
        if (this.history.length > 100) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.cm.setValue(this.history[this.historyIndex]);
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.cm.setValue(this.history[this.historyIndex]);
        }
    }

    // Content management
    saveContent() {
        const content = this.cm.getValue();
        Storage.set('markdown_content', content);
        this.lastSave = content;
        ui.showToast('Contenuto salvato', 'success');
    }

    restoreContent() {
        const content = Storage.get('markdown_content');
        if (content) {
            this.cm.setValue(content);
            this.lastSave = content;
            this.addToHistory();
        }
    }

    hasUnsavedChanges() {
        return this.cm.getValue() !== this.lastSave;
    }

    // Utility
    async loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async loadStyle(url) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }
}

export const editor = new MarkdownEditor();