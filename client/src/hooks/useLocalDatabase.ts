/**
 * 🪝 Hook لاستخدام قاعدة البيانات المحلية المتقدمة
 * يدمج النظام المحلي مع واجهة React
 */

import { useState, useEffect, useCallback } from 'react';
import { enhancedIndexedDB } from '@/lib/enhancedIndexedDB';
// تم إزالة النظام المعطل

interface LocalDatabaseState {
  evaluations: any[];
  templates: any[];
  locations: any[];
  syncStats: any;
  isLoading: boolean;
  error: string | null;
}

interface UseLocalDatabaseOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useLocalDatabase(options: UseLocalDatabaseOptions = {}) {
  const { autoRefresh = true, refreshInterval = 30000 } = options;

  const [state, setState] = useState<LocalDatabaseState>({
    evaluations: [],
    templates: [],
    locations: [],
    syncStats: { pendingItems: 0, failedItems: 0, totalSynced: 0, isOnline: true, syncInProgress: false },
    isLoading: true,
    error: null
  });

  // تحديث البيانات من قاعدة البيانات المحلية
  const refreshData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // استخدام enhancedIndexedDB بدلاً من localDB غير المعرف
      const [evaluations, templates, locations] = await Promise.all([
        [], // تم تعطيل getEvaluations مؤقتاً
        [], // تم تعطيل getTemplates مؤقتاً  
        []  // تم تعطيل getLocations مؤقتاً
      ]);

      setState(prev => ({
        ...prev,
        evaluations,
        templates,
        locations,
        isLoading: false
      }));
    } catch (error) {
      console.error('❌ فشل في تحديث البيانات المحلية:', error);
      setState(prev => ({
        ...prev,
        error: (error as Error).message,
        isLoading: false
      }));
    }
  }, []);

  // حفظ تقييم جديد - استخدام النظام المتقدم مباشرة
  const saveEvaluation = useCallback(async (evaluationData: any): Promise<string> => {
    try {
      console.log('💾 حفظ تقييم بالنظام المتقدم (IndexedDB):', evaluationData);
      
      // استخدام enhancedIndexedDB مباشرة - هذا يحفظ في IndexedDB ويضع في قائمة المزامنة
      await enhancedIndexedDB.saveEvaluation(evaluationData);
      
      console.log('✅ تم حفظ التقييم في IndexedDB وإضافته لقائمة المزامنة');
      
      // إنشاء معرف للعودة
      const evaluationId = `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // تشغيل المزامنة فوراً إذا كان متصل
      if (navigator.onLine) {
        console.log('🌐 الجهاز متصل - محاولة المزامنة الفورية');
        // تم تعطيل sync manager - استخدم IndexedDB مباشرة
        console.log('⚠️ Sync manager disabled - using IndexedDB directly');
      }
      
      await refreshData(); // تحديث البيانات المحلية
      return `evaluation_${Date.now()}`;
    } catch (error) {
      console.error('❌ فشل في حفظ التقييم:', error);
      throw error;
    }
  }, [refreshData]);

  // الحصول على التقييمات مع فلترة
  const getFilteredEvaluations = useCallback((filters: {
    locationId?: number;
    userId?: number;
    startDate?: string;
    endDate?: string;
    unsyncedOnly?: boolean;
  } = {}) => {
    return state.evaluations.filter(evaluation => {
      if (filters.locationId && evaluation.locationId !== filters.locationId) return false;
      if (filters.userId && evaluation.userId !== filters.userId) return false;
      if (filters.startDate && evaluation.checklistDate < filters.startDate) return false;
      if (filters.endDate && evaluation.checklistDate > filters.endDate) return false;
      if (filters.unsyncedOnly && evaluation.synced) return false;
      return true;
    });
  }, [state.evaluations]);

  // إحصائيات سريعة
  const getQuickStats = useCallback(() => {
    const totalEvaluations = state.evaluations.length;
    const unsyncedEvaluations = state.evaluations.filter(e => !e.synced).length;
    const syncedEvaluations = totalEvaluations - unsyncedEvaluations;
    const syncProgress = totalEvaluations > 0 ? (syncedEvaluations / totalEvaluations) * 100 : 100;

    return {
      totalEvaluations,
      syncedEvaluations,
      unsyncedEvaluations,
      syncProgress,
      totalTemplates: state.templates.length,
      totalLocations: state.locations.length
    };
  }, [state.evaluations, state.templates, state.locations]);

  // مزامنة فورية
  const forceSync = useCallback(async (): Promise<boolean> => {
    try {
      console.log('⚠️ النظام المعطل تم إزالته - استخدم النظام الموحد');
      return false;
    } catch (error) {
      console.error('❌ فشل في المزامنة الفورية:', error);
      return false;
    }
  }, [refreshData]);

  // مسح البيانات المحلية
  const clearLocalData = useCallback(async () => {
    try {
      // استخدام enhancedIndexedDB لمسح البيانات
      console.log('⚠️ تم تعطيل مسح قاعدة البيانات مؤقتاً');
      console.log('⚠️ النظام المعطل تم إزالته');
      await refreshData();
    } catch (error) {
      console.error('❌ فشل في مسح البيانات المحلية:', error);
      throw error;
    }
  }, [refreshData]);

  // الحصول على تقييمات موقع محدد
  const getLocationEvaluations = useCallback((locationId: number) => {
    return state.evaluations.filter(e => e.locationId === locationId);
  }, [state.evaluations]);

  // الحصول على قوالب موقع محدد
  const getLocationTemplates = useCallback((locationId: number) => {
    return state.templates.filter(t => t.locationId === locationId);
  }, [state.templates]);

  // إعداد المستمعين والتحديث التلقائي
  useEffect(() => {
    // تحديث أولي
    refreshData();

    // تم إزالة المستمع للنظام المعطل

    // تحديث دوري
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(refreshData, refreshInterval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [refreshData, autoRefresh, refreshInterval]);

  return {
    // البيانات
    evaluations: state.evaluations,
    templates: state.templates,
    locations: state.locations,
    syncStats: state.syncStats,
    
    // الحالة
    isLoading: state.isLoading,
    error: state.error,
    
    // الوظائف
    saveEvaluation,
    refreshData,
    forceSync,
    clearLocalData,
    
    // المساعدات
    getFilteredEvaluations,
    getLocationEvaluations,
    getLocationTemplates,
    getQuickStats
  };
}

/**
 * Hook مخصص للمزامنة فقط
 */
// تم إزالة useSync - استخدم النظام الموحد

/**
 * Hook للإحصائيات السريعة
 */
// تم إزالة useLocalStats - استخدم النظام الموحد