/**
 * PWA Enhancer - يحسن تجربة PWA لتبدو كتطبيق رسمي
 * يخفي مؤشرات المتصفح ويحسن السلوك على الهواتف
 */

export class PWAEnhancer {
  private static instance: PWAEnhancer;
  
  constructor() {
    this.init();
  }
  
  static getInstance(): PWAEnhancer {
    if (!PWAEnhancer.instance) {
      PWAEnhancer.instance = new PWAEnhancer();
    }
    return PWAEnhancer.instance;
  }
  
  private init(): void {
    // تحسين PWA عند تحميل الصفحة
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.enhance());
    } else {
      this.enhance();
    }
  }
  
  private enhance(): void {
    // إخفاء شريط العناوين على الهواتف
    this.hideAddressBar();
    
    // منع سلوكيات المتصفح غير المرغوبة
    this.preventBrowserBehaviors();
    
    // تحسين الإشعارات والتنبيهات
    this.enhanceNotifications();
    
    // إضافة استماع للأحداث المهمة
    this.addEventListeners();
    
    // تحسين مظهر التطبيق في وضع standalone
    this.enhanceStandaloneMode();
    
    console.log('🚀 PWA Enhancement activated - التطبيق محسن ليبدو رسمياً');
  }
  
  private hideAddressBar(): void {
    // إخفاء شريط العناوين على الهواتف
    setTimeout(() => {
      window.scrollTo(0, 1);
    }, 100);
    
    // إخفاء شريط العناوين عند اللمس
    document.addEventListener('touchstart', () => {
      if (window.scrollY === 0) {
        window.scrollTo(0, 1);
      }
    }, { passive: true });
  }
  
  private preventBrowserBehaviors(): void {
    // منع zoom على الهواتف
    document.addEventListener('gesturestart', (e) => {
      e.preventDefault();
    });
    
    document.addEventListener('gesturechange', (e) => {
      e.preventDefault();
    });
    
    document.addEventListener('gestureend', (e) => {
      e.preventDefault();
    });
    
    // منع السحب للتحديث على أندرويد
    document.body.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    });
    
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
    
    // منع النقر المزدوج للزوم
    document.addEventListener('dblclick', (e) => {
      e.preventDefault();
    });
  }
  
  private enhanceNotifications(): void {
    // إخفاء إشعارات المتصفح التلقائية
    if ('serviceWorker' in navigator) {
      // التحقق من وجود Service Worker مسجل مسبقاً
      navigator.serviceWorker.getRegistration('/sw.js').then((registration) => {
        if (!registration) {
          // تسجيل Service Worker إذا لم يكن مسجلاً
          navigator.serviceWorker.register('/sw.js', { 
            scope: '/',
            updateViaCache: 'none'
          }).then(() => {
            console.log('🔧 PWAEnhancer: Service Worker registered via enhancer');
          }).catch((error) => {
            console.error('❌ PWAEnhancer: Service Worker registration failed:', error);
          });
        }
      }).catch(() => {
        // تجاهل الأخطاء بصمت
      });
    }
  }
  
  private addEventListeners(): void {
    // استماع لتغيير وضع التطبيق
    window.addEventListener('beforeinstallprompt', (e) => {
      // إخفاء رسالة التثبيت الافتراضية
      e.preventDefault();
      console.log('📱 PWA install prompt intercepted');
    });
    
    // استماع لتثبيت التطبيق
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA installed successfully');
      // يمكن إضافة إشعار مخصص هنا
    });
    
    // استماع لتغيير الشبكة
    window.addEventListener('online', () => {
      document.body.classList.remove('offline-mode');
    });
    
    window.addEventListener('offline', () => {
      document.body.classList.add('offline-mode');
    });
  }
  
  private enhanceStandaloneMode(): void {
    // تحسين المظهر في وضع standalone
    if (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://')) {
      
      document.body.classList.add('standalone-mode');
      
      // إخفاء عناصر المتصفح تماماً
      const style = document.createElement('style');
      style.textContent = `
        .standalone-mode {
          -webkit-user-select: none !important;
          -webkit-touch-callout: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        
        .standalone-mode * {
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
        }
        
        .standalone-mode input,
        .standalone-mode textarea,
        .standalone-mode [contenteditable] {
          -webkit-user-select: text !important;
        }
      `;
      document.head.appendChild(style);
      
      console.log('🎯 Standalone mode detected - Native app behavior enabled');
    }
  }
  
  // طريقة لإخفاء إشعارات الإنترنت
  public hideUrlNotifications(): void {
    // إخفاء إشعارات "انسخ الرابط" و "فتح في متصفح"
    const hideNotifications = () => {
      // البحث عن إشعارات Chrome
      const notifications = document.querySelectorAll('[role="status"], [aria-live], .notification');
      notifications.forEach(notification => {
        const text = notification.textContent || '';
        if (text.includes('URL') || text.includes('انسخ') || text.includes('متصفح')) {
          (notification as HTMLElement).style.display = 'none';
        }
      });
    };
    
    // تشغيل الإخفاء دورياً
    setInterval(hideNotifications, 1000);
    hideNotifications();
  }
  
  // طريقة لتحسين تجربة التثبيت
  public enhanceInstallExperience(): void {
    // إضافة CSS مخصص لإخفاء قوائم المتصفح
    const style = document.createElement('style');
    style.textContent = `
      /* إخفاء قوائم Chrome على أندرويد */
      body::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: -1;
        background: var(--app-background, #ffffff);
      }
      
      /* إزالة حدود المتصفح */
      html {
        border: none !important;
        outline: none !important;
      }
      
      body {
        border: none !important;
        outline: none !important;
        -webkit-appearance: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  // تحسين سلوك الإشعارات للتطبيقات الأصلية
  public enhanceNotificationBehavior(): void {
    // التحقق من وضع Standalone
    if (this.isStandaloneMode()) {
      // تحسين الإشعارات لإخفاء URL
      if ('Notification' in window) {
        const originalNotification = (window as any).Notification;
        
        (window as any).Notification = function(title: string, options: any = {}) {
          // إضافة معلومات التطبيق الأصلي
          const enhancedOptions = {
            ...options,
            icon: options.icon || '/icons/icon-192x192.png',
            badge: options.badge || '/icons/icon-192x192.png',
            tag: options.tag || 'hsa-evaluate-native',
            data: {
              ...options.data,
              appName: 'نظام إدارة بيئة العمل',
              nativeApp: true
            }
          };
          
          const notification = new originalNotification(title, enhancedOptions);
          
          // منع إظهار URL في الإشعار
          notification.addEventListener('show', () => {
            setTimeout(() => {
              const notificationElements = document.querySelectorAll('[class*="notification"], [id*="notification"]');
              notificationElements.forEach((el: Element) => {
                const htmlEl = el as HTMLElement;
                if (htmlEl.textContent && htmlEl.textContent.includes('http')) {
                  htmlEl.style.display = 'none';
                }
              });
            }, 100);
          });
          
          return notification;
        };
        
        console.debug('✅ PWA: Enhanced notification behavior for native app');
      }
    }
  }

  // فحص وضع Standalone
  private isStandaloneMode(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone ||
           document.referrer.includes('android-app://');
  }
}

// تشغيل PWA Enhancer تلقائياً
export const pwaEnhancer = PWAEnhancer.getInstance();

// تصدير للاستخدام اليدوي
export default PWAEnhancer;