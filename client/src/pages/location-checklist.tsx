import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import LoadingSpinner from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
// تم استبدال useSecureOffline بـ useAuth الموحد
import { useAuth } from "@/hooks/useAuth";
// تم إزالة النظام المعطل
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building, Home, Stethoscope, Save, X, Star, RotateCcw } from "lucide-react";
import { saveToPhone, getFromPhone } from '@/lib/simplePhoneStorage';
// تم استبدال النظام بـ UltimateSyncSystem

// Helper function to get auth token - using IndexedDB unified system only
const getAuthTokenSafely = async (): Promise<string | null> => {
  try {
    // Use IndexedDB unified auth system only
    const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
    const token = await enhancedIndexedDB.getAuthData('auth_token') || 
                  await enhancedIndexedDB.getAuthData('token');
    return token;
  } catch (error) {
    console.warn('⚠️ فشل في استرجاع الرمز:', error);
    return null;
  }
};

interface ChecklistTemplate {
  id: number;
  locationId: number;
  categoryAr: string;
  categoryEn: string;
  taskAr: string;
  taskEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  subPoints?: SubPoint[];
  subTasks?: SubTask[];
  multiTasks?: MultiTask[];
  multiNamesAr?: MultiNameAr[];
  multiCategories?: MultiCategory[];
  multiTaskNames?: MultiTaskName[];
  order?: number;
}

interface SubPoint {
  ar: string;
  en?: string;
}

interface SubTask {
  ar: string;
  en?: string;
}

interface MultiTask {
  ar: string;
  en?: string;
}

interface MultiNameAr {
  name: string;
  description: string;
}

interface MultiCategory {
  ar: string;
  en?: string;
}

interface MultiTaskName {
  ar: string;
  en?: string;
  description?: string;
}

interface TaskCompletion {
  templateId: number;
  completed: boolean;
  rating?: number; // 1-4 rating scale
  itemComment?: string; // Optional comment for each item
}

interface Location {
  id: number;
  nameAr: string;
  nameEn: string;
  icon: string;
}

const iconMap = {
  building: Building,
  home: Home,
  'clinic-medical': Stethoscope,
};

// Rating system constants
const RATING_LEVELS = [
  { value: 1, label: "ضعيف", color: "bg-red-500", textColor: "text-red-700" },
  { value: 2, label: "مقبول", color: "bg-orange-500", textColor: "text-orange-700" },
  { value: 3, label: "جيد", color: "bg-blue-500", textColor: "text-blue-700" },
  { value: 4, label: "ممتاز", color: "bg-green-500", textColor: "text-green-700" },
];

// Sub-task rating interface
interface SubTaskRating {
  taskIndex: number;
  taskName: string;
  rating: number;
  notes?: string;
}

function getRatingLabel(rating: number): string {
  const level = RATING_LEVELS.find(l => l.value === rating);
  return level?.label || "غير محدد";
}

function getRatingColor(rating: number): string {
  const level = RATING_LEVELS.find(l => l.value === rating);
  return level?.color || "bg-gray-400";
}

function getRatingTextColor(rating: number): string {
  const level = RATING_LEVELS.find(l => l.value === rating);
  return level?.textColor || "text-gray-700";
}

// Enhanced touch utilities for better user experience
const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30]
    };
    navigator.vibrate(patterns[type]);
  }
};

const createRippleEffect = (element: HTMLElement, x: number, y: number) => {
  const ripple = document.createElement('span');
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  
  ripple.style.cssText = `
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.6);
    pointer-events: none;
    transform: scale(0);
    animation: ripple 0.4s ease-out;
    width: ${size}px;
    height: ${size}px;
    left: ${x - rect.left - size / 2}px;
    top: ${y - rect.top - size / 2}px;
  `;
  
  element.style.position = 'relative';
  element.style.overflow = 'hidden';
  element.appendChild(ripple);
  
  setTimeout(() => ripple.remove(), 400);
};

