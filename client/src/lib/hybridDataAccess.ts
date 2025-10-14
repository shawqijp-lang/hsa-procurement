/**
 * 📊 نظام التقارير الموحد - مصدر واحد فقط
 * IndexedDB كمصدر وحيد للتقارير - المزامنة مع PostgreSQL فقط للنسخ الاحتياطي
 */

import React from 'react';
import { apiRequest } from '@/lib/queryClient';

// نوع التقييم الهجين للتقارير
export interface HybridEvaluation {
  id: string;
  locationId: number;
  userId: number;
  companyId: number;
  checklistDate: string;
  evaluationDate: string;
  finalScore: number;
  evaluationNotes: string;
  tasks: Array<{
    templateId: number;
    rating: number;
    notes: string;
    itemComment: string;
    completed: boolean;
  }>;
  categoryComments?: Record<string, string>;
  synced: boolean; // حالة المزامنة
  source: 'local' | 'server' | 'offline_checklist' | 'server_cached'; // مصدر البيانات
}

// إعدادات جلب البيانات الهجين
export interface HybridFetchOptions {
  startDate: string;
  endDate: string;
  locationIds?: number[];
  userId?: number;
  companyId?: number;
  includeLocalOnly?: boolean; // تضمين البيانات المحلية غير المتزامنة
}

/**
 * 📊 جلب التقييمات من المصدرين (المحلي + الخادم)
 */
export class HybridDataAccess {
  
  /**
   * 🔍 جلب جميع التقييمات (محلي + متزامن) - النظام الموحد
   */
  static async getEvaluationsHybrid(options: HybridFetchOptions): Promise<HybridEvaluation[]> {
    console.log('🔗 [HybridData] بدء جلب البيانات الهجين من النظام الموحد...');
    
    try {
      // 🎯 جلب البيانات مباشرة من النظام الموحد
      const allLocalEvaluations = await this.getUnifiedEvaluations();
      console.log(`📱 [HybridData] جلب ${allLocalEvaluations.length} تقييم من النظام الموحد`);
      
      // 🔄 تحويل البيانات للصيغة المطلوبة
      const convertedEvaluations = allLocalEvaluations.map(evaluation => ({
        id: evaluation.id || evaluation.offlineId || evaluation.evaluationId,
        locationId: evaluation.locationId,
        userId: evaluation.userId || evaluation.evaluatorId,
        companyId: evaluation.companyId,
        checklistDate: evaluation.checklistDate || evaluation.evaluationDate,
        evaluationDate: evaluation.evaluationDate || evaluation.checklistDate,
        finalScore: evaluation.finalScore || evaluation.overallRating || 0,
        evaluationNotes: evaluation.evaluationNotes || evaluation.generalNotes || '',
        tasks: evaluation.tasks || [],
        categoryComments: evaluation.categoryComments || {},
        synced: evaluation.synced || false,
        source: evaluation.synced ? 'server' : 'local'
      })) as HybridEvaluation[];
      
      // فلترة حسب التاريخ والموقع
      const filteredEvaluations = convertedEvaluations.filter(evaluation => {
        // فلترة التاريخ
        const evalDate = evaluation.evaluationDate || evaluation.checklistDate;
        if (evalDate && (evalDate < options.startDate || evalDate > options.endDate)) {
          return false;
        }
        
        // فلترة الموقع
        if (options.locationIds && options.locationIds.length > 0) {
          return options.locationIds.includes(evaluation.locationId);
        }
        
        return true;
      });
      
      console.log(`✅ [HybridData] تم تحويل وفلترة ${filteredEvaluations.length} تقييم`);
      
      // عرض عينة من البيانات للتشخيص
      if (filteredEvaluations.length > 0) {
        console.log('🔍 [HybridData] عينة من التقييمات المحولة:', {
          firstEval: {
            id: filteredEvaluations[0].id,
            locationId: filteredEvaluations[0].locationId,
            userId: filteredEvaluations[0].userId,
            synced: filteredEvaluations[0].synced,
            source: filteredEvaluations[0].source,
            date: filteredEvaluations[0].evaluationDate,
            tasksCount: filteredEvaluations[0].tasks?.length || 0
          },
          totalCount: filteredEvaluations.length,
          localCount: filteredEvaluations.filter(e => !e.synced).length,
          syncedCount: filteredEvaluations.filter(e => e.synced).length
        });
      }
      
      return filteredEvaluations;
      
    } catch (error) {
      console.error('❌ [HybridData] خطأ في جلب البيانات من النظام الموحد:', error);
      
      // التراجع للنظام القديم في حالة الخطأ
      console.log('📱 [HybridData] التراجع للنظام القديم...');
      return await this.getEvaluationsHybridFallback(options);
    }
  }
  
