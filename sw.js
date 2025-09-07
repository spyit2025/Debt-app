// Service Worker for Debt Management System
const CACHE_NAME = 'debt-app-v2.2.1';
const STATIC_CACHE = 'static-v2.2.1';
const DYNAMIC_CACHE = 'dynamic-v2.2.1';

// Add error handling and logging
const log = (message, data = null) => {
    if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
        console.log(`[SW] ${message}`, data || '');
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
            'cdn.datatables.net'
        ];
        
        return allowedDomains.some(domain => urlObj.hostname.includes(domain));
    } catch (error) {
        return false;
    }
}

// Files to cache immediately
const STATIC_FILES = [
    '/',
    'index.html',
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
    'pages/auth/register.html',
    'pages/dashboard/creditor-dashboard.html',
    'pages/dashboard/debtor-dashboard.html',
    'pages/dashboard/creditor-dashboard.js',
    'pages/dashboard/debtor-dashboard.js',
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
                        if (!cacheName.includes('v2.2.1')) {
                            log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                        return Promise.resolve();
                    })
                );
            })
            .then(() => {
                log('Service Worker activated successfully');
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
            caches.match('index.html')
                .then(response => {
                    return response || fetch(request);
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
                // If fetch fails due to CSP, try cache first
                console.warn('Network request failed:', request.url, error);
                return caches.match(request);
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

// Push notification handling
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: 1
            },
            actions: [
                {
                    action: 'explore',
                    title: 'ดูรายละเอียด',
                    icon: '/favicon.ico'
                },
                {
                    action: 'close',
                    title: 'ปิด',
                    icon: '/favicon.ico'
                }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// Notification click handling
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/pages/dashboard/creditor-dashboard.html')
        );
    }
});
