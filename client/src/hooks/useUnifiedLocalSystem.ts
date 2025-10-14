/**
 * 🎯 نظام التقييمات الموحد المحلي
 * Hook محسن يدمج جميع أنظمة التقييمات في نظام واحد موحد
 * يدعم الدمج التلقائي والمزامنة وإدارة البيانات المحلية
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { unifiedLocalService } from '@/lib/unifiedLocalService';
import { 
  UnifiedLocalEvaluation, 
  UNIFIED_LOCAL_KEYS
} from '@/lib/unifiedLocalSchema';
import { apiRequest } from '@/lib/queryClient';

interface UseUnifiedLocalSystemProps {
  autoMigrate?: boolean;    // دمج تلقائي عند البدء
  autoSync?: boolean;       // مزامنة تلقائية مع الخادم
  syncIntervalMs?: number;  // فترة المزامنة
}

interface UnifiedSystemState {
  // 🔄 حالات النظام
  isInitialized: boolean;
  isMigrating: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  
  // 📊 البيانات
  evaluations: UnifiedLocalEvaluation[];
  pendingSync: UnifiedLocalEvaluation[];
  
  // 📈 إحصائيات
  stats: {
    totalEvaluations: number;
    pendingSyncCount: number;
    syncedCount: number;
    errorCount: number;
    migrationStatus?: {
      completed: boolean;
      migratedCount: number;
      errors: string[];
    };
  };
  
  // 🔔 حالات التنبيه
  error: string | null;
  lastSync: number | null;
}

export function useUnifiedLocalSystem(props: UseUnifiedLocalSystemProps = {}) {
  const {
    autoMigrate = true,
    autoSync = true,
    syncIntervalMs = 30000  // 30 ثانية
  } = props;
  
  const { user } = useAuth();
  
  // 🏗️ حالة النظام الموحد
  const [state, setState] = useState<UnifiedSystemState>({
    isInitialized: false,
    isMigrating: false,
    isLoading: false,
    isSyncing: false,
    evaluations: [],
    pendingSync: [],
    stats: {
      totalEvaluations: 0,
      pendingSyncCount: 0,
      syncedCount: 0,
      errorCount: 0
    },
    error: null,
    lastSync: null
  });
  
  // 🚀 تهيئة النظام الموحد
  const initializeSystem = useCallback(async () => {
    if (!user) {
      console.log('⏸️ [UnifiedSystem] لا يوجد مستخدم، تأجيل التهيئة');
      return;
    }
    
    console.log('🚀 [UnifiedSystem] بدء تهيئة النظام الموحد...');
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // تحميل التقييمات الموجودة
      const existingEvaluations = await unifiedLocalService.getAllUnifiedEvaluations();
      console.log(`📊 [UnifiedSystem] وُجد ${existingEvaluations.length} تقييم موحد`);
      
      // الحصول على الإحصائيات
      const stats = await unifiedLocalService.getStats();
      
      // دمج تلقائي إذا لزم الأمر
      let migrationResult: { success: boolean; migrated: number; errors: string[] } | null = null;
      let currentEvaluations = existingEvaluations;
      
      if (autoMigrate && existingEvaluations.length === 0) {
        console.log('🔄 [UnifiedSystem] بدء الدمج التلقائي...');
        setState(prev => ({ ...prev, isMigrating: true }));
        migrationResult = await unifiedLocalService.migrateFromLegacySystems();
        console.log('✅ [UnifiedSystem] اكتمال الدمج:', migrationResult);
        
        // تحديث التقييمات بعد الدمج
        currentEvaluations = await unifiedLocalService.getAllUnifiedEvaluations();
        setState(prev => ({
          ...prev,
          evaluations: currentEvaluations,
          stats: {
            ...prev.stats,
            totalEvaluations: currentEvaluations.length,
            migrationStatus: {
              completed: migrationResult?.success || false,
              migratedCount: migrationResult?.migrated || 0,
              errors: migrationResult?.errors || []
            }
          },
          isMigrating: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          evaluations: existingEvaluations,
          stats: {
            ...prev.stats,
            ...stats,
            totalEvaluations: existingEvaluations.length
          }
        }));
      }
      
      // فصل التقييمات حسب حالة المزامنة - استخدام البيانات الصحيحة
      const pending = currentEvaluations.filter((e: UnifiedLocalEvaluation) => e.syncStatus === 'pending');
      
      setState(prev => ({
        ...prev,
        pendingSync: pending,
        stats: {
          ...prev.stats,
          pendingSyncCount: pending.length,
          syncedCount: currentEvaluations.filter((e: UnifiedLocalEvaluation) => e.syncStatus === 'synced').length,
          errorCount: currentEvaluations.filter((e: UnifiedLocalEvaluation) => e.syncStatus === 'error').length
        },
        isInitialized: true,
        isLoading: false
      }));
      
      console.log('✅ [UnifiedSystem] تم تهيئة النظام بنجاح');
    } catch (error) {
      console.error('❌ [UnifiedSystem] خطأ في التهيئة:', error);
      setState(prev => ({
        ...prev,
        error: `فشل في تهيئة النظام: ${error}`,
        isLoading: false,
        isMigrating: false
      }));
    }
  }, [user, autoMigrate]);
  
  // 💾 حفظ تقييم جديد
  const saveEvaluation = useCallback(async (evaluationData: any) => {
    if (!user) {
      throw new Error('لا يوجد مستخدم مصادق');
    }
    
    console.log('💾 [UnifiedSystem] حفظ تقييم جديد...');
    
    try {
      // تحضير بيانات التقييم الموحد - مطابق master_evaluations
      const now = new Date();
      const evaluationDate = now.toISOString().split('T')[0];
      const evaluationTime = now.toLocaleTimeString('en-GB');
      const evaluationDateTime = now.toISOString();
      
      const unifiedEvaluation = {
        companyId: user.companyId || 0,
        locationId: evaluationData.locationId,
        evaluatorId: user.id,
        evaluationDate,
        evaluationTime,
        evaluationDateTime,
        evaluationTimestamp: Date.now(),
        evaluation: evaluationData,
        category: evaluationData.category || 'تقييم عام',
        templateName: evaluationData.templateName,
        syncStatus: 'pending' as const,
        syncAttempts: 0,
        systemUpdate: false
      };
      
      // حفظ في النظام الموحد
      const savedEvaluation = await unifiedLocalService.saveUnifiedEvaluation(unifiedEvaluation);
      
      // تحديث الحالة
      setState(prev => ({
        ...prev,
        evaluations: [...prev.evaluations, savedEvaluation],
        pendingSync: [...prev.pendingSync, savedEvaluation],
        stats: {
          ...prev.stats,
          totalEvaluations: prev.stats.totalEvaluations + 1,
          pendingSyncCount: prev.stats.pendingSyncCount + 1
        }
      }));
      
      console.log(`✅ [UnifiedSystem] تم حفظ التقييم: ${savedEvaluation.id}`);
      return savedEvaluation;
    } catch (error) {
      console.error('❌ [UnifiedSystem] خطأ في حفظ التقييم:', error);
      throw error;
    }
  }, [user]);
  
  // 🔄 مزامنة التقييمات مع الخادم
  const syncWithServer = useCallback(async () => {
    if (!user || !navigator.onLine) {
      console.log('📡 [UnifiedSystem] لا يمكن المزامنة - لا اتصال أو مستخدم');
      return;
    }
    
    setState(prev => ({ ...prev, isSyncing: true }));
    console.log('🔄 [UnifiedSystem] بدء مزامنة التقييمات...');
    
    try {
      // الحصول على بيانات طازجة من النظام المحلي
      const allEvaluations = await unifiedLocalService.getAllUnifiedEvaluations();
      const pendingEvaluations = allEvaluations.filter(e => e.syncStatus === 'pending');
      let syncedCount = 0;
      let errorCount = 0;
      
      // مزامنة كل تقييم معلق
      for (const evaluation of pendingEvaluations) {
        try {
          console.log(`📤 [UnifiedSystem] مزامنة التقييم: ${evaluation.id}`);
          
          // إرسال إلى الخادم - عقد مطابق master_evaluations
          const requestBody = {
            // بيانات التقييم الأساسية
            evaluation: evaluation.evaluation,
            locationId: evaluation.locationId,
            evaluatorId: evaluation.evaluatorId,
            companyId: evaluation.companyId,
            
            // بيانات التوقيت الموحدة
            evaluationDate: evaluation.evaluationDate,
            evaluationTime: evaluation.evaluationTime,
            evaluationDateTime: evaluation.evaluationDateTime,
            evaluationTimestamp: evaluation.evaluationTimestamp,
            
            // بيانات إضافية
            category: evaluation.category,
            templateName: evaluation.templateName,
            
            // معرف الأوفلاين للربط
            offlineId: evaluation.id
          };
          
          const response = await apiRequest('/api/unified-evaluations', 'POST', requestBody);
          
          if (response.success) {
            // تحديث حالة المزامنة
            await unifiedLocalService.updateUnifiedEvaluation(evaluation.id, {
              serverId: response.evaluation?.id,
              syncStatus: 'synced',
              lastSyncAttempt: Date.now()
            });
            syncedCount++;
            console.log(`✅ [UnifiedSystem] تم مزامنة التقييم: ${evaluation.id}`);
          } else {
            throw new Error(response.message || 'فشل في المزامنة');
          }
        } catch (error) {
          console.error(`❌ [UnifiedSystem] خطأ في مزامنة التقييم ${evaluation.id}:`, error);
          await unifiedLocalService.updateUnifiedEvaluation(evaluation.id, {
            syncStatus: 'error',
            syncError: String(error),
            syncAttempts: evaluation.syncAttempts + 1,
            lastSyncAttempt: Date.now()
          });
          errorCount++;
        }
      }
      
      // تحديث البيانات بعد المزامنة
      await refreshData();
      
      console.log(`✅ [UnifiedSystem] اكتمال المزامنة: ${syncedCount} نجح، ${errorCount} فشل`);
    } catch (error) {
      console.error('❌ [UnifiedSystem] خطأ عام في المزامنة:', error);
      setState(prev => ({ ...prev, error: `خطأ في المزامنة: ${error}` }));
    } finally {
      setState(prev => ({ 
        ...prev, 
        isSyncing: false,
        lastSync: Date.now()
      }));
    }
  }, [user, state.pendingSync]);
  
  // 🔄 تحديث البيانات
  const refreshData = useCallback(async () => {
    try {
      const evaluations = await unifiedLocalService.getAllUnifiedEvaluations();
      const pending = evaluations.filter(e => e.syncStatus === 'pending');
      const stats = await unifiedLocalService.getStats();
      
      setState(prev => ({
        ...prev,
        evaluations,
        pendingSync: pending,
        stats: {
          ...prev.stats,
          ...stats,
          totalEvaluations: evaluations.length,
          pendingSyncCount: pending.length,
          syncedCount: evaluations.filter(e => e.syncStatus === 'synced').length,
          errorCount: evaluations.filter(e => e.syncStatus === 'error').length
        }
      }));
    } catch (error) {
      console.error('❌ [UnifiedSystem] خطأ في تحديث البيانات:', error);
    }
  }, []);
  
  // 🔄 تهيئة النظام عند تحميل المكون
  useEffect(() => {
    if (user && !state.isInitialized) {
      initializeSystem();
    }
  }, [user, state.isInitialized, initializeSystem]);
  
  // 🔄 مزامنة دورية
  useEffect(() => {
    if (autoSync && state.isInitialized && state.pendingSync.length > 0 && navigator.onLine) {
      const interval = setInterval(() => {
        if (navigator.onLine && !state.isSyncing) {
          console.log('⏰ [UnifiedSystem] مزامنة دورية...');
          syncWithServer();
        }
      }, syncIntervalMs);
      
      return () => clearInterval(interval);
    }
  }, [autoSync, state.isInitialized, state.pendingSync.length, state.isSyncing, syncIntervalMs, syncWithServer]);
  
  // 📊 الحصول على التقييمات مع فلترة (دائماً async)
  const getEvaluations = useCallback(async (filters?: {
    locationId?: number;
    evaluatorId?: number;
    dateFrom?: string;
    dateTo?: string;
    syncStatus?: 'pending' | 'synced' | 'error';
  }): Promise<UnifiedLocalEvaluation[]> => {
    if (!filters) return state.evaluations;
    
    return await unifiedLocalService.searchEvaluations(filters);
  }, [state.evaluations]);
  
  // 🧹 تنظيف البيانات القديمة
  const cleanupLegacySystems = useCallback(async () => {
    console.log('🧹 [UnifiedSystem] تنظيف البيانات القديمة...');
    const result = await unifiedLocalService.cleanupLegacySystems();
    
    if (result) {
      console.log('✅ [UnifiedSystem] تم تنظيف البيانات القديمة');
    } else {
      console.warn('⚠️ [UnifiedSystem] فشل في تنظيف البيانات القديمة');
    }
    
    return result;
  }, []);
  
  return {
    // الحالة
    ...state,
    
    // الوظائف
    saveEvaluation,
    syncWithServer,
    refreshData,
    getEvaluations,
    cleanupLegacySystems,
    
    // إعادة التهيئة
    reinitialize: initializeSystem
  };
}