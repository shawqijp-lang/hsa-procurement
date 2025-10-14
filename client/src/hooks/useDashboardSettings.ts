import { useState, useEffect } from 'react';

interface DashboardSection {
  id: string;
  nameAr: string;
  nameEn: string;
  enabled: boolean;
  color: string;
}

interface DashboardConfig {
  sections: DashboardSection[];
  lastUpdated: string;
}

export const useDashboardSettings = (userId?: number | null) => {
  const [dashboardSettings, setDashboardSettings] = useState<DashboardConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get user info to determine appropriate defaults - من IndexedDB فقط
  const getUserRole = async (): Promise<string> => {
    try {
      const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
      const storedUser = await enhancedIndexedDB.getAuthData('user_data') || 
                         await enhancedIndexedDB.getAuthData('user');
      if (storedUser) {
        const userData = typeof storedUser === 'string' ? JSON.parse(storedUser) : storedUser;
        console.log('🔍 [useDashboardSettings] استرجاع دور المستخدم من IndexedDB:', userData.role);
        return userData.role || 'user';
      }
    } catch (error) {
      console.warn('⚠️ [useDashboardSettings] فشل في استرجاع دور المستخدم من IndexedDB:', error);
    }

    console.warn('⚠️ [useDashboardSettings] لم يتم العثور على بيانات المستخدم في IndexedDB');
    return 'user';
  };
  
  // Role-based default sections
  const getDefaultSections = (userRole: string): DashboardSection[] => {
    // For regular users: simplified dashboard with only essential sections
    if (userRole === 'user') {
      return [
        { id: 'assessment', nameAr: 'التقييمات اليومية', nameEn: 'Daily Assessments', enabled: true, color: '#3b82f6' },
        { id: 'change-password', nameAr: 'تغيير كلمة المرور', nameEn: 'Change Password', enabled: true, color: '#10b981' }
      ];
    }
    
    // For admin/supervisor: full dashboard sections (existing behavior)
    return [
      { id: 'checklist-manager', nameAr: 'إدارة قوائم التشييك', nameEn: 'Checklist Management', enabled: false, color: '#7c3aed' },
      { id: 'reports', nameAr: 'التقارير', nameEn: 'Reports', enabled: false, color: '#3b82f6' },
      { id: 'users', nameAr: 'إدارة المستخدمين', nameEn: 'User Management', enabled: false, color: '#8b5cf6' },
      { id: 'settings', nameAr: 'الإعدادات', nameEn: 'Settings', enabled: true, color: '#10b981' },
      { id: 'sync', nameAr: 'المزامنة', nameEn: 'Sync', enabled: false, color: '#f59e0b' },
    ];
  };
  
  const loadDashboardSettings = async () => {
    if (!userId || userId === null) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔧 [useDashboardSettings] تحميل إعدادات لوحة التحكم للمستخدم:', userId);
      
      // Get user role first
      const userRole = await getUserRole();
      const defaultSections = getDefaultSections(userRole);
      
      // Start with role-appropriate defaults
      const roleBasedDefaultConfig = {
        sections: defaultSections,
        lastUpdated: new Date().toISOString()
      };

      // Try to load from API first (database)
      try {
        const response = await fetch('/api/my/dashboard-settings', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getAuthToken()}`
          }
        });

        if (response.ok) {
          const apiData = await response.json();
          if (apiData && apiData.dashboardConfig) {
            console.log('✅ [useDashboardSettings] تم تحميل الإعدادات من قاعدة البيانات');
            
            // Convert API format to our format if needed
            const apiSections = Array.isArray(apiData.dashboardConfig.sections) 
              ? apiData.dashboardConfig.sections 
              : defaultSections;

            const apiConfig = {
              sections: apiSections.map((section: any) => {
                if (typeof section === 'string') {
                  // Convert from string format to object format
                  const defaultSection = defaultSections.find(s => s.id === section);
                  return defaultSection || { 
                    id: section, 
                    nameAr: section, 
                    nameEn: section, 
                    enabled: true, 
                    color: '#3b82f6' 
                  };
                }
                return section;
              }),
              lastUpdated: apiData.updatedAt || new Date().toISOString()
            };

            setDashboardSettings(apiConfig);
            
            // Save to IndexedDB for offline access
            await saveDashboardSettingsToIndexedDB(apiConfig);
            setIsLoading(false);
            return;
          }
        }
      } catch (apiError: any) {
        // تحسين معالجة أخطاء الشبكة
        if (apiError?.name === 'TypeError' && apiError?.message?.includes('fetch')) {
          console.log('📶 [useDashboardSettings] مشكلة في الاتصال - التحويل للوضع المحلي');
        } else {
          console.warn('⚠️ [useDashboardSettings] خطأ API:', apiError?.message || 'Unknown error');
        }
      }

      // Fallback: Try IndexedDB
      try {
        const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
        const savedSettings = await enhancedIndexedDB.getAppState(`dashboard_settings_${userId}`);
        
        if (savedSettings) {
          console.log('📱 [useDashboardSettings] تم تحميل الإعدادات من IndexedDB');
          const offlineConfig = typeof savedSettings === 'string' ? JSON.parse(savedSettings) : savedSettings;
          setDashboardSettings(offlineConfig);
          setIsLoading(false);
          return;
        }
      } catch (indexedDBError) {
        console.warn('⚠️ [useDashboardSettings] فشل تحميل من IndexedDB:', indexedDBError);
      }

      // Final fallback: Use role-based defaults
      console.log('🔄 [useDashboardSettings] استخدام الإعدادات الافتراضية لدور:', userRole);
      setDashboardSettings(roleBasedDefaultConfig);
      
      // Save defaults to IndexedDB
      await saveDashboardSettingsToIndexedDB(roleBasedDefaultConfig);
      
    } catch (error) {
      console.error('❌ [useDashboardSettings] خطأ في تحميل إعدادات لوحة التحكم:', error);
      setError(error instanceof Error ? error.message : 'خطأ غير معروف');
    } finally {
      setIsLoading(false);
    }
  };

  // Save dashboard settings to IndexedDB only
  const saveDashboardSettingsToIndexedDB = async (config: DashboardConfig) => {
    if (!userId) return;

    try {
      const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
      await enhancedIndexedDB.saveAppState(`dashboard_settings_${userId}`, config);
      console.log('💾 [useDashboardSettings] تم حفظ الإعدادات في IndexedDB');
    } catch (error) {
      console.error('❌ [useDashboardSettings] فشل حفظ الإعدادات في IndexedDB:', error);
    }
  };

  // Get auth token from IndexedDB only
  const getAuthToken = async (): Promise<string> => {
    try {
      const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
      const token = await enhancedIndexedDB.getAuthData('auth_token') || 
                   await enhancedIndexedDB.getAuthData('token');
      return token as string || '';
    } catch (error) {
      console.warn('⚠️ [useDashboardSettings] فشل استرجاع الرمز المميز من IndexedDB:', error);
      return '';
    }
  };

  const updateDashboardSettings = async (newSettings: DashboardConfig) => {
    if (!userId) return;

    try {
      console.log('🔄 [useDashboardSettings] تحديث إعدادات لوحة التحكم');
      
      // Update local state immediately
      setDashboardSettings(newSettings);
      
      // Save to IndexedDB immediately
      await saveDashboardSettingsToIndexedDB(newSettings);
      
      // Try to sync with API in background
      try {
        const authToken = await getAuthToken();
        if (authToken) {
          const response = await fetch('/api/my/dashboard-settings', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
              dashboardConfig: newSettings
            })
          });

          if (response.ok) {
            console.log('✅ [useDashboardSettings] تم مزامنة الإعدادات مع الخادم');
          } else {
            console.warn('⚠️ [useDashboardSettings] فشل مزامنة الإعدادات مع الخادم');
          }
        }
      } catch (syncError) {
        console.warn('⚠️ [useDashboardSettings] فشل مزامنة الإعدادات:', syncError);
        // Continue - data is still saved locally in IndexedDB
      }
      
    } catch (error) {
      console.error('❌ [useDashboardSettings] فشل تحديث الإعدادات:', error);
      setError(error instanceof Error ? error.message : 'فشل في تحديث الإعدادات');
    }
  };

  const resetToDefaults = async () => {
    if (!userId) return;

    try {
      console.log('🔄 [useDashboardSettings] إعادة تعيين إلى الافتراضي');
      
      const userRole = await getUserRole();
      const defaultSections = getDefaultSections(userRole);
      
      const defaultConfig = {
        sections: defaultSections,
        lastUpdated: new Date().toISOString()
      };

      await updateDashboardSettings(defaultConfig);
      
    } catch (error) {
      console.error('❌ [useDashboardSettings] فشل إعادة التعيين:', error);
      setError(error instanceof Error ? error.message : 'فشل في إعادة التعيين');
    }
  };

  // Load settings when component mounts or userId changes
  useEffect(() => {
    loadDashboardSettings();
  }, [userId]);

  return {
    dashboardSettings,
    isLoading,
    error,
    updateDashboardSettings,
    resetToDefaults,
    refetch: loadDashboardSettings
  };
};