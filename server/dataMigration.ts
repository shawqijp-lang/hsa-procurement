/**
 * 🔄 نقل البيانات إلى النظام الواحد في الخادم
 * يدمج جميع البيانات من daily_checklists و unified_evaluations
 */

import { db } from "./db";
import { 
  dailyChecklists, 
  unifiedEvaluations, 
  masterEvaluations,
  locations, 
  users, 
  companies 
} from "../shared/schema";
import { 
  convertDailyChecklistToMaster, 
  convertUnifiedToMaster,
  generateMasterEvaluationId,
  InsertMasterEvaluation
} from "../shared/masterEvaluationSchema";
import { eq } from "drizzle-orm";

interface MigrationStats {
  dailyChecklistsProcessed: number;
  unifiedEvaluationsProcessed: number;
  totalMigrated: number;
  duplicatesSkipped: number;
  errors: string[];
}

/**
 * 📊 دالة نقل البيانات الرئيسية
 */
export async function migrateMasterEvaluations(): Promise<MigrationStats> {
  console.log("🔄 [Migration] بدء نقل البيانات إلى النظام الواحد...");
  
  const stats: MigrationStats = {
    dailyChecklistsProcessed: 0,
    unifiedEvaluationsProcessed: 0,
    totalMigrated: 0,
    duplicatesSkipped: 0,
    errors: []
  };

  try {
    // 1️⃣ جلب جميع البيانات المساعدة
    console.log("📋 [Migration] جلب البيانات المساعدة...");
    const allLocations = await db.select().from(locations);
    const allUsers = await db.select().from(users);
    const allCompanies = await db.select().from(companies);
    
    // إنشاء خرائط للبحث السريع
    const locationMap = new Map(allLocations.map((loc: any) => [loc.id, loc]));
    const userMap = new Map(allUsers.map((user: any) => [user.id, user]));
    const companyMap = new Map(allCompanies.map((comp: any) => [comp.id, comp]));
    
    console.log(`📊 [Migration] البيانات المساعدة: ${allLocations.length} موقع، ${allUsers.length} مستخدم، ${allCompanies.length} شركة`);

    // 2️⃣ التحقق من البيانات الموجودة في النظام الواحد
    const existingEvaluations = await db.select({
      evaluationId: masterEvaluations.evaluationId,
      legacyId: masterEvaluations.legacyId
    }).from(masterEvaluations);
    
    const existingEvaluationIds = new Set(existingEvaluations.map((e: any) => e.evaluationId));
    const existingLegacyIds = new Set(existingEvaluations.map((e: any) => e.legacyId).filter((id: any) => id !== null));
    
    console.log(`🔍 [Migration] موجود بالفعل: ${existingEvaluations.length} تقييم`);

    // 3️⃣ نقل البيانات من daily_checklists
    console.log("📋 [Migration] نقل البيانات من daily_checklists...");
    const dailyChecklistsData = await db.select().from(dailyChecklists);
    
    for (const checklist of dailyChecklistsData) {
      try {
        // تخطي المكررات
        if (existingLegacyIds.has(checklist.id)) {
          stats.duplicatesSkipped++;
          continue;
        }
        
        const location: any = locationMap.get(checklist.locationId);
        const user: any = userMap.get(checklist.userId);
        const company: any = companyMap.get(checklist.companyId);
        
        if (!location || !user || !company) {
          stats.errors.push(`نقص في البيانات المساعدة للتقييم ${checklist.id}`);
          continue;
        }
        
        const masterData = convertDailyChecklistToMaster(
          checklist,
          { nameAr: location.nameAr, nameEn: location.nameEn, icon: location.icon },
          { name: user.fullName, role: user.role },
          { nameAr: company.nameAr, nameEn: company.nameEn }
        );
        
        // التأكد من عدم وجود نفس المعرف
        if (existingEvaluationIds.has(masterData.evaluationId!)) {
          // إنشاء معرف جديد
          masterData.evaluationId = generateMasterEvaluationId(
            checklist.locationId,
            checklist.userId,
            new Date(Date.now() + stats.dailyChecklistsProcessed)
          );
        }
        
        await db.insert(masterEvaluations).values(masterData as InsertMasterEvaluation);
        stats.dailyChecklistsProcessed++;
        stats.totalMigrated++;
        
        if (stats.totalMigrated % 10 === 0) {
          console.log(`📊 [Migration] تم نقل ${stats.totalMigrated} تقييم...`);
        }
        
      } catch (error) {
        stats.errors.push(`خطأ في نقل daily_checklist ${checklist.id}: ${error}`);
      }
    }

    // 4️⃣ نقل البيانات من unified_evaluations
    console.log("📋 [Migration] نقل البيانات من unified_evaluations...");
    const unifiedData = await db.select().from(unifiedEvaluations);
    
    for (const unified of unifiedData) {
      try {
        // تخطي المكررات
        if (existingEvaluationIds.has(unified.evaluationId)) {
          stats.duplicatesSkipped++;
          continue;
        }
        
        const masterData = convertUnifiedToMaster(unified);
        
        await db.insert(masterEvaluations).values(masterData as InsertMasterEvaluation);
        stats.unifiedEvaluationsProcessed++;
        stats.totalMigrated++;
        
      } catch (error) {
        stats.errors.push(`خطأ في نقل unified_evaluation ${unified.id}: ${error}`);
      }
    }

    console.log("✅ [Migration] اكتمل نقل البيانات بنجاح!");
    console.log(`📊 [Migration] الإحصائيات النهائية:`, stats);
    
    return stats;
    
  } catch (error) {
    stats.errors.push(`خطأ عام في النقل: ${error}`);
    console.error("❌ [Migration] خطأ في نقل البيانات:", error);
    throw error;
  }
}

