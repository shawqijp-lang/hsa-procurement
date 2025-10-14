import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

import LoadingSpinner from "@/components/ui/loading-spinner";
import OfflineSync from "@/components/offline/OfflineSync";
import { useToast } from "@/hooks/use-toast";
// تم استبدال useSecureOffline بـ useAuth الموحد
import { useAuth } from "@/hooks/useAuth";
import { useUnifiedEvaluation } from "@/hooks/useUnifiedEvaluation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building, Home, Stethoscope, Save, X, Star, WifiOff, RotateCcw, MessageSquare, Send, CloudOff, Database } from "lucide-react";

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
}

interface MultiCategory {
  ar: string;
  en?: string;
}

interface MultiTaskName {
  ar: string;
  en?: string;
}

interface TaskRating {
  templateId: number;
  rating: number;
  notes: string;
  itemComment: string;
  subTaskRatings: { [subTaskId: number]: number };
}

interface LocationInfo {
  id: number;
  nameAr: string;
  nameEn: string;
  icon: string;
  companyId: number;
}

// 🔴 Feature Flag - تفعيل النظام الجديد الموحد
const USE_UNIFIED_SYSTEM = true;

export default function EnhancedLocationChecklist() {
  const { toast } = useToast();
  const params = useParams();
  const locationId = parseInt(params.id || '0');
  const { user: currentUser } = useAuth();
  
  // 🟢 النظام الجديد الموحد (أونلاين + أوفلاين)
  const {
    saveEvaluation: saveEvaluationUnified,
    isOnline,
    isSubmitting: isUnifiedSubmitting,
    syncStats,
    hasUnsynced,
    isReady: unifiedReady
  } = useUnifiedEvaluation({ locationId, autoSync: true, currentUser });
  
  // 🔴 النظام القديم (معطل عملياً - للأمان فقط)
  const {
    isOffline: oldIsOffline,
    offlineData,
    isSyncing,
    saveEvaluationOffline, // ❌ معطل - لا يُستخدم
    getPendingCount
  } = useAuth();
  
  // ✅ استخدام النظام المناسب
  const isOffline = USE_UNIFIED_SYSTEM ? !isOnline : oldIsOffline;
  const pendingCount = USE_UNIFIED_SYSTEM ? syncStats.pendingSync : getPendingCount();

  // State management
  const [taskRatings, setTaskRatings] = useState<{ [templateId: number]: TaskRating }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ✅ استخدام حالة النظام الموحد للإرسال
  const actuallySubmitting = USE_UNIFIED_SYSTEM ? (isSubmitting || isUnifiedSubmitting) : isSubmitting;
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [submissionId, setSubmissionId] = useState<string>('');
  const [finalNotes, setFinalNotes] = useState<string>(''); // Final evaluation notes

  // Fetch location info with role-based endpoint and offline fallback
  const locationEndpoint = currentUser?.role === 'user' 
    ? `/api/user/location/${locationId}` 
    : `/api/locations/${locationId}`;
    
  const { data: locationInfo, isLoading: locationLoading } = useQuery<LocationInfo>({
    queryKey: [locationEndpoint],
    retry: false,
    enabled: !isOffline && !!currentUser,
    placeholderData: isOffline ? (offlineData.locations.find(loc => loc.id === locationId) as unknown as LocationInfo) : undefined,
  });

  // Fetch templates using user endpoint (works for all roles)
  const templatesEndpoint = `/api/user/location/${locationId}/templates`;
    
  const { data: templates, isLoading: templatesLoading, error: templatesError } = useQuery<ChecklistTemplate[]>({
    queryKey: [templatesEndpoint],
    retry: false,
    enabled: !isOffline && !!currentUser,
    placeholderData: isOffline ? (offlineData.templates[locationId] || []) : undefined,
  });

  // Debug logging for templates
  useEffect(() => {
    console.log('📋 Loading templates for location:', locationId);
    console.log('🌐 Fetching templates from API...');
    if (templatesError) {
      console.log('❌ Error loading templates:', templatesError);
    }
    if (templates) {
      console.log('✅ Templates loaded successfully:', templates.length);
    }
  }, [locationId, templates, templatesError]);

  // Save templates when fetched online
  useEffect(() => {
    if (templates && templates.length > 0 && !isOffline) {
      // Templates data managed by secure offline hook
    }
  }, [templates, locationId, isOffline]);

  // Get display data
  const displayLocation = locationInfo || (isOffline ? offlineData.locations.find(loc => loc.id === locationId) : null);
  const displayTemplates = templates || (isOffline ? (offlineData.templates[locationId] || []) : []);

  // Initialize task ratings
  useEffect(() => {
    if (displayTemplates.length > 0) {
      const initialRatings: { [templateId: number]: TaskRating } = {};
      displayTemplates.forEach(template => {
        initialRatings[template.id] = {
          templateId: template.id,
          rating: 0,
          notes: '',
          itemComment: '',
          subTaskRatings: {}
        };
      });
      setTaskRatings(initialRatings);
    }
  }, [displayTemplates]);

  // Handle rating change
  const handleRatingChange = (templateId: number, rating: number) => {
    setTaskRatings(prev => ({
      ...prev,
      [templateId]: {
        ...prev[templateId],
        rating
      }
    }));
  };

  // Handle notes change
  const handleNotesChange = (templateId: number, notes: string) => {
    setTaskRatings(prev => ({
      ...prev,
      [templateId]: {
        ...prev[templateId],
        notes
      }
    }));
  };

  // Handle comment change
  const handleCommentChange = (templateId: number, itemComment: string) => {
    setTaskRatings(prev => ({
      ...prev,
      [templateId]: {
        ...prev[templateId],
        itemComment
      }
    }));
  };

  // Submit evaluation
  const handleSubmit = async () => {
    if (!displayLocation) {
      toast({
        title: "خطأ",
        description: "معلومات الموقع غير متوفرة",
        variant: "destructive"
      });
      return;
    }

    // Validate at least one rating
    const hasRatings = Object.values(taskRatings).some(rating => rating.rating > 0);
    if (!hasRatings) {
      toast({
        title: "تحذير",
        description: "يرجى تقييم مهمة واحدة على الأقل",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (USE_UNIFIED_SYSTEM) {
        // ✅ النظام الجديد الموحد - نفس المسار للأونلاين والأوفلاين
        console.log('🚀 [Enhanced] استخدام النظام الجديد الموحد');
        
        // إعداد بيانات المهام بنفس تنسيق النظام الأونلاين
        const taskRatingsArray = Object.values(taskRatings)
          .filter(rating => rating.rating > 0)
          .map(task => ({
            templateId: task.templateId,
            completed: task.rating > 0,
            rating: task.rating,
            notes: task.notes || '',
            itemComment: task.itemComment || '',
            subTaskRatings: Object.entries(task.subTaskRatings || {}).map(([subTaskId, rating]) => ({
              subTaskId: parseInt(subTaskId),
              rating
            }))
          }));
        
        // الحفظ الموحد (أونلاين أو أوفلاين)
        const submissionId = await saveEvaluationUnified(
          (displayLocation as LocationInfo).id,
          taskRatingsArray,
          finalNotes
        );
        
        console.log('✅ [Enhanced] تم الحفظ بالنظام الجديد:', submissionId);
        
        // ✅ رسالة نجاح واضحة للهاتف
        toast({
          title: "تم الحفظ بنجاح! ✅",
          description: !isOffline ? "تم إرسال التقييم للخادم" : "تم الحفظ محلياً وسيُرسل عند عودة الاتصال",
          variant: "default"
        });
        
        // عرض النجاح
        setSubmissionId(submissionId);
        setShowSuccessDialog(true);
        
        // إبطال الاستعلامات ذات الصلة
        queryClient.invalidateQueries({ queryKey: ['/api/locations/status'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
        
        // إعادة تعيين النموذج
        const resetRatings: { [templateId: number]: TaskRating } = {};
        displayTemplates.forEach(template => {
          resetRatings[template.id] = {
            templateId: template.id,
            rating: 0,
            notes: '',
            itemComment: '',
            subTaskRatings: {}
          };
        });
        setTaskRatings(resetRatings);
        setFinalNotes('');
        
      } else {
        // 🔴 النظام القديم معطل - لا يعمل بعد الآن
        console.warn('⚠️ [Enhanced] النظام القديم معطل - استخدام النظام الجديد');
        toast({
          title: "تحذير",
          description: "النظام القديم معطل، يرجى تحديث الصفحة",
          variant: "destructive"
        });
        return;
      }
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      toast({
        title: "خطأ في الإرسال",
        description: "فشل في إرسال التقييم، يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading states
  if ((locationLoading || templatesLoading) && !isOffline) {
    return <LoadingSpinner />;
  }

  if (!displayLocation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Building className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">الموقع غير موجود</h2>
          <p className="text-gray-600">
            {isOffline ? 'لا توجد بيانات محفوظة لهذا الموقع' : 'الموقع المطلوب غير متوفر'}
          </p>
        </div>
      </div>
    );
  }

  if (displayTemplates.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Star className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">لا توجد قوالب تقييم</h2>
          <p className="text-gray-600">
            {isOffline 
              ? 'لا توجد قوالب محفوظة محلياً لهذا الموقع'
              : 'لم يتم إنشاء قوالب تقييم لهذا الموقع بعد'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                <Building className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  تقييم الموقع
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {(displayLocation as LocationInfo).nameAr}
                </p>
              </div>
            </div>

            {/* Status and Actions */}
            <div className="flex items-center gap-4">
              {/* Offline Status */}
              {isOffline && (
                <Badge variant="outline" className="gap-2">
                  <WifiOff className="h-3 w-3" />
                  غير متصل
                </Badge>
              )}

              {/* Pending Count - النظام الجديد والقديم */}
              {(USE_UNIFIED_SYSTEM ? hasUnsynced : pendingCount > 0) && (
                <Badge variant="secondary" className="gap-2">
                  <Database className="h-3 w-3" />
                  {USE_UNIFIED_SYSTEM ? syncStats.pendingSync : pendingCount} معلق
                </Badge>
              )}

              {/* تم إزالة زر المزامنة المكرر لتجنب التضارب مع SyncButton الموحد */}
            </div>
          </div>

          {/* Offline Notice */}
          {isOffline && (
            <div className="mt-4 flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <CloudOff className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-blue-800 dark:text-blue-200 font-medium">
                  وضع عدم الاتصال
                </p>
                <p className="text-blue-600 dark:text-blue-400 text-sm mt-1">
                  سيتم حفظ التقييم محلياً ورفعه عند عودة الاتصال
                </p>
              </div>
            </div>
          )}

          {/* Template Source Notice */}
          {templatesError && (
            <div className="mt-4 flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <MessageSquare className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-amber-800 dark:text-amber-200 font-medium">
                  عرض بيانات محلية
                </p>
                <p className="text-amber-600 dark:text-amber-400 text-sm mt-1">
                  تم عرض القوالب المحفوظة محلياً
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Checklist Form */}
        <div className="space-y-6">
          {displayTemplates.map((template, index) => (
            <Card key={template.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Template Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="flex items-center justify-center w-8 h-8 bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400 rounded-full text-sm font-medium">
                          {index + 1}
                        </span>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {template.taskAr}
                        </h3>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-400 text-sm mr-11">
                        {template.categoryAr}
                      </p>
                      
                      {template.descriptionAr && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm mr-11 mt-2">
                          {template.descriptionAr}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Sub-points */}
                  {template.subPoints && template.subPoints.length > 0 && (
                    <div className="mr-11 space-y-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">النقاط الفرعية:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        {template.subPoints.map((point, idx) => (
                          <li key={idx}>{point.ar}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Rating */}
                  <div className="mr-11 space-y-3">
                    <Label className="text-sm font-medium text-gray-900 dark:text-white">
                      التقييم (من 1 إلى 5)
                    </Label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => handleRatingChange(template.id, rating)}
                          className={`w-10 h-10 rounded-full border-2 transition-all ${
                            taskRatings[template.id]?.rating >= rating
                              ? 'bg-yellow-500 border-yellow-500 text-white'
                              : 'border-gray-300 dark:border-gray-600 text-gray-400 hover:border-yellow-400'
                          }`}
                        >
                          <Star className="h-5 w-5 mx-auto" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mr-11 space-y-2">
                    <Label htmlFor={`notes-${template.id}`} className="text-sm font-medium text-gray-900 dark:text-white">
                      ملاحظات (اختيارية)
                    </Label>
                    <Textarea
                      id={`notes-${template.id}`}
                      placeholder="أضف ملاحظاتك هنا..."
                      value={taskRatings[template.id]?.notes || ''}
                      onChange={(e) => handleNotesChange(template.id, e.target.value)}
                      className="min-h-[80px] resize-none"
                    />
                  </div>

                  {/* Comments */}
                  <div className="mr-11 space-y-2">
                    <Label htmlFor={`comment-${template.id}`} className="text-sm font-medium text-gray-900 dark:text-white">
                      تعليق على البند (اختياري)
                    </Label>
                    <Textarea
                      id={`comment-${template.id}`}
                      placeholder="أضف تعليقك على هذا البند..."
                      value={taskRatings[template.id]?.itemComment || ''}
                      onChange={(e) => handleCommentChange(template.id, e.target.value)}
                      className="min-h-[60px] resize-none"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Final Evaluation Notes */}
        <div className="mt-8">
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <div className="space-y-3">
                <Label htmlFor="final-notes" className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  التعليق النهائي على التقييم (اختياري)
                </Label>
                <Textarea
                  id="final-notes"
                  placeholder="أضف تعليقك النهائي على التقييم الإجمالي للموقع..."
                  value={finalNotes}
                  onChange={(e) => setFinalNotes(e.target.value)}
                  className="min-h-[100px] resize-none"
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 text-left">
                  {finalNotes.length}/100
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-center">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || Object.values(taskRatings).every(rating => rating.rating === 0)}
            size="lg"
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-12 py-3 gap-3"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                {isOffline ? 'حفظ محلياً' : 'إرسال التقييم'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-green-600 dark:text-green-400">
              ✅ تم حفظ التقييم بنجاح
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              {isOffline 
                ? 'تم حفظ التقييم محلياً وسيتم رفعه عند عودة الاتصال'
                : 'تم إرسال التقييم بنجاح إلى الخادم'
              }
            </p>
            
            {submissionId && (
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                رقم المرجع: {submissionId}
              </p>
            )}

            <Button
              onClick={() => setShowSuccessDialog(false)}
              className="w-full"
            >
              موافق
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Offline Sync Component */}
      {!isOffline && <OfflineSync />}
    </div>
  );
}