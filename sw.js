// Service Worker for Debt Management System
const CACHE_NAME = 'debt-app-v2.2.2';
const STATIC_CACHE = 'static-v2.2.2';
const DYNAMIC_CACHE = 'dynamic-v2.2.2';

// Add error handling and logging
const log = (message, data = null) => {
    if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
        // Debug log removed
    }
};

const logError = (message, error = null) => {
    console.error(`[SW] ${message}`, error || '');
};

// Check if domain is allowed for caching
function isAllowedDomain(url) {
    try {
        const urlObj = new URL(url);
        const allowedDomains = [
            'cdn.jsdelivr.net',
            'cdnjs.cloudflare.com',
            'fonts.googleapis.com',
            'fonts.gstatic.com',
            'code.jquery.com',
            'cdn.datatables.net',
            'firebaseapp.com',
            'googleapis.com',
            'gstatic.com'
        ];
        
        // Block external domains that are not in the allowed list
        const isExternal = !urlObj.hostname.includes('localhost') && 
                          !urlObj.hostname.includes('127.0.0.1') && 
                          !urlObj.hostname.includes(window.location.hostname);
        
        if (isExternal && !allowedDomains.some(domain => urlObj.hostname.includes(domain))) {
            return false;
        }
        
        return true;
    } catch (error) {
        return false;
    }
}

// Files to cache immediately - only static assets, not HTML pages
const STATIC_FILES = [
    'css/style.css',
    'css/login.css',
    'css/dashboard-styles.css',
    'css/performance.css',
    'css/responsive-nav.css',
    'js/firebase-config.js',
    'js/firebase-utils.js',
    'js/error-handler.js',
    'js/security-utils.js',
    'js/performance.js',
    'js/auth.js',
    'js/login.js',
    'js/register.js',
    'js/responsive-nav.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
    'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache static files
self.addEventListener('install', event => {
    log('Service Worker installing with cache version:', CACHE_NAME);
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                log('Opened cache:', STATIC_CACHE);
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                log('Service Worker installed successfully');
                return self.skipWaiting();
            })
            .catch(error => {
                logError('Error caching static files:', error);
                // Don't fail the installation if some files can't be cached
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    log('Service Worker activating with cache version:', CACHE_NAME);
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                log('Found caches:', cacheNames);
                return Promise.all(
                    cacheNames.map(cacheName => {
                        // Delete all old caches that don't match current version
                        if (!cacheName.includes('v2.2.2')) {
                            log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                        return Promise.resolve();
                    })
                );
            })
            .then(() => {
                log('Service Worker activated successfully');
                // Clear any malformed cache entries
                return caches.open(DYNAMIC_CACHE)
                    .then(cache => {
                        return cache.keys()
                            .then(requests => {
                                return Promise.all(
                                    requests.map(request => {
                                        // Remove any cached HTML pages that might cause issues
                                        if (request.url.includes('dashboard') && request.url.includes('index.html')) {
                                            log('Removing problematic cache entry:', request.url);
                                            return cache.delete(request);
                                        }
                                        return Promise.resolve();
                                    })
                                );
                            });
                    });
            })
            .then(() => {
                return self.clients.claim();
            })
            .catch(error => {
                logError('Error during activation:', error);
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip Firebase and external API requests
    if (url.hostname.includes('firebase') || 
        url.hostname.includes('googleapis') || 
        url.hostname.includes('gstatic') ||
        url.hostname.includes('cdnjs.cloudflare.com') ||
        url.hostname.includes('cdn.jsdelivr.net')) {
        return;
    }

    // Handle navigation requests
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Only cache successful responses
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(DYNAMIC_CACHE)
                            .then(cache => {
                                cache.put(request, responseClone);
                            });
                    }
                    return response;
                })
                .catch(error => {
                    // If network fails, try cache
                    return caches.match(request)
                        .then(cachedResponse => {
                            if (cachedResponse) {
                                return cachedResponse;
                            }
                            // If no cache, return index.html as fallback
                            return caches.match('index.html');
                        });
                })
        );
        return;
    }

    // Handle static assets
    if (request.destination === 'style' || 
        request.destination === 'script' || 
        request.destination === 'image') {
        event.respondWith(
            caches.match(request)
                .then(response => {
                    if (response) {
                        return response;
                    }
                    return fetch(request)
                        .then(fetchResponse => {
                            // Only cache if response is successful and from allowed domains
                            if (fetchResponse.status === 200 && isAllowedDomain(request.url)) {
                                const responseClone = fetchResponse.clone();
                                caches.open(DYNAMIC_CACHE)
                                    .then(cache => {
                                        cache.put(request, responseClone);
                                    });
                            }
                            return fetchResponse;
                        })
                        .catch(error => {
                            // If fetch fails due to CSP, just return the request without caching
                            console.warn('Failed to fetch resource:', request.url, error);
                            // Don't try to fetch again if it's a CSP error
                            if (error.message.includes('CSP') || error.message.includes('Content Security Policy')) {
                                return new Response('Resource blocked by CSP', { status: 403 });
                            }
                            return fetch(request);
                        });
                })
        );
        return;
    }

    // Default: try network first, fallback to cache
    event.respondWith(
        fetch(request)
            .then(response => {
                // Only cache if response is successful and from allowed domains
                if (response.status === 200 && isAllowedDomain(request.url)) {
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE)
                        .then(cache => {
                            cache.put(request, responseClone);
                        });
                }
                return response;
            })
            .catch(error => {
                // If fetch fails, try cache first
                console.warn('Network request failed:', request.url, error);
                return caches.match(request)
                    .then(cachedResponse => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // If no cache and it's an HTML page, return index.html as fallback
                        if (request.destination === 'document' || request.url.endsWith('.html')) {
                            return caches.match('index.html');
                        }
                        // For other requests, return a basic error response
                        return new Response('Resource not available offline', { 
                            status: 503, 
                            statusText: 'Service Unavailable' 
                        });
                    });
            })
    );
});

// Background sync for offline actions
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    try {
        // Handle any pending offline actions
        // Add your background sync logic here
    } catch (error) {
        // Log error only in development
        if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
            console.error('Background sync failed:', error);
        }
    }
}

// Push notification handling - Removed - notifications not used
// self.addEventListener('push', event => {
//     // Removed - notifications not used
// });

// Notification click handling - Removed - notifications not used
// self.addEventListener('notificationclick', event => {
//     // Removed - notifications not used
// });
