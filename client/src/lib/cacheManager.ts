/**
 * 🧹 مدير الذاكرة المؤقتة الآمن
 * يمسح ذاكرة المتصفح المؤقتة مع حماية البيانات الحساسة
 */

import { enhancedIndexedDB } from './enhancedIndexedDB';

interface CacheManagerOptions {
  preserveAuth: boolean;
  preserveUserData: boolean;
  preserveAppState: boolean;
  preserveOfflineData: boolean;
  clearServiceWorker: boolean;
  clearBrowserCache: boolean;
  clearSessionStorage: boolean;
  clearLocalStorage: boolean;
}

export class SafeCacheManager {
  private static instance: SafeCacheManager;
  
  private readonly defaultOptions: CacheManagerOptions = {
    preserveAuth: true,        // حفظ بيانات تسجيل الدخول
    preserveUserData: true,    // حفظ بيانات المستخدم
    preserveAppState: true,    // حفظ حالة التطبيق
    preserveOfflineData: true, // حفظ البيانات المحلية
    clearServiceWorker: false, // عدم مسح Service Worker
    clearBrowserCache: true,   // مسح ذاكرة المتصفح
    clearSessionStorage: true, // مسح SessionStorage
    clearLocalStorage: false   // عدم مسح LocalStorage (فارغ أصلاً)
  };

  static getInstance(): SafeCacheManager {
    if (!SafeCacheManager.instance) {
      SafeCacheManager.instance = new SafeCacheManager();
    }
    return SafeCacheManager.instance;
  }

