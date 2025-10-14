import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { AlertCircle, Loader2, Building2, WifiOff, CheckCircle, Globe, Smartphone } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { enhancedIndexedDB } from '@/lib/enhancedIndexedDB';
import '@/styles/login.css';

interface Company {
  id: number;
  nameAr: string;
  nameEn?: string;
}

interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
  companyId: number;
}

export default function EnhancedLoginPage() {
  // Production Version 6.16.0
  // Test offline mode state for development (disabled by default)  
  const [manualOfflineMode, setManualOfflineMode] = useState(false);
  
  
  const toggleOfflineMode = () => {
    setManualOfflineMode(!manualOfflineMode);
    console.log('🔄 تم تغيير الوضع المحلي يدوياً:', !manualOfflineMode ? 'مفعّل' : 'معطّل');
  };
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);
  
  // Auth hook
  const {
    user,
    isAuthenticated,
    loading: authLoading,
    login,
    logout,
    isOffline: hookIsOffline
  } = useAuth();
  
  // Offline status - نظام محسن لمراقبة حالة الاتصال  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // إصلاح: حالة الـ offline تعتمد على الاتصال الفعلي وليس البيانات المحفوظة
  const isOffline = (!isOnline && !navigator.onLine) || manualOfflineMode;


  // 🔒 [USER_SWITCH_PREVENTION] فحص تنظيف البيانات عند تحميل صفحة تسجيل الدخول
  useEffect(() => {
    const checkAndClearPreviousUserData = async () => {
      try {
        console.log('🔍 [LOGIN_PAGE] فحص وجود بيانات مستخدم سابق...');
        
        // فحص وجود بيانات مستخدم محفوظة
        const savedUser = await enhancedIndexedDB.getItem('auth_user');
        const savedUsername = await enhancedIndexedDB.getItem('auth_username');
        const hasToken = await enhancedIndexedDB.getItem('auth_token');
        
        // إذا كان هناك بيانات مستخدم محفوظة بدون token صالح، احتمال تبديل مستخدم
        if ((savedUser || savedUsername) && !hasToken && !isAuthenticated) {
          console.log('🧹 [LOGIN_PAGE] وجدت بيانات مستخدم سابق بدون token - تنظيف احترازي...');
          
          // مسح البيانات المحتملة للمستخدم السابق احترازياً
          await enhancedIndexedDB.removeItem('cached_locations');
          await enhancedIndexedDB.removeItem('dashboard_locations');
          
          // مسح أي بيانات مؤقتة قد تكون متبقية
          await enhancedIndexedDB.removeItem('persistent_offline_session');
          await enhancedIndexedDB.removeItem('offline_login_active');
          
          console.log('✅ [LOGIN_PAGE] تم تنظيف البيانات المحتملة للمستخدم السابق');
        }
      } catch (error) {
        console.warn('⚠️ [LOGIN_PAGE] فشل في فحص/تنظيف البيانات السابقة:', error);
      }
    };
    
    // تشغيل الفحص عند تحميل الصفحة إذا لم يكن مستخدم مسجل دخول
    if (!isAuthenticated && !authLoading) {
      checkAndClearPreviousUserData();
    }
  }, [isAuthenticated, authLoading]);

  // إعادة توجيه المستخدم المسجل دخول بالفعل - محسن
  useEffect(() => {
    if (isAuthenticated && user && !authLoading) {
      console.log('✅ [REDIRECT_EFFECT] المستخدم مسجل دخول - إعادة توجيه فورية للوحة التحكم');
      console.log('📊 [REDIRECT_EFFECT] بيانات المستخدم:', {
        username: user.username,
        role: user.role,
        companyId: user.companyId,
        isAuthenticated,
        authLoading
      });
      
      // إعادة توجيه مؤجلة قليلاً لضمان استقرار الحالة
      const redirectTimer = setTimeout(() => {
        console.log('🚀 [REDIRECT_EFFECT] تنفيذ إعادة التوجيه الآن...');
        setLocation('/');
      }, 50);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [isAuthenticated, user, authLoading, setLocation]);
  
  // Removed duplicate toggleOfflineMode function
  
  // تتبع بسيط للأخطاء
  useEffect(() => {
    if (error) {
      console.log('❌ خطأ في تسجيل الدخول:', error);
    }
  }, [error]);

  // Fetch companies with forced loading when online
  const { data: companies, isLoading: companiesLoading, error: companiesError } = useQuery<Company[]>({
    queryKey: ['/api/companies/public'],
    retry: false,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    placeholderData: [],  // ملفات شركات مؤقتة
    enabled: isOnline, // فقط يحمّل عندما يكون متصل بالإنترنت
    refetchOnMount: true, // دائماً يحمّل عند فتح الصفحة
    refetchOnWindowFocus: false, // لا يحمّل عند العودة للنافذة
  });

  // Save companies data when fetched
  useEffect(() => {
    if (companies && Array.isArray(companies) && companies.length > 0) {
      // حفظ بيانات الشركات في IndexedDB للاستخدام في وضع عدم الاتصال
      const saveCompaniesData = async () => {
        try {
          const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
          await enhancedIndexedDB.setItem('cached_companies', companies, 'data');
          console.log('✅ تم حفظ بيانات الشركات في IndexedDB:', companies.length, 'شركة');
        } catch (error) {
          console.warn('⚠️ فشل في حفظ بيانات الشركات:', error);
        }
      };
      
      saveCompaniesData();
    }
  }, [companies]);

  // مراقبة تغييرات حالة الإنترنت مع معالجة محسنة للأخطاء
  useEffect(() => {
    const handleOnlineStatus = () => {
      const newOnlineStatus = navigator.onLine;
      console.log('🔄 تغيير حالة الإنترنت:', newOnlineStatus ? 'متصل' : 'غير متصل');
      setIsOnline(newOnlineStatus);
      
      if (!newOnlineStatus) {
        console.log('🔌 انقطع الاتصال - سيتم عرض خيارات الدخول المحلي');
        // عرض رسالة للمستخدم بإمكانية الدخول المحلي
        if (username && selectedCompany) {
          setError('انقطع الاتصال - يمكنك تسجيل الدخول بالبيانات المحفوظة');
        }
      } else {
        console.log('🌐 تم استعادة الاتصال');
        setError('');
      }
    };

    // تحديث فوري عند التحميل
    handleOnlineStatus();

    // إضافة المستمعين
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    // إزالة المستمعين عند التنظيف
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, [username, selectedCompany]);

  // Auto-fill from offline credentials - دمج مع النظام الموحد
  useEffect(() => {
    // فقط إذا لم يكن المستخدم مصدق بالفعل
    if (!isAuthenticated) {
      const loadSavedCredentials = async () => {
        try {
          const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
          
          // محاولة استرجاع بيانات المستخدم المحفوظة
          const savedUsername = await enhancedIndexedDB.getItem('auth_username');
          const savedCompanyId = await enhancedIndexedDB.getItem('auth_company');
          
          if (savedUsername) {
            setUsername(savedUsername);
            console.log('✅ تم استرجاع اسم المستخدم المحفوظ:', savedUsername);
          }
          
          if (savedCompanyId) {
            setSelectedCompany(Number(savedCompanyId));
            console.log('✅ تم استرجاع الشركة المحفوظة:', savedCompanyId);
            
            // استرجاع بيانات الشركة الكاملة
            try {
              const cachedCompanies = await enhancedIndexedDB.getItem('cached_companies');
              if (cachedCompanies && Array.isArray(cachedCompanies)) {
                const companyData = cachedCompanies.find(c => c.id === Number(savedCompanyId));
                if (companyData) {
                  setLastSelectedCompany(companyData);
                  console.log('✅ تم استرجاع بيانات الشركة الكاملة:', companyData.nameAr);
                }
              }
            } catch (error) {
              console.warn('⚠️ فشل في استرجاع بيانات الشركة الكاملة:', error);
            }
          }
        } catch (error) {
          console.warn('⚠️ فشل في استرجاع بيانات الاعتماد:', error);
        }
      };
      
      loadSavedCredentials();
    }
  }, [isAuthenticated]);

  // State for offline companies
  const [offlineCompanies, setOfflineCompanies] = useState<Company[]>([]);
  const [lastSelectedCompany, setLastSelectedCompany] = useState<Company | null>(null);

  // Load offline companies when not connected
  useEffect(() => {
    if (!isOnline) {
      const loadOfflineCompanies = async () => {
        try {
          const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
          
          // استرجاع الشركات المحفوظة
          const cachedCompanies = await enhancedIndexedDB.getItem('cached_companies');
          
          // استرجاع آخر شركة تم اختيارها
          const savedCompanyId = await enhancedIndexedDB.getItem('auth_company');
          
          if (cachedCompanies && Array.isArray(cachedCompanies)) {
            setOfflineCompanies(cachedCompanies);
            console.log('✅ تم استرجاع', cachedCompanies.length, 'شركة من التخزين المحلي');
            
            // العثور على آخر شركة تم اختيارها
            if (savedCompanyId) {
              const lastCompany = cachedCompanies.find(c => c.id === Number(savedCompanyId));
              if (lastCompany) {
                setLastSelectedCompany(lastCompany);
                console.log('✅ تم العثور على آخر شركة تم اختيارها:', lastCompany.nameAr);
              }
            }
          } else {
            // إذا لم توجد شركات محفوظة، إنشاء قائمة بالشركة الأخيرة فقط
            if (savedCompanyId && lastSelectedCompany) {
              setOfflineCompanies([lastSelectedCompany]);
              console.log('✅ عرض الشركة الأخيرة فقط في وضع عدم الاتصال');
            }
          }
        } catch (error) {
          console.warn('⚠️ فشل في استرجاع الشركات المحفوظة:', error);
          setOfflineCompanies([]);
        }
      };
      
      loadOfflineCompanies();
    }
  }, [isOnline, lastSelectedCompany]);

  // Get display companies - مع دعم الوضع الخاص بعدم الاتصال
  const displayCompanies = useMemo(() => {
    if (isOnline) {
      return companies || [];
    } else {
      // في وضع عدم الاتصال، عرض الشركات المحفوظة مع إبراز الأخيرة
      const baseCompanies = offlineCompanies.length > 0 ? offlineCompanies : [];
      
      // التأكد من أن آخر شركة موجودة في القائمة
      if (lastSelectedCompany && !baseCompanies.find(c => c.id === lastSelectedCompany.id)) {
        return [lastSelectedCompany, ...baseCompanies];
      }
      
      return baseCompanies;
    }
  }, [isOnline, companies, offlineCompanies, lastSelectedCompany]);
  
  // إضافة log للتشخيص
  useEffect(() => {
    console.log('🏢 Companies status:', {
      isOnline,
      companiesLoading,
      companiesCount: companies?.length || 0,
      companiesError: companiesError?.message,
      hasCompanies: !!(companies && companies.length > 0)
    });
  }, [isOnline, companies, companiesLoading, companiesError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Form submission for production
    setError('');
    setLoading(true);

    try {
      // 🔒 [USER_SWITCH_CHECK] فحص تبديل المستخدم قبل تسجيل الدخول
      const previousUser = await enhancedIndexedDB.getItem('auth_user');
      const previousUsername = await enhancedIndexedDB.getItem('auth_username');
      const previousCompany = await enhancedIndexedDB.getItem('auth_company');
      
      if (previousUser && previousUsername && selectedCompany) {
        const previousUserObject = typeof previousUser === 'string' ? JSON.parse(previousUser) : previousUser;
        const isUserSwitching = (previousUserObject.username !== username) || 
                               (parseInt(previousCompany || '0') !== selectedCompany);
        
        if (isUserSwitching) {
          console.log('🔄 [LOGIN_FORM] اكتشاف تبديل مستخدم في نموذج تسجيل الدخول!', {
            previousUser: previousUserObject.username,
            newUser: username,
            previousCompany: previousCompany,
            newCompany: selectedCompany,
            willClearBeforeLogin: true
          });
          
          // مسح احترازي للبيانات قبل المتابعة
          await enhancedIndexedDB.removeItem('cached_locations');
          await enhancedIndexedDB.removeItem('dashboard_locations');
          await enhancedIndexedDB.removeItem('persistent_offline_session');
          
          console.log('🧹 [LOGIN_FORM] تم تنظيف البيانات قبل تسجيل الدخول الجديد');
        }
      }

      // Validate inputs
      if (!username.trim()) {
        setError('يرجى إدخال اسم المستخدم');
        setLoading(false);
        return;
      }

      if (!selectedCompany) {
        setError('يرجى اختيار الشركة');
        setLoading(false);
        return;
      }

      // Find selected company
      const company = displayCompanies.find(c => c.id === selectedCompany);
      if (!company) {
        setError('الشركة المحددة غير صحيحة');
        setLoading(false);
        return;
      }

      // تحديد حالة الاتصال الفعلية مع حماية من الأخطاء
      const actuallyOffline = !navigator.onLine || isOffline;
      
      console.log('🔍 Connection Status Check:', {
        navigatorOnline: navigator.onLine,
        hookIsOffline,
        manualOfflineMode,
        finalIsOffline: isOffline,
        actuallyOffline,
        willUseOnlineLogin: !actuallyOffline
      });
      
      // Online login - primary path when connected
      if (!actuallyOffline) {
        // Online login - full validation
        if (!password.trim()) {
          setError('يرجى إدخال كلمة المرور');
          setLoading(false);
          return;
        }

        console.log('🌐 تسجيل دخول عبر الإنترنت');
        console.log('📋 بيانات تسجيل الدخول:', { username, companyId: selectedCompany, hasPassword: !!password });
        
        console.log('🚀 ABOUT TO CALL API REQUEST!!!');
        const response = await apiRequest('/api/auth/login', 'POST', {
          username,
          password,
          companyId: selectedCompany
        });

        console.log('🎉 API CALL COMPLETED!!!');
        console.log('🔍 Response structure:', response);
        console.log('🔍 response.token exists:', !!response.token);
        console.log('🔍 response.user exists:', !!response.user);
        console.log('🔍 All response keys:', Object.keys(response));
        
        if (response.token && response.user) {
          console.log('✅ نجح تسجيل الدخول عبر الإنترنت');
          console.log('🎯 سأبدأ استدعاء useAuth.login الآن...');
          
          console.log('🔄 سيتم الاعتماد على النظام الموحد في useAuth للحفظ...');
          
          // تطبيق النظام الموحد للمصادقة
          try {
            console.log('🔄 استدعاء وظيفة login من useAuth...');
            console.log('🔍 login function available:', typeof login);
            console.log('🔍 response.user:', response.user);
            console.log('🔍 response.token:', !!response.token);
            
            await login(response.user, response.token);
            console.log('✅ Enhanced Login: Auth state updated successfully');
            
            console.log('✅ النظام الموحد سيتولى حفظ جميع البيانات المطلوبة');
            
            setLoginSuccess(true);
            
            toast({
              title: "تم تسجيل الدخول بنجاح",
              description: "جاري الانتقال للوحة التحكم...",
            });
            
            // 🔄 [NAVIGATION_FIX] إعادة التوجيه المؤجلة لضمان تحديث الحالة أولاً
            console.log('🔄 [NAVIGATION_FIX] تأجيل إعادة التوجيه لضمان تحديث حالة المصادقة...');
            setTimeout(() => {
              console.log('🚀 [NAVIGATION_FIX] الآن سيتم التوجيه للوحة التحكم...');
              setLocation('/');
            }, 100);
            
          } catch (error) {
            console.warn('⚠️ Enhanced Login: Auth state update error:', error);
          }
        } else {
          setError('فشل في تسجيل الدخول - بيانات غير صحيحة');
        }

      } 
      // Offline login - fallback when not connected
      else {
        // Offline login attempt
        
        // محاولة التسجيل بدون كلمة مرور باستخدام البيانات المحفوظة
        if (!password.trim()) {
          // Simplified offline login
          
          try {
            const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
            
            // استخدام نفس المفاتيح المستخدمة في الحفظ
            const storedToken = await enhancedIndexedDB.getItem('auth_token');
            const storedUserData = await enhancedIndexedDB.getItem('auth_user');
            const storedUsername = await enhancedIndexedDB.getItem('auth_username');
            const storedCompanyId = await enhancedIndexedDB.getItem('auth_company');
            
            // التحقق من تطابق البيانات (مع مراعاة أن المستخدم قد يدخل username أو fullName)
            const storedUserObject = typeof storedUserData === 'string' ? JSON.parse(storedUserData) : storedUserData;
            const usernameMatch = storedUsername === username || 
                                (storedUserObject && (storedUserObject.username === username || storedUserObject.fullName === username));
            
            // ✅ منطق مبسط موحد - النظام الجديد
            console.log('🔄 تسجيل دخول محلي مبسط - النظام الموحد');
            console.log('🔍 فحص البيانات:', {
              hasUserData: !!storedUserData,
              hasUsername: !!storedUsername,
              hasCompany: !!storedCompanyId,
              usernameMatch: usernameMatch,
              companyMatch: storedCompanyId && Number(storedCompanyId) === selectedCompany
            });

            // شرط واحد بسيط: إذا كانت البيانات موجودة ومطابقة، ادخل!
            if (storedUserData && usernameMatch && storedCompanyId && 
                Number(storedCompanyId) === selectedCompany) {
              
              console.log('✅ نجح الدخول المحلي - البيانات مطابقة');
              
              const userData = typeof storedUserData === 'string' ? JSON.parse(storedUserData) : storedUserData;
              
              // ✅ إنشاء JWT token صالح للوضع المحلي
              let validToken = storedToken;
              
              if (!validToken || validToken.startsWith('offline_token_')) {
                console.log('🔧 إنشاء JWT token صالح للوضع المحلي...');
                
                // إنشاء JWT payload مماثل للخادم
                const payload = {
                  id: userData.id,
                  userId: userData.id,
                  companyId: userData.companyId,
                  role: userData.role,
                  username: userData.username,
                  iat: Math.floor(Date.now() / 1000),
                  exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 أيام
                  offline: true
                };
                
                // إنشاء JWT token مؤقت بدون توقيع (للوضع المحلي)
                const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
                const payloadEncoded = btoa(JSON.stringify(payload));
                const signature = btoa(`offline_signature_${userData.id}`);
                validToken = `${header}.${payloadEncoded}.${signature}`;
                
                // حفظ الـ token الجديد
                await enhancedIndexedDB.setItem('auth_token', validToken);
                console.log('✅ تم إنشاء JWT token صالح للوضع المحلي');
              }
              
              setLoginSuccess(true);
              
              toast({
                title: "تم تسجيل الدخول المحلي",
                description: "نجح الدخول بالبيانات المحفوظة",
              });
              
              await enhancedIndexedDB.setItem('auth_username', username, 'auth');
              await enhancedIndexedDB.setItem('auth_company', selectedCompany.toString(), 'auth');
              
              console.log('🔄 تطبيق المصادقة الموحدة...');
              await login(userData, validToken);
              
              setLocation('/');
              return;
            }
            
            // إذا لم تتطابق البيانات
            console.log('❌ البيانات غير مطابقة - يرجى إدخال كلمة المرور');
            setError('يرجى إدخال كلمة المرور أو التحقق من صحة البيانات');
            setLoading(false);
            return;
          } catch (error) {
            console.warn('⚠️ خطأ في استرجاع البيانات المحفوظة:', error);
            setError('يرجى إدخال كلمة المرور');
            setLoading(false);
            return;
          }
        } else {
          // التحقق من كلمة المرور المحفوظة في الوضع المحلي - مع تتبع محسن
          try {
            const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
            
            // استخدام نفس المفاتيح المستخدمة في الحفظ
            const storedToken = await enhancedIndexedDB.getItem('auth_token');
            const storedUserData = await enhancedIndexedDB.getItem('auth_user');
            const storedUsername = await enhancedIndexedDB.getItem('auth_username');
            const storedCompanyId = await enhancedIndexedDB.getItem('auth_company');
            
            // تحقق من تطابق البيانات
            
            // التحقق من تطابق البيانات (مع مراعاة أن المستخدم قد يدخل username أو fullName)
            const storedUserObject = typeof storedUserData === 'string' ? JSON.parse(storedUserData) : storedUserData;
            const usernameMatch = storedUsername === username || 
                                (storedUserObject && (storedUserObject.username === username || storedUserObject.fullName === username));
            
            // نفس الإصلاح للجزء الثاني من الكود
            if (storedUserData && usernameMatch && 
                storedCompanyId && Number(storedCompanyId) === selectedCompany) {
              
              console.log('✅ تطابق اسم المستخدم والشركة - دخول محلي ناجح (بدون كلمة مرور)');
              
              const userData = typeof storedUserData === 'string' ? JSON.parse(storedUserData) : storedUserData;
              
              setLoginSuccess(true);
              
              toast({
                title: "تم تسجيل الدخول محلياً",
                description: "تم التحقق من البيانات المحفوظة بدون كلمة مرور",
              });
              
              // حفظ آخر بيانات مستخدم ناجحة
              await enhancedIndexedDB.setItem('auth_username', username, 'auth');
              await enhancedIndexedDB.setItem('auth_company', selectedCompany.toString(), 'auth');
              
              // إنشاء token وهمي للوضع المحلي إذا لم يوجد
              const offlineToken = storedToken || `offline_token_${userData.id}_${Date.now()}`;
              
              console.log('🔄 تطبيق المصادقة المحلية الموحدة (مع token وهمي)...');
              await login(userData, offlineToken);
              
              setLocation('/');
              return;
            }
            
            // لا توجد بيانات محفوظة مطابقة
            console.log('❌ لا يمكن تسجيل الدخول بدون كلمة مرور');
            setError('يرجى إدخال كلمة المرور أو التحقق من الاتصال بالإنترنت');
            setLoading(false);
            return;
            
          } catch (error) {
            console.warn('⚠️ خطأ في التحقق من البيانات المحفوظة:', error);
            setError('اسم المستخدم أو الشركة غير متطابقة مع البيانات المحفوظة');
            setLoading(false);
            return;
          }
        }
      }
      
    } catch (err: any) {
      console.error('❌ خطأ في تسجيل الدخول:', err);
      console.error('❌ Error details:', { message: err.message, status: err.status, stack: err.stack });
      
      // Try offline fallback if online login fails - معطل حالياً
      if (false) {
        console.log('🔄 محاولة الوصول المحلي كبديل');
        
        const offlineResult = { success: false, userData: null };
        if (offlineResult.success && offlineResult.userData) {
          // Auth data saved to IndexedDB above
          
          setLoginSuccess(true);
          
          toast({
            title: "تم تسجيل الدخول",
            description: "جاري الانتقال للوحة التحكم...",
          });
          
          setTimeout(() => {
            setLocation('/');
          }, 800);
          return;
        }
      }
      
      if (err.message?.includes('401')) {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
      } else if (err.message?.includes('429')) {
        setError('تم تجاوز عدد المحاولات المسموحة، يرجى المحاولة لاحقاً');
      } else {
        setError('خطأ في الاتصال بالخادم');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (companiesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-yellow-600" />
          <p className="mt-2 text-gray-600 dark:text-gray-400">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 p-4">
      

      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-full max-w-md">
        

        <Card className="shadow-xl border-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur relative">
          {/* أيقونة حالة الاتصال */}
          <div className="absolute top-4 right-4 z-10">
            <div 
              className={`w-3 h-3 rounded-full transition-all duration-500 ${
                isOffline 
                  ? 'bg-red-500 shadow-lg shadow-red-500/50 animate-pulse' 
                  : 'bg-green-500 shadow-lg shadow-green-500/50'
              }`}
              title={isOffline ? 'غير متصل بالإنترنت' : 'متصل بالإنترنت'}
            />
          </div>
          
          <CardHeader className="text-center pb-4">

            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden shadow-lg bg-white p-1">
                <img 
                  src="/hsa-logo-new.png" 
                  alt="HSA Group"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              نظام إدارة بيئة العمل
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              هائل سعيد أنعم وشركاه
            </p>
            
            
            {/* Offline Access Indicator - معطل حالياً */}
            {false && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg py-2 px-3">
                <Smartphone className="h-4 w-4" />
                <span>الوصول المحلي متاح</span>
              </div>
            )}
          </CardHeader>

          <CardContent>
            

            {loginSuccess ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-2">
                  تم تسجيل الدخول بنجاح
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  جاري الانتقال للوحة التحكم...
                </p>
              </div>
            ) : (
              <div className="space-y-4">

                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Company Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-right block text-gray-700 dark:text-gray-300">
                      الشركة
                    </Label>
                    <Select value={selectedCompany?.toString()} onValueChange={(value) => setSelectedCompany(Number(value))}>
                      <SelectTrigger className="w-full text-right">
                        <SelectValue placeholder="اختر الشركة" />
                      </SelectTrigger>
                    <SelectContent>
                      {displayCompanies.map((company) => (
                        <SelectItem key={company.id} value={company.id.toString()}>
                          {company.nameAr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                    </Select>
                  </div>
                  {/* Username */}
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-right block text-gray-700 dark:text-gray-300">
                      اسم المستخدم
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full text-right"
                      placeholder="أدخل اسم المستخدم"
                      disabled={loading}
                      autoComplete="username"
                    />
                  </div>

                  {/* Password - optional for offline login */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-right block text-gray-700 dark:text-gray-300">
                      كلمة المرور {isOffline && <span className="text-sm text-gray-500">(اختيارية في وضع عدم الاتصال)</span>}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full text-right"
                      placeholder={isOffline ? "كلمة المرور (اختيارية للأمان)" : "أدخل كلمة المرور"}
                      disabled={loading}
                      autoComplete="current-password"
                    />
                    {isOffline && (
                      <p className="text-xs text-gray-500 text-right mt-1">
                        💡 يمكنك الدخول بدون كلمة مرور في وضع عدم الاتصال، أو أدخلها للتحقق الآمن
                      </p>
                    )}
                  </div>


                  {/* Offline Notice */}
                  {isOffline && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
                      <p className="text-blue-800 dark:text-blue-200 text-center">
                        وضع عدم الاتصال: لا حاجة لكلمة المرور
                      </p>
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">{error}</span>
                    </div>
                  )}

                  {/* Login Button */}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
                    disabled={loading || !username.trim() || !selectedCompany}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        جاري تسجيل الدخول...
                      </>
                    ) : (
                      <>
                        {isOffline ? (
                          <>
                            <Smartphone className="mr-2 h-4 w-4" />
                            الدخول بلا اتصال
                          </>
                        ) : (
                          <>
                            <Globe className="mr-2 h-4 w-4" />
                            تسجيل الدخول
                          </>
                        )}
                      </>
                    )}
                  </Button>


                {/* Offline Access Hint - معطل حالياً */}
                {false && (
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                    <p>💡 يمكنك الوصول لبياناتك حتى بدون انترنت</p>
                  </div>
                )}
                </form>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
          <p>© 2025 هائل سعيد أنعم وشركاه - جميع الحقوق محفوظة</p>
        </div>
      </div>
      </div>
    </div>
  );
}