import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import ImprovedExecutiveDashboard from '@/components/enhanced-general-manager/ImprovedExecutiveDashboard';

import AddCompanyNew from '@/components/enhanced-general-manager/AddCompanyNew';
import ActiveCompaniesAnalytics from '@/components/enhanced-general-manager/ActiveCompaniesAnalytics';
import PasswordResetManagement from '@/components/enhanced-general-manager/PasswordResetManagement';
import AnalyticsUsersManagement from '@/components/enhanced-general-manager/AnalyticsUsersManagement';
import { KeyRound, Plus, BarChart3, Shield } from 'lucide-react';

export default function EnhancedGeneralManagerDashboard() {
  const { user, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Verify enhanced general manager role
  if (!user || (user.role !== 'enhanced_general_manager' && user.role !== 'hsa_group_admin')) {
    return (
      <Card className="max-w-md mx-auto mt-12">
        <CardContent className="text-center py-8">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            صلاحيات غير كافية
          </h3>
          <p className="text-gray-600">
            هذه الصفحة مخصصة لمدير بيئة العمل فقط
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="locations" className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-14 bg-gray-100 dark:bg-gray-800">
          <TabsTrigger value="locations" className="flex items-center space-x-2 space-x-reverse data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
            <BarChart3 className="h-4 w-4" />
            <span>لوحة القيادة التنفيذية</span>
          </TabsTrigger>
          <TabsTrigger value="managers" className="flex items-center space-x-2 space-x-reverse data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
            <KeyRound className="h-4 w-4" />
            <span>إعادة تعيين كلمات المرور</span>
          </TabsTrigger>
          <TabsTrigger value="analytics-users" className="flex items-center space-x-2 space-x-reverse data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
            <Shield className="h-4 w-4" />
            <span>مستخدمي التحليلات</span>
          </TabsTrigger>
          <TabsTrigger value="add-company" className="flex items-center space-x-2 space-x-reverse data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
            <Plus className="h-4 w-4" />
            <span>إضافة شركة</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2 space-x-reverse data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
            <BarChart3 className="h-4 w-4" />
            <span>تحليلات الشركات الفعالة</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <div className="mt-6">
          <TabsContent value="locations" className="mt-0">
            <ImprovedExecutiveDashboard />
          </TabsContent>

          <TabsContent value="managers" className="mt-0">
            <PasswordResetManagement />
          </TabsContent>

          <TabsContent value="analytics-users" className="mt-0">
            <AnalyticsUsersManagement />
          </TabsContent>

          <TabsContent value="add-company" className="mt-0">
            <AddCompanyNew />
          </TabsContent>


          <TabsContent value="analytics" className="mt-0">
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
            مدير بيئة العمل | إشراف متقدم | تحليلات ذكية | إدارة شاملة
          </p>
        </div>
      </div>
    </div>
  );
}