  /**
   * 🛡️ مسح آمن للذاكرة المؤقتة مع حفظ البيانات المهمة
   */
  async safeCacheClear(options: Partial<CacheManagerOptions> = {}): Promise<{
    success: boolean;
    clearedItems: string[];
    preservedItems: string[];
    errors: string[];
  }> {
    const opts = { ...this.defaultOptions, ...options };
    const result = {
      success: true,
      clearedItems: [] as string[],
      preservedItems: [] as string[],
      errors: [] as string[]
    };

    console.log('🧹 بدء عملية مسح الذاكرة المؤقتة الآمن...');
    
    try {
      // 1. نسخ احتياطي من البيانات المهمة
      const backup = await this.createSafeBackup(opts);
      result.preservedItems.push(...backup.preservedKeys);

      // 2. مسح ذاكرة المتصفح
      if (opts.clearBrowserCache) {
        await this.clearBrowserCache();
        result.clearedItems.push('Browser Cache');
      }

      // 3. مسح SessionStorage
      if (opts.clearSessionStorage) {
        const sessionCleared = this.clearSessionStorage();
        if (sessionCleared > 0) {
          result.clearedItems.push(`SessionStorage (${sessionCleared} items)`);
        }
      }

      // 4. مسح LocalStorage بحذر (فقط العناصر غير المهمة)
      if (opts.clearLocalStorage) {
        const localCleared = await this.clearLocalStorageSafely();
        if (localCleared > 0) {
          result.clearedItems.push(`LocalStorage (${localCleared} items)`);
        }
      }

      // 5. مسح Service Worker Cache (اختياري)
      if (opts.clearServiceWorker) {
        try {
          await this.clearServiceWorkerCache();
          result.clearedItems.push('Service Worker Cache');
        } catch (error) {
          result.errors.push('Service Worker Cache clearing failed');
        }
      }

      // 6. استعادة البيانات المهمة
      await this.restoreSafeBackup(backup, opts);

      console.log('✅ تم مسح الذاكرة المؤقتة بأمان');
      console.log('🗑️ تم مسح:', result.clearedItems);
      console.log('🛡️ تم حفظ:', result.preservedItems);

    } catch (error) {
      console.error('❌ خطأ في مسح الذاكرة المؤقتة:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * 💾 إنشاء نسخة احتياطية من البيانات المهمة
   */
  private async createSafeBackup(opts: CacheManagerOptions): Promise<{
    authData: any;
    userData: any;
    appState: any;
    offlineData: any;
    preservedKeys: string[];
  }> {
    const backup = {
      authData: null as any,
      userData: null as any,
      appState: null as any,
      offlineData: {} as Record<string, any>,
      preservedKeys: [] as string[]
    };

    try {
      if (opts.preserveAuth) {
        backup.authData = await enhancedIndexedDB.getAuthData('auth_token');
        if (backup.authData) backup.preservedKeys.push('Auth Token');
      }

      if (opts.preserveUserData) {
        backup.userData = await enhancedIndexedDB.getAuthData('user_data');
        if (backup.userData) backup.preservedKeys.push('User Data');
      }

      if (opts.preserveAppState) {
        backup.appState = await enhancedIndexedDB.getData('app_state');
        if (backup.appState) backup.preservedKeys.push('App State');
      }

      if (opts.preserveOfflineData) {
        // نسخ احتياطي من البيانات المحلية المهمة
        const offlineKeys = [
          'dashboard_locations', 'dashboard_settings_43', 
          'location_checklists', 'offline_evaluations'
        ];
        
        const offlineBackup: Record<string, any> = {};
        for (const key of offlineKeys) {
          try {
            const data = await enhancedIndexedDB.getData(key);
            if (data) {
              offlineBackup[key] = data;
              backup.preservedKeys.push(key);
            }
          } catch (error) {
            console.warn(`⚠️ لا يمكن نسخ: ${key}`);
          }
        }
        backup.offlineData = offlineBackup;
      }

    } catch (error) {
      console.error('❌ خطأ في إنشاء النسخة الاحتياطية:', error);
    }

    return backup;
  }

  /**
   * 🔄 استعادة النسخة الاحتياطية
   */
  private async restoreSafeBackup(backup: any, opts: CacheManagerOptions): Promise<void> {
    try {
      if (opts.preserveAuth && backup.authData) {
        await enhancedIndexedDB.saveAuthData('auth_token', backup.authData);
      }

      if (opts.preserveUserData && backup.userData) {
        await enhancedIndexedDB.saveAuthData('user_data', backup.userData);
      }

      if (opts.preserveAppState && backup.appState) {
        await enhancedIndexedDB.saveData('app_state', backup.appState);
      }

      if (opts.preserveOfflineData && backup.offlineData) {
        for (const [key, data] of Object.entries(backup.offlineData)) {
          await enhancedIndexedDB.saveData(key, data);
        }
      }

      console.log('🔄 تم استعادة البيانات المحفوظة بنجاح');
    } catch (error) {
      console.error('❌ خطأ في استعادة النسخة الاحتياطية:', error);
    }
  }

  /**
   * 🌐 مسح ذاكرة المتصفح
   */
  private async clearBrowserCache(): Promise<void> {
    try {
      // مسح Cache API
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            // حفظ Service Worker cache إذا كان مطلوباً
            if (cacheName.includes('workbox') || cacheName.includes('sw')) {
              console.log('🛡️ تم حفظ:', cacheName);
              return Promise.resolve();
            }
            return caches.delete(cacheName);
          })
        );
      }
    } catch (error) {
      console.warn('⚠️ لا يمكن مسح Browser Cache:', error);
    }
  }

  /**
   * 📋 مسح SessionStorage
   */
  private clearSessionStorage(): number {
    try {
      const count = sessionStorage.length;
      sessionStorage.clear();
      return count;
    } catch (error) {
      console.warn('⚠️ لا يمكن مسح SessionStorage:', error);
      return 0;
    }
  }

  /**
   * 💾 مسح LocalStorage بحذر (فقط العناصر غير المهمة)
   */
  private async clearLocalStorageSafely(): Promise<number> {
    try {
      const keysToRemove: string[] = [];
      const importantKeys = ['auth_token', 'user_data', 'app_state']; // مفاتيح محمية

      // فحص جميع المفاتيح
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !importantKeys.includes(key)) {
          // إضافة المفاتيح غير المهمة للحذف
          if (key.includes('cache') || key.includes('temp') || 
              key.includes('debug') || key.includes('dev')) {
            keysToRemove.push(key);
          }
        }
      }

      // حذف المفاتيح غير المهمة فقط
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn(`⚠️ لا يمكن حذف: ${key}`);
        }
      });

      return keysToRemove.length;
    } catch (error) {
      console.warn('⚠️ لا يمكن مسح LocalStorage:', error);
      return 0;
    }
  }

  /**
   * 🔧 مسح Service Worker Cache
   */
  private async clearServiceWorkerCache(): Promise<void> {
    if ('serviceWorker' in navigator && 'caches' in window) {
      const cacheNames = await caches.keys();
      const swCaches = cacheNames.filter(name => 
        name.includes('workbox') || name.includes('sw') || name.includes('precache')
      );
      
      await Promise.all(swCaches.map(cacheName => caches.delete(cacheName)));
    }
  }

  /**
   * 🎯 مسح سريع وآمن (الإعدادات الافتراضية)
   */
  async quickSafeClear(): Promise<void> {
    console.log('🚀 مسح سريع وآمن للذاكرة المؤقتة...');
    const result = await this.safeCacheClear();
    
    if (result.success) {
      console.log('✅ تم المسح بنجاح!');
      console.log(`🗑️ تم مسح ${result.clearedItems.length} عنصر`);
      console.log(`🛡️ تم حفظ ${result.preservedItems.length} عنصر مهم`);
    } else {
      console.error('❌ فشل المسح:', result.errors);
    }
  }

  /**
   * 🔄 تنظيف تلقائي صامت للذاكرة عند الحاجة
   */
  async autoCleanupWhenNeeded(): Promise<boolean> {
    try {
      const status = await this.getCacheStatus();
      const needsCleanup = this.shouldPerformAutoCleanup(status);
      
      if (needsCleanup) {
        console.log('🔄 بدء التنظيف التلقائي للذاكرة...');
        const result = await this.safeCacheClear({
          preserveAuth: true,
          preserveUserData: true,
          preserveAppState: true,
          preserveOfflineData: true,
          clearBrowserCache: true,
          clearSessionStorage: true,
          clearLocalStorage: false,
          clearServiceWorker: false
        });
        
        if (result.success) {
          console.log('✅ تم التنظيف التلقائي بنجاح - تم تحسين الأداء');
          console.log(`🗑️ مسح: ${result.clearedItems.join(', ')}`);
          console.log(`🛡️ حفظ: ${result.preservedItems.join(', ')}`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.warn('⚠️ فشل التنظيف التلقائي:', error);
      return false;
    }
  }

  /**
   * 🎯 تحديد ما إذا كان التنظيف التلقائي مطلوباً
   */
  private shouldPerformAutoCleanup(status: any): boolean {
    // تنظيف تلقائي عندما:
    // 1. حجم ذاكرة المتصفح > 50 عنصر
    // 2. عدد عناصر SessionStorage > 100
    // 3. مرور أكثر من 7 أيام على آخر تنظيف
    
    const cacheSize = status.browserCacheSize || 0;
    const sessionSize = status.sessionStorageSize || 0;
    const lastCleanup = localStorage.getItem('lastAutoCleanup');
    const daysSinceCleanup = lastCleanup ? 
      (Date.now() - parseInt(lastCleanup)) / (1000 * 60 * 60 * 24) : 7;
    
    return cacheSize > 50 ||
           sessionSize > 100 ||
           daysSinceCleanup > 7;
  }

  /**
   * 🚀 تهيئة التنظيف التلقائي للذاكرة
   */
  initAutoCleanup(): void {
    // تشغيل التحقق كل ساعة
    setInterval(() => {
      this.autoCleanupWhenNeeded().then(cleaned => {
        if (cleaned) {
          localStorage.setItem('lastAutoCleanup', Date.now().toString());
        }
      });
    }, 60 * 60 * 1000); // كل ساعة

    // تحقق فوري عند البداية
    setTimeout(() => {
      this.autoCleanupWhenNeeded().then(cleaned => {
        if (cleaned) {
          localStorage.setItem('lastAutoCleanup', Date.now().toString());
        }
      });
    }, 10000); // بعد 10 ثواني من التحميل
  }

  /**
   * 🔍 فحص حالة الذاكرة المؤقتة
   */
  async getCacheStatus(): Promise<{
    browserCacheSize: number;
    sessionStorageSize: number;
    localStorageSize: number;
    indexedDBSize: string;
    serviceWorkerCaches: string[];
  }> {
    const status = {
      browserCacheSize: 0,
      sessionStorageSize: sessionStorage.length,
      localStorageSize: localStorage.length,
      indexedDBSize: 'Unknown',
      serviceWorkerCaches: [] as string[]
    };

    try {
      // فحص Browser Cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        status.serviceWorkerCaches = cacheNames;
        status.browserCacheSize = cacheNames.length;
      }

      // تقدير حجم IndexedDB
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        if (estimate.usage) {
          status.indexedDBSize = `${Math.round(estimate.usage / 1024 / 1024 * 100) / 100} MB`;
        }
      }
    } catch (error) {
      console.warn('⚠️ لا يمكن فحص حالة الذاكرة:', error);
    }

    return status;
  }
}

// تصدير المثيل الوحيد
export const safeCacheManager = SafeCacheManager.getInstance();

// إضافة دوال DevTools
if (typeof window !== 'undefined') {
  (window as any).clearCache = () => safeCacheManager.quickSafeClear();
  (window as any).getCacheStatus = () => safeCacheManager.getCacheStatus();
  (window as any).customCacheClear = (options: Partial<CacheManagerOptions>) => 
    safeCacheManager.safeCacheClear(options);
}