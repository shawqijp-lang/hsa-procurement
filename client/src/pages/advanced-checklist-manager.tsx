import { useState, useEffect, useMemo } from "react";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, MapPin } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Building, 
  FileText,
  Save,
  X,
  Clock,
  CheckCircle,
  AlertTriangle,
  Layers
} from "lucide-react";
import { useAuth } from '@/hooks/useAuth';

// Types
interface Location {
  id: number;
  nameAr: string;
  nameEn: string;
  icon: string;
  isActive: boolean;
}

interface MultiTask {
  ar: string;
  en: string;
}

interface ChecklistTemplate {
  id: number;
  locationId: number;
  categoryAr: string;
  categoryEn: string;
  taskAr: string;
  taskEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  multiTasks?: MultiTask[];
  isActive: boolean;
}

interface NewTemplateForm {
  locationId: number;
  categoryAr: string;
  categoryEn: string;
  taskAr: string;
  taskEn: string;
  descriptionAr: string;
  descriptionEn: string;
  multiTasks: MultiTask[];
}

// Icon mapping
const iconMap = {
  building: Building,
  // Add more icons as needed
};

const initialForm: NewTemplateForm = {
  locationId: 0,
  categoryAr: "",
  categoryEn: "",
  taskAr: "",
  taskEn: "",
  descriptionAr: "",
  descriptionEn: "",
  multiTasks: [{ ar: "", en: "" }]
};

