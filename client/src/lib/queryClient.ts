import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Enhanced offline operations for unified systems
async function saveOfflineChecklist(data: any): Promise<any> {
  console.log('💾 حفظ التقييم محلياً في IndexedDB:', data);
  
  try {
    const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
    
    // إنشاء بيانات التقييم مع علامات العمل المحلي
    const offlineData = {
      ...data,
      savedAt: new Date().toISOString(),
      isOffline: true,
      finalScore: data.finalScore || 0,
      needsSync: true,
      offlineId: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    // حفظ باستخدام نظام IndexedDB المناسب للتقييمات
    await enhancedIndexedDB.setItem(`offline_checklist_${offlineData.offlineId}`, offlineData, 'data');
    
    console.log('✅ تم حفظ التقييم محلياً بنجاح في IndexedDB');
    
    return {
      success: true,
      offline: true,
      message: 'تم حفظ التقييم محلياً وسيتم إرساله عند الاتصال بالإنترنت',
      savedAt: offlineData.savedAt,
      offlineId: offlineData.offlineId
    };
  } catch (error) {
    console.error('❌ فشل في حفظ التقييم محلياً:', error);
    throw new Error('فشل في حفظ التقييم محلياً');
  }
}

async function getOfflineTemplates(url: string): Promise<any[]> {
  console.log('📋 استرجاع القوالب المحفوظة محلياً من:', url);
  
  try {
    const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
    
    // استخراج locationId من URL مع معالجة محسنة للأخطاء
    let locationId = null;
    try {
      const locationMatch = url.match(/\/api\/user\/location\/(\d+)\/templates/);
      locationId = locationMatch ? locationMatch[1] : null;
      
      if (!locationId) {
        console.warn('⚠️ لا يمكن استخراج معرف الموقع من URL:', url);
        return [];
      }
    } catch (urlError) {
      console.warn('⚠️ خطأ في تحليل URL:', urlError);
      return [];
    }
    
    // استرجاع القوالب مع حماية من الأخطاء
    let templates = null;
    try {
      const templatesKey = `templates_${locationId}`;
      templates = await enhancedIndexedDB.getItem(templatesKey);
    } catch (templateError) {
      console.warn(`⚠️ فشل في قراءة قوالب الموقع ${locationId}:`, templateError);
      return [];
    }
    
    if (templates && Array.isArray(templates) && templates.length > 0) {
      console.log(`✅ تم استرجاع ${templates.length} قالب محفوظ للموقع ${locationId}`);
      return templates;
    }
    
    console.log(`📱 لا توجد قوالب محفوظة محلياً للموقع ${locationId} - هذا طبيعي عند أول استخدام`);
    return [];
  } catch (error) {
    console.warn('⚠️ خطأ في استرجاع القوالب المحفوظة محلياً:', error);
    return [];
  }
}

// Enhanced sequential system for saving locations with their templates
async function saveLocationsWithTemplates(locations: any[], userId?: number, companyId?: number): Promise<void> {
  
  try {
    const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
    
    // Check for user change and clear old data if needed
    await clearDataIfUserChanged(userId, companyId);
    
    // Only proceed with active saving if we're online
    if (!navigator.onLine) {
      console.log('📱 وضع عدم الاتصال - تخطي عملية الحفظ النشط');
      return;
    }
    
    console.log('🏢 بدء النظام المطور: حفظ المواقع مع قوالبها بالتسلسل (متصل)');
    
    // Create comprehensive data structure for overall metadata
    const locationsData = {
      locations: locations,
      timestamp: Date.now(),
      userId: userId,
      companyId: companyId,
      version: '2.0',
      savedAt: new Date().toISOString(),
      processedSequentially: true
    };
    
    // Save overall locations metadata
    await enhancedIndexedDB.setItem('offline_locations_with_templates', locationsData, 'data');
    console.log(`📋 بدء المعالجة التتابعية لـ ${locations.length} موقع (متصل)...`);
    
    // Process each location sequentially: location -> templates -> next location
    for (let i = 0; i < locations.length; i++) {
      const location = locations[i];
      
      try {
        console.log(`📍 معالجة الموقع ${i + 1}/${locations.length}: ${location.nameAr || location.name || 'موقع غير محدد'}`);
        
        // Step 1: Save individual location data
        await enhancedIndexedDB.setItem(`location_${location.id}`, location, 'data');
        
        // Step 2: Fetch and save templates for this location (already verified online above)
        if (location.id) {
          try {
            const token = await enhancedIndexedDB.getAuthData('auth_token') || 
                         await enhancedIndexedDB.getAuthData('token');
            
            if (token) {
              const response = await fetch(`/api/locations/${location.id}/templates`, {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (response.ok) {
                const templates = await response.json();
                if (templates && Array.isArray(templates)) {
                  await enhancedIndexedDB.setItem(`templates_${location.id}`, templates, 'data');
                  console.log(`  ✅ حفظ ${templates.length} قالب للموقع ${location.nameAr}`);
                } else {
                  console.log(`  📝 لا توجد قوالب للموقع ${location.nameAr}`);
                }
              } else {
                console.warn(`  ⚠️ فشل جلب قوالب الموقع ${location.id}: ${response.status}`);
              }
            }
          } catch (templateError) {
            console.warn(`  ⚠️ خطأ في جلب قوالب الموقع ${location.id}:`, templateError);
          }
        } else {
          console.log(`  📝 الموقع ${location.nameAr} بدون معرف - تخطي القوالب`);
        }
        
        console.log(`  ✅ اكتمل معالجة الموقع ${location.nameAr}`);
        
      } catch (locationError) {
        console.error(`❌ فشل في معالجة الموقع ${location.id}:`, locationError);
      }
    }
    
    // Save to legacy keys for backward compatibility
    await enhancedIndexedDB.setItem('cached_locations', locations, 'data');
    await enhancedIndexedDB.setItem('dashboard_locations', locations, 'data');
    
    console.log(`🎉 اكتمل النظام المطور بنجاح (متصل): ${locations.length} موقع مع قوالبهم`);
    
  } catch (error) {
    console.error('❌ فشل في النظام المطور للحفظ:', error);
  }
}

// Clear data if user has changed
async function clearDataIfUserChanged(currentUserId?: number, currentCompanyId?: number): Promise<void> {
  try {
    const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
    
    // Get previous user data
    const previousData = await enhancedIndexedDB.getItem('offline_locations_with_templates');
    
    if (previousData && (previousData.userId || previousData.companyId)) {
      // Check if user or company has changed
      const userChanged = currentUserId && previousData.userId && currentUserId !== previousData.userId;
      const companyChanged = currentCompanyId && previousData.companyId && currentCompanyId !== previousData.companyId;
      
      if (userChanged || companyChanged) {
        console.log('🧹 تم اكتشاف تغيير المستخدم/الشركة - مسح البيانات السابقة...');
        
        // Clear all location-related data
        const keysToCheck = [
          'offline_locations_with_templates',
          'cached_locations', 
          'dashboard_locations'
        ];
        
        // Clear main keys
        for (const key of keysToCheck) {
          await enhancedIndexedDB.removeItem(key);
        }
        
        // Clear individual location and template data
        if (previousData.locations && Array.isArray(previousData.locations)) {
          for (const location of previousData.locations) {
            if (location.id) {
              await enhancedIndexedDB.removeItem(`location_${location.id}`);
              await enhancedIndexedDB.removeItem(`templates_${location.id}`);
            }
          }
        }
        
        console.log('✅ تم مسح بيانات المستخدم السابق بنجاح');
      }
    }
  } catch (error) {
    console.warn('⚠️ فشل في فحص/مسح بيانات المستخدم السابق:', error);
  }
}

async function getOfflineLocations(): Promise<any[]> {
  console.log('📍 استرجاع المواقع المحفوظة محلياً مع التحقق من المستخدم');
  
  try {
    const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
    
    // Get current user data for validation with robust error handling
    let currentUserData = null;
    let currentUserId = null;
    let currentCompanyId = null;
    
    try {
      currentUserData = await enhancedIndexedDB.getItem('auth_user');
      currentUserId = currentUserData?.id;
      currentCompanyId = currentUserData?.companyId;
    } catch (userError) {
      console.warn('⚠️ تعذر الوصول لبيانات المستخدم، متابعة بدون تحقق:', userError);
    }
    
    // Try enhanced data structure first with enhanced error protection
    let enhancedData = null;
    try {
      enhancedData = await enhancedIndexedDB.getItem('offline_locations_with_templates');
    } catch (enhancedError) {
      console.warn('⚠️ فشل في قراءة البيانات المحسنة:', enhancedError);
    }
    
    if (enhancedData && 
        typeof enhancedData === 'object' && 
        enhancedData.locations && 
        Array.isArray(enhancedData.locations) && 
        enhancedData.locations.length > 0) {
      
      // Validate user/company match
      if (currentUserId && enhancedData.userId && currentUserId !== enhancedData.userId) {
        console.log('🚫 تم اكتشاف تغيير المستخدم - مسح البيانات المحفوظة');
        await clearDataIfUserChanged(currentUserId, currentCompanyId);
        return [];
      }
      
      if (currentCompanyId && enhancedData.companyId && currentCompanyId !== enhancedData.companyId) {
        console.log('🚫 تم اكتشاف تغيير الشركة - مسح البيانات المحفوظة');
        await clearDataIfUserChanged(currentUserId, currentCompanyId);
        return [];
      }
      
      console.log(`✅ استرجاع محسن متحقق: ${enhancedData.locations.length} موقع للمستخدم ${currentUserId}`);
      return enhancedData.locations;
    }
    
    // Fallback to legacy cached_locations (with error protection)
    try {
      const locations = await enhancedIndexedDB.getItem('cached_locations');
      if (locations && Array.isArray(locations) && locations.length > 0) {
        console.log(`✅ استرجاع تقليدي: ${locations.length} موقع`);
        return locations;
      }
    } catch (legacyError) {
      console.warn('⚠️ فشل في قراءة البيانات التقليدية:', legacyError);
    }
    
    // Final fallback to dashboard_locations with error protection
    try {
      const dashboardLocations = await enhancedIndexedDB.getItem('dashboard_locations');
      if (dashboardLocations && Array.isArray(dashboardLocations) && dashboardLocations.length > 0) {
        console.log(`✅ استرجاع من لوحة التحكم: ${dashboardLocations.length} موقع`);
        return dashboardLocations;
      }
    } catch (dashboardError) {
      console.warn('⚠️ فشل في قراءة بيانات لوحة التحكم:', dashboardError);
    }
    
    console.log('📱 لا توجد مواقع محفوظة محلياً - هذا طبيعي عند أول تشغيل أو في بيئة جديدة');
    return [];
  } catch (error) {
    console.warn('⚠️ خطأ في استرجاع المواقع المحفوظة محلياً:', error);
    return [];
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  method: string,
  data?: unknown | undefined,
): Promise<any> {
  // Check if offline - but allow some offline operations
  if (!navigator.onLine) {
    console.log('📱 Device is offline, handling offline operations');
    
    // For checklist save requests, store locally
    if (method === 'POST' && url === '/api/checklists') {
      return await saveOfflineChecklist(data);
    }
    
    // For other requests in offline mode, allow graceful handling
    console.log('📱 Offline request attempted for:', url);
    
    // Instead of throwing immediately, try IndexedDB for some operations
    if (method === 'GET' && url.includes('/api/user/location/') && url.includes('/templates')) {
      return await getOfflineTemplates(url);
    }
    
    if (method === 'GET' && url.includes('/api/locations')) {
      return await getOfflineLocations();
    }
    
    throw new Error('OFFLINE_MODE');
  }

  // 🔄 البحث عن الـ token في IndexedDB مع تحسين الأخطاء
  let token: string | null = null;
  
  // البحث في IndexedDB مع معالجة محسنة للأخطاء
  try {
    const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
    // تأكد من تهيئة النظام أولاً
    await enhancedIndexedDB.init();
    // ✅ إصلاح: استخدام getItem مباشرة بدلاً من getAuthData لتجنب إضافة auth_ مرتين
    token = await enhancedIndexedDB.getItem('auth_token') || 
            await enhancedIndexedDB.getItem('token');
    
    if (token && process.env.NODE_ENV === 'development') {
      console.log('✅ Token retrieved successfully from IndexedDB');
    }
  } catch (error) {
    console.warn('⚠️ فشل في استرجاع الـ token من IndexedDB:', error);
    // لا نفعل شيء آخر - نحتاج IndexedDB فقط
  }
  
  // تحقق من وجود Token للطلبات المحمية
  if (!token && url !== '/api/auth/login' && url !== '/api/companies/public') {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ لم يتم العثور على رمز التصريح - قد تحتاج إعادة تسجيل دخول');
    }
    // لا نرمي خطأ هنا - دع الخادم يتعامل مع الطلب
  }
  
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Security: Only log in development, no sensitive data
  if (process.env.NODE_ENV === 'development') {
    console.log(`🌐 API Request: ${method} ${url}`);
    console.log(`🔑 Token present: ${!!token}`);
    // Never log actual token content
    console.log(`📦 Request data keys:`, data ? Object.keys(data) : 'none');
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: AbortSignal.timeout(30000), // 30 second timeout - محسن للتقارير
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`📡 Response status: ${res.status} ${res.statusText}`);
    }

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ API Error: ${res.status} - ${errorText}`);
      
      // Handle 401 with controlled cleanup for expired tokens
      if (res.status === 401) {
        console.log('🧹 401 Unauthorized received - cleaning expired session');
        
        // تنظيف أكثر ذكاءً - فقط بيانات المصادقة
        try {
          const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
          await enhancedIndexedDB.removeAuthData('auth_token');
          await enhancedIndexedDB.removeAuthData('user_data');
          console.log('🗑️ تم مسح بيانات المصادقة المنتهية الصلاحية');
        } catch (error) {
          console.error('❌ فشل في تنظيف IndexedDB:', error);
        }
        
        // إعادة توجيه مضبوطة مع حماية من التكرار
        if (url !== '/api/auth/login' && !window.location.pathname.includes('/login')) {
          // منع التوجيهات المتعددة
          if (!(window as any).loginRedirectInProgress) {
            (window as any).loginRedirectInProgress = true;
            setTimeout(() => {
              window.location.href = '/login';
            }, 1000);
          }
        }
        
        throw new Error(`انتهت صلاحية الجلسة`);
      } else if (res.status === 403) {
        throw new Error(`غير مسموح: ${errorText || 'ليس لديك صلاحية'}`);
      } else if (res.status >= 400 && res.status < 500) {
        throw new Error(`خطأ في البيانات: ${errorText || 'البيانات المرسلة غير صحيحة'}`);
      } else if (res.status >= 500) {
        throw new Error(`خطأ في الخادم: ${errorText || 'حدث خطأ داخلي'}`);
      } else {
        throw new Error(`خطأ غير متوقع: ${errorText || res.statusText}`);
      }
    }

    const result = await res.json();
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Success - Response type:`, typeof result);
      // Never log actual response data for security
    }
    
    // Auto-save locations using enhanced sequential system (only when online)
    if (method === 'GET' && result && Array.isArray(result) && navigator.onLine) {
      try {
        if (url.includes('/dashboard') || url.includes('/locations')) {
          const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
          const userData = await enhancedIndexedDB.getItem('auth_user');
          const userId = userData?.id;
          const companyId = userData?.companyId;
          
          console.log('🎯 تشغيل النظام المطور للحفظ التتابعي (متصل)...');
          await saveLocationsWithTemplates(result, userId, companyId);
        }
        
        // NOTE: Individual template auto-save removed - now handled by sequential system
        
      } catch (saveError) {
        console.warn('⚠️ فشل في النظام المطور للحفظ:', saveError);
      }
    }
    
    return result;
  } catch (error: any) {
    // Handle network errors (offline/connection issues)
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      console.log('📶 Network error - activating offline fallback:', error.message);
      
      // For checklist save requests, let the new system handle it
      if (method === 'POST' && url === '/api/checklists') {
        throw new Error('Device offline - use new offline storage system');
      }
      
      // For dashboard settings, fail silently to allow IndexedDB fallback
      if (url.includes('/api/my/dashboard-settings')) {
        throw new Error('NETWORK_ERROR_SILENT_FALLBACK');
      }
      
      // For permissions sync, fail silently
      if (url.includes('/api/auth/refresh-permissions')) {
        throw new Error('PERMISSIONS_SYNC_OFFLINE');
      }
      
      throw new Error('العمل بالوضع المحلي - سيتم تحديث البيانات عند عودة الاتصال');
    }
    
    // Handle timeout errors
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      console.error('⏱️ Request timeout:', error);
      throw new Error('انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى');
    }
    
    console.error('❌ API Request failed:', error);
    throw error;
  }
}


