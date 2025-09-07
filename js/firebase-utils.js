// Firebase Utilities for Better Error Handling and Performance
if (typeof FirebaseUtils === 'undefined') {
class FirebaseUtils {
    constructor() {
        this.isInitialized = false;
        this.initializationPromise = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.settingsConfigured = false;
    }

    // Initialize Firebase with retry mechanism
    async initializeFirebase() {
        if (this.isInitialized) {
            return {
                app: window.firebaseApp,
                auth: window.firebaseAuth,
                db: window.firebaseDb
            };
        }

        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._initializeWithRetry();
        return this.initializationPromise;
    }

    // Retry mechanism for Firebase initialization
    async _initializeWithRetry() {
        while (this.retryCount < this.maxRetries) {
            try {
                const result = await this._initializeFirebaseOnce();
                this.isInitialized = true;
                // Firebase initialized successfully
                return result;
            } catch (error) {
                this.retryCount++;
                if (window.logger) {
                    window.logger.warn(`Firebase initialization attempt ${this.retryCount} failed:`, error);
                }
                
                if (this.retryCount >= this.maxRetries) {
                    if (window.logger) {
                        window.logger.error('Firebase initialization failed after all retries');
                    }
                    throw error;
                }
                
                // Wait before retrying
                await this._delay(1000 * this.retryCount);
            }
        }
    }

    // Single Firebase initialization attempt
    async _initializeFirebaseOnce() {
        return new Promise((resolve, reject) => {
            try {
                // Get configuration from global scope
                const firebaseConfig = window.firebaseConfig;
                if (!firebaseConfig) {
                    throw new Error('Firebase configuration not found. Make sure firebase-config.js is loaded first.');
                }

                // Check if Firebase is already initialized
                if (!firebase.apps.length) {
                    const app = firebase.initializeApp(firebaseConfig);
                    const auth = firebase.auth(app);
                    const db = firebase.firestore(app);
                    
                    // Configure settings only once for new initialization
                    if (!this.settingsConfigured && !window.firebaseSettingsConfigured) {
                        try {
                            // Check if settings are already configured
                            const currentSettings = db._delegate._settings;
                            if (!currentSettings || Object.keys(currentSettings).length === 0) {
                                // Only configure if no settings exist
                                db.settings({
                                    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
                                    experimentalForceLongPolling: false, // ปิด long polling
                                    useFetchStreams: false,
                                    ignoreUndefinedProperties: true
                                });
                            }
                        } catch (settingsError) {
                            // Settings already configured, ignore error
                            if (window.logger) {
                                window.logger.debug('Firestore settings already configured');
                            }
                        }
                        
                        // Disable persistence for better mobile compatibility
                        // db.enablePersistence({
                        //     synchronizeTabs: true
                        // }).catch((err) => {
                        //     if (err.code === 'failed-precondition') {
                        //         console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
                        //     } else if (err.code === 'unimplemented') {
                        //         console.warn('The current browser does not support persistence.');
                        //     }
                        // });
                        
                        this.settingsConfigured = true;
                        window.firebaseSettingsConfigured = true;
                    }
                    
                    // Export to global scope
                    window.firebaseApp = app;
                    window.firebaseAuth = auth;
                    window.firebaseDb = db;
                    
                    resolve({ app, auth, db });
                } else {
                    // Firebase already initialized, just get existing instances
                    const app = firebase.app();
                    const auth = firebase.auth(app);
                    const db = firebase.firestore(app);
                    
                    // Export to global scope
                    window.firebaseApp = app;
                    window.firebaseAuth = auth;
                    window.firebaseDb = db;
                    
                    resolve({ app, auth, db });
                }
                
                // Dispatch ready event
                window.dispatchEvent(new CustomEvent('firebaseReady'));
                
            } catch (error) {
                reject(error);
            }
        });
    }

    // Delay utility
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Check if Firebase is ready
    isFirebaseReady() {
        return this.isInitialized && 
               window.firebaseApp && 
               window.firebaseAuth && 
               window.firebaseDb;
    }

    // Get Firebase instances safely
    getFirebaseInstances() {
        if (!this.isFirebaseReady()) {
            throw new Error('Firebase is not initialized');
        }
        
        return {
            app: window.firebaseApp,
            auth: window.firebaseAuth,
            db: window.firebaseDb
        };
    }

    // Wait for Firebase to be ready
    async waitForFirebase() {
        if (this.isFirebaseReady()) {
            return this.getFirebaseInstances();
        }
        
        return new Promise((resolve) => {
            const checkReady = () => {
                if (this.isFirebaseReady()) {
                    resolve(this.getFirebaseInstances());
                } else {
                    setTimeout(checkReady, 100);
                }
            };
            checkReady();
        });
    }

    // Optimized Firestore query with error handling
    async optimizedQuery(query, options = {}) {
        try {
            const { db } = await this.waitForFirebase();
            
            const {
                limit = 20,
                orderBy = 'createdAt',
                orderDirection = 'desc',
                cacheTime = 5 * 60 * 1000 // 5 minutes
            } = options;

            return await query
                .orderBy(orderBy, orderDirection)
                .limit(limit)
                .get({ source: 'cache' })
                .catch(() => query.get()); // Fallback to network
                
        } catch (error) {
            console.error('Optimized query failed:', error);
            throw error;
        }
    }

    // Safe authentication check
    async checkAuthState() {
        try {
            const { auth } = await this.waitForFirebase();
            return new Promise((resolve) => {
                const unsubscribe = auth.onAuthStateChanged((user) => {
                    unsubscribe();
                    resolve(user);
                });
            });
        } catch (error) {
            console.error('Auth state check failed:', error);
            return null;
        }
    }

    // Performance monitoring for Firebase operations
    async measureFirebaseOperation(name, operation) {
        const start = performance.now();
        try {
            const result = await operation();
            const end = performance.now();
            console.log(`${name} took ${(end - start).toFixed(2)}ms`);
            return result;
        } catch (error) {
            const end = performance.now();
            console.error(`${name} failed after ${(end - start).toFixed(2)}ms:`, error);
            throw error;
        }
    }

    // Cleanup method
    cleanup() {
        this.isInitialized = false;
        this.initializationPromise = null;
        this.retryCount = 0;
        this.settingsConfigured = false;
        window.firebaseSettingsConfigured = false;
    }
}

// Global Firebase utils instance
window.firebaseUtils = new FirebaseUtils();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.firebaseUtils.initializeFirebase()
        .then(() => {
            // Firebase utils initialized successfully
        })
        .catch(error => {
            console.error('Firebase utils initialization failed:', error);
        });
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseUtils;
}
} // End of FirebaseUtils check
