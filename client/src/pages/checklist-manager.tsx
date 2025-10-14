import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Building, Home, Stethoscope, Plus, Pencil, Trash2, X, Edit, GripVertical } from "lucide-react";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";


import LoadingSpinner from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";

type LucideIcon = typeof Building | typeof Home | typeof Stethoscope;

interface SubPoint {
  ar: string;
  en?: string;
}

interface SubTask {
  ar: string;
  en?: string;
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
  orderIndex: number;
  isActive: boolean;
  subPoints?: SubPoint[];
  subTasks?: SubTask[];
  multiTasks?: MultiTask[];
  createdAt: string;
  updatedAt: string;
}

interface Location {
  id: number;
  nameAr: string;
  nameEn: string;
  icon: string;
}

interface NewTask {
  categoryAr: string;
  categoryEn: string;
  taskAr: string;
  taskEn: string;
  descriptionAr: string;
  descriptionEn: string;
  multiTasks: MultiTask[];
}

interface MultiTask {
  ar: string;
  en?: string;
}



const iconMap = {
  building: Building,
  home: Home,
  'clinic-medical': Stethoscope,
};

export default function ChecklistManager() {
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ChecklistTemplate | null>(null);
  const [draggedTemplate, setDraggedTemplate] = useState<ChecklistTemplate | null>(null);
  const [dragOverTemplate, setDragOverTemplate] = useState<ChecklistTemplate | null>(null);
  const [newTask, setNewTask] = useState<NewTask>({
    categoryAr: "",
    categoryEn: "",
    taskAr: "",
    taskEn: "",
    descriptionAr: "",
    descriptionEn: "",
    multiTasks: [{ ar: "", en: "" }], // Start with one task by default
  });
  const [editTask, setEditTask] = useState<NewTask>({
    categoryAr: "",
    categoryEn: "",
    taskAr: "",
    taskEn: "",
    descriptionAr: "",
    descriptionEn: "",
    multiTasks: [{ ar: "", en: "" }],
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isOffline } = useAuth();



  // Multi-tasks management functions
  const addMultiTask = () => {
    setNewTask({
      ...newTask,
      multiTasks: [...newTask.multiTasks, { ar: "", en: "" }]
    });
  };

  const removeMultiTask = (index: number) => {
    setNewTask({
      ...newTask,
      multiTasks: newTask.multiTasks.filter((_, i) => i !== index)
    });
  };

  const updateMultiTask = (index: number, field: 'ar' | 'en', value: string) => {
    const updatedMultiTasks = [...newTask.multiTasks];
    updatedMultiTasks[index] = { ...updatedMultiTasks[index], [field]: value };
    setNewTask({
      ...newTask,
      multiTasks: updatedMultiTasks
    });
  };

  // Edit task multi-tasks management functions
  const addEditMultiTask = () => {
    setEditTask({
      ...editTask,
      multiTasks: [...editTask.multiTasks, { ar: "", en: "" }]
    });
  };

  const removeEditMultiTask = (index: number) => {
    setEditTask({
      ...editTask,
      multiTasks: editTask.multiTasks.filter((_, i) => i !== index)
    });
  };

  const updateEditMultiTask = (index: number, field: 'ar' | 'en', value: string) => {
    const updatedMultiTasks = [...editTask.multiTasks];
    updatedMultiTasks[index] = { ...updatedMultiTasks[index], [field]: value };
    setEditTask({
      ...editTask,
      multiTasks: updatedMultiTasks
    });
  };



  const resetNewTask = () => {
    setNewTask({
      categoryAr: "",
      categoryEn: "",
      taskAr: "",
      taskEn: "",
      descriptionAr: "",
      descriptionEn: "",
      multiTasks: [{ ar: "", en: "" }],
    });
  };

  const resetEditTask = () => {
    setEditTask({
      categoryAr: "",
      categoryEn: "",
      taskAr: "",
      taskEn: "",
      descriptionAr: "",
      descriptionEn: "",
      multiTasks: [{ ar: "", en: "" }],
    });
  };

  // Get all locations
  const { data: locations, isLoading: locationsLoading, error: locationsError } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
    staleTime: 0, // Never use cache - always fresh data
    gcTime: 0, // Don't keep old data
    refetchOnWindowFocus: true,
    refetchOnMount: true, // Always refetch when component mounts
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Get templates for selected location
  const { data: templates, isLoading: templatesLoading, error: templatesError } = useQuery<ChecklistTemplate[]>({
    queryKey: [`/api/locations/${selectedLocationId}/templates`],
    enabled: selectedLocationId !== null,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Add new task mutation
  const addTaskMutation = useMutation({
    mutationFn: async (taskData: NewTask & { locationId: number }) => {
      console.log('🚀 Frontend: Adding new task with data:', taskData);
      return apiRequest(`/api/checklist-templates`, 'POST', taskData);
    },
    onSuccess: (data) => {
      console.log('✅ Frontend: Task added successfully:', data);
      queryClient.invalidateQueries({ queryKey: [`/api/locations/${selectedLocationId}/templates`] });
      resetNewTask();
      setIsAddDialogOpen(false);
      toast({
        title: "تم إضافة البند بنجاح",
        description: `تم إضافة "${data.taskAr}" مع ${newTask.multiTasks.length} مهمة`,
      });
    },
    onError: (error: any) => {
      console.error('❌ Frontend: Add task failed:', error);
      toast({
        title: "فشل في إضافة البند",
        description: error?.response?.data?.message || error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  const handleAddTask = () => {
    console.log('🎯 Frontend: Add task triggered');
    console.log('🎯 Frontend: Current data:', newTask);
    
    // Validate required fields
    if (!selectedLocationId) {
      toast({
        title: "يرجى اختيار الموقع",
        description: "اختر الموقع أولاً قبل إضافة البند",
        variant: "destructive",
      });
      return;
    }
    
    if (!newTask.taskAr.trim()) {
      toast({
        title: "اسم البند مطلوب",
        description: "يرجى إدخال اسم البند بالعربية",
        variant: "destructive",
      });
      return;
    }
    
    if (!newTask.categoryAr.trim()) {
      toast({
        title: "فئة البند مطلوبة",
        description: "يرجى إدخال فئة البند بالعربية",
        variant: "destructive",
      });
      return;
    }

    // Validate at least one multi-task
    const validMultiTasks = newTask.multiTasks.filter(task => task.ar.trim() !== "");
    if (validMultiTasks.length === 0) {
      toast({
        title: "مطلوب مهمة واحدة على الأقل",
        description: "يرجى إدخال مهمة واحدة على الأقل للبند",
        variant: "destructive",
      });
      return;
    }

    // Process multi-tasks only (sub-points and sub-tasks removed for simplicity)

    const processedMultiTasks = validMultiTasks.map(task => ({
      ar: task.ar.trim(),
      en: task.en?.trim() || task.ar.trim()
    }));

    addTaskMutation.mutate({
      locationId: selectedLocationId,
      categoryAr: newTask.categoryAr.trim(),
      categoryEn: newTask.categoryEn.trim() || newTask.categoryAr.trim(),
      taskAr: newTask.taskAr.trim(),
      taskEn: newTask.taskEn.trim() || newTask.taskAr.trim(),
      descriptionAr: newTask.descriptionAr.trim(),
      descriptionEn: newTask.descriptionEn.trim() || newTask.descriptionAr.trim(),

      multiTasks: processedMultiTasks,

    });
  };

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      console.log('🗑️ Frontend: Deleting task ID:', taskId);
      return apiRequest(`/api/checklist-templates/${taskId}`, 'DELETE');
    },
    onSuccess: (data, taskId) => {
      console.log('✅ Frontend: Task deleted successfully:', taskId);
      queryClient.invalidateQueries({ queryKey: [`/api/locations/${selectedLocationId}/templates`] });
      toast({
        title: "تم حذف البند بنجاح",
        description: "تم إزالة البند من قائمة التشييك نهائياً",
      });
    },
    onError: (error: any, taskId) => {
      console.error('❌ Frontend: Delete task failed:', error, 'Task ID:', taskId);
      toast({
        title: "فشل في حذف البند",
        description: error?.response?.data?.message || error.message || "تعذر حذف البند",
        variant: "destructive",
      });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<NewTask> }) => {
      console.log('🔄 Frontend: Updating task with data:', data);
      return apiRequest(`/api/checklist-templates/${data.id}`, 'PUT', data.updates);
    },
    onSuccess: (data) => {
      console.log('✅ Frontend: Task updated successfully:', data);
      queryClient.invalidateQueries({ queryKey: [`/api/locations/${selectedLocationId}/templates`] });
      resetEditTask();
      setIsEditDialogOpen(false);
      setEditingTask(null);
      toast({
        title: "تم تحديث البند بنجاح",
        description: "تم حفظ التغييرات",
      });
    },
    onError: (error: any) => {
      console.error('❌ Frontend: Update task failed:', error);
      toast({
        title: "فشل في تحديث البند",
        description: error?.response?.data?.message || error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  const handleEditTask = (task: ChecklistTemplate) => {
    setEditingTask(task);
    setEditTask({
      categoryAr: task.categoryAr,
      categoryEn: task.categoryEn,
      taskAr: task.taskAr,
      taskEn: task.taskEn,
      descriptionAr: task.descriptionAr || "",
      descriptionEn: task.descriptionEn || "",
      multiTasks: task.multiTasks && task.multiTasks.length > 0 
        ? task.multiTasks 
        : [{ ar: "", en: "" }],
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateTask = () => {
    if (!editingTask) return;

    // Validate required fields
    if (!editTask.taskAr.trim()) {
      toast({
        title: "اسم البند مطلوب",
        description: "يرجى إدخال اسم البند بالعربية",
        variant: "destructive",
      });
      return;
    }
    
    if (!editTask.categoryAr.trim()) {
      toast({
        title: "فئة البند مطلوبة",
        description: "يرجى إدخال فئة البند بالعربية",
        variant: "destructive",
      });
      return;
    }

    // Validate at least one multi-task
    const validMultiTasks = editTask.multiTasks.filter(task => task.ar.trim() !== "");
    if (validMultiTasks.length === 0) {
      toast({
        title: "مطلوب مهمة واحدة على الأقل",
        description: "يرجى إدخال مهمة واحدة على الأقل للبند",
        variant: "destructive",
      });
      return;
    }

    const processedMultiTasks = validMultiTasks.map(task => ({
      ar: task.ar.trim(),
      en: task.en?.trim() || task.ar.trim()
    }));

    updateTaskMutation.mutate({
      id: editingTask.id,
      updates: {
        categoryAr: editTask.categoryAr.trim(),
        categoryEn: editTask.categoryEn.trim() || editTask.categoryAr.trim(),
        taskAr: editTask.taskAr.trim(),
        taskEn: editTask.taskEn.trim() || editTask.taskAr.trim(),
        descriptionAr: editTask.descriptionAr.trim(),
        descriptionEn: editTask.descriptionEn.trim() || editTask.descriptionAr.trim(),
        multiTasks: processedMultiTasks,
      }
    });
  };

  const handleDeleteTask = (taskId: number, taskName: string) => {
    // إصلاح مؤقت لمنع جمود UI - استبدال confirm المحجوب
    setTimeout(() => {
      if (window.confirm(`هل أنت متأكد من حذف البند "${taskName}"؟\n\nهذا الإجراء لا يمكن التراجع عنه.`)) {
        deleteTaskMutation.mutate(taskId);
      }
    }, 0);
  };

  // Update template order mutation
  const updateTemplateOrderMutation = useMutation({
    mutationFn: async (templatesData: { id: number; orderIndex: number }[]) => {
      console.log('📊 Templates to update:', templatesData);
      
      if (isOffline) {
        // Save order changes to IndexedDB first, then localStorage for later sync
        try {
          const { enhancedIndexedDB } = await import("@/lib/enhancedIndexedDB");
          const storedChanges = await enhancedIndexedDB.getAuthData('pendingTemplateOrderChanges') || '[]';
          const pendingChanges = typeof storedChanges === 'string' ? JSON.parse(storedChanges) : (Array.isArray(storedChanges) ? storedChanges : []);
          const newChange = {
            timestamp: Date.now(),
            templates: templatesData,
            locationId: selectedLocationId
          };
          pendingChanges.push(newChange);
          await enhancedIndexedDB.saveAuthData('pendingTemplateOrderChanges', pendingChanges);
          console.log('✅ تم حفظ تغييرات الترتيب في IndexedDB');
        } catch (error) {
          console.warn('⚠️ فشل حفظ التغييرات في IndexedDB:', error);
          
          // لا يوجد احتياطي - IndexedDB فقط
          throw error;
          
        }
        return { message: 'Changes saved offline' };
      }
      
      return apiRequest('/api/checklist-templates/reorder', 'PUT', {
        templates: templatesData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/locations/${selectedLocationId}/templates`] });
      toast({
        title: "تم تحديث الترتيب بنجاح",
        description: isOffline ? "سيتم تطبيق التغييرات عند الاتصال" : "تم حفظ الترتيب الجديد",
      });
    },
    onError: (error: any) => {
      console.error('Location order update error:', error);
      toast({
        title: "فشل في تحديث الترتيب",
        description: error?.response?.data?.message || "حدث خطأ أثناء الحفظ",
        variant: "destructive",
      });
    }
  });

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, template: ChecklistTemplate) => {
    setDraggedTemplate(template);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, template: ChecklistTemplate) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTemplate(template);
  };

  const handleDragLeave = () => {
    setDragOverTemplate(null);
  };

  const handleDrop = (e: React.DragEvent, targetTemplate: ChecklistTemplate) => {
    e.preventDefault();
    
    if (!draggedTemplate || draggedTemplate.id === targetTemplate.id) {
      setDraggedTemplate(null);
      setDragOverTemplate(null);
      return;
    }

    if (!templates) return;

    // Find current positions
    const draggedIndex = templates.findIndex(template => template.id === draggedTemplate.id);
    const targetIndex = templates.findIndex(template => template.id === targetTemplate.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Create new order
    const newTemplates = [...templates];
    const [draggedItem] = newTemplates.splice(draggedIndex, 1);
    newTemplates.splice(targetIndex, 0, draggedItem);

    // Update order indices
    const templatesWithNewOrder = newTemplates.map((template, index) => ({
      id: template.id,
      orderIndex: index
    }));

    // Apply changes immediately (optimistic update)
    queryClient.setQueryData([`/api/locations/${selectedLocationId}/templates`], newTemplates);

    // Send to server
    updateTemplateOrderMutation.mutate(templatesWithNewOrder);

    setDraggedTemplate(null);
    setDragOverTemplate(null);
  };

  const handleDragEnd = () => {
    setDraggedTemplate(null);
    setDragOverTemplate(null);
  };

  // Group templates by category
  const groupedTemplates = templates?.reduce((acc, template) => {
    const category = template.categoryAr || 'بدون تصنيف';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, ChecklistTemplate[]>) || {};

  const selectedLocation = locations?.find(loc => loc.id === selectedLocationId);

  console.log('📋 Checklist Manager Data Status:', { 
    locationsLoading, 
    locations, 
    hasLocationsData: !!locations,
    locationsLength: locations?.length || 0,
    locationsError: locationsError?.message,
    showLoadingScreen: locationsLoading && !locations,
    firstLocation: locations?.[0],
    userToken: 'IndexedDB-based' // Token now stored in IndexedDB
  });

  // Only show loading screen if there's no data AND it's loading
  if (locationsLoading && !locations) {
    return (
      <main className="flex flex-col min-h-screen bg-gray-50">
        <div className="flex-1 container mx-auto px-4 py-8">
          <LoadingSpinner />
        </div>
      </main>
    );
  }

  const IconComponent: LucideIcon = selectedLocation ? 
    (iconMap[selectedLocation.icon as keyof typeof iconMap] || Building) : Building;

  return (
    <main className="flex flex-col min-h-screen bg-gray-50">
      
      
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">إدارة قوائم التشييك</h1>
            <p className="text-gray-600 mt-2">تحرير وإدارة قوائم المهام لكل موقع</p>
          </div>

          {/* Debug Info for Development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <p><strong>Debug:</strong> البيانات الخام: {JSON.stringify(locations?.slice(0,2))}</p>
              <p><strong>عدد المواقع:</strong> {locations?.length || 0}</p>
              <p><strong>أول موقع:</strong> {locations?.[0]?.nameAr || 'لا يوجد'}</p>
              <p><strong>حالة التحميل:</strong> {locationsLoading ? 'يحمّل' : 'مكتمل'}</p>
              <p><strong>خطأ:</strong> {locationsError?.message || 'لا يوجد'}</p>
            </div>
          )}

          {/* Empty State */}
          {!locationsLoading && (!locations || locations.length === 0) && (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Building className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مواقع</h3>
              <p className="text-gray-500">يجب إضافة مواقع أولاً من صفحة إدارة المواقع</p>
            </div>
          )}

          {/* Locations Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {locations?.map((location) => {
              const IconComponent: LucideIcon = iconMap[location.icon as keyof typeof iconMap] || Building;
              const isSelected = selectedLocationId === location.id;
              
              return (
                <div
                  key={location.id}
                  className={`
                    p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md
                    ${isSelected 
                      ? 'border-brand-yellow bg-brand-yellow/10 shadow-lg' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                    }
                  `}
                  onClick={() => setSelectedLocationId(location.id)}
                >
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className={`
                      w-12 h-12 rounded-lg flex items-center justify-center
                      ${isSelected ? 'bg-brand-yellow' : 'bg-gray-100'}
                    `}>
                      <IconComponent className={`h-6 w-6 ${
                        isSelected ? 'text-brand-black' : 'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className={`font-medium ${
                        isSelected ? 'text-brand-black' : 'text-gray-900'
                      }`}>
                        {location.nameAr}
                      </h3>
                      <p className={`text-sm ${
                        isSelected ? 'text-brand-black opacity-75' : 'text-gray-500'
                      }`}>
                        {location.nameEn}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedLocationId && (
            <>
              {/* Selected Location Info and Add Button */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-brand-yellow rounded-lg flex items-center justify-center">
                    <IconComponent className="h-4 w-4 text-brand-black" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedLocation?.nameAr}</h2>
                </div>

                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-green-500 hover:bg-green-600 text-white">
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة بند جديد
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>إضافة بند تقييم جديد مع مهام متعددة</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-6 py-4">
                      {/* Basic Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>التصنيف بالعربية *</Label>
                          <Input
                            autoFocus
                            value={newTask.categoryAr}
                            onChange={(e) => setNewTask({...newTask, categoryAr: e.target.value})}
                            placeholder="مثل: تنظيف الأرضيات"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label>التصنيف بالإنجليزية</Label>
                          <Input
                            value={newTask.categoryEn}
                            onChange={(e) => setNewTask({...newTask, categoryEn: e.target.value})}
                            placeholder="e.g: Floor Cleaning"
                            className="text-sm"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>اسم البند بالعربية *</Label>
                          <Input
                            value={newTask.taskAr}
                            onChange={(e) => setNewTask({...newTask, taskAr: e.target.value})}
                            placeholder="مثل: تنظيف المكاتب"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label>اسم البند بالإنجليزية</Label>
                          <Input
                            value={newTask.taskEn}
                            onChange={(e) => setNewTask({...newTask, taskEn: e.target.value})}
                            placeholder="e.g: Office Cleaning"
                            className="text-sm"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>الوصف بالعربية</Label>
                          <Textarea
                            value={newTask.descriptionAr}
                            onChange={(e) => setNewTask({...newTask, descriptionAr: e.target.value})}
                            placeholder="وصف تفصيلي للبند"
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label>الوصف بالإنجليزية</Label>
                          <Textarea
                            value={newTask.descriptionEn}
                            onChange={(e) => setNewTask({...newTask, descriptionEn: e.target.value})}
                            placeholder="Detailed description"
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                      </div>







                      {/* Multi-Tasks Section */}
                      <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-medium text-green-700">المهام المتعددة *</h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addMultiTask}
                            className="text-green-600 border-green-300 hover:bg-green-100"
                          >
                            <Plus className="h-4 w-4 ml-1" />
                            إضافة مهمة
                          </Button>
                        </div>
                        <p className="text-sm text-green-600 mb-3 bg-green-100 p-2 rounded">
                          🎯 كل بند يمكن أن يحتوي على عدة مهام (مثل: مسح الأسطح، ترتيب الأوراق، تنظيف الأدراج)
                        </p>
                        
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {newTask.multiTasks.map((multiTask, index) => (
                            <div key={index} className="bg-green-100 rounded-lg p-3 border border-green-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-green-800">المهمة {index + 1}</span>
                                {newTask.multiTasks.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeMultiTask(index)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <Input
                                  placeholder="المهمة بالعربية *"
                                  value={multiTask.ar}
                                  onChange={(e) => updateMultiTask(index, 'ar', e.target.value)}
                                  className="text-xs"
                                />
                                <Input
                                  placeholder="المهمة بالإنجليزية"
                                  value={multiTask.en || ""}
                                  onChange={(e) => updateMultiTask(index, 'en', e.target.value)}
                                  className="text-xs"
                                />
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
                        onClick={handleAddTask}
                        disabled={addTaskMutation.isPending || !newTask.taskAr.trim() || !newTask.categoryAr.trim() || newTask.multiTasks.filter(task => task.ar.trim()).length === 0}
                        className="bg-brand-yellow text-brand-black hover:bg-yellow-400"
                      >
                        {addTaskMutation.isPending ? "جاري الإضافة..." : "إضافة البند"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {templatesLoading ? (
                <LoadingSpinner />
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedTemplates).map(([category, categoryTemplates]: [string, any]) => (
                    <Card key={category}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-brand-yellow rounded-full"></div>
                          {category}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {categoryTemplates.map((template: ChecklistTemplate, index: number) => (
                            <div 
                              key={template.id} 
                              className={`
                                relative group bg-gray-50 rounded-lg p-4 cursor-move transition-all duration-200
                                ${draggedTemplate?.id === template.id ? 'bg-blue-100 border-2 border-blue-300 shadow-lg' : ''}
                                ${dragOverTemplate?.id === template.id ? 'bg-yellow-100 border-2 border-yellow-300' : ''}
                                hover:bg-gray-100
                              `}
                              draggable
                              onDragStart={(e) => handleDragStart(e, template)}
                              onDragOver={(e) => handleDragOver(e, template)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, template)}
                              onDragEnd={handleDragEnd}
                            >
                              {/* Drag handle */}
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                              </div>

                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900 mb-1">
                                    {template.taskAr}
                                  </h4>
                                  {template.descriptionAr && (
                                    <p className="text-sm text-gray-600 mb-2">{template.descriptionAr}</p>
                                  )}
                                  
                                  {/* Sub-points display */}
                                  {template.subPoints && template.subPoints.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      <p className="text-xs font-medium text-gray-700 mb-1">النقاط الفرعية:</p>
                                      <ul className="space-y-1">
                                        {template.subPoints.map((subPoint: SubPoint, index: number) => (
                                          <li key={index} className="text-xs text-gray-600 flex items-start">
                                            <span className="inline-block w-1.5 h-1.5 bg-brand-yellow rounded-full mt-1.5 ml-2 flex-shrink-0"></span>
                                            <span>{subPoint.ar}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Sub-tasks display */}
                                  {template.subTasks && template.subTasks.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      <p className="text-xs font-medium text-blue-700 mb-1">المهام الفرعية:</p>
                                      <ul className="space-y-1">
                                        {template.subTasks.map((subTask: SubTask, index: number) => (
                                          <li key={index} className="text-xs text-blue-600 flex items-start">
                                            <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 ml-2 flex-shrink-0"></span>
                                            <span>{subTask.ar}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Multi-tasks display */}
                                  {template.multiTasks && template.multiTasks.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      <p className="text-xs font-medium text-green-700 mb-1">المهام المتعددة:</p>
                                      <ul className="space-y-1">
                                        {template.multiTasks.map((multiTask: MultiTask, index: number) => (
                                          <li key={index} className="text-xs text-green-600 flex items-start">
                                            <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 ml-2 flex-shrink-0"></span>
                                            <span>{multiTask.ar}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}


                                </div>
                                
                                <div className="flex gap-2 ml-4">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditTask(template)}
                                    disabled={updateTaskMutation.isPending}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteTask(template.id, template.taskAr)}
                                    disabled={deleteTaskMutation.isPending}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {Object.keys(groupedTemplates).length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Building className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد قوائم تشييك</h3>
                      <p className="text-gray-600 mb-4">
                        لم يتم إنشاء أي قوائم تشييك لهذا الموقع بعد
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!selectedLocationId && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">اختر موقعاً لإدارة قوائم التشييك</h3>
              <p className="text-gray-600">اختر أحد المواقع أعلاه لعرض وإدارة قوائم التشييك الخاصة به</p>
            </div>
          )}
        </div>

        {/* Edit Task Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تعديل بند قائمة التشييك</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editCategoryAr">فئة البند بالعربية *</Label>
                  <Input
                    id="editCategoryAr"
                    autoFocus
                    value={editTask.categoryAr}
                    onChange={(e) => setEditTask({ ...editTask, categoryAr: e.target.value })}
                    placeholder="أدخل فئة البند"
                  />
                </div>
                <div>
                  <Label htmlFor="editCategoryEn">فئة البند بالإنجليزية</Label>
                  <Input
                    id="editCategoryEn"
                    value={editTask.categoryEn}
                    onChange={(e) => setEditTask({ ...editTask, categoryEn: e.target.value })}
                    placeholder="Enter category in English"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editTaskAr">اسم البند بالعربية *</Label>
                  <Input
                    id="editTaskAr"
                    value={editTask.taskAr}
                    onChange={(e) => setEditTask({ ...editTask, taskAr: e.target.value })}
                    placeholder="أدخل اسم البند"
                  />
                </div>
                <div>
                  <Label htmlFor="editTaskEn">اسم البند بالإنجليزية</Label>
                  <Input
                    id="editTaskEn"
                    value={editTask.taskEn}
                    onChange={(e) => setEditTask({ ...editTask, taskEn: e.target.value })}
                    placeholder="Enter task name in English"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editDescriptionAr">وصف البند بالعربية</Label>
                  <Textarea
                    id="editDescriptionAr"
                    value={editTask.descriptionAr}
                    onChange={(e) => setEditTask({ ...editTask, descriptionAr: e.target.value })}
                    placeholder="وصف اختياري للبند"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="editDescriptionEn">وصف البند بالإنجليزية</Label>
                  <Textarea
                    id="editDescriptionEn"
                    value={editTask.descriptionEn}
                    onChange={(e) => setEditTask({ ...editTask, descriptionEn: e.target.value })}
                    placeholder="Optional description in English"
                    rows={3}
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Multi-tasks Section */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-green-800 font-medium">🟢 المهام المتعددة *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addEditMultiTask}
                    className="border-green-300 text-green-700 hover:bg-green-100"
                  >
                    <Plus className="h-3 w-3 ml-1" />
                    إضافة مهمة
                  </Button>
                </div>
                <div className="space-y-3">
                  {editTask.multiTasks.map((multiTask, index) => (
                    <div key={index} className="bg-white border border-green-200 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-green-700 font-medium">مهمة {index + 1}</span>
                        {editTask.multiTasks.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEditMultiTask(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input
                          placeholder="المهمة بالعربية *"
                          value={multiTask.ar}
                          onChange={(e) => updateEditMultiTask(index, 'ar', e.target.value)}
                          className="text-xs"
                        />
                        <Input
                          placeholder="المهمة بالإنجليزية"
                          value={multiTask.en || ""}
                          onChange={(e) => updateEditMultiTask(index, 'en', e.target.value)}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                إلغاء
              </Button>
              <Button 
                onClick={handleUpdateTask}
                disabled={updateTaskMutation.isPending || !editTask.taskAr.trim() || !editTask.categoryAr.trim() || editTask.multiTasks.filter(task => task.ar.trim()).length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {updateTaskMutation.isPending ? "جاري التحديث..." : "حفظ التغييرات"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </main>
  );
}