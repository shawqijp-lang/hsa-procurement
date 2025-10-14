import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Building2, Plus, CheckCircle2, AlertCircle, User, Key, FileText } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const createCompanySchema = z.object({
  nameAr: z.string().min(2, 'اسم الشركة باللغة العربية مطلوب (حد أدنى حرفان)'),
  nameEn: z.string().min(2, 'اسم الشركة باللغة الإنجليزية مطلوب (حد أدنى حرفان)'),
  description: z.string().optional(),
  managerFullName: z.string().min(2, 'اسم المدير الكامل مطلوب (حد أدنى حرفان)'),
  managerUsername: z.string().min(3, 'اسم المستخدم مطلوب (حد أدنى 3 أحرف)').regex(/^[a-zA-Z0-9_-]+$/, 'اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام فقط'),
  managerPassword: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
});

type CreateCompanyForm = z.infer<typeof createCompanySchema>;

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
}

export default function AddCompanyNew() {
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>([
    {
      id: 'company',
      title: 'إنشاء الشركة',
      description: 'إنشاء سجل الشركة الجديدة في النظام',
      icon: <Building2 className="h-5 w-5" />,
      completed: false
    },
    {
      id: 'manager',
      title: 'إنشاء حساب المدير',
      description: 'إنشاء حساب المدير الأول للشركة',
      icon: <User className="h-5 w-5" />,
      completed: false
    },
    {
      id: 'permissions',
      title: 'نسخ الصلاحيات',
      description: 'نسخ صلاحيات المدير من القالب المرجعي للشركات',
      icon: <Key className="h-5 w-5" />,
      completed: false
    },
    {
      id: 'settings',
      title: 'نسخ الإعدادات',
      description: 'نسخ إعدادات الصفحة الرئيسية والقوائم والأدوار',
      icon: <FileText className="h-5 w-5" />,
      completed: false
    }
  ]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateCompanyForm>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: {
      nameAr: '',
      nameEn: '',
      description: '',
      managerFullName: '',
      managerUsername: '',
      managerPassword: '',
    },
  });

  const updateStepProgress = (stepId: string, completed: boolean) => {
    setSetupSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, completed } : step
    ));
    
    if (completed) {
      const completedSteps = setupSteps.filter(step => step.completed).length + 1;
      const newProgress = (completedSteps / setupSteps.length) * 100;
      setProgress(newProgress);
    }
  };

  const createCompanyMutation = useMutation({
    mutationFn: async (data: CreateCompanyForm) => {
      setIsCreating(true);
      setProgress(0);
      
      // Step 1: Create company
      setCurrentStep('إنشاء الشركة...');
      updateStepProgress('company', false);
      
      const response = await apiRequest('/api/enhanced-gm/companies/complete-setup', 'POST', data);
      
      updateStepProgress('company', true);
      
      // Simulate progressive steps for better UX
      setTimeout(() => {
        setCurrentStep('إنشاء حساب المدير...');
        updateStepProgress('manager', true);
      }, 500);
      
      setTimeout(() => {
        setCurrentStep('نسخ الصلاحيات...');
        updateStepProgress('permissions', true);
      }, 1000);
      
      setTimeout(() => {
        setCurrentStep('نسخ الإعدادات...');
        updateStepProgress('settings', true);
      }, 1500);
      
      return response;
    },
    onSuccess: (result) => {
      setTimeout(() => {
        setIsCreating(false);
        setProgress(100);
        setCurrentStep('تم بنجاح!');
        
        toast({
          title: "تم إنشاء الشركة بنجاح!",
          description: `شركة "${result.nameAr}" تم إنشاؤها مع حساب المدير وجميع الإعدادات`,
          duration: 5000,
        });
        
        // Reset form
        form.reset();
        
        // Refresh companies list
        queryClient.invalidateQueries({ queryKey: ['/api/enhanced-gm/companies'] });
      }, 2000);
    },
    onError: (error: any) => {
      setIsCreating(false);
      setProgress(0);
      setCurrentStep('');
      
      // Reset steps
      setSetupSteps(prev => prev.map(step => ({ ...step, completed: false })));
      
      toast({
        title: "فشل في إنشاء الشركة",
        description: error.message || "حدث خطأ غير متوقع أثناء إنشاء الشركة",
        variant: "destructive",
        duration: 8000,
      });
    },
  });

  const onSubmit = (data: CreateCompanyForm) => {
    createCompanyMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              إضافة شركة جديدة
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              إنشاء شركة جديدة مع نسخ الإعدادات من الشركة المرجعية
            </p>
          </div>
          <Building2 className="h-8 w-8 text-green-600" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Card */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <Plus className="h-5 w-5" />
              <span>بيانات الشركة الجديدة</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Company Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center space-x-2 space-x-reverse">
                    <Building2 className="h-4 w-4" />
                    <span>معلومات الشركة</span>
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="nameAr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم الشركة (عربي) *</FormLabel>
                        <FormControl>
                          <Input placeholder="أدخل اسم الشركة بالعربية" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nameEn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم الشركة (إنجليزي) *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter company name in English" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>وصف الشركة</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="أدخل وصف مختصر للشركة ونشاطها..."
                            className="min-h-[80px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Manager Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center space-x-2 space-x-reverse">
                    <User className="h-4 w-4" />
                    <span>معلومات المدير الأول</span>
                  </h3>

                  <FormField
                    control={form.control}
                    name="managerFullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الاسم الكامل للمدير *</FormLabel>
                        <FormControl>
                          <Input placeholder="أدخل الاسم الكامل للمدير" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="managerUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم المستخدم للمدير *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="أدخل اسم المستخدم (أحرف إنجليزية وأرقام فقط)" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="managerPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>كلمة مرور المدير *</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="أدخل كلمة مرور قوية (6 أحرف على الأقل)"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>جاري الإنشاء...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Plus className="h-4 w-4" />
                      <span>إنشاء الشركة</span>
                    </div>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Progress Card */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <CheckCircle2 className="h-5 w-5" />
              <span>تقدم عملية الإنشاء</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isCreating && (
              <div className="space-y-4">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                  {currentStep}
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              {setupSteps.map((step) => (
                <div key={step.id} className="flex items-start space-x-3 space-x-reverse">
                  <div className={`flex-shrink-0 p-2 rounded-full ${
                    step.completed 
                      ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' 
                      : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                  }`}>
                    {step.completed ? <CheckCircle2 className="h-4 w-4" /> : step.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-medium ${
                      step.completed 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {step.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            {!isCreating && progress === 0 && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-start space-x-3 space-x-reverse">
                  <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200">
                      ملاحظة مهمة
                    </h4>
                    <p className="text-blue-600 dark:text-blue-300 mt-1">
                      سيتم نسخ جميع الإعدادات والصلاحيات من "الشركة المرجعية" 
                      تلقائياً، بما في ذلك صلاحيات المدراء وإعدادات لوحة التحكم والقوائم الإدارية.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}