/**
 * 🔍 دالة فحص صحة البيانات المنقولة
 */
export async function validateMigration(): Promise<{
  isValid: boolean;
  issues: string[];
  stats: {
    totalMasterEvaluations: number;
    totalDailyChecklists: number;
    totalUnifiedEvaluations: number;
  }
}> {
  console.log("🔍 [Migration] فحص صحة البيانات المنقولة...");
  
  const issues: string[] = [];
  
  // إحصائيات الجداول
  const masterCount = await db.select().from(masterEvaluations).then((rows: any) => rows.length);
  const dailyCount = await db.select().from(dailyChecklists).then((rows: any) => rows.length);
  const unifiedCount = await db.select().from(unifiedEvaluations).then((rows: any) => rows.length);
  
  console.log(`📊 [Migration] عدد التقييمات: النظام الواحد: ${masterCount}, Daily: ${dailyCount}, Unified: ${unifiedCount}`);
  
  // التحقق من التطابق
  const expectedTotal = dailyCount + unifiedCount;
  if (masterCount < expectedTotal) {
    issues.push(`عدد التقييمات في النظام الواحد (${masterCount}) أقل من المتوقع (${expectedTotal})`);
  }
  
  // فحص عينة من البيانات
  const sampleMaster = await db.select().from(masterEvaluations).limit(5);
  
  for (const evaluation of sampleMaster) {
    if (!evaluation.locationNameAr || !evaluation.evaluatorName || !evaluation.companyNameAr) {
      issues.push(`بيانات ناقصة في التقييم ${evaluation.id}`);
    }
    
    if (!evaluation.evaluationTime || !evaluation.evaluationDateTime) {
      issues.push(`بيانات التوقيت ناقصة في التقييم ${evaluation.id}`);
    }
  }
  
  const isValid = issues.length === 0;
  
  console.log(isValid ? "✅ [Migration] البيانات صحيحة!" : "⚠️ [Migration] مشاكل في البيانات:");
  issues.forEach(issue => console.log(`  - ${issue}`));
  
  return {
    isValid,
    issues,
    stats: {
      totalMasterEvaluations: masterCount,
      totalDailyChecklists: dailyCount,
      totalUnifiedEvaluations: unifiedCount
    }
  };
}

/**
 * 🧹 دالة تنظيف البيانات المكررة
 */
export async function cleanupDuplicates(): Promise<number> {
  console.log("🧹 [Migration] تنظيف البيانات المكررة...");
  
  // البحث عن التقييمات المكررة بناءً على الموقع والمُقيِّم والتاريخ
  const duplicates = await db.select({
    id: masterEvaluations.id,
    locationId: masterEvaluations.locationId,
    evaluatorId: masterEvaluations.evaluatorId,
    evaluationDate: masterEvaluations.evaluationDate,
    evaluationTime: masterEvaluations.evaluationTime,
  }).from(masterEvaluations);
  
  // تجميع المكررات
  const duplicateGroups = new Map<string, any[]>();
  
  duplicates.forEach((evaluation: any) => {
    const key = `${evaluation.locationId}_${evaluation.evaluatorId}_${evaluation.evaluationDate}_${evaluation.evaluationTime}`;
    if (!duplicateGroups.has(key)) {
      duplicateGroups.set(key, []);
    }
    duplicateGroups.get(key)!.push(evaluation);
  });
  
  let cleanedCount = 0;
  
  // حذف المكررات (الاحتفاظ بالأول فقط)
  for (const [key, group] of Array.from(duplicateGroups)) {
    if (group.length > 1) {
      // حذف جميع النسخ عدا الأولى
      for (let i = 1; i < group.length; i++) {
        await db.delete(masterEvaluations).where(eq(masterEvaluations.id, group[i].id));
        cleanedCount++;
      }
    }
  }
  
  console.log(`🧹 [Migration] تم تنظيف ${cleanedCount} تقييم مكرر`);
  return cleanedCount;
}

/**
 * ✨ دوال متوافقة مع routes.ts
 */
export const migrateAllDataToMaster = migrateMasterEvaluations;
export const getMigrationStatus = validateMigration;

export default {
  migrateMasterEvaluations,
  validateMigration,
  cleanupDuplicates,
  migrateAllDataToMaster,
  getMigrationStatus
};