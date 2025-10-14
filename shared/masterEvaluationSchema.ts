/**
 * 🎯 النظام الواحد في الخادم - Master Evaluations System
 * يوحد جميع أنظمة التقييمات في جدول واحد شامل
 */

import { pgTable, text, serial, integer, boolean, timestamp, jsonb, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// 🏆 الجدول الواحد الشامل لجميع التقييمات
export const masterEvaluations = pgTable("master_evaluations", {
  id: serial("id").primaryKey(),
  
  // 🎯 المعرفات الأساسية
  evaluationId: text("evaluation_id").notNull().unique(), // معرف فريد موحد
  legacyId: integer("legacy_id"), // معرف النظام القديم (للربط)
  
  // 📍 معلومات الموقع (معرف + أسماء واضحة)
  locationId: integer("location_id").notNull(),
  locationNameAr: text("location_name_ar").notNull(),
  locationNameEn: text("location_name_en").notNull(),
  locationIcon: text("location_icon"), // أيقونة الموقع
  
  // 👤 معلومات المُقيِّم (معرف + اسم واضح)
  evaluatorId: integer("evaluator_id").notNull(),
  evaluatorName: text("evaluator_name").notNull(),
  evaluatorRole: text("evaluator_role"), // دور المُقيِّم
  
  // 🏢 معلومات الشركة
  companyId: integer("company_id").notNull(),
  companyNameAr: text("company_name_ar").notNull(),
  companyNameEn: text("company_name_en").notNull(),
  
  // 📅 التوقيت الشامل والدقيق
  evaluationDate: text("evaluation_date").notNull(), // YYYY-MM-DD
  evaluationTime: text("evaluation_time").notNull(), // HH:MM:SS في توقيت الرياض
  evaluationDateTime: text("evaluation_date_time").notNull(), // ISO string كامل
  evaluationTimestamp: bigint("evaluation_timestamp", { mode: 'number' }).notNull(), // Unix timestamp
  
  // 📋 التقييمات التفصيلية (JSON منظم وشامل)
  tasks: jsonb("tasks").notNull(), // مطابق لـ daily_checklists
  categoryComments: jsonb("category_comments"), // تعليقات الفئات
  evaluationItems: jsonb("evaluation_items"), // بنية unified_evaluations
  
  // 📝 الملاحظات والتقييم العام
  evaluationNotes: text("evaluation_notes"), // الملاحظة العامة (100 حرف)
  generalNotes: text("general_notes"), // ملاحظات إضافية
  overallRating: integer("overall_rating"), // التقييم العام (1-100)
  
  // 🕐 الوقت التفصيلي (متوافق مع daily_checklists)
  completedAt: text("completed_at"), // وقت الإنجاز
  createdAt: text("created_at"), // وقت الإنشاء (نص)
  
  // 🔄 معلومات المزامنة والمصدر
  source: text("source").notNull().default("server"), // "server", "offline", "unified"
  isSynced: boolean("is_synced").notNull().default(true),
  syncTimestamp: bigint("sync_timestamp", { mode: 'number' }), // وقت المزامنة
  
  // 🔐 معلومات الأمان والتشفير
  offlineId: text("offline_id"), // معرف الأوفلاين الأصلي
  isEncrypted: boolean("is_encrypted").notNull().default(false),
  
  // 📊 إحصائيات التقييم
  totalTasks: integer("total_tasks"), // عدد المهام الإجمالي
  completedTasks: integer("completed_tasks"), // عدد المهام المكتملة
  averageRating: integer("average_rating"), // متوسط التقييم
  
  // 🕒 طوابع زمنية النظام
  systemCreatedAt: timestamp("system_created_at").defaultNow(),
  systemUpdatedAt: timestamp("system_updated_at").defaultNow(),
});

// 🎯 مخطط المهمة في النظام الموحد
export const masterTaskSchema = z.object({
  templateId: z.number(),
  completed: z.boolean(),
  rating: z.number().min(0).max(5),
  itemComment: z.string().optional(),
  subTaskRatings: z.array(z.object({
    taskIndex: z.number(),
    taskName: z.string(),
    rating: z.number().min(0).max(5),
    notes: z.string().optional(),
  })).optional(),
});

// 🎯 مخطط بند التقييم في النظام الموحد
export const masterEvaluationItemSchema = z.object({
  categoryName: z.string(),
  itemName: z.string(),
  itemRating: z.number().min(0).max(5),
  itemComment: z.string().optional(),
  subTasks: z.array(z.object({
    taskName: z.string(),
    rating: z.number().min(0).max(5),
    comment: z.string().optional(),
    completed: z.boolean().default(false),
  })).optional(),
});

// 🎯 مخطط إدخال النظام الواحد الشامل
export const insertMasterEvaluationSchema = createInsertSchema(masterEvaluations, {
  tasks: z.array(masterTaskSchema),
  evaluationItems: z.array(masterEvaluationItemSchema).optional(),
  categoryComments: z.record(z.string()).optional(),
  overallRating: z.number().min(0).max(100).optional(),
  evaluationNotes: z.string().max(100).optional(),
  generalNotes: z.string().max(500).optional(),
}).omit({
  id: true,
  systemCreatedAt: true,
  systemUpdatedAt: true,
});

// 🎯 أنواع البيانات المشتقة
export type MasterEvaluation = typeof masterEvaluations.$inferSelect;
export type InsertMasterEvaluation = z.infer<typeof insertMasterEvaluationSchema>;
export type MasterTask = z.infer<typeof masterTaskSchema>;
export type MasterEvaluationItem = z.infer<typeof masterEvaluationItemSchema>;

// 🎯 دالة إنشاء معرف التقييم الفريد للنظام الواحد - محدث لضمان الفرادة المطلقة
export function generateMasterEvaluationId(
  locationId: number, 
  evaluatorId: number, 
  timestamp?: Date
): string {
  const now = timestamp || new Date();
  
  // تنسيق التاريخ: YYYY_MM_DD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}_${month}_${day}`;
  
  // تنسيق الوقت: HHMMSS
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timeStr = `${hours}${minutes}${seconds}`;
  
  // إضافة ميليثانية وعنصر عشوائي لضمان الفرادة المطلقة
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  const randomSuffix = Math.random().toString(36).substr(2, 6);
  
  // معرف فريد محدث: master_YYYY_MM_DD_HHMMSS_MMM_LocationId_EvaluatorId_RANDOM
  return `master_${dateStr}_${timeStr}_${milliseconds}_${locationId}_${evaluatorId}_${randomSuffix}`;
}

// 🎯 دالة حساب الإحصائيات
export function calculateMasterEvaluationStats(tasks: MasterTask[]) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.completed).length;
  const totalRatings = tasks.filter(task => task.rating > 0).length;
  const sumRatings = tasks.reduce((sum, task) => sum + (task.rating || 0), 0);
  
  const averageRating = totalRatings > 0 ? Math.round((sumRatings / totalRatings) * 20) : 0; // تحويل إلى نسبة من 100
  
  return {
    totalTasks,
    completedTasks,
    averageRating,
    overallRating: averageRating, // نفس المتوسط كتقييم عام
  };
}

