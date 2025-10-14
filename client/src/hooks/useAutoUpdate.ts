import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface VersionInfo {
  version: string;
  buildTime: string;
  environment: string;
}

interface UseAutoUpdateOptions {
  checkInterval?: number; // بالميلي ثانية (افتراضي: 60000 = دقيقة واحدة)
  enabled?: boolean; // تفعيل/تعطيل النظام
  onUpdateDetected?: () => void; // callback عند اكتشاف تحديث
}

/**
 * 🔄 Hook للكشف التلقائي عن التحديثات وحذف الكاش
 * 
 * الاستخدام:
 * ```tsx
 * useAutoUpdate({
 *   checkInterval: 60000, // فحص كل دقيقة
 *   enabled: true
 * });
 * ```
 */
export function useAutoUpdate(options: UseAutoUpdateOptions = {}) {
  const {
    checkInterval = 60000, // دقيقة واحدة افتراضياً
    enabled = true,
    onUpdateDetected
  } = options;

  const { toast } = useToast();
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 🗑️ حذف كل الكاش من المتصفح
   */
  const clearAllCaches = async (): Promise<void> => {
    console.log('🗑️ [AutoUpdate] بدء حذف كل الكاش...');

    try {
      // 1. حذف Browser Cache (Cache API)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log(`🗑️ [AutoUpdate] وجد ${cacheNames.length} كاش للحذف`);
        
        await Promise.all(
          cacheNames.map(async (cacheName) => {
            console.log(`🗑️ [AutoUpdate] حذف كاش: ${cacheName}`);
            return caches.delete(cacheName);
          })
        );
        console.log('✅ [AutoUpdate] تم حذف Browser Cache');
      }

      // 2. إرسال رسالة للـ Service Worker لحذف الكاش
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_CACHE'
        });
        console.log('✅ [AutoUpdate] تم إرسال أمر حذف الكاش للـ Service Worker');
      }

      // 3. حذف LocalStorage (اختياري - احذف فقط البيانات غير الحرجة)
      // localStorage.clear(); // تعليق هذا السطر للحفاظ على بيانات المستخدم

      console.log('✅ [AutoUpdate] اكتمل حذف الكاش');
    } catch (error) {
      console.error('❌ [AutoUpdate] فشل حذف الكاش:', error);
      throw error;
    }
  };

  /**
   * 🔄 إعادة تحميل التطبيق
   */
  const reloadApp = (): void => {
    console.log('🔄 [AutoUpdate] إعادة تحميل التطبيق...');
    
    // Hard reload لتجاوز الكاش
    window.location.reload();
  };

  /**
   * 🎯 تطبيق التحديث: حذف الكاش + إعادة تحميل
   */
  const applyUpdate = async (): Promise<void> => {
    console.log('🎯 [AutoUpdate] تطبيق التحديث...');
    
    try {
      // حذف الكاش
      await clearAllCaches();
      
      // انتظر قليلاً للتأكد من اكتمال الحذف
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // إعادة تحميل التطبيق
      reloadApp();
    } catch (error) {
      console.error('❌ [AutoUpdate] فشل تطبيق التحديث:', error);
      
      // حتى لو فشل الحذف، أعد التحميل
      reloadApp();
    }
  };

  /**
   * 🔍 فحص النسخة من السيرفر
   */
  const checkVersion = async (): Promise<void> => {
    if (!enabled || isChecking) return;

    try {
      setIsChecking(true);
      
      const response = await fetch('/api/version', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        console.error('❌ [AutoUpdate] فشل فحص النسخة:', response.status);
        return;
      }

      const versionInfo: VersionInfo = await response.json();
      console.log('📦 [AutoUpdate] نسخة السيرفر:', versionInfo.version);

      // أول مرة - احفظ النسخة الحالية
      if (!currentVersion) {
        setCurrentVersion(versionInfo.version);
        console.log('✅ [AutoUpdate] تم حفظ النسخة الحالية:', versionInfo.version);
        return;
      }

      // قارن النسخ
      if (versionInfo.version !== currentVersion) {
        console.log('🎉 [AutoUpdate] تم اكتشاف تحديث جديد!');
        console.log(`   النسخة القديمة: ${currentVersion}`);
        console.log(`   النسخة الجديدة: ${versionInfo.version}`);

        // callback للمطور
        onUpdateDetected?.();

        // إشعار للمستخدم (اختياري - يظهر لثانيتين فقط)
        toast({
          title: "جاري التحديث...",
          description: "سيتم تحديث التطبيق تلقائياً",
          duration: 2000
        });

        // توقف عن الفحص
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }

        // انتظر ثانيتين ثم طبق التحديث
        setTimeout(async () => {
          await applyUpdate();
        }, 2000);
      }
    } catch (error) {
      console.error('❌ [AutoUpdate] خطأ في فحص النسخة:', error);
    } finally {
      setIsChecking(false);
    }
  };

  /**
   * 🚀 بدء الفحص الدوري
   */
  useEffect(() => {
    if (!enabled) {
      console.log('⏸️ [AutoUpdate] النظام معطل');
      return;
    }

    console.log(`🚀 [AutoUpdate] بدء الفحص الدوري (كل ${checkInterval / 1000} ثانية)`);

    // فحص أولي فوري
    checkVersion();

    // فحص دوري
    checkIntervalRef.current = setInterval(() => {
      checkVersion();
    }, checkInterval);

    // تنظيف عند unmount
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [enabled, checkInterval, currentVersion]);

  /**
   * 🎯 Service Worker Update Detection
   * للكشف عن تحديثات Service Worker
   */
  useEffect(() => {
    if (!enabled || !('serviceWorker' in navigator)) return;

    const handleControllerChange = async () => {
      console.log('🔄 [AutoUpdate] Service Worker تم تحديثه!');
      
      // حذف الكاش وإعادة التحميل
      await applyUpdate();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // تحقق من تحديثات Service Worker
    navigator.serviceWorker.ready.then((registration) => {
      // فحص تحديثات Service Worker كل دقيقة
      setInterval(() => {
        registration.update();
      }, 60000);

      // عند اكتشاف Service Worker جديد
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated' && !navigator.serviceWorker.controller) {
              console.log('🎉 [AutoUpdate] Service Worker جديد تم تفعيله!');
              applyUpdate();
            }
          });
        }
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [enabled]);

  return {
    currentVersion,
    isChecking,
    checkVersion,
    applyUpdate,
    clearAllCaches
  };
}