type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Check if offline
    if (!navigator.onLine) {
      console.log('📱 Device offline, cannot fetch:', queryKey.join("/"));
      throw new Error('لا يوجد اتصال بالإنترنت');
    }

    // استخدام نفس منطق apiRequest لاسترجاع الـ token
    let token: string | null = null;
    
    // البحث في IndexedDB فقط - نظام موحد
    try {
      const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
      token = await enhancedIndexedDB.getAuthData('auth_token') || 
              await enhancedIndexedDB.getAuthData('token');
    } catch (error) {
      // لا يوجد fallback - IndexedDB فقط
      console.warn('⚠️ فشل في جلب token من IndexedDB:', error);
      token = null;
    }
    
    try {
      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        signal: AbortSignal.timeout(10000), // 10 second timeout for queries
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error: any) {
      // Handle network errors gracefully - secure logging
      if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔌 Network error in query:', queryKey.join("/"));
        }
        throw new Error('لا يوجد اتصال بالإنترنت');
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0,
      // منع أخطاء الشبكة والمصادقة من الوصول لـ Error Boundary
      throwOnError: (error) => {
        // لا ترمي أخطاء الشبكة أو المصادقة لـ Error Boundary
        if (error.message.includes('لا يوجد اتصال') ||
            error.message.includes('خطأ في الاتصال') ||
            error.message.includes('NETWORK_ERROR') ||
            error.message.includes('Failed to fetch') ||
            error.message.includes('401:') ||
            error.message.includes('انتهت صلاحية الجلسة') ||
            error.name === 'TypeError') {
          return false;
        }
        // ارمي باقي الأخطاء للـ Error Boundary
        return true;
      },
      enabled: () => {
        // 🔐 منع الفحص الدوري عندما لا يكون المستخدم مسجل الدخول
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          // إذا كنا في صفحة تسجيل الدخول، لا نفحص المصادقة
          if (currentPath === '/login') {
            return false;
          }
        }
        return true;
      },
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (error.message.includes('غير مسموح') || error.message.includes('401:')) {
          return false;
        }
        // Don't retry on offline errors
        if (error.message.includes('لا يوجد اتصال') || 
            error.message.includes('OFFLINE_MODE') ||
            error.message.includes('ERR_INTERNET_DISCONNECTED') ||
            !navigator.onLine) {
          return false;
        }
        // Retry network/connection errors up to 2 times
        if (error.message.includes('خطأ في الاتصال') || error.name === 'TypeError') {
          return failureCount < 2;
        }
        // Default retry once for other errors
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => {
        // تأخير متزايد مع حد أقصى 30 ثانية
        const delay = Math.min(1000 * 2 ** attemptIndex, 30000);
        console.log(`⏱️ إعادة محاولة بعد ${delay}ms...`);
        return delay;
      },
    },
    mutations: {
      // منع أخطاء الشبكة من الوصول لـ Error Boundary في المتحولات أيضاً
      throwOnError: (error) => {
        // لا ترمي أخطاء الشبكة لـ Error Boundary
        if (error.message.includes('لا يوجد اتصال') ||
            error.message.includes('خطأ في الاتصال') ||
            error.message.includes('NETWORK_ERROR') ||
            error.message.includes('Failed to fetch') ||
            error.message.includes('Device offline') ||
            error.name === 'TypeError') {
          return false;
        }
        return true;
      },
      retry: (failureCount, error) => {
        // Retry network errors for mutations
        if (error.message.includes('خطأ في الاتصال') || error.name === 'TypeError') {
          return failureCount < 1;
        }
        return false;
      },
      retryDelay: 2000,
    },
  },
});