  /**
   * 🔄 النظام القديم كنسخة احتياطية
   */
  static async getEvaluationsHybridFallback(options: HybridFetchOptions): Promise<HybridEvaluation[]> {
    console.log('🔗 [HybridData] بدء النظام الاحتياطي...');
    
    try {
      // 1️⃣ جلب البيانات المحلية من IndexedDB
      const localEvaluations = await this.getLocalEvaluations(options);
      console.log(`📱 [HybridData] جلب ${localEvaluations.length} تقييم محلي`);
      
      // 2️⃣ جلب البيانات المتزامنة من الخادم (مع timeout محسن)
      let serverEvaluations: HybridEvaluation[] = [];
      if (navigator.onLine) {
        try {
          // ⏱️ محاولة جلب البيانات مع timeout محدود
          const serverPromise = this.getServerEvaluations(options);
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Server timeout: 25 seconds')), 25000);
          });
          
          serverEvaluations = await Promise.race([serverPromise, timeoutPromise]);
          console.log(`🌐 [HybridData] جلب ${serverEvaluations.length} تقييم من الخادم`);
        } catch (serverError) {
          const errorMessage = serverError instanceof Error ? serverError.message : 'Unknown error';
          console.warn('⚠️ [HybridData] فشل جلب البيانات من الخادم (استخدام البيانات المحلية فقط):', errorMessage);
        }
      } else {
        console.log('📱 [HybridData] وضع عدم الاتصال - استخدام البيانات المحلية فقط');
      }
      
      // 3️⃣ دمج البيانات وإزالة التكرار
      const mergedEvaluations = await this.mergeAndDeduplicateEvaluations(
        localEvaluations, 
        serverEvaluations
      );
      
