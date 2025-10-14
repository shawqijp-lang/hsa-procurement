import { useState, useEffect } from 'react';
import { useLocation, Redirect } from 'wouter';
import { useDashboardSettings } from '@/hooks/useDashboardSettings';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredSection?: string;
  adminOnly?: boolean;
  supervisorAccess?: boolean;
  allowDataSpecialist?: boolean;
  allowAffairsManager?: boolean;
  excludeRoles?: string[];
}

export default function ProtectedRoute({ 
  children, 
  requiredSection, 
  adminOnly = false, 
  supervisorAccess = false,
  allowDataSpecialist = false,
  allowAffairsManager = false,
  excludeRoles = [] 
}: ProtectedRouteProps) {
  const [user, setUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [location] = useLocation();
  
  // 🔧 استدعاء useDashboardSettings فقط بعد التأكد من وجود المستخدم
  // لتجنب خطأ React Hooks
  const { dashboardSettings, isLoading: settingsLoading } = useDashboardSettings(
    user?.id || null
  );
  
  // Helper function to check if section is enabled
  const isSectionEnabled = (section: string) => {
    return dashboardSettings?.sections?.some(s => s.id === section && s.enabled) ?? true;
  };

  // Load user info with offline support
  useEffect(() => {
    const initializeAuth = async () => {
      // 🔄 البحث عن البيانات في IndexedDB أولاً، ثم localStorage كاحتياط
      let token: string | null = null;
      let storedUser: string | null = null;
      
      try {
        const { enhancedIndexedDB } = await import("@/lib/enhancedIndexedDB");
        token = await enhancedIndexedDB.getAuthData('auth_token') || 
                await enhancedIndexedDB.getAuthData('token');
        storedUser = await enhancedIndexedDB.getAuthData('user_data') || 
                     await enhancedIndexedDB.getAuthData('user');
        
        if (storedUser && typeof storedUser !== 'string') {
          storedUser = JSON.stringify(storedUser);
        }
        
        console.log('🔓 ProtectedRoute: Retrieved from IndexedDB - Token:', !!token, 'User:', !!storedUser);
      } catch (error) {
        console.warn('⚠️ ProtectedRoute: Failed to get data from IndexedDB:', error);
      }
      
      // إذا لم نجد token في IndexedDB، لا يوجد مصدر آخر
      if (!token) {
        console.log('⚠️ ProtectedRoute: لم يتم العثور على token في IndexedDB');
      }
      
      // إذا لم نجد user data في IndexedDB، لا يوجد مصدر آخر
      if (!storedUser) {
        console.log('⚠️ ProtectedRoute: لم يتم العثور على بيانات المستخدم في IndexedDB');
      }
      
      return { token, storedUser };
    };

    initializeAuth().then(({ token, storedUser }) => {
      
      // Always try to use stored user first (offline priority)
      if (token && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsLoadingUser(false);
          return;
        } catch (error) {
          console.error('Failed to parse stored user data:', error);
        }
      }
      
      // If online and have token, try to verify
      if (token && navigator.onLine) {
        fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          signal: AbortSignal.timeout(3000) // Short timeout
        })
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(async (userData) => {
          // Store user data for offline use - IndexedDB فقط
          try {
            const { enhancedIndexedDB } = await import("@/lib/enhancedIndexedDB");
            await enhancedIndexedDB.saveAuthData('user_data', userData);
            console.log('✅ ProtectedRoute: Saved user data to IndexedDB');
          } catch (error) {
            console.error('❌ ProtectedRoute: Failed to save to IndexedDB:', error);
            throw new Error('فشل في حفظ بيانات المستخدم في قاعدة البيانات المحلية');
          }
          setUser(userData);
          setIsLoadingUser(false);
        })
        .catch(() => {
          // If verification fails but we have stored user, use it
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              setUser(userData);
              setIsLoadingUser(false);
              return;
            } catch (parseError) {
              console.error('Stored user data corrupted:', parseError);
            }
          }
          
          setIsLoadingUser(false);
          window.location.href = '/login';
        });
      } else if (!token) {
        setIsLoadingUser(false);
        window.location.href = '/login';
      } else {
        // Offline mode without stored user
        setIsLoadingUser(false);
        window.location.href = '/login';
      }
    }).catch(error => {
      console.error('Error in auth initialization:', error);
      setIsLoadingUser(false);
      window.location.href = '/login';
    });
  }, []);

  // Show loading while checking user and settings
  // EXCEPTION: Don't wait for settings for data_specialist
  if (isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }
  
  // Additional loading for dashboard settings when user is loaded
  if (user && user.role !== 'admin' && user.role !== 'data_specialist' && settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // No user found
  if (!user) {
    return <Redirect to="/login" />;
  }

  // Enhanced access control logic with regular user restrictions
  const hasAccess = () => {
    // Check if user role is explicitly excluded
    if (excludeRoles.includes(user.role)) {
      return false;
    }
    
    // Admins and certain management roles always have access to everything
    if (['admin', 'general_manager', 'department_manager', 'enhanced_general_manager', 'hsa_group_admin'].includes(user.role)) {
      return true;
    }
    
    // PRIORITY: Data specialist access check first
    if (user.role === 'data_specialist' && allowDataSpecialist) {
      console.log('✅ Data specialist granted access:', {
        userId: user.id,
        username: user.username,
        route: location,
        allowDataSpecialist: allowDataSpecialist
      });
      return true;
    }
    
    // Affairs Manager access check
    if (user.role === 'admin_affairs_manager' && allowAffairsManager) {
      console.log('✅ Admin Affairs Manager granted access:', {
        userId: user.id,
        username: user.username,
        route: location,
        allowAffairsManager: allowAffairsManager
      });
      return true;
    }
    
    // For admin-only pages
    if (adminOnly) {
      // If data specialist was not allowed above, deny access
      if (user.role === 'data_specialist') {
        console.log('❌ Data specialist blocked:', {
          userId: user.id,
          username: user.username,
          route: location,
          allowDataSpecialist: allowDataSpecialist
        });
        return false;
      }
      
      // Supervisors with access need dashboard permission for this section
      if (supervisorAccess && user.role === 'supervisor') {
        if (requiredSection) {
          return isSectionEnabled(requiredSection);
        }
        return true;
      }
      // RESTRICTED: Regular users CANNOT access admin pages anymore
      if (user.role === 'user') {
        console.log('🚫 Regular user blocked from admin page:', {
          userId: user.id,
          username: user.username,
          page: requiredSection
        });
        return false;
      }
      // If admin only and user is not admin/supervisor, deny access
      return false;
    }
    
    // For pages that require specific section access
    if (requiredSection) {
      return isSectionEnabled(requiredSection);
    }
    
    // Default: allow access for authenticated users
    return true;
  };

  // SECURITY FIX: Apply access controls even in offline mode
  // Regular users still have restricted access offline
  if (!navigator.onLine) {
    // For admin-only sections, still block regular users even offline
    if (adminOnly && user.role === 'user' && !allowDataSpecialist) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">الوصول مقيد</h2>
            <p className="text-gray-600 mb-4">
              هذه الصفحة متاحة للمديرين والمشرفين فقط
            </p>
            <p className="text-sm text-gray-500 mb-4">
              (محظور حتى في الوضع غير المتصل)
            </p>
            <button 
              onClick={() => window.history.back()}
              className="bg-brand-yellow hover:bg-yellow-500 text-black px-6 py-2 rounded-lg font-medium"
            >
              العودة
            </button>
          </div>
        </div>
      );
    }
    
    console.log('📱 Offline mode: Allowing access with restrictions for user:', user.role);
    return <>{children}</>;
  }

  // Check access when online
  if (!hasAccess()) {
    // Enhanced access denied messages for different user types
    let accessMessage = 'ليس لديك صلاحية للوصول إلى هذا القسم';
    let detailMessage = 'تواصل مع مدير النظام لطلب الصلاحيات المطلوبة';
    
    if (adminOnly && user.role === 'user') {
      accessMessage = 'هذه الصفحة محظورة على المستخدمين العاديين';
      detailMessage = 'هذا القسم مخصص للإدارة والإشراف فقط';
    } else if (adminOnly && !['admin', 'general_manager', 'department_manager', 'admin_affairs_manager'].includes(user.role)) {
      accessMessage = 'هذه الصفحة متاحة للمديرين فقط';
      detailMessage = 'تواصل مع المدير العام لطلب صلاحيات إدارية';
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">الوصول مقيد</h2>
          <p className="text-gray-600 mb-2">{accessMessage}</p>
          <p className="text-sm text-gray-500 mb-4">{detailMessage}</p>
          <button 
            onClick={() => window.history.back()}
            className="bg-brand-yellow hover:bg-yellow-500 text-black px-6 py-2 rounded-lg font-medium"
          >
            العودة
          </button>
        </div>
      </div>
    );
  }

  // For non-admin and non-supervisor users, check section-specific permissions
  if (user.role !== 'admin' && user.role !== 'supervisor' && requiredSection && !isSectionEnabled(requiredSection)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">القسم غير متاح</h2>
          <p className="text-gray-600 mb-4">هذا القسم غير مفعل لحسابك. تواصل مع المدير لتفعيله.</p>
          <button 
            onClick={() => window.history.back()}
            className="bg-brand-yellow hover:bg-yellow-500 text-black px-6 py-2 rounded-lg font-medium"
          >
            العودة
          </button>
        </div>
      </div>
    );
  }

  // All checks passed, render the protected content
  return <>{children}</>;
}