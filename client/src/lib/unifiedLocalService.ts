/**
 * 🎯 خدمة النظام الموحد المحلي
 * إدارة شاملة للتقييمات في IndexedDB مع الدمج والمزامنة
 */

import { enhancedIndexedDB } from './enhancedIndexedDB';
import { 
  UnifiedLocalEvaluation, 
  UnifiedLocalStorage, 
  UNIFIED_LOCAL_KEYS,
  convertLegacyToUnified,
  calculateSyncStats 
} from './unifiedLocalSchema';

export class UnifiedLocalService {
  
  /**
   * 📥 تحميل جميع التقييمات الموحدة
   */
  async getAllUnifiedEvaluations(): Promise<UnifiedLocalEvaluation[]> {
    console.log('📥 [UnifiedLocal] تحميل التقييمات الموحدة...');
    
    try {
      const storage = await enhancedIndexedDB.getItem(UNIFIED_LOCAL_KEYS.UNIFIED_EVALUATIONS) as UnifiedLocalStorage;
      
      if (!storage || !storage.evaluations) {
        console.log('📋 [UnifiedLocal] لا توجد تقييمات موحدة، إرجاع قائمة فارغة');
        return [];
      }
      
      console.log(`📊 [UnifiedLocal] تم تحميل ${storage.evaluations.length} تقييم موحد`);
      return storage.evaluations;
    } catch (error) {
      console.error('❌ [UnifiedLocal] خطأ في تحميل التقييمات الموحدة:', error);
      return [];
    }
  }
  