export default function LocationChecklist() {
  const params = useParams();
  const locationId = parseInt(params.id || '0');
  const { user } = useAuth(); // استيراد بيانات المستخدم للتحقق من الدور
  const { isOffline } = useAuth();
  
  // النظام المحلي الجديد - تم إزالة المراجع المعطلة
  const [tasks, setTasks] = useState<TaskCompletion[]>([]);
  const [subTaskRatings, setSubTaskRatings] = useState<{[templateId: number]: SubTaskRating[]}>({});
  const [evaluationNotes, setEvaluationNotes] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [itemComments, setItemComments] = useState<{[templateId: number]: string}>({});
  
  // Category comments system - disabled per user request
  const [categoryComments, setCategoryComments] = useState<{[category: string]: string}>({});

  // Removed manual final score - now calculated automatically
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Enhanced touch handling with useRef for performance
  const touchStateRef = useRef({
    startTime: 0,
    isMoving: false,
    startX: 0,
    startY: 0
  });

  // Get checklist templates - offline first approach
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Load templates - أسرع وأبسط
  useEffect(() => {
    const loadTemplates = async () => {
      if (!locationId || !user) return;
      
      console.log('📋 تحميل سريع للقوالب:', locationId);
      setTemplatesLoading(true);
      
      try {
        // 🚀 استدعاء API مباشر للحصول على أحدث البيانات
        const endpoint = user?.role === 'user' 
          ? `/api/user/location/${locationId}/templates`
          : `/api/checklist-templates/${locationId}`;
        
        const data = await apiRequest(endpoint, 'GET');
        console.log('✅ تم تحميل', data.length, 'قالب');
        
        setTemplates(data);
        
        // 💾 حفظ في الخلفية بدون انتظار
        setTimeout(async () => {
          try {
            await saveToPhone(`templates_${locationId}`, data, user?.id);
            console.log('📱 تم حفظ القوالب في ذاكرة الهاتف');
          } catch (saveError) {
            console.warn('⚠️ فشل حفظ القوالب:', saveError);
          }
        }, 100); // حفظ بعد 100ms في الخلفية
        
      } catch (error) {
        console.warn('⚠️ فشل تحميل API، محاولة الاسترجاع من ذاكرة الهاتف...');
        
        // في حالة فشل API، استرجع من ذاكرة الهاتف فقط
        try {
          const savedTemplates = await getFromPhone(`templates_${locationId}`, user?.id);
          
          if (savedTemplates && Array.isArray(savedTemplates)) {
            console.log('📱 تم استرجاع', savedTemplates.length, 'قالب محفوظ');
            setTemplates(savedTemplates);
          } else {
            setTemplates([]);
          }
        } catch (retrieveError) {
          console.warn('⚠️ فشل استرجاع القوالب المحفوظة:', retrieveError);
          setTemplates([]);
        }
      } finally {
        setTemplatesLoading(false);
      }
    };

    loadTemplates();
  }, [locationId, user]); // إزالة isOffline لتبسيط الشروط

  // Get location info - role-based endpoint
  const locationEndpoint = user?.role === 'user' 
    ? `/api/user/location/${locationId}` 
    : '/api/locations';
    
  // تحسين تحميل بيانات الموقع - إعطاء أولوية للبيانات المحلية والكاش
  const { data: locationData } = useQuery<Location | Location[]>({
    queryKey: [locationEndpoint],
    enabled: locationId > 0,
    retry: false,
    staleTime: 5 * 60 * 1000,  // 5 دقائق
    gcTime: 30 * 60 * 1000,   // 30 دقيقة
  });

  // Get existing checklist for today - only when online
  const today = new Date().toISOString().split('T')[0];
  // تحسين تحميل التقييمات الموجودة - مع كاش أطول
  const { data: existingChecklist } = useQuery<any>({
    queryKey: [`/api/checklists/${locationId}/${today}`],
    enabled: locationId > 0,
    retry: false,
    staleTime: 2 * 60 * 1000,  // دقيقتين
    gcTime: 10 * 60 * 1000,   // 10 دقائق
  });

  // Initialize tasks when templates load - always start fresh
  useEffect(() => {
    if (templates && templates.length > 0) {
      console.log('📋 Initializing tasks with templates:', templates.length);
      console.log('📱 Offline mode:', isOffline);
      console.log('🎯 Templates loaded:', templates.map((t: any) => ({ id: t.id, name: t.nameAr })));
      
      // Always initialize with unchecked tasks for fresh evaluation
      const initialTasks = templates.map((template: ChecklistTemplate) => ({
        templateId: template.id,
        completed: false,
        rating: undefined
      }));
      setTasks(initialTasks);
      console.log('🔄 Initialized tasks for', templates.length, 'templates');
    }
  }, [templates, isOffline]);

  const saveChecklistMutation = useMutation({
    mutationFn: async (checklistData: any) => {
      console.log('🎯 [SimpleSystem] بدء حفظ التقييم في النظام المبسط المعتمد');
      console.log('📱 حالة الاتصال:', { isOffline, navigatorOnline: navigator.onLine });
      
      // إعداد بيانات التقييم للنظام الموحد الجديد
      const unifiedEvaluationData = {
        locationId: checklistData.locationId,
        userId: checklistData.userId,
        companyId: checklistData.companyId,
        checklistDate: checklistData.checklistDate,
        evaluationNotes: evaluationNotes || '',
        finalScore: finalScore,
        tasks: tasks.map((task) => ({
          templateId: task.templateId,
          completed: task.completed || (task.rating || 0) > 0,
          rating: task.rating || 0,
          notes: '',
          itemComment: itemComments[task.templateId] || task.itemComment || '',
          subTaskRatings: (subTaskRatings[task.templateId] || []).map(st => ({
            rating: st.rating,
            taskName: st.taskName,
            taskIndex: st.taskIndex
          }))
        }))
      };
      
      console.log('🚀 استخدام النظام المبسط المعتمد للحفظ مباشرة في /api/checklists...');
      
      // تحويل البيانات لصيغة النظام الموحد
      const evaluationId = `eval_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const evaluationTimestamp = new Date().toISOString();
      const evaluationDate = new Date().toISOString().split('T')[0];
      const evaluationTime = new Date().toLocaleTimeString('ar-EG', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // الحصول على معلومات الموقع والمستخدم
      let currentLocation: any;
      if (user?.role === 'user') {
        currentLocation = locationData as any;
      } else {
        currentLocation = (locationData as any[])?.find((loc: any) => loc.id === locationId);
      }
      
      // تحضير بيانات التقييم للنظام الموحد
      const evaluationData = {
        evaluationId,
        locationId: unifiedEvaluationData.locationId,
        locationNameAr: currentLocation?.nameAr || 'موقع غير محدد',
        locationNameEn: currentLocation?.nameEn || 'Unknown Location',
        evaluatorId: unifiedEvaluationData.userId,
        evaluatorName: user?.username || 'مستخدم غير محدد',
        companyId: unifiedEvaluationData.companyId,
        companyNameAr: 'شركة HSA GROUP',
        companyNameEn: 'HSA GROUP',
        evaluationTimestamp,
        evaluationDate,
        evaluationTime,
        evaluationItems: unifiedEvaluationData.tasks.map((task: any, index: number) => ({
          id: `item_${index + 1}`,
          templateId: task.templateId,
          taskNameAr: templates?.find((t: any) => t.id === task.templateId)?.taskAr || 'مهمة غير محددة',
          taskNameEn: templates?.find((t: any) => t.id === task.templateId)?.taskEn || 'Unknown Task',
          categoryAr: templates?.find((t: any) => t.id === task.templateId)?.categoryAr || 'فئة غير محددة',
          categoryEn: templates?.find((t: any) => t.id === task.templateId)?.categoryEn || 'Unknown Category',
          rating: task.rating,
          completed: task.rating > 0,
          itemComment: task.itemComment || '',
          subTaskRatings: task.subTaskRatings || []
        })),
        generalNotes: unifiedEvaluationData.evaluationNotes || '',
        overallRating: finalScore,
        source: 'online'
      };
      
      // تحديد وضع الحفظ بناءً على حالة الاتصال
      const shouldSaveOffline = isOffline || !navigator.onLine;
      console.log('🤔 [SaveLogic] تحديد وضع الحفظ:', { isOffline, navigatorOnline: navigator.onLine, shouldSaveOffline });
      
      // حفظ في المخزن الموحد المتفق عليه
      try {
        if (!shouldSaveOffline && navigator.onLine) {
          console.log('🌐 [SaveLogic] حفظ مباشر في قاعدة البيانات...');
          
          // حفظ مباشر في قاعدة البيانات
          console.log('📈 [SaveLogic] إرسال بيانات التقييم:', {
            evaluationId: evaluationData.evaluationId,
            locationName: evaluationData.locationNameAr,
            itemsCount: evaluationData.evaluationItems.length,
            overallRating: evaluationData.overallRating
          });
          
          // استخدام النظام المبسط المعتمد - نفس endpoint التقارير
          const simpleEvaluationData = {
            locationId: unifiedEvaluationData.locationId,
            userId: unifiedEvaluationData.userId,
            companyId: unifiedEvaluationData.companyId,
            checklistDate: unifiedEvaluationData.checklistDate,
            evaluationNotes: unifiedEvaluationData.evaluationNotes,
            tasks: unifiedEvaluationData.tasks,
            finalScore: finalScore,
            syncTimestamp: Math.floor(Date.now() / 1000),
            // ⏰ إضافة بيانات الوقت للتقارير الاحترافية  
            evaluationTime: evaluationTime,
            evaluationDateTime: evaluationTimestamp,
            evaluationTimestamp: evaluationTimestamp
          };
          
          // 🔍 تشخيص: طباعة الأوقات للتأكد
          console.log('🔍 [DEBUG] الأوقات المُرسلة:', {
            evaluationTime,
            evaluationDateTime: evaluationTimestamp,
            evaluationTimestamp,
            rawTimestamp: new Date().toISOString()
          });
          
          const response = await fetch('/api/checklists', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${await getAuthTokenSafely()}`
            },
            body: JSON.stringify(simpleEvaluationData)
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const result = await response.json();
          
          console.log('✅ [SaveLogic] تم الحفظ في النظام المبسط بنجاح:', result);
          
          return {
            success: true,
            evaluationId: result.id || result.evaluationId || `saved_${Date.now()}`,
            message: 'تم حفظ التقييم في النظام المبسط',
            source: 'online',
            offline: false
          };
        } else {
          console.log('📱 [SaveLogic] حفظ محلي في IndexedDB...');
          
          // حفظ محلي في IndexedDB للمزامنة لاحقاً
          const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
          const offlineId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          
          const offlineData = {
            ...evaluationData,
            offlineId,
            needsSync: true,
            savedAt: new Date().toISOString()
          };
          
          await enhancedIndexedDB.saveData(`evaluation_${offlineId}`, offlineData);
          
          console.log('✅ [SaveLogic] تم الحفظ المحلي بنجاح:', offlineId);
          
          return {
            success: true,
            evaluationId: offlineId,
            message: 'تم الحفظ محلياً - سيتم المزامنة عند عودة الاتصال',
            source: 'offline',
            offline: true
          };
        }
      } catch (error) {
        console.error('❌ [SaveLogic] خطأ في الحفظ:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('🎉 Save mutation successful:', data);
      
      // Only invalidate queries if we're online
      if (!data?.offline && !isOffline) {
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
        queryClient.invalidateQueries({ queryKey: [`/api/checklists/${locationId}/${today}`] });
      }
      
      const isOfflineSave = data?.offline || !navigator.onLine;
      
      // رسالة حفظ موحدة وبسيطة
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم حفظ التقييم",
        variant: "default",
        duration: 2000,
      });
      
      // مزامنة صامتة في الخلفية
      if (navigator.onLine) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('trigger-sync'));
        }, 500);
      }
      
      console.log('🔄 Resetting form after successful save');
      
      // Reset form for a fresh evaluation after successful save
      const initialTasks = templates.map((template: any) => ({
        templateId: template.id,
        completed: false,
        rating: undefined
      }));
      setTasks(initialTasks);
      setSubTaskRatings({});
      setEvaluationNotes('');
      setCharCount(0);
      setItemComments({}); // ✅ إعادة تعيين تعليقات البنود المهمة!
      setCategoryComments({}); // ✅ إعادة تعيين تعليقات الفئات
      // Final score is now automatic - no manual reset needed
      
      console.log('✅ Form reset complete');
    },
    onError: (error: any) => {
      console.error('❌ Save mutation failed:', error);
      toast({
        title: "خطأ في الحفظ",
        description: `حدث خطأ أثناء حفظ التقييم: ${error.message}`,
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const handleTaskChange = (templateId: number, completed: boolean) => {
    setTasks(prev => prev.map(task => 
      task.templateId === templateId ? { ...task, completed } : task
    ));
  };

  const handleRatingChange = (templateId: number, rating: number) => {
    console.log(`🌟 [${isOffline ? 'OFFLINE' : 'ONLINE'}] Rating change: Template ${templateId} = ${rating} stars`);
    console.log(`📝 Current tasks count: ${tasks.length}`);
    console.log(`🎯 Templates available: ${templates?.length || 0}`);
    
    // Only block manual rating for items with multi-tasks (automatic rating)
    const template = templates.find((t: any) => t.id === templateId);
    const hasMultiTasks = template && (template as any).multiTasks && (template as any).multiTasks.length > 0;
    
    if (hasMultiTasks) {
      console.log(`❌ Manual rating blocked for automatic template ${templateId} (has ${(template as any).multiTasks.length} multi-tasks)`);
      toast({
        title: "تقييم تلقائي",
        description: "هذا البند يتم تقييمه تلقائياً من خلال تقييم المهام الفرعية",
        variant: "destructive",
      });
      return;
    }
    
    console.log(`✅ Manual rating allowed for template ${templateId} (no multi-tasks)`);
    
    // Ensure we have valid data before proceeding
    if (!templateId || !rating || rating < 1 || rating > 4) {
      console.error('❌ Invalid rating data:', { templateId, rating });
      toast({
        title: "خطأ في التقييم",
        description: "بيانات التقييم غير صحيحة",
        variant: "destructive",
      });
      return;
    }

    // Check if templates are loaded
    if (!templates || templates.length === 0) {
      console.error('❌ No templates loaded');
      toast({
        title: "خطأ في التحميل",
        description: "لم يتم تحميل قوائم التنظيف",
        variant: "destructive",
      });
      return;
    }

    // Force update even in offline mode
    setTasks(prev => {
      console.log('📋 Previous tasks:', prev.length);
      if (prev.length === 0) {
        console.warn('⚠️ No tasks available to update');
        return prev;
      }
      
      const updated = prev.map(task => 
        task.templateId === templateId ? { ...task, rating, completed: rating > 0 } : task
      );
      console.log('📋 Updated tasks:', updated.filter(t => (t.rating || 0) > 0).length, 'rated');
      return updated;
    });
    
    // Always show feedback
    toast({
      title: `✅ تم التقييم: ${rating} نجوم`,
      description: isOffline ? "في وضع عدم الاتصال" : "تم تحديث التقييم",
      variant: "default",
      duration: 2000,
    });
  };

  const handleSubTaskRatingChange = useCallback((templateId: number, taskIndex: number, taskName: string, rating: number) => {
    console.log(`🎯 Sub-task rating: Template ${templateId}, Task ${taskIndex} = ${rating}`);
    console.log(`📱 Is offline: ${isOffline}`);
    
    // Trigger haptic feedback for better user experience
    triggerHapticFeedback('light');
    
    // Update sub-task ratings and calculate automatic item rating
    setSubTaskRatings(prev => {
      const currentRatings = prev[templateId] || [];
      const updatedRatings = currentRatings.filter(r => r.taskIndex !== taskIndex);
      
      if (rating > 0) {
        updatedRatings.push({
          taskIndex,
          taskName,
          rating
        });
      }
      
      const newRatings = {
        ...prev,
        [templateId]: updatedRatings
      };
      
      console.log(`🔄 Updated sub-task ratings for template ${templateId}:`, updatedRatings);
      
      // Calculate automatic item rating immediately with the new ratings
      calculateAutomaticItemRatingImmediate(templateId, updatedRatings);
      
      return newRatings;
    });

    // Enhanced feedback with rating level info
    const level = RATING_LEVELS.find(l => l.value === rating);
    toast({
      title: `تم تقييم المهمة: ${level?.label || rating + ' نجوم'}`,
      description: `${taskName}`,
      variant: "default",
      duration: 2000,
    });
  }, [isOffline, templates]);

  // Function to calculate automatic item rating immediately with provided ratings
  const calculateAutomaticItemRatingImmediate = useCallback((templateId: number, taskRatings: SubTaskRating[]) => {
    const template = templates.find((t: any) => t.id === templateId);
    if (!template || !(template as any).multiTasks || (template as any).multiTasks.length === 0) {
      console.log(`❌ Template ${templateId} is not automatic or has no multiTasks`);
      return;
    }

    console.log(`🔄 Calculating automatic rating for template ${templateId} with ${taskRatings.length} task ratings`);
    
    if (taskRatings.length === 0) {
      // No task ratings, set item rating to undefined (unrated)
      setTasks(prev => prev.map(task => 
        task.templateId === templateId ? { ...task, rating: undefined, completed: false } : task
      ));
      console.log(`⚪ Set template ${templateId} to unrated (no sub-task ratings)`);
      return;
    }
    
    // Calculate average rating from all rated tasks
    const totalRating = taskRatings.reduce((sum: number, task: SubTaskRating) => sum + task.rating, 0);
    const averageRating = Math.round(totalRating / taskRatings.length);
    
    console.log(`📊 Template ${templateId}: Average = ${totalRating}/${taskRatings.length} = ${averageRating}`);
    
    // Set the item rating automatically
    setTasks(prev => {
      const updated = prev.map(task => 
        task.templateId === templateId ? { 
          ...task, 
          rating: averageRating,
          completed: averageRating > 0 
        } : task
      );
      
      console.log(`✅ Updated template ${templateId} automatic rating to ${averageRating}`);
      return updated;
    });
  }, [templates]);

  // Legacy function kept for compatibility (uses current state)
  const calculateAutomaticItemRating = useCallback((templateId: number, allSubTaskRatings: any) => {
    const taskRatings = allSubTaskRatings[templateId] || [];
    calculateAutomaticItemRatingImmediate(templateId, taskRatings);
  }, [calculateAutomaticItemRatingImmediate]);



  const getSubTaskRating = (templateId: number, taskIndex: number): number => {
    const templateRatings = subTaskRatings[templateId] || [];
    const rating = templateRatings.find(r => r.taskIndex === taskIndex);
    return rating?.rating || 0;
  };

  const handleNotesChange = (value: string) => {
    if (value.length <= 100) {
      setEvaluationNotes(value);
      setCharCount(value.length);
    }
  };

  // Handle item comments
  const handleItemCommentChange = (templateId: number, comment: string) => {
    if (comment.length <= 100) {
      setItemComments(prev => ({
        ...prev,
        [templateId]: comment
      }));
      
      // Also update the task completion with the comment
      setTasks(prev => prev.map(task => 
        task.templateId === templateId 
          ? { ...task, itemComment: comment }
          : task
      ));
    }
  };

  // Removed manual final score handler - now calculated automatically

  // Calculate automatic final score based on all task ratings
  const calculateAutomaticFinalScore = useCallback(() => {
    const ratedTasks = tasks.filter(task => (task.rating || 0) > 0);
    if (ratedTasks.length === 0) return 0;
    
    const totalRating = ratedTasks.reduce((sum, task) => sum + (task.rating || 0), 0);
    const averageRating = totalRating / ratedTasks.length;
    
    // Convert 4-star rating to 100-point scale with smart rounding
    const score = Math.round((averageRating / 4) * 100);
    
    console.log(`🎯 Automatic final score calculation: ${totalRating}/${ratedTasks.length} tasks = ${averageRating.toFixed(2)} avg = ${score}/100`);
    return score;
  }, [tasks]);

  // Auto-calculated final score (no manual input)
  const finalScore = calculateAutomaticFinalScore();

  // Smart reset function - only resets manually rated items
  const handleSmartReset = useCallback(() => {
    const manualTasks = tasks.filter(task => {
      const template = templates.find((t: any) => t.id === task.templateId);
      // Check if this is a manual task (no multiTasks)
      return !template || !(template as any).multiTasks || (template as any).multiTasks.length === 0;
    });

    const automaticTasks = tasks.filter(task => {
      const template = templates.find((t: any) => t.id === task.templateId);
      // Check if this is an automatic task (has multiTasks)
      return template && (template as any).multiTasks && (template as any).multiTasks.length > 0;
    });

    console.log(`🔄 Smart reset: ${manualTasks.length} manual tasks, ${automaticTasks.length} automatic tasks`);

    // Reset only manual tasks
    setTasks(prev => prev.map(task => {
      const template = templates.find((t: any) => t.id === task.templateId);
      const isManualTask = !template || !(template as any).multiTasks || (template as any).multiTasks.length === 0;
      
      if (isManualTask) {
        return { ...task, rating: undefined, completed: false };
      }
      return task; // Keep automatic tasks unchanged
    }));

    // Don't reset subTaskRatings - keep automatic calculations intact
    
    toast({
      title: "تم إعادة تعيين البنود اليدوية",
      description: `تم إعادة تعيين ${manualTasks.length} بند يدوي. البنود التلقائية محفوظة.`,
      variant: "default",
      duration: 3000,
    });
  }, [tasks, templates, toast]);



  const handleSave = async () => {
    console.log('🎯 HandleSave called:', { isOffline, tasksCount: tasks.length });
    
    // في وضع عدم الاتصال، نتجاهل جميع الفلاتر ونحفظ مباشرة
    const actuallyOffline = isOffline || !navigator.onLine;
    
    if (actuallyOffline) {
      console.log('🔥 وضع عدم الاتصال - تجاوز جميع الفلاتر للحفظ المباشر');
      
      // إعداد بيانات التقييم للحفظ المحلي الفوري
      const currentDate = new Date();
      const checklistDateStr = currentDate.toISOString().split('T')[0];
      // الحصول على بيانات المستخدم من IndexedDB الموحد
      let userData = { id: 1 };
      try {
        const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
        const storedUserData = await enhancedIndexedDB.getAuthData('user_data');
        if (storedUserData) {
          userData = typeof storedUserData === 'string' ? JSON.parse(storedUserData) : storedUserData;
        } else {
          // fallback - استخدام بيانات افتراضية
          userData = { id: 1 } as any;
        }
      } catch (error) {
        console.warn('⚠️ فشل في استرجاع بيانات المستخدم:', error);
        // استخدام بيانات افتراضية
        userData = { id: 1 } as any;
      }
      
      const evaluationData = {
        locationId,
        userId: userData.id,
        companyId: (userData as any).companyId || 6,
        evaluationDate: checklistDateStr,
        checklistDate: checklistDateStr,
        finalScore: finalScore,
        evaluationNotes: evaluationNotes.trim() || '', // إضافة التعليق العام هنا أيضاً
        categoryComments: categoryComments, // إضافة تعليقات الفئات
        tasks: tasks.map(task => ({
          templateId: task.templateId,
          completed: task.completed || (task.rating || 0) > 0,
          rating: task.rating || 0,
          notes: evaluationNotes.trim() || '', // التعليق العام في notes أيضاً للتوافق
          itemComment: itemComments[task.templateId] || task.itemComment || '',
          subTaskRatings: (subTaskRatings[task.templateId] || []).map(st => ({
            subTaskId: st.taskIndex,
            taskName: st.taskName, // إضافة اسم المهمة الفرعية
            rating: st.rating
          }))
        }))
      };
      
      console.log('🚀 الحفظ المباشر بدون فلاتر:', evaluationData);
      console.log('📝 التعليقات المحفوظة:', {
        evaluationNotes: evaluationData.evaluationNotes,
        tasksWithComments: evaluationData.tasks.filter(t => t.notes || t.itemComment).length,
        categoryComments: Object.keys(evaluationData.categoryComments || {}).length
      });
      
      // الحفظ باستخدام النظام المحلي الموحد الحقيقي
      try {
        console.log('🎯 بدء الحفظ الفعلي باستخدام النظام الموحد...');
        
        // حفظ مباشر في IndexedDB باستخدام نفس نمط النظام الموحد
        const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
        const offlineId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const offlineData = {
          ...evaluationData,
          offlineId,
          isOffline: true,
          synced: false,
          needsSync: true,
          savedAt: Date.now(),
          source: 'local'
        };
        
        // حفظ باستخدام نفس النمط المستخدم في النظام الموحد
        await enhancedIndexedDB.setItem(`offline_checklist_${offlineId}`, offlineData, 'data');
        console.log('✅ تم الحفظ الفعلي في IndexedDB:', `offline_checklist_${offlineId}`);
        
        // تحقق من الحفظ
        setTimeout(async () => {
          try {
            const allDataItems = await enhancedIndexedDB.getAllByType('data');
            const checklistItems = allDataItems.filter(item => 
              item.id.startsWith('offline_checklist_')
            );
            console.log('🔍 تأكيد الحفظ - عدد التقييمات المحلية في IndexedDB:', checklistItems.length);
            
            if (checklistItems.length > 0) {
              console.log('📄 آخر تقييم محفوظ:', {
                id: checklistItems[checklistItems.length - 1].id,
                locationId: checklistItems[checklistItems.length - 1].value?.locationId,
                date: checklistItems[checklistItems.length - 1].value?.checklistDate
              });
            }
          } catch (err) {
            console.error('❌ خطأ في التحقق:', err);
          }
        }, 500);
        
        toast({
          title: "✅ تم الحفظ محلياً",
          description: `تم حفظ التقييم محلياً وسيتم المزامنة عند عودة الاتصال`,
          variant: "default",
        });
        
        // إعادة تعيين النموذج
        setTasks(tasks.map(task => ({ ...task, rating: 0, completed: false, itemComment: '' })));
        setSubTaskRatings({});
        setCategoryComments({}); // إعادة تعيين تعليقات الفئات
        setEvaluationNotes('');
        setCharCount(0);
        
        return;
      } catch (error) {
        console.error('❌ فشل في الحفظ المحلي (IndexedDB):', error);
        
        // ❌ لا يوجد نظام احتياطي - IndexedDB فقط
        toast({
          title: "❌ فشل في حفظ التقييم",
          description: `خطأ في قاعدة البيانات المحلية: ${error instanceof Error ? error.message : 'خطأ غير معروف'}. يرجى إعادة المحاولة أو إعادة تحميل الصفحة.`,
          variant: "destructive",
          duration: 7000,
        });
        
        // لا يتم إعادة تعيين النموذج حتى لا يفقد المستخدم بياناته
        return;
      }
    }
    
    // الفلاتر العادية للحالة المتصلة فقط
    if (!templates || templates.length === 0) {
      toast({
        title: "خطأ في التحميل",
        description: "لم يتم تحميل قوائم التنظيف. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
      return;
    }

    // فلتر التقييمات للحالة المتصلة فقط
    const hasRatings = tasks.some(task => task.rating && task.rating > 0);
    console.log('📊 Has ratings:', hasRatings, 'Tasks with ratings:', tasks.filter(t => t.rating && t.rating > 0).length);
    
    if (!hasRatings) {
      toast({
        title: "تحذير",
        description: "يرجى تقييم مهمة واحدة على الأقل قبل الحفظ",
        variant: "destructive",
      });
      return;
    }

    // فحص إجباري للملاحظات - يجب أن تكون غير فارغة
    if (!evaluationNotes.trim()) {
      toast({
        title: "ملاحظات التقييم مطلوبة",
        description: "يرجى إضافة ملاحظات التقييم قبل حفظ التقييم",
        variant: "destructive",
      });
      return;
    }

    const allRated = tasks.every(task => task.rating && task.rating > 0);
    const currentDate = new Date();
    const checklistDateStr = currentDate.toISOString().split('T')[0];
    
    console.log('📅 Preparing save:', { 
      locationId, 
      checklistDateStr, 
      allRated,
      isOffline,
      tasksWithRatings: tasks.filter(t => t.rating && t.rating > 0).length
    });
    
    // Only check for existing evaluation when online
    if (!isOffline && navigator.onLine) {
      try {
        const token = await getAuthTokenSafely();
        if (token) {
          const checkUrl = `/api/checklists/${locationId}/${checklistDateStr}`;
          const response = await apiRequest(checkUrl, 'GET');
          
          if (response) {
            console.log('⚠️ Existing evaluation found');
            toast({
              title: "تقييم موجود",
              description: "تم تقييم هذا الموقع اليوم مسبقاً. كل تقييم جديد سيحل محل السابق.",
              variant: "default",
            });
          }
        }
      } catch (error) {
        console.log('⚠️ Could not check for existing evaluation:', error);
      }
    }

    // Include sub-task ratings in the checklist data
    const allSubTaskRatings = Object.entries(subTaskRatings).reduce((acc, [templateId, ratings]) => {
      acc[parseInt(templateId)] = ratings;
      return acc;
    }, {} as {[templateId: number]: SubTaskRating[]});

    // الحصول على بيانات المستخدم من IndexedDB
    let userData = { id: 1 };
    try {
      const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
      const storedUserData = await enhancedIndexedDB.getAuthData('user_data');
      if (storedUserData) {
        userData = typeof storedUserData === 'string' ? JSON.parse(storedUserData) : storedUserData;
      }
    } catch (error) {
      console.warn('⚠️ فشل في استرجاع بيانات المستخدم من IndexedDB:', error);
      // Using default fallback userData
    }

    const checklistData = {
      locationId,
      userId: userData.id,
      checklistDate: checklistDateStr,
      finalScore: finalScore,
      tasks: tasks.map(task => ({
        templateId: task.templateId,
        completed: task.completed,
        rating: task.rating || 0,
        notes: evaluationNotes.trim() || '',
        itemComment: task.itemComment || itemComments[task.templateId] || '',
        subTaskRatings: allSubTaskRatings[task.templateId] || []
      })),
      evaluationNotes: evaluationNotes.trim() || '',
      categoryComments: categoryComments, // إضافة تعليقات الفئات
      completedAt: allRated ? new Date().toISOString() : null,
    };
    
    console.log('🚀 Preparing to save checklist:', checklistData);
    console.log('🔄 Calling mutation with data:', {
      locationId: checklistData.locationId,
      userId: checklistData.userId,
      tasksCount: checklistData.tasks.length,
      ratedTasks: checklistData.tasks.filter(t => t.rating > 0).length,
      isOffline,
      mutationEnabled: !!saveChecklistMutation
    });
    
    // استدعاء mutation فقط في الحالة المتصلة
    console.log('🌐 حالة متصلة - استخدام نظام الخادم');
    saveChecklistMutation.mutate(checklistData);
  };

  // Show loading only when no templates are available at all - تحسين المنطق
  if (!templates || templates.length === 0) {
    // إذا كان النظام متصل أو في حالة تحميل، أظهر Loading بدلاً من رسالة offline
    if (navigator.onLine && (templatesLoading || !isOffline)) {
      return (
        <div>
          
          <main className="container mx-auto px-4 py-6">
            <LoadingSpinner />
          </main>
        </div>
      );
    } else if (isOffline && !navigator.onLine) {
      // أظهر رسالة offline فقط عندما يكون النظام فعلاً منقطع عن الإنترنت
      return (
        <div>
          
          <main className="container mx-auto px-4 py-6">
            <div className="text-center py-12">
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد بيانات محفوظة</h3>
                <p className="text-gray-600 mb-6">يرجى الاتصال بالإنترنت لأول مرة لتحميل قائمة التقييم</p>
                <button
                  onClick={() => window.location.href = '/'}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  العودة للصفحة الرئيسية
                </button>
              </div>
            </div>
          </main>
        </div>
      );
    }
    
    // إذا لم يكن هناك حالة واضحة، أظهر Loading كآمان
    return (
      <div>
        
        <main className="container mx-auto px-4 py-6">
          <LoadingSpinner />
        </main>
      </div>
    );
  }

  // Get location info - handle different response types based on user role
  let location: Location | undefined;
  if (user?.role === 'user') {
    // For regular users, locationData is a single Location object
    location = locationData as Location;
  } else {
    // For admins/supervisors, locationData is an array of Location objects
    location = (locationData as Location[])?.find((loc: Location) => loc.id === locationId);
  }
  
  // If no location found and we're offline, try to get from cached offline locations
  if (!location && isOffline) {
    // تم إزالة localStorage - النظام يستخدم IndexedDB فقط
    // استخدام البيانات المخزنة مؤقتاً - معطل
    const cachedLocations: any = { locations: [] };
    if (cachedLocations.locations && cachedLocations.locations.length > 0) {
      location = cachedLocations.locations.find((loc: any) => loc.id === locationId);
    }
  }
  
  // Create a default location if still not found (for offline mode)
  if (!location) {
    location = {
      id: locationId,
      nameAr: `الموقع ${locationId}`,
      nameEn: `Location ${locationId}`,
      icon: 'building'
    };
  }
  
  const IconComponent = iconMap[location?.icon as keyof typeof iconMap] || Building;

  // Use templates from offline hook
  const currentTemplates = templates;

  // Group templates by category - add safety check
  const groupedTemplates = currentTemplates && currentTemplates.length > 0 
    ? currentTemplates.reduce((acc: any, template: any) => {
        if (!acc[template.categoryAr]) {
          acc[template.categoryAr] = [];
        }
        acc[template.categoryAr].push(template);
        return acc;
      }, {})
    : {};

  // Show loading while templates are being fetched
  if (templatesLoading) {
    return (
      <div className="flex justify-center items-center min-h-96 flex-col gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-yellow"></div>
        <span className="text-gray-600">جاري تحميل قائمة التقييم...</span>
      </div>
    );
  }

  // If no templates available after all checks, show error
  if (!currentTemplates || currentTemplates.length === 0 || Object.keys(groupedTemplates).length === 0) {
    return (
      <div>
        
        <main className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد قائمة تقييم</h3>
              <p className="text-gray-600 mb-6">لم يتم العثور على قائمة تقييم لهذا الموقع. يرجى التحقق من الاتصال بالإنترنت.</p>
              <button
                onClick={() => window.location.href = '/'}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                العودة للصفحة الرئيسية
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div>
      
      
      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6">
        {/* إزالة المؤشرات التقنية للحصول على تجربة بسيطة */}
        
        {/* Header */}
        <div className="bg-brand-yellow rounded-xl md:rounded-2xl p-4 md:p-6 mb-4 md:mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-black rounded-lg flex items-center justify-center">
              <IconComponent className="h-5 w-5 md:h-6 md:w-6 text-brand-yellow" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-brand-black">{location?.nameAr}</h1>
              <p className="text-sm md:text-base text-brand-black opacity-75">قائمة تقييم النظافة اليومية</p>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-4 md:space-y-6">
          {Object.entries(groupedTemplates).map(([category, categoryTemplates]: [string, any]) => (
            <Card key={category}>
              <CardContent className="p-4 md:p-6">
                <h3 className="font-semibold text-base md:text-lg text-gray-900 mb-3 md:mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-brand-yellow rounded-full"></div>
                    {category}
                  </div>

                </h3>
                <div className="space-y-2 md:space-y-3">
                  {categoryTemplates.map((template: any) => {
                    const taskCompletion = tasks.find(t => t.templateId === template.id);
                    const currentRating = taskCompletion?.rating || 0;

                    return (
                      <div key={template.id} className="p-3 md:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex-1 mb-3">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {template.taskAr}
                          </h4>
                          {template.descriptionAr && (
                            <p className="text-sm text-gray-500">{template.descriptionAr}</p>
                          )}
                          
                          {/* Multi Categories display */}
                          {template.multiCategories && template.multiCategories.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs font-medium text-orange-700 mb-1">الفئات المتعددة:</p>
                              <div className="flex flex-wrap gap-1">
                                {template.multiCategories.map((category: any, index: number) => (
                                  <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-orange-100 text-orange-700">
                                    {category.ar}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Multi Task Names display */}
                          {template.multiTaskNames && template.multiTaskNames.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs font-medium text-teal-700 mb-1">أسماء المهام المتعددة:</p>
                              <div className="space-y-1">
                                {template.multiTaskNames.map((taskName: any, index: number) => (
                                  <div key={index} className="text-xs text-teal-600 flex items-start">
                                    <span className="inline-block w-1.5 h-1.5 bg-teal-500 rounded-full mt-1.5 ml-2 flex-shrink-0"></span>
                                    <span>
                                      <strong>{taskName.ar}</strong>
                                      {taskName.description && (
                                        <span className="text-teal-500"> - {taskName.description}</span>
                                      )}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Multi Arabic names display */}
                          {template.multiNamesAr && template.multiNamesAr.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs font-medium text-purple-700 mb-1">الأسماء العربية المتعددة:</p>
                              <div className="space-y-1">
                                {template.multiNamesAr.map((nameObj: any, index: number) => (
                                  <div key={index} className="text-xs text-purple-600 flex items-start">
                                    <span className="inline-block w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5 ml-2 flex-shrink-0"></span>
                                    <span>
                                      <strong>{nameObj.name}</strong>
                                      {nameObj.description && (
                                        <span className="text-purple-500"> - {nameObj.description}</span>
                                      )}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Multi Tasks display with individual rating */}
                          {template.multiTasks && template.multiTasks.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-sm font-medium text-green-700 mb-2">تقييم المهام الفرعية:</p>
                              <div className="space-y-3 bg-green-50 p-3 rounded-lg border border-green-200">
                                {template.multiTasks.map((task: any, index: number) => {
                                  const subTaskRating = getSubTaskRating(template.id, index);
                                  return (
                                    <div key={index} className="space-y-2">
                                      {/* Task Name */}
                                      <div className="text-sm font-medium text-green-800 mb-2">{task.ar}</div>
                                      
                                      {/* Sub-Task Rating - Improved Vertical Layout */}
                                      <div className="space-y-2">
                                        {/* Stars Row */}
                                        <div className="flex justify-center">
                                          <div className="flex gap-1">
                                            {RATING_LEVELS.map((level) => {
                                              return (
                                                <button
                                                  key={level.value}
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    
                                                    if (!touchStateRef.current.isMoving) {
                                                      console.log(`🖱️ Star clicked: Level ${level.value} for sub-task ${index}`);
                                                      createRippleEffect(e.currentTarget, e.clientX, e.clientY);
                                                      handleSubTaskRatingChange(template.id, index, task.ar, level.value);
                                                    }
                                                  }}
                                                  onTouchStart={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    
                                                    const touch = e.touches[0];
                                                    touchStateRef.current = {
                                                      startTime: Date.now(),
                                                      isMoving: false,
                                                      startX: touch.clientX,
                                                      startY: touch.clientY
                                                    };
                                                  }}
                                                  onTouchMove={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    
                                                    const touch = e.touches[0];
                                                    const deltaX = Math.abs(touch.clientX - touchStateRef.current.startX);
                                                    const deltaY = Math.abs(touch.clientY - touchStateRef.current.startY);
                                                    
                                                    if (deltaX > 10 || deltaY > 10) {
                                                      touchStateRef.current.isMoving = true;
                                                    }
                                                  }}
                                                  onTouchEnd={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    
                                                    const touchDuration = Date.now() - touchStateRef.current.startTime;
                                                    const isValidTouch = !touchStateRef.current.isMoving && 
                                                                       touchDuration > 50 && 
                                                                       touchDuration < 1200;
                                                    
                                                    if (isValidTouch) {
                                                      const touch = e.changedTouches[0];
                                                      createRippleEffect(e.currentTarget, touch.clientX, touch.clientY);
                                                      handleSubTaskRatingChange(template.id, index, task.ar, level.value);
                                                    }
                                                    
                                                    touchStateRef.current = {
                                                      startTime: 0,
                                                      isMoving: false,
                                                      startX: 0,
                                                      startY: 0
                                                    };
                                                  }}
                                                  className={`p-2 rounded-md transition-all duration-200 cursor-pointer touch-manipulation select-none overflow-hidden relative ${
                                                    subTaskRating >= level.value
                                                      ? `${level.color} text-white shadow-md scale-105`
                                                      : 'bg-gray-200 text-gray-400 hover:bg-gray-300 active:bg-gray-400 active:scale-95'
                                                  }`}
                                                  title={level.label}
                                                  aria-label={`تقييم ${level.label} للمهمة ${task.ar}`}
                                                  aria-pressed={subTaskRating >= level.value}
                                                >
                                                  <Star className="h-4 w-4" fill="currentColor" />
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                        
                                        {/* Rating Status and Reset Button - Below Stars */}
                                        {subTaskRating > 0 && (
                                          <div className="flex items-center justify-center gap-3">
                                            <span className={`text-xs px-2 py-1 rounded-full ${getRatingColor(subTaskRating)} text-white font-medium`}>
                                              {getRatingLabel(subTaskRating)}
                                            </span>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleSubTaskRatingChange(template.id, index, task.ar, 0)}
                                              className="p-1.5 h-6 w-6 hover:bg-red-50 hover:text-red-600 transition-colors"
                                              title="إعادة تعيين هذه المهمة الفرعية"
                                            >
                                              <RotateCcw className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Sub Points display */}
                          {template.subPoints && template.subPoints.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs font-medium text-yellow-700 mb-1">النقاط الفرعية:</p>
                              <div className="space-y-1">
                                {template.subPoints.map((point: any, index: number) => (
                                  <div key={index} className="text-xs text-yellow-600 flex items-start">
                                    <span className="inline-block w-1.5 h-1.5 bg-yellow-500 rounded-full mt-1.5 ml-2 flex-shrink-0"></span>
                                    <span>{point.ar}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Sub Tasks display */}
                          {template.subTasks && template.subTasks.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs font-medium text-blue-700 mb-1">المهام الفرعية:</p>
                              <div className="space-y-1">
                                {template.subTasks.map((task: any, index: number) => (
                                  <div key={index} className="text-xs text-blue-600 flex items-start">
                                    <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 ml-2 flex-shrink-0"></span>
                                    <span>{task.ar}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Rating System - Improved Vertical Layout */}
                        <div className="space-y-3 border-t border-gray-200 pt-3">
                          {/* Rating Type Indicator */}
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-sm text-gray-600">تقييم البند:</span>
                            {(template as any).multiTasks && (template as any).multiTasks.length > 0 ? (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                تلقائي
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                يدوي
                              </span>
                            )}
                          </div>
                          
                          {/* Stars Row - Centered */}
                          <div className="flex justify-center">
                            <div className="flex gap-1">
                              {RATING_LEVELS.map((level) => {
                                return (
                                  <button
                                    key={level.value}
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      
                                      // Check if this item has multi-tasks (automatic rating)
                                      const hasMultiTasks = (template as any).multiTasks && (template as any).multiTasks.length > 0;
                                      if (hasMultiTasks) {
                                        console.log(`❌ Manual rating blocked for automatic template ${template.id} (has ${(template as any).multiTasks.length} multi-tasks)`);
                                        toast({
                                          title: "تقييم تلقائي",
                                          description: "هذا البند يتم تقييمه تلقائياً من خلال تقييم المهام الفرعية",
                                          variant: "destructive",
                                          duration: 3000,
                                        });
                                        return;
                                      }
                                      
                                      console.log(`🖱️ Click rating: Level ${level.value} for template ${template.id}`);
                                      
                                      // Create ripple effect for main rating
                                      createRippleEffect(e.currentTarget, e.clientX, e.clientY);
                                      
                                      // Trigger haptic feedback
                                      triggerHapticFeedback('medium');
                                      
                                      handleRatingChange(template.id, level.value);
                                    }}
                                    disabled={false}
                                    className={`p-3 rounded-lg transition-all duration-200 touch-manipulation select-none cursor-pointer overflow-hidden relative ${
                                      currentRating >= level.value
                                        ? `${level.color} text-white shadow-md scale-105`
                                        : 'bg-gray-200 text-gray-400 hover:bg-gray-300 active:bg-gray-400 active:scale-95'
                                    }`}
                                    title={level.label}
                                    aria-label={`تقييم ${level.label} للبند الرئيسي`}
                                    aria-pressed={currentRating >= level.value}
                                  >
                                    <Star className="h-5 w-5" fill="currentColor" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          
                          {/* Rating Status Row - Centered */}
                          {currentRating > 0 && (
                            <div className="flex items-center justify-center gap-2">
                              <span className={`text-sm font-medium ${getRatingTextColor(currentRating)}`}>
                                {getRatingLabel(currentRating)}
                              </span>
                              <div className="text-green-500">
                                <Save className="h-4 w-4" />
                              </div>
                            </div>
                          )}

                          {/* Item Comment Box */}
                          <div className="space-y-2">
                            <Label htmlFor={`comment-${template.id}`} className="text-xs text-gray-600 font-medium">
                              تعليق على البند (اختياري - حد أقصى 100 حرف)
                            </Label>
                            <div className="relative">
                              <Textarea
                                id={`comment-${template.id}`}
                                value={itemComments[template.id] || ''}
                                onChange={(e) => handleItemCommentChange(template.id, e.target.value)}
                                placeholder="اكتب تعليقك على هذا البند..."
                                maxLength={100}
                                rows={2}
                                className="w-full text-sm resize-none border-gray-200 focus:border-brand-yellow focus:ring-brand-yellow"
                              />
                              <div className="absolute bottom-2 left-2 text-xs text-gray-400">
                                {(itemComments[template.id] || '').length}/100
                              </div>
                            </div>
                          </div>
                          
                          {/* Action Buttons Row - Centered with Classic Style */}
                          <div className="flex items-center justify-center gap-3">
                            {/* Individual Reset Button for Manual Items */}
                            {(() => {
                              const hasMultiTasks = (template as any).multiTasks && (template as any).multiTasks.length > 0;
                              return !hasMultiTasks && currentRating > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRatingChange(template.id, 0)}
                                  className="p-1.5 h-7 w-7 hover:bg-red-50 hover:text-red-600 transition-colors"
                                  title="إعادة تعيين هذا البند"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              );
                            })()}
                            

                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Progress Counter Section */}
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-orange-800">تقدم التقييم</h3>
                  <div className="text-sm text-orange-600">
                    {tasks.filter(task => task.rating && task.rating > 0).length} من {tasks.length} بند
                  </div>
                </div>
                
                <div className="w-full bg-orange-200 rounded-full h-3 mb-2">
                  <div 
                    className="bg-gradient-to-r from-orange-400 to-yellow-400 h-3 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${tasks.length > 0 ? (tasks.filter(task => task.rating && task.rating > 0).length / tasks.length) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                
                <div className="text-center text-sm text-orange-700">
                  {tasks.length > 0 && tasks.filter(task => task.rating && task.rating > 0).length === tasks.length 
                    ? "تم تقييم جميع البنود بنجاح! 🎉" 
                    : `متبقي ${tasks.length - tasks.filter(task => task.rating && task.rating > 0).length} بند للتقييم`
                  }
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Automatic Final Score Section */}
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-4 md:p-6">
                <div className="flex items-center justify-center mb-6">
                  <Label className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">AUTO</span>
                    </div>
                    التقييم النهائي التلقائي للموقع
                  </Label>
                </div>
                
                <div className="text-center">
                  {finalScore > 0 ? (
                    <div className="space-y-4">
                      {/* Automatic Score Display */}
                      <div className={`inline-flex items-center px-6 py-4 rounded-2xl text-white font-bold text-3xl shadow-lg transform scale-110 ${
                        finalScore >= 90 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                        finalScore >= 75 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                        finalScore >= 50 ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-gradient-to-r from-red-500 to-red-600'
                      }`}>
                        <span className="mr-2">{finalScore}/100</span>
                        {finalScore >= 90 ? '🌟 ممتاز' :
                         finalScore >= 75 ? '👍 جيد' :
                         finalScore >= 50 ? '⚠️ مقبول' : '❌ ضعيف'}
                      </div>
                      
                      {/* Automatic Calculation Info */}
                      <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 text-sm text-gray-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span>محسوب تلقائياً من متوسط تقييمات البنود</span>
                        </div>
                      </div>
                      
                      {/* Rating Breakdown */}
                      <div className="mt-4 p-4 bg-white/60 rounded-lg border border-gray-200">
                        <div className="text-sm text-gray-700 space-y-2">
                          <div className="flex justify-between items-center">
                            <span>البنود المقيّمة:</span>
                            <span className="font-medium">{tasks.filter(task => (task.rating || 0) > 0).length} من {tasks.length}</span>
                          </div>
                          {tasks.filter(task => (task.rating || 0) > 0).length > 0 && (
                            <div className="flex justify-between items-center">
                              <span>متوسط التقييم:</span>
                              <span className="font-medium">
                                {(tasks.filter(task => (task.rating || 0) > 0).reduce((sum, task) => sum + (task.rating || 0), 0) / 
                                  tasks.filter(task => (task.rating || 0) > 0).length).toFixed(1)} من 4 نجوم
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl text-gray-400">⭐</span>
                      </div>
                      <p className="text-gray-600 mb-2">لم يتم تقييم أي بند بعد</p>
                      <p className="text-sm text-gray-500">سيظهر التقييم النهائي تلقائياً بعد تقييم البنود</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evaluation Notes */}
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="bg-yellow-50 border border-brand-yellow rounded-lg p-3 md:p-4">
                <Label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  ملاحظات التقييم
                  <span className="text-red-500 text-base ml-1" title="حقل مطلوب">*</span>
                  <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-md mr-2">مطلوب</span>
                </Label>
                <Textarea
                  value={evaluationNotes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="أضف ملاحظاتك حول تقييم الموقع (مطلوب - حد أقصى 100 حرف)"
                  className={`resize-none ${!evaluationNotes.trim() ? 'border-red-300 focus:border-red-500' : ''}`}
                  rows={3}
                  required
                />
                <div className="text-xs mt-2 text-left flex justify-between items-center" dir="ltr">
                  <span className={charCount > 90 ? 'text-red-500' : 'text-gray-500'}>
                    {charCount}/100
                  </span>
                  {!evaluationNotes.trim() && (
                    <span className="text-red-500 text-xs">⚠️ ملاحظات التقييم مطلوبة</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Debug Info for Mobile */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="text-xs text-blue-700 space-y-1">
              <div>وضع الاتصال: {isOffline ? '❌ غير متصل' : '✅ متصل'}</div>
              <div>عدد المهام المقيمة: {tasks.filter(t => t.rating && t.rating > 0).length} من {tasks.length}</div>
              <div>عدد القوالب المحملة: {templates?.length || 0}</div>
              <div>المواقع المحفوظة: 0</div>
              <div>التاريخ: {new Date().toLocaleDateString('ar-EG')}</div>
              <div>الوقت: {new Date().toLocaleTimeString('ar-EG')}</div>
              {isOffline && (
                <div className="text-orange-600 font-medium">
                  🔧 <button 
                    onClick={() => window.open('/test-offline-rating.html', '_blank')}
                    className="underline bg-transparent border-none text-orange-600 cursor-pointer"
                  >
                    تجربة صفحة الاختبار البسيطة
                  </button>
                  <div className="mt-2 text-xs">
                    حالة الحفظ: {saveChecklistMutation.isPending ? '⏳ جاري الحفظ...' : '⭕ جاهز'}
                  </div>
                  <div className="mt-1 text-xs">
                    التقييمات المعلقة: محفوظة محلياً
                  </div>
                  {false && (
                    <div className="mt-1 text-xs text-blue-600">
                      🔄 جاري المزامنة التلقائية...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons - Ultra Compact Design */}
          <div className="sticky bottom-2 bg-white p-1.5 rounded-lg border shadow-md space-y-1.5">
            {/* Global Smart Reset Button - Ultra Compact */}
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSmartReset}
                className="text-gray-600 hover:text-red-600 hover:border-red-300 transition-colors h-7 px-2 text-xs"
                title="إعادة تعيين جميع البنود اليدوية فقط (البنود التلقائية محفوظة)"
              >
                <RotateCcw className="h-3 w-3 ml-0.5" />
                إعادة تعيين البنود اليدوية
              </Button>
            </div>

            {/* Save Button - Ultra Compact - Hidden for data_specialist */}
            {user?.role !== 'data_specialist' && (
              <Button
                onClick={() => {
                  console.log('🖱️ تم النقر على زر الحفظ - استخدام النظام الموحد');
                  console.log('📱 حالة الاتصال:', { isOffline, navigatorOnline: navigator.onLine });
                  
                  // استخدام handleSave دائماً - يحتوي على النظام الموحد الكامل
                  handleSave();
                }}
              disabled={saveChecklistMutation.isPending}
              className="w-full bg-brand-yellow hover:bg-yellow-500 text-brand-black font-medium py-2 text-sm touch-manipulation"
            >
              {saveChecklistMutation.isPending ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-brand-black ml-1"></div>
              ) : (
                <Save className="h-3 w-3 ml-1" />
                )}
                حفظ التقييم {isOffline || !navigator.onLine ? '(محلي)' : '(خادم)'}
              </Button>
            )}
          </div>
        </div>
      </main>

    </div>
  );
}
