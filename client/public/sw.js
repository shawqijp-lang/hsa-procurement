// 🔧 HSA EVALUATE - Service Worker النظام الموحد
// تم التطوير بواسطة النظام الموحد لـ HSA GROUP

const CACHE_NAME = 'hsa-evaluate-unified-v1.0';
const OFFLINE_URL = '/';

// الملفات الأساسية للتطبيق
const ESSENTIAL_FILES = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/index.css',
  '/manifest.json'
];

// تثبيت Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 [SW] تثبيت Service Worker للنظام الموحد...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('💾 [SW] حفظ الملفات الأساسية...');
        return cache.addAll(ESSENTIAL_FILES.map(url => new Request(url, {
          cache: 'reload'
        })));
      })
      .then(() => {
        console.log('✅ [SW] تم تثبيت النظام الموحد offline');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.warn('⚠️ [SW] فشل في حفظ بعض الملفات:', error);
      })
  );
});

// تفعيل Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 [SW] تفعيل Service Worker للنظام الموحد...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ [SW] حذف cache قديم:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ [SW] تم تفعيل النظام الموحد');
      return self.clients.claim();
    })
  );
});

// معالجة طلبات الشبكة
self.addEventListener('fetch', (event) => {
  // تجاهل طلبات غير HTTP
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // استراتيجية Network First للـ API
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // حفظ استجابات API المهمة
          if (response.ok && (
            event.request.url.includes('/api/companies/public') ||
            event.request.url.includes('/api/locations') ||
            event.request.url.includes('/api/checklist-templates')
          )) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // إذا فشل الـ network، جرب الـ cache
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('📱 [SW] استخدام بيانات محفوظة:', event.request.url);
                return cachedResponse;
              }
              // إذا لم توجد في الـ cache، أرجع رسالة خطأ مناسبة
              return new Response(JSON.stringify({
                error: 'وضع عدم الاتصال - البيانات غير متاحة',
                offline: true
              }), {
                status: 503,
                statusText: 'Service Unavailable - Offline Mode',
                headers: {
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-store'
                }
              });
            });
        })
    );
    return;
  }

  // استراتيجية Cache First للملفات الثابتة
  if (
    event.request.destination === 'document' ||
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    event.request.destination === 'image'
  ) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(event.request)
            .then((response) => {
              // حفظ في الـ cache إذا كانت الاستجابة صحيحة
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseClone);
                });
              }
              return response;
            })
            .catch(() => {
              // إذا فشل كل شيء، أرجع الصفحة الرئيسية للـ SPA routing
              if (event.request.destination === 'document') {
                return caches.match(OFFLINE_URL);
              }
              return new Response('', {
                status: 408,
                statusText: 'Request Timeout - Offline Mode'
              });
            });
        })
    );
    return;
  }

  // للطلبات الأخرى، جرب الشبكة أولاً
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// معالجة رسائل من التطبيق الرئيسي
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('🔄 [SW] تطبيق التحديث فوراً...');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_NAME,
      status: 'active'
    });
  }
});

// معالجة أخطاء غير متوقعة
self.addEventListener('error', (event) => {
  console.error('❌ [SW] خطأ في Service Worker:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ [SW] Promise rejection:', event.reason);
  event.preventDefault();
});

console.log('🎯 [SW] Service Worker النظام الموحد جاهز - HSA EVALUATE');