// UI Components Manager
class UIManager {
    constructor() {
        this.templates = new Map();
        this.loadingStates = new Map();
        this.modals = new Map();
    }

    // Template Management
    registerTemplate(id, template) {
        this.templates.set(id, template);
    }

    render(templateId, data = {}) {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template ${templateId} non trovato`);
        }
        return template(data);
    }

    // Loading States
    showLoading(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const currentState = this.loadingStates.get(elementId);
        if (currentState) return; // Already loading

        const originalContent = element.innerHTML;
        element.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <div class="loading-text">Caricamento...</div>
            </div>
        `;

        this.loadingStates.set(elementId, {
            originalContent,
            element
        });
    }

    hideLoading(elementId) {
        const state = this.loadingStates.get(elementId);
        if (!state) return;

        state.element.innerHTML = state.originalContent;
        this.loadingStates.delete(elementId);
    }

    // Modal Management
    createModal(id, options = {}) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = id;
        
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-container">
                <div class="modal-header">
                    <h3>${options.title || ''}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-content">
                    ${options.content || ''}
                </div>
                ${options.footer ? `
                    <div class="modal-footer">
                        ${options.footer}
                    </div>
                ` : ''}
            </div>
        `;

        // Event Handlers
        const closeBtn = modal.querySelector('.modal-close');
        const overlay = modal.querySelector('.modal-overlay');

        const close = () => {
            modal.classList.remove('show');
            if (options.onClose) {
                options.onClose();
            }
        };

        closeBtn.addEventListener('click', close);
        overlay.addEventListener('click', close);

        document.body.appendChild(modal);
        this.modals.set(id, modal);

        return {
            show: () => {
                modal.classList.add('show');
                if (options.onShow) {
                    options.onShow();
                }
            },
            hide: close,
            setContent: (content) => {
                modal.querySelector('.modal-content').innerHTML = content;
            },
            setTitle: (title) => {
                modal.querySelector('.modal-header h3').textContent = title;
            }
        };
    }

    // Toast Notifications
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = message;

        document.body.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300); // Match transition duration
        }, 3000);
    }

    // Form Validation
    validateForm(formElement, schema) {
        const errors = new Map();
        
        for (const [fieldName, rules] of Object.entries(schema)) {
            const field = formElement.elements[fieldName];
            if (!field) continue;

            const value = field.value;
            
            if (rules.required && !value) {
                errors.set(fieldName, 'Campo richiesto');
                continue;
            }

            if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
                errors.set(fieldName, rules.message || 'Formato non valido');
            }

            if (rules.validate) {
                const error = rules.validate(value);
                if (error) {
                    errors.set(fieldName, error);
                }
            }
        }

        // Show validation UI
        formElement.querySelectorAll('.error-message').forEach(el => el.remove());
        
        for (const [fieldName, message] of errors) {
            const field = formElement.elements[fieldName];
            const error = document.createElement('div');
            error.className = 'error-message';
            error.textContent = message;
            field.parentNode.appendChild(error);
        }

        return errors.size === 0;
    }

    // Confirmation Dialog
    async confirm(message, options = {}) {
        return new Promise((resolve) => {
            // Rimuovi modal esistente se presente
            const existing = document.getElementById('confirm-dialog');
            if (existing) {
                existing.remove();
            }

            const modalEl = document.createElement('div');
            modalEl.className = 'modal';
            modalEl.id = 'confirm-dialog';

            modalEl.innerHTML = `
                <div class="modal-overlay"></div>
                <div class="modal-container">
                    <div class="modal-header">
                        <h3>${options.title || 'Conferma'}</h3>
                    </div>
                    <div class="modal-content">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn" data-action="cancel">
                            ${options.cancelText || 'Annulla'}
                        </button>
                        <button class="btn danger" data-action="confirm">
                            ${options.confirmText || 'Conferma'}
                        </button>
                    </div>
                </div>
            `;

            const handleAction = (action) => {
                modalEl.classList.remove('show');
                setTimeout(() => {
                    modalEl.remove();
                }, 300);
                resolve(action === 'confirm');
            };

            const cancelBtn = modalEl.querySelector('[data-action="cancel"]');
            const confirmBtn = modalEl.querySelector('[data-action="confirm"]');
            const overlay = modalEl.querySelector('.modal-overlay');

            cancelBtn.addEventListener('click', () => handleAction('cancel'));
            confirmBtn.addEventListener('click', () => handleAction('confirm'));
            overlay.addEventListener('click', () => handleAction('cancel'));

            // ESC key
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    handleAction('cancel');
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);

            document.body.appendChild(modalEl);

            // Trigger animation
            requestAnimationFrame(() => {
                modalEl.classList.add('show');
                confirmBtn.focus();
            });
        });
    }
}

export const ui = new UIManager();