  /**
   * 💾 حفظ تقييم جديد في النظام الموحد
   */
  async saveUnifiedEvaluation(evaluation: Omit<UnifiedLocalEvaluation, 'id' | 'createdAt' | 'updatedAt'>): Promise<UnifiedLocalEvaluation> {
    console.log('💾 [UnifiedLocal] حفظ تقييم جديد...');
    
    const now = Date.now();
    const newEvaluation: UnifiedLocalEvaluation = {
      ...evaluation,
      id: `local_${now}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now
    };
    
    try {
      // تحميل البيانات الحالية
      const currentStorage = await this.getStorage();
      
      // إضافة التقييم الجديد
      currentStorage.evaluations.push(newEvaluation);
      
      // تحديث الإحصائيات والفهارس
      this.updateIndexAndStats(currentStorage);
      
      // حفظ البيانات المحدثة
      await enhancedIndexedDB.setItem(UNIFIED_LOCAL_KEYS.UNIFIED_EVALUATIONS, currentStorage, 'data');
      
      console.log(`✅ [UnifiedLocal] تم حفظ التقييم بنجاح: ${newEvaluation.id}`);
      return newEvaluation;
    } catch (error) {
      console.error('❌ [UnifiedLocal] خطأ في حفظ التقييم:', error);
      throw error;
    }
  }
  
  /**
   * 🔄 تحديث تقييم موجود
   */
  async updateUnifiedEvaluation(id: string, updates: Partial<UnifiedLocalEvaluation>): Promise<boolean> {
    console.log(`🔄 [UnifiedLocal] تحديث التقييم: ${id}`);
    
    try {
      const storage = await this.getStorage();
      const evaluationIndex = storage.evaluations.findIndex(evaluation => evaluation.id === id);
      
      if (evaluationIndex === -1) {
        console.warn(`⚠️ [UnifiedLocal] لم يتم العثور على التقييم: ${id}`);
        return false;
      }
      
      // تحديث التقييم
      storage.evaluations[evaluationIndex] = {
        ...storage.evaluations[evaluationIndex],
        ...updates,
        updatedAt: Date.now()
      };
      
      // تحديث الإحصائيات والفهارس
      this.updateIndexAndStats(storage);
      
      // حفظ البيانات المحدثة
      await enhancedIndexedDB.setItem(UNIFIED_LOCAL_KEYS.UNIFIED_EVALUATIONS, storage, 'data');
      
      console.log(`✅ [UnifiedLocal] تم تحديث التقييم: ${id}`);
      return true;
    } catch (error) {
      console.error(`❌ [UnifiedLocal] خطأ في تحديث التقييم ${id}:`, error);
      return false;
    }
  }
  
  /**
   * 🗑️ حذف تقييم
   */
  async deleteUnifiedEvaluation(id: string): Promise<boolean> {
    console.log(`🗑️ [UnifiedLocal] حذف التقييم: ${id}`);
    
    try {
      const storage = await this.getStorage();
      const initialCount = storage.evaluations.length;
      
      storage.evaluations = storage.evaluations.filter(evaluation => evaluation.id !== id);
      
      if (storage.evaluations.length === initialCount) {
        console.warn(`⚠️ [UnifiedLocal] لم يتم العثور على التقييم للحذف: ${id}`);
        return false;
      }
      
      // تحديث الإحصائيات والفهارس
      this.updateIndexAndStats(storage);
      
      // حفظ البيانات المحدثة
      await enhancedIndexedDB.setItem(UNIFIED_LOCAL_KEYS.UNIFIED_EVALUATIONS, storage, 'data');
      
      console.log(`✅ [UnifiedLocal] تم حذف التقييم: ${id}`);
      return true;
    } catch (error) {
      console.error(`❌ [UnifiedLocal] خطأ في حذف التقييم ${id}:`, error);
      return false;
    }
  }
  
  /**
   * 🔍 البحث في التقييمات
   */
  async searchEvaluations(filters: {
    locationId?: number;
    evaluatorId?: number;
    dateFrom?: string;
    dateTo?: string;
    syncStatus?: 'pending' | 'synced' | 'error';
  }): Promise<UnifiedLocalEvaluation[]> {
    console.log('🔍 [UnifiedLocal] البحث في التقييمات:', filters);
    
    try {
      const storage = await this.getStorage();
      let results = [...storage.evaluations];
      
      // تطبيق المرشحات
      if (filters.locationId) {
        results = results.filter(evaluation => evaluation.locationId === filters.locationId);
      }
      
      if (filters.evaluatorId) {
        results = results.filter(evaluation => evaluation.evaluatorId === filters.evaluatorId);
      }
      
      if (filters.dateFrom) {
        results = results.filter(evaluation => evaluation.evaluationDate >= filters.dateFrom!);
      }
      
      if (filters.dateTo) {
        results = results.filter(evaluation => evaluation.evaluationDate <= filters.dateTo!);
      }
      
      if (filters.syncStatus) {
        results = results.filter(evaluation => evaluation.syncStatus === filters.syncStatus);
      }
      
      console.log(`📊 [UnifiedLocal] النتائج: ${results.length} من أصل ${storage.evaluations.length}`);
      return results;
    } catch (error) {
      console.error('❌ [UnifiedLocal] خطأ في البحث:', error);
      return [];
    }
  }
  
  /**
   * 🔄 دمج البيانات من النظم القديمة
   */
  async migrateFromLegacySystems(): Promise<{
    success: boolean;
    migrated: number;
    errors: string[];
  }> {
    console.log('🔄 [UnifiedLocal] بدء دمج البيانات من النظم القديمة...');
    
    const result = {
      success: true,
      migrated: 0,
      errors: [] as string[]
    };
    
    try {
      // البحث عن جميع مفاتيح IndexedDB
      const allKeys = await enhancedIndexedDB.getAllKeys();
      console.log(`🔍 [UnifiedLocal] فحص ${allKeys.length} مفتاح في IndexedDB...`);
      
      // البحث عن تقييمات المواقع (location_*)
      const locationKeys = allKeys.filter(key => key.startsWith('location_'));
      console.log(`📍 [UnifiedLocal] وُجد ${locationKeys.length} مفتاح موقع`);
      
      // دمج تقييمات المواقع
      for (const locationKey of locationKeys) {
        try {
          const locationData = await enhancedIndexedDB.getItem(locationKey);
          if (locationData && locationData.checklists) {
            for (const checklist of locationData.checklists) {
              const unifiedEvaluation = convertLegacyToUnified(checklist, 'location');
              await this.saveUnifiedEvaluation(unifiedEvaluation);
              result.migrated++;
            }
          }
        } catch (error) {
          const errorMsg = `خطأ في دمج ${locationKey}: ${error}`;
          console.error(`❌ [UnifiedLocal] ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }
      
      // البحث عن التقييمات المحفوظة محلياً (offline_checklist_*)
      const offlineKeys = allKeys.filter(key => key.startsWith('offline_checklist_'));
      console.log(`📱 [UnifiedLocal] وُجد ${offlineKeys.length} تقييم محفوظ محلياً`);
      
      // دمج التقييمات المحفوظة محلياً
      for (const offlineKey of offlineKeys) {
        try {
          const offlineData = await enhancedIndexedDB.getItem(offlineKey);
          if (offlineData) {
            const unifiedEvaluation = convertLegacyToUnified(offlineData, 'offline_checklist');
            await this.saveUnifiedEvaluation(unifiedEvaluation);
            result.migrated++;
          }
        } catch (error) {
          const errorMsg = `خطأ في دمج ${offlineKey}: ${error}`;
          console.error(`❌ [UnifiedLocal] ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }
      
      // البحث عن التقييمات اليومية المحلية (daily_checklists_*)
      const dailyKeys = allKeys.filter(key => key.startsWith('daily_checklists_') || key.startsWith('checklist_'));
      console.log(`📋 [UnifiedLocal] وُجد ${dailyKeys.length} تقييم يومي محلي`);
      
      // دمج التقييمات اليومية المحلية
      for (const dailyKey of dailyKeys) {
        try {
          const dailyData = await enhancedIndexedDB.getItem(dailyKey);
          if (dailyData) {
            const unifiedEvaluation = convertLegacyToUnified(dailyData, 'daily_checklist');
            await this.saveUnifiedEvaluation(unifiedEvaluation);
            result.migrated++;
          }
        } catch (error) {
          const errorMsg = `خطأ في دمج ${dailyKey}: ${error}`;
          console.error(`❌ [UnifiedLocal] ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }
      
      // البحث عن التقييمات الموحدة القديمة (unified_evaluations)
      const oldUnifiedEvaluations = await enhancedIndexedDB.getItem('unified_evaluations');
      if (oldUnifiedEvaluations && Array.isArray(oldUnifiedEvaluations)) {
        console.log(`🗄️ [UnifiedLocal] وُجد ${oldUnifiedEvaluations.length} تقييم موحد قديم`);
        
        for (const evaluation of oldUnifiedEvaluations) {
          try {
            const unifiedEvaluation = convertLegacyToUnified(evaluation, 'unified_evaluation');
            await this.saveUnifiedEvaluation(unifiedEvaluation);
            result.migrated++;
          } catch (error) {
            const errorMsg = `خطأ في دمج التقييم الموحد: ${error}`;
            console.error(`❌ [UnifiedLocal] ${errorMsg}`);
            result.errors.push(errorMsg);
          }
        }
      }
      
      // حفظ سجل الهجرة
      await this.saveMigrationLog({
        migrationDate: Date.now(),
        sourceSystems: ['location_keys', 'unified_evaluations', 'offline_checklists', 'daily_checklists'],
        migratedCount: result.migrated,
        errors: result.errors
      });
      
      console.log(`✅ [UnifiedLocal] اكتمال الدمج: ${result.migrated} تقييم`);
      
      if (result.errors.length > 0) {
        result.success = false;
        console.warn(`⚠️ [UnifiedLocal] الدمج مع أخطاء: ${result.errors.length} خطأ`);
      }
      
      return result;
    } catch (error) {
      console.error('❌ [UnifiedLocal] خطأ عام في الدمج:', error);
      result.success = false;
      result.errors.push(`خطأ عام: ${error}`);
      return result;
    }
  }
  
  /**
   * 📊 الحصول على إحصائيات النظام الموحد
   */
  async getStats() {
    try {
      const storage = await this.getStorage();
      return {
        ...storage.syncStats,
        systemInfo: {
          version: storage.settings.version,
          lastMigration: storage.settings.lastMigration,
          migrationSource: storage.settings.migrationSource
        }
      };
    } catch (error) {
      console.error('❌ [UnifiedLocal] خطأ في الحصول على الإحصائيات:', error);
      return null;
    }
  }
  
  /**
   * 🧹 تنظيف البيانات القديمة
   */
  async cleanupLegacySystems(): Promise<boolean> {
    console.log('🧹 [UnifiedLocal] تنظيف البيانات القديمة...');
    
    try {
      const allKeys = await enhancedIndexedDB.getAllKeys();
      
      // حذف مفاتيح المواقع القديمة
      const locationKeys = allKeys.filter(key => key.startsWith('location_'));
      for (const key of locationKeys) {
        await enhancedIndexedDB.removeItem(key);
        console.log(`🗑️ [UnifiedLocal] تم حذف: ${key}`);
      }
      
      // حذف التقييمات الموحدة القديمة
      if (allKeys.includes('unified_evaluations')) {
        await enhancedIndexedDB.removeItem('unified_evaluations');
        console.log('🗑️ [UnifiedLocal] تم حذف: unified_evaluations');
      }
      
      // حذف التقييمات المحفوظة محلياً
      const offlineKeys = allKeys.filter(key => key.startsWith('offline_checklist_'));
      for (const key of offlineKeys) {
        await enhancedIndexedDB.removeItem(key);
        console.log(`🗑️ [UnifiedLocal] تم حذف: ${key}`);
      }
      
      // حذف التقييمات اليومية القديمة
      const dailyKeys = allKeys.filter(key => key.startsWith('daily_checklists_') || key.startsWith('checklist_'));
      for (const key of dailyKeys) {
        await enhancedIndexedDB.removeItem(key);
        console.log(`🗑️ [UnifiedLocal] تم حذف: ${key}`);
      }
      
      console.log('✅ [UnifiedLocal] اكتمل تنظيف البيانات القديمة');
      return true;
    } catch (error) {
      console.error('❌ [UnifiedLocal] خطأ في التنظيف:', error);
      return false;
    }
  }
  
  // ================================
  // 🛠️ الدوال المساعدة الخاصة
  // ================================
  
  private async getStorage(): Promise<UnifiedLocalStorage> {
    const storage = await enhancedIndexedDB.getItem(UNIFIED_LOCAL_KEYS.UNIFIED_EVALUATIONS) as UnifiedLocalStorage;
    
    if (!storage) {
      // إنشاء هيكل فارغ عند عدم الوجود
      return this.createEmptyStorage();
    }
    
    return storage;
  }
  
  private createEmptyStorage(): UnifiedLocalStorage {
    return {
      evaluations: [],
      syncStats: {
        totalEvaluations: 0,
        pendingSync: 0,
        syncedCount: 0,
        errorCount: 0,
        lastSyncTime: null,
        lastFullSync: null
      },
      index: {
        byDate: {},
        byLocation: {},
        byEvaluator: {},
        byStatus: {}
      },
      settings: {
        version: '1.0.0',
        lastMigration: Date.now(),
        migrationSource: []
      }
    };
  }
  
  private updateIndexAndStats(storage: UnifiedLocalStorage): void {
    // إعادة بناء الفهارس
    storage.index = {
      byDate: {},
      byLocation: {},
      byEvaluator: {},
      byStatus: {}
    };
    
    storage.evaluations.forEach(evaluation => {
      // فهرس التاريخ
      if (!storage.index.byDate[evaluation.evaluationDate]) {
        storage.index.byDate[evaluation.evaluationDate] = [];
      }
      storage.index.byDate[evaluation.evaluationDate].push(evaluation.id);
      
      // فهرس الموقع
      if (!storage.index.byLocation[evaluation.locationId]) {
        storage.index.byLocation[evaluation.locationId] = [];
      }
      storage.index.byLocation[evaluation.locationId].push(evaluation.id);
      
      // فهرس المُقيِّم
      if (!storage.index.byEvaluator[evaluation.evaluatorId]) {
        storage.index.byEvaluator[evaluation.evaluatorId] = [];
      }
      storage.index.byEvaluator[evaluation.evaluatorId].push(evaluation.id);
      
      // فهرس حالة المزامنة
      if (!storage.index.byStatus[evaluation.syncStatus]) {
        storage.index.byStatus[evaluation.syncStatus] = [];
      }
      storage.index.byStatus[evaluation.syncStatus].push(evaluation.id);
    });
    
    // تحديث الإحصائيات
    storage.syncStats = calculateSyncStats(storage.evaluations);
  }
  
  private async saveMigrationLog(log: any): Promise<void> {
    await enhancedIndexedDB.setItem(UNIFIED_LOCAL_KEYS.MIGRATION_LOG, log, 'data');
  }
}

// 🎯 تصدير النسخة الوحيدة من الخدمة
export const unifiedLocalService = new UnifiedLocalService();