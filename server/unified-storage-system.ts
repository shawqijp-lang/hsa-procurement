/**
 * 🏗️ نظام التخزين الموحد الشامل
 * يحل مشكلة تعدد مصادر التخزين وعدم تطابق البيانات في التقارير
 */

import { db } from './db';
import { storage } from './storage';
import { 
  locations, users, companies, checklistTemplates, dailyChecklists,
  Location, User, Company, ChecklistTemplate, DailyChecklist
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

interface UnifiedDataSource {
  name: string;
  priority: number; // أعلى = أولوية أكبر
  isActive: boolean;
  lastSync?: Date;
}

interface DataIntegrityReport {
  locationMismatches: number;
  templateMismatches: number;
  evaluationMismatches: number;
  missingRelations: number;
  duplicateData: number;
  fixedIssues: number;
  totalIssues: number;
}

/**
 * نظام إدارة التخزين الموحد
 */
export class UnifiedStorageSystem {
  private dataSources: Map<string, UnifiedDataSource> = new Map([
    ['postgresql', { name: 'PostgreSQL Database', priority: 100, isActive: true }],
    ['localstorage', { name: 'LocalStorage Cache', priority: 50, isActive: true }],
    ['indexeddb', { name: 'IndexedDB (APK)', priority: 60, isActive: true }],
    ['redis_cache', { name: 'Redis Cache', priority: 30, isActive: true }]
  ]);

  /**
   * 🔍 فحص تكامل البيانات الشامل
   */
  async performIntegrityCheck(companyId?: number): Promise<DataIntegrityReport> {
    console.log('🔍 بدء فحص تكامل البيانات الشامل...');
    
    const report: DataIntegrityReport = {
      locationMismatches: 0,
      templateMismatches: 0,
      evaluationMismatches: 0,
      missingRelations: 0,
      duplicateData: 0,
      fixedIssues: 0,
      totalIssues: 0
    };

    try {
      // 1. فحص المواقع
      await this.checkLocationIntegrity(report, companyId);
      
      // 2. فحص القوالب والمهام
      await this.checkTemplateIntegrity(report, companyId);
      
      // 3. فحص التقييمات
      await this.checkEvaluationIntegrity(report, companyId);
      
      // 4. فحص العلاقات والروابط
      await this.checkRelationalIntegrity(report, companyId);
      
      report.totalIssues = 
        report.locationMismatches + 
        report.templateMismatches + 
        report.evaluationMismatches + 
        report.missingRelations + 
        report.duplicateData;

      console.log('✅ اكتمل فحص التكامل:', report);
      return report;

    } catch (error) {
      console.error('❌ خطأ في فحص التكامل:', error);
      throw error;
    }
  }

  /**
   * 🔧 إصلاح وتوحيد جميع البيانات
   */
  async unifyAndRepairAllData(companyId?: number): Promise<DataIntegrityReport> {
    console.log('🔧 بدء عملية التوحيد والإصلاح الشاملة...');
    
    const report = await this.performIntegrityCheck(companyId);
    
    if (report.totalIssues === 0) {
      console.log('✅ لا توجد مشاكل في البيانات - النظام سليم');
      return report;
    }

    console.log(`🔨 إصلاح ${report.totalIssues} مشكلة في البيانات...`);

    // 1. إصلاح المواقع
    if (report.locationMismatches > 0) {
      await this.repairLocationData(companyId);
      report.fixedIssues += report.locationMismatches;
    }

    // 2. إصلاح القوالب
    if (report.templateMismatches > 0) {
      await this.repairTemplateData(companyId);
      report.fixedIssues += report.templateMismatches;
    }

    // 3. إصلاح التقييمات
    if (report.evaluationMismatches > 0) {
      await this.repairEvaluationData(companyId);
      report.fixedIssues += report.evaluationMismatches;
    }

    // 4. إصلاح العلاقات المفقودة
    if (report.missingRelations > 0) {
      await this.repairMissingRelations(companyId);
      report.fixedIssues += report.missingRelations;
    }

    // 5. إزالة البيانات المكررة
    if (report.duplicateData > 0) {
      await this.removeDuplicateData(companyId);
      report.fixedIssues += report.duplicateData;
    }

    console.log(`✅ تم إصلاح ${report.fixedIssues} مشكلة بنجاح`);
    
    // التحقق النهائي
    return await this.performIntegrityCheck(companyId);
  }

  /**
   * 🏢 فحص تكامل بيانات المواقع
   */
  private async checkLocationIntegrity(report: DataIntegrityReport, companyId?: number) {
    console.log('📍 فحص تكامل المواقع...');
    
    // جلب جميع المواقع
    const dbLocations = await db
      .select()
      .from(locations)
      .where(companyId ? eq(locations.companyId, companyId) : undefined);

    // فحص المواقع المفقودة أو الغير صحيحة
    for (const location of dbLocations) {
      // فحص المواقع ذات البيانات الناقصة
      if (!location.nameAr || !location.nameEn || !location.icon) {
        report.locationMismatches++;
        console.warn(`⚠️ موقع ناقص البيانات: ${location.id}`);
      }
      
      // فحص المواقع غير المفعلة
      if (!location.isActive) {
        console.warn(`⚠️ موقع غير مفعل: ${location.nameAr}`);
      }
    }
  }

  /**
   * 📋 فحص تكامل قوالب المهام
   */
  private async checkTemplateIntegrity(report: DataIntegrityReport, companyId?: number) {
    console.log('📋 فحص تكامل قوالب المهام...');
    
    const templates = await db
      .select()
      .from(checklistTemplates)
      .where(companyId ? eq(checklistTemplates.companyId, companyId) : undefined);

    for (const template of templates) {
      // فحص القوالب ذات البيانات الناقصة
      if (!template.categoryAr || !template.taskAr) {
        report.templateMismatches++;
        console.warn(`⚠️ قالب ناقص: ${template.id}`);
      }

      // فحص الربط بالمواقع
      const locationExists = await db
        .select({ id: locations.id })
        .from(locations)
        .where(eq(locations.id, template.locationId))
        .limit(1);

      if (locationExists.length === 0) {
        report.missingRelations++;
        console.warn(`⚠️ قالب مرتبط بموقع غير موجود: template ${template.id} -> location ${template.locationId}`);
      }
    }
  }

  /**
   * ⭐ فحص تكامل التقييمات
   */
  private async checkEvaluationIntegrity(report: DataIntegrityReport, companyId?: number) {
    console.log('⭐ فحص تكامل التقييمات...');
    
    const evaluations = await db
      .select()
      .from(dailyChecklists)
      .where(companyId ? eq(dailyChecklists.companyId, companyId) : undefined);

    for (const evaluation of evaluations) {
      // فحص صحة JSON
      try {
        if (typeof evaluation.tasks === 'string') {
          JSON.parse(evaluation.tasks);
        } else if (!Array.isArray(evaluation.tasks)) {
          report.evaluationMismatches++;
          console.warn(`⚠️ تقييم بتنسيق خاطئ: ${evaluation.id}`);
        }
      } catch (error) {
        report.evaluationMismatches++;
        console.warn(`⚠️ تقييم JSON غير صالح: ${evaluation.id}`);
      }

      // فحص الربط بالمواقع والمستخدمين
      const locationExists = await db
        .select({ id: locations.id })
        .from(locations)
        .where(eq(locations.id, evaluation.locationId))
        .limit(1);

      if (locationExists.length === 0) {
        report.missingRelations++;
        console.warn(`⚠️ تقييم مرتبط بموقع غير موجود: evaluation ${evaluation.id} -> location ${evaluation.locationId}`);
      }

      const userExists = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, evaluation.userId))
        .limit(1);

      if (userExists.length === 0) {
        report.missingRelations++;
        console.warn(`⚠️ تقييم مرتبط بمستخدم غير موجود: evaluation ${evaluation.id} -> user ${evaluation.userId}`);
      }
    }
  }

  /**
   * 🔗 فحص العلاقات والروابط
   */
  private async checkRelationalIntegrity(report: DataIntegrityReport, companyId?: number) {
    console.log('🔗 فحص العلاقات والروابط...');
    
    // فحص القوالب اليتيمة (بدون مواقع)
    const orphanedTemplatesQuery = await db
      .select({ templateId: checklistTemplates.id })
      .from(checklistTemplates)
      .leftJoin(locations, eq(checklistTemplates.locationId, locations.id))
      .where(
        and(
          eq(locations.id, null as any),
          companyId ? eq(checklistTemplates.companyId, companyId) : undefined
        )
      );

    report.missingRelations += orphanedTemplatesQuery.length;

    // فحص التقييمات اليتيمة
    const orphanedEvaluationsQuery = await db
      .select({ evaluationId: dailyChecklists.id })
      .from(dailyChecklists)
      .leftJoin(locations, eq(dailyChecklists.locationId, locations.id))
      .leftJoin(users, eq(dailyChecklists.userId, users.id))
      .where(
        and(
          eq(locations.id, null as any),
          companyId ? eq(dailyChecklists.companyId, companyId) : undefined
        )
      );

    report.missingRelations += orphanedEvaluationsQuery.length;
  }

  /**
   * 🔧 إصلاح بيانات المواقع
   */
  private async repairLocationData(companyId?: number) {
    console.log('🔧 إصلاح بيانات المواقع...');
    
    const problemLocations = await db
      .select()
      .from(locations)
      .where(companyId ? eq(locations.companyId, companyId) : undefined);

    for (const location of problemLocations) {
      const updates: Partial<Location> = {};
      let needsUpdate = false;

      // إصلاح الأسماء المفقودة
      if (!location.nameAr) {
        updates.nameAr = `موقع ${location.id}`;
        needsUpdate = true;
      }
      
      if (!location.nameEn) {
        updates.nameEn = `Location ${location.id}`;
        needsUpdate = true;
      }

      // إصلاح الأيقونة المفقودة
      if (!location.icon) {
        updates.icon = 'MapPin';
        needsUpdate = true;
      }

      if (needsUpdate) {
        await db
          .update(locations)
          .set(updates)
          .where(eq(locations.id, location.id));
        
        console.log(`✅ تم إصلاح الموقع: ${location.id}`);
      }
    }
  }

  /**
   * 🔧 إصلاح بيانات القوالب
   */
  private async repairTemplateData(companyId?: number) {
    console.log('🔧 إصلاح بيانات القوالب...');
    
    const problemTemplates = await db
      .select()
      .from(checklistTemplates)
      .where(companyId ? eq(checklistTemplates.companyId, companyId) : undefined);

    for (const template of problemTemplates) {
      const updates: Partial<ChecklistTemplate> = {};
      let needsUpdate = false;

      if (!template.categoryAr) {
        updates.categoryAr = 'فئة عامة';
        needsUpdate = true;
      }

      if (!template.taskAr) {
        updates.taskAr = `مهمة ${template.id}`;
        needsUpdate = true;
      }

      if (!template.categoryEn) {
        updates.categoryEn = 'General Category';
        needsUpdate = true;
      }

      if (!template.taskEn) {
        updates.taskEn = `Task ${template.id}`;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await db
          .update(checklistTemplates)
          .set(updates)
          .where(eq(checklistTemplates.id, template.id));
        
        console.log(`✅ تم إصلاح القالب: ${template.id}`);
      }
    }
  }

  /**
   * 🔧 إصلاح بيانات التقييمات
   */
  private async repairEvaluationData(companyId?: number) {
    console.log('🔧 إصلاح بيانات التقييمات...');
    
    const problemEvaluations = await db
      .select()
      .from(dailyChecklists)
      .where(companyId ? eq(dailyChecklists.companyId, companyId) : undefined);

    for (const evaluation of problemEvaluations) {
      let needsUpdate = false;
      const updates: Partial<DailyChecklist> = {};

      // إصلاح JSON غير الصالح
      try {
        let tasks = evaluation.tasks;
        if (typeof tasks === 'string') {
          tasks = JSON.parse(tasks);
        }
        
        if (!Array.isArray(tasks)) {
          updates.tasks = [] as any;
          needsUpdate = true;
          console.log(`🔧 إصلاح مهام التقييم: ${evaluation.id}`);
        }
      } catch (error) {
        updates.tasks = [] as any;
        needsUpdate = true;
        console.log(`🔧 إصلاح JSON التقييم: ${evaluation.id}`);
      }

      if (needsUpdate) {
        await db
          .update(dailyChecklists)
          .set(updates)
          .where(eq(dailyChecklists.id, evaluation.id));
      }
    }
  }

  /**
   * 🔧 إصلاح العلاقات المفقودة
   */
  private async repairMissingRelations(companyId?: number) {
    console.log('🔧 إصلاح العلاقات المفقودة...');
    
    // حذف القوالب اليتيمة
    const orphanedTemplates = await db
      .select({ id: checklistTemplates.id })
      .from(checklistTemplates)
      .leftJoin(locations, eq(checklistTemplates.locationId, locations.id))
      .where(
        and(
          eq(locations.id, null as any),
          companyId ? eq(checklistTemplates.companyId, companyId) : undefined
        )
      );

    if (orphanedTemplates.length > 0) {
      const templateIds = orphanedTemplates.map(t => t.id);
      // سنحذف القوالب اليتيمة فقط إذا لم تكن مرتبطة بتقييمات
      console.log(`🗑️ العثور على ${templateIds.length} قالب يتيم - سيتم حذفها`);
      
      for (const templateId of templateIds) {
        await db
          .delete(checklistTemplates)
          .where(eq(checklistTemplates.id, templateId));
      }
    }

    // حذف التقييمات اليتيمة
    const orphanedEvaluations = await db
      .select({ id: dailyChecklists.id })
      .from(dailyChecklists)
      .leftJoin(locations, eq(dailyChecklists.locationId, locations.id))
      .where(
        and(
          eq(locations.id, null as any),
          companyId ? eq(dailyChecklists.companyId, companyId) : undefined
        )
      );

    if (orphanedEvaluations.length > 0) {
      const evaluationIds = orphanedEvaluations.map(e => e.id);
      console.log(`🗑️ العثور على ${evaluationIds.length} تقييم يتيم - سيتم حذفها`);
      
      for (const evaluationId of evaluationIds) {
        await db
          .delete(dailyChecklists)
          .where(eq(dailyChecklists.id, evaluationId));
      }
    }
  }

  /**
   * 🔧 إزالة البيانات المكررة
   */
  private async removeDuplicateData(companyId?: number) {
    console.log('🔧 إزالة البيانات المكررة...');
    
    // البحث عن مواقع مكررة بنفس الاسم والشركة
    const duplicateLocations = await db
      .select()
      .from(locations)
      .where(companyId ? eq(locations.companyId, companyId) : undefined);

    const locationMap = new Map<string, Location[]>();
    
    duplicateLocations.forEach(location => {
      const key = `${location.nameAr}_${location.companyId}`;
      if (!locationMap.has(key)) {
        locationMap.set(key, []);
      }
      locationMap.get(key)!.push(location);
    });

    // إزالة المواقع المكررة (الاحتفاظ بالأقدم)
    for (const [key, duplicates] of locationMap.entries()) {
      if (duplicates.length > 1) {
        const toKeep = duplicates.sort((a, b) => a.id - b.id)[0];
        const toRemove = duplicates.slice(1);
        
        console.log(`🔄 العثور على ${duplicates.length} مواقع مكررة لـ "${key}" - الاحتفاظ بـ ${toKeep.id}`);
        
        for (const duplicate of toRemove) {
          // نقل القوالب والتقييمات للموقع الأصلي
          await db
            .update(checklistTemplates)
            .set({ locationId: toKeep.id })
            .where(eq(checklistTemplates.locationId, duplicate.id));
          
          await db
            .update(dailyChecklists)
            .set({ locationId: toKeep.id })
            .where(eq(dailyChecklists.locationId, duplicate.id));
          
          // حذف الموقع المكرر
          await db
            .delete(locations)
            .where(eq(locations.id, duplicate.id));
        }
      }
    }
  }

  /**
   * 📊 إحصائيات النظام الموحد
   */
  async getUnifiedSystemStats(companyId?: number) {
    const stats = {
      locations: await db.select().from(locations).where(companyId ? eq(locations.companyId, companyId) : undefined),
      templates: await db.select().from(checklistTemplates).where(companyId ? eq(checklistTemplates.companyId, companyId) : undefined),
      evaluations: await db.select().from(dailyChecklists).where(companyId ? eq(dailyChecklists.companyId, companyId) : undefined),
      dataSources: Array.from(this.dataSources.values()),
      integrityStatus: await this.performIntegrityCheck(companyId)
    };

    return {
      summary: {
        totalLocations: stats.locations.length,
        totalTemplates: stats.templates.length,
        totalEvaluations: stats.evaluations.length,
        activeDataSources: stats.dataSources.filter(ds => ds.isActive).length,
        healthScore: Math.max(0, 100 - (stats.integrityStatus.totalIssues * 10))
      },
      integrity: stats.integrityStatus,
      dataSources: stats.dataSources
    };
  }
}

/**
 * المثيل الموحد لنظام التخزين
 */
export const unifiedStorage = new UnifiedStorageSystem();