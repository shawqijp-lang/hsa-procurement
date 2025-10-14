import { useState, useEffect } from 'react';
import { enhancedIndexedDB } from '@/lib/enhancedIndexedDB';

export interface AppState {
  isExplicitLogout: boolean;
  shouldPreserveCredentials: boolean;
  isFirstLoad: boolean;
}

export const useAppState = () => {
  const [appState, setAppState] = useState<AppState>({
    isExplicitLogout: false,
    shouldPreserveCredentials: true,
    isFirstLoad: true
  });

  // ⚡ فحص بسيط لمعامل URL فقط
  const checkLogoutIntent = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('logout') === 'true';
  };

  // منع الحفظ المكرر
  let lastSave = 0;
  const SAVE_DEBOUNCE = 1000; // 1 ثانية

  // Mark explicit logout for session
  const markExplicitLogout = async () => {
    const now = Date.now();
    if (now - lastSave < SAVE_DEBOUNCE) {
      console.log('🔄 تجاهل حفظ مكرر لحالة الخروج');
      return;
    }
    lastSave = now;
    
    try {
      await enhancedIndexedDB.saveSetting('explicit_logout', 'true');
      console.log('💾 App State saved: explicit_logout');
    } catch (error) {
      console.warn('⚠️ فشل في حفظ حالة الخروج:', error);
    }
    setAppState(prev => ({ 
      ...prev, 
      isExplicitLogout: true, 
      shouldPreserveCredentials: false 
    }));
  };

  // Clear logout markers
  const clearLogoutMarkers = async () => {
    try {
      await enhancedIndexedDB.removeItem('explicit_logout');
    } catch (error) {
      console.warn('⚠️ فشل في مسح حالة الخروج:', error);
    }
    setAppState(prev => ({ 
      ...prev, 
      isExplicitLogout: false, 
      shouldPreserveCredentials: true 
    }));
  };

  // Check app initialization state
  useEffect(() => {
    const checkCredentials = async () => {
      // ⚡ فحص محدد للخروج - عدم اعتبار الحالة القديمة
      const urlLogout = checkLogoutIntent(); // فحص URL parameter
      let isExplicitLogout = urlLogout; // فقط معامل URL
      
      // إذا كان هناك logout=true في URL، امسح الحالة وأعد تعيين URL
      if (urlLogout) {
        try {
          await enhancedIndexedDB.removeItem('explicit_logout');
          // إزالة معامل logout من URL
          const url = new URL(window.location.href);
          url.searchParams.delete('logout');
          window.history.replaceState({}, '', url.toString());
        } catch (error) {
          console.warn('⚠️ فشل في مسح حالة الخروج:', error);
        }
      }
      
      const shouldPreserveCredentials = !isExplicitLogout;
      
      // فحص البيانات في النظام الموحد فقط (بدون رسائل إضافية)
      let hasStoredCredentials = false;
      
      try {
        // التحقق الهادئ من وجود البيانات
        const authToken = await enhancedIndexedDB.getAuthData('auth_token');
        const userData = await enhancedIndexedDB.getAuthData('user_data');
        hasStoredCredentials = !!(authToken && userData);
      } catch (error) {
        // تحقق صامت - لا توجد رسائل تحذير للحالات العادية
        hasStoredCredentials = false;
      }
      
      // لا توجد احتياطيات - نظام موحد فقط
      
      console.log('🔧 App State:', { 
        isExplicitLogout, 
        shouldPreserveCredentials,
        hasStoredCredentials
      });

      setAppState({
        isExplicitLogout,
        shouldPreserveCredentials,
        isFirstLoad: false
      });
      
      // حفظ الحالة في IndexedDB
      try {
        await enhancedIndexedDB.setItem('app_state', {
          isExplicitLogout,
          shouldPreserveCredentials,
          isFirstLoad: false,
          lastUpdated: new Date().toISOString()
        });
      } catch (error) {
        console.warn('⚠️ فشل في حفظ حالة التطبيق:', error);
      }
    };
    
    checkCredentials();
  }, []);

  return {
    ...appState,
    markExplicitLogout,
    clearLogoutMarkers,
    checkLogoutIntent
  };
};