      console.log(`✅ [HybridData] إجمالي التقييمات المدمجة: ${mergedEvaluations.length}`);
      return mergedEvaluations;
      
    } catch (error) {
      console.error('❌ [HybridData] خطأ في النظام الاحتياطي:', error);
      throw error;
    }
  }
  
  /**
   * 🎯 جلب التقييمات من النظام الموحد مباشرة
   */
  static async getUnifiedEvaluations(): Promise<any[]> {
    try {
      const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
      const allDataItems = await enhancedIndexedDB.getAllByType('data');
      
      console.log(`🔍 [UnifiedData] فحص ${allDataItems.length} عنصر في IndexedDB`);
      
      // البحث عن التقييمات (محلية ومتزامنة)
      const evaluations = allDataItems
        .filter(item => 
          item.id.startsWith('offline_checklist_') || 
          item.id.startsWith('evaluation_') ||
          item.id.includes('checklist')
        )
        .map(item => ({
          ...item.value,
          id: item.id,
          originalKey: item.id
        }));
      
      console.log(`🔍 [UnifiedData] وُجد ${evaluations.length} تقييم في النظام الموحد`);
      
      // عرض عينة من المفاتيح والبيانات للتشخيص
      if (evaluations.length > 0) {
        console.log('🔍 [UnifiedData] عينة من المفاتيح:', evaluations.slice(0, 3).map(e => e.originalKey));
        console.log('🔍 [UnifiedData] عينة من البيانات:', evaluations.slice(0, 1).map(e => ({
          key: e.originalKey,
          locationId: e.locationId,
          userId: e.userId,
          evaluationDate: e.evaluationDate || e.checklistDate,
          tasksCount: e.tasks?.length || 0,
          synced: e.synced,
          source: e.source
        })));
      }
      
      return evaluations;
      
    } catch (error) {
      console.error('❌ [UnifiedData] فشل جلب البيانات من النظام الموحد:', error);
      return [];
    }
  }

  /**
   * 📱 جلب البيانات المحلية من IndexedDB
   */
  private static async getLocalEvaluations(options: HybridFetchOptions): Promise<HybridEvaluation[]> {
    try {
      const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
      console.log('🔍 [HybridData] البحث عن البيانات المحلية في IndexedDB...', options);
      console.log(`🔍 [HybridData] البحث عن تقييمات من ${options.startDate} إلى ${options.endDate}`);
      
      // البحث في مختلف أماكن التخزين المحتملة
      const localEvaluations: any[] = [];
      
      // 🔍 البحث الشامل في IndexedDB أولاً
      console.log('🔍 [HybridData] بدء البحث الشامل في IndexedDB...');
      const allDataItems = await enhancedIndexedDB.getAllByType('data');
      console.log(`🔍 [HybridData] إجمالي العناصر في IndexedDB: ${allDataItems.length}`);
      
      // عرض أمثلة من المفاتيح الموجودة
      const sampleKeys = allDataItems.slice(0, 10).map(item => item.id);
      console.log('🔍 [HybridData] عينة من المفاتيح الموجودة:', sampleKeys);
      
      // 1️⃣ البحث في النظام الموحد الجديد  
      try {
        const unifiedData = await enhancedIndexedDB.getAuthData('unified_offline_evaluations');
        if (unifiedData && Array.isArray(unifiedData)) {
          localEvaluations.push(...unifiedData);
          console.log(`📱 [HybridData] وجد ${unifiedData.length} تقييم في النظام الموحد`);
        }
      } catch (error) {
        console.warn('⚠️ [HybridData] لا توجد بيانات في النظام الموحد:', error);
      }
      
      // 1.5️⃣ البحث في التقييمات المتزامنة (من الخادم)
      try {
        const syncedEvaluations = allDataItems.filter(item => 
          item.id.startsWith('evaluation_') && item.value?.synced
        );
        
        for (const item of syncedEvaluations) {
          localEvaluations.push({
            ...item.value,
            id: item.id,
            source: 'server_cached'
          });
        }
        
        if (syncedEvaluations.length > 0) {
          console.log(`📱 [HybridData] وجد ${syncedEvaluations.length} تقييم متزامن من الخادم`);
        }
      } catch (error) {
        console.warn('⚠️ [HybridData] فشل جلب التقييمات المتزامنة:', error);
      }
      
      // 2️⃣ البحث في التقييمات المحفوظة بمفاتيح منفصلة (offline_checklist_*)
      try {
        const offlineChecklistItems = allDataItems.filter(item => 
          item.id.startsWith('offline_checklist_')
        );
        
        console.log(`🔍 [HybridData] فحص ${offlineChecklistItems.length} عنصر offline_checklist`);
        
        for (const item of offlineChecklistItems) {
          if (item.value) {
            const evaluationData = {
              ...item.value,
              id: item.id,
              source: 'offline_checklist',
              timestamp: item.timestamp
            };
            localEvaluations.push(evaluationData);
            
            console.log(`🔍 [HybridData] تفاصيل التقييم المحلي:`, {
              id: item.id,
              locationId: item.value.locationId,
              userId: item.value.userId,
              taskCount: item.value.taskRatings?.length || 0,
              isOffline: item.value.isOffline,
              synced: item.value.synced,
              timestamp: new Date(item.timestamp).toLocaleString('ar-EG')
            });
          }
        }
        
        if (offlineChecklistItems.length > 0) {
          console.log(`📱 [HybridData] وجد ${offlineChecklistItems.length} تقييم محلي: ${offlineChecklistItems.map(i => i.id).join(', ')}`);
        }
      } catch (error) {
        console.warn('⚠️ [HybridData] فشل البحث في offline_checklist:', error);
      }
      
      // 3️⃣ البحث في النظام المبسط (PhoneStorage)
      try {
        const { getFromPhone } = await import('@/lib/simplePhoneStorage');
        const phoneData = await getFromPhone('offline_evaluations');
        if (phoneData && Array.isArray(phoneData)) {
          localEvaluations.push(...phoneData.map((item: any) => ({
            ...item,
            source: 'local',
            synced: false
          })));
          console.log(`📱 [HybridData] وجد ${phoneData.length} تقييم في PhoneStorage`);
        }
      } catch (error) {
        console.warn('⚠️ [HybridData] لا توجد بيانات في PhoneStorage:', error);
      }
      
      console.log(`📊 [HybridData] إجمالي التقييمات المحلية قبل الفلترة: ${localEvaluations.length}`);
      
      if (localEvaluations.length === 0) {
        console.log('📱 [HybridData] لا توجد تقييمات محلية - ربما لم يتم حفظ أي تقييمات بعد');
        
        // 🔍 تشخيص مفصل: فحص جميع البيانات المحفوظة
        try {
          // استخدام طريقة مختلفة للوصول لجميع المفاتيح
          const allDataItems = await enhancedIndexedDB.getAllByType('data');
          const allAuthItems = await enhancedIndexedDB.getAllByType('auth');
          
          const allKeys = [
            ...allDataItems.map(item => item.id),
            ...allAuthItems.map(item => item.id)
          ];
          
          console.log('🔍 [HybridData] جميع المفاتيح في IndexedDB:', allKeys);
          
          const relevantKeys = allKeys.filter(key => 
            key.includes('checklist') || 
            key.includes('evaluation') || 
            key.includes('offline') ||
            key.startsWith('unified_')
          );
          
          if (relevantKeys.length > 0) {
            console.log('🔍 [HybridData] مفاتيح متعلقة بالتقييمات:', relevantKeys);
            
            for (const key of relevantKeys) {
              try {
                const data = await enhancedIndexedDB.getItem(key);
                console.log(`🔍 [HybridData] محتوى ${key}:`, data);
              } catch (e) {
                console.warn(`⚠️ [HybridData] فشل قراءة ${key}:`, e);
              }
            }
          } else {
            console.log('🔍 [HybridData] لا توجد مفاتيح متعلقة بالتقييمات');
          }
        } catch (diagError) {
          console.warn('⚠️ [HybridData] فشل التشخيص المفصل:', diagError);
        }
        
        return [];
      }
      
      // تطبيق الفلاتر
      const filteredEvaluations = localEvaluations
        .filter(evaluation => {
          // التأكد من وجود البيانات الأساسية
          if (!evaluation.locationId || !evaluation.evaluationDate) {
            console.warn('⚠️ [HybridData] تقييم مفقود البيانات الأساسية:', evaluation);
            return false;
          }
          
          // فلتر التاريخ (مع تساهل في الفلترة للاختبار)
          try {
            if (options.startDate && options.endDate) {
              const evalDate = new Date(evaluation.checklistDate || evaluation.evaluationDate);
              const startDate = new Date(options.startDate);
              const endDate = new Date(options.endDate);
              
              if (evalDate < startDate || evalDate > endDate) return false;
            }
          } catch (dateError) {
            console.warn('⚠️ [HybridData] خطأ في تحليل التاريخ:', dateError);
            // لا نستبعد التقييم بسبب خطأ في التاريخ
          }
          
          // فلتر الموقع
          if (options.locationIds && options.locationIds.length > 0) {
            if (!options.locationIds.includes(evaluation.locationId)) return false;
          }
          
          // فلتر المستخدم
          if (options.userId && evaluation.userId !== options.userId) return false;
          
          // فلتر الشركة  
          if (options.companyId && evaluation.companyId !== options.companyId) return false;
          
          // فلتر المتزامن/غير متزامن
          if (!options.includeLocalOnly && !evaluation.synced) return false;
          
          return true;
        })
        .map(evaluation => ({
          ...evaluation,
          id: evaluation.id || `local_${Date.now()}_${Math.random()}`,
          source: 'local' as const,
          synced: evaluation.synced || false,
          tasks: Array.isArray(evaluation.tasks) ? evaluation.tasks.map((task: any) => ({
            ...task,
            completed: task.rating > 0 // تحويل للتوافق مع واجهة التقارير
          })) : []
        }));
        
      console.log(`✅ [HybridData] بعد الفلترة: ${filteredEvaluations.length} تقييم محلي`);
      return filteredEvaluations;
        
    } catch (error) {
      console.error('❌ [HybridData] فشل جلب البيانات المحلية:', error);
      return [];
    }
  }
  
  /**
   * 🌐 جلب البيانات من الخادم
   */
  private static async getServerEvaluations(options: HybridFetchOptions): Promise<HybridEvaluation[]> {
    try {
      // ✅ استخدام الـ endpoint الصحيح الذي يرجع JSON
      console.log('🌐 [HybridData] جلب البيانات من /api/checklists/company-evaluations');
      
      // جلب جميع تقييمات الشركة (JSON data)
      const evaluationsData = await apiRequest('/api/checklists/company-evaluations', 'GET');
      
      if (!evaluationsData || !Array.isArray(evaluationsData)) {
        console.warn('⚠️ [HybridData] البيانات المستلمة من الخادم غير صالحة');
        throw new Error('Invalid server data format');
      }
      
      console.log(`✅ [HybridData] تم جلب ${evaluationsData.length} تقييم من الخادم`);
      
      // تحويل البيانات لصيغة HybridEvaluation مع فلترة حسب الخيارات
      const serverEvaluations: HybridEvaluation[] = evaluationsData
        .filter((evaluation: any) => {
          // فلتر التاريخ
          if (options.startDate) {
            const evalDate = new Date(evaluation.checklistDate || evaluation.evaluationDate);
            const startDate = new Date(options.startDate);
            if (evalDate < startDate) return false;
          }
          
          if (options.endDate) {
            const evalDate = new Date(evaluation.checklistDate || evaluation.evaluationDate);
            const endDate = new Date(options.endDate);
            if (evalDate > endDate) return false;
          }
          
          // فلتر الموقع
          if (options.locationIds && options.locationIds.length > 0) {
            if (!options.locationIds.includes(evaluation.locationId)) return false;
          }
          
          // فلتر المستخدم
          if (options.userId && evaluation.userId !== options.userId) return false;
          
          // فلتر الشركة  
          if (options.companyId && evaluation.companyId !== options.companyId) return false;
          
          return true;
        })
        .map((evaluation: any) => ({
          id: `server_${evaluation.id}`,
          locationId: evaluation.locationId,
          userId: evaluation.userId,
          companyId: evaluation.companyId,
          checklistDate: evaluation.checklistDate || evaluation.evaluationDate,
          evaluationDate: evaluation.evaluationDate || evaluation.checklistDate,
          finalScore: evaluation.finalScore || 0,
          evaluationNotes: evaluation.evaluationNotes || evaluation.notes || '',
          tasks: Array.isArray(evaluation.tasks) ? evaluation.tasks : [],
          categoryComments: evaluation.categoryComments || {},
          source: 'server' as const,
          synced: true
        }));
      
      return serverEvaluations;
      
    } catch (error) {
      console.error('❌ [HybridData] فشل جلب البيانات من الخادم:', error);
      throw error;
    }
  }
  
  /**
   * 🔄 دمج البيانات وإزالة التكرار
   */
  private static async mergeAndDeduplicateEvaluations(
    localEvaluations: HybridEvaluation[],
    serverEvaluations: HybridEvaluation[]
  ): Promise<HybridEvaluation[]> {
    
    const merged = new Map<string, HybridEvaluation>();
    
    // أولاً: إضافة التقييمات من الخادم (أولوية أعلى للمتزامن)
    serverEvaluations.forEach(evaluation => {
      const key = `${evaluation.locationId}_${evaluation.userId}_${evaluation.checklistDate}`;
      merged.set(key, evaluation);
    });
    
    // ثانياً: إضافة التقييمات المحلية (فقط إذا لم تكن موجودة مسبقاً)
    localEvaluations.forEach(evaluation => {
      const key = `${evaluation.locationId}_${evaluation.userId}_${evaluation.checklistDate}`;
      
      if (!merged.has(key)) {
        // تقييم محلي جديد لم يُتزامن بعد
        merged.set(key, evaluation);
      }
    });
    
    const result = Array.from(merged.values());
    
    console.log('🔄 [HybridData] نتائج الدمج:', {
      localCount: localEvaluations.length,
      serverCount: serverEvaluations.length,
      mergedCount: result.length,
      localOnlyCount: result.filter(e => e.source === 'local').length
    });
    
    return result;
  }
  
  /**
   * 📊 إحصائيات البيانات الهجين
   */
  static async getHybridDataStats(): Promise<{
    local: { total: number; pending: number; synced: number };
    online: boolean;
    lastSync: number;
  }> {
    try {
      // جلب إحصائيات المزامنة من enhancedIndexedDB
      const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
      
      // جلب جميع التقييمات المحلية
      const UNIFIED_STORAGE_KEY = 'unified_offline_evaluations';
      const existingData = await enhancedIndexedDB.getAuthData(UNIFIED_STORAGE_KEY);
      const localEvaluations = existingData ? (Array.isArray(existingData) ? existingData : []) : [];
      
      const syncedEvaluations = localEvaluations.filter((evaluation: any) => evaluation.synced);
      const pendingEvaluations = localEvaluations.filter((evaluation: any) => !evaluation.synced);
      
      return {
        local: {
          total: localEvaluations.length,
          pending: pendingEvaluations.length,
          synced: syncedEvaluations.length
        },
        online: navigator.onLine,
        lastSync: Date.now() // يمكن تحسينه لاحقاً
      };
    } catch (error) {
      console.error('❌ [HybridData] فشل جلب الإحصائيات:', error);
      return {
        local: { total: 0, pending: 0, synced: 0 },
        online: navigator.onLine,
        lastSync: 0
      };
    }
  }
}

/**
 * 🎯 Hook للوصول الهجين في React Components
 */
export function useHybridEvaluations(options: HybridFetchOptions) {
  const [data, setData] = React.useState<HybridEvaluation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const evaluations = await HybridDataAccess.getEvaluationsHybrid(options);
        setData(evaluations);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'خطأ في جلب البيانات');
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [JSON.stringify(options)]);
  
  return { data, loading, error };
}