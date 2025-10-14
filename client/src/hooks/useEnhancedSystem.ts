/**
 * 🚀 Hook موحد للنظام المحسن
 * يجمع جميع التحسينات في مكان واحد لسهولة الاستخدام
 */

import { useState, useEffect, useCallback } from 'react';
import { enhancedIndexedDB } from '@/lib/enhancedIndexedDB';
import { LocalAnalytics } from '@/lib/localAnalytics';
import { PerformanceMonitor } from '@/lib/performanceMonitor';
import { DataCompression } from '@/lib/dataCompression';

interface EnhancedSystemState {
  isLoading: boolean;
  analytics: any;
  performance: any;
  compressionStats: {
    enabled: boolean;
    totalSaved: number;
    compressionRatio: number;
  };
  errors: string[];
}

export function useEnhancedSystem() {
  const [state, setState] = useState<EnhancedSystemState>({
    isLoading: true,
    analytics: null,
    performance: null,
    compressionStats: {
      enabled: true,
      totalSaved: 0,
      compressionRatio: 1
    },
    errors: []
  });

  /**
   * 📊 تحديث التحليلات المحلية
   */
  const refreshAnalytics = useCallback(async () => {
    try {
      console.log('📊 [EnhancedSystem] تحديث التحليلات...');
      
      const analytics = await PerformanceMonitor.measureResponseTime(
        () => LocalAnalytics.generateLocalAnalytics(),
        'Local Analytics Generation'
      );
      
      setState(prev => ({
        ...prev,
        analytics,
        errors: prev.errors.filter(e => !e.includes('Analytics'))
      }));
      
      console.log('✅ [EnhancedSystem] تم تحديث التحليلات بنجاح');
      
    } catch (error) {
      console.error('❌ [EnhancedSystem] فشل تحديث التحليلات:', error);
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, `فشل التحليلات: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`]
      }));
    }
  }, []);

  /**
   * 📈 تحديث مؤشرات الأداء
   */
  const refreshPerformance = useCallback(async () => {
    try {
      await Promise.all([
        PerformanceMonitor.checkMemoryUsage(),
        PerformanceMonitor.checkStorageUsage()
      ]);
      
      const performance = PerformanceMonitor.getPerformanceReport();
      
      setState(prev => ({
        ...prev,
        performance,
        errors: prev.errors.filter(e => !e.includes('Performance'))
      }));
      
    } catch (error) {
      console.error('❌ [EnhancedSystem] فشل تحديث الأداء:', error);
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, `فشل مراقبة الأداء: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`]
      }));
    }
  }, []);

  /**
   * 💾 حفظ محسن مع ضغط تلقائي
   */
  const saveDataOptimized = useCallback(async (key: string, data: any) => {
    try {
      const result = await PerformanceMonitor.measureResponseTime(async () => {
        // تطبيق الضغط إذا لزم الأمر
        const compressionResult = await DataCompression.compressData(data);
        
        // حفظ البيانات
        await enhancedIndexedDB.saveData(key, compressionResult.data);
        
        return compressionResult;
      }, `Save Data: ${key}`);
      
      // تحديث إحصائيات الضغط
      if (result.compressed) {
        const savedBytes = result.originalSize - result.compressedSize;
        setState(prev => ({
          ...prev,
          compressionStats: {
            ...prev.compressionStats,
            totalSaved: prev.compressionStats.totalSaved + savedBytes,
            compressionRatio: (prev.compressionStats.compressionRatio + result.compressionRatio) / 2
          }
        }));
      }
      
      console.log(`✅ [EnhancedSystem] تم حفظ ${key} بنجاح`);
      return result;
      
    } catch (error) {
      console.error(`❌ [EnhancedSystem] فشل حفظ ${key}:`, error);
      throw error;
    }
  }, []);

  /**
   * 📂 جلب محسن مع إلغاء ضغط تلقائي
   */
  const getDataOptimized = useCallback(async (key: string) => {
    try {
      const result = await PerformanceMonitor.measureResponseTime(async () => {
        // جلب البيانات
        const rawData = await enhancedIndexedDB.getData(key);
        
        if (!rawData) return null;
        
        // إلغاء الضغط إذا لزم الأمر
        return await DataCompression.decompressData(rawData);
      }, `Get Data: ${key}`);
      
      return result;
      
    } catch (error) {
      console.error(`❌ [EnhancedSystem] فشل جلب ${key}:`, error);
      throw error;
    }
  }, []);

  /**
   * 🧹 تنظيف النظام
   */
  const cleanupSystem = useCallback(async () => {
    try {
      console.log('🧹 [EnhancedSystem] بدء تنظيف النظام...');
      
      const cleanedCount = await DataCompression.cleanupOldData(enhancedIndexedDB);
      
      console.log(`✅ [EnhancedSystem] تم تنظيف ${cleanedCount} عنصر`);
      
      // تحديث التحليلات والأداء بعد التنظيف
      await Promise.all([refreshAnalytics(), refreshPerformance()]);
      
    } catch (error) {
      console.error('❌ [EnhancedSystem] فشل تنظيف النظام:', error);
    }
  }, [refreshAnalytics, refreshPerformance]);

  /**
   * 🎯 تحديث شامل للنظام
   */
  const refreshAll = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      await Promise.all([
        refreshAnalytics(),
        refreshPerformance()
      ]);
    } catch (error) {
      console.error('❌ [EnhancedSystem] فشل التحديث الشامل:', error);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [refreshAnalytics, refreshPerformance]);

  /**
   * 🔄 تحديث دوري
   */
  useEffect(() => {
    // تحديث أولي
    refreshAll();
    
    // بدء المراقبة الدورية
    PerformanceMonitor.startPeriodicMonitoring(30000); // كل 30 ثانية
    
    // تحديث دوري للتحليلات (كل 5 دقائق)
    const analyticsInterval = setInterval(refreshAnalytics, 5 * 60 * 1000);
    
    // تنظيف دوري (كل ساعة)
    const cleanupInterval = setInterval(cleanupSystem, 60 * 60 * 1000);
    
    return () => {
      clearInterval(analyticsInterval);
      clearInterval(cleanupInterval);
    };
  }, [refreshAll, refreshAnalytics, cleanupSystem]);

  return {
    ...state,
    
    // Methods
    refreshAnalytics,
    refreshPerformance,
    saveDataOptimized,
    getDataOptimized,
    cleanupSystem,
    refreshAll,
    
    // Computed values
    hasErrors: state.errors.length > 0,
    systemHealth: state.performance ? 
      (state.performance.metrics.successRate > 95 ? 'excellent' : 
       state.performance.metrics.successRate > 80 ? 'good' : 'poor') : 'unknown',
    
    compressionSavings: state.compressionStats.totalSaved > 0 ? 
      `${(state.compressionStats.totalSaved / 1024).toFixed(1)} KB` : '0 KB'
  };
}