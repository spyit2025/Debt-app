// Performance Optimization Utilities
if (typeof PerformanceOptimizer === 'undefined') {
class PerformanceOptimizer {
    constructor() {
        this.debounceTimers = new Map();
        this.throttleTimers = new Map();
        this.intersectionObservers = new Map();
        this.lazyLoadQueue = [];
        this.isInitialized = false;
    }

    // Initialize performance optimizations
    init() {
        if (this.isInitialized) return;
        
        this.setupLazyLoading();
        this.setupIntersectionObserver();
        this.optimizeImages();
        this.setupResourceHints();
        this.isInitialized = true;
        
        // Performance optimizer initialized
        if (window.logger) {
            window.logger.debug('Performance optimizer initialized');
        }
    }

    // Debounce function calls
    debounce(func, delay, key = 'default') {
        return (...args) => {
            if (this.debounceTimers.has(key)) {
                clearTimeout(this.debounceTimers.get(key));
            }
            
            const timer = setTimeout(() => {
                func.apply(this, args);
                this.debounceTimers.delete(key);
            }, delay);
            
            this.debounceTimers.set(key, timer);
        };
    }

    // Throttle function calls
    throttle(func, limit, key = 'default') {
        return (...args) => {
            if (!this.throttleTimers.has(key)) {
                func.apply(this, args);
                this.throttleTimers.set(key, true);
                
                setTimeout(() => {
                    this.throttleTimers.delete(key);
                }, limit);
            }
        };
    }

    // Lazy load images
    setupLazyLoading() {
        const images = document.querySelectorAll('img[data-src]');
        
        if (images.length === 0) return;

        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.01
        });

        images.forEach(img => imageObserver.observe(img));
    }

    // Setup intersection observer for animations
    setupIntersectionObserver() {
        const animatedElements = document.querySelectorAll('[data-animate]');
        
        if (animatedElements.length === 0) return;

        const animationObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        animatedElements.forEach(el => animationObserver.observe(el));
    }

    // Optimize images
    optimizeImages() {
        const images = document.querySelectorAll('img');
        
        images.forEach(img => {
            // Add loading="lazy" to images below the fold
            if (!img.hasAttribute('loading')) {
                img.setAttribute('loading', 'lazy');
            }
            
            // Add decoding="async" for better performance
            if (!img.hasAttribute('decoding')) {
                img.setAttribute('decoding', 'async');
            }
        });
    }

    // Setup resource hints
    setupResourceHints() {
        // Preconnect to external domains
        const domains = [
            'https://cdn.jsdelivr.net',
            'https://fonts.googleapis.com',
            'https://fonts.gstatic.com',
            'https://cdnjs.cloudflare.com',
            'https://www.gstatic.com'
        ];

        domains.forEach(domain => {
            const link = document.createElement('link');
            link.rel = 'preconnect';
            link.href = domain;
            link.crossOrigin = 'anonymous';
            document.head.appendChild(link);
        });
    }

    // Batch DOM updates
    batchDOMUpdates(updates) {
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                updates.forEach(update => update());
                resolve();
            });
        });
    }

    // Optimize Firebase queries
    optimizeFirebaseQuery(query, options = {}) {
        const {
            limit = 20,
            orderBy = 'createdAt',
            orderDirection = 'desc',
            cacheTime = 5 * 60 * 1000 // 5 minutes
        } = options;

        return query
            .orderBy(orderBy, orderDirection)
            .limit(limit)
            .get({ source: 'cache' })
            .catch(() => query.get()); // Fallback to network
    }

    // Memory management
    cleanup() {
        // Clear timers
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
        
        this.throttleTimers.clear();
        
        // Disconnect observers
        this.intersectionObservers.forEach(observer => observer.disconnect());
        this.intersectionObservers.clear();
        
        // Clear lazy load queue
        this.lazyLoadQueue = [];
    }

    // Performance monitoring
    measurePerformance(name, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        
        if (window.logger) {
            window.logger.debug(`${name} took ${(end - start).toFixed(2)}ms`);
        }
        return result;
    }

    // Async performance measurement
    async measureAsyncPerformance(name, asyncFn) {
        const start = performance.now();
        const result = await asyncFn();
        const end = performance.now();
        
        if (window.logger) {
            window.logger.debug(`${name} took ${(end - start).toFixed(2)}ms`);
        }
        return result;
    }
}

// Global performance optimizer instance
window.performanceOptimizer = new PerformanceOptimizer();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.performanceOptimizer.init();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    window.performanceOptimizer.cleanup();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceOptimizer;
}
} // End of PerformanceOptimizer check
