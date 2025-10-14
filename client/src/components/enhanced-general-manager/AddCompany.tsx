import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Building2, Plus, CheckCircle, User, MapPin, FileText, Settings } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface CreateCompanyForm {
  nameAr: string;
  nameEn: string;
  description: string;
  managerUsername: string;
  managerFullName: string;
  managerPassword: string;
}

interface CreationStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
}

export default function AddCompany() {
  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [creationSteps, setCreationSteps] = useState<CreationStep[]>([
    {
      id: 'company',
      title: 'إنشاء الشركة',
      description: 'إنشاء البيانات الأساسية للشركة',
      icon: <Building2 className="h-5 w-5" />,
      completed: false
    },
    {
      id: 'manager',
      title: 'إنشاء المدير',
      description: 'إنشاء حساب المدير الأول للشركة',
      icon: <User className="h-5 w-5" />,
      completed: false
    },
    {
      id: 'permissions',
      title: 'نسخ صلاحيات المدير',
      description: 'نسخ صلاحيات المدير من الشركة المرجعية',
      icon: <FileText className="h-5 w-5" />,
      completed: false
    },
    {
      id: 'dashboard',
      title: 'نسخ إعدادات الصفحة الرئيسية',
      description: 'نسخ قوائم وإعدادات الصفحة الرئيسية',
      icon: <MapPin className="h-5 w-5" />,
      completed: false
    },
    {
      id: 'roles',
      title: 'نسخ أدوار المستخدمين',
      description: 'نسخ جميع أدوار المستخدمين وإعدادات القوائم',
      icon: <Settings className="h-5 w-5" />,
      completed: false
    }
  ]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateCompanyForm>({
    defaultValues: {
      nameAr: '',
      nameEn: '',
      description: '',
      managerUsername: '',
      managerFullName: '',
      managerPassword: ''
    }
  });

  // Create company mutation
  const createCompanyMutation = useMutation({
    mutationFn: async (data: CreateCompanyForm) => {
      setIsCreating(true);
      setCreationProgress(0);
      
      // Simulate step-by-step creation process
      const steps = [...creationSteps];
      
      try {
        // Step 1: Create company
        setCurrentStep(0);
        setCreationProgress(20);
        const companyResponse = await apiRequest('/api/enhanced-gm/companies/complete-setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nameAr: data.nameAr,
            nameEn: data.nameEn,
            description: data.description,
            managerUsername: data.managerUsername,
            managerFullName: data.managerFullName,
            managerPassword: data.managerPassword
          }),
        });
        
        steps[0].completed = true;
        setCreationSteps([...steps]);
        
        // All steps are now handled by the complete-setup endpoint
        // Just simulate the progress updates for UI feedback
        
        // Step 2: Create manager
        setCurrentStep(1);
        setCreationProgress(25);
        await new Promise(resolve => setTimeout(resolve, 800));
        steps[1].completed = true;
        setCreationSteps([...steps]);

        // Step 3: Copy manager permissions
        setCurrentStep(2);
        setCreationProgress(50);
        await new Promise(resolve => setTimeout(resolve, 800));
        steps[2].completed = true;
        setCreationSteps([...steps]);

        // Step 4: Copy dashboard settings
        setCurrentStep(3);
        setCreationProgress(75);
        await new Promise(resolve => setTimeout(resolve, 800));
        steps[3].completed = true;
        setCreationSteps([...steps]);

        // Step 5: Copy user roles and menu settings
        setCurrentStep(4);
        setCreationProgress(100);
        await new Promise(resolve => setTimeout(resolve, 800));
        steps[4].completed = true;
        setCreationSteps([...steps]);
        
        return companyResponse;
        
      } catch (error) {
        setIsCreating(false);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "تم إنشاء الشركة بنجاح",
        description: `تم إنشاء شركة "${data.nameAr}" وإعدادها بالكامل`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/enhanced-gm/companies'] });
      setIsCreating(false);
      form.reset();
      
      // Reset creation steps
      const resetSteps = creationSteps.map(step => ({
        ...step,
        completed: false
      }));
      setCreationSteps(resetSteps);
      setCreationProgress(0);
      setCurrentStep(0);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في إنشاء الشركة",
        description: error.message || "حدث خطأ أثناء إنشاء الشركة",
        variant: "destructive",
      });
      setIsCreating(false);
    },
  });

  const onSubmit = (data: CreateCompanyForm) => {
    createCompanyMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              إضافة شركة جديدة
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              إنشاء شركة جديدة بإعدادات جاهزة ومدير مخصص
            </p>
          </div>
          <Building2 className="h-8 w-8 text-green-600" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Creation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <Plus className="h-5 w-5" />
              <span>بيانات الشركة الجديدة</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">معلومات الشركة</h3>
                  
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
                            placeholder="وصف مختصر عن الشركة ونشاطها"
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold text-gray-900 dark:text-white">معلومات المدير</h3>
                  
                  <FormField
                    control={form.control}
                    name="managerFullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم المدير الكامل *</FormLabel>
                        <FormControl>
                          <Input placeholder="أدخل اسم المدير الكامل" {...field} />
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
                        <FormLabel>اسم مستخدم المدير *</FormLabel>
                        <FormControl>
                          <Input placeholder="أدخل اسم المستخدم" {...field} />
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
                            placeholder="أدخل كلمة المرور" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-4">
                  <Button 
                    type="submit" 
                    disabled={isCreating}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isCreating ? 'جاري الإنشاء...' : 'إنشاء الشركة'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Creation Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <Settings className="h-5 w-5" />
              <span>تقدم عملية الإنشاء</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isCreating && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>التقدم العام</span>
                    <span>{creationProgress}%</span>
                  </div>
                  <Progress value={creationProgress} className="h-2" />
                </div>
                
                <div className="text-sm text-gray-600">
                  الخطوة الحالية: {creationSteps[currentStep]?.title}
                </div>
              </div>
            )}

            <div className="space-y-3 mt-6">
              <h3 className="font-semibold text-gray-900 dark:text-white">خطوات الإنشاء:</h3>
              
              {creationSteps.map((step, index) => (
                <div 
                  key={step.id} 
                  className={`flex items-center space-x-3 space-x-reverse p-3 rounded-lg ${
                    step.completed 
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                      : currentStep === index && isCreating
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                      : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className={`p-2 rounded-full ${
                    step.completed 
                      ? 'bg-green-500 text-white' 
                      : currentStep === index && isCreating
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}>
                    {step.completed ? <CheckCircle className="h-4 w-4" /> : step.icon}
                  </div>
                  
                  <div className="flex-1">
                    <div className={`font-medium ${
                      step.completed ? 'text-green-800' : 'text-gray-900 dark:text-white'
                    }`}>
                      {step.title}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {step.description}
                    </div>
                  </div>
                  
                  {step.completed && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
              ))}
            </div>

            {!isCreating && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  ما سيتم إنشاؤه:
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• بيانات الشركة الأساسية</li>
                  <li>• حساب مدير مع صلاحيات كاملة</li>
                  <li>• قوالب التقييم الافتراضية</li>
                  <li>• هيكل المواقع الجاهز للاستخدام</li>
                  <li>• الإعدادات والتخصيصات الأساسية</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}