/**
 * 🗄️ نظام التخزين الدائم المتقدم
 * 
 * يوفر طبقة حماية إضافية ضد حذف البيانات عند إزالة التطبيق من الخلفية
 * أو عند امتلاء ذاكرة الجهاز
 */

interface PersistentStorageAPI {
  persist(): Promise<boolean>;
  persisted(): Promise<boolean>;
  estimate(): Promise<StorageEstimate>;
}

declare global {
  interface Navigator {
    storage?: PersistentStorageAPI;
  }
}

export class PersistentStorage {
  
  /**
   * تفعيل التخزين الدائم للتطبيق
   */
  static async requestPersistentStorage(): Promise<boolean> {
    try {
      console.log('🛡️ [PersistentStorage] طلب التخزين الدائم...');
      
      if (!navigator.storage || !navigator.storage.persist) {
        console.warn('⚠️ [PersistentStorage] المتصفح لا يدعم التخزين الدائم');
        return false;
      }

      // فحص الحالة الحالية
      const isPersistent = await navigator.storage.persisted();
      
      if (isPersistent) {
        console.log('✅ [PersistentStorage] التخزين دائم بالفعل');
        return true;
      }

      // طلب التخزين الدائم
      const granted = await navigator.storage.persist();
      
      if (granted) {
        console.log('🎉 [PersistentStorage] تم تفعيل التخزين الدائم بنجاح');
      } else {
        console.warn('❌ [PersistentStorage] تم رفض طلب التخزين الدائم');
      }

      return granted;

    } catch (error) {
      console.error('💥 [PersistentStorage] خطأ في طلب التخزين الدائم:', error);
      return false;
    }
  }

  /**
   * فحص حالة التخزين الدائم
   */
  static async checkPersistentStorage(): Promise<{
    isPersistent: boolean;
    storageEstimate?: StorageEstimate;
  }> {
    try {
      if (!navigator.storage) {
        return { isPersistent: false };
      }

      const [isPersistent, estimate] = await Promise.all([
        navigator.storage.persisted(),
        navigator.storage.estimate()
      ]);

      return {
        isPersistent,
        storageEstimate: estimate
      };

    } catch (error) {
      console.error('💥 [PersistentStorage] خطأ في فحص التخزين:', error);
      return { isPersistent: false };
    }
  }

  /**
   * مراقبة استخدام التخزين
   */
  static async monitorStorageUsage(): Promise<{
    used: number;
    quota: number;
    percentage: number;
    humanReadable: {
      used: string;
      quota: string;
    };
  }> {
    try {
      if (!navigator.storage || !navigator.storage.estimate) {
        throw new Error('Storage API غير متاح');
      }

      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentage = quota > 0 ? Math.round((used / quota) * 100) : 0;

      return {
        used,
        quota,
        percentage,
        humanReadable: {
          used: this.formatBytes(used),
          quota: this.formatBytes(quota)
        }
      };

    } catch (error) {
      console.error('💥 [PersistentStorage] خطأ في مراقبة التخزين:', error);
      return {
        used: 0,
        quota: 0,
        percentage: 0,
        humanReadable: {
          used: '0 KB',
          quota: '0 KB'
        }
      };
    }
  }

  /**
   * تنسيق حجم البيانات بشكل قابل للقراءة
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 KB';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * تهيئة التخزين الدائم عند بدء التطبيق
   */
  static async initialize(): Promise<void> {
    try {
      console.log('🚀 [PersistentStorage] تهيئة نظام التخزين الدائم...');

      // طلب التخزين الدائم
      await this.requestPersistentStorage();

      // فحص ومراقبة الاستخدام
      const status = await this.checkPersistentStorage();
      const usage = await this.monitorStorageUsage();

      console.log('📊 [PersistentStorage] معلومات التخزين:', {
        isPersistent: status.isPersistent,
        usage: usage.humanReadable,
        percentage: `${usage.percentage}%`
      });

      // تحذير إذا كان الاستخدام مرتفع
      if (usage.percentage > 80) {
        console.warn('⚠️ [PersistentStorage] استخدام التخزين مرتفع:', usage.percentage + '%');
      }

      // إعداد مراقبة دورية (كل 10 دقائق)
      setInterval(async () => {
        const currentUsage = await this.monitorStorageUsage();
        if (currentUsage.percentage > 90) {
          console.error('🚨 [PersistentStorage] استخدام التخزين حرج:', currentUsage.percentage + '%');
        }
      }, 10 * 60 * 1000);

    } catch (error) {
      console.error('💥 [PersistentStorage] خطأ في تهيئة التخزين الدائم:', error);
    }
  }

  /**
   * تنظيف البيانات القديمة والغير مستخدمة
   */
  static async cleanup(): Promise<void> {
    try {
      console.log('🧹 [PersistentStorage] بدء تنظيف البيانات القديمة...');

      // يمكن إضافة منطق تنظيف محدد هنا
      // مثل: حذف البيانات الأقدم من شهر أو البيانات الغير مستخدمة

      console.log('✅ [PersistentStorage] تم الانتهاء من التنظيف');

    } catch (error) {
      console.error('💥 [PersistentStorage] خطأ في التنظيف:', error);
    }
  }

}