/**
 * 🎯 Schema موحد للنظام المحلي في IndexedDB
 * يطابق master_evaluations في الخادم لضمان التوافق التام
 */

export interface UnifiedLocalEvaluation {
  // 🏷️ معرفات أساسية
  id: string;                    // معرف فريد محلي (uuid)
  serverId?: number;            // معرف الخادم بعد المزامنة
  
  // 🏢 بيانات الشركة والموقع
  companyId: number;
  locationId: number;
  evaluatorId: number;          // المستخدم الذي أجرى التقييم
  
  // 📅 بيانات التوقيت
  evaluationDate: string;       // تاريخ التقييم (YYYY-MM-DD)
  evaluationTime: string;       // وقت التقييم (HH:MM:SS)
  evaluationDateTime: string;   // التاريخ والوقت مجتمعان (ISO string)
  evaluationTimestamp: number;  // Unix timestamp
  
  // 📋 بيانات التقييم
  evaluation: {
    // 📊 معلومات أساسية
    checklist_date: string;
    checklist_time: string;
    location_id: number;
    user_id: number;
    template_id?: number;
    
    // ✅ المهام والنتائج
    tasks: Array<{
      id: string;
      nameAr: string;
      nameEn: string;
      categoryAr?: string;
      categoryEn?: string;
      result: 'excellent' | 'good' | 'needs_improvement';
      subTasks?: Array<{
        id: string;
        nameAr: string;
        nameEn: string;
        result: 'excellent' | 'good' | 'needs_improvement';
      }>;
      notes?: string;
    }>;
    
    // 📝 ملاحظات إضافية
    additional_notes?: string;
    overall_rating?: number;
    
    // 🔗 روابط إضافية
    related_checklist_id?: string;
    template_name?: string;
  };
  
  // 🗂️ بيانات التصنيف  
  category: string;             // نوع التقييم
  templateName?: string;        // اسم القالب
  
  // 🔄 بيانات المزامنة
  syncStatus: 'pending' | 'synced' | 'error';
  syncAttempts: number;
  lastSyncAttempt?: number;
  syncError?: string;
  
  // 🕐 بيانات التتبع
  createdAt: number;           // Unix timestamp للإنشاء المحلي
  updatedAt: number;           // Unix timestamp للتحديث الأخير
  systemUpdate: boolean;        // هل هو تحديث نظام؟
}

/**
 * 📦 نوع البيانات المحفوظة في IndexedDB
 */
export interface UnifiedLocalStorage {
  // 📋 التقييمات الموحدة
  evaluations: UnifiedLocalEvaluation[];
  
  // 🔄 إحصائيات المزامنة
  syncStats: {
    totalEvaluations: number;
    pendingSync: number;
    syncedCount: number;
    errorCount: number;
    lastSyncTime: number | null;
    lastFullSync: number | null;
  };
  
  // 📊 فهرس للبحث السريع
  index: {
    byDate: Record<string, string[]>;        // تاريخ -> IDs
    byLocation: Record<number, string[]>;    // موقع -> IDs  
    byEvaluator: Record<number, string[]>;   // مُقيِّم -> IDs
    byStatus: Record<string, string[]>;     // حالة المزامنة -> IDs
  };
  
  // ⚙️ إعدادات النظام الموحد
  settings: {
    version: string;
    lastMigration: number;
    migrationSource: string[];  // الأنظمة التي تم دمجها
  };
}

/**
 * 🔑 مفاتيح IndexedDB المنظمة والواضحة للنظام الموحد
 */
export const UNIFIED_LOCAL_KEYS = {
  // 🏠 المفتاح الرئيسي - جميع التقييمات في مكان واحد
  UNIFIED_EVALUATIONS: 'hsa_unified_evaluations_v2',
  
  // 🔄 مفاتيح المزامنة والتتبع
  SYNC_STATUS: 'hsa_sync_status_v2',
  SEARCH_INDEX: 'hsa_search_index_v2',
  MIGRATION_LOG: 'hsa_migration_log_v2',
  
  // ⚙️ إعدادات ونسخة النظام
  SYSTEM_SETTINGS: 'hsa_system_settings_v2',
  
  // 🧹 مفاتيح التنظيف والأرشفة
  LEGACY_PATTERNS: {
    LOCATIONS: 'location_',        // location_*
    OFFLINE_CHECKLISTS: 'offline_checklist_',  // offline_checklist_*
    DAILY_CHECKLISTS: ['daily_checklists_', 'checklist_'],  // daily_checklists_*, checklist_*
    OLD_UNIFIED: 'unified_evaluations',  // التقييمات الموحدة القديمة
  }
} as const;

/**
 * 🛠️ مساعد للتحويل من التقييم القديم إلى الجديد
 */
export function convertLegacyToUnified(
  legacyEvaluation: any,
  source: 'location' | 'daily_checklist' | 'unified_evaluation' | 'offline_checklist'
): UnifiedLocalEvaluation {
  const now = Date.now();
  const evaluationDate = legacyEvaluation.checklist_date || 
                        legacyEvaluation.evaluation_date ||
                        new Date().toISOString().split('T')[0];
  
  const evaluationTime = legacyEvaluation.checklist_time ||
                        legacyEvaluation.evaluation_time ||
                        new Date().toLocaleTimeString('en-GB');
                        
  return {
    // معرفات
    id: `local_${now}_${Math.random().toString(36).substr(2, 9)}`,
    serverId: legacyEvaluation.id,
    
    // بيانات الشركة والموقع  
    companyId: legacyEvaluation.companyId || 0,
    locationId: legacyEvaluation.location_id || legacyEvaluation.locationId || 0,
    evaluatorId: legacyEvaluation.user_id || legacyEvaluation.userId || legacyEvaluation.evaluatorId || 0,
    
    // بيانات التوقيت - موحد ISO بشكل ثابت
    evaluationDate,
    evaluationTime,
    evaluationDateTime: new Date(`${evaluationDate}T${evaluationTime}`).toISOString(),
    evaluationTimestamp: now,
    
    // بيانات التقييم
    evaluation: legacyEvaluation.evaluation || legacyEvaluation,
    
    // تصنيف وقالب
    category: legacyEvaluation.category || 'تقييم عام',
    templateName: legacyEvaluation.templateName || legacyEvaluation.template_name,
    
    // بيانات المزامنة
    syncStatus: legacyEvaluation.serverId ? 'synced' : 'pending',
    syncAttempts: 0,
    
    // تتبع
    createdAt: now,
    updatedAt: now,
    systemUpdate: false
  };
}

/**
 * 🧮 مساعد لحساب إحصائيات المزامنة
 */
export function calculateSyncStats(evaluations: UnifiedLocalEvaluation[]) {
  const stats = {
    totalEvaluations: evaluations.length,
    pendingSync: 0,
    syncedCount: 0,
    errorCount: 0,
    lastSyncTime: null as number | null,
    lastFullSync: null as number | null
  };
  
  evaluations.forEach(evaluation => {
    switch (evaluation.syncStatus) {
      case 'pending':
        stats.pendingSync++;
        break;
      case 'synced':
        stats.syncedCount++;
        break;
      case 'error':
        stats.errorCount++;
        break;
    }
    
    if (evaluation.lastSyncAttempt && 
        (!stats.lastSyncTime || evaluation.lastSyncAttempt > stats.lastSyncTime)) {
      stats.lastSyncTime = evaluation.lastSyncAttempt;
    }
  });
  
  return stats;
}