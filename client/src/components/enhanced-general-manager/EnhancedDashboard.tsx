import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Users, BarChart3, Settings, Eye, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface EnhancedGeneralManagerDashboardProps {
  user: any;
}

export function EnhancedGeneralManagerDashboard({ user }: EnhancedGeneralManagerDashboardProps) {
  const [selectedView, setSelectedView] = useState('overview');

  // استعلام بيانات الشركة المخصصة لمدير بيئة العمل
  const { data: companyData } = useQuery({
    queryKey: ['/api/enhanced-general-manager/company-overview']
  });

  // استعلام إحصائيات شاملة
  const { data: analyticsData } = useQuery({
    queryKey: ['/api/enhanced-general-manager/analytics']
  });

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header معلومات المدير العام */}
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg p-6 border border-yellow-200 dark:border-yellow-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="bg-yellow-500 p-3 rounded-full text-white">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {user.fullName}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                مدير بيئة العمل - الشؤون الإدارية الإنتاجية
              </p>
              <Badge variant="outline" className="mt-2 bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 ml-1" />
                صلاحيات محسنة نشطة
              </Badge>
            </div>
          </div>
          <div className="text-left rtl:text-right">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              آخر دخول: {new Date().toLocaleDateString('ar-EG', { calendar: 'gregory' })}
            </div>
            <div className="text-xs text-gray-500">
              الإصدار المحسن v2.0
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={selectedView} onValueChange={setSelectedView} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>نظرة عامة</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>إدارة المستخدمين</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4" />
            <span>التحليلات المتقدمة</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>الإعدادات المتقدمة</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  إجمالي المستخدمين
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {(companyData as any)?.totalUsers || 0}
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  +{(companyData as any)?.newUsersThisMonth || 0} هذا الشهر
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                  المواقع النشطة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {(companyData as any)?.activeLocations || 0}
                </div>
                <p className="text-xs text-green-600 dark:text-green-400">
                  من إجمالي {(companyData as any)?.totalLocations || 0} موقع
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  التقييمات اليومية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                  {(analyticsData as any)?.dailyEvaluations || 0}
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  اليوم: {new Date().toLocaleDateString('ar-EG', { calendar: 'gregory' })}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  معدل الأداء
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {(analyticsData as any)?.performanceRate || 0}%
                </div>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  متوسط الشهر الحالي
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-yellow-600" />
                <span>الإجراءات السريعة للمدير العام</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
                  <Users className="w-5 h-5 mb-2 text-blue-600" />
                  <span className="font-medium">إدارة المستخدمين</span>
                  <span className="text-sm text-gray-500">إضافة وتعديل المستخدمين</span>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
                  <BarChart3 className="w-5 h-5 mb-2 text-green-600" />
                  <span className="font-medium">تقارير شاملة</span>
                  <span className="text-sm text-gray-500">عرض التقارير والإحصائيات</span>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
                  <Building2 className="w-5 h-5 mb-2 text-purple-600" />
                  <span className="font-medium">إعدادات الشركة</span>
                  <span className="text-sm text-gray-500">تخصيص إعدادات النظام</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Management Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>إدارة المستخدمين - صلاحيات محسنة</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                واجهة إدارة المستخدمين المحسنة قيد التطوير...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>التحليلات المتقدمة</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                شاشة التحليلات المتقدمة قيد التطوير...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>الإعدادات المتقدمة</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                إعدادات مدير بيئة العمل قيد التطوير...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}