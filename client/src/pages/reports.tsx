import React, { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useUnifiedEvaluation } from '@/hooks/useUnifiedEvaluation';
import { FileText, Calendar, MapPin, Users, BarChart3, FileSpreadsheet, ChevronDown, ChevronUp, RefreshCw, Brain, Sparkles, Search, Loader2, TrendingUp, Activity, Zap, FileDown } from 'lucide-react';

// Smart Reports Components
import FilterBar from '@/components/smart-reports/FilterBar';
import KPICards from '@/components/smart-reports/KPICards';
import TrendsChart from '@/components/smart-reports/TrendsChart';
import ComparisonTable from '@/components/smart-reports/ComparisonTable';
import type { ReportFilters, KPIResponse, TrendSeries, ComparisonResponse, InsightsResponse } from '@shared/schema';

interface Location {
  id: number;
  nameAr: string;
  nameEn: string;
  icon: string;
  description?: string;
  isActive: boolean;
}

interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
}

export default function Reports() {
  const { toast } = useToast();
  
  // حالات الفلاتر
  const [dateRange, setDateRange] = useState({
    startDate: format(addDays(new Date(), -30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);
  const [isUserSelectorOpen, setIsUserSelectorOpen] = useState(false);

  // استعلام المواقع
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
  });

  // استعلام المستخدمين
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // فلترة المستخدمين النشطين فقط واستبعاد اخصائي بيانات الشركة - مدير الشؤون الإدارية يظهر
  const filteredUsers = users.filter(user => 
    user.isActive && user.role !== 'data_specialist'
  );

  // حساب إحصائيات الفلاتر
  const selectedLocationsCount = selectedLocationIds.length > 0 ? selectedLocationIds.length : locations.length;
  const selectedUsersCount = selectedUserIds.length > 0 ? selectedUserIds.length : filteredUsers.length;

  // 🎯 النظام الموحد للمزامنة فقط
  const unifiedSystem = useUnifiedEvaluation();
  
  // 🔄 المزامنة اليدوية
  const handleManualSync = async () => {
    try {
      console.log('🚀 [Reports] بدء المزامنة اليدوية...');
      // استخدام syncNow للمزامنة
      await unifiedSystem.syncNow();
      
      toast({
        title: "تمت المزامنة",
        description: "تم نقل البيانات المحلية للخادم بنجاح",
        variant: "default"
      });
      
      // تحديث البيانات بعد المزامنة
      refetchData();
    } catch (error) {
      console.error('❌ فشل المزامنة:', error);
      toast({
        title: "فشل المزامنة",
        description: "حدث خطأ أثناء نقل البيانات للخادم",
        variant: "destructive"
      });
    }
  };
  
  // 🎯 Smart Reports API Queries
  const smartReportsFilters: ReportFilters = {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    locationIds: selectedLocationIds.length > 0 ? selectedLocationIds.map(id => Number(id)) : undefined,
    userIds: selectedUserIds.length > 0 ? selectedUserIds.map(id => Number(id)) : undefined
  };

  // KPI Overview Query
  const { data: kpiData, isLoading: isKpiLoading, error: kpiError } = useQuery<KPIResponse>({
    queryKey: ['/api/reports/overview', smartReportsFilters],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: smartReportsFilters.startDate,
        endDate: smartReportsFilters.endDate,
        ...(smartReportsFilters.locationIds && { locationIds: smartReportsFilters.locationIds.join(',') }),
        ...(smartReportsFilters.userIds && { userIds: smartReportsFilters.userIds.join(',') })
      });
      return apiRequest(`/api/reports/overview?${params.toString()}`, 'GET');
    }
  });

  // Trends Query
  const { data: trendsData, isLoading: isTrendsLoading, error: trendsError } = useQuery<TrendSeries>({
    queryKey: ['/api/reports/trends', smartReportsFilters],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: smartReportsFilters.startDate,
        endDate: smartReportsFilters.endDate,
        ...(smartReportsFilters.locationIds && { locationIds: smartReportsFilters.locationIds.join(',') }),
        ...(smartReportsFilters.userIds && { userIds: smartReportsFilters.userIds.join(',') })
      });
      return apiRequest(`/api/reports/trends?${params.toString()}`, 'GET');
    }
  });

  // Comparison Query
  const { data: comparisonData, isLoading: isComparisonLoading, error: comparisonError } = useQuery<ComparisonResponse>({
    queryKey: ['/api/reports/comparison', smartReportsFilters],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: smartReportsFilters.startDate,
        endDate: smartReportsFilters.endDate,
        ...(smartReportsFilters.locationIds && { locationIds: smartReportsFilters.locationIds.join(',') }),
        ...(smartReportsFilters.userIds && { userIds: smartReportsFilters.userIds.join(',') })
      });
      return apiRequest(`/api/reports/comparison?${params.toString()}`, 'GET');
    }
  });

  // Insights Query
  const { data: insightsData, isLoading: isInsightsLoading, error: insightsError } = useQuery<InsightsResponse>({
    queryKey: ['/api/reports/insights', smartReportsFilters],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: smartReportsFilters.startDate,
        endDate: smartReportsFilters.endDate,
        ...(smartReportsFilters.locationIds && { locationIds: smartReportsFilters.locationIds.join(',') }),
        ...(smartReportsFilters.userIds && { userIds: smartReportsFilters.userIds.join(',') })
      });
      return apiRequest(`/api/reports/insights?${params.toString()}`, 'GET');
    }
  });

  // 🎯 جلب البيانات من الخادم فقط (تجنب التكرار)
  const { data: unifiedEvaluations = [], isLoading: isDataLoading, refetch: refetchData } = useQuery({
    queryKey: ['server-evaluations', dateRange, selectedLocationIds, selectedUserIds],
    queryFn: async () => {
      console.log('🎯 [Reports] جلب البيانات من الخادم فقط (تجنب التكرار)...');
      console.log('🔍 [Reports] الفلاتر المطبقة:', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        selectedLocationIds,
        selectedUserIds
      });
      
      try {
        // ✅ جلب البيانات من الخادم مباشرة عبر API
        const params = new URLSearchParams({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          ...(selectedLocationIds.length > 0 && { 
            locationIds: selectedLocationIds.map(id => parseInt(id)).join(',') 
          }),
          ...(selectedUserIds.length > 0 && { 
            userIds: selectedUserIds.map(id => parseInt(id)).join(',') 
          })
        });
        
        console.log('🌐 [Reports] جلب البيانات من الخادم عبر API...');
        const serverEvaluations = await apiRequest(`/api/checklists?${params.toString()}`, 'GET');
        
        console.log(`✅ [Reports] تم جلب ${serverEvaluations.length} تقييم من الخادم (بدون تكرار)`);
        
        return serverEvaluations || [];
        
      } catch (error) {
        console.error('❌ [Reports] فشل جلب البيانات من الخادم:', error);
        toast({
          title: "خطأ في جلب البيانات",
          description: "تعذر جلب التقييمات من الخادم. تحقق من الاتصال.",
          variant: "destructive"
        });
        return [];
      }
    },
    staleTime: 30000, // 30 ثانية
    refetchOnWindowFocus: false
  });

  // إحصائيات البيانات من الخادم
  const totalEvaluations = unifiedEvaluations.length;

  // 🔍 DIAGNOSTIC: فحص البيانات المحلية
  const diagnosticMutation = useMutation({
    mutationFn: async () => {
      console.log('🔍 [Diagnostic] بدء فحص البيانات المحلية...');
      
      try {
        const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
        const allDataItems = await enhancedIndexedDB.getAllByType('data');
        
        console.log(`📊 [Diagnostic] إجمالي العناصر في IndexedDB: ${allDataItems.length}`);
        
        // البحث عن التقييمات
        const evaluationItems = allDataItems.filter(item => 
          item.id.includes('checklist') || 
          item.id.includes('evaluation') || 
          item.id.includes('offline')
        );
        
        console.log(`🎯 [Diagnostic] عدد التقييمات المحتملة: ${evaluationItems.length}`);
        
        // تصنيف التقييمات
        const localEvaluations = evaluationItems.filter(item => !item.value?.synced && !item.value?.isSynced);
        const syncedEvaluations = evaluationItems.filter(item => item.value?.synced || item.value?.isSynced);
        
        console.log(`🔍 [Diagnostic] التقييمات المحلية (غير متزامنة): ${localEvaluations.length}`);
        console.log(`✅ [Diagnostic] التقييمات المتزامنة: ${syncedEvaluations.length}`);
        
        // عرض تفاصيل التقييمات المحلية
        if (localEvaluations.length > 0) {
          console.log('📋 [Diagnostic] تفاصيل التقييمات المحلية:');
          localEvaluations.forEach((item, index) => {
            console.log(`  ${index + 1}. ${item.id}:`, {
              locationId: item.value?.locationId,
              userId: item.value?.userId,
              date: item.value?.checklistDate || item.value?.evaluationDate,
              tasksCount: (item.value?.tasks || item.value?.taskRatings || []).length,
              timestamp: new Date(item.timestamp).toLocaleString('ar-EG'),
              synced: item.value?.synced || false
            });
          });
          
          // محاولة المزامنة للتقييمات غير المتزامنة
          console.log('🔄 [Diagnostic] محاولة تشغيل المزامنة للتقييمات المحلية...');
          try {
            await unifiedSystem.syncNow();
            console.log('✅ [Diagnostic] تم تشغيل المزامنة بنجاح');
          } catch (syncError) {
            console.warn('⚠️ [Diagnostic] فشل في المزامنة:', syncError);
          }
        } else {
          console.log('❌ [Diagnostic] لا توجد تقييمات محلية غير متزامنة');
        }
        
        return {
          totalItems: allDataItems.length,
          evaluationItems: evaluationItems.length,
          localEvaluations: localEvaluations.length,
          syncedEvaluations: syncedEvaluations.length,
          localEvaluationsDetails: localEvaluations.map(item => ({
            id: item.id,
            locationId: item.value?.locationId,
            userId: item.value?.userId,
            date: item.value?.checklistDate || item.value?.evaluationDate,
            tasksCount: (item.value?.tasks || item.value?.taskRatings || []).length,
            timestamp: item.timestamp
          }))
        };
      } catch (error) {
        console.error('❌ [Diagnostic] فشل فحص البيانات:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "تم فحص البيانات المحلية",
        description: `العناصر الإجمالية: ${data.totalItems} | التقييمات: ${data.evaluationItems} | محلية: ${data.localEvaluations} | متزامنة: ${data.syncedEvaluations}`,
        variant: "default"
      });
    },
    onError: (error: any) => {
      toast({
        title: "فشل فحص البيانات",
        description: error.message || "حدث خطأ أثناء فحص البيانات المحلية",
        variant: "destructive"
      });
    }
  });

  // 🔧 MUTATION: Excel Report Export
  const exportMutation = useMutation({
    mutationFn: async () => {
      console.log('🚀 [Excel Report] Starting Excel export...');
      
      const reportData = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };
      
      console.log('📊 [Excel Report] Report data:', reportData);
      console.log('📅 [Excel Report] Date range:', { from: dateRange.startDate, to: dateRange.endDate });
      console.log('📍 [Excel Report] Selected locations:', selectedLocationIds);
      console.log('👤 [Excel Report] Selected users:', selectedUserIds);
      
      // الحصول على الرمز المميز من IndexedDB
      let token: string | null = null;
      try {
        const { enhancedIndexedDB } = await import("@/lib/enhancedIndexedDB");
        token = await enhancedIndexedDB.getAuthData('auth_token') || 
                await enhancedIndexedDB.getAuthData('token');
      } catch (error) {
        console.warn('⚠️ فشل في استرجاع الـ token من IndexedDB:', error);
      }

      if (!token) {
        throw new Error('لم يتم العثور على رمز التصريح. يرجى تسجيل الدخول مرة أخرى.');
      }

      // ✅ استخدام البيانات الموحدة المُجمعة مسبقاً
      console.log('🎯 [UnifiedData] استخدام النظام الموحد للتقارير...');
      
      try {
        console.log(`✅ [UnifiedData] استخدام ${unifiedEvaluations.length} تقييم من النظام الموحد`);
        
        // إذا وُجدت بيانات موحدة، أرسلها للخادم لتصدير Excel
        if (unifiedEvaluations.length > 0) {
          // 📝 تطبيق جميع الفلاتر (التاريخ، المواقع، المستخدمين) على البيانات الموحدة
          const filteredEvaluations = unifiedEvaluations.filter((evaluation: any) => {
            // فلتر التاريخ - استبعاد التقييمات بدون تاريخ
            const evalDate = evaluation.evaluationDate || evaluation.checklistDate || evaluation.date;
            if (!evalDate) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`📝 [DateFilter] Excluded: no date found`);
              }
              return false; // استبعاد صارم للتقييمات بدون تاريخ
            }
            
            const evaluationDate = new Date(evalDate).toISOString().split('T')[0];
            const startDateNormalized = new Date(dateRange.startDate).toISOString().split('T')[0];
            const endDateNormalized = new Date(dateRange.endDate).toISOString().split('T')[0];
            
            const isWithinDateRange = evaluationDate >= startDateNormalized && evaluationDate <= endDateNormalized;
            if (!isWithinDateRange) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`📝 [DateFilter] Excluded by date: ${evalDate}`);
              }
              return false;
            }
            
            // فلتر المواقع
            if (selectedLocationIds.length > 0) {
              const locationIdStr = evaluation.locationId?.toString();
              if (!selectedLocationIds.includes(locationIdStr)) {
                if (process.env.NODE_ENV === 'development') {
                  console.log(`📝 [LocationFilter] Excluded location: ${locationIdStr}`);
                }
                return false;
              }
            }
            
            // فلتر المستخدمين
            if (selectedUserIds.length > 0) {
              const userIdStr = evaluation.userId?.toString() || evaluation.evaluatorId?.toString();
              if (!selectedUserIds.includes(userIdStr)) {
                if (process.env.NODE_ENV === 'development') {
                  console.log(`📝 [UserFilter] Excluded user: ${userIdStr}`);
                }
                return false;
              }
            }
            
            return true;
          });
          
          console.log(`📝 [DateFilter] Filtered evaluations: ${filteredEvaluations.length} from ${unifiedEvaluations.length} total`);
          console.log(`📝 [DateFilter] Date range: ${dateRange.startDate} to ${dateRange.endDate}`);
          
          const unifiedReportData = {
            ...reportData,
            ...(selectedLocationIds.length > 0 && { locationIds: selectedLocationIds.map(id => parseInt(id)) }),
            ...(selectedUserIds.length > 0 && { userIds: selectedUserIds.map(id => parseInt(id)) }),
            evaluations: filteredEvaluations,
            useUnifiedData: true
          };
          
          // طلب البيانات من الخادم مع البيانات الموحدة
          const response = await fetch('/api/reports/export-excel', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(unifiedReportData),
            credentials: 'include'
          });
          
          return await response.blob();
        }
      } catch (unifiedError) {
        console.warn('⚠️ [UnifiedData] فشل النظام الموحد، التبديل للنظام التقليدي:', unifiedError);
      }
      
      // ❌ تراجع للنظام التقليدي فقط إذا فشل النظام الهجين
      console.log('🔄 [Fallback] استخدام النظام التقليدي كبديل...');
      const response = await fetch('/api/reports/export-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...reportData,
          ...(selectedLocationIds.length > 0 && { locationIds: selectedLocationIds.map(id => parseInt(id)) }),
          ...(selectedUserIds.length > 0 && { userIds: selectedUserIds.map(id => parseInt(id)) })
        }),
        credentials: 'include'
      });
      
      console.log('📡 [Excel Report] Server response status:', response.status);
      console.log('📡 [Excel Report] Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [Excel Report] Server error:', errorText);
        throw new Error(`خطأ من الخادم: ${response.status} - ${errorText}`);
      }
      
      // التحقق من نوع المحتوى
      const contentType = response.headers.get('content-type');
      console.log('📦 [Excel Report] Content type:', contentType);
      
      if (contentType?.includes('application/json')) {
        // إذا كان JSON، فهناك خطأ
        const errorData = await response.json();
        console.error('❌ [Excel Report] JSON error response:', errorData);
        throw new Error(errorData.message || 'خطأ غير معروف من الخادم');
      }
      
      // الحصول على البيانات كـ Blob
      const blob = await response.blob();
      console.log('📦 [Excel Report] Blob size:', blob.size, 'bytes');
      console.log('📦 [Excel Report] Blob type:', blob.type);
      
      if (blob.size === 0) {
        throw new Error('تم استلام ملف فارغ من الخادم');
      }
      
      return blob;
    },
    onMutate: () => {
      console.log('🔄 [Excel Report] Starting mutation...');
    },
    onSuccess: (blob) => {
      console.log('✅ [Excel Report] Mutation successful, processing download...');
      
      // إنشاء رابط التحميل
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `HSA_Work_Environment_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.style.display = 'none';
      document.body.appendChild(link);
      
      console.log('📊 [Frontend] Triggering download...', link.download);
      link.click();
      
      // تنظيف الموارد
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        console.log('✅ [Frontend] Download cleanup completed');
      }, 100);
      
      toast({
        title: "تم التصدير بنجاح! 🎉",
        description: "تم تحميل تقرير Excel الاحترافي بنجاح",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في التصدير",
        description: error.message || "حدث خطأ أثناء تصدير التقرير",
        variant: "destructive",
      });
    }
  });

  // 🧠 MUTATION: Smart AI Analysis File Download
  const smartAnalysisFileMutation = useMutation({
    mutationFn: async () => {
      console.log('📄 [Smart Analysis File] بدء إنشاء ملف التقرير الذكي...');
      
      const analysisData = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        includeComments: true,
        analysisType: 'comprehensive',
        fileFormat: 'html'
      };
      
      console.log('📊 [Smart Analysis File] تحضير البيانات:', analysisData);
      
      // استخدام fetch للحصول على blob للتحميل
      let token: string | null = null;
      try {
        const { enhancedIndexedDB } = await import("@/lib/enhancedIndexedDB");
        token = await enhancedIndexedDB.getAuthData('auth_token') || 
                await enhancedIndexedDB.getAuthData('token');
      } catch (error) {
        console.warn('⚠️ فشل في استرجاع الـ token من IndexedDB:', error);
      }

      if (!token) {
        throw new Error('لم يتم العثور على رمز التصريح. يرجى تسجيل الدخول مرة أخرى.');
      }
      
      // ✅ استخدام البيانات الموحدة للتحليل الذكي
      console.log('🧠 [SmartAnalysis] استخدام النظام الموحد للتحليل الذكي...');
      
      try {
        console.log(`✅ [SmartAnalysis] استخدام ${unifiedEvaluations.length} تقييم من النظام الموحد`);
        
        if (unifiedEvaluations.length > 0) {
          // 📝 تطبيق جميع الفلاتر على بيانات التحليل الذكي
          const filteredAnalysisEvaluations = unifiedEvaluations.filter((evaluation: any) => {
            // فلتر التاريخ - استبعاد التقييمات بدون تاريخ
            const evalDate = evaluation.evaluationDate || evaluation.checklistDate || evaluation.date;
            if (!evalDate) return false; // استبعاد صارم للتقييمات بدون تاريخ
            
            const evaluationDate = new Date(evalDate).toISOString().split('T')[0];
            const startDateNormalized = new Date(dateRange.startDate).toISOString().split('T')[0];
            const endDateNormalized = new Date(dateRange.endDate).toISOString().split('T')[0];
            
            const isWithinDateRange = evaluationDate >= startDateNormalized && evaluationDate <= endDateNormalized;
            if (!isWithinDateRange) return false;
            
            // فلتر المواقع
            if (selectedLocationIds.length > 0) {
              const locationIdStr = evaluation.locationId?.toString();
              if (!selectedLocationIds.includes(locationIdStr)) return false;
            }
            
            // فلتر المستخدمين
            if (selectedUserIds.length > 0) {
              const userIdStr = evaluation.userId?.toString() || evaluation.evaluatorId?.toString();
              if (!selectedUserIds.includes(userIdStr)) return false;
            }
            
            return true;
          });
          
          console.log(`📝 [SmartAnalysis DateFilter] Filtered: ${filteredAnalysisEvaluations.length} from ${unifiedEvaluations.length}`);
          
          const unifiedAnalysisData = {
            ...analysisData,
            ...(selectedLocationIds.length > 0 && { locationIds: selectedLocationIds.map(id => parseInt(id)) }),
            ...(selectedUserIds.length > 0 && { userIds: selectedUserIds.map(id => parseInt(id)) }),
            evaluations: filteredAnalysisEvaluations,
            useUnifiedData: true
          };
          
          const response = await fetch('/api/reports/smart-analysis-file', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(unifiedAnalysisData)
          });
          
          if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            console.error('❌ [Smart Analysis] خطأ من الخادم:', response.status, errorText);
            throw new Error(`فشل في إنشاء ملف التقرير (${response.status})`);
          }
          
          console.log('✅ [Smart Analysis] استجابة ناجحة من الخادم');
          const blob = await response.blob();
          console.log('✅ [Smart Analysis] تم تحويل المحتوى لـ blob:', blob.size, 'بايت');
          
          // ✅ تنفيذ التحميل مثل النظام التقليدي
          const fileName = `Smart_Analysis_Report_${new Date().toISOString().split('T')[0]}.html`;
          
          if (blob.size === 0) {
            throw new Error('الملف فارغ - لم يتم إنشاء المحتوى');
          }
          
          console.log('🔽 [Smart Analysis] بدء تحميل الملف:', fileName);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = fileName;
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          
          // تنظيف مع تأخير
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
            if (document.body.contains(a)) {
              document.body.removeChild(a);
            }
            console.log('✅ [Smart Analysis] تم تنظيف الملف المؤقت');
          }, 1000);
          
          return { success: true, fileName };
        }
      } catch (unifiedError) {
        console.warn('⚠️ [SmartAnalysis] فشل النظام الموحد، التبديل للنظام التقليدي:', unifiedError);
      }
      
      // ❌ تراجع للنظام التقليدي
      const response = await fetch('/api/reports/smart-analysis-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          startDate: analysisData.startDate,
          endDate: analysisData.endDate,
          includeComments: analysisData.includeComments,
          analysisType: analysisData.analysisType,
          fileFormat: analysisData.fileFormat,
          ...(selectedLocationIds.length > 0 && { locationIds: selectedLocationIds.map(id => parseInt(id)) }),
          ...(selectedUserIds.length > 0 && { userIds: selectedUserIds.map(id => parseInt(id)) })
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('❌ [Smart Analysis] خطأ من الخادم (تقليدي):', response.status, errorText);
        throw new Error(`فشل في إنشاء ملف التقرير (${response.status})`);
      }
      
      console.log('✅ [Smart Analysis] استجابة ناجحة من الخادم (تقليدي)');
      const blob = await response.blob();
      console.log('✅ [Smart Analysis] تم تحويل المحتوى لـ blob:', blob.size, 'بايت');
      
      const fileName = `Smart_Analysis_Report_${new Date().toISOString().split('T')[0]}.html`;
      
      // ✅ تحسين تحميل الملف
      if (blob.size === 0) {
        throw new Error('الملف فارغ - لم يتم إنشاء المحتوى');
      }
      
      console.log('🔽 [Smart Analysis] بدء تحميل الملف:', fileName);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      a.target = '_blank'; // فتح في نافذة جديدة كاحتياط
      document.body.appendChild(a);
      a.click();
      
      // تنظيف مع تأخير أطول
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        console.log('✅ [Smart Analysis] تم تنظيف الملف المؤقت');
      }, 1000);
      
      return { success: true, fileName };
    },
    onMutate: () => {
      console.log('🔄 [Smart Analysis File] بدء إنشاء ملف التقرير...');
    },
    onSuccess: (data) => {
      console.log('✅ [Smart Analysis File] تم إنشاء وتحميل الملف بنجاح:', data);
      
      toast({
        title: "تم إنشاء التقرير الذكي! 📄",
        description: `تم تحميل ملف التقرير الذكي بنجاح`,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      console.error('❌ [Smart Analysis File] خطأ في إنشاء الملف:', error);
      toast({
        title: "خطأ في إنشاء ملف التقرير",
        description: error.message || "حدث خطأ أثناء إنشاء ملف التقرير",
        variant: "destructive",
      });
    }
  });

  // ===== MUTATION: HTML Report Export =====
  const exportHtmlMutation = useMutation({
    mutationFn: async () => {
      console.log('🚀 [HTML Report] Starting HTML export…');
      
      const reportData = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        locationIds: selectedLocationIds,
        userIds: selectedUserIds,
        includeSmartAnalytics: true // إضافة علامة للتحليلات الذكية
      };
      
      console.log('📊 [HTML Report] Report data:', reportData);
      
      // استخدام نفس منطق الـ token المستخدم في PDF export
      const { enhancedIndexedDB } = await import("@/lib/enhancedIndexedDB");
      const token = await enhancedIndexedDB.getAuthData('auth_token') || 
                    await enhancedIndexedDB.getAuthData('token');
      if (!token) {
        throw new Error('لا يمكن العثور على رمز المصادقة');
      }
      
      const response = await fetch('/api/reports/export-html', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reportData)
      });
      
      if (!response.ok) {
        let errorMessage = `خطأ في الخادم: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData && typeof errorData === 'object' && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // If parsing JSON fails, use default error message
        }
        throw new Error(errorMessage);
      }
      
      const blob = await response.blob();
      console.log('✅ [HTML Report] تم تحويل الاستجابة لـ blob:', blob.size, 'bytes');
      
      return blob;
    },
    onSuccess: (blob) => {
      console.log('✅ [HTML Report] Mutation successful, processing download…');
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `HSA_Smart_Analytics_Report_${new Date().toISOString().split('T')[0]}.html`;
      link.style.display = 'none';
      document.body.appendChild(link);
      
      console.log('📊 [Frontend] Triggering HTML download…', link.download);
      link.click();
      
      // Cleanup resources
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        console.log('✅ [HTML Report] تم تنظيف الملف المؤقت');
      }, 1000);
      
      toast({
        title: "تم تصدير التقرير! 📄",
        description: "تم تحميل تقرير HTML بنجاح",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      console.error('❌ [HTML Report] خطأ في إنشاء التقرير:', error);
      toast({
        title: "خطأ في تصدير التقرير",
        description: error.message || "حدث خطأ أثناء إنشاء تقرير HTML",
        variant: "destructive",
      });
    }
  });


  // وظيفة تصدير التقرير Excel
  const handleExportReport = () => {
    exportMutation.mutate();
  };

  // وظيفة تصدير التقرير HTML  
  const handleExportHTML = () => {
    exportHtmlMutation.mutate();
  };

  // وظيفة التحليل الذكي - تحميل ملف
  const handleSmartAnalysisFile = () => {
    smartAnalysisFileMutation.mutate();
  };



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* العنوان الرئيسي */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-yellow-600" />
            📊 التقارير
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            إدارة وفلترة البيانات
          </p>
        </div>

        {/* واجهة التبويب الأساسية */}
        <Tabs defaultValue="traditional" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6" data-testid="reports-tabs">
            <TabsTrigger 
              value="traditional" 
              className="flex items-center gap-2 text-lg font-bold"
              data-testid="tab-traditional-reports"
            >
              <FileText className="w-5 h-5" />
              التقارير التقليدية
            </TabsTrigger>
            <TabsTrigger 
              value="smart" 
              className="flex items-center gap-2 text-lg font-bold"
              data-testid="tab-smart-analytics"
            >
              <TrendingUp className="w-5 h-5" />
              التحليلات الذكية
            </TabsTrigger>
          </TabsList>

          {/* التقارير التقليدية */}
          <TabsContent value="traditional" className="space-y-6">

        {/* عرض البيانات المباشر */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-yellow-600" />
                📋 معاينة البيانات
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    console.log('🔄 [Reports] المستخدم ضغط زر التحديث...');
                    refetchData();
                  }}
                  disabled={isDataLoading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isDataLoading ? 'animate-spin' : ''}`} />
                  تحديث
                </Button>
                
                {unifiedSystem.hasUnsynced && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleManualSync}
                    disabled={unifiedSystem.isSyncing || !unifiedSystem.isOnline}
                    className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black"
                  >
                    <RefreshCw className={`w-4 h-4 ${unifiedSystem.isSyncing ? 'animate-spin' : ''}`} />
                    مزامنة محلية ({unifiedSystem.syncStats.pendingSync})
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* تنبيه البيانات المحلية */}
            {unifiedSystem.hasUnsynced && (
              <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-600 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                  <div className="flex-1">
                    <h4 className="font-medium text-black dark:text-white">
                      📱 يوجد {unifiedSystem.syncStats.pendingSync} تقييم محفوظ محلياً
                    </h4>
                    <p className="text-sm text-black dark:text-white mt-1">
                      هذه التقييمات لم تظهر في التقارير بعد لأنها لم تتم مزامنتها مع الخادم. اضغط زر "مزامنة محلية" لنقلها.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* إحصائيات سريعة */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-yellow-300 dark:border-yellow-600">
                <div className="flex items-center gap-2 text-black dark:text-white">
                  <FileText className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium">إجمالي التقييمات</span>
                </div>
                <div className="text-2xl font-bold text-black dark:text-white mt-1">
                  {totalEvaluations}
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-yellow-300 dark:border-yellow-600">
                <div className="flex items-center gap-2 text-black dark:text-white">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="font-medium">من الخادم</span>
                </div>
                <div className="text-2xl font-bold text-black dark:text-white mt-1">
                  {totalEvaluations}
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-yellow-300 dark:border-yellow-600">
                <div className="flex items-center gap-2 text-black dark:text-white">
                  <Users className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium">المستخدمون المشمولون</span>
                </div>
                <div className="text-2xl font-bold text-black dark:text-white mt-1">
                  {Array.from(new Set(unifiedEvaluations.map((e: any) => e.userId))).length}
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-yellow-300 dark:border-yellow-600">
                <div className="flex items-center gap-2 text-black dark:text-white">
                  <MapPin className="w-5 h-5 text-black dark:text-white" />
                  <span className="font-medium">المواقع المشمولة</span>
                </div>
                <div className="text-2xl font-bold text-black dark:text-white mt-1">
                  {Array.from(new Set(unifiedEvaluations.map((e: any) => e.locationId))).length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* أزرار التصدير الاحترافي */}
        <Card className="mb-6 border-2 border-yellow-300 dark:border-yellow-600 bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              📊 إنشاء التقارير الاحترافية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* الفلاتر المدمجة - صف واحد بأزرار صغيرة */}
              <div className="flex flex-wrap items-center gap-3 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl border-2 border-yellow-300 dark:border-yellow-600">
                {/* زر فلتر الفترة الزمنية */}
                <Collapsible open={isLocationSelectorOpen} onOpenChange={setIsLocationSelectorOpen}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="h-10 px-4 bg-white hover:bg-yellow-50 border-2 border-yellow-400 text-gray-900 font-semibold rounded-lg shadow-sm hover:shadow-md transition-all"
                    >
                      <Calendar className="w-4 h-4 ml-2" />
                      <span className="text-sm">الفترة: {format(new Date(dateRange.startDate), 'dd/MM', { locale: ar })} - {format(new Date(dateRange.endDate), 'dd/MM', { locale: ar })}</span>
                      <ChevronDown className="w-4 h-4 mr-2" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="absolute z-50 mt-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 border-yellow-300 min-w-[320px]">
                    <div className="space-y-3">
                      <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-yellow-600" />
                        اختيار الفترة الزمنية
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">من</label>
                          <Input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                            className="h-9 text-sm"
                            data-testid="professional-report-start-date"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">إلى</label>
                          <Input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                            className="h-9 text-sm"
                            data-testid="professional-report-end-date"
                          />
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* زر فلتر المواقع */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="h-10 px-4 bg-white hover:bg-green-50 border-2 border-green-400 text-gray-900 font-semibold rounded-lg shadow-sm hover:shadow-md transition-all"
                    >
                      <MapPin className="w-4 h-4 ml-2 text-green-600" />
                      <span className="text-sm">المواقع: {selectedLocationIds.length > 0 ? `${selectedLocationIds.length} مختار` : 'الكل'}</span>
                      <ChevronDown className="w-4 h-4 mr-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto bg-white dark:bg-gray-800 text-black dark:text-white">
                    <div className="p-3 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b">
                        <span className="font-semibold text-sm text-black dark:text-white">اختيار المواقع</span>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLocationIds(locations.map(loc => loc.id.toString()))}
                            className="h-7 px-2 text-xs"
                            data-testid="button-select-all-locations"
                          >
                            الكل
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLocationIds([])}
                            className="h-7 px-2 text-xs text-red-600"
                            data-testid="button-clear-locations"
                          >
                            مسح
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {locations.map((location) => (
                          <div key={location.id} className="flex items-center space-x-2 space-x-reverse hover:bg-gray-50 p-2 rounded">
                            <Checkbox
                              id={`location-${location.id}`}
                              checked={selectedLocationIds.includes(location.id.toString())}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedLocationIds(prev => [...prev, location.id.toString()]);
                                } else {
                                  setSelectedLocationIds(prev => prev.filter(id => id !== location.id.toString()));
                                }
                              }}
                              data-testid={`checkbox-location-${location.id}`}
                            />
                            <label
                              htmlFor={`location-${location.id}`}
                              className="text-sm cursor-pointer flex-1 text-black dark:text-white"
                            >
                              {location.nameAr}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* زر فلتر المستخدمين */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="h-10 px-4 bg-white hover:bg-blue-50 border-2 border-blue-400 text-gray-900 font-semibold rounded-lg shadow-sm hover:shadow-md transition-all"
                    >
                      <Users className="w-4 h-4 ml-2 text-blue-600" />
                      <span className="text-sm">المستخدمين: {selectedUserIds.length > 0 ? `${selectedUserIds.length} مختار` : 'الكل'}</span>
                      <ChevronDown className="w-4 h-4 mr-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto bg-white dark:bg-gray-800 text-black dark:text-white">
                    <div className="p-3 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b">
                        <span className="font-semibold text-sm text-black dark:text-white">اختيار المستخدمين</span>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedUserIds(filteredUsers.map(user => user.id.toString()))}
                            className="h-7 px-2 text-xs"
                            data-testid="button-select-all-users"
                          >
                            الكل
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedUserIds([])}
                            className="h-7 px-2 text-xs text-red-600"
                            data-testid="button-clear-users"
                          >
                            مسح
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {filteredUsers.map((user) => (
                          <div key={user.id} className="flex items-center space-x-2 space-x-reverse hover:bg-gray-50 p-2 rounded">
                            <Checkbox
                              id={`user-${user.id}`}
                              checked={selectedUserIds.includes(user.id.toString())}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedUserIds(prev => [...prev, user.id.toString()]);
                                } else {
                                  setSelectedUserIds(prev => prev.filter(id => id !== user.id.toString()));
                                }
                              }}
                              data-testid={`checkbox-user-${user.id}`}
                            />
                            <label
                              htmlFor={`user-${user.id}`}
                              className="text-sm cursor-pointer flex-1 text-black dark:text-white"
                            >
                              <div className="font-medium text-black dark:text-white">{user.fullName}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">{user.role}</div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* ملخص الفلاتر */}
                <div className="flex-1 min-w-[200px] text-sm text-gray-700 dark:text-gray-300 font-medium">
                  <div className="flex items-center gap-4">
                    <span className="text-yellow-600 font-bold">{selectedLocationsCount} موقع</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-blue-600 font-bold">{selectedUsersCount} مستخدم</span>
                  </div>
                </div>
              </div>

              {/* أزرار تصدير التقارير الاحترافية */}
              <div className="max-w-lg mx-auto">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-black dark:text-white">
                    <BarChart3 className="w-4 h-4 text-yellow-600" />
                    <span className="font-medium">تصدير التقارير الاحترافية</span>
                  </div>
                  <div className="text-xs text-black dark:text-white bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border-l-4 border-yellow-400">
                    <strong>💼 تقرير شامل:</strong> جداول مفصلة • إحصائيات متقدمة • رسوم بيانية • تحليل الأداء
                  </div>
                  
                  {/* قائمة منسدلة للتصدير */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        disabled={exportMutation.isPending || exportHtmlMutation.isPending}
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        data-testid="button-export-dropdown"
                      >
                        <div className="flex items-center gap-3 justify-center">
                          {exportMutation.isPending || exportHtmlMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent"></div>
                              <span>جاري التصدير...</span>
                            </>
                          ) : (
                            <>
                              <FileDown className="w-5 h-5" />
                              <span>📊 تصدير التقرير الاحترافي</span>
                              <ChevronDown className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    
                    <DropdownMenuContent className="w-80 p-2 bg-white dark:bg-gray-800 text-black dark:text-white" align="center">
                      {/* خيار Excel */}
                      <DropdownMenuItem 
                        className="p-4 cursor-pointer hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg text-black dark:text-white"
                        onClick={handleExportReport}
                        disabled={exportMutation.isPending}
                        data-testid="option-export-excel"
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="flex items-center justify-center w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <FileSpreadsheet className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-black dark:text-white">تقرير Excel احترافي</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">جداول تفصيلية وإحصائيات متقدمة</div>
                          </div>
                          {exportMutation.isPending && (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent"></div>
                          )}
                        </div>
                      </DropdownMenuItem>
                      
                      {/* خيار HTML */}
                      <DropdownMenuItem 
                        className="p-4 cursor-pointer hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg mt-2 text-black dark:text-white"
                        onClick={handleExportHTML}
                        disabled={exportHtmlMutation.isPending}
                        data-testid="option-export-html"
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-black dark:text-white">تقرير HTML احترافي</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">تقرير تفاعلي للعرض والمشاركة</div>
                          </div>
                          {exportHtmlMutation.isPending && (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                          )}
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </CardContent>
            </Card>
          </TabsContent>

          {/* التحليلات الذكية */}
          <TabsContent value="smart" className="space-y-6">
            <Card className="border-2 border-yellow-300 dark:border-yellow-600 bg-white dark:bg-gray-900">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <Activity className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                    🎯 التحليلات الذكية المتقدمة
                  </CardTitle>
                  
                  {/* زر تصدير HTML */}
                  <Button
                    onClick={handleExportHTML}
                    disabled={exportHtmlMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2"
                    data-testid="button-export-html"
                  >
                    <div className="flex items-center gap-2">
                      {exportHtmlMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileDown className="w-4 h-4" />
                      )}
                      تصدير HTML
                    </div>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* شريط التصفية الموحد */}
                <FilterBar
                  users={filteredUsers as any}
                  locations={locations as any}
                  selectedUserIds={selectedUserIds}
                  selectedLocationIds={selectedLocationIds}
                  dateRange={{ startDate: dateRange.startDate, endDate: dateRange.endDate }}
                  onUserIdsChange={setSelectedUserIds}
                  onLocationIdsChange={setSelectedLocationIds}
                  onDateRangeChange={(range) => {
                    setDateRange({
                      startDate: range.startDate,
                      endDate: range.endDate
                    });
                  }}
                />

                {/* مؤشرات الأداء الرئيسية */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-600" />
                    مؤشرات الأداء الرئيسية
                  </h3>
                  {kpiError ? (
                    <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                      <p className="text-red-600 dark:text-red-400">خطأ في تحميل مؤشرات الأداء: {kpiError.message}</p>
                    </Card>
                  ) : (
                    <KPICards data={kpiData || null} isLoading={isKpiLoading} />
                  )}
                </div>

                {/* مخطط الاتجاهات */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-yellow-600" />
                    اتجاهات الأداء
                  </h3>
                  {trendsError ? (
                    <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                      <p className="text-red-600 dark:text-red-400">خطأ في تحميل الاتجاهات: {trendsError.message}</p>
                    </Card>
                  ) : (
                    <TrendsChart data={trendsData || null} isLoading={isTrendsLoading} />
                  )}
                </div>

                {/* جدول المقارنة */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-yellow-600" />
                    مقارنة الأداء
                  </h3>
                  {comparisonError ? (
                    <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                      <p className="text-red-600 dark:text-red-400">خطأ في تحميل المقارنة: {comparisonError.message}</p>
                    </Card>
                  ) : (
                    <ComparisonTable data={comparisonData || null} isLoading={isComparisonLoading} />
                  )}
                </div>

                {/* الرؤى الذكية */}
                {insightsData && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
                      <Brain className="w-5 h-5 text-yellow-600" />
                      الرؤى الذكية
                    </h3>
                    {insightsError ? (
                      <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                        <p className="text-red-600 dark:text-red-400">خطأ في تحميل الرؤى: {insightsError.message}</p>
                      </Card>
                    ) : (
                      <Card className="p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
                        <div className="prose max-w-none dark:prose-invert">
                          <div className="whitespace-pre-wrap text-sm">
                            {insightsData?.insights?.map((insight, index) => (
                              <div key={index} className="mb-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                <h4 className="font-bold text-lg mb-2">{insight.title}</h4>
                                <p className="text-gray-700 dark:text-gray-300">{insight.description}</p>
                                <span className={`inline-block px-2 py-1 rounded text-xs mt-2 ${
                                  insight.impact === 'high' ? 'bg-red-100 text-red-800' :
                                  insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {insight.impact === 'high' ? 'تأثير عالي' :
                                   insight.impact === 'medium' ? 'تأثير متوسط' : 'تأثير منخفض'}
                                </span>
                              </div>
                            )) || <p>لا توجد رؤى متاحة حالياً</p>}
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}