// 🎯 دالة تحويل من daily_checklists إلى النظام الواحد
export function convertDailyChecklistToMaster(
  dailyChecklist: any,
  locationInfo: { nameAr: string; nameEn: string; icon?: string },
  evaluatorInfo: { name: string; role?: string },
  companyInfo: { nameAr: string; nameEn: string }
): Partial<InsertMasterEvaluation> {
  const stats = calculateMasterEvaluationStats(dailyChecklist.tasks || []);
  
  return {
    evaluationId: generateMasterEvaluationId(dailyChecklist.locationId, dailyChecklist.userId),
    legacyId: dailyChecklist.id,
    
    locationId: dailyChecklist.locationId,
    locationNameAr: locationInfo.nameAr,
    locationNameEn: locationInfo.nameEn,
    locationIcon: locationInfo.icon,
    
    evaluatorId: dailyChecklist.userId,
    evaluatorName: evaluatorInfo.name,
    evaluatorRole: evaluatorInfo.role,
    
    companyId: dailyChecklist.companyId,
    companyNameAr: companyInfo.nameAr,
    companyNameEn: companyInfo.nameEn,
    
    evaluationDate: dailyChecklist.checklistDate,
    evaluationTime: dailyChecklist.evaluationTime || "00:00:00",
    evaluationDateTime: dailyChecklist.evaluationDateTime || `${dailyChecklist.checklistDate}T00:00:00.000Z`,
    evaluationTimestamp: dailyChecklist.evaluationTimestamp || Date.now(),
    
    tasks: dailyChecklist.tasks,
    categoryComments: dailyChecklist.categoryComments,
    evaluationNotes: dailyChecklist.evaluationNotes,
    
    completedAt: dailyChecklist.completedAt,
    createdAt: dailyChecklist.createdAt,
    
    source: "daily_checklists",
    offlineId: dailyChecklist.offlineId,
    isEncrypted: dailyChecklist.isEncrypted || false,
    isSynced: dailyChecklist.isSynced ?? true,
    syncTimestamp: dailyChecklist.syncTimestamp,
    
    ...stats,
  };
}

// 🎯 دالة تحويل من unified_evaluations إلى النظام الواحد
export function convertUnifiedToMaster(
  unifiedEval: any,
  legacyTasks?: any[]
): Partial<InsertMasterEvaluation> {
  return {
    evaluationId: unifiedEval.evaluationId,
    
    locationId: unifiedEval.locationId,
    locationNameAr: unifiedEval.locationNameAr,
    locationNameEn: unifiedEval.locationNameEn,
    
    evaluatorId: unifiedEval.evaluatorId,
    evaluatorName: unifiedEval.evaluatorName,
    
    companyId: unifiedEval.companyId,
    companyNameAr: unifiedEval.companyNameAr,
    companyNameEn: unifiedEval.companyNameEn,
    
    evaluationDate: unifiedEval.evaluationDate,
    evaluationTime: unifiedEval.evaluationTime,
    evaluationDateTime: unifiedEval.evaluationTimestamp?.toISOString() || unifiedEval.evaluationDateTime,
    evaluationTimestamp: unifiedEval.evaluationTimestamp?.getTime() || Date.now(),
    
    tasks: legacyTasks || [],
    evaluationItems: unifiedEval.evaluationItems,
    generalNotes: unifiedEval.generalNotes,
    overallRating: unifiedEval.overallRating,
    
    source: "unified_evaluations",
    isSynced: unifiedEval.isSynced ?? true,
    syncTimestamp: unifiedEval.syncTimestamp?.getTime(),
    
    totalTasks: legacyTasks?.length || 0,
    completedTasks: legacyTasks?.filter((t: any) => t.completed).length || 0,
  };
}

export default {
  masterEvaluations,
  insertMasterEvaluationSchema,
  generateMasterEvaluationId,
  calculateMasterEvaluationStats,
  convertDailyChecklistToMaster,
  convertUnifiedToMaster,
};