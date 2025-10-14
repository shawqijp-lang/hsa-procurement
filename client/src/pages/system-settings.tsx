import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Settings, Shield, Eye, EyeOff, Info, Code, Calendar, User, Building2, Globe, Smartphone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
// الواردات التقنية مخفية لتبسيط واجهة المستخدم
// import { LocalDatabaseManager } from '@/components/LocalDatabaseManager';
// import { AdvancedLocalDatabaseManager } from '@/components/AdvancedLocalDatabaseManager';
// import { UnifiedStorageSystemManager } from '@/components/UnifiedStorageSystemManager';

export default function SystemSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  
  // استدعاء معلومات الإصدار من الخادم
  const { data: versionInfo, isLoading: isVersionLoading } = useQuery({
    queryKey: ['/api/version'],
    queryFn: async () => {
      const response = await apiRequest('/api/version', 'GET');
      return response;
    }
  });

  // استدعاء معلومات الشركة الحالية للمستخدم
  const { data: companiesData, isLoading: isCompanyLoading } = useQuery({
    queryKey: ['/api/companies'],
    queryFn: async () => {
      const response = await apiRequest('/api/companies', 'GET');
      return response;
    },
    enabled: !!user?.companyId // تشغيل الاستعلام فقط عند وجود معرف الشركة
  });

  // استخراج معلومات الشركة الحالية من القائمة
  const currentCompany = companiesData?.find((company: any) => company.id === user?.companyId);
  
  // الإعدادات المحلية (مزالة لأنها غير فعالة)
  
  // حالة تغيير كلمة المرور
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // تغيير كلمة المرور
  const changePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordData) => {
      return await apiRequest('/api/user/change-password', 'PUT', data);
    },
    onSuccess: () => {
      toast({
        title: "✅ تم تغيير كلمة المرور",
        description: "تم تغيير كلمة المرور بنجاح",
      });
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ خطأ في تغيير كلمة المرور",
        description: error.message || "حدث خطأ أثناء تغيير كلمة المرور",
        variant: "destructive",
      });
    },
  });

  const handlePasswordChange = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "❌ خطأ في البيانات",
        description: "يرجى ملء جميع الحقول",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "❌ خطأ في التأكيد",
        description: "كلمة المرور الجديدة وتأكيدها غير متطابقين",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "❌ كلمة مرور ضعيفة",
        description: "يجب أن تكون كلمة المرور 6 أحرف على الأقل",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate(passwordData);
  };

  const tabs = [
    {
      id: 'general',
      title: 'معلومات النظام',
      icon: Settings,
    },
    {
      id: 'password',
      title: 'تغيير كلمة المرور',
      icon: Shield,
    },
    // الأقسام المدموجة: الإعدادات العامة + المظهر = قسم واحد
    // الأقسام التقنية المخفية لتبسيط واجهة المستخدم:
    // - النظام المحلي (تقني جداً)
    // - APK Database (للمطورين)  
    // - النظام الموحد (إدارة متقدمة)
  ];

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center">
          <Settings className="h-6 w-6 text-black" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">إعدادات النظام</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">الإعدادات الأساسية والمفيدة للمستخدم العادي</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-black"
              >
                <IconComponent className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.title}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* الإعدادات العامة - مبسطة */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-yellow-500" />
                معلومات النظام
              </CardTitle>
              <CardDescription>
                معلومات أساسية عن النظام والحساب الحالي
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* معلومات التطبيق الاحترافية */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-sm relative">
                    <Building2 className="h-8 w-8 text-black" />
                    {/* شارة الإصدار */}
                    <div className="absolute -top-2 -right-2 bg-black text-yellow-400 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                      v{isVersionLoading ? '...' : (versionInfo?.version || '1.0.0')}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-black dark:text-white">HSA GROUP</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      نظام إدارة وتقييم بيئة العمل الشامل - {currentCompany?.nameEn || 'HSA GROUP'}
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mt-1">
                      {isCompanyLoading ? 'جاري التحميل...' : (currentCompany?.nameAr || 'هائل سعيد أنعم وشركاه')}
                    </p>
                  </div>
                </div>

                {/* معلومات الإصدار الأساسية فقط */}
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Code className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium text-black dark:text-white">معلومات الإصدار</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-gray-300">الإصدار الحالي:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                      <span className="font-mono bg-black text-yellow-400 px-3 py-1.5 rounded-full text-sm font-bold">
                        {isVersionLoading ? '...' : `v${versionInfo?.version || '1.0.0'}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* معلومات المطور */}
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium text-black dark:text-white">معلومات المطور</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                      <Code className="h-5 w-5 text-black" />
                    </div>
                    <div>
                      <p className="font-semibold text-black dark:text-white font-mono">Shawqi.jpry</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300">مطور النظم المتقدمة - أخصائي تطوير تطبيقات الويب</p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Full-Stack Developer & System Architect</p>
                    </div>
                  </div>
                </div>


              </div>

              {/* معلومات المستخدم الحالي */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">معلومات المستخدم الحالي</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">المستخدم الحالي:</span>
                    <span className="mr-2">{user?.fullName || user?.username}</span>
                  </div>
                  <div>
                    <span className="font-medium">اللغة:</span>
                    <span className="mr-2">العربية</span>
                  </div>
                  <div>
                    <span className="font-medium">المنطقة الزمنية:</span>
                    <span className="mr-2">توقيت الرياض</span>
                  </div>
                  <div>
                    <span className="font-medium">الدور:</span>
                    <span className="mr-2">
                      {user?.role === 'admin' ? 'مدير' : 
                       user?.role === 'supervisor' ? 'مشرف' : 
                       user?.role === 'enhanced_general_manager' ? 'مدير بيئة العمل' :
                       'مستخدم'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* قسم المظهر القديم المزال */}
        <TabsContent value="appearance-old-removed" className="space-y-6">
          {/* القسم القديم المزال */}
        </TabsContent>

        {/* الأقسام التقنية مخفية لتبسيط واجهة المستخدم */}

        {/* تغيير كلمة المرور */}
        <TabsContent value="password" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-yellow-500" />
                تغيير كلمة المرور
              </CardTitle>
              <CardDescription>
                تحديث كلمة المرور الخاصة بحساب {user?.fullName || user?.username}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* كلمة المرور الحالية */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="أدخل كلمة المرور الحالية"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  >
                    {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* كلمة المرور الجديدة */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="أدخل كلمة المرور الجديدة"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  >
                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* تأكيد كلمة المرور الجديدة */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="أعد إدخال كلمة المرور الجديدة"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* زر تغيير كلمة المرور */}
              <div className="pt-4">
                <Button
                  onClick={handlePasswordChange}
                  disabled={changePasswordMutation.isPending}
                  className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-medium"
                >
                  {changePasswordMutation.isPending ? "جاري التغيير..." : "تغيير كلمة المرور"}
                </Button>
              </div>

              {/* نصائح الأمان */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">نصائح لكلمة مرور قوية:</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• استخدم على الأقل 8 أحرف</li>
                  <li>• امزج بين الأحرف الكبيرة والصغيرة</li>
                  <li>• أضف أرقام ورموز خاصة</li>
                  <li>• تجنب استخدام معلومات شخصية</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}