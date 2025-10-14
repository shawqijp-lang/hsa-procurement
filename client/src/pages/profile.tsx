import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatArabicDate } from '@/lib/date-utils';
import { User, Lock, Save, AlertTriangle, Eye, EyeOff, Shield, Clock, RefreshCw, Key, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface UserProfile {
  id: number;
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  companyId?: number;
  email?: string;
}

interface PasswordUpdateData {
  currentPassword: string;
  newPassword: string;
}

export default function Profile() {
  const [profileData, setProfileData] = useState({
    fullName: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFormValid, setIsPasswordFormValid] = useState(false);
  
  const { toast } = useToast();

  // Fetch current user data
  const { data: user, isLoading, error } = useQuery<UserProfile>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  // Update profile data when user data loads
  useEffect(() => {
    if (user) {
      setProfileData({ fullName: user.fullName || '' });
    }
  }, [user]);

  // Validate password form
  useEffect(() => {
    const isValid = 
      passwordData.currentPassword.length > 0 &&
      passwordData.newPassword.length >= 4 &&
      passwordData.confirmPassword.length > 0 &&
      passwordData.newPassword === passwordData.confirmPassword;
    
    setIsPasswordFormValid(isValid);
  }, [passwordData]);

  // Password update mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: PasswordUpdateData) => {
      return apiRequest(`/api/users/${user?.id}/password`, 'PUT', data);
    },
    onSuccess: () => {
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({
        title: "تم تحديث كلمة المرور بنجاح",
        description: "تم تغيير كلمة المرور الخاصة بك بنجاح",
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "تعذر تحديث كلمة المرور";
      toast({
        title: "خطأ في تحديث كلمة المرور",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Handle password update with comprehensive validation
  const handlePasswordUpdate = () => {
    if (!isPasswordFormValid) {
      toast({
        title: "بيانات غير صحيحة",
        description: "يرجى التأكد من صحة جميع البيانات المدخلة",
        variant: "destructive",
      });
      return;
    }

    updatePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  // Get role display text
  const getRoleText = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'مدير عام النظام';
      case 'general_manager':
        return 'مدير عام المجموعة';
      case 'enhanced_general_manager':
      case 'hsa_group_admin':
        return 'مدير بيئة العمل';
      case 'admin':
        return 'مدير';
      case 'owner':
        return 'مدير النظام';
      case 'supervisor':
        return 'مشرف';
      case 'analytics_viewer':
        return 'مشاهد التحليلات';
      case 'data_specialist':
        return 'أخصائي البيانات';
      default:
        return 'مستخدم عادي';
    }
  };

  // Get role color scheme
  const getRoleColorScheme = (role: string) => {
    switch (role) {
      case 'super_admin':
      case 'enhanced_general_manager':
      case 'hsa_group_admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'general_manager':
      case 'owner':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'supervisor':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'analytics_viewer':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'data_specialist':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Clear password form
  const clearPasswordForm = () => {
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-yellow" />
          <span className="mr-3 text-lg">جاري تحميل البيانات...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !user) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">خطأ في تحميل البيانات</h3>
              <p>تعذر تحميل بيانات المستخدم. يرجى تحديث الصفحة والمحاولة مرة أخرى.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">الإعدادات الشخصية</h1>
        <p className="text-gray-600">إدارة معلوماتك الشخصية وإعدادات الحساب</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Profile Overview */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader className="text-center">
              <div className="w-20 h-20 bg-brand-yellow rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-10 w-10 text-brand-black" />
              </div>
              <CardTitle className="text-xl">{user.fullName}</CardTitle>
              <p className="text-gray-600">@{user.username}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Badge className={`${getRoleColorScheme(user.role)} border text-sm px-3 py-1`}>
                  <Shield className="h-3 w-3 ml-1" />
                  {getRoleText(user.role)}
                </Badge>
              </div>
              
              <Separator />
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">حالة الحساب:</span>
                  <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {user.isActive ? 'مفعل' : 'معطل'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">تاريخ الإنشاء:</span>
                  <span className="text-gray-900">{formatArabicDate(user.createdAt)}</span>
                </div>
                
                {user.lastLoginAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">آخر دخول:</span>
                    <span className="text-gray-900">{formatArabicDate(user.lastLoginAt)}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">معرف المستخدم:</span>
                  <span className="text-gray-900 font-mono">#{user.id}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-brand-yellow" />
                المعلومات الشخصية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fullName">الاسم الكامل</Label>
                <Input
                  id="fullName"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="أدخل الاسم الكامل"
                  className="text-right"
                />
                <p className="text-xs text-gray-500 mt-1">هذا الاسم سيظهر في جميع أنحاء النظام</p>
              </div>
              
              <div>
                <Label htmlFor="username">اسم المستخدم</Label>
                <Input
                  id="username"
                  value={user.username}
                  disabled
                  className="bg-gray-50 text-right"
                />
                <p className="text-xs text-gray-500 mt-1">لا يمكن تغيير اسم المستخدم</p>
              </div>
              
              <div>
                <Label htmlFor="role">نوع المستخدم</Label>
                <Input
                  id="role"
                  value={getRoleText(user.role)}
                  disabled
                  className="bg-gray-50 text-right"
                />
                <p className="text-xs text-gray-500 mt-1">يحدد صلاحياتك في النظام</p>
              </div>
              
              <Button 
                className="w-full bg-gray-400 hover:bg-gray-500 text-white cursor-not-allowed"
                disabled
              >
                <Save className="h-4 w-4 ml-2" />
                حفظ التغييرات (قريباً)
              </Button>
            </CardContent>
          </Card>

          {/* Password Change */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-brand-yellow" />
                تغيير كلمة المرور
              </CardTitle>
              <p className="text-sm text-gray-600">
                تأكد من اختيار كلمة مرور قوية لحماية حسابك
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="أدخل كلمة المرور الحالية"
                    className="text-right pl-12 pr-4"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="أدخل كلمة المرور الجديدة"
                    className="text-right pl-12 pr-4"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">يجب أن تكون 4 أحرف على الأقل</p>
              </div>
              
              <div>
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="أعد إدخال كلمة المرور الجديدة"
                    className="text-right pl-12 pr-4"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {passwordData.newPassword && passwordData.confirmPassword && (
                  <div className="flex items-center mt-2">
                    {passwordData.newPassword === passwordData.confirmPassword ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 ml-1" />
                        <span className="text-xs">كلمات المرور متطابقة</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600">
                        <AlertTriangle className="h-4 w-4 ml-1" />
                        <span className="text-xs">كلمات المرور غير متطابقة</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Password Strength Indicator */}
              {passwordData.newPassword && (
                <div className="space-y-2">
                  <Label className="text-sm">قوة كلمة المرور:</Label>
                  <div className="space-y-1">
                    <div className={`flex items-center text-xs ${passwordData.newPassword.length >= 4 ? 'text-green-600' : 'text-gray-400'}`}>
                      <CheckCircle className="h-3 w-3 ml-1" />
                      4 أحرف على الأقل
                    </div>
                    <div className={`flex items-center text-xs ${/[A-Z]/.test(passwordData.newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                      <CheckCircle className="h-3 w-3 ml-1" />
                      حرف كبير واحد على الأقل (اختياري)
                    </div>
                    <div className={`flex items-center text-xs ${/[0-9]/.test(passwordData.newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                      <CheckCircle className="h-3 w-3 ml-1" />
                      رقم واحد على الأقل (اختياري)
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      disabled={!isPasswordFormValid || updatePasswordMutation.isPending}
                      className="flex-1 bg-brand-yellow hover:bg-yellow-500 text-brand-black"
                    >
                      {updatePasswordMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                      ) : (
                        <Key className="h-4 w-4 ml-2" />
                      )}
                      تحديث كلمة المرور
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-right">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        تأكيد تحديث كلمة المرور
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-right">
                        <div className="space-y-4">
                          <p className="text-gray-700">
                            هل أنت متأكد من تحديث كلمة المرور الخاصة بك؟
                          </p>
                          
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                              <div className="text-right">
                                <p className="text-orange-800 font-medium text-sm">
                                  تحذير أمني
                                </p>
                                <p className="text-orange-700 text-sm mt-1">
                                  سيتم تغيير كلمة المرور الحالية وقد تحتاج لتسجيل الدخول مرة أخرى
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="text-right">
                              <p className="text-blue-800 font-medium text-sm flex items-center">
                                <User className="h-4 w-4 ml-1" />
                                معلومات المستخدم
                              </p>
                              <div className="text-blue-700 text-sm mt-1 space-y-1">
                                <p><strong>اسم المستخدم:</strong> {user.username}</p>
                                <p><strong>الاسم الكامل:</strong> {user.fullName}</p>
                                <p><strong>الدور:</strong> {getRoleText(user.role)}</p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="text-right">
                              <p className="text-yellow-800 font-medium text-sm flex items-center">
                                <Lock className="h-4 w-4 ml-1" />
                                نصائح الأمان
                              </p>
                              <ul className="text-yellow-700 text-sm mt-1 list-disc list-inside space-y-1">
                                <li>احفظ كلمة المرور الجديدة في مكان آمن</li>
                                <li>لا تشارك كلمة المرور مع أي شخص</li>
                                <li>استخدم كلمة مرور قوية ومختلفة</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
                      <AlertDialogCancel className="w-full sm:w-auto">
                        إلغاء
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handlePasswordUpdate}
                        className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        تأكيد تحديث كلمة المرور
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Button 
                  variant="outline"
                  onClick={clearPasswordForm}
                  className="px-6"
                >
                  مسح
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}