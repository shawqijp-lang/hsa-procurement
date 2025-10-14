import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
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
  CloudOff,
  Database,
  AlertCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import LoadingSpinner from "@/components/ui/loading-spinner";
import OfflineSync from "@/components/offline/OfflineSync";
import { formatArabicDate } from '@/lib/date-utils';

import { Link } from "wouter";

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
  companyId: number;
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

export default function EnhancedDashboard() {
  const { user } = useAuth();
  const isOffline = !navigator.onLine;

  // Online data fetch with offline fallback
  const { data: locations, isLoading, error } = useQuery<LocationStatus[]>({
    queryKey: ['/api/locations/status'],
    retry: false,
    enabled: !isOffline, // Only fetch when online
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: undefined,
  });

  const displayLocations = locations || [];

  const pendingCount = 0;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            لوحة التحكم
          </h1>
          
          {/* Status Indicators */}
          <div className="flex items-center gap-4">
            {/* Offline/Online Status */}
            <div className="flex items-center gap-2">
              {!navigator.onLine ? (
                <>
                  <WifiOff className="h-5 w-5 text-red-500" />
                  <span className="text-red-600 dark:text-red-400 text-sm font-medium">
                    غير متصل
                  </span>
                </>
              ) : (
                <>
                  <Wifi className="h-5 w-5 text-green-500" />
                  <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                    متصل
                  </span>
                </>
              )}
            </div>

            {/* Sync Button */}
            {!isOffline && pendingCount > 0 && (
              <Button
                onClick={() => {/* استخدام SyncButton الموحد بدلاً من هذا الزر */}}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Database className="h-4 w-4" />
                مزامنة ({pendingCount})
              </Button>
            )}
          </div>
        </div>

        {/* Offline Notice */}
        {isOffline && (
          <div className="mt-4 flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <CloudOff className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-blue-800 dark:text-blue-200 font-medium">
                وضع عدم الاتصال
              </p>
              <p className="text-blue-600 dark:text-blue-400 text-sm mt-1">
                {user 
                  ? `عرض البيانات المحفوظة محلياً ${pendingCount > 0 ? `• ${pendingCount} تقييم في انتظار المزامنة` : ''}`
                  : 'لا توجد بيانات محفوظة للعرض'
                }
              </p>
            </div>
          </div>
        )}

        {/* Error Notice */}
        {error && !isOffline && (
          <div className="mt-4 flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-800 dark:text-red-200 font-medium">
                خطأ في تحميل البيانات
              </p>
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                تم عرض البيانات المحفوظة محلياً
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-blue-200 dark:border-blue-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">إجمالي المواقع</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {displayLocations.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Building className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 border-green-200 dark:border-green-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 dark:text-green-400 text-sm font-medium">مكتمل</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {displayLocations.filter(loc => loc.status === 'completed').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800 border-yellow-200 dark:border-yellow-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">قيد التنفيذ</p>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                  {displayLocations.filter(loc => loc.status === 'in-progress').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">معلق</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {pendingCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-500 rounded-lg flex items-center justify-center">
                <Database className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Locations Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            المواقع
          </h2>
          {isOffline && (
            <Badge variant="secondary" className="gap-1">
              <CloudOff className="h-3 w-3" />
              بيانات محلية
            </Badge>
          )}
        </div>

        {displayLocations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Building className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                لا توجد مواقع
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                {isOffline 
                  ? 'لا توجد بيانات مواقع محفوظة محلياً'
                  : 'لم يتم إنشاء أي مواقع بعد'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayLocations.map((location) => {
              const IconComponent = iconMap[location.icon as keyof typeof iconMap] || Building;
              
              return (
                <Card key={location.id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                          <IconComponent className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {location.nameAr}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {location.nameEn}
                          </p>
                        </div>
                      </div>
                      
                      <Badge 
                        variant={
                          location.status === 'completed' ? 'default' :
                          location.status === 'in-progress' ? 'secondary' : 
                          'outline'
                        }
                        className="text-xs"
                      >
                        {location.status === 'completed' ? 'مكتمل' :
                         location.status === 'in-progress' ? 'قيد التنفيذ' :
                         'لم يبدأ'}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">التقدم</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {location.progress}
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: location.progress 
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">المهام</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {location.completedTasks} / {location.totalTasks}
                        </span>
                      </div>

                      {location.lastUpdated && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          آخر تحديث: {formatArabicDate(location.lastUpdated)}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <Link href={`/location/${location.id}/checklist`}>
                        <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white">
                          بدء التقييم
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Offline Sync Component */}
      {!isOffline && <OfflineSync />}
    </div>
  );
}