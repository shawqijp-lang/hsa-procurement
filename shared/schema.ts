import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// استيراد المخطط الموحد للتقييمات الجديد
import { unifiedEvaluations } from "./unifiedEvaluationSchema";
// استيراد النظام الواحد الشامل للتقييمات
import { masterEvaluations } from "./masterEvaluationSchema";

// 🛡️ جدول سجلات الأمان
export const securityLogs = pgTable("security_logs", {
  id: serial("id").primaryKey(),
  eventType: varchar("event_type"),
  level: varchar("level"),
  userId: integer("user_id"),
  username: varchar("username"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  endpoint: varchar("endpoint"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  description: text("description"),
  type: text("type").notNull().default("regular"), // 'dairy_foods', 'general_industrial', 'soap_ghee', 'regular'
  status: text("status").notNull().default("active"), // 'active', 'planned'
  isActive: boolean("is_active").notNull().default(true),
  isTemplate: boolean("is_template").notNull().default(false), // للشركات المرجعية
  databaseConnection: text("database_connection").notNull().default("current"), // 'current', 'future'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("user"), // 'super_admin', 'general_manager', 'enhanced_general_manager', 'department_manager', 'admin', 'supervisor', 'data_specialist', 'analytics_viewer', or 'user'
  companyId: integer("company_id").references(() => companies.id), // null for super_admin
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by"), // المستخدم الذي أنشأ هذا المدير
  canManageUsers: boolean("can_manage_users").notNull().default(false), // صلاحية إدارة المستخدمين
  createdAt: timestamp("created_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  icon: text("icon").notNull(),
  description: text("description"),
  companyId: integer("company_id").notNull().references(() => companies.id),
  order: integer("order_index").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const checklistTemplates = pgTable("checklist_templates", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull().references(() => locations.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  categoryAr: text("category_ar").notNull(),
  categoryEn: text("category_en").notNull(),
  taskAr: text("task_ar").notNull(),
  taskEn: text("task_en").notNull(),
  descriptionAr: text("description_ar"),
  descriptionEn: text("description_en"),
  subPoints: jsonb("sub_points"), // Array of sub-points for each item
  subTasks: jsonb("sub_tasks"), // Array of sub-tasks for each item
  multiTasks: jsonb("multi_tasks"), // Array of multiple tasks for each item
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const dailyChecklists = pgTable("daily_checklists", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull().references(() => locations.id),
  userId: integer("user_id").notNull().references(() => users.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  // تطابق تام مع النظام المحلي - نصوص بدلاً من timestamp
  checklistDate: text("checklist_date").notNull(), // نص مثل المحلي
  tasks: jsonb("tasks").notNull(), // Array of {templateId: number, completed: boolean, rating: number, itemComment?: string}
  categoryComments: jsonb("category_comments"), // تعليقات الفئات {category: comment}
  evaluationNotes: text("evaluation_notes"), // Max 100 chars
  completedAt: text("completed_at"), // نص مثل المحلي
  createdAt: text("created_at"), // نص مثل المحلي
  // 🕐 حقول التوقيت المحسنة للتقارير
  evaluationTime: text("evaluation_time"), // وقت التقييم الدقيق (HH:MM:SS)
  evaluationDateTime: text("evaluation_date_time"), // التاريخ والوقت الكامل (ISO string)
  evaluationTimestamp: bigint("evaluation_timestamp", { mode: 'number' }), // Unix timestamp للترتيب السريع
  // حقول التوافق مع النظام المحلي
  offlineId: text("offline_id"), // معرف الأوفلاين الأصلي
  syncTimestamp: integer("sync_timestamp"), // وقت الحفظ المحلي (ثواني)
  isSynced: boolean("is_synced").notNull().default(true), // حالة المزامنة
  isEncrypted: boolean("is_encrypted").notNull().default(false), // حالة التشفير
});

// جدول الإعدادات الشاملة للنظام
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  companyId: integer("company_id").references(() => companies.id),
  category: text("category").notNull(), // 'general', 'notifications', 'security', 'appearance', 'backup', 'performance'
  settingKey: text("setting_key").notNull(),
  settingValue: jsonb("setting_value").notNull(),
  description: text("description"),
  isUserSpecific: boolean("is_user_specific").notNull().default(true),
  isCompanySpecific: boolean("is_company_specific").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// جدول لإدارة صلاحيات الوصول لشاشة KPI
export const kpiAccess = pgTable("kpi_access", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  grantedBy: integer("granted_by").notNull().references(() => users.id),
  companyIds: jsonb("company_ids").notNull(), // Array of company IDs the user can view
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// جدول لتتبع محاولات تسجيل الدخول الفاشلة
export const loginAttempts = pgTable("login_attempts", {
  id: serial("id").primaryKey(),
  identifier: text("identifier").notNull(), // username أو IP address
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at").defaultNow(),
  blockedUntil: timestamp("blocked_until"), // وقت انتهاء الحظر
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'daily', 'weekly', 'monthly'
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  locationIds: jsonb("location_ids").notNull(), // Array of location IDs
  generatedBy: integer("generated_by").notNull().references(() => users.id),
  filePath: text("file_path"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User location permissions table
export const userLocationPermissions = pgTable("user_location_permissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  locationId: integer("location_id").notNull().references(() => locations.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// User dashboard customization table
export const userDashboardSettings = pgTable("user_dashboard_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  dashboardConfig: jsonb("dashboard_config").notNull(), // Configuration object for dashboard sections
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Supervisor permissions for controlling regular users' location access
export const supervisorUserLocationPermissions = pgTable("supervisor_user_location_permissions", {
  id: serial("id").primaryKey(),
  supervisorId: integer("supervisor_id").notNull().references(() => users.id),
  userId: integer("user_id").notNull().references(() => users.id),
  locationId: integer("location_id").notNull().references(() => locations.id),
  isEnabled: boolean("is_enabled").notNull().default(true),
  grantedBy: integer("granted_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Supervisor assessment location permissions - controls which locations are visible to regular users
export const supervisorAssessmentLocationPermissions = pgTable("supervisor_assessment_location_permissions", {
  id: serial("id").primaryKey(),
  supervisorId: integer("supervisor_id").notNull().references(() => users.id),
  locationId: integer("location_id").notNull().references(() => locations.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dashboard settings table - إدارة إعدادات لوحة التحكم لكل مستخدم
export const dashboardSettings = pgTable("dashboard_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  sectionName: varchar("section_name", { length: 100 }).notNull(),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Category comments table - تعليقات الفئات
export const categoryComments = pgTable("category_comments", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklist_id").notNull().references(() => dailyChecklists.id),
  categoryAr: text("category_ar").notNull(), // اسم الفئة بالعربية
  comment: varchar("comment", { length: 100 }).notNull(), // التعليق محدود بـ 100 حرف
  userId: integer("user_id").notNull().references(() => users.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  locationId: integer("location_id").notNull().references(() => locations.id),
  evaluationDate: text("evaluation_date").notNull(), // تاريخ التقييم
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertKpiAccessSchema = createInsertSchema(kpiAccess).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
  companyId: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserLocationPermissionSchema = createInsertSchema(userLocationPermissions).omit({
  id: true,
  createdAt: true,
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChecklistTemplateSchema = createInsertSchema(checklistTemplates).omit({
  id: true,
});

export const insertDailyChecklistSchema = createInsertSchema(dailyChecklists).omit({
  id: true,
  createdAt: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});

export const insertCategoryCommentSchema = createInsertSchema(categoryComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserDashboardSettingsSchema = createInsertSchema(userDashboardSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupervisorUserLocationPermissionSchema = createInsertSchema(supervisorUserLocationPermissions).omit({
  id: true,
  createdAt: true,
});

export const insertSupervisorAssessmentLocationPermissionSchema = createInsertSchema(supervisorAssessmentLocationPermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Export types for TypeScript - All in one place to avoid duplication
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;
export type InsertChecklistTemplate = z.infer<typeof insertChecklistTemplateSchema>;

export type DailyChecklist = typeof dailyChecklists.$inferSelect;
export type DailyChecklistWithCompatibility = DailyChecklist & {
  // حقول التوافق مع النظام المحلي
  offlineId?: string | null;
  syncTimestamp?: number | null;
  isSynced?: boolean;
  isEncrypted?: boolean;
};
export type InsertDailyChecklist = z.infer<typeof insertDailyChecklistSchema>;

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

export type UserLocationPermission = typeof userLocationPermissions.$inferSelect;
export type InsertUserLocationPermission = z.infer<typeof insertUserLocationPermissionSchema>;

export type UserDashboardSettings = typeof userDashboardSettings.$inferSelect;
export type InsertUserDashboardSettings = z.infer<typeof insertUserDashboardSettingsSchema>;

export type SupervisorUserLocationPermission = typeof supervisorUserLocationPermissions.$inferSelect;
export type InsertSupervisorUserLocationPermission = z.infer<typeof insertSupervisorUserLocationPermissionSchema>;

export type SupervisorAssessmentLocationPermission = typeof supervisorAssessmentLocationPermissions.$inferSelect;
export type InsertSupervisorAssessmentLocationPermission = z.infer<typeof insertSupervisorAssessmentLocationPermissionSchema>;

export type KpiAccess = typeof kpiAccess.$inferSelect;
export type InsertKpiAccess = z.infer<typeof insertKpiAccessSchema>;

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;

export type DashboardSettings = typeof dashboardSettings.$inferSelect;
export type InsertDashboardSettings = typeof dashboardSettings.$inferInsert;

// Task completion interface
export interface TaskCompletion {
  templateId: number;
  completed: boolean;
  rating?: number; // 1-4 rating scale
  notes?: string;
  subTaskRatings?: SubTaskRating[]; // ratings for individual sub-tasks
}

// Sub-task rating interface
export interface SubTaskRating {
  taskIndex: number; // index of the sub-task in the multiTasks array
  taskName: string; // name of the sub-task for reference
  rating: number; // 1-4 rating scale
  notes?: string; // optional notes for this specific sub-task
}



export interface MultiTask {
  ar: string;
  en?: string;
}

export interface SubPoint {
  ar: string;
  en?: string;
}

export interface SubTask {
  ar: string;
  en?: string;
}

// ============================================
// 🎯 أنواع البيانات للتقارير الذكية الجديدة
// ============================================

// 🔍 مرشحات التقارير
export const reportFiltersSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  locationIds: z.array(z.number()).optional(),
  userIds: z.array(z.number()).optional(),
  companyId: z.number().optional(),
  groupBy: z.enum(['day', 'week', 'month', 'location', 'user']).optional()
});

export type ReportFilters = z.infer<typeof reportFiltersSchema>;

// 📊 مؤشرات الأداء الرئيسية
export const kpiResponseSchema = z.object({
  totalEvaluations: z.number(),
  completionRate: z.number(), // نسبة الإنجاز 0-100
  averageRating: z.number(), // متوسط التقييم 0-4
  averageRatingPercent: z.number(), // متوسط التقييم كنسبة مئوية 0-100
  totalTasks: z.number(),
  completedTasks: z.number(),
  activeLocations: z.number(),
  activeUsers: z.number(),
  improvement: z.object({
    completionRate: z.number(), // التغيير في نسبة الإنجاز مقارنة بالفترة السابقة
    averageRating: z.number(), // التغيير في متوسط التقييم
    trend: z.enum(['up', 'down', 'stable']) // اتجاه التحسن
  }).optional()
});

export type KPIResponse = z.infer<typeof kpiResponseSchema>;

// 📈 بيانات الاتجاهات الزمنية
export const trendDataPointSchema = z.object({
  date: z.string(), // تاريخ النقطة
  label: z.string(), // تسمية النقطة (للعرض)
  completionRate: z.number(), // نسبة الإنجاز
  averageRating: z.number(), // متوسط التقييم
  evaluationsCount: z.number(), // عدد التقييمات
  tasksCount: z.number() // عدد المهام
});

export const trendSeriesSchema = z.object({
  period: z.string(), // الفترة الزمنية
  data: z.array(trendDataPointSchema),
  summary: z.object({
    trend: z.enum(['improving', 'declining', 'stable']),
    bestPeriod: z.string(),
    worstPeriod: z.string(),
    averageImprovement: z.number()
  })
});

export type TrendDataPoint = z.infer<typeof trendDataPointSchema>;
export type TrendSeries = z.infer<typeof trendSeriesSchema>;

// 🔄 صفوف المقارنة
export const comparisonRowSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(['location', 'user']),
  currentPeriod: z.object({
    completionRate: z.number(),
    averageRating: z.number(),
    evaluationsCount: z.number(),
    tasksCount: z.number()
  }),
  previousPeriod: z.object({
    completionRate: z.number(),
    averageRating: z.number(),
    evaluationsCount: z.number(),
    tasksCount: z.number()
  }).optional(),
  change: z.object({
    completionRate: z.number(), // التغيير في نسبة الإنجاز
    averageRating: z.number(), // التغيير في متوسط التقييم
    rank: z.number(), // الترتيب
    performance: z.enum(['excellent', 'good', 'average', 'poor'])
  }).optional()
});

export const comparisonResponseSchema = z.object({
  locations: z.array(comparisonRowSchema),
  users: z.array(comparisonRowSchema),
  summary: z.object({
    topPerformer: comparisonRowSchema,
    mostImproved: comparisonRowSchema,
    needsAttention: z.array(comparisonRowSchema)
  })
});

export type ComparisonRow = z.infer<typeof comparisonRowSchema>;
export type ComparisonResponse = z.infer<typeof comparisonResponseSchema>;

// 🧠 رؤى ذكية
export const smartInsightSchema = z.object({
  id: z.string(),
  type: z.enum(['achievement', 'concern', 'trend', 'recommendation']),
  title: z.string(),
  description: z.string(),
  impact: z.enum(['high', 'medium', 'low']),
  actionItems: z.array(z.string()).optional(),
  data: z.record(z.any()).optional() // بيانات داعمة مرنة
});

export const insightsResponseSchema = z.object({
  insights: z.array(smartInsightSchema),
  summary: z.object({
    overallHealth: z.enum(['excellent', 'good', 'fair', 'poor']),
    keyFindings: z.array(z.string()),
    recommendedActions: z.array(z.string())
  })
});

export type SmartInsight = z.infer<typeof smartInsightSchema>;
export type InsightsResponse = z.infer<typeof insightsResponseSchema>;

// تصدير الجدول الموحد للتقييمات
export { unifiedEvaluations };
// تصدير النظام الواحد الشامل للتقييمات
export { masterEvaluations };