// Export enhanced functions for external use
export { saveLocationsWithTemplates, getOfflineLocations, getOfflineTemplates };

// Enhanced location management functions compatible with sequential system
export async function getLocationWithTemplates(locationId: number): Promise<any> {
  console.log(`🏢 استرجاع الموقع مع قوالبه بالنظام المطور: ${locationId}`);
  
  try {
    const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
    
    // Method 1: Try individual location data (from sequential system)
    let location = await enhancedIndexedDB.getItem(`location_${locationId}`);
    
    // Method 2: Fallback to searching in all locations array
    if (!location) {
      const locations = await getOfflineLocations();
      location = locations.find((loc: any) => loc.id === locationId);
    }
    
    // Get templates for this location (both methods use same template key)
    const templates = await enhancedIndexedDB.getItem(`templates_${locationId}`);
    
    if (location) {
      const result = {
        location,
        templates: templates && Array.isArray(templates) ? templates : [],
        hasOfflineData: true,
        source: location.id ? 'individual' : 'array', // For debugging
        templateCount: templates ? templates.length : 0
      };
      
      console.log(`✅ موقع مسترجع: ${location.nameAr || location.name}, القوالب: ${result.templateCount}`);
      return result;
    }
    
    console.log(`⚠️ الموقع ${locationId} غير موجود في البيانات المحفوظة`);
    return null;
  } catch (error) {
    console.error('❌ فشل في استرجاع الموقع مع قوالبه:', error);
    return null;
  }
}

