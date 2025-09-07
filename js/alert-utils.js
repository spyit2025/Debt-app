// Bootstrap Alert Utilities
// ใช้สำหรับแสดง Bootstrap Alerts แทน alert() แบบเก่า
if (typeof AlertUtils === 'undefined') {
class AlertUtils {
    constructor() {
        this.alertContainer = null;
        this.init();
    }

    // Initialize alert container
    init() {
        // Create alert container if it doesn't exist
        if (!document.getElementById('alert-container')) {
            this.alertContainer = document.createElement('div');
            this.alertContainer.id = 'alert-container';
            this.alertContainer.className = 'position-fixed top-0 start-50 translate-middle-x mt-3';
            this.alertContainer.style.zIndex = '99999';
            document.body.appendChild(this.alertContainer);
        } else {
            this.alertContainer = document.getElementById('alert-container');
        }
    }

    // Show Bootstrap alert
    show(message, type = 'info', options = {}) {
        const {
            duration = 5000,
            dismissible = true,
            position = 'top-center', // top-center, top-right, top-left, bottom-center
            icon = null,
            title = null
        } = options;

        // Remove existing alerts if specified
        if (options.replace) {
            this.clear();
        }

        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} ${dismissible ? 'alert-dismissible' : ''} fade show mb-2`;
        alertDiv.setAttribute('role', 'alert');

        // Build alert content
        let content = '';
        
        if (icon) {
            content += `<i class="${icon} me-2"></i>`;
        }
        
        if (title) {
            content += `<strong>${title}</strong><br>`;
        }
        
        content += message;

        if (dismissible) {
            content += `
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="ปิด"></button>
            `;
        }

        alertDiv.innerHTML = content;

        // Position the alert
        this.positionAlert(alertDiv, position);

        // Add to container
        this.alertContainer.appendChild(alertDiv);

        // Auto dismiss after duration
        if (duration > 0) {
            setTimeout(() => {
                this.dismiss(alertDiv);
            }, duration);
        }

        return alertDiv;
    }

    // Position alert based on position option
    positionAlert(alertDiv, position) {
        const container = this.alertContainer;
        
        // Reset classes
        container.className = 'position-fixed mt-3';
        container.style.zIndex = '99999';

        switch (position) {
            case 'top-center':
                container.classList.add('start-50', 'translate-middle-x');
                container.style.top = '100px'; // แสดงต่ำกว่า header
                break;
            case 'top-right':
                container.classList.add('end-0', 'me-3');
                container.style.top = '100px'; // แสดงต่ำกว่า header
                break;
            case 'top-left':
                container.classList.add('start-0', 'ms-3');
                container.style.top = '100px'; // แสดงต่ำกว่า header
                break;
            case 'bottom-center':
                container.classList.add('bottom-0', 'start-50', 'translate-middle-x', 'mb-3');
                break;
            case 'bottom-right':
                container.classList.add('bottom-0', 'end-0', 'me-3', 'mb-3');
                break;
            case 'bottom-left':
                container.classList.add('bottom-0', 'start-0', 'ms-3', 'mb-3');
                break;
            default:
                container.classList.add('top-0', 'start-50', 'translate-middle-x');
        }
    }

    // Dismiss specific alert
    dismiss(alertElement) {
        if (alertElement && alertElement.parentNode) {
            alertElement.classList.remove('show');
            setTimeout(() => {
                if (alertElement.parentNode) {
                    alertElement.remove();
                }
            }, 150); // Match Bootstrap fade duration
        }
    }

    // Clear all alerts
    clear() {
        if (this.alertContainer) {
            this.alertContainer.innerHTML = '';
        }
    }

    // Convenience methods for different alert types
    success(message, options = {}) {
        return this.show(message, 'success', {
            icon: 'fas fa-check-circle',
            ...options
        });
    }

    error(message, options = {}) {
        return this.show(message, 'danger', {
            icon: 'fas fa-exclamation-circle',
            duration: 7000, // Longer duration for errors
            ...options
        });
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', {
            icon: 'fas fa-exclamation-triangle',
            ...options
        });
    }

    info(message, options = {}) {
        return this.show(message, 'info', {
            icon: 'fas fa-info-circle',
            ...options
        });
    }

    // Show toast-style alert (non-intrusive)
    toast(message, type = 'info', options = {}) {
        return this.show(message, type, {
            position: 'top-right',
            duration: 3000,
            dismissible: true,
            ...options
        });
    }

    // Show confirmation dialog using Bootstrap modal
    confirm(message, title = 'ยืนยัน', options = {}) {
        return new Promise((resolve) => {
            const modalId = 'confirmModal_' + Date.now();
            const modalHtml = `
                <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">${title}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                ${message}
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                                <button type="button" class="btn btn-primary" id="confirmBtn">ยืนยัน</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Add modal to body
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = new bootstrap.Modal(document.getElementById(modalId));

            // Handle confirm button
            document.getElementById('confirmBtn').addEventListener('click', () => {
                modal.hide();
                resolve(true);
            });

            // Handle cancel/close
            document.getElementById(modalId).addEventListener('hidden.bs.modal', () => {
                document.getElementById(modalId).remove();
                resolve(false);
            });

            // Show modal
            modal.show();
        });
    }
}

// Create global instance
window.alertUtils = new AlertUtils();

// Convenience functions for backward compatibility
window.showAlert = (message, type, options = {}) => {
    return window.alertUtils.show(message, type, options);
};

window.showSuccess = (message, options = {}) => {
    return window.alertUtils.success(message, options);
};

window.showError = (message, options = {}) => {
    return window.alertUtils.error(message, options);
};

window.showWarning = (message, options = {}) => {
    return window.alertUtils.warning(message, options);
};

window.showInfo = (message, options = {}) => {
    return window.alertUtils.info(message, options);
};

window.showToast = (message, type = 'info', options = {}) => {
    return window.alertUtils.toast(message, type, options);
};

window.showConfirm = (message, title, options = {}) => {
    return window.alertUtils.confirm(message, title, options);
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AlertUtils;
}
} // End of AlertUtils check
