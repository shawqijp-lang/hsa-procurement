import React, { useState, useEffect, lazy } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
// Real-time system replaced by unified sync system

import AuthenticatedApp from "@/components/AuthenticatedApp";
import EnhancedLogin from "@/pages/enhanced-login";
// تم حذف الملفات القديمة غير المستخدمة
import { useAuth } from "@/hooks/useAuth";
import { useAutoUpdate } from "@/hooks/useAutoUpdate";

interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
  companyId?: number;
}

function App() {
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, user, loading: authLoading, login, logout } = useAuth();
  
  // 🔄 Auto-Update System: Check for updates every minute
  useAutoUpdate({
    checkInterval: 60000, // 1 minute
    enabled: true,
    onUpdateDetected: () => {
      console.log('🎉 تم اكتشاف تحديث جديد - سيتم تطبيقه تلقائياً');
    }
  });

  useEffect(() => {
    // App initializing - Production v6.17.0
    
    // تهيئة التنظيف التلقائي للذاكرة المؤقتة
    const initAutoCacheCleanup = async () => {
      try {
        const { safeCacheManager } = await import('./lib/cacheManager');
        safeCacheManager.initAutoCleanup();
        console.log('🔄 تم تفعيل التنظيف التلقائي للذاكرة');
      } catch (error) {
        console.warn('⚠️ فشل تفعيل التنظيف التلقائي:', error);
      }
    };

    initAutoCacheCleanup();
    
    // إضافة دوال DevTools للتسجيل السريع
    const setupDevToolsHelpers = () => {
      (window as any).quickLogin = async (user = 'owner', pass = '123456') => {
        console.log('🚀 Quick Login from DevTools:', { user, pass });
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: user,
              password: pass,
              companyId: 6
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.token && data.user) {
              // حفظ في IndexedDB فقط
              try {
                const { enhancedIndexedDB } = await import('./lib/enhancedIndexedDB');
                await enhancedIndexedDB.saveAuthData('auth_token', data.token);
                await enhancedIndexedDB.saveAuthData('user_data', data.user);
                console.log('✅ DevTools: تم حفظ البيانات في IndexedDB');
              } catch (dbError) {
                console.warn('❌ DevTools: فشل حفظ IndexedDB:', dbError);
              }
              
              console.log('✅ DevTools Login Success!');
              window.location.reload();
              return { success: true, user: data.user };
            }
          }
          throw new Error('Login failed');
        } catch (error) {
          console.error('❌ DevTools Login Failed:', error);
          return { success: false, error };
        }
      };

      (window as any).goToFastLogin = () => {
        window.location.hash = '#/enhanced-login';
        window.location.href = '/enhanced-login';
      };

      (window as any).devHelp = () => {
        console.log(`
🔧 DevTools Commands:
• quickLogin() - تسجيل دخول سريع (owner/123456)
• quickLogin("username", "password") - تسجيل دخول مخصص  
• goToFastLogin() - الانتقال لصفحة التسجيل السريع
• testOfflineLogin() - اختبار تسجيل الدخول المحلي
• debugAuth() - عرض معلومات المصادقة التفصيلية
• clearOfflineData() - مسح البيانات المحلية
• simulateOffline() - محاكاة انقطاع الاتصال
• exportSystemReport() - تصدير تقرير شامل عن النظام
• safeOfflineTest() - اختبار آمن للوضع المحلي دون مخاطر أمنية
• clearCache() - مسح الذاكرة المؤقتة بأمان
• getCacheStatus() - فحص حالة الذاكرة المؤقتة
• customCacheClear(options) - مسح مخصص للذاكرة
• devHelp() - عرض هذه المساعدة
        `);
      };

      // أدوات تطوير محسنة للوضع المحلي
      (window as any).testOfflineLogin = async () => {
        console.log('🔧 اختبار تسجيل الدخول المحلي...');
        try {
          const { enhancedIndexedDB } = await import('./lib/enhancedIndexedDB');
          
          const token = await enhancedIndexedDB.getAuthData('auth_token');
          const userData = await enhancedIndexedDB.getAuthData('user_data');
          const username = await enhancedIndexedDB.getAuthData('last_username');
          const companyId = await enhancedIndexedDB.getAuthData('last_company_id');
          const password = await enhancedIndexedDB.getAuthData('last_password_encoded');
          
          console.log('📊 بيانات المصادقة المحلية:', {
            hasToken: !!token,
            hasUserData: !!userData,
            username,
            companyId,
            hasPassword: !!password,
            tokenPreview: token ? token.substring(0, 20) + '...' : null
          });
          
          if (token && userData) {
            console.log('✅ يمكن تسجيل الدخول محلياً');
            return { canLoginOffline: true, data: { username, companyId } };
          } else {
            console.log('❌ لا توجد بيانات كافية للدخول المحلي');
            return { canLoginOffline: false, reason: 'بيانات غير مكتملة' };
          }
        } catch (error) {
          console.error('❌ خطأ في اختبار الدخول المحلي:', error);
          return { error };
        }
      };

      (window as any).debugAuth = async () => {
        console.log('🔍 تشخيص شامل للمصادقة...');
        try {
          const { enhancedIndexedDB } = await import('./lib/enhancedIndexedDB');
          
          // فحص جميع البيانات المحفوظة
          const authData = {
            token: await enhancedIndexedDB.getAuthData('auth_token'),
            userData: await enhancedIndexedDB.getAuthData('user_data'),
            username: await enhancedIndexedDB.getAuthData('last_username'),
            companyId: await enhancedIndexedDB.getAuthData('last_company_id'),
            password: await enhancedIndexedDB.getAuthData('last_password_encoded'),
            appState: await enhancedIndexedDB.getItem('app_state')
          };
          
          console.log('📋 جميع بيانات المصادقة:', authData);
          
          // فحص حالة المتصفح
          console.log('🌐 حالة الاتصال:', {
            navigatorOnline: navigator.onLine,
            connectionType: (navigator as any).connection?.effectiveType || 'unknown'
          });
          
          // فحص أخطاء شاشة تسجيل الدخول
          const loginErrors = (window as any).loginErrors || [];
          if (loginErrors.length > 0) {
            console.log('⚠️ أخطاء شاشة تسجيل الدخول:', loginErrors);
          }
          
          return authData;
        } catch (error) {
          console.error('❌ خطأ في التشخيص:', error);
          return { error };
        }
      };

      (window as any).clearOfflineData = async () => {
        console.log('🗑️ مسح البيانات المحلية...');
        try {
          const { enhancedIndexedDB } = await import('./lib/enhancedIndexedDB');
          
          await enhancedIndexedDB.removeAuthData('auth_token');
          await enhancedIndexedDB.removeAuthData('user_data');
          await enhancedIndexedDB.removeAuthData('last_username');
          await enhancedIndexedDB.removeAuthData('last_company_id');
          await enhancedIndexedDB.removeAuthData('last_password_encoded');
          
          console.log('✅ تم مسح جميع البيانات المحلية');
          return { success: true };
        } catch (error) {
          console.error('❌ خطأ في مسح البيانات:', error);
          return { error };
        }
      };

      (window as any).simulateOffline = () => {
        console.log('📡 محاكاة انقطاع الاتصال...');
        
        // إيقاف الاتصال مؤقتاً
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false
        });
        
        // إرسال حدث انقطاع الاتصال
        window.dispatchEvent(new Event('offline'));
        
        console.log('🔌 تم قطع الاتصال (محاكاة)');
        console.log('💡 لاستعادة الاتصال، أعد تحميل الصفحة');
        
        return { offline: true };
      };


      // اختبار آمن للوضع المحلي - بدون مخاطر أمنية
      (window as any).safeOfflineTest = async () => {
        console.log('🔒 اختبار آمن للوضع المحلي...');
        const safeResults: {
          timestamp: string;
          status: string;
          checks: Array<{name: string; result: string; status: string}>;
          recommendations: string[];
        } = {
          timestamp: new Date().toISOString(),
          status: 'safe_test',
          checks: [],
          recommendations: []
        };

        try {
          // 1. فحص حالة الاتصال
          safeResults.checks.push({
            name: 'connection_status',
            result: navigator.onLine ? 'online' : 'offline',
            status: 'info'
          });

          // 2. فحص وجود IndexedDB
          const { enhancedIndexedDB } = await import('./lib/enhancedIndexedDB');
          await enhancedIndexedDB.init();
          
          safeResults.checks.push({
            name: 'indexeddb_available',
            result: 'available',
            status: 'success'
          });

          // 3. فحص البيانات المحفوظة (بدون عرض المحتوى)
          const hasToken = !!(await enhancedIndexedDB.getAuthData('auth_token'));
          const hasUserData = !!(await enhancedIndexedDB.getAuthData('user_data'));
          const hasUsername = !!(await enhancedIndexedDB.getAuthData('last_username'));
          const hasCompanyId = !!(await enhancedIndexedDB.getAuthData('last_company_id'));

          safeResults.checks.push({
            name: 'stored_credentials',
            result: `Token: ${hasToken}, User: ${hasUserData}, Username: ${hasUsername}, Company: ${hasCompanyId}`,
            status: (hasToken && hasUserData && hasUsername && hasCompanyId) ? 'success' : 'warning'
          });

          // 4. تقديم التوصيات
          if (!hasToken || !hasUserData) {
            safeResults.recommendations.push('قم بتسجيل الدخول أولاً أثناء وجود الاتصال لحفظ البيانات');
          }

          if (!hasUsername || !hasCompanyId) {
            safeResults.recommendations.push('تأكد من حفظ اسم المستخدم ومعرف الشركة');
          }

          if (hasToken && hasUserData && hasUsername && hasCompanyId) {
            safeResults.recommendations.push('النظام جاهز للعمل في الوضع المحلي');
          }

          console.log('📊 نتائج الاختبار الآمن:', safeResults);
          return safeResults;

        } catch (error) {
          safeResults.checks.push({
            name: 'test_error',
            result: (error as Error).message,
            status: 'error'
          });
          
          console.error('❌ خطأ في الاختبار الآمن:', error);
          return safeResults;
        }
      };

      // تصدير تقرير شامل عن النظام
      (window as any).exportSystemReport = async () => {
        console.log('📋 إنشاء تقرير شامل عن النظام...');
        try {
          const { enhancedIndexedDB } = await import('./lib/enhancedIndexedDB');
          
          const report = {
            timestamp: new Date().toISOString(),
            browser: {
              userAgent: navigator.userAgent,
              onLine: navigator.onLine,
              cookieEnabled: navigator.cookieEnabled,
              language: navigator.language
            },
            authentication: {
              token: await enhancedIndexedDB.getAuthData('auth_token'),
              userData: await enhancedIndexedDB.getAuthData('user_data'),
              username: await enhancedIndexedDB.getAuthData('last_username'),
              companyId: await enhancedIndexedDB.getAuthData('last_company_id'),
              hasPassword: !!(await enhancedIndexedDB.getAuthData('last_password_encoded'))
            },
            errors: (window as any).loginErrors || [],
            indexedDB: {
              available: 'indexedDB' in window,
              databases: await indexedDB.databases?.() || 'not supported'
            },
            localStorage: {
              available: 'localStorage' in window,
              itemCount: localStorage.length
            }
          };
          
          // عدم عرض الرموز والبيانات الحساسة في التقرير
          if (report.authentication.token) {
            report.authentication.token = 'PRESENT_BUT_HIDDEN';
          }
          if (report.authentication.userData) {
            report.authentication.userData = 'PRESENT_BUT_HIDDEN';
          }
          
          console.log('📊 تقرير النظام:', report);
          
          // إنشاء ملف تقرير قابل للتحميل
          const reportBlob = new Blob([JSON.stringify(report, null, 2)], {
            type: 'application/json'
          });
          const url = URL.createObjectURL(reportBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `system-report-${new Date().toISOString().slice(0, 19)}.json`;
          a.click();
          URL.revokeObjectURL(url);
          
          return report;
        } catch (error) {
          console.error('❌ خطأ في إنشاء التقرير:', error);
          return { error };
        }
      };

      // عرض المساعدة تلقائياً في بيئة التطوير
      // Development tools disabled in production
    };
    
    const initializeApp = async () => {
      try {
        // إعداد دوال DevTools فقط
        setupDevToolsHelpers();
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  const handleLogin = (userData: User, token: string) => {
    console.log('🔐 App: Handling login for user:', userData.fullName);
    login(userData, token);
  };

  // ⚡ Simplified loading logic - removed duplicate login display
  
  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="min-h-screen bg-gray-50" dir="rtl">
            <Switch>
              {/* test login removed - localStorage dependent */}
              {/* Clean routes - only essential ones */}
              {/* تم حذف final-unification */}
              {/* storage inspection removed - localStorage dependent */}
              {/* تم حذف compatibility-check */}
              {/* unified sync removed - localStorage dependent */}
              {/* debug storage removed - localStorage dependent */}
              {/* data recovery removed - localStorage dependent */}
              <Route>
                {/* 🔒 عرض ثابت بدون انتظار أي تحميل إضافي - منع الوميض نهائياً */}
                {isAuthenticated && user ? (
                  <AuthenticatedApp user={user} />
                ) : (
                  <EnhancedLogin />
                )}
              </Route>
            </Switch>
          </div>
          <Toaster />
          {/* AutoSyncNotification removed - localStorage dependent */}
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;