// Get templates for a specific location (enhanced with user validation and error protection)
export async function getOfflineLocationTemplates(locationId: number): Promise<any[]> {
  console.log(`📋 استرجاع قوالب الموقع: ${locationId}`);
  
  try {
    const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
    
    // Validate user access first with error protection
    let currentUserData = null;
    try {
      currentUserData = await enhancedIndexedDB.getItem('auth_user');
    } catch (userError) {
      console.warn('⚠️ تعذر الوصول لبيانات المستخدم، متابعة بدون تحقق:', userError);
    }
    
    if (!currentUserData) {
      console.log('📱 لا توجد بيانات مستخدم محفوظة - هذا طبيعي في بيئة جديدة');
    }
    
    // Get templates with error protection
    let templates = null;
    try {
      templates = await enhancedIndexedDB.getItem(`templates_${locationId}`);
    } catch (templateError) {
      console.warn(`⚠️ فشل في قراءة قوالب الموقع ${locationId}:`, templateError);
      return [];
    }
    
    if (templates && Array.isArray(templates) && templates.length > 0) {
      console.log(`✅ تم استرجاع ${templates.length} قالب للموقع ${locationId}`);
      return templates;
    }
    
    console.log(`📱 لا توجد قوالب محفوظة للموقع ${locationId} - هذا طبيعي عند أول استخدام`);
    return [];
    
  } catch (error) {
    console.warn(`⚠️ خطأ في استرجاع قوالب الموقع ${locationId}:`, error);
    return [];
  }
}
