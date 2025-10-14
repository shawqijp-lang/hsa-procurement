import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { apiRequest, saveLocationsWithTemplates } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useUnifiedEvaluation } from "@/hooks/useUnifiedEvaluation";
import { 
  Building, 
  Home, 
  Stethoscope, 
  Clock, 
  Wifi, 
  WifiOff, 
  ChefHat, 
  Package, 
  Droplets, 
  MapPin, 
  Utensils,
  Hospital,
  Store,
  Factory,
  Warehouse,
  TreePine,
  BarChart3,
  Crown,
  Shield
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import LoadingSpinner from "@/components/ui/loading-spinner";
import OfflineSync from "@/components/offline/OfflineSync";
import { PerformanceMonitor } from "@/components/PerformanceMonitor";
import CacheClearButton from "@/components/CacheClearButton";

import { Link } from "wouter";
import { saveToPhone, getFromPhone } from '@/lib/simplePhoneStorage';
import { formatArabicDate } from '@/lib/date-utils';

// Import Enhanced General Manager components
import ImprovedExecutiveDashboard from '@/components/enhanced-general-manager/ImprovedExecutiveDashboard';
import ActiveCompaniesAnalytics from '@/components/enhanced-general-manager/ActiveCompaniesAnalytics';


interface LocationStatus {
  id: number;
  nameAr: string;
  nameEn: string;
  icon: string;
  completedTasks: number;
  totalTasks: number;
  status: 'completed' | 'in-progress' | 'not-started';
  progress: string;
  lastUpdated: string | null;
}

const iconMap = {
  building: Building,
  home: Home,
  'clinic-medical': Stethoscope,
  'chef-hat': ChefHat,
  package: Package,
  droplets: Droplets,
  'map-pin': MapPin,
  utensils: Utensils,
  hospital: Hospital,
  store: Store,
  factory: Factory,
  warehouse: Warehouse,
  'tree-pine': TreePine,
};

function getStatusText(status: string) {
  switch (status) {
    case 'completed': return 'مكتمل';
    case 'in-progress': return 'قيد التنفيذ';
    case 'not-started': return 'لم يبدأ';
    default: return 'غير معروف';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed': return 'text-green-600 bg-green-50 border-green-200';
    case 'in-progress': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'not-started': return 'text-gray-600 bg-gray-50 border-gray-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

function getProgressColor(progress: number) {
  if (progress >= 90) return 'bg-green-500';
  if (progress >= 70) return 'bg-yellow-500';
  if (progress >= 50) return 'bg-orange-500';
  return 'bg-red-500';
}

// Analytics Viewer Dashboard Component - Exact replica of Enhanced General Manager Dashboard
function AnalyticsViewerDashboard({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      {/* Performance Monitoring - تم إخفاؤه بناءً على طلب المستخدم */}
      {/* <PerformanceMonitor /> */}
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-white rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              مرحباً، {user.fullName}
            </h1>
            <p className="text-yellow-100 text-lg">
              لوحة التحليلات والمتابعة - عرض شامل لجميع شركات هائل سعيد أنعم وشركاه
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-4 space-x-reverse">
            <BarChart3 className="h-12 w-12 text-yellow-200" />
            <div className="text-center">
              <div className="text-2xl font-bold">هائل سعيد أنعم وشركاه</div>
              <div className="text-yellow-200">تحليلات متقدمة</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14">
          <TabsTrigger value="analytics" className="flex items-center space-x-2 space-x-reverse">
            <BarChart3 className="h-4 w-4" />
            <span>لوحة القيادة التنفيذية</span>
          </TabsTrigger>
          <TabsTrigger value="companies" className="flex items-center space-x-2 space-x-reverse">
            <Shield className="h-4 w-4" />
            <span>تحليلات الشركات الفعالة</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <div className="mt-6">
          <TabsContent value="analytics" className="mt-0">
            <ImprovedExecutiveDashboard />
          </TabsContent>

          <TabsContent value="companies" className="mt-0">
            <ActiveCompaniesAnalytics />
          </TabsContent>
        </div>
      </Tabs>

      {/* Quick Stats Footer */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            نظام إدارة بيئة العمل - هائل سعيد أنعم وشركاه
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            تحليلات متقدمة | مراقبة شاملة | تقارير ذكية | متابعة دقيقة
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { isOffline } = useAuth();
  
  // 🔄 تفعيل المزامنة التلقائية للمستخدم العادي - حل مشكلة المزامنة المفقودة
  const { isOnline, syncStats, hasUnsynced } = useUnifiedEvaluation({ 
    locationId: undefined, // للمزامنة العامة
    autoSync: true,   // ✅ تفعيل المزامنة التلقائية للجميع
    currentUser: user 
  });
  
  // 🔧 جميع الـ state والـ hooks يجب أن تكون في الأعلى
  const [offlineLocations, setOfflineLocations] = React.useState<LocationStatus[]>([]);
  const isOfflineMode = !navigator.onLine;
  
  // Enhanced dashboard data fetching with unified IndexedDB fallback pattern
  const { data: apiLocations, isLoading, error } = useQuery({
    queryKey: ['/api/dashboard', user?.companyId, user?.id], // 🔐 إضافة معرف المستخدم لتجنب تداخل الكاش
    queryFn: async () => {
      try {
        // First try API using unified apiRequest with company filter
        if (navigator.onLine) {
          const data = await apiRequest('/api/dashboard', 'GET');
          
          // 🏢 حفظ محسن للمواقع مع القوالب باستخدام النظام الموحد
          if (data && Array.isArray(data)) {
            try {
              console.log('🏢 حفظ المواقع مع قوالبها في النظام المحسن...', data.length, 'موقع');
              
              // استخدام النظام المحسن لحفظ المواقع مع قوالبها
              await saveLocationsWithTemplates(data, user?.id, user?.companyId);
              
              // حفظ إضافي في نظام الهاتف للتوافق مع النسخ السابقة
              const dataToSave = {
                locations: data,
                timestamp: Date.now(),
                userRole: user?.role || 'user',
                companyId: user?.companyId,
                userId: user?.id
              };
              
              await saveToPhone('dashboard_locations', dataToSave, user?.id);
              console.log('✅ تم حفظ المواقع بنجاح مع النظام المحسن والنظام التقليدي');
            } catch (cacheError) {
              console.warn('⚠️ فشل في حفظ المواقع:', cacheError);
            }
          }
          
          console.log('📱 Dashboard: Using fresh API data with current permissions');
          return data;
        }
      } catch (apiError) {
        console.warn('⚠️ فشل في جلب بيانات لوحة التحكم من API:', apiError);
      }
      
      // 📱 استرجاع من ذاكرة الهاتف مع فلترة الشركة
      console.log('📱 وضع عدم الاتصال - البحث في ذاكرة الهاتف...');
      
      try {
        // 🔐 التحقق من هوية المستخدم أولاً قبل استدعاء getFromPhone
        const currentUserId = user?.id;
        if (!currentUserId) {
          console.log('⚠️ لا يوجد مستخدم مسجل دخول - تجاهل ذاكرة الهاتف');
          return [];
        }
        
        const storedData = await getFromPhone('dashboard_locations', user?.id);
        
        if (storedData && storedData.locations && Array.isArray(storedData.locations)) {
          // التحقق من معرف المستخدم المحفوظ
          if (storedData.userId && storedData.userId !== currentUserId) {
            console.log('🔐 مستخدم مختلف - تجاهل ذاكرة الهاتف', {
              currentUser: currentUserId,
              storedUser: storedData.userId
            });
            return [];
          }
          
          // فلترة حسب الشركة الحالية
          const currentUserCompanyId = user?.companyId;
          if (currentUserCompanyId && storedData.companyId !== currentUserCompanyId) {
            console.log('🔄 بيانات مختلفة الشركة، تجاهل التخزين المؤقت');
            return [];
          }
          
          console.log('📊 تم استرجاع المواقع من ذاكرة الهاتف:', storedData.locations.length, 'للمستخدم:', currentUserId);
          return storedData.locations;
        }
        
        console.log('ℹ️ لا توجد مواقع محفوظة في ذاكرة الهاتف');
      } catch (error) {
        console.warn('⚠️ خطأ في قراءة ذاكرة الهاتف:', error);
      }
      
      // Final fallback to any available cached data
      console.log('📊 لا توجد بيانات متاحة - العودة لقائمة فارغة');
      
      return [];
    },
    enabled: true, // Keep simple to avoid conflicts
    staleTime: 5 * 60 * 1000, // 5 minutes - consistent with other pages
    retry: (failureCount, error: any) => {
      // Don't retry if offline
      if (error?.message === 'OFFLINE_MODE') return false;
      return failureCount < 2;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // 📱 دالة مبسطة لاسترجاع المواقع من ذاكرة الهاتف
  const getSimpleOfflineLocations = async (): Promise<LocationStatus[]> => {
    try {
      // 🔐 التحقق من هوية المستخدم أولاً قبل استدعاء getFromPhone
      const currentUserId = user?.id;
      if (!currentUserId) {
        console.log('⚠️ لا يوجد مستخدم مسجل دخول - تجاهل ذاكرة الهاتف');
        return [];
      }
      
      const storedData = await getFromPhone('dashboard_locations', user?.id);
      
      if (storedData && storedData.locations && Array.isArray(storedData.locations)) {
        // التحقق من معرف المستخدم المحفوظ
        if (storedData.userId && storedData.userId !== currentUserId) {
          console.log('🔐 مستخدم مختلف في الدالة المبسطة - تجاهل ذاكرة الهاتف');
          return [];
        }
        
        console.log('📱 تم استرجاع المواقع من ذاكرة الهاتف:', storedData.locations.length);
        return storedData.locations;
      }
      
      console.log('ℹ️ لا توجد مواقع محفوظة في ذاكرة الهاتف');
      return [];
    } catch (error) {
      console.warn('⚠️ خطأ في قراءة ذاكرة الهاتف:', error);
      return [];
    }
  };

  // 🔧 useEffect لمسح البيانات السابقة فقط عند تغيير المستخدم
  React.useEffect(() => {
    // عند تغيير المستخدم، امسح البيانات السابقة فوراً
    if (user?.id) {
      // مسح البيانات السابقة فوراً عند تغيير المستخدم
      setOfflineLocations([]);
      console.log('🔄 تم مسح البيانات السابقة للمستخدم الجديد:', user?.id);
    } else {
      // مسح البيانات السابقة إذا لم يعد هناك مستخدم
      setOfflineLocations([]);
    }
  }, [user?.id]); // إضافة user?.id كتبعية

  // Safely handle locations data - ensure it's always an array
  // If user is analytics_viewer, show Enhanced General Manager Dashboard content
  if (user?.role === 'analytics_viewer') {
    return <AnalyticsViewerDashboard user={user} />;
  }

  const locationsData = Array.isArray(apiLocations) ? apiLocations : [];
  
  const locations = locationsData.length > 0 ? locationsData : offlineLocations;

  // Only show loading if truly no data and currently loading
  if (isLoading && (!Array.isArray(locations) || locations.length === 0)) {
    return (
      <main className="container mx-auto px-4 py-6">
        <LoadingSpinner />
      </main>
    );
  }

  // Show minimal error only if absolutely no data available
  if (!Array.isArray(locations) || locations.length === 0) {
    return (
      <main className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <div className="text-orange-600 mb-4">
            <h3 className="text-lg font-semibold">لا توجد مواقع متاحة</h3>
            <p className="text-sm mt-2">
              {isOfflineMode 
                ? 'في وضع عدم الاتصال - قم بالدخول عبر الإنترنت أولاً وزيارة المواقع لحفظ البيانات محلياً' 
                : 'يرجى التحقق من صلاحياتك أو الاتصال بالإدارة'
              }
            </p>
            {isOfflineMode && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-700 text-sm">
                  💡 لاستخدام التطبيق بدون اتصال:
                  <br />1. قم بتسجيل الدخول عبر الإنترنت
                  <br />2. تصفح المواقع المتاحة لك
                  <br />3. افتح بعض التقييمات
                  <br />4. ستحفظ البيانات تلقائياً للاستخدام بدون اتصال
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-2 sm:px-3 md:px-4 py-3 sm:py-4 md:py-6">
        {/* Offline status indicator - محسن للموبايل */}
        {isOfflineMode && (
          <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 text-orange-800">
              <WifiOff className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium">وضع عدم الاتصال</span>
            </div>
          </div>
        )}
        
        {/* Offline Sync Component */}
        <OfflineSync />
        
        {/* Cache Management Section - تم إخفاؤه بناءً على طلب المستخدم */}

        <div className="mb-3 sm:mb-4 md:mb-6">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">مواقع التقييم</h2>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed">
            {isOfflineMode ? 'التصفح من البيانات المحفوظة - ' : ''}اختر الموقع لتقييم أعمال النظافة اليومية
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {Array.isArray(locations) && locations.map((location: LocationStatus, index: number) => {
            const IconComponent = iconMap[location.icon as keyof typeof iconMap] || Building;
            
            const backgroundColors = [
              'bg-gradient-to-br from-amber-100 to-yellow-50 hover:from-amber-200 hover:to-yellow-100',
              'bg-gradient-to-br from-emerald-100 to-green-50 hover:from-emerald-200 hover:to-green-100',
              'bg-gradient-to-br from-sky-100 to-blue-50 hover:from-sky-200 hover:to-blue-100',
              'bg-gradient-to-br from-violet-100 to-purple-50 hover:from-violet-200 hover:to-purple-100'
            ];
            
            const iconBackgroundColors = [
              'bg-gradient-to-br from-amber-200 to-yellow-100',
              'bg-gradient-to-br from-emerald-200 to-green-100',
              'bg-gradient-to-br from-sky-200 to-blue-100',
              'bg-gradient-to-br from-violet-200 to-purple-100'
            ];
            
            const bgColor = backgroundColors[index % 4];
            const iconBgColor = iconBackgroundColors[index % 4];
            
            return (
              <Link key={location.id} href={`/location/${location.id}`}>
                <Card className={`cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.03] border-0 rounded-3xl ${bgColor} group`}>
                  <CardContent className="p-6 sm:p-7 md:p-8">
                    <div className="flex flex-col items-center text-center mb-5 sm:mb-6">
                      <div className={`w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 ${iconBgColor} rounded-3xl flex items-center justify-center flex-shrink-0 shadow-xl group-hover:shadow-2xl transition-all duration-300 mb-4 sm:mb-5 border-2 border-white/50`}>
                        <IconComponent className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 text-gray-800" />
                      </div>
                      <div className="w-full">
                        <h3 className="font-bold text-lg sm:text-xl md:text-2xl text-gray-900 mb-2 leading-tight">{location.nameAr}</h3>
                        <p className="text-sm sm:text-base text-gray-700 font-medium" dir="ltr">{location.nameEn}</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-center pt-3">
                      <button className="bg-gradient-to-r from-brand-yellow via-amber-400 to-brand-yellow hover:from-amber-500 hover:via-brand-yellow hover:to-amber-500 text-brand-black font-bold text-base sm:text-lg py-3.5 px-8 sm:px-10 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 border-2 border-amber-300">
                        اضغط للتقييم
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
    </main>
  );
}