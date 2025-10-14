import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

interface Location {
  id: number;
  nameAr: string;
  nameEn: string;
  icon: string;
  description?: string;
  isActive: boolean;
  status?: string;
  progress?: string;
  completedTasks?: number;
  totalTasks?: number;
  lastUpdated?: string;
}

export default function UserDashboard() {
  const [, setLocation] = useLocation();
  
  // Get user's assigned locations only
  const { data: userLocations, isLoading } = useQuery<Location[]>({
    queryKey: ['/api/user/my-locations'],
  });

  const handleLocationClick = (locationId: number) => {
    setLocation(`/location/${locationId}`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow mb-4"></div>
        <p className="text-gray-600">جارٍ تحميل مواقع التقييم...</p>
      </div>
    );
  }

  if (!userLocations || userLocations.length === 0) {
    return (
      <div className="text-center py-12">
        <MapPin className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد مواقع مخصصة</h3>
        <p className="text-gray-600 mb-4">
          لم يتم تخصيص أي مواقع لك للتقييم بعد
        </p>
        <p className="text-sm text-gray-500">
          تواصل مع المشرف لتخصيص مواقع التقييم
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">التقييمات اليومية</h1>
        <p className="text-gray-600">
          اختر الموقع المراد تقييمه اليوم
        </p>
      </div>

      {/* User's Assigned Locations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userLocations.map((location) => {
          const getStatusIcon = () => {
            switch (location.status) {
              case 'completed':
                return <CheckCircle className="h-5 w-5 text-green-600" />;
              case 'in-progress':
                return <Clock className="h-5 w-5 text-yellow-600" />;
              default:
                return <AlertCircle className="h-5 w-5 text-gray-400" />;
            }
          };

          const getStatusText = () => {
            switch (location.status) {
              case 'completed':
                return 'مكتمل';
              case 'in-progress':
                return 'جاري';
              default:
                return 'لم يبدأ';
            }
          };

          const getStatusColor = () => {
            switch (location.status) {
              case 'completed':
                return 'bg-green-50 border-green-200';
              case 'in-progress':
                return 'bg-yellow-50 border-yellow-200';
              default:
                return 'bg-gray-50 border-gray-200';
            }
          };

          return (
            <Card 
              key={location.id} 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${getStatusColor()}`}
              onClick={() => handleLocationClick(location.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-brand-yellow" />
                    {location.nameAr}
                  </CardTitle>
                  {getStatusIcon()}
                </div>
                {location.description && (
                  <p className="text-sm text-gray-600">{location.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Progress */}
                  {location.progress && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">التقدم:</span>
                      <span className="font-medium">{location.progress}</span>
                    </div>
                  )}
                  
                  {/* Status */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">الحالة:</span>
                    <span className="font-medium">{getStatusText()}</span>
                  </div>
                  
                  {/* Last Updated */}
                  {location.lastUpdated && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">آخر تحديث:</span>
                      <span className="text-xs text-gray-500">
                        {new Date(location.lastUpdated).toLocaleDateString('ar-EG', { calendar: 'gregory' })}
                      </span>
                    </div>
                  )}
                  
                  <Button 
                    className="w-full mt-4 bg-brand-yellow hover:bg-yellow-500 text-black"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLocationClick(location.id);
                    }}
                  >
                    {location.status === 'completed' ? 'مراجعة التقييم' : 'بدء التقييم'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">إحصائيات سريعة</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-brand-yellow">
              {userLocations.length}
            </div>
            <div className="text-sm text-gray-600">إجمالي المواقع</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {userLocations.filter(l => l.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">مكتمل</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {userLocations.filter(l => l.status === 'in-progress').length}
            </div>
            <div className="text-sm text-gray-600">جاري</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-400">
              {userLocations.filter(l => !l.status || l.status === 'not-started').length}
            </div>
            <div className="text-sm text-gray-600">لم يبدأ</div>
          </div>
        </div>
      </div>
    </div>
  );
}