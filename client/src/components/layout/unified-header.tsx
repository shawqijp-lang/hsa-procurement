import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, User, Building, FileText, Settings, Users, MapPin, CheckSquare, BarChart3, Shield, TrendingUp, ChevronDown, ClipboardList, ShoppingCart } from "lucide-react";
import { StableLogoutButton } from '@/components/ui/StableLogoutButton';
import CompanyFilter from "@/components/layout/CompanyFilter";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import { formatArabicDateTime, getTimezoneInfo } from "@/lib/date-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UnifiedHeaderProps {
  activeTab?: string;
}

export default function UnifiedHeader({ activeTab }: UnifiedHeaderProps) {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [userInfo, setUserInfo] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const { logout, user: authUser, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const { dashboardSettings, isLoading: settingsLoading, refetch: refreshSettings } = useDashboardSettings(user?.id);
  
  // Helper function to check if section is enabled
  const isSectionEnabled = (section: string) => {
    return dashboardSettings?.sections?.includes(section as any) ?? true;
  };
  
  // Real-time permission sync handled by UltimateSync system

  // Update date/time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // 🔄 جلب اسم الشركة ديناميكياً من API
  useEffect(() => {
    const fetchCompanyName = async () => {
      if (!user?.companyId) return;

      try {
        const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
        const token = await enhancedIndexedDB.getAuthData('auth_token') || 
                     await enhancedIndexedDB.getAuthData('token');

        if (!token) return;

        const response = await fetch('/api/companies', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const companies = await response.json();
          const company = companies.find((c: any) => c.id === user.companyId);
          
          if (company?.nameEn) {
            setCompanyName(company.nameEn);
            console.log('✅ [UnifiedHeader] اسم الشركة الديناميكي:', company.nameEn);
          }
        }
      } catch (error) {
        console.warn('⚠️ [UnifiedHeader] فشل جلب اسم الشركة:', error);
      }
    };

    fetchCompanyName();
  }, [user?.companyId]);

  // Get user info - Use authUser from useAuth hook first
  useEffect(() => {
    // Priority 1: Use authUser from useAuth hook (most reliable)
    if (authUser) {
      console.log('🔍 UnifiedHeader: Using authUser from useAuth hook', { 
        username: authUser.username,
        canManageUsers: authUser.canManageUsers 
      });
      setUser(authUser);
      setUserInfo(authUser);
      return;
    }

    // Priority 2: Try stored user data - IndexedDB أولاً ثم localStorage
    const loadUserData = async () => {
      try {
        const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
        const indexedDBUser = await enhancedIndexedDB.getAuthData('user_data') || 
                             await enhancedIndexedDB.getAuthData('user');
        if (indexedDBUser) {
          const userData = typeof indexedDBUser === 'string' ? JSON.parse(indexedDBUser) : indexedDBUser;
          console.log('📱 UnifiedHeader: Using IndexedDB user data', { 
            username: userData.username,
            canManageUsers: userData.canManageUsers 
          });
          setUser(userData);
          setUserInfo(userData);
          return;
        }
      } catch (error) {
        console.warn('⚠️ فشل في استرجاع بيانات المستخدم من IndexedDB:', error);
      }

      // Fallback to localStorage
      const storedUser = null; 
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          console.log('📱 UnifiedHeader: Using localStorage user data (fallback)', { 
            username: userData.username,
            canManageUsers: userData.canManageUsers 
          });
          setUser(userData);
          setUserInfo(userData);
          
          // ترحيل تلقائي إلى IndexedDB
          import('@/lib/enhancedIndexedDB').then(({ enhancedIndexedDB }) => {
            enhancedIndexedDB.saveAuthData('user_data', JSON.stringify(userData)).then(() => {
              console.log('📦 ترحيل بيانات المستخدم إلى IndexedDB');
            }).catch((error: any) => {
              console.warn('⚠️ فشل في ترحيل بيانات المستخدم:', error);
            });
          }).catch(() => {});
          return;
        } catch (error) {
          console.error('Failed to parse stored user data:', error);
        }
      }
    };

    loadUserData();

    // Priority 3: Try API if we have a token and are authenticated
    const getToken = async () => {
      try {
        const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
        const token = await enhancedIndexedDB.getAuthData('auth_token') || 
                     await enhancedIndexedDB.getAuthData('token');
        if (token) {
          console.log('🔑 UnifiedHeader: استرجاع الرمز من IndexedDB');
        }
        return token;
      } catch (error) {
        console.warn('⚠️ فشل في الحصول على الرمز من IndexedDB:', error);
        return null;
      }
    };

    getToken().then(token => {
      if (token && navigator.onLine && isAuthenticated) {
        fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          signal: AbortSignal.timeout(3000)
        })
        .then(response => {
          if (response.ok) {
            return response.json();
          }
          throw new Error('Failed to fetch user');
        })
        .then(async (userData) => {
          console.log('🌐 UnifiedHeader: Got fresh user data from API', { 
            username: userData.username,
            canManageUsers: userData.canManageUsers 
          });
          
          // حفظ في IndexedDB أولاً مع localStorage احتياطي
          try {
            const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
            await enhancedIndexedDB.saveAuthData('user_data', JSON.stringify(userData));
            console.log('✅ تم حفظ بيانات المستخدم الجديدة في IndexedDB');
          } catch (dbError) {
            console.warn('⚠️ فشل IndexedDB، استخدام localStorage احتياطي:', dbError);
            
            console.log('✅ تم حفظ بيانات المستخدم في localStorage (احتياطي)');
          }
          
          setUser(userData);
          setUserInfo(userData);
        })
        .catch(() => {
          console.log('❌ UnifiedHeader: Failed to get user data from API');
        });
      }
    });
  }, [authUser, isAuthenticated]);

  // handleLogout removed - now using LogoutButton component

  // نظام الصلاحيات المبسط
  const canAccessTab = (tabId: string): boolean => {
    if (!user?.role) return false;
    return getFallbackPermission(user.role, tabId);
  };
  
  // نظام الصلاحيات 
  const getFallbackPermission = (role: string, tabId: string): boolean => {
    
    // إعدادات النظام متاحة للجميع
    if (tabId === 'system-settings') return true;
    
    // الصلاحيات الاحتياطية الأساسية - تم دمج تقارير Excel في التقارير العادية
    const fallbackPermissions: Record<string, string[]> = {
      user: ['locations'],
      supervisor: ['locations', 'assessment-locations'],
      admin: ['locations', 'locations-manage', 'checklist-manager', 'reports', 'users', 'kpi-dashboard', 'central-purchases'],
      data_specialist: ['locations', 'locations-manage', 'checklist-manager'],
      analytics_viewer: ['locations'],
      enhanced_general_manager: ['locations', 'central-purchases'],
      admin_affairs_manager: ['locations', 'locations-manage', 'checklist-manager', 'reports', 'users', 'central-purchases']
    };
    
    return fallbackPermissions[role]?.includes(tabId) || false;
  };

  // Navigation tabs - clean and simple structure
  const tabs = [
    {
      id: 'locations',
      label: 'لوحة التحكم',
      icon: BarChart3,
      path: '/',
    },

    {
      id: 'locations-manage',
      label: 'إدارة المواقع',
      icon: MapPin,
      path: '/locations',
      requiresAuth: true,
    },
    {
      id: 'assessment-locations',
      label: 'تقييم المواقع',
      icon: CheckSquare,
      path: '/assessment-locations',
      requiresAuth: true,
    },
    {
      id: 'checklist-manager',
      label: 'إدارة قوائم التشييك',
      icon: ClipboardList,
      path: '/advanced-checklist-manager',
      requiresAuth: true,
    },
    {
      id: 'reports',
      label: 'التقارير',
      icon: FileText,
      path: '/reports',
      requiresAuth: true,
    },
    {
      id: 'users',
      label: 'إدارة المستخدمين',
      icon: Users,
      path: '/users',
      requiresAuth: true,
    },
    {
      id: 'kpi-dashboard',
      label: 'مؤشرات الأداء',
      icon: TrendingUp,
      path: '/kpi-dashboard',
      requiresAuth: true,
    },
    {
      id: 'central-purchases',
      label: 'المشتريات المركزية',
      icon: ShoppingCart,
      path: '/central-purchases',
      requiresAuth: true,
    },

    {
      id: 'system-settings',
      label: 'إعدادات النظام',
      icon: Settings,
      path: '/system-settings',
    },
    {
      id: 'security-dashboard',
      label: 'مراقبة الأمان',
      icon: Shield,
      path: '/security-dashboard',
      requiresAuth: true,
    },

  ];

  // Determine active tab
  const getCurrentActiveTab = () => {
    if (activeTab) return activeTab;
    
    // Enhanced routing detection for precise tab highlighting
    const pathMappings = {
      '/': 'locations',

      '/locations': 'locations-manage', 
      '/reports': 'reports',
      '/users': 'users',
      '/checklist-manager': 'checklist-manager',
      '/assessment-locations': 'assessment-locations',
      '/kpi-dashboard': 'kpi-dashboard',
      '/interactive-kpi': 'kpi-dashboard',
      '/central-purchases': 'central-purchases',
      '/system-settings': 'system-settings',
      '/security-dashboard': 'security-dashboard'
    };
    
    // Check exact paths first with proper typing
    if (location in pathMappings) {
      return pathMappings[location as keyof typeof pathMappings];
    }
    
    // Pattern-based path detection
    if (location.startsWith('/location/')) {
      return 'locations';
    }
    
    // Enhanced checklist management detection 
    if (location.includes('checklist') || location.includes('template')) {
      return 'checklist-manager';
    }
    
    // Assessment locations detection
    if (location.includes('assessment-locations')) {
      return 'assessment-locations';
    }
    
    return 'locations';
  };

  const currentActiveTab = getCurrentActiveTab();

  // Simple and direct tab filtering
  const visibleTabs = tabs.filter(tab => {
    return canAccessTab(tab.id);
  });

  console.log('🔍 Final visible tabs:', {
    userRole: user?.role,
    totalTabs: tabs.length,
    visibleTabIds: visibleTabs.map(t => t.id),
    visibleTabsCount: visibleTabs.length
  });

  console.log('🎯 Tab highlighting debug:', {
    currentLocation: location,
    detectedActiveTab: currentActiveTab,
    expectedForKPI: '/kpi-dashboard should match kpi-dashboard'
  });

  return (
    <>
      <header className="bg-white text-gray-900 shadow-lg sticky top-0 z-50 border-b border-gray-200">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6">
        {/* Main Header Row - احترافي وموحد */}
        <div className="flex items-center justify-between py-3 sm:py-4">
          {/* Logo and Title - محسن للهواتف */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shadow-lg overflow-hidden bg-white p-0.5">
              <img 
                src="/hsa-logo-new.png" 
                alt="HSA Group"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight">هائل سعيد أنعم وشركاه - أقليم اليمن</h1>
              <p className="text-xs sm:text-sm font-medium text-gray-700 leading-tight mt-0.5">الإدارة التنفيذية للشؤون الإدارية</p>
              <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight flex items-center gap-2 mt-0.5">
                <span>نظام إدارة بيئة العمل</span>
                {companyName && (
                  <>
                    <span className="text-brand-yellow opacity-60">•</span>
                    <span 
                      className="text-brand-yellow font-semibold tracking-wide" 
                      dir="ltr"
                      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                    >
                      {companyName}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* User Info Section - Enhanced for Desktop */}
          <div className="hidden lg:flex items-center gap-4 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 backdrop-blur-sm">
            <div className="text-right">
              <div className="flex items-center gap-2 text-brand-yellow mb-1">
                <User className="h-4 w-4" />
                <span className="text-sm font-bold">
                  {userInfo?.role === 'admin' ? 'مدير الشؤون الإدارية' : 
                   userInfo?.role === 'supervisor' ? 'مشرف النظافة' : 
                   userInfo?.role === 'owner' ? 'مدير النظام' : 
                   userInfo?.role === 'super_admin' ? 'مدير النظام العام' : 
                   userInfo?.role === 'general_manager' ? 'مدير عام الشركة' : 
                   userInfo?.role === 'enhanced_general_manager' ? 'مدير بيئة العمل' : 
                   userInfo?.role === 'analytics_viewer' ? 'مشاهد التحليلات' : 'مستخدم'}
                </span>
              </div>
              <div 
                className="text-xs text-gray-600 cursor-pointer hover:text-brand-yellow transition-colors" 
                onDoubleClick={async () => {
                  try {
                    console.log('🔄 فرض تحديث بيانات المستخدم...');
                    // مسح البيانات المحلية
                    const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
                    await enhancedIndexedDB.deleteAuthData('user_data');
                    
                    // إعادة تحميل الصفحة لفرض إعادة تحميل البيانات من الخادم
                    window.location.reload();
                  } catch (error) {
                    console.error('❌ خطأ في تحديث البيانات:', error);
                  }
                }}
                title="انقر نقرتين لتحديث البيانات من الخادم"
              >
                {userInfo?.fullName || userInfo?.username || 'مستخدم النظام'}
              </div>
            </div>
            <div className="h-8 w-px bg-gray-300"></div>
            <div className="text-right text-xs">
              <div className="text-brand-yellow font-medium">
                {formatArabicDateTime(currentDateTime).split(' ')[1]} {/* الوقت */}
              </div>
              <div className="text-gray-600">
                {formatArabicDateTime(currentDateTime).split(' ')[0]} {/* التاريخ */}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {getTimezoneInfo().includes('Asia/Riyadh') ? 'التوقيت العربي الرسمي' : 'التوقيت المحلي'}
              </div>
            </div>
          </div>
          
          {/* User Actions Section */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Company Filter - مرشح الشركة لمدير عام الشركة */}
            <CompanyFilter userRole={user?.role} username={user?.username} />
            
            {/* Update Button - زر التحديث الدائري */}
            
            {/* User Info Dropdown - محسن */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-gray-700 hover:bg-gray-100 transition-all duration-300 p-2 sm:p-3 rounded-lg border border-gray-200 hover:border-brand-yellow"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-black" />
                    </div>
                    <ChevronDown className="h-3 w-3 text-gray-500" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white border-gray-200" sideOffset={8}>
                <div className="p-1">
                  <StableLogoutButton 
                    variant="ghost"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 h-auto px-2 py-1.5"
                    iconOnly={false}
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
          </div>
        </div>
        
        {/* Navigation Bar - محسن جداً */}
        <div className="border-t border-gray-200">
          <nav className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
            {visibleTabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = currentActiveTab === tab.id;
              
              return (
                <Link key={tab.id} href={tab.path || '#'}>
                  <button
                    className={`px-3 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-300 flex items-center gap-2 whitespace-nowrap min-w-0 flex-shrink-0 shadow-sm ${
                      isActive
                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black shadow-xl border border-yellow-300/70 transform scale-[1.02] font-bold'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 border border-transparent hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <IconComponent className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                </Link>
              );
            })}
          </nav>
        </div>
        
      </div>
    </header>
    </>
  );
}