// Global Error Handler for Better Error Management
if (typeof ErrorHandler === 'undefined') {
class ErrorHandler {
    constructor() {
        this.errorCount = 0;
        this.maxErrors = 10;
        this.errorLog = [];
        this.isInitialized = false;
    }

    // Initialize error handler
    init() {
        if (this.isInitialized) return;
        
        this.setupGlobalErrorHandlers();
        this.setupUnhandledRejectionHandler();
        this.isInitialized = true;
        
        // Error handler initialized
        if (window.logger) {
            window.logger.debug('Error handler initialized');
        }
    }

    // Setup global error handlers
    setupGlobalErrorHandlers() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.handleError(event.error || new Error(event.message), {
                type: 'error',
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                timestamp: new Date().toISOString()
            });
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, {
                type: 'unhandledrejection',
                timestamp: new Date().toISOString()
            });
        });
    }

    // Setup unhandled rejection handler
    setupUnhandledRejectionHandler() {
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handleError(event.reason, {
                type: 'unhandledrejection',
                timestamp: new Date().toISOString()
            });
        });
    }

    // Handle errors
    handleError(error, context = {}) {
        this.errorCount++;
        
        const errorInfo = {
            message: error.message || 'Unknown error',
            stack: error.stack,
            name: error.name,
            count: this.errorCount,
            timestamp: context.timestamp || new Date().toISOString(),
            type: context.type || 'unknown',
            filename: context.filename,
            lineno: context.lineno,
            colno: context.colno,
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        // Log error
        this.logError(errorInfo);

        // Show user-friendly error message
        this.showUserError(errorInfo);

        // Prevent error spam
        if (this.errorCount > this.maxErrors) {
            if (window.logger) {
                window.logger.warn('Too many errors, stopping error logging');
            }
            return;
        }
    }

    // Log error
    logError(errorInfo) {
        this.errorLog.push(errorInfo);
        
        // Keep only last 50 errors
        if (this.errorLog.length > 50) {
            this.errorLog.shift();
        }

        if (window.logger) {
            window.logger.error('Error logged:', errorInfo);
        }
    }

    // Show user-friendly error message
    showUserError(errorInfo) {
        // Don't show errors for common issues
        if (this.isCommonError(errorInfo)) {
            return;
        }

        // Create error message
        this.createErrorNotification(errorInfo);
    }

    // Check if error is common and should be ignored
    isCommonError(errorInfo) {
        const commonErrors = [
            'Script error',
            'ResizeObserver loop limit exceeded',
            'NetworkError when attempting to fetch resource',
            'Failed to fetch',
            'The user aborted a request'
        ];

        return commonErrors.some(commonError => 
            errorInfo.message.includes(commonError)
        );
    }

    // Create error message
    createErrorNotification(errorInfo) {
        // Check if error message already exists
        const existingNotification = document.getElementById('error-notification');
        if (existingNotification) {
            return;
        }

        const notification = document.createElement('div');
        notification.id = 'error-notification';
        notification.className = 'alert alert-danger alert-dismissible fade show position-fixed';
        notification.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;

        notification.innerHTML = `
            <strong>เกิดข้อผิดพลาด</strong>
            <p class="mb-1">${this.getUserFriendlyMessage(errorInfo)}</p>
            <small class="text-muted">รหัสข้อผิดพลาด: ${errorInfo.count}</small>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
    }

    // Get user-friendly error message
    getUserFriendlyMessage(errorInfo) {
        const errorMessages = {
            'FirebaseError': 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล',
            'NetworkError': 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย',
            'TypeError': 'เกิดข้อผิดพลาดในการประมวลผลข้อมูล',
            'ReferenceError': 'เกิดข้อผิดพลาดในการอ้างอิงข้อมูล',
            'SyntaxError': 'เกิดข้อผิดพลาดในโค้ดโปรแกรม',
            'default': 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง'
        };

        return errorMessages[errorInfo.name] || errorMessages.default;
    }

    // Handle Firebase specific errors
    handleFirebaseError(error) {
        const firebaseErrorMessages = {
            'auth/user-not-found': 'ไม่พบผู้ใช้นี้ในระบบ',
            'auth/wrong-password': 'รหัสผ่านไม่ถูกต้อง',
            'auth/invalid-email': 'รูปแบบอีเมลไม่ถูกต้อง',
            'auth/too-many-requests': 'มีการพยายามเข้าสู่ระบบมากเกินไป กรุณาลองใหม่ภายหลัง',
            'auth/network-request-failed': 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย',
            'auth/user-disabled': 'บัญชีผู้ใช้ถูกระงับการใช้งาน',
            'permission-denied': 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้',
            'unavailable': 'บริการไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง',
            'deadline-exceeded': 'การเชื่อมต่อหมดเวลา กรุณาลองใหม่',
            'default': 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล'
        };

        const message = firebaseErrorMessages[error.code] || firebaseErrorMessages.default;
        
        this.showToast(message, 'error');
        
        return message;
    }

    // Show toast message
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');

        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }

        toastContainer.appendChild(toast);

        // Initialize and show toast
        const bsToast = new bootstrap.Toast(toast, {
            autohide: true,
            delay: 5000
        });
        bsToast.show();

        // Remove toast element after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    // Get error statistics
    getErrorStats() {
        return {
            totalErrors: this.errorCount,
            recentErrors: this.errorLog.slice(-10),
            errorTypes: this.getErrorTypeCounts()
        };
    }

    // Get error type counts
    getErrorTypeCounts() {
        const counts = {};
        this.errorLog.forEach(error => {
            counts[error.type] = (counts[error.type] || 0) + 1;
        });
        return counts;
    }

    // Clear error log
    clearErrorLog() {
        this.errorLog = [];
        this.errorCount = 0;
    }

    // Cleanup
    cleanup() {
        this.errorLog = [];
        this.errorCount = 0;
        this.isInitialized = false;
    }
}

// Global error handler instance
window.errorHandler = new ErrorHandler();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.errorHandler.init();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}
} // End of ErrorHandler check

