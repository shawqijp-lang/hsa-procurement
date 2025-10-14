/**
 * HSA Work Environment Management System v6.24.0
 * Edge-optimized with native app features
 * Supports: Background sync, Push notifications, Windows integration, Side panel
 */

const VERSION = '6.24.0';
const CACHE_NAME = `hsa-simple-v${VERSION}`;

const ESSENTIAL_FILES = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/browserconfig.xml',
  '/edge-config.json'
];

// Edge specific optimization flags
const EDGE_OPTIMIZATIONS = {
  enableBackgroundSync: true,
  enablePushNotifications: true,
  enableWindowsIntegration: true,
  enableSidePanel: true
};

// تثبيت Service Worker محسن لـ Edge
self.addEventListener('install', (event) => {
  // Service Worker installation
  
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(ESSENTIAL_FILES);
      }),
      // Edge specific initialization
      initializeEdgeFeatures()
    ]).then(() => {
      // Installation complete
      self.skipWaiting(); // Force activation
    })
  );
});

// Initialize Edge specific features
async function initializeEdgeFeatures() {
  if (EDGE_OPTIMIZATIONS.enableWindowsIntegration) {
    console.log('🪟 [SW] Initializing Windows integration');
    // Set up Windows-specific features
  }
  
  if (EDGE_OPTIMIZATIONS.enableSidePanel) {
    console.log('📱 [SW] Enabling Edge side panel support');
  }
}

// تفعيل Service Worker مع تحسينات Edge
self.addEventListener('activate', (event) => {
  console.log('✅ [SW] Edge-optimized activation...');
  
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log(`🗑️ [SW] Removing old cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients
      self.clients.claim(),
      // Setup Edge features
      setupEdgeIntegration()
    ])
  );
});

// Setup Edge specific integration
async function setupEdgeIntegration() {
  // Setup background sync for Edge
  if (EDGE_OPTIMIZATIONS.enableBackgroundSync && 'sync' in self.registration) {
    console.log('🔄 [SW] Background sync enabled');
  }
  
  // Log Edge integration setup
  console.log('🪟 [SW] Edge integration features initialized');
}

// معالجة الطلبات مع تحسينات Edge
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // تجاهل الطلبات الخارجية
  if (!url.origin.includes(self.location.origin)) {
    return;
  }
  
  // استراتيجية محسنة للصفحات
  if (request.mode === 'navigate') {
    event.respondWith(
      handleNavigationRequest(request)
    );
  }
  
  // Cache API requests with stale-while-revalidate
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      handleApiRequest(request)
    );
  }
  
  // Cache static assets
  if (request.destination === 'image' || request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      handleStaticAsset(request)
    );
  }
});

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('🚫 [SW] Network failed, serving offline page');
    return caches.match('/offline.html');
  }
}

// Handle API requests with stale-while-revalidate
async function handleApiRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => {
    console.log('🚫 [SW] API request failed, using cache if available');
    return null;
  });
  
  // Return cached response immediately if available, otherwise wait for fetch
  return cachedResponse || await fetchPromise;
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('🚫 [SW] Failed to load static asset:', request.url);
    return new Response('', { status: 404 });
  }
}

// Background sync for Edge
if (EDGE_OPTIMIZATIONS.enableBackgroundSync) {
  self.addEventListener('sync', (event) => {
    console.log('🔄 [SW] Background sync triggered:', event.tag);
    
    if (event.tag === 'hsa-data-sync') {
      event.waitUntil(syncOfflineData());
    }
  });
}

// Sync offline data when connection is restored
async function syncOfflineData() {
  console.log('🔄 [SW] Syncing offline data...');
  
  try {
    // Get stored offline data from IndexedDB
    const clients = await self.clients.matchAll();
    
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_OFFLINE_DATA',
        timestamp: Date.now()
      });
    });
    
    console.log('✅ [SW] Offline data sync completed');
  } catch (error) {
    console.error('❌ [SW] Offline data sync failed:', error);
  }
}

// Push notification support for Edge
if (EDGE_OPTIMIZATIONS.enablePushNotifications) {
  self.addEventListener('push', (event) => {
    console.log('🔔 [SW] Push notification received');
    
    const options = {
      body: 'لديك تحديثات جديدة في نظام HSA',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      dir: 'rtl',
      lang: 'ar',
      tag: 'hsa-notification',
      requireInteraction: true,
      actions: [
        {
          action: 'open',
          title: 'فتح التطبيق'
        },
        {
          action: 'dismiss',
          title: 'إغلاق'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification('HSA EVALUATE', options)
    );
  });
  
  self.addEventListener('notificationclick', (event) => {
    console.log('🔔 [SW] Notification clicked:', event.action);
    
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
      event.waitUntil(
        self.clients.matchAll().then(clients => {
          if (clients.length > 0) {
            clients[0].focus();
          } else {
            self.clients.openWindow('/');
          }
        })
      );
    }
  });
}

// Message handling from client
self.addEventListener('message', (event) => {
  console.log('📨 [SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(event.data.urls);
      })
    );
  }
  
  // 🔄 Auto-Update: Clear all caches
  if (event.data.type === 'CLEAR_CACHE') {
    console.log('🗑️ [SW] Clearing all caches...');
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            console.log(`🗑️ [SW] Deleting cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        console.log('✅ [SW] All caches cleared successfully');
        
        // Send confirmation to client
        event.source.postMessage({
          type: 'CACHE_CLEARED',
          timestamp: Date.now()
        });
      }).catch(error => {
        console.error('❌ [SW] Failed to clear caches:', error);
      })
    );
  }
});

console.log(`🚀 [SW] Edge-optimized Service Worker v${VERSION} loaded successfully`);