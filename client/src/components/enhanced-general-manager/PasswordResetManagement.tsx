import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Building2, UserCheck, Shield, AlertCircle, Eye, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Company {
  id: number;
  nameAr: string;
  nameEn: string;
}

interface Manager {
  id: number;
  username: string;
  fullName: string;
  role: string;
  companyId: number;
  companyName: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  createdBy?: number;
}

export default function PasswordResetManagement() {
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset password mutation (only for managers created by Enhanced GM)
  const resetPasswordMutation = useMutation({
    mutationFn: async (managerId: number) => {
      return await apiRequest(`/api/enhanced-gm/managers/${managerId}/reset-password`, 'POST');
    },
    onSuccess: (data) => {
      // Copy password to clipboard
      navigator.clipboard.writeText(data.newPassword).then(() => {
        toast({
          title: "✅ تم إعادة تعيين كلمة المرور بنجاح",
          description: (
            <div className="space-y-3 p-2">
              <div className="text-right">
                <span className="text-sm text-gray-600">المدير: </span>
                <span className="font-medium">{data.managerName}</span>
              </div>
              
              <div className="bg-white border-2 border-gray-300 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 mb-2">كلمة المرور الجديدة:</div>
                <div className="text-2xl font-bold font-mono bg-gray-50 border border-gray-200 rounded px-4 py-2 tracking-wider select-all">
                  {data.newPassword}
                </div>
              </div>
              
              <div className="text-xs text-green-600 text-center">
                ✅ تم نسخ كلمة المرور للحافظة
              </div>
            </div>
          ),
          duration: 12000, // 12 seconds
        });
      }).catch(() => {
        toast({
          title: "✅ تم إعادة تعيين كلمة المرور بنجاح",
          description: (
            <div className="space-y-3 p-2">
              <div className="text-right">
                <span className="text-sm text-gray-600">المدير: </span>
                <span className="font-medium">{data.managerName}</span>
              </div>
              
              <div className="bg-white border-2 border-gray-300 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 mb-2">كلمة المرور الجديدة:</div>
                <div className="text-2xl font-bold font-mono bg-gray-50 border border-gray-200 rounded px-4 py-2 tracking-wider select-all">
                  {data.newPassword}
                </div>
              </div>
              
              <div className="text-xs text-orange-600 text-center">
                ⚠️ يرجى نسخ كلمة المرور يدوياً
              </div>
            </div>
          ),
          duration: 15000, // 15 seconds
        });
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في إعادة تعيين كلمة المرور",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch companies
  const { data: companies } = useQuery<Company[]>({
    queryKey: ['/api/enhanced-gm/companies'],
  });

  // Fetch managers
  const { data: managers, isLoading } = useQuery<Manager[]>({
    queryKey: ['/api/enhanced-gm/managers'],
  });

  // Filter managers to show only those created by Enhanced GM and filter by company
  const filteredManagers = managers?.filter(manager => {
    // Show managers created by Enhanced GM through the company setup process
    const isCreatedByEnhancedGM = manager.createdBy !== null && manager.createdBy !== undefined;
    const matchesCompany = selectedCompany === 'all' || manager.companyId.toString() === selectedCompany;
    
    console.log('🔍 Manager filter check:', {
      managerName: manager.fullName,
      createdBy: manager.createdBy,
      isCreatedByEnhancedGM,
      matchesCompany,
      selectedCompany
    });
    
    return isCreatedByEnhancedGM && matchesCompany;
  }) || [];

  console.log('📊 Filter results:', {
    totalManagers: managers?.length || 0,
    filteredManagers: filteredManagers.length,
    selectedCompany
  });

  const handleResetPassword = (managerId: number) => {
    resetPasswordMutation.mutate(managerId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جارٍ تحميل المدراء...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <KeyRound className="h-5 w-5 text-yellow-600" />
            <span>إعادة تعيين كلمات مرور المدراء</span>
          </CardTitle>
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="font-medium">ملاحظة أمنية:</span>
            </div>
            <p className="mt-1">
              يمكنك فقط إعادة تعيين كلمات المرور للمدراء الذين تم إنشاؤهم من خلال ميزة "إضافة شركة جديدة" في هذا النظام.
            </p>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Building2 className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">تصفية بالشركة:</span>
            </div>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="اختر الشركة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الشركات</SelectItem>
                {companies?.map((company) => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    {company.nameAr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Managers List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2 space-x-reverse">
              <UserCheck className="h-5 w-5 text-yellow-600" />
              <span>المدراء المتاحون لإعادة تعيين كلمة المرور</span>
            </div>
            <Badge variant="secondary">
              {filteredManagers.length} مدير
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredManagers.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                لا يوجد مدراء متاحون
              </h3>
              <p className="text-gray-600">
                {selectedCompany === 'all' 
                  ? 'لا يوجد مدراء متاحون لإعادة تعيين كلمة المرور. يمكنك إنشاء مدراء جدد من خلال ميزة "إضافة شركة جديدة".'
                  : 'لا يوجد مدراء متاحون في الشركة المختارة. تأكد من إنشاء مدراء جدد من خلال ميزة "إضافة شركة جديدة".'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredManagers.map((manager) => (
                <div
                  key={manager.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 space-x-reverse mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {manager.fullName}
                        </h3>
                        <Badge 
                          variant={manager.isActive ? "default" : "secondary"}
                          className={manager.isActive ? "bg-green-100 text-green-800" : ""}
                        >
                          {manager.isActive ? "نشط" : "غير نشط"}
                        </Badge>
                        <Badge variant="outline">
                          {manager.role === 'admin' ? 'مدير' : 
                           manager.role === 'supervisor' ? 'مشرف' : 
                           manager.role === 'department_manager' ? 'مدير قسم' : manager.role}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <span className="font-medium">اسم المستخدم:</span>
                          <span className="font-mono">@{manager.username}</span>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Building2 className="h-4 w-4" />
                          <span>{manager.companyName}</span>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <span className="font-medium">تاريخ الإنشاء:</span>
                          <span>{new Date(manager.createdAt).toLocaleDateString('ar-EG', { calendar: 'gregory' })}</span>
                        </div>
                        {manager.lastLogin && (
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <span className="font-medium">آخر تسجيل دخول:</span>
                            <span>{new Date(manager.lastLogin).toLocaleDateString('ar-EG', { calendar: 'gregory' })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            disabled={resetPasswordMutation.isPending || !manager.isActive}
                            variant="outline"
                            className="flex items-center space-x-2 space-x-reverse"
                          >
                            <KeyRound className="h-4 w-4" />
                            <span>
                              {resetPasswordMutation.isPending ? 'جارٍ إعادة التعيين...' : 'إعادة تعيين كلمة المرور'}
                            </span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-orange-500" />
                              تأكيد إعادة تعيين كلمة المرور - مدير الشركة
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              <div className="space-y-3">
                                <p>هل أنت متأكد من إعادة تعيين كلمة المرور للمدير التالي؟</p>
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-orange-800 font-medium">اسم المستخدم:</span>
                                    <span className="text-orange-700 font-mono">@{manager.username}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-orange-800 font-medium">الاسم الكامل:</span>
                                    <span className="text-orange-700">{manager.fullName}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-orange-800 font-medium">الشركة:</span>
                                    <span className="text-orange-700">{manager.companyName}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-orange-800 font-medium">الصلاحية:</span>
                                    <span className="text-orange-700">
                                      {manager.role === 'admin' ? 'مدير' : 
                                       manager.role === 'supervisor' ? 'مشرف' : 
                                       'مدير قسم'}
                                    </span>
                                  </div>
                                </div>
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                  <p className="text-yellow-800 font-medium text-sm">
                                    ⚠️ ستحتاج إلى إرسال كلمة المرور الجديدة للمدير المعني
                                  </p>
                                </div>
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleResetPassword(manager.id)}
                              className="bg-orange-600 hover:bg-orange-700"
                            >
                              تأكيد إعادة تعيين كلمة المرور
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardContent className="pt-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2 space-x-reverse">
              <Eye className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 mb-2">تعليمات الاستخدام:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• يتم عرض كلمة المرور الجديدة في إشعار بعد إعادة التعيين</li>
                  <li>• كلمة المرور يتم نسخها تلقائياً للحافظة لسهولة الإرسال</li>
                  <li>• تأكد من إرسال كلمة المرور للمدير المعني فوراً</li>
                  <li>• يمكن إعادة تعيين كلمة المرور للمدراء النشطين فقط</li>
                  <li>• جميع المدراء المعروضين تم إنشاؤهم من خلال ميزة إضافة الشركات الجديدة</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}