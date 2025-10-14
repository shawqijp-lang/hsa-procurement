/**
 * 🔄 Hook مزامنة موحد - بديل مبسط ل UltimateSyncSystem
 */
import { useState, useCallback, useEffect } from 'react';
import { enhancedIndexedDB } from '@/lib/enhancedIndexedDB';

interface SyncStats {
  totalItems: number;
  pendingItems: number;
  successfulSyncs: number;
  failedSyncs: number;
  lastSyncTime: number | null;
  connectionQuality: string;
}

interface UnifiedSyncState {
  isInitialized: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  syncStats: SyncStats;
  connectionQuality: string;
}

export function useUnifiedSync() {
  const [state, setState] = useState<UnifiedSyncState>({
    isInitialized: false,
    isOnline: navigator.onLine,
    isSyncing: false,
    syncStats: {
      totalItems: 0,
      pendingItems: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      lastSyncTime: null,
      connectionQuality: 'good'
    },
    connectionQuality: 'good'
  });

  /**
   * تهيئة النظام
   */
  const initialize = useCallback(async () => {
    if (state.isInitialized) return;
    
    console.log('🚀 تهيئة نظام المزامنة الموحد...');
    
    try {
      // تحديث الإحصائيات
      const stats = await enhancedIndexedDB.getSyncStats();
      setState(prev => ({
        ...prev,
        isInitialized: true,
        syncStats: stats
      }));
      
      console.log('✅ تم تهيئة نظام المزامنة الموحد');
    } catch (error) {
      console.error('❌ فشل تهيئة نظام المزامنة:', error);
    }
  }, [state.isInitialized]);

  /**
   * إضافة عنصر للمزامنة
   */
  const addToSyncQueue = useCallback(async (item: {
    type: string;
    data: any;
    priority?: 'high' | 'medium' | 'low';
  }): Promise<string> => {
    console.log(`📥 إضافة للمزامنة الموحدة: ${item.type}`);
    
    const id = await enhancedIndexedDB.addToSmartSyncQueue({
      type: item.type as any,
      action: 'create',
      data: item.data,
      priority: item.priority || 'medium'
    });
    
    // تحديث الإحصائيات
    await updateSyncStats();
    
    return id;
  }, []);

  /**
   * مزامنة إجبارية
   */
  const forceSync = useCallback(async (): Promise<{ success: number; failed: number; total: number }> => {
    if (state.isSyncing) {
      console.log('⚠️ المزامنة قيد التشغيل بالفعل');
      return { success: 0, failed: 0, total: 0 };
    }

    setState(prev => ({ ...prev, isSyncing: true }));
    
    try {
      console.log('🚀 بدء المزامنة الإجبارية...');
      const result = await enhancedIndexedDB.forceSync();
      
      await updateSyncStats();
      
      console.log(`✅ انتهت المزامنة: ${result.success} نجح، ${result.failed} فشل`);
      return result;
      
    } catch (error) {
      console.error('❌ فشل المزامنة الإجبارية:', error);
      return { success: 0, failed: 1, total: 1 };
    } finally {
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [state.isSyncing]);

  /**
   * تحديث إحصائيات المزامنة
   */
  const updateSyncStats = useCallback(async () => {
    try {
      const stats = await enhancedIndexedDB.getSyncStats();
      setState(prev => ({
        ...prev,
        syncStats: stats
      }));
    } catch (error) {
      console.error('❌ فشل تحديث إحصائيات المزامنة:', error);
    }
  }, []);

  /**
   * تنظيف العناصر القديمة
   */
  const cleanupOldItems = useCallback(async (olderThanDays: number = 7): Promise<number> => {
    console.log(`🧹 تنظيف العناصر الأقدم من ${olderThanDays} أيام...`);
    
    const cleaned = await enhancedIndexedDB.cleanupOldSyncItems(olderThanDays);
    
    if (cleaned > 0) {
      await updateSyncStats();
      console.log(`✅ تم تنظيف ${cleaned} عنصر قديم`);
    }
    
    return cleaned;
  }, [updateSyncStats]);

  /**
   * إحصائيات المزامنة
   */
  const getSyncStats = useCallback(async (): Promise<SyncStats> => {
    const stats = await enhancedIndexedDB.getSyncStats();
    setState(prev => ({ ...prev, syncStats: stats }));
    return stats;
  }, []);

  // مراقبة الاتصال
  useEffect(() => {
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // تحديث دوري للإحصائيات
  useEffect(() => {
    const interval = setInterval(updateSyncStats, 30000); // كل 30 ثانية
    return () => clearInterval(interval);
  }, [updateSyncStats]);

  // تهيئة تلقائية
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    // الحالة
    ...state,
    
    // الوظائف
    initialize,
    addToSyncQueue,
    forceSync,
    getSyncStats,
    cleanupOldItems,
    updateSyncStats,
    
    // للتوافق مع النظام القديم
    addItem: addToSyncQueue,
    getQueueItems: async (type: string) => {
      const queue = await enhancedIndexedDB.getSyncQueue();
      return queue.filter((item: any) => item.type === type);
    }
  };
}

export default useUnifiedSync;