export default function AdvancedChecklistManager() {
  const { user } = useAuth();
  
  // States
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState<NewTemplateForm>(initialForm);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<number>(0);

  const queryClient = useQueryClient();

  // Fetch locations using the correct locations endpoint
  const { 
    data: locations = [], 
    refetch: refetchLocations,
    isLoading: locationsLoading,
    error: locationsError 
  } = useQuery<Location[]>({
    queryKey: ['/api/locations'], // Using correct locations endpoint
    queryFn: () => apiRequest('/api/locations', 'GET'),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 2,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Fetch templates with automatic refresh and proper typing - now with apiRequest + حفظ في ذاكرة الهاتف
  const { 
    data: templates = [], 
    isLoading: templatesLoading, 
    refetch: refetchTemplates,
    error: templatesError 
  } = useQuery<ChecklistTemplate[]>({
    queryKey: ['/api/checklist-templates'],
    queryFn: async () => {
      try {
        const data = await apiRequest('/api/checklist-templates', 'GET');
        
        // 📱 حفظ القوالب في نفس مسار المواقع
        if (data && Array.isArray(data)) {
          try {
            console.log('📱 حفظ قوالب التشييك في ذاكرة الهاتف...', data.length, 'قالب');
            
            const dataToSave = {
              templates: data,
              timestamp: Date.now(),
              source: 'checklist-manager'
            };
            
            const { saveToPhone } = await import('@/lib/simplePhoneStorage');
            await saveToPhone('dashboard_templates', dataToSave, user?.id);
            console.log('✅ تم حفظ قوالب التشييك بنجاح في ذاكرة الهاتف');
          } catch (cacheError) {
            console.warn('⚠️ فشل في حفظ القوالب:', cacheError);
          }
        }
        
        return data;
      } catch (apiError) {
        console.warn('⚠️ فشل في جلب القوالب من API، محاولة الاسترجاع من ذاكرة الهاتف...');
        
        // استرجاع من ذاكرة الهاتف في حالة فشل API
        try {
          const { getFromPhone } = await import('@/lib/simplePhoneStorage');
          const savedData = await getFromPhone('dashboard_templates', user?.id);
          
          if (savedData && savedData.templates && Array.isArray(savedData.templates)) {
            console.log('📱 تم استرجاع', savedData.templates.length, 'قالب محفوظ');
            return savedData.templates;
          }
        } catch (retrieveError) {
          console.warn('⚠️ فشل استرجاع القوالب المحفوظة:', retrieveError);
        }
        
        throw apiError; // إعادة رمي الخطأ إذا فشل كل شيء
      }
    },
    staleTime: 0, // Always consider data stale to ensure fresh data
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes (gcTime replaces cacheTime in v5)
    retry: 2,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Create template mutation with enhanced cache invalidation + تحديث ذاكرة الهاتف
  const createTemplateMutation = useMutation({
    mutationFn: (templateData: Omit<ChecklistTemplate, 'id'>) =>
      apiRequest('/api/checklist-templates', 'POST', templateData),
    onSuccess: async () => {
      // Invalidate both templates and locations cache to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-templates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      
      // Force refresh of both queries
      refetchTemplates();
      refetchLocations();
      
      // 📱 تحديث ذاكرة الهاتف بعد الإنشاء
      try {
        const updatedData = await apiRequest('/api/checklist-templates', 'GET');
        const { saveToPhone } = await import('@/lib/simplePhoneStorage');
        const dataToSave = {
          templates: updatedData,
          timestamp: Date.now(),
          source: 'create-template'
        };
        await saveToPhone('dashboard_templates', dataToSave, user?.id);
        console.log('📱 تم تحديث قوالب التشييك في ذاكرة الهاتف بعد الإنشاء');
      } catch (updateError) {
        console.warn('⚠️ فشل تحديث ذاكرة الهاتف بعد إنشاء القالب:', updateError);
      }
      
      toast({
        title: "تم إنشاء القائمة بنجاح",
        description: "تم إضافة قائمة التشييك الجديدة وتحديث قائمة المواقع",
        className: "bg-green-500 text-white",
      });
      setIsAddDialogOpen(false);
      setNewTemplate(initialForm);
    },
    onError: (error) => {
      console.error('Error creating template:', error);
      toast({
        title: "خطأ في الإنشاء",
        description: "فشل في إنشاء قائمة التشييك",
        variant: "destructive",
      });
    },
  });

  // Update template mutation with enhanced cache invalidation + تحديث ذاكرة الهاتف
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, templateData }: { id: number; templateData: Partial<ChecklistTemplate> }) =>
      apiRequest(`/api/checklist-templates/${id}`, 'PUT', templateData),
    onSuccess: async () => {
      // Invalidate both templates and locations cache
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-templates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      
      // 📱 تحديث ذاكرة الهاتف بعد التعديل
      try {
        const updatedData = await apiRequest('/api/checklist-templates', 'GET');
        const { saveToPhone } = await import('@/lib/simplePhoneStorage');
        const dataToSave = {
          templates: updatedData,
          timestamp: Date.now(),
          source: 'update-template'
        };
        await saveToPhone('dashboard_templates', dataToSave, user?.id);
        console.log('📱 تم تحديث قوالب التشييك في ذاكرة الهاتف بعد التعديل');
      } catch (updateError) {
        console.warn('⚠️ فشل تحديث ذاكرة الهاتف بعد تعديل القالب:', updateError);
      }
      
      // Force refresh to ensure UI shows latest data
      refetchTemplates();
      refetchLocations();
      
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث قائمة التشييك وبيانات المواقع",
        className: "bg-green-500 text-white",
      });
      setIsEditDialogOpen(false);
      setEditingTemplate(null);
    },
    onError: (error) => {
      console.error('Error updating template:', error);
      toast({
        title: "خطأ في التحديث",
        description: "فشل في تحديث قائمة التشييك",
        variant: "destructive",
      });
    },
  });

  // Delete template mutation with enhanced cache invalidation + تحديث ذاكرة الهاتف
  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/checklist-templates/${id}`, 'DELETE'),
    onSuccess: async () => {
      // Invalidate both templates and locations cache
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-templates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      
      // Force refresh to ensure UI reflects deletion
      refetchTemplates();
      refetchLocations();
      
      // 📱 تحديث ذاكرة الهاتف بعد الحذف
      try {
        const updatedData = await apiRequest('/api/checklist-templates', 'GET');
        const { saveToPhone } = await import('@/lib/simplePhoneStorage');
        const dataToSave = {
          templates: updatedData,
          timestamp: Date.now(),
          source: 'delete-template'
        };
        await saveToPhone('dashboard_templates', dataToSave, user?.id);
        console.log('📱 تم تحديث قوالب التشييك في ذاكرة الهاتف بعد الحذف');
      } catch (updateError) {
        console.warn('⚠️ فشل تحديث ذاكرة الهاتف بعد حذف القالب:', updateError);
      }
      
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف قائمة التشييك وتحديث بيانات المواقع",
        className: "bg-green-500 text-white",
      });
    },
    onError: (error) => {
      console.error('Error deleting template:', error);
      toast({
        title: "خطأ في الحذف",
        description: "فشل في حذف قائمة التشييك",
        variant: "destructive",
      });
    },
  });

  // Filter templates by location with type safety
  const filteredTemplates = React.useMemo(() => {
    const safeTemplates = Array.isArray(templates) ? templates : [];
    return selectedLocationId === 0 
      ? safeTemplates
      : safeTemplates.filter((template: ChecklistTemplate) => template.locationId === selectedLocationId);
  }, [templates, selectedLocationId]);

  // Handle functions
  const handleCreateTemplate = () => {
    if (!newTemplate.locationId || !newTemplate.categoryAr || !newTemplate.taskAr) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    const validMultiTasks = newTemplate.multiTasks.filter(task => task.ar.trim() !== "");
    
    console.log('📝 Creating new template:', {
      ...newTemplate,
      multiTasks: validMultiTasks,
      multiTasksCount: validMultiTasks.length
    });

    createTemplateMutation.mutate({
      locationId: newTemplate.locationId,
      categoryAr: newTemplate.categoryAr,
      categoryEn: newTemplate.categoryEn,
      taskAr: newTemplate.taskAr,
      taskEn: newTemplate.taskEn,
      descriptionAr: newTemplate.descriptionAr,
      descriptionEn: newTemplate.descriptionEn,
      multiTasks: validMultiTasks,
      isActive: true
    });
  };

  const handleEditTemplate = (template: ChecklistTemplate) => {
    console.log('🔧 Opening edit dialog for template:', {
      id: template.id,
      taskAr: template.taskAr,
      multiTasks: template.multiTasks,
      multiTasksLength: template.multiTasks?.length || 0
    });

    setEditingTemplate({
      ...template,
      multiTasks: template.multiTasks || []
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateTemplate = () => {
    if (!editingTemplate) return;

    const validMultiTasks = editingTemplate.multiTasks?.filter(task => task.ar.trim() !== "") || [];
    
    console.log('💾 Updating template:', {
      id: editingTemplate.id,
      multiTasks: validMultiTasks,
      multiTasksCount: validMultiTasks.length
    });

    updateTemplateMutation.mutate({
      id: editingTemplate.id,
      templateData: {
        categoryAr: editingTemplate.categoryAr,
        categoryEn: editingTemplate.categoryEn,
        taskAr: editingTemplate.taskAr,
        taskEn: editingTemplate.taskEn,
        descriptionAr: editingTemplate.descriptionAr,
        descriptionEn: editingTemplate.descriptionEn,
        isActive: editingTemplate.isActive,
        multiTasks: validMultiTasks
      }
    });
  };

  const handleDeleteTemplate = (id: number) => {
    console.log('🗑️ Deleting template:', id);
    deleteTemplateMutation.mutate(id);
  };

  // Multi-task handlers for new template
  const addMultiTask = () => {
    setNewTemplate({
      ...newTemplate,
      multiTasks: [...newTemplate.multiTasks, { ar: "", en: "" }]
    });
  };

  const removeMultiTask = (index: number) => {
    const updatedMultiTasks = newTemplate.multiTasks.filter((_, i) => i !== index);
    setNewTemplate({
      ...newTemplate,
      multiTasks: updatedMultiTasks.length > 0 ? updatedMultiTasks : [{ ar: "", en: "" }]
    });
  };

  const updateMultiTask = (index: number, field: 'ar' | 'en', value: string) => {
    const updatedMultiTasks = [...newTemplate.multiTasks];
    updatedMultiTasks[index] = { ...updatedMultiTasks[index], [field]: value };
    setNewTemplate({
      ...newTemplate,
      multiTasks: updatedMultiTasks
    });
  };

  // Multi-task handlers for edit template
  const addEditMultiTask = () => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      multiTasks: [...(editingTemplate.multiTasks || []), { ar: "", en: "" }]
    });
  };

  const removeEditMultiTask = (index: number) => {
    if (!editingTemplate) return;
    const updatedMultiTasks = editingTemplate.multiTasks?.filter((_, i) => i !== index) || [];
    setEditingTemplate({
      ...editingTemplate,
      multiTasks: updatedMultiTasks
    });
  };

  const updateEditMultiTask = (index: number, field: 'ar' | 'en', value: string) => {
    if (!editingTemplate) return;
    const updatedMultiTasks = [...(editingTemplate.multiTasks || [])];
    updatedMultiTasks[index] = { ...updatedMultiTasks[index], [field]: value };
    setEditingTemplate({
      ...editingTemplate,
      multiTasks: updatedMultiTasks
    });
  };

  // Debug logging for data issues
  useEffect(() => {
    console.log('🔍 Advanced Checklist Manager Debug:', {
      locationsCount: locations?.length || 0,
      templatesCount: templates?.length || 0,
      locationsLoading,
      templatesLoading,
      locationsError: locationsError?.message,
      templatesError: templatesError?.message,
      locationsData: locations?.slice(0, 3), // Show first 3 for debugging
      selectedLocationId
    });
  }, [locations, templates, locationsLoading, templatesLoading, locationsError, templatesError, selectedLocationId]);

  // Auto-refresh when component mounts or when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Page visible - refreshing data...');
        refetchLocations();
        refetchTemplates();
      }
    };

    const handleFocus = () => {
      console.log('🎯 Page focused - refreshing data...');
      refetchLocations();
      refetchTemplates();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refetchLocations, refetchTemplates]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-black mb-2">
            إدارة قوائم التشييك المتطورة
          </h1>
          <p className="text-gray-600">
            إنشاء وتعديل قوائم التشييك مع المهام الفرعية
          </p>
        </div>
        
        <div className="flex items-center justify-center">
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-brand-yellow hover:bg-yellow-500 text-brand-black font-semibold"
          >
            <Plus className="h-4 w-4 ml-2" />
            إضافة قائمة جديدة
          </Button>
        </div>
      </div>

      {/* Enhanced Location Filter */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="text-center">
              <Label className="text-lg font-semibold mb-3 block text-brand-black">
                فلترة حسب الموقع
              </Label>
              <p className="text-sm text-gray-600 mb-4">
                اختر موقعاً لعرض قوائم التشييك الخاصة به
              </p>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="w-full max-w-lg">
                {/* Advanced Collapsible Location Picker (Same as Reports Page) */}
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full h-12 justify-between text-right border-2 border-gray-200 hover:border-brand-yellow focus:border-brand-yellow transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-brand-black" />
                        <span className="font-medium">
                          {selectedLocationId === 0 
                            ? `جميع المواقع (${Array.isArray(templates) ? templates.length : 0} قائمة)`
                            : Array.isArray(locations) 
                              ? locations.find((l: Location) => l.id === selectedLocationId)?.nameAr || 'غير معروف'
                              : 'غير معروف'
                          }
                        </span>
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2">
                    <div className="border rounded-md p-3 bg-white max-h-80 overflow-y-auto space-y-2 mt-2">
                      
                      {/* All Locations Option */}
                      <div 
                        className={`flex items-center space-x-2 space-x-reverse p-3 hover:bg-blue-50 rounded-lg cursor-pointer border-2 transition-all ${
                          selectedLocationId === 0 ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                        }`}
                        onClick={() => setSelectedLocationId(0)}
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 text-right">
                          <div className="font-semibold text-blue-700">جميع المواقع</div>
                          <div className="text-xs text-blue-500">عرض جميع قوائم التشييك</div>
                        </div>
                        <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                          {Array.isArray(templates) ? templates.length : 0} قائمة
                        </div>
                      </div>

                      <div className="border-t pt-2">
                        {locationsLoading ? (
                          <div className="text-sm text-brand-black text-center py-8">
                            <div className="w-6 h-6 border-2 border-brand-yellow border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            🔄 جاري تحميل المواقع...
                          </div>
                        ) : Array.isArray(locations) && locations.length > 0 ? (
                          locations.map((location: Location) => {
                            const safeTemplates = Array.isArray(templates) ? templates : [];
                            const locationTemplatesCount = safeTemplates.filter((t: ChecklistTemplate) => t.locationId === location.id).length;
                            const IconComponent = iconMap[location.icon as keyof typeof iconMap] || Building;
                            const isSelected = selectedLocationId === location.id;
                            
                            return (
                              <div 
                                key={location.id} 
                                className={`flex items-center space-x-2 space-x-reverse p-3 hover:bg-yellow-50 rounded-lg cursor-pointer border-2 transition-all ${
                                  isSelected ? 'border-brand-yellow bg-yellow-50' : 'border-gray-200'
                                }`}
                                onClick={() => setSelectedLocationId(location.id)}
                              >
                                <div className="w-10 h-10 bg-brand-yellow/20 rounded-lg flex items-center justify-center">
                                  <IconComponent className="h-5 w-5 text-brand-black" />
                                </div>
                                <div className="flex-1 text-right">
                                  <div className="font-semibold text-brand-black">{location.nameAr}</div>
                                  <div className="text-xs text-gray-500">{location.nameEn}</div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <div className="text-xs bg-brand-yellow text-brand-black px-2 py-1 rounded-full font-medium">
                                    {locationTemplatesCount} قائمة
                                  </div>
                                  <div className={`text-xs px-2 py-1 rounded-full ${location.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {location.isActive ? 'فعال' : 'غير فعال'}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-sm text-amber-600 text-center py-8 bg-amber-50 rounded">
                            {locationsError ? (
                              <>
                                ⚠️ خطأ في تحميل المواقع
                                <div className="text-xs text-gray-500 mt-1">{locationsError.message}</div>
                              </>
                            ) : (
                              <>
                                ⚠️ لا توجد مواقع متاحة لشركتك
                                <div className="text-xs text-gray-500 mt-1">تواصل مع المدير لإضافة مواقع</div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>

            {/* Selected Location Summary */}
            {selectedLocationId > 0 && (
              <div className="mt-4 p-4 bg-brand-yellow/10 rounded-lg border border-brand-yellow/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-yellow rounded-lg flex items-center justify-center">
                      <Building className="h-4 w-4 text-brand-black" />
                    </div>
                    <div>
                      <div className="font-semibold text-brand-black">
                        {Array.isArray(locations) ? locations.find((l: Location) => l.id === selectedLocationId)?.nameAr : 'غير معروف'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {Array.isArray(locations) ? locations.find((l: Location) => l.id === selectedLocationId)?.nameEn : 'Unknown'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-brand-black">
                      {filteredTemplates.length}
                    </div>
                    <div className="text-xs text-gray-600">قائمة تشييك</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      {templatesLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-semibold text-gray-600">
                جاري تحميل القوائم...
              </h3>
            </div>
          </CardContent>
        </Card>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                لا توجد قوائم تشييك
              </h3>
              <p className="text-gray-500 mb-4">
                {selectedLocationId > 0 ? "لا توجد قوائم للموقع المحدد" : "ابدأ بإنشاء قائمة جديدة"}
              </p>
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-brand-yellow hover:bg-yellow-500 text-brand-black"
              >
                <Plus className="h-4 w-4 ml-2" />
                إضافة قائمة جديدة
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredTemplates.map((template: ChecklistTemplate) => {
            const location = Array.isArray(locations) ? locations.find((l: Location) => l.id === template.locationId) : undefined;
            const IconComponent = iconMap[location?.icon as keyof typeof iconMap] || Building;
            
            return (
              <Card key={template.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-brand-yellow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header Info */}
                      <div className="flex items-center gap-3 mb-4">
                        <IconComponent className="h-6 w-6 text-brand-yellow" />
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs font-medium">
                            {template.categoryAr}
                          </Badge>
                          <Badge 
                            variant={template.isActive ? "default" : "secondary"}
                            className={`text-xs ${template.isActive ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}
                          >
                            {template.isActive ? "فعال" : "غير فعال"}
                          </Badge>
                          {template.multiTasks && template.multiTasks.length > 0 && (
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                              <Layers className="h-3 w-3 mr-1" />
                              {template.multiTasks.length} مهمة فرعية
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Main Content */}
                      <div className="space-y-3">
                        <h3 className="text-xl font-bold text-brand-black">
                          {template.taskAr}
                        </h3>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Building className="h-4 w-4" />
                          {location?.nameAr || 'موقع غير معروف'}
                        </div>
                        
                        {template.descriptionAr && (
                          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                            {template.descriptionAr}
                          </p>
                        )}
                        
                        {/* Multi-tasks Preview */}
                        {template.multiTasks && template.multiTasks.length > 0 && (
                          <div className="bg-blue-50 p-3 rounded">
                            <h4 className="text-sm font-semibold text-blue-800 mb-2">المهام الفرعية:</h4>
                            <div className="space-y-1">
                              {template.multiTasks.slice(0, 3).map((task, index) => (
                                <div key={index} className="text-sm text-blue-700">
                                  • {task.ar}
                                </div>
                              ))}
                              {template.multiTasks.length > 3 && (
                                <div className="text-xs text-blue-600 font-medium">
                                  + {template.multiTasks.length - 3} مهمة أخرى...
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                        className="hover:bg-yellow-50 hover:border-brand-yellow"
                      >
                        <Edit className="h-4 w-4 ml-1" />
                        تعديل
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 hover:border-red-200"
                          >
                            <Trash2 className="h-4 w-4 ml-1" />
                            حذف
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5" />
                              تأكيد الحذف
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-right">
                              هل أنت متأكد من حذف قائمة التشييك <strong>"{template.taskAr}"</strong>؟
                              <br /><br />
                              {template.multiTasks && template.multiTasks.length > 0 && (
                                <span className="text-orange-600">
                                  سيتم حذف {template.multiTasks.length} مهمة فرعية أيضاً.
                                  <br />
                                </span>
                              )}
                              <span className="text-red-600 font-medium">
                                ⚠️ هذا الإجراء لا يمكن التراجع عنه.
                              </span>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="bg-red-500 hover:bg-red-600 text-white"
                            >
                              <Trash2 className="h-4 w-4 ml-2" />
                              حذف نهائي
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة قائمة تشييك جديدة</DialogTitle>
            <DialogDescription>
              إنشاء قائمة تشييك مع المهام الفرعية
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="locationId">الموقع *</Label>
                {/* Advanced Collapsible Location Picker for New Template */}
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full h-10 justify-between text-right border-2 border-gray-200 hover:border-brand-yellow focus:border-brand-yellow transition-colors"
                      type="button"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-brand-black" />
                        <span className="font-medium">
                          {newTemplate.locationId === 0 
                            ? 'اختر الموقع...'
                            : Array.isArray(locations) 
                              ? locations.find((l: Location) => l.id === newTemplate.locationId)?.nameAr || 'غير معروف'
                              : 'غير معروف'
                          }
                        </span>
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2">
                    <div className="border rounded-md p-2 bg-white max-h-60 overflow-y-auto space-y-1 mt-1">
                      {locationsLoading ? (
                        <div className="text-sm text-brand-black text-center py-6">
                          <div className="w-5 h-5 border-2 border-brand-yellow border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          🔄 جاري تحميل المواقع...
                        </div>
                      ) : Array.isArray(locations) && locations.length > 0 ? (
                        locations.map((location: Location) => {
                          const IconComponent = iconMap[location.icon as keyof typeof iconMap] || Building;
                          const isSelected = newTemplate.locationId === location.id;
                          
                          return (
                            <div 
                              key={location.id} 
                              className={`flex items-center space-x-2 space-x-reverse p-2 hover:bg-yellow-50 rounded-lg cursor-pointer border transition-all ${
                                isSelected ? 'border-brand-yellow bg-yellow-50' : 'border-gray-200 hover:border-brand-yellow'
                              }`}
                              onClick={() => setNewTemplate({...newTemplate, locationId: location.id})}
                            >
                              <div className="w-8 h-8 bg-brand-yellow/20 rounded-lg flex items-center justify-center">
                                <IconComponent className="h-4 w-4 text-brand-black" />
                              </div>
                              <div className="flex-1 text-right">
                                <div className="font-semibold text-brand-black text-sm">{location.nameAr}</div>
                                <div className="text-xs text-gray-500">{location.nameEn}</div>
                              </div>
                              <div className={`text-xs px-2 py-1 rounded-full ${location.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {location.isActive ? 'فعال' : 'غير فعال'}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-sm text-amber-600 text-center py-6 bg-amber-50 rounded">
                          {locationsError ? (
                            <>
                              ⚠️ خطأ في تحميل المواقع
                              <div className="text-xs text-gray-500 mt-1">{locationsError.message}</div>
                            </>
                          ) : (
                            <>
                              ⚠️ لا توجد مواقع متاحة
                              <div className="text-xs text-gray-500 mt-1">تواصل مع المدير لإضافة مواقع</div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
              
              <div>
                <Label htmlFor="categoryAr">الفئة (عربي) *</Label>
                <Input
                  id="categoryAr"
                  value={newTemplate.categoryAr}
                  onChange={(e) => setNewTemplate({...newTemplate, categoryAr: e.target.value})}
                  placeholder="مثال: النظافة والتطهير"
                />
              </div>
              
              <div>
                <Label htmlFor="categoryEn">الفئة (إنجليزي)</Label>
                <Input
                  id="categoryEn"
                  value={newTemplate.categoryEn}
                  onChange={(e) => setNewTemplate({...newTemplate, categoryEn: e.target.value})}
                  placeholder="Example: Cleaning and Sanitization"
                />
              </div>
              
              <div>
                <Label htmlFor="taskAr">اسم المهمة (عربي) *</Label>
                <Input
                  id="taskAr"
                  value={newTemplate.taskAr}
                  onChange={(e) => setNewTemplate({...newTemplate, taskAr: e.target.value})}
                  placeholder="مثال: تنظيف المداخل والممرات"
                />
              </div>
              
              <div>
                <Label htmlFor="taskEn">اسم المهمة (إنجليزي)</Label>
                <Input
                  id="taskEn"
                  value={newTemplate.taskEn}
                  onChange={(e) => setNewTemplate({...newTemplate, taskEn: e.target.value})}
                  placeholder="Example: Clean Entrances and Corridors"
                />
              </div>
            </div>
            
            {/* Descriptions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="descriptionAr">وصف المهمة (عربي)</Label>
                <Textarea
                  id="descriptionAr"
                  value={newTemplate.descriptionAr}
                  onChange={(e) => setNewTemplate({...newTemplate, descriptionAr: e.target.value})}
                  rows={3}
                  placeholder="وصف تفصيلي للمهمة..."
                />
              </div>
              
              <div>
                <Label htmlFor="descriptionEn">وصف المهمة (إنجليزي)</Label>
                <Textarea
                  id="descriptionEn"
                  value={newTemplate.descriptionEn}
                  onChange={(e) => setNewTemplate({...newTemplate, descriptionEn: e.target.value})}
                  rows={3}
                  placeholder="Detailed task description..."
                />
              </div>
            </div>
            
            {/* Multi-tasks */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-semibold">المهام الفرعية</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMultiTask}
                  className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                >
                  <Plus className="h-4 w-4 ml-1" />
                  إضافة مهمة فرعية
                </Button>
              </div>
              
              <div className="space-y-4">
                {newTemplate.multiTasks.map((task, index) => (
                  <div key={index} className="border-2 rounded-lg p-4 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                        المهمة الفرعية #{index + 1}
                      </span>
                      {newTemplate.multiTasks.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMultiTask(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-medium text-gray-600">النص العربي *</Label>
                        <Input
                          value={task.ar}
                          onChange={(e) => updateMultiTask(index, 'ar', e.target.value)}
                          className="mt-1"
                          placeholder="مثال: تنظيف الأرضيات"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-gray-600">النص الإنجليزي</Label>
                        <Input
                          value={task.en}
                          onChange={(e) => updateMultiTask(index, 'en', e.target.value)}
                          className="mt-1"
                          placeholder="Example: Clean floors"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleCreateTemplate}
              disabled={createTemplateMutation.isPending}
              className="bg-brand-yellow hover:bg-yellow-500 text-brand-black"
            >
              {createTemplateMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 ml-2 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 ml-2" />
                  إنشاء القائمة
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل قائمة التشييك</DialogTitle>
            <DialogDescription>
              تحديث تفاصيل قائمة التشييك والمهام الفرعية
            </DialogDescription>
          </DialogHeader>
          
          {editingTemplate && (
            <div className="space-y-6">
              {/* Location Display */}
              <div>
                <Label>الموقع</Label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                  {(() => {
                    const location = locations.find((l: Location) => l.id === editingTemplate.locationId);
                    const IconComponent = iconMap[location?.icon as keyof typeof iconMap] || Building;
                    return (
                      <>
                        <IconComponent className="h-5 w-5 text-brand-yellow" />
                        <span className="font-medium">{location?.nameAr || 'موقع غير معروف'}</span>
                      </>
                    );
                  })()}
                </div>
              </div>
              
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-categoryAr">الفئة (عربي) *</Label>
                  <Input
                    id="edit-categoryAr"
                    value={editingTemplate.categoryAr}
                    onChange={(e) => setEditingTemplate({...editingTemplate, categoryAr: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-categoryEn">الفئة (إنجليزي)</Label>
                  <Input
                    id="edit-categoryEn"
                    value={editingTemplate.categoryEn}
                    onChange={(e) => setEditingTemplate({...editingTemplate, categoryEn: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-taskAr">اسم المهمة (عربي) *</Label>
                  <Input
                    id="edit-taskAr"
                    value={editingTemplate.taskAr}
                    onChange={(e) => setEditingTemplate({...editingTemplate, taskAr: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-taskEn">اسم المهمة (إنجليزي)</Label>
                  <Input
                    id="edit-taskEn"
                    value={editingTemplate.taskEn}
                    onChange={(e) => setEditingTemplate({...editingTemplate, taskEn: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label>حالة القائمة</Label>
                  <Select 
                    value={editingTemplate.isActive.toString()} 
                    onValueChange={(value) => setEditingTemplate({...editingTemplate, isActive: value === 'true'})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          فعال
                        </div>
                      </SelectItem>
                      <SelectItem value="false">
                        <div className="flex items-center gap-2">
                          <X className="h-4 w-4 text-red-500" />
                          غير فعال
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Descriptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-descriptionAr">وصف المهمة (عربي)</Label>
                  <Textarea
                    id="edit-descriptionAr"
                    value={editingTemplate.descriptionAr || ''}
                    onChange={(e) => setEditingTemplate({...editingTemplate, descriptionAr: e.target.value})}
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-descriptionEn">وصف المهمة (إنجليزي)</Label>
                  <Textarea
                    id="edit-descriptionEn"
                    value={editingTemplate.descriptionEn || ''}
                    onChange={(e) => setEditingTemplate({...editingTemplate, descriptionEn: e.target.value})}
                    rows={3}
                  />
                </div>
              </div>
              
              {/* Multi-tasks */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Layers className="h-5 w-5 text-brand-yellow" />
                    المهام الفرعية
                    {editingTemplate.multiTasks && editingTemplate.multiTasks.length > 0 && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        {editingTemplate.multiTasks.length} مهمة
                      </Badge>
                    )}
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addEditMultiTask}
                    className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    إضافة مهمة فرعية
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {(!editingTemplate.multiTasks || editingTemplate.multiTasks.length === 0) ? (
                    <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                      <Layers className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-lg font-medium mb-2">لا توجد مهام فرعية</p>
                      <p className="text-sm mb-4">أضف مهام فرعية لهذه القائمة</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addEditMultiTask}
                        className="bg-brand-yellow hover:bg-yellow-500 text-brand-black border-brand-yellow"
                      >
                        <Plus className="h-4 w-4 ml-1" />
                        إضافة أول مهمة فرعية
                      </Button>
                    </div>
                  ) : (
                    editingTemplate.multiTasks.map((task, index) => (
                      <div key={index} className="border-2 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-white">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                            المهمة الفرعية #{index + 1}
                          </span>
                          {editingTemplate.multiTasks && editingTemplate.multiTasks.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeEditMultiTask(index)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs font-medium text-gray-600">النص العربي *</Label>
                            <Input
                              value={task.ar}
                              onChange={(e) => updateEditMultiTask(index, 'ar', e.target.value)}
                              className="mt-1 border-blue-200 focus:border-blue-400"
                              placeholder="مثال: تنظيف الأرضيات"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-600">النص الإنجليزي</Label>
                            <Input
                              value={task.en || ''}
                              onChange={(e) => updateEditMultiTask(index, 'en', e.target.value)}
                              className="mt-1 border-blue-200 focus:border-blue-400"
                              placeholder="Example: Clean floors"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleUpdateTemplate}
              disabled={updateTemplateMutation.isPending}
              className="bg-brand-yellow hover:bg-yellow-500 text-brand-black"
            >
              {updateTemplateMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 ml-2 animate-spin" />
                  جاري التحديث...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 ml-2" />
                  حفظ التغييرات
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}