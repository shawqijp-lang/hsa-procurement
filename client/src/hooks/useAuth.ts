/**
 * 🔐 النظام الموحد للمصادقة - IndexedDB متطور
 * 
 * يدمج جميع أنظمة المصادقة في نظام واحد شامل:
 * - IndexedDB كتخزين وحيد متطور
 * - دعم العمل بدون اتصال المتقدم
 * - أمان متقدم وأداء محسن
 * - قابلية توسع للشركات المتعددة
 * - Singleton pattern للحالة العامة
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { enhancedIndexedDB } from '@/lib/enhancedIndexedDB';
import { useAppState } from './useAppState';
import { PersistentStorage } from '@/lib/persistentStorage';

interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
  canManageUsers?: boolean;
  companyId?: number;
  isActive?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  connectionStatus: 'online' | 'offline';
  syncStatus: 'synced' | 'pending' | 'error';
}

// نمط Singleton للحالة العامة الموحدة - مصحح
let globalAuthState: AuthState | null = null;
let globalStateSubscribers: ((state: AuthState) => void)[] = [];
let authInitialized = false;
let initializationPromise: Promise<void> | null = null;

export function useAuth() {
  const [, setLocation] = useLocation();
  const [localAuthState, setLocalAuthState] = useState<AuthState>(() => 
    globalAuthState || {
      user: null,
      isAuthenticated: false,
      loading: true,
      error: null,
      connectionStatus: navigator.onLine ? 'online' : 'offline',
      syncStatus: 'synced'
    }
  );

  const { shouldPreserveCredentials, isExplicitLogout } = useAppState();

  // تحديث الحالة المحلية عند تغيير الحالة العامة - مع حماية من التكرار
  useEffect(() => {
    const updateLocalState = (newState: AuthState) => {
      // تحديث آمن لتجنب التحديثات غير المرغوب فيها
      setLocalAuthState(prevState => {
        if (JSON.stringify(prevState) === JSON.stringify(newState)) {
          return prevState; // لا تغيير إذا كانت البيانات متطابقة
        }
        return newState;
      });
    };

    globalStateSubscribers.push(updateLocalState);

    return () => {
      const index = globalStateSubscribers.indexOf(updateLocalState);
      if (index > -1) {
        globalStateSubscribers.splice(index, 1);
      }
    };
  }, []);

  // تحديث الحالة العامة وإشعار جميع المشتركين - مصحح
  const updateGlobalState = (newState: Partial<AuthState>) => {
    // تهيئة الحالة العامة إذا لم تكن موجودة
    if (!globalAuthState) {
      globalAuthState = {
        user: null,
        isAuthenticated: false,
        loading: true,
        error: null,
        connectionStatus: navigator.onLine ? 'online' : 'offline',
        syncStatus: 'synced'
      };
    }
    
    const updatedState = { ...globalAuthState, ...newState };
    
    // تجنب التحديثات المكررة
    if (JSON.stringify(globalAuthState) === JSON.stringify(updatedState)) {
      return;
    }
    
    globalAuthState = updatedState;
    console.log('🔄 Global Auth State Updated:', globalAuthState);
    
    // إشعار جميع المشتركين
    globalStateSubscribers.forEach(subscriber => {
      try {
        subscriber(globalAuthState!);
      } catch (error) {
        console.warn('⚠️ خطأ في إشعار مشترك الحالة:', error);
      }
    });
  };

  // تهيئة النظام مرة واحدة فقط - محسنة مع التخزين الدائم
  useEffect(() => {
    if (!authInitialized) {
      authInitialized = true;
      console.log('🚀 بدء تهيئة النظام الموحد مع التخزين الدائم...');
      
      // تهيئة متوازية للتخزين الدائم والنظام الموحد
      (async () => {
        await PersistentStorage.initialize();
        await initializeUnifiedAuth();
      })();
    }
  }, [shouldPreserveCredentials, isExplicitLogout]);

  /**
   * نظام كشف ذكي للتسجيل المحلي - مقاوم للحذف ومتعدد المستويات
   */
  const checkOfflineLoginState = async (): Promise<{ active: boolean; user: User; token: string } | null> => {
    try {
      console.log('🔍 [AUTH] بدء الفحص الذكي للتسجيل المحلي...');
      
      // المستوى الأول: فحص علامات التسجيل المحلي النشطة
      const offlineLoginActive = await enhancedIndexedDB.getItem('offline_login_active');
      const offlineLoginUser = await enhancedIndexedDB.getItem('offline_login_user');
      const offlineLoginTrigger = await enhancedIndexedDB.getItem('offline_login_trigger');
      
      if ((offlineLoginActive || offlineLoginTrigger) && offlineLoginUser) {
        const savedToken = await enhancedIndexedDB.getItem('auth_token');
        if (savedToken) {
          console.log('🎯 [AUTH] مستوى 1: تم اكتشاف تسجيل دخول محلي نشط');
          return {
            active: true,
            user: offlineLoginUser,
            token: savedToken
          };
        }
      }
      
      // المستوى الثاني: فحص الجلسة المحلية الدائمة
      const persistentSession = await enhancedIndexedDB.getItem('persistent_offline_session');
      if (persistentSession && persistentSession.active && persistentSession.user && persistentSession.token) {
        console.log('🛡️ [AUTH] مستوى 2: تم اكتشاف جلسة محلية دائمة');
        return {
          active: true,
          user: persistentSession.user,
          token: persistentSession.token
        };
      }
      
      // المستوى الثالث: فحص بيانات المصادقة المحفوظة مع فحص استمرارية الجلسة
      const lastOfflineSession = await enhancedIndexedDB.getItem('last_offline_session_timestamp');
      const currentTime = Date.now();
      
      if (lastOfflineSession && (currentTime - lastOfflineSession < 24 * 60 * 60 * 1000)) { // 24 ساعة
        const savedToken = await enhancedIndexedDB.getItem('auth_token');
        const savedUser = await enhancedIndexedDB.getItem('auth_user');
        
        if (savedToken && savedUser) {
          console.log('⏰ [AUTH] مستوى 3: جلسة قديمة صالحة (أقل من 24 ساعة)');
          return {
            active: true,
            user: savedUser,
            token: savedToken
          };
        }
      }
      
      console.log('❌ [AUTH] لم يتم العثور على تسجيل دخول محلي صالح');
      return null;
    } catch (error) {
      console.error('❌ [AUTH] خطأ في فحص التسجيل المحلي:', error);
      return null;
    }
  };

  /**
   * تهيئة النظام الموحد المتطور - مع أولوية عالية للبحث في IndexedDB
   */
  const initializeUnifiedAuth = async () => {
    console.log('🔧 تهيئة النظام الموحد للمصادقة - البحث في IndexedDB أولاً...');
    
    try {
      await enhancedIndexedDB.init();
      
      // أولوية قصوى: البحث في IndexedDB عن أي بيانات مصادقة محفوظة
      console.log('🔍 [أولوية 1] البحث في IndexedDB عن بيانات محفوظة...');
      
      // البحث في مختلف مواقع التخزين
      const searchResults = await Promise.all([
        enhancedIndexedDB.getItem('auth_token'),
        enhancedIndexedDB.getItem('auth_user'),
        enhancedIndexedDB.getItem('persistent_offline_session'),
        checkOfflineLoginState()
      ]);
      
      const [token, userData, persistentSession, offlineLoginData] = searchResults;
      
      // أولوية 1: جلسة محلية مقاومة للحذف
      if (persistentSession?.active && persistentSession.user && persistentSession.token) {
        console.log('🎯 [أولوية 1] تم العثور على جلسة محلية دائمة:', persistentSession.user.username);
        await login(persistentSession.user, persistentSession.token);
        return;
      }
      
      // أولوية 2: نظام التسجيل المحلي النشط
      if (offlineLoginData?.active) {
        console.log('🎯 [أولوية 2] تم العثور على تسجيل دخول محلي نشط:', offlineLoginData.user.username);
        
        // إزالة علامات الدخول المحلي المؤقتة لتجنب التكرار
        await enhancedIndexedDB.removeItem('offline_login_active');
        await enhancedIndexedDB.removeItem('offline_login_trigger');
        
        await login(offlineLoginData.user, offlineLoginData.token);
        return;
      }
      
      // أولوية 3: بيانات المصادقة العادية
      if (token && userData) {
        console.log('🎯 [أولوية 3] تم العثور على بيانات مصادقة عادية');
        const user = typeof userData === 'string' ? JSON.parse(userData) : userData;
        
        // لا نتحقق من shouldPreserveCredentials هنا - نعطي الأولوية للبيانات الموجودة
        console.log('✅ استرجاع جلسة محفوظة - تجاهل الشروط المعقدة');
        
        await login(user, token);
        
        // التحقق من صحة الرمز في الخلفية (إذا كان متصل)
        if (navigator.onLine) {
          validateTokenInBackground(token);
        }
        return;
      }
      
      // فحص حالة تسجيل الخروج الصريح فقط إذا لم نجد أي بيانات
      if (isExplicitLogout) {
        console.log('🚪 تسجيل خروج صريح - مسح بيانات الجلسة');
        await clearSessionCredentials();
        
        // إزالة علامة explicit_logout بعد المعالجة
        await enhancedIndexedDB.removeItem('explicit_logout');
        console.log('🧹 تم إزالة علامة explicit_logout بعد المعالجة');
      }
      
      // إذا لم نجد أي بيانات، نعرض شاشة تسجيل الدخول
      console.log('❌ لم يتم العثور على بيانات مصادقة في IndexedDB');
      updateGlobalState({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null
      });
      
    } catch (error) {
      console.error('❌ فشل في تهيئة النظام الموحد:', error);
      updateGlobalState({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: 'فشل في تهيئة النظام'
      });
    }
  };

  // متغير لمنع التكرار
  let isLoginInProgress = false;
  let lastLoginData: { username: string; companyId: number; timestamp: number } | null = null;

  /**
   * تسجيل الدخول الموحد المتطور - مع حماية من التكرار وكشف تبديل المستخدم
   */
  const login = async (userData: User, token: string) => {
    console.log('🎯 LOGIN FUNCTION CALLED!', userData.username);
    try {
      // 🔒 [USER_SWITCH_DETECTION] فحص تبديل المستخدم قبل المتابعة
      const previousUserData = await enhancedIndexedDB.getItem('auth_user');
      const previousUsername = await enhancedIndexedDB.getItem('auth_username');
      const previousCompany = await enhancedIndexedDB.getItem('auth_company');
      
      let isUserSwitch = false;
      let previousUserInfo = null;
      
      if (previousUserData && previousUsername) {
        const previousUser = typeof previousUserData === 'string' ? JSON.parse(previousUserData) : previousUserData;
        previousUserInfo = {
          username: previousUser.username || previousUsername,
          companyId: previousUser.companyId || parseInt(previousCompany || '0'),
          userId: previousUser.id
        };
        
        // كشف تبديل المستخدم: اسم مختلف أو شركة مختلفة أو معرف مختلف
        isUserSwitch = previousUserInfo.username !== userData.username || 
                      previousUserInfo.companyId !== userData.companyId ||
                      previousUserInfo.userId !== userData.id;
        
        if (isUserSwitch) {
          console.log('🔄 [USER_SWITCH_DETECTED] تم اكتشاف تبديل المستخدم!', {
            previousUser: previousUserInfo.username,
            previousCompany: previousUserInfo.companyId,
            newUser: userData.username,
            newCompany: userData.companyId,
            requiresRefresh: true
          });
        }
      }

      // فحص التكرار - تجنب حفظ نفس البيانات مرة أخرى خلال 5 ثواني
      const currentTimestamp = Date.now();
      const isSameUser = lastLoginData && 
        lastLoginData.username === userData.username && 
        lastLoginData.companyId === userData.companyId && 
        (currentTimestamp - lastLoginData.timestamp) < 5000; // 5 ثوان

      if (isLoginInProgress && !isUserSwitch) {
        console.log('⚠️ تسجيل دخول قيد التنفيذ، تجاهل الطلب المكرر');
        return;
      }

      if (isSameUser && !isUserSwitch) {
        console.log('⚠️ نفس المستخدم سجّل دخول مؤخراً، لكن سيتم التأكد من حفظ البيانات');
        // لا نخرج من الدالة - نستمر لضمان حفظ البيانات
      }

      // 🔄 [USER_SWITCH_HANDLER] معالجة تبديل المستخدم
      if (isUserSwitch) {
        console.log('🧹 [USER_SWITCH] تنظيف بيانات المستخدم السابق قبل الدخول الجديد...');
        
        // مسح شامل لجميع البيانات المتعلقة بالمستخدم السابق
        await clearAllPreviousUserData();
        
        // تنظيف cache المتصفح المتعلق بالبيانات السابقة
        await clearApplicationCache();
        
        // 📺 [SCREEN_REFRESH] تحديث الشاشة لضمان عدم ظهور بيانات المستخدم السابق
        console.log('📺 [USER_SWITCH] تحديث الشاشة لتجنب عرض بيانات المستخدم السابق...');
        
        // تأخير قصير للسماح بمسح البيانات قبل التحديث
        setTimeout(() => {
          window.location.reload();
        }, 100);
        
        return; // إيقاف العملية هنا والسماح لـ reload بالتعامل مع الباقي
      }

      isLoginInProgress = true;
      console.log('🔐 تسجيل دخول موحد متطور:', userData.username);
      
      // حفظ البيانات في IndexedDB - مع بيانات المصادقة المحلية
      await enhancedIndexedDB.setItem('auth_token', token, 'auth');
      await enhancedIndexedDB.setItem('auth_user', userData, 'auth');
      
      // حفظ بيانات إضافية للمصادقة المحلية مقاومة للحذف - نظام محسّن
      console.log('🚀 بدء حفظ بيانات الوضع المحلي المقاوم للحذف...');
      
      if (userData.username) {
        // حفظ بيانات أساسية
        await enhancedIndexedDB.setItem('auth_username', userData.username, 'auth');
        console.log('✅ تم حفظ اسم المستخدم للوضع المحلي:', userData.username);
        
        // إنشاء جلسة محلية دائمة مقاومة للحذف
        const persistentSession = {
          active: true,
          user: userData,
          token: token,
          timestamp: Date.now(),
          lastActivity: Date.now()
        };
        
        await enhancedIndexedDB.setItem('persistent_offline_session', persistentSession, 'auth');
        await enhancedIndexedDB.setItem('last_offline_session_timestamp', Date.now(), 'auth');
        
        console.log('🛡️ تم إنشاء جلسة محلية دائمة مقاومة للحذف');
        
        // التحقق من الحفظ فوراً
        const savedUsername = await enhancedIndexedDB.getItem('auth_username');
        const savedPersistentSession = await enhancedIndexedDB.getItem('persistent_offline_session');
        
        console.log('🔍 التحقق من حفظ البيانات:', {
          username: savedUsername,
          hasSession: !!savedPersistentSession
        });
        
        if (savedUsername !== userData.username) {
          console.error('❌ فشل حفظ اسم المستخدم!');
        }
        
        if (!savedPersistentSession) {
          console.error('❌ فشل حفظ الجلسة المحلية الدائمة!');
        }
      }
      
      if (userData.companyId) {
        const companyIdStr = userData.companyId.toString();
        await enhancedIndexedDB.setItem('auth_company', companyIdStr, 'auth');
        console.log('✅ تم حفظ معرف الشركة للوضع المحلي:', companyIdStr);
        
        // جلب وحفظ بيانات الشركة الكاملة للعرض في Header
        try {
          const response = await fetch('/api/companies', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          console.log('📡 [Auth] استجابة API companies:', response.status);
          
          if (response.ok) {
            const companies = await response.json();
            console.log('📋 [Auth] عدد الشركات:', companies.length, 'البحث عن شركة:', userData.companyId);
            
            const companyData = companies.find((c: any) => c.id === userData.companyId);
            console.log('🔍 [Auth] بيانات الشركة المعثور عليها:', companyData);
            
            if (companyData) {
              const dataToSave = {
                id: companyData.id,
                nameAr: companyData.nameAr,
                nameEn: companyData.nameEn
              };
              console.log('💾 [Auth] محاولة حفظ بيانات الشركة:', dataToSave);
              
              await enhancedIndexedDB.setItem('company_data', dataToSave, 'auth');
              console.log('✅ [Auth] تم حفظ بيانات الشركة بنجاح:', companyData.nameAr);
              
              // التحقق من الحفظ
              const savedData = await enhancedIndexedDB.getItem('company_data');
              console.log('🔍 [Auth] التحقق من البيانات المحفوظة:', savedData);
            } else {
              console.warn('⚠️ [Auth] لم يتم العثور على بيانات الشركة في الاستجابة');
            }
          } else {
            console.error('❌ [Auth] فشل استدعاء API companies:', response.status);
          }
        } catch (error) {
          console.error('❌ [Auth] خطأ في جلب بيانات الشركة:', error);
        }
        
        // التحقق من الحفظ فوراً  
        const savedCompany = await enhancedIndexedDB.getItem('auth_company');
        console.log('🔍 التحقق من حفظ معرف الشركة:', savedCompany);
        
        if (savedCompany !== companyIdStr) {
          console.error('❌ فشل حفظ معرف الشركة!');
        }
      }
      
      console.log('✅ انتهاء حفظ بيانات الوضع المحلي');
      
      // تحديث بيانات آخر تسجيل دخول
      lastLoginData = {
        username: userData.username,
        companyId: userData.companyId || 0,
        timestamp: currentTimestamp
      };
      
      updateGlobalState({
        user: userData,
        isAuthenticated: true,
        loading: false,
        error: null,
        syncStatus: 'synced'
      });

      console.log('✅ تم تسجيل الدخول بنجاح - النظام الموحد مع بيانات الوضع المحلي');
    } catch (error) {
      console.error('❌ فشل في تسجيل الدخول:', error);
      updateGlobalState({
        error: 'فشل في تسجيل الدخول',
        loading: false
      });
      throw error;
    } finally {
      isLoginInProgress = false;
    }
  };

  /**
   * تسجيل الخروج الموحد المتطور
   */
  const logout = async () => {
    try {
      console.log('🚪 تسجيل خروج موحد متطور');
      
      // مسح بيانات الجلسة فقط - الاحتفاظ بالبيانات للوضع المحلي
      await clearSessionCredentials();
      
      updateGlobalState({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        syncStatus: 'synced'
      });

      // إعادة توجيه لصفحة تسجيل الدخول
      setLocation('/login');
      
      console.log('✅ تم تسجيل الخروج بنجاح - النظام الموحد');
    } catch (error) {
      console.error('❌ فشل في تسجيل الخروج:', error);
      // حتى لو فشل، أعد تعيين الحالة
      updateGlobalState({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null
      });
      setLocation('/login');
    }
  };

  /**
   * مسح بيانات الجلسة مع الاحتفاظ بالبيانات للوضع المحلي
   */
  const clearSessionCredentials = async () => {
    try {
      console.log('🧹 clearSessionCredentials: بدء مسح بيانات الجلسة...');
      
      // فحص البيانات قبل المسح
      const beforeToken = await enhancedIndexedDB.getItem('auth_token');
      const beforeUser = await enhancedIndexedDB.getItem('auth_user');
      const beforeUsername = await enhancedIndexedDB.getItem('auth_username');
      const beforeCompany = await enhancedIndexedDB.getItem('auth_company');
      
      console.log('🔍 البيانات قبل المسح:', {
        hasToken: !!beforeToken,
        hasUser: !!beforeUser,
        hasUsername: !!beforeUsername,
        hasCompany: !!beforeCompany
      });
      
      // مسح رمز الجلسة فقط - الاحتفاظ ببيانات آخر تسجيل دخول ناجح
      await enhancedIndexedDB.removeItem('auth_token');
      await enhancedIndexedDB.removeItem('offline_credentials');
      await enhancedIndexedDB.removeItem('explicit_logout');
      
      // ✅ مسح الجلسة المحلية الدائمة لمنع استخدام JWT منتهي
      await enhancedIndexedDB.removeItem('persistent_offline_session');
      console.log('🛡️ تم مسح persistent_offline_session لمنع JWT منتهي');
      
      // فحص البيانات بعد المسح للتأكد
      const afterUser = await enhancedIndexedDB.getItem('auth_user');
      const afterUsername = await enhancedIndexedDB.getItem('auth_username');
      const afterCompany = await enhancedIndexedDB.getItem('auth_company');
      
      console.log('✅ البيانات بعد المسح:', {
        hasUser: !!afterUser,
        hasUsername: !!afterUsername,
        hasCompany: !!afterCompany
      });
      
      // الاحتفاظ بـ: auth_user, auth_username, auth_company
      // لتمكين تسجيل الدخول المحلي بدون كلمة مرور
      console.log('🧹 تم مسح رمز الجلسة مع الاحتفاظ ببيانات آخر تسجيل دخول');
    } catch (error) {
      console.warn('⚠️ فشل في مسح بعض البيانات:', error);
    }
  };

  /**
   * 🧹 [USER_SWITCH] مسح شامل لبيانات المستخدم السابق عند تبديل المستخدم
   */
  const clearAllPreviousUserData = async () => {
    try {
      console.log('🧹 [USER_SWITCH] بدء مسح شامل لبيانات المستخدم السابق...');
      
      // مسح جميع بيانات المصادقة
      await enhancedIndexedDB.removeItem('auth_token');
      await enhancedIndexedDB.removeItem('auth_user');
      await enhancedIndexedDB.removeItem('auth_username');
      await enhancedIndexedDB.removeItem('auth_company');
      await enhancedIndexedDB.removeItem('auth_company_data');
      
      // مسح البيانات المحلية والجلسات
      await enhancedIndexedDB.removeItem('offline_credentials');
      await enhancedIndexedDB.removeItem('persistent_offline_session');
      await enhancedIndexedDB.removeItem('offline_login_active');
      await enhancedIndexedDB.removeItem('offline_login_trigger');
      
      // مسح بيانات التطبيق المحفوظة
      await enhancedIndexedDB.removeItem('cached_locations');
      await enhancedIndexedDB.removeItem('dashboard_locations');
      await enhancedIndexedDB.removeItem('cached_companies');
      await enhancedIndexedDB.removeItem('app_state');
      
      console.log('✅ [USER_SWITCH] تم مسح جميع بيانات المستخدم السابق بنجاح');
    } catch (error) {
      console.warn('⚠️ [USER_SWITCH] فشل في مسح بعض البيانات:', error);
    }
  };

  /**
   * 🗂️ [USER_SWITCH] تنظيف cache التطبيق عند تبديل المستخدم
   */
  const clearApplicationCache = async () => {
    try {
      console.log('🗂️ [USER_SWITCH] تنظيف cache التطبيق...');
      
      // مسح cache المتصفح إذا كان متاح
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('✅ [USER_SWITCH] تم مسح cache المتصفح');
      }
      
      // إعادة تعيين lastLoginData
      lastLoginData = null;
      
      // إعادة تعيين الحالة العامة
      globalAuthState = null;
      
      console.log('✅ [USER_SWITCH] تم تنظيف cache التطبيق بنجاح');
    } catch (error) {
      console.warn('⚠️ [USER_SWITCH] فشل في تنظيف cache التطبيق:', error);
    }
  };

  /**
   * مسح جميع بيانات الاعتماد (للخروج النهائي أو إعادة التعيين)
   */
  const clearAllCredentials = async () => {
    try {
      await enhancedIndexedDB.removeItem('auth_token');
      await enhancedIndexedDB.removeItem('auth_user');
      await enhancedIndexedDB.removeItem('auth_username');
      await enhancedIndexedDB.removeItem('auth_company');
      await enhancedIndexedDB.removeItem('offline_credentials');
      await enhancedIndexedDB.removeItem('explicit_logout');
      console.log('🧹 تم مسح جميع بيانات الاعتماد - النظام الموحد');
    } catch (error) {
      console.warn('⚠️ فشل في مسح بعض البيانات:', error);
    }
  };

  /**
   * التحقق من صحة الرمز في الخلفية مع حماية من التكرار
   */
  const validateTokenInBackground = async (token: string) => {
    // حماية من الاستدعاءات المتعددة
    if ((window as any).tokenValidationInProgress) {
      return;
    }
    (window as any).tokenValidationInProgress = true;
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('⚠️ الرمز المميز غير صالح - تسجيل خروج تلقائي');
        await logout();
      }
    } catch (error) {
      console.warn('⚠️ فشل في التحقق من الرمز:', error);
      // لا نقوم بتسجيل الخروج في حالة خطأ الشبكة
    }
  };

  // مراقب حالة الاتصال
  useEffect(() => {
    const handleOnline = () => {
      updateGlobalState({ connectionStatus: 'online' });
      
      // إعادة التحقق من الرمز عند عودة الاتصال
      if (localAuthState.isAuthenticated) {
        enhancedIndexedDB.getItem('auth_token').then(token => {
          if (token) {
            validateTokenInBackground(token);
          }
        });
      }
    };

    const handleOffline = () => {
      console.log('🔌 فقدان الاتصال بالإنترنت - التحقق من البيانات المحفوظة');
      
      // فحص البيانات المحفوظة في الوضع المحلي
      (async () => {
        try {
          const token = await enhancedIndexedDB.getAuthData('auth_token');
          const userData = await enhancedIndexedDB.getAuthData('user_data');
          
          if (token && userData) {
            console.log('✅ توجد بيانات محفوظة - يعمل النظام في الوضع المحلي');
            updateGlobalState({ 
              connectionStatus: 'offline',
              error: 'لا يوجد اتصال بالإنترنت - يعمل النظام في الوضع المحلي'
            });
          } else {
            console.log('❌ لا توجد بيانات محفوظة - إعادة توجيه لتسجيل الدخول');
            updateGlobalState({
              user: null,
              isAuthenticated: false,
              connectionStatus: 'offline',
              error: 'يرجى تسجيل الدخول مرة أخرى'
            });
            
            // إعادة توجيه لشاشة تسجيل الدخول إذا لم يكن المستخدم فيها بالفعل
            const currentPath = window.location.pathname;
            if (currentPath !== '/enhanced-login' && currentPath !== '/login') {
              setLocation('/enhanced-login');
            }
          }
        } catch (error) {
          console.warn('⚠️ خطأ في فحص البيانات المحفوظة:', error);
          updateGlobalState({
            user: null,
            isAuthenticated: false,
            connectionStatus: 'offline',
            error: 'يرجى تسجيل الدخول مرة أخرى'
          });
          
          // إعادة توجيه لشاشة تسجيل الدخول إذا لم يكن المستخدم فيها بالفعل
          const currentPath = window.location.pathname;
          if (currentPath !== '/enhanced-login' && currentPath !== '/login') {
            setLocation('/enhanced-login');
          }
        }
      })();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [localAuthState.isAuthenticated]);

  return {
    // الحالة الحالية (متوافق مع النظام القديم)
    user: localAuthState.user,
    isAuthenticated: localAuthState.isAuthenticated,
    loading: localAuthState.loading,
    
    // الوظائف الأساسية
    login,
    logout,
    clearCredentials: clearAllCredentials,
    
    // معلومات إضافية متطورة
    error: localAuthState.error,
    connectionStatus: localAuthState.connectionStatus,
    syncStatus: localAuthState.syncStatus,
    isOffline: localAuthState.connectionStatus === 'offline',
    
    // للتوافق مع الأنظمة القديمة
    migrationStatus: 'completed',
    migrationDetails: {
      migratedKeys: ['auth_token', 'user_data'],
      errors: []
    }
  };
}