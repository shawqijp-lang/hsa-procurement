/**
 * 📊 نظام التقييم الموحد الجديد
 * يوحد التخزين المحلي والخادم في جدول واحد بهيكل واضح
 */

import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// 📊 الجدول الموحد للتقييمات الجديد
export const unifiedEvaluations = pgTable("unified_evaluations", {
  id: serial("id").primaryKey(),
  
  // معرف فريد للتقييم (يعمل أونلاين وأوفلاين)
  evaluationId: text("evaluation_id").notNull().unique(), // مثل: eval_2025_08_29_1430_523_43
  
  // معلومات الموقع (نصوص واضحة)
  locationId: integer("location_id").notNull(),
  locationNameAr: text("location_name_ar").notNull(), // اسم واضح بدلاً من معرف
  locationNameEn: text("location_name_en").notNull(),
  
  // معلومات المُقيِّم (نصوص واضحة)
  evaluatorId: integer("evaluator_id").notNull(),
  evaluatorName: text("evaluator_name").notNull(), // اسم واضح
  
  // معلومات الشركة
  companyId: integer("company_id").notNull(),
  companyNameAr: text("company_name_ar").notNull(),
  companyNameEn: text("company_name_en").notNull(),
  
  // التوقيت الدقيق
  evaluationTimestamp: timestamp("evaluation_timestamp").notNull(),
  evaluationDate: text("evaluation_date").notNull(), // YYYY-MM-DD
  evaluationTime: text("evaluation_time").notNull(), // HH:MM:SS
  
  // التقييمات التفصيلية (JSON منظم)
  evaluationItems: jsonb("evaluation_items").notNull(), // البنود والمهام مع التقييمات
  
  // الملاحظات والتقييم العام
  generalNotes: text("general_notes"), // ملاحظة عامة على التقييم
  overallRating: integer("overall_rating"), // تقييم عام من 1-4
  
  // حالة المزامنة
  isSynced: boolean("is_synced").notNull().default(false), // هل تم رفعه للخادم؟
  syncTimestamp: timestamp("sync_timestamp"), // متى تم الرفع؟
  source: text("source").notNull().default("offline"), // "offline" أو "online"
  
  // حقول تقنية
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 🎯 تعريف أنواع البيانات للتقييم الموحد
export const evaluationItemSchema = z.object({
  categoryName: z.string(), // اسم الفئة
  itemName: z.string(), // اسم البند
  itemRating: z.number().min(0).max(5), // تقييم البند من 0-5
  itemComment: z.string().optional(), // تعليق على البند
  
  // المهام الفرعية
  subTasks: z.array(z.object({
    taskName: z.string(), // اسم المهمة الفرعية
    rating: z.number().min(0).max(5), // تقييم المهمة
    comment: z.string().optional(), // تعليق على المهمة
    completed: z.boolean().default(false), // هل اكتملت؟
  })).optional(),
});

// 🎯 مخطط إدخال التقييم الموحد
export const insertUnifiedEvaluationSchema = createInsertSchema(unifiedEvaluations, {
  evaluationItems: z.array(evaluationItemSchema),
  overallRating: z.number().min(1).max(5).optional(),
  generalNotes: z.string().max(500).optional(),
});

// 🎯 أنواع البيانات المشتقة
export type UnifiedEvaluation = typeof unifiedEvaluations.$inferSelect;
export type InsertUnifiedEvaluation = z.infer<typeof insertUnifiedEvaluationSchema>;
export type EvaluationItem = z.infer<typeof evaluationItemSchema>;

// 🎯 دالة مساعدة لإنشاء معرف التقييم الفريد
export function generateEvaluationId(locationId: number, evaluatorId: number, timestamp?: Date): string {
  const now = timestamp || new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '_'); // 2025_08_29
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, ''); // 143000
  
  return `eval_${dateStr}_${timeStr}_${locationId}_${evaluatorId}`;
}

// 🎯 دالة مساعدة لحساب التقييم العام (للعرض كدرجة من 5)
export function calculateOverallRating(items: EvaluationItem[]): number {
  if (!items.length) return 0;
  
  let totalScore = 0;
  let totalItems = 0;
  
  items.forEach(item => {
    totalScore += item.itemRating;
    totalItems++;
    
    // إضافة تقييمات المهام الفرعية
    if (item.subTasks) {
      item.subTasks.forEach(subTask => {
        totalScore += subTask.rating;
        totalItems++;
      });
    }
  });
  
  return totalItems > 0 ? Math.round((totalScore / totalItems) * 100) / 100 : 0;
}

// 🎯 دالة جديدة لحساب جودة التقييم كنسبة مئوية (0-100%)
export function calculateQualityPercent(items: EvaluationItem[]): number {
  if (!items.length) return 0;
  
  let totalQualityScore = 0;
  let validItemsCount = 0;
  
  items.forEach(item => {
    let itemScore = 0;
    let itemRatingCount = 0;
    
    // إذا كان للبند مهام فرعية، احسب متوسطها
    if (item.subTasks && item.subTasks.length > 0) {
      let subTasksSum = 0;
      let validSubTasksCount = 0;
      
      item.subTasks.forEach(subTask => {
        if (subTask.rating > 0) { // تجاهل التقييمات الصفر أو غير المكتملة
          subTasksSum += subTask.rating;
          validSubTasksCount++;
        }
      });
      
      if (validSubTasksCount > 0) {
        itemScore = subTasksSum / validSubTasksCount;
        itemRatingCount = 1;
      }
    } else {
      // استخدم تقييم البند المباشر إذا لم توجد مهام فرعية
      if (item.itemRating > 0) {
        itemScore = item.itemRating;
        itemRatingCount = 1;
      }
    }
    
    // أضف النتيجة للمجموع إذا كانت صالحة
    if (itemRatingCount > 0) {
      totalQualityScore += itemScore;
      validItemsCount++;
    }
  });
  
  if (validItemsCount === 0) return 0;
  
  // حساب المتوسط وتحويله إلى نسبة مئوية (من 4 إلى 100%)
  const averageRating = totalQualityScore / validItemsCount;
  const qualityPercent = Math.round((averageRating / 4) * 100);
  
  return Math.max(0, Math.min(100, qualityPercent)); // تأكد من أن النتيجة بين 0-100%
}

export default {
  unifiedEvaluations,
  insertUnifiedEvaluationSchema,
  generateEvaluationId,
  calculateOverallRating,
  calculateQualityPercent
};