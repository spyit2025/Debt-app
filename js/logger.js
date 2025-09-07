// Advanced Logging System for Debt Management System
if (typeof Logger === 'undefined') {
class Logger {
    constructor() {
        this.isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname.includes('dev');
        this.logLevel = this.isDevelopment ? 'debug' : 'error';
        this.logHistory = [];
        this.maxHistorySize = 100;
    }

    // Set log level
    setLogLevel(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        if (levels.includes(level)) {
            this.logLevel = level;
        }
    }

    // Check if should log
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.logLevel);
    }

    // Format log message
    formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data,
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        // Add to history
        this.logHistory.push(logEntry);
        if (this.logHistory.length > this.maxHistorySize) {
            this.logHistory.shift();
        }
        
        return logEntry;
    }

    // Debug logging
    debug(message, data = null) {
        if (!this.shouldLog('debug')) return;
        
        const logEntry = this.formatMessage('debug', message, data);
        // Debug logging disabled for production
        
        // Send to analytics in production
        if (!this.isDevelopment) {
            this.sendToAnalytics(logEntry);
        }
    }

    // Info logging
    info(message, data = null) {
        if (!this.shouldLog('info')) return;
        
        const logEntry = this.formatMessage('info', message, data);
        console.info(`[INFO] ${message}`, data || '');
        
        if (!this.isDevelopment) {
            this.sendToAnalytics(logEntry);
        }
    }

    // Warning logging
    warn(message, data = null) {
        if (!this.shouldLog('warn')) return;
        
        const logEntry = this.formatMessage('warn', message, data);
        console.warn(`[WARN] ${message}`, data || '');
        
        if (!this.isDevelopment) {
            this.sendToAnalytics(logEntry);
        }
    }

    // Error logging
    error(message, data = null) {
        if (!this.shouldLog('error')) return;
        
        const logEntry = this.formatMessage('error', message, data);
        console.error(`[ERROR] ${message}`, data || '');
        
        // Always send errors to analytics
        this.sendToAnalytics(logEntry);
    }

    // Send to analytics (placeholder for future implementation)
    sendToAnalytics(logEntry) {
        // TODO: Implement analytics service
        // This could be Google Analytics, Sentry, or custom logging service
    }

    // Get log history
    getLogHistory() {
        return this.logHistory;
    }

    // Clear log history
    clearLogHistory() {
        this.logHistory = [];
    }

    // Export logs for debugging
    exportLogs() {
        return {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            logs: this.logHistory
        };
    }

    // Performance logging
    time(label) {
        if (this.shouldLog('debug')) {
            console.time(label);
        }
    }

    timeEnd(label) {
        if (this.shouldLog('debug')) {
            console.timeEnd(label);
        }
    }

    // Group logging
    group(label) {
        if (this.shouldLog('debug')) {
            console.group(label);
        }
    }

    groupEnd() {
        if (this.shouldLog('debug')) {
            console.groupEnd();
        }
    }
}

// Global logger instance
window.logger = new Logger();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logger;
}
} // End of Logger check
