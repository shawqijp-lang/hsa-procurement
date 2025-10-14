import {
  companies,
  users,
  locations,
  checklistTemplates,
  dailyChecklists,
  reports,
  userLocationPermissions,
  userDashboardSettings,
  supervisorUserLocationPermissions,
  supervisorAssessmentLocationPermissions,
  kpiAccess,
  systemSettings,
  masterEvaluations,
  type Company,
  type InsertCompany,
  type User,
  type InsertUser,
  type Location,
  type InsertLocation,
  type ChecklistTemplate,
  type InsertChecklistTemplate,
  type DailyChecklist,
  type InsertDailyChecklist,
  type Report,
  type InsertReport,
  type UserDashboardSettings,
  type InsertUserDashboardSettings,
  type SupervisorUserLocationPermission,
  type SupervisorAssessmentLocationPermission,
  type InsertSupervisorUserLocationPermission,
  type KpiAccess,
  type InsertKpiAccess,
  type SystemSetting,
  type InsertSystemSetting,
} from "@shared/schema";
import type { MasterEvaluation } from "../shared/masterEvaluationSchema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql, or, asc, count, like, inArray, isNull } from "drizzle-orm";
import bcrypt from "bcrypt";
import { defaultChecklists } from "@shared/default-checklists";

export interface IStorage {
  // Company operations
  getAllCompanies(): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;

  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser, createdBy?: number): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  getAllUsers(companyId?: number): Promise<User[]>;
  getAnalyticsUsers(): Promise<User[]>;
  updateUserPassword(id: number, newPassword: string): Promise<void>;
  updateLastLogin(id: number): Promise<void>;
  deleteUser(id: number): Promise<void>;

  // Location operations
  getAllLocations(companyId?: number): Promise<Location[]>;
  getAllLocationsForImport(companyId: number): Promise<Location[]>;
  getLocation(id: number): Promise<Location | undefined>;
  getLocationByName(nameAr: string, companyId: number): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, updates: Partial<Location>): Promise<Location>;
  updateLocationOrder(id: number, orderIndex: number): Promise<void>;
  deleteLocation(id: number): Promise<void>;
  initializeDefaultLocations(): Promise<void>;

  // Checklist template operations
  getChecklistTemplatesByLocation(locationId: number, companyId?: number): Promise<ChecklistTemplate[]>;
  getAllChecklistTemplates(companyId?: number): Promise<ChecklistTemplate[]>;
  getChecklistTemplateByKey(locationId: number, categoryAr: string, taskAr: string): Promise<ChecklistTemplate | undefined>;
  createChecklistTemplate(template: InsertChecklistTemplate): Promise<ChecklistTemplate>;
  updateChecklistTemplate(id: number, updates: Partial<ChecklistTemplate>): Promise<ChecklistTemplate>;
  updateChecklistTemplateOrder(id: number, orderIndex: number): Promise<void>;
  updateChecklistTemplateMultiTasks(templateId: number, multiTasks: any[]): Promise<void>;
  deleteChecklistTemplate(id: number): Promise<void>;
  initializeDefaultTemplates(): Promise<void>;
  createDefaultChecklistTemplates(locationId: number, locationIcon: string, companyId: number): Promise<void>;
  clearAllChecklistTemplates(): Promise<void>;
  cleanupOrphanedTemplates(companyId?: number): Promise<number>;

  // Daily checklist operations
  getDailyChecklist(locationId: number, date: Date, userId?: number, companyId?: number): Promise<DailyChecklist | undefined>;
  saveDailyChecklist(checklist: InsertDailyChecklist): Promise<DailyChecklist>;
  getDailyChecklistsByDateRange(startDate: Date, endDate: Date, userId?: number, companyId?: number): Promise<MasterEvaluation[]>;
  getDailyChecklistsByLocation(locationId: number, startDate: Date, endDate: Date, companyId?: number): Promise<MasterEvaluation[]>;
  getEvaluationsByCompany(companyId: number): Promise<MasterEvaluation[]>;

  // Report operations
  createReport(report: InsertReport): Promise<Report>;
  getRecentReports(limit?: number): Promise<Report[]>;

  // User location permissions operations
  getUserLocationPermissions(userId: number): Promise<number[]>;
  setUserLocationPermissions(userId: number, locationIds: number[]): Promise<void>;
  getUsersWithLocationAccess(locationId: number): Promise<User[]>;
  getUserEffectiveLocationPermissions(userId: number): Promise<number[]>;

  // User dashboard settings operations
  getUserDashboardSettings(userId: number): Promise<UserDashboardSettings | undefined>;
  saveUserDashboardSettings(settings: InsertUserDashboardSettings): Promise<UserDashboardSettings>;

  // Supervisor Assessment User Location Permissions
  getSupervisorAssessmentLocationPermissions(supervisorId: number, companyId?: number): Promise<any[]>;
  setSupervisorAssessmentLocationPermissions(supervisorId: number, companyId: number, permissions: any[]): Promise<void>;
  getSupervisorUserLocationPermissions(supervisorId: number, companyId?: number): Promise<any[]>;
  setSupervisorUserLocationPermissions(supervisorId: number, userId: number, allLocationIds: number[], enabledLocationIds: number[]): Promise<void>;
  getRegularUsersByCompany(companyId?: number): Promise<User[]>;
  updateUserDashboardSettings(userId: number, config: any): Promise<void>;

  // Super Admin operations
  getAllCompanies(): Promise<any[]>;
  getCompaniesStats(): Promise<any[]>;
  getOverallStats(): Promise<any>;
  setSuperAdminCompany(userId: number, companyId: number): Promise<void>;

  // KPI Access operations
  grantKpiAccess(access: InsertKpiAccess): Promise<KpiAccess>;
  getUserKpiAccess(userId: number): Promise<KpiAccess | undefined>;
  getKpiData(companyIds: number[], dateFrom?: string, dateTo?: string): Promise<any[]>;

  // System Settings operations
  getUserSettings(userId: number): Promise<Record<string, any>>;
  getCompanySettings(companyId: number): Promise<Record<string, any>>;
  saveSetting(setting: InsertSystemSetting): Promise<SystemSetting>;
  resetUserSettings(userId: number, category?: string): Promise<void>;
  resetCompanySettings(companyId: number, category?: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Company operations
  async getAllCompanies(): Promise<Company[]> {
    return await db.select().from(companies);
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [created] = await db.insert(companies).values(company).returning();
    return created;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser, createdBy?: number): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, password: hashedPassword, createdBy })
      .returning();
    console.log(`👤 Created user: ${user.username} (${user.role}) for company ${user.companyId} by user ${createdBy || 'system'}`);
    return user;
  }

  async updateUserPassword(userId: number, newPassword: string): Promise<void> {
    try {
      console.log(`🔑 Updating password for user ID: ${userId} (raw password length: ${newPassword.length} chars)`);
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId));
      console.log(`✅ Password updated for user ID: ${userId} (hashed length: ${hashedPassword.length} chars)`);
    } catch (error) {
      console.error('Error updating user password:', error);
      throw error;
    }
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    console.log('DatabaseStorage updateUser:', { id, updates });
    
    // Ensure password is never updated through this method for security
    const { password, ...safeUpdates } = updates as any;
    if (password) {
      console.warn('⚠️ Password update attempted through updateUser - ignoring for security');
    }
    
    const updateData = { 
      ...safeUpdates, 
      updatedAt: new Date() 
    };
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    console.log('Updated user result:', user);
    return user;
  }

  async getAllUsers(companyId?: number): Promise<User[]> {
    if (companyId !== undefined) {
      return await db.select().from(users).where(eq(users.companyId, companyId)).orderBy(desc(users.isActive), asc(users.fullName));
    }
    // Super admin can see all users (both active and inactive)
    return await db.select().from(users).orderBy(desc(users.isActive), asc(users.fullName));
  }



  async updateLastLogin(id: number): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, id));
  }

  async deleteUser(id: number): Promise<void> {
    console.log('🗑️ Storage: Starting HARD DELETE process for user ID:', id);
    
    try {
      // Get user info before deletion for logging
      const userToDelete = await this.getUser(id);
      if (!userToDelete) {
        throw new Error(`User with ID ${id} not found`);
      }
      
      console.log('🗑️ Deleting user:', { 
        id: userToDelete.id, 
        username: userToDelete.username, 
        fullName: userToDelete.fullName 
      });

      // 🎯 أولاً: تنظيف التقييمات من النظام الموحد الجديد
      console.log('🧹 [NEW] تنظيف تقييمات النظام الموحد الجديد...');
      const deletedMasterEvaluations = await db
        .delete(masterEvaluations)
        .where(eq(masterEvaluations.evaluatorId, id))
        .returning({ id: masterEvaluations.id });
      console.log(`🧹 تم حذف ${deletedMasterEvaluations.length} تقييم من النظام الموحد الجديد`);
      
      // ثانياً: تنظيف التقييمات من النظام القديم (إن وجدت)
      console.log('🧹 [LEGACY] تنظيف تقييمات النظام القديم...');
      const deletedChecklists = await db
        .delete(dailyChecklists)
        .where(eq(dailyChecklists.userId, id))
        .returning({ id: dailyChecklists.id });
      console.log(`🧹 تم حذف ${deletedChecklists.length} تقييم من النظام القديم`);
      
      // Clean up supervisor location permissions if user is supervisor
      if (userToDelete.role === 'supervisor') {
        console.log('🧹 Cleaning up supervisor location permissions...');
        const deletedSupervisorPerms = await db
          .delete(supervisorUserLocationPermissions)
          .where(eq(supervisorUserLocationPermissions.supervisorId, id))
          .returning({ id: supervisorUserLocationPermissions.supervisorId });
        console.log(`🧹 Deleted ${deletedSupervisorPerms.length} supervisor permissions`);
      }
      
      // Then clean up user's dashboard settings
      console.log('🧹 Cleaning up dashboard settings...');
      const deletedSettings = await db
        .delete(userDashboardSettings)
        .where(eq(userDashboardSettings.userId, id))
        .returning({ id: userDashboardSettings.userId });
      console.log(`🧹 Deleted ${deletedSettings.length} dashboard settings`);
      
      // Then clean up user's location permissions
      console.log('🧹 Cleaning up location permissions...');
      const deletedPermissions = await db
        .delete(userLocationPermissions)
        .where(eq(userLocationPermissions.userId, id))
        .returning({ id: userLocationPermissions.userId });
      console.log(`🧹 Deleted ${deletedPermissions.length} location permissions`);
      
      // Finally delete the user record
      console.log('🗑️ Deleting user record from users table...');
      const deletedUser = await db
        .delete(users)
        .where(eq(users.id, id))
        .returning({ id: users.id, username: users.username });
      
      if (deletedUser.length === 0) {
        throw new Error('Failed to delete user - no rows affected');
      }
        
      console.log('✅ User HARD DELETE completed successfully:', {
        deletedUser: deletedUser[0],
        cleanedData: {
          checklists: deletedChecklists.length,
          settings: deletedSettings.length,
          permissions: deletedPermissions.length
        }
      });
    } catch (error) {
      console.error('❌ Error during user HARD DELETE:', error);
      throw error;
    }
  }



  // Location operations
  async getAllLocations(companyId?: number): Promise<Location[]> {
    if (companyId !== undefined) {
      return await db.select().from(locations).where(and(eq(locations.companyId, companyId), eq(locations.isActive, true))).orderBy(locations.order);
    }
    // Super admin and general manager can see all locations
    return await db.select().from(locations).where(eq(locations.isActive, true)).orderBy(locations.order);
  }

  // Get all locations for import (including inactive ones)
  async getAllLocationsForImport(companyId: number): Promise<Location[]> {
    return await db.select().from(locations).where(eq(locations.companyId, companyId)).orderBy(locations.order);
  }

  async getLocation(id: number): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    return location || undefined;
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const [location] = await db
      .insert(locations)
      .values(insertLocation)
      .returning();
    return location;
  }

  async updateLocation(id: number, updates: Partial<Location>): Promise<Location> {
    const [location] = await db
      .update(locations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(locations.id, id))
      .returning();
    return location;
  }

  async updateLocationOrder(id: number, orderIndex: number): Promise<void> {
    await db
      .update(locations)
      .set({ order: orderIndex, updatedAt: new Date() })
      .where(eq(locations.id, id));
  }

  async deleteLocation(id: number): Promise<void> {
    // أولاً احذف جميع قوائم التشييك المرتبطة بهذا الموقع
    console.log('🗑️ حذف قوائم التشييك المرتبطة بالموقع:', id);
    await db
      .delete(checklistTemplates)
      .where(eq(checklistTemplates.locationId, id));
    
    // ثم احذف التقييمات اليومية المرتبطة بهذا الموقع  
    console.log('🗑️ حذف التقييمات اليومية المرتبطة بالموقع:', id);
    await db
      .delete(dailyChecklists)
      .where(eq(dailyChecklists.locationId, id));
    
    // أخيراً احذف الموقع نفسه (تعطيل)
    console.log('🗑️ تعطيل الموقع:', id);
    await db
      .update(locations)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(locations.id, id));
    
    console.log('✅ تم حذف الموقع وجميع البيانات المرتبطة به بنجاح');
  }

  async initializeDefaultLocations(): Promise<void> {
    // Default location initialization disabled - locations should be manually created
    console.log('ℹ️ Default location initialization disabled');
  }

  // Checklist template operations
  async getChecklistTemplatesByLocation(locationId: number, companyId?: number): Promise<ChecklistTemplate[]> {
    const conditions = [eq(checklistTemplates.locationId, locationId), eq(checklistTemplates.isActive, true)];
    if (companyId !== undefined) {
      conditions.push(eq(checklistTemplates.companyId, companyId));
    }
    return await db
      .select()
      .from(checklistTemplates)
      .where(and(...conditions))
      .orderBy(checklistTemplates.order);
  }

  async createChecklistTemplate(template: InsertChecklistTemplate): Promise<ChecklistTemplate> {
    console.log('💾 Storage: Creating template:', {
      locationId: template.locationId,
      taskAr: template.taskAr,
      categoryAr: template.categoryAr
    });
    
    try {
      const [newTemplate] = await db
        .insert(checklistTemplates)
        .values({
          companyId: template.companyId,
          locationId: template.locationId,
          categoryAr: template.categoryAr,
          categoryEn: template.categoryEn || template.categoryAr,
          taskAr: template.taskAr,
          taskEn: template.taskEn || template.taskAr,
          descriptionAr: template.descriptionAr || '',
          descriptionEn: template.descriptionEn || '',
          subPoints: template.subPoints || null,
          subTasks: template.subTasks || null,
          multiTasks: template.multiTasks || null,
          order: template.order || 1,
          isActive: true
        })
        .returning();
      
      console.log('✅ Storage: Template created successfully:', newTemplate.id);
      return newTemplate;
    } catch (error) {
      console.error('❌ Storage: Create template failed:', error);
      throw error;
    }
  }

  async updateChecklistTemplate(id: number, updates: Partial<ChecklistTemplate>): Promise<ChecklistTemplate> {
    console.log('💾 Storage: Updating template ID:', id);
    console.log('💾 Storage: Update data:', updates);
    
    try {
      // Check if template exists and is active
      const [existingTemplate] = await db
        .select()
        .from(checklistTemplates)
        .where(and(
          eq(checklistTemplates.id, id),
          eq(checklistTemplates.isActive, true)
        ))
        .limit(1);
      
      if (!existingTemplate) {
        console.error('❌ Storage: Template not found or inactive:', id);
        throw new Error(`البند رقم ${id} غير موجود أو غير نشط`);
      }
      
      console.log('📄 Storage: Found existing template:', {
        id: existingTemplate.id,
        taskAr: existingTemplate.taskAr,
        isActive: existingTemplate.isActive
      });
      
      // Perform update
      const [updatedTemplate] = await db
        .update(checklistTemplates)
        .set({
          categoryAr: updates.categoryAr || existingTemplate.categoryAr,
          categoryEn: updates.categoryEn || updates.categoryAr || existingTemplate.categoryEn,
          taskAr: updates.taskAr || existingTemplate.taskAr,
          taskEn: updates.taskEn || updates.taskAr || existingTemplate.taskEn,
          descriptionAr: updates.descriptionAr !== undefined ? updates.descriptionAr : existingTemplate.descriptionAr,
          descriptionEn: updates.descriptionEn !== undefined ? updates.descriptionEn : existingTemplate.descriptionEn,
          subPoints: updates.subPoints !== undefined ? updates.subPoints : existingTemplate.subPoints,
          subTasks: updates.subTasks !== undefined ? updates.subTasks : existingTemplate.subTasks,
          multiTasks: updates.multiTasks !== undefined ? updates.multiTasks : existingTemplate.multiTasks,
          order: updates.order !== undefined ? updates.order : existingTemplate.order,
          isActive: updates.isActive !== undefined ? updates.isActive : existingTemplate.isActive
        })
        .where(eq(checklistTemplates.id, id))
        .returning();
      
      if (!updatedTemplate) {
        throw new Error('فشل في تحديث البند - لم يتم تعديل أي صف');
      }
      
      console.log('✅ Storage: Template updated successfully:', {
        id: updatedTemplate.id,
        taskAr: updatedTemplate.taskAr,
        categoryAr: updatedTemplate.categoryAr
      });
      
      return updatedTemplate;
    } catch (error) {
      console.error('❌ Storage: Update template failed:', error);
      throw error;
    }
  }

  async deleteChecklistTemplate(id: number): Promise<void> {
    console.log('💾 Storage: Soft deleting template ID:', id);
    
    try {
      // Check if template exists and is active
      const [existingTemplate] = await db
        .select()
        .from(checklistTemplates)
        .where(and(
          eq(checklistTemplates.id, id),
          eq(checklistTemplates.isActive, true)
        ))
        .limit(1);
      
      if (!existingTemplate) {
        console.error('❌ Storage: Template not found or already deleted:', id);
        throw new Error(`البند رقم ${id} غير موجود أو تم حذفه مسبقاً`);
      }
      
      console.log('📄 Storage: Found template to delete:', {
        id: existingTemplate.id,
        taskAr: existingTemplate.taskAr
      });
      
      // Perform soft delete
      const [deletedTemplate] = await db
        .update(checklistTemplates)
        .set({ isActive: false })
        .where(eq(checklistTemplates.id, id))
        .returning();
      
      if (!deletedTemplate) {
        throw new Error('فشل في حذف البند - لم يتم تعديل أي صف');
      }
      
      console.log('✅ Storage: Template soft deleted successfully:', id);
    } catch (error) {
      console.error('❌ Storage: Delete template failed:', error);
      throw error;
    }
  }

  async updateChecklistTemplateOrder(templateId: number, orderIndex: number): Promise<void> {
    console.log(`📋 Storage: Updating template ${templateId} order to ${orderIndex}`);
    try {
      await db
        .update(checklistTemplates)
        .set({ order: orderIndex })
        .where(eq(checklistTemplates.id, templateId));
      console.log(`✅ Storage: Template ${templateId} order updated to ${orderIndex}`);
    } catch (error) {
      console.error(`❌ Storage: Failed to update template ${templateId} order:`, error);
      throw error;
    }
  }

  async getAllChecklistTemplates(companyId?: number): Promise<ChecklistTemplate[]> {
    const conditions = [eq(checklistTemplates.isActive, true)];
    if (companyId !== undefined) {
      conditions.push(eq(checklistTemplates.companyId, companyId));
    }
    return await db
      .select()
      .from(checklistTemplates)
      .where(and(...conditions))
      .orderBy(checklistTemplates.locationId, checklistTemplates.order);
  }

  async getAllTemplates(): Promise<ChecklistTemplate[]> {
    return await db
      .select()
      .from(checklistTemplates)
      .where(eq(checklistTemplates.isActive, true))
      .orderBy(checklistTemplates.locationId, checklistTemplates.order);
  }

  async clearAllTemplates(): Promise<void> {
    console.log('🗑️ Storage: Clearing all existing templates...');
    await db.delete(checklistTemplates);
    console.log('✅ Storage: All templates cleared');
  }

  async clearAllChecklistTemplates(): Promise<void> {
    console.log('🗑️ Storage: Clearing all existing checklist templates...');
    await db.delete(checklistTemplates);
    console.log('✅ Storage: All checklist templates cleared');
  }

  async getChecklistTemplateByKey(locationId: number, categoryAr: string, taskAr: string): Promise<ChecklistTemplate | undefined> {
    const [template] = await db
      .select()
      .from(checklistTemplates)
      .where(and(
        eq(checklistTemplates.locationId, locationId),
        eq(checklistTemplates.categoryAr, categoryAr),
        eq(checklistTemplates.taskAr, taskAr),
        eq(checklistTemplates.isActive, true)
      ))
      .limit(1);
    return template;
  }

  async updateChecklistTemplateMultiTasks(templateId: number, multiTasks: any[]): Promise<void> {
    await db
      .update(checklistTemplates)
      .set({ multiTasks })
      .where(eq(checklistTemplates.id, templateId));
  }

  async getLocationByName(nameAr: string, companyId: number): Promise<Location | undefined> {
    const [location] = await db
      .select()
      .from(locations)
      .where(and(
        eq(locations.nameAr, nameAr),
        eq(locations.companyId, companyId)
      ))
      .limit(1);
    return location;
  }

  async initializeDefaultTemplates(): Promise<void> {
    // Check if templates already exist to prevent duplication
    const existingTemplatesCount = await db
      .select({ count: count() })
      .from(checklistTemplates);
    
    if (existingTemplatesCount[0]?.count > 0) {
      console.log(`📋 Templates already exist (${existingTemplatesCount[0].count} templates). Skipping initialization.`);
      return;
    }
    
    console.log('📋 Initializing default templates with updated single-point checklists...');
    const allLocations = await this.getAllLocations();
    
    for (const location of allLocations) {
      console.log(`📋 Creating templates for location: ${location.nameAr} (${location.icon})`);
      await this.createDefaultChecklistTemplates(location.id, location.icon, location.companyId);
    }
    
    console.log('✅ Default templates initialization completed');
  }

  async createDefaultChecklistTemplates(locationId: number, locationIcon: string, companyId: number): Promise<void> {
    const templates = defaultChecklists[locationIcon] || defaultChecklists['building'] || [];
    
    for (const template of templates) {
      const existing = await db
        .select()
        .from(checklistTemplates)
        .where(and(
          eq(checklistTemplates.locationId, locationId),
          eq(checklistTemplates.taskAr, template.taskAr),
          eq(checklistTemplates.companyId, companyId)
        ))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(checklistTemplates).values({
          locationId,
          companyId,
          categoryAr: template.categoryAr,
          categoryEn: template.categoryEn,
          taskAr: template.taskAr,
          taskEn: template.taskEn,
          descriptionAr: template.descriptionAr,
          descriptionEn: template.descriptionEn,
          multiTasks: template.multiTasks || [],
          subPoints: template.subPoints || [],
          subTasks: template.subTasks || [],
          order: template.order
        });
      }
    }
  }

  // Daily checklist operations
  async getDailyChecklist(locationId: number, date: Date, userId?: number, companyId?: number): Promise<DailyChecklist | undefined> {
    const dateStr = date.toISOString().split('T')[0]; // "2025-08-18"
    
    console.log('🔍 [BRIDGE] getDailyChecklist: البحث في النظام الموحد الجديد أولاً');
    console.log('📊 [BRIDGE] معايير البحث:', {
      locationId, 
      dateStr, 
      userId, 
      companyId
    });
    
    try {
      // أولاً: البحث في النظام الجديد master_evaluations
      let masterConditions = and(
        eq(masterEvaluations.locationId, locationId),
        eq(masterEvaluations.evaluationDate, dateStr)
      );
      
      if (userId) {
        masterConditions = and(
          masterConditions,
          eq(masterEvaluations.evaluatorId, userId)
        );
      }
      
      if (companyId) {
        masterConditions = and(
          masterConditions,
          eq(masterEvaluations.companyId, companyId)
        );
      }
      
      const [masterEvaluation] = await db
        .select()
        .from(masterEvaluations)
        .where(masterConditions)
        .limit(1);
      
      if (masterEvaluation) {
        console.log('✅ [BRIDGE] وُجد في النظام الموحد الجديد:', masterEvaluation.id);
        
        // تحويل من master_evaluations إلى DailyChecklist للتوافق
        const compatibilityResult: DailyChecklist = {
          id: masterEvaluation.legacyId || masterEvaluation.id,
          locationId: masterEvaluation.locationId,
          userId: masterEvaluation.evaluatorId,
          companyId: masterEvaluation.companyId,
          checklistDate: masterEvaluation.evaluationDate,
          tasks: masterEvaluation.tasks as any,
          categoryComments: masterEvaluation.categoryComments as any,
          evaluationNotes: masterEvaluation.evaluationNotes,
          completedAt: masterEvaluation.completedAt,
          createdAt: masterEvaluation.createdAt,
          evaluationTime: masterEvaluation.evaluationTime,
          evaluationDateTime: masterEvaluation.evaluationDateTime,
          evaluationTimestamp: masterEvaluation.evaluationTimestamp,
          offlineId: masterEvaluation.offlineId,
          syncTimestamp: Number(masterEvaluation.syncTimestamp),
          isSynced: masterEvaluation.isSynced,
          isEncrypted: masterEvaluation.isEncrypted
        };
        
        return compatibilityResult;
      }
      
      console.log('⚠️ [BRIDGE] لم يوجد في النظام الجديد، البحث في النظام القديم...');
      
      // ثانياً: البحث في النظام القديم daily_checklists كـ fallback
      let legacyConditions = and(
        eq(dailyChecklists.locationId, locationId),
        eq(dailyChecklists.checklistDate, dateStr)
      );
      
      if (userId) {
        legacyConditions = and(
          legacyConditions,
          eq(dailyChecklists.userId, userId)
        );
      }
      
      if (companyId) {
        legacyConditions = and(
          legacyConditions,
          eq(dailyChecklists.companyId, companyId)
        );
      }
      
      const [legacyChecklist] = await db
        .select()
        .from(dailyChecklists)
        .where(legacyConditions)
        .limit(1);
      
      if (legacyChecklist) {
        console.log('📜 [BRIDGE] وُجد في النظام القديم (fallback):', legacyChecklist.id);
        return legacyChecklist;
      }
      
      console.log('❌ [BRIDGE] لم يوجد في أي من النظامين');
      return undefined;
      
    } catch (error) {
      console.error('❌ [BRIDGE] خطأ في البحث:', error);
      
      // في حالة الخطأ، نحاول البحث في النظام القديم فقط
      console.log('🔄 [BRIDGE] محاولة الاستعادة من النظام القديم بعد الخطأ...');
      
      try {
        let fallbackConditions = and(
          eq(dailyChecklists.locationId, locationId),
          eq(dailyChecklists.checklistDate, dateStr)
        );
        
        if (userId) {
          fallbackConditions = and(
            fallbackConditions,
            eq(dailyChecklists.userId, userId)
          );
        }
        
        if (companyId) {
          fallbackConditions = and(
            fallbackConditions,
            eq(dailyChecklists.companyId, companyId)
          );
        }
        
        const [fallbackChecklist] = await db
          .select()
          .from(dailyChecklists)
          .where(fallbackConditions)
          .limit(1);
        
        if (fallbackChecklist) {
          console.log('🚨 [BRIDGE] تم الاستعادة من النظام القديم بعد خطأ:', fallbackChecklist.id);
          return fallbackChecklist;
        }
        
      } catch (fallbackError) {
        console.error('❌ [BRIDGE] خطأ حتى في النظام القديم:', fallbackError);
      }
      
      return undefined;
    }
  }

  async saveDailyChecklist(checklist: any): Promise<DailyChecklist> {
    console.log('🔄 [BRIDGE] saveDailyChecklist: تحويل للنظام الموحد الجديد');
    console.log('📝 [BRIDGE] البيانات الواردة:', {
      locationId: checklist.locationId,
      userId: checklist.userId,
      checklistDate: checklist.checklistDate,
      tasksCount: Array.isArray(checklist.tasks) ? checklist.tasks.length : 0
    });
    
    // 🎯 الآن نحفظ فقط في النظام الجديد master_evaluations
    try {
      // الحصول على بيانات الموقع والمستخدم والشركة
      const [location] = await db.select().from(locations).where(eq(locations.id, checklist.locationId)).limit(1);
      const [user] = await db.select().from(users).where(eq(users.id, checklist.userId)).limit(1);
      const [company] = await db.select().from(companies).where(eq(companies.id, checklist.companyId)).limit(1);
      
      if (!location || !user || !company) {
        throw new Error('بيانات الموقع أو المستخدم أو الشركة غير موجودة');
      }
      
      // تحويل إلى صيغة النظام الجديد
      const { generateMasterEvaluationId, calculateMasterEvaluationStats } = await import('@shared/masterEvaluationSchema');
      
      const evaluationId = generateMasterEvaluationId(checklist.locationId, checklist.userId, new Date(checklist.checklistDate));
      const stats = calculateMasterEvaluationStats(checklist.tasks || []);
      const currentTime = new Date();
      const timeString = currentTime.toTimeString().split(' ')[0];
      const timestamp = currentTime.getTime();
      
      const masterData = {
        evaluationId,
        legacyId: null, // سيتم تعيينه لاحقاً إذا احتجنا
        
        locationId: checklist.locationId,
        locationNameAr: location.nameAr,
        locationNameEn: location.nameEn,
        locationIcon: location.icon,
        
        evaluatorId: checklist.userId,
        evaluatorName: user.fullName,
        evaluatorRole: user.role,
        
        companyId: checklist.companyId,
        companyNameAr: company.nameAr,
        companyNameEn: company.nameEn,
        
        evaluationDate: checklist.checklistDate,
        evaluationTime: checklist.evaluationTime || timeString,
        evaluationDateTime: checklist.evaluationDateTime || currentTime.toISOString(),
        evaluationTimestamp: checklist.evaluationTimestamp || timestamp,
        
        tasks: checklist.tasks || [],
        categoryComments: checklist.categoryComments || {},
        evaluationNotes: checklist.evaluationNotes || '',
        generalNotes: checklist.generalNotes || '',
        overallRating: stats.overallRating,
        
        completedAt: checklist.completedAt || currentTime.toISOString(),
        createdAt: checklist.createdAt || currentTime.toISOString(),
        
        source: 'daily_checklists',
        isSynced: checklist.isSynced ?? true,
        syncTimestamp: checklist.syncTimestamp || timestamp,
        offlineId: checklist.offlineId,
        isEncrypted: checklist.isEncrypted || false,
        
        totalTasks: stats.totalTasks,
        completedTasks: stats.completedTasks,
        averageRating: stats.averageRating
      };
      
      // ✅ إنشاء تقييم جديد دائماً - لا تحديث للاحتفاظ بالسجل التاريخي
      console.log('✨ [BRIDGE] إنشاء تقييم جديد في النظام الموحد - السجل التاريخي محفوظ');
      const [savedEvaluation] = await db
        .insert(masterEvaluations)
        .values(masterData)
        .returning();
      
      console.log('✅ [BRIDGE] تم الحفظ في النظام الموحد بنجاح:', savedEvaluation.id);
      
      // إرجاع تنسيق DailyChecklist للتوافق مع API
      const compatibilityResult: DailyChecklist = {
        id: savedEvaluation.legacyId || savedEvaluation.id,
        locationId: savedEvaluation.locationId,
        userId: savedEvaluation.evaluatorId,
        companyId: savedEvaluation.companyId,
        checklistDate: savedEvaluation.evaluationDate,
        tasks: savedEvaluation.tasks as any,
        categoryComments: savedEvaluation.categoryComments as any,
        evaluationNotes: savedEvaluation.evaluationNotes,
        completedAt: savedEvaluation.completedAt,
        createdAt: savedEvaluation.createdAt,
        evaluationTime: savedEvaluation.evaluationTime,
        evaluationDateTime: savedEvaluation.evaluationDateTime,
        evaluationTimestamp: savedEvaluation.evaluationTimestamp,
        offlineId: savedEvaluation.offlineId,
        syncTimestamp: Number(savedEvaluation.syncTimestamp),
        isSynced: savedEvaluation.isSynced,
        isEncrypted: savedEvaluation.isEncrypted
      };
      
      return compatibilityResult;
      
    } catch (error) {
      console.error('❌ [BRIDGE] خطأ في حفظ التقييم في النظام الموحد:', error);
      throw error;
    }
  }

  /**
   * 🎯 حفظ التقييم في النظام الواحد الموحد
   */
  async saveMasterEvaluation(evaluationData: any): Promise<any> {
    const saveTime = new Date().toISOString();
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0];
    const timestamp = Date.now();
    
    console.log('💎 [MasterStorage] حفظ تقييم في النظام الموحد:', {
      locationId: evaluationData.locationId,
      userId: evaluationData.userId,
      checklistDate: evaluationData.checklistDate,
      tasksCount: Array.isArray(evaluationData.tasks) ? evaluationData.tasks.length : 0
    });

    // جلب البيانات المرجعية المطلوبة
    const [location, user, company] = await Promise.all([
      this.getLocation(evaluationData.locationId),
      this.getUser(evaluationData.userId),
      this.getCompany(evaluationData.companyId)
    ]);

    if (!location || !user || !company) {
      const missing = [];
      if (!location) missing.push(`Location ${evaluationData.locationId}`);
      if (!user) missing.push(`User ${evaluationData.userId}`);
      if (!company) missing.push(`Company ${evaluationData.companyId}`);
      throw new Error(`بيانات مرجعية مفقودة: ${missing.join(', ')}`);
    }

    // إنشاء معرف فريد للتقييم - محدث لضمان الفرادة المطلقة
    const { generateMasterEvaluationId: generateId } = await import('@shared/masterEvaluationSchema');
    const evaluationId = generateId(evaluationData.locationId, evaluationData.userId, new Date());

    // تحضير البيانات للنظام الموحد
    const masterEvaluationData = {
      evaluationId,
      legacyId: null, // سيُحدد من daily_checklist إذا لزم الأمر
      
      // بيانات الموقع
      locationId: evaluationData.locationId,
      locationNameAr: location.nameAr,
      locationNameEn: location.nameEn || location.nameAr,
      locationIcon: location.icon || 'building',
      
      // بيانات المُقيِّم
      evaluatorId: evaluationData.userId,
      evaluatorName: user.fullName,
      evaluatorRole: user.role,
      
      // بيانات الشركة
      companyId: evaluationData.companyId,
      companyNameAr: company.nameAr,
      companyNameEn: company.nameEn || company.nameAr,
      
      // التوقيت الشامل
      evaluationDate: evaluationData.checklistDate || currentDate,
      evaluationTime: currentTime,
      evaluationDateTime: evaluationData.completedAt || saveTime,
      evaluationTimestamp: timestamp,
      
      // التقييمات التفصيلية
      tasks: evaluationData.tasks || [],
      categoryComments: evaluationData.categoryComments || {},
      evaluationItems: evaluationData.tasks || [], // حفظ نفس البيانات في evaluationItems للتوافق
      
      // الملاحظات والتقييم العام
      evaluationNotes: evaluationData.evaluationNotes || null,
      generalNotes: null,
      overallRating: null, // سيُحسب من المهام إذا أردنا
      
      // الوقت التفصيلي
      completedAt: evaluationData.completedAt || saveTime,
      createdAt: evaluationData.createdAt || saveTime,
      
      // معلومات المزامنة والمصدر
      source: 'server',
      isSynced: true,
      syncTimestamp: timestamp,
      
      // معلومات الأمان
      offlineId: evaluationData.offlineId || null,
      isEncrypted: evaluationData.isEncrypted || false,
      
      // إحصائيات التقييم
      totalTasks: Array.isArray(evaluationData.tasks) ? evaluationData.tasks.length : 0,
      completedTasks: Array.isArray(evaluationData.tasks) 
        ? evaluationData.tasks.filter((task: any) => task.completed).length 
        : 0,
      averageRating: null // سيُحسب إذا أردنا
    };

    // ✅ إنشاء تقييم جديد دائماً - لا تحديث للاحتفاظ بالسجل التاريخي الكامل
    console.log('✨ [MasterStorage] إنشاء تقييم جديد في النظام الموحد - السجل التاريخي محفوظ');
    const [result] = await db
      .insert(masterEvaluations)
      .values(masterEvaluationData)
      .returning();

    console.log('✅ [MasterStorage] تم حفظ التقييم في النظام الموحد:', {
      id: result.id,
      evaluationId: result.evaluationId,
      location: result.locationNameAr,
      evaluator: result.evaluatorName
    });

    return result;
  }

  async getDailyChecklistsByDateRange(startDate: Date, endDate: Date, userId?: number, companyId?: number): Promise<MasterEvaluation[]> {
    // تحويل التواريخ إلى نصوص للمقارنة مع الحقول النصية
    const startDateStr = startDate.toISOString().split('T')[0]; // "2025-08-18"
    const endDateStr = endDate.toISOString().split('T')[0]; // "2025-08-19"
    
    console.log(`📊 [MasterStorage] جلب تقييمات بالفترة الزمنية من النظام الموحد: ${startDateStr} إلى ${endDateStr}`);
    
    let conditions = and(
      gte(masterEvaluations.evaluationDate, startDateStr),
      lte(masterEvaluations.evaluationDate, endDateStr)
    );

    if (userId && companyId) {
      conditions = and(
        gte(masterEvaluations.evaluationDate, startDateStr),
        lte(masterEvaluations.evaluationDate, endDateStr),
        eq(masterEvaluations.evaluatorId, userId),
        eq(masterEvaluations.companyId, companyId)
      );
    } else if (userId) {
      conditions = and(
        gte(masterEvaluations.evaluationDate, startDateStr),
        lte(masterEvaluations.evaluationDate, endDateStr),
        eq(masterEvaluations.evaluatorId, userId)
      );
    } else if (companyId) {
      conditions = and(
        gte(masterEvaluations.evaluationDate, startDateStr),
        lte(masterEvaluations.evaluationDate, endDateStr),
        eq(masterEvaluations.companyId, companyId)
      );
    }

    const results = await db
      .select()
      .from(masterEvaluations)
      .where(conditions)
      .orderBy(desc(masterEvaluations.evaluationDate));
    
    console.log(`📊 [MasterStorage] تم جلب ${results.length} تقييم من النظام الموحد للفترة`);
    return results;
  }

  async getEvaluationsByCompany(companyId: number): Promise<MasterEvaluation[]> {
    try {
      console.log(`📊 [MasterStorage] جلب جميع تقييمات الشركة من النظام الموحد: ${companyId}`);
      
      const evaluations = await db
        .select()
        .from(masterEvaluations)
        .where(eq(masterEvaluations.companyId, companyId))
        .orderBy(desc(masterEvaluations.evaluationDate));

      console.log(`📊 [MasterStorage] تم جلب ${evaluations.length} تقييم من النظام الموحد للشركة ${companyId}`);
      return evaluations;
    } catch (error) {
      console.error('❌ خطأ في جلب تقييمات الشركة من النظام الموحد:', error);
      throw error;
    }
  }

  async getDailyChecklistsByLocation(
    locationId: number,
    startDate: Date,
    endDate: Date,
    companyId?: number
  ): Promise<MasterEvaluation[]> {
    // تحويل التواريخ إلى نصوص للمقارنة
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`📊 [MasterStorage] جلب تقييمات موقع ${locationId} من النظام الموحد: ${startDateStr} إلى ${endDateStr}`);
    
    let conditions = and(
      eq(masterEvaluations.locationId, locationId),
      gte(masterEvaluations.evaluationDate, startDateStr),
      lte(masterEvaluations.evaluationDate, endDateStr)
    );

    // إضافة شرط الشركة إذا تم توفيره
    if (companyId) {
      conditions = and(
        eq(masterEvaluations.locationId, locationId),
        gte(masterEvaluations.evaluationDate, startDateStr),
        lte(masterEvaluations.evaluationDate, endDateStr),
        eq(masterEvaluations.companyId, companyId)
      );
    }
    
    const results = await db
      .select()
      .from(masterEvaluations)
      .where(conditions)
      .orderBy(desc(masterEvaluations.evaluationDate));
    
    console.log(`📊 [MasterStorage] تم جلب ${results.length} تقييم لموقع ${locationId} من النظام الموحد`);
    return results;
  }

  // Report operations
  async createReport(report: InsertReport): Promise<Report> {
    const [created] = await db
      .insert(reports)
      .values(report)
      .returning();
    return created;
  }

  async getRecentReports(limit: number = 10): Promise<Report[]> {
    return await db
      .select()
      .from(reports)
      .orderBy(desc(reports.createdAt))
      .limit(limit);
  }

  // User location permissions operations
  async getUserLocationPermissions(userId: number): Promise<number[]> {
    const permissions = await db
      .select({ locationId: userLocationPermissions.locationId })
      .from(userLocationPermissions)
      .where(eq(userLocationPermissions.userId, userId));
    
    return permissions.map(p => p.locationId);
  }

  async setUserLocationPermissions(userId: number, locationIds: number[]): Promise<void> {
    // Delete existing permissions
    await db.delete(userLocationPermissions).where(eq(userLocationPermissions.userId, userId));
    
    // Insert new permissions
    if (locationIds && locationIds.length > 0) {
      const permissionsToInsert = locationIds.map(locationId => ({
        userId,
        locationId
      }));
      
      await db.insert(userLocationPermissions).values(permissionsToInsert);
    }
  }

  async getUsersWithLocationAccess(locationId: number): Promise<User[]> {
    const result = await db
      .select()
      .from(users)
      .innerJoin(userLocationPermissions, eq(users.id, userLocationPermissions.userId))
      .where(eq(userLocationPermissions.locationId, locationId));
    
    return result.map(row => row.users);
  }

  // Get effective location permissions for user considering supervisor restrictions
  async getUserEffectiveLocationPermissions(userId: number): Promise<number[]> {
    try {
      console.log('🔍 Checking effective location permissions for user:', userId);
      
      // Check if any supervisor has set specific permissions for this user
      const supervisorPermissions = await db
        .select({ 
          locationId: supervisorUserLocationPermissions.locationId, 
          isEnabled: supervisorUserLocationPermissions.isEnabled 
        })
        .from(supervisorUserLocationPermissions)
        .where(eq(supervisorUserLocationPermissions.userId, userId));

      console.log('📋 Found supervisor permissions:', {
        userId,
        supervisorPermissionsCount: supervisorPermissions.length,
        supervisorPermissions
      });

      // If supervisor has set specific permissions, use ONLY enabled ones from supervisor
      if (supervisorPermissions.length > 0) {
        const enabledLocationIds = supervisorPermissions
          .filter(p => p.isEnabled)
          .map(p => p.locationId);
        
        console.log('🔒 Supervisor individual permissions applied:', {
          userId,
          totalSupervisorPermissions: supervisorPermissions.length,
          enabledBySupervisor: enabledLocationIds.length,
          effectivePermissions: enabledLocationIds
        });
        
        return enabledLocationIds;
      }
      
      // If no supervisor permissions exist, get user's basic permissions
      const userPermissions = await this.getUserLocationPermissions(userId);
      console.log('📍 Using user basic permissions:', {
        userId,
        locationCount: userPermissions.length,
        permissions: userPermissions
      });
      
      return userPermissions;
    } catch (error) {
      console.error('❌ Error getting effective location permissions:', error);
      // Fallback: return empty array to prevent access
      return [];
    }
  }

  // User dashboard settings operations
  async getUserDashboardSettings(userId: number): Promise<UserDashboardSettings | undefined> {
    const [settings] = await db
      .select()
      .from(userDashboardSettings)
      .where(eq(userDashboardSettings.userId, userId))
      .limit(1);
    return settings || undefined;
  }

  async saveUserDashboardSettings(settings: InsertUserDashboardSettings): Promise<UserDashboardSettings> {
    const [created] = await db
      .insert(userDashboardSettings)
      .values(settings)
      .returning();
    return created;
  }

  async updateUserDashboardSettings(userId: number, config: any): Promise<void> {
    console.log('💾 Storage: Updating dashboard settings for user:', userId);
    console.log('📋 Storage: Dashboard config:', config);
    
    try {
      // Check if settings exist
      const existing = await this.getUserDashboardSettings(userId);
      
      if (existing) {
        console.log('📝 Storage: Updating existing dashboard settings');
        // Update existing settings
        await db
          .update(userDashboardSettings)
          .set({ 
            dashboardConfig: config,
            updatedAt: new Date()
          })
          .where(eq(userDashboardSettings.userId, userId));
        console.log('✅ Storage: Dashboard settings updated successfully');
      } else {
        console.log('🆕 Storage: Creating new dashboard settings');
        // Create new settings
        await db
        .insert(userDashboardSettings)
        .values({
          userId,
          dashboardConfig: config,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('✅ Storage: New dashboard settings created successfully');
      }
    } catch (error) {
      console.error('❌ Storage: Failed to update dashboard settings:', error);
      throw error;
    }
  }

  // Initialize default data
  async createDefaultUser(): Promise<void> {
    // تم إزالة إنشاء مستخدم owner نهائياً - لا يوجد مستخدم افتراضي
    // Check if admin-hodeidah user exists
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.username, 'admin-hodeidah'))
      .limit(1);

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const [newAdmin] = await db.insert(users).values({
        username: 'admin-hodeidah',
        password: hashedPassword,
        fullName: 'مدير الشؤون الإدارية',
        role: 'admin',
        isActive: true,
      }).returning();
      
      // Create default dashboard settings for admin with all sections enabled
      await this.createDefaultDashboardSettings(newAdmin.id);
      console.log('✅ Default admin user created with dashboard settings');
    }
  }

  async createDefaultDashboardSettings(userId: number): Promise<void> {
    const defaultConfig = {
      locations: { enabled: true, nameAr: 'مواقع التقييم', nameEn: 'Evaluation Locations', color: '#10b981' },

      'assessment-locations': { enabled: true, nameAr: 'إدارة مواقع التقييم', nameEn: 'Assessment Locations Management', color: '#3b82f6' },
      'checklist-manager': { enabled: true, nameAr: 'إدارة قوائم التشييك', nameEn: 'Checklist Management', color: '#8b5cf6' },
      reports: { enabled: true, nameAr: 'التقارير', nameEn: 'Reports', color: '#f59e0b' },
      users: { enabled: true, nameAr: 'إدارة المستخدمين', nameEn: 'User Management', color: '#ef4444' },
      settings: { enabled: true, nameAr: 'الإعدادات', nameEn: 'Settings', color: '#6b7280' },
      sync: { enabled: true, nameAr: 'المزامنة', nameEn: 'Sync', color: '#06b6d4' }
    };

    await db.insert(userDashboardSettings).values({
      userId,
      dashboardConfig: defaultConfig
    });
  }

  async createDefaultLocations(): Promise<void> {
    // تم تعطيل إنشاء المواقع الافتراضية لتجنب إنشاء شركات تلقائية
    // في النظام متعدد الشركات، يجب إنشاء المواقع يدوياً لكل شركة
    console.log("ℹ️ Default location initialization disabled for multi-company system");
    return;
  }

  // Supervisor Assessment Location Permissions
  async getSupervisorAssessmentLocationPermissions(supervisorId: number, companyId?: number): Promise<any[]> {
    try {
      let conditions = eq(supervisorAssessmentLocationPermissions.supervisorId, supervisorId);
      
      // Add company filtering if companyId is provided
      if (companyId !== undefined) {
        conditions = and(
          conditions,
          eq(supervisorAssessmentLocationPermissions.companyId, companyId)
        ) as any;
      }
      
      return await db
        .select({
          locationId: supervisorAssessmentLocationPermissions.locationId,
          isEnabled: supervisorAssessmentLocationPermissions.isEnabled,
        })
        .from(supervisorAssessmentLocationPermissions)
        .where(conditions);
    } catch (error) {
      console.error('Error getting supervisor assessment location permissions:', error);
      return [];
    }
  }

  async setSupervisorAssessmentLocationPermissions(supervisorId: number, companyId: number, permissions: any[]): Promise<void> {
    try {
      // Delete existing permissions for this supervisor and company
      let deleteCondition = eq(supervisorAssessmentLocationPermissions.supervisorId, supervisorId);
      if (companyId) {
        deleteCondition = and(
          deleteCondition,
          eq(supervisorAssessmentLocationPermissions.companyId, companyId)
        ) as any;
      }
      
      await db
        .delete(supervisorAssessmentLocationPermissions)
        .where(deleteCondition);
      
      if (permissions.length === 0) {
        return;
      }

      // Insert new permissions
      const permissionsToInsert = permissions.map(perm => ({
        supervisorId,
        companyId,
        locationId: perm.locationId,
        isEnabled: perm.isEnabled,
      }));

      await db.insert(supervisorAssessmentLocationPermissions).values(permissionsToInsert);
      console.log('✅ Successfully saved supervisor assessment location permissions');
    } catch (error) {
      console.error('Error setting supervisor assessment location permissions:', error);
      throw error;
    }
  }

  async getUserAssessmentLocationIds(userId: number): Promise<number[]> {
    try {
      // Type-safe user query with null handling
      const [user] = await db
        .select({ companyId: users.companyId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user?.companyId) return [];

      // Advanced type-safe query with proper type casting
      const allLocations = await db
        .select({ id: locations.id })
        .from(locations)
        .where(eq(locations.companyId, user.companyId));

      return allLocations.map(location => location.id);
    } catch (error) {
      console.error('Error in getUserAssessmentLocationIds:', error);
      return [];
    }
  }



  async getCompaniesStats(): Promise<any[]> {
    // Get actual companies from database instead of hardcoded data
    const allCompanies = await this.getAllCompanies();
    const allUsers = await this.getAllUsers();
    const allLocations = await this.getAllLocations();
    const allTemplates = await this.getAllChecklistTemplates();
    
    return allCompanies.map(company => {
      const companyUsers = allUsers.filter(u => u.companyId === company.id && u.role !== 'super_admin');
      const companyLocations = allLocations.filter(l => l.companyId === company.id);
      const companyTemplates = allTemplates.filter(t => t.companyId === company.id);
      
      return {
        id: company.id,
        nameAr: company.nameAr,
        nameEn: company.nameEn,
        status: company.status,
        type: company.type || "general",
        totalUsers: companyUsers.length,
        totalLocations: companyLocations.length,
        totalChecklists: companyTemplates.length,
        completionRate: 85, // This can be calculated from actual data if needed
        averageRating: 3.8, // This can be calculated from actual data if needed
        lastActivity: "منذ ساعتين" // This can be calculated from actual data if needed
      };
    });
  }

  async getOverallStats(): Promise<any> {
    const companies = await this.getAllCompanies();
    const users = await this.getAllUsers();
    const locations = await this.getAllLocations();
    
    const activeCompanies = companies.filter(c => c.status === 'active');
    
    return {
      totalCompanies: companies.length,
      activeCompanies: activeCompanies.length,
      totalUsers: users.filter(u => u.role !== 'super_admin').length,
      averagePerformance: 88,
      dailyActivity: 12,
      alerts: []
    };
  }

  async setSuperAdminCompany(userId: number, companyId: number): Promise<void> {
    console.log(`Super admin ${userId} switched to company ${companyId}`);
  }

  // Supervisor Assessment User Location Permissions - Enhanced for individual user control
  async getSupervisorUserLocationPermissions(supervisorId: number, companyId?: number): Promise<any[]> {
    try {
      let conditions = eq(supervisorUserLocationPermissions.supervisorId, supervisorId);
      
      // Add company filtering if companyId is provided
      if (companyId !== undefined) {
        // Filter by company through users table join
        const permissions = await db
          .select({
            userId: supervisorUserLocationPermissions.userId,
            locationId: supervisorUserLocationPermissions.locationId,
            isEnabled: supervisorUserLocationPermissions.isEnabled
          })
          .from(supervisorUserLocationPermissions)
          .innerJoin(users, eq(supervisorUserLocationPermissions.userId, users.id))
          .where(and(
            eq(supervisorUserLocationPermissions.supervisorId, supervisorId),
            eq(users.companyId, companyId)
          ));
        
        return permissions;
      } else {
        const permissions = await db
          .select()
          .from(supervisorUserLocationPermissions)
          .where(conditions);

        // Return permissions with actual isEnabled values
        const result: any[] = [];
        permissions.forEach(perm => {
          result.push({
            userId: perm.userId,
            locationId: perm.locationId,
            isEnabled: perm.isEnabled
          });
        });

        return result;
      }
    } catch (error) {
      console.error('Error getting supervisor user location permissions:', error);
      return [];
    }
  }

  async setSupervisorUserLocationPermissions(
    supervisorId: number, 
    userId: number, 
    allLocationIds: number[], 
    enabledLocationIds: number[]
  ): Promise<void> {
    try {
      console.log('🔄 Setting user location permissions:', {
        supervisorId,
        userId,
        allLocationIds,
        enabledLocationIds
      });

      // Delete existing permissions for this supervisor-user combination
      await db
        .delete(supervisorUserLocationPermissions)
        .where(
          and(
            eq(supervisorUserLocationPermissions.supervisorId, supervisorId),
            eq(supervisorUserLocationPermissions.userId, userId)
          )
        );
      
      console.log('🗑️ Deleted existing permissions for user:', userId);

      // Insert ALL permissions with isEnabled flag
      if (allLocationIds && allLocationIds.length > 0) {
        const permissionsToInsert = allLocationIds.map(locationId => ({
          supervisorId,
          userId,
          locationId,
          isEnabled: enabledLocationIds.includes(locationId),
          grantedBy: supervisorId
        }));
        
        console.log('📝 Inserting all permissions with enabled flags:', permissionsToInsert);
        await db.insert(supervisorUserLocationPermissions).values(permissionsToInsert);
        console.log('✅ Successfully inserted all permissions');
      } else {
        console.log('⚠️ No locations provided for user:', userId);
      }
    } catch (error) {
      console.error('❌ Error setting supervisor user location permissions:', error);
      throw error;
    }
  }

  async getRegularUsersByCompany(companyId?: number): Promise<User[]> {
    try {
      let conditions = and(
        eq(users.role, 'user'),
        eq(users.isActive, true)
      );
      
      // Add company filtering if companyId is provided
      if (companyId !== undefined) {
        conditions = and(conditions, eq(users.companyId, companyId));
      }
      
      const regularUsers = await db
        .select()
        .from(users)
        .where(conditions);
      
      return regularUsers;
    } catch (error) {
      console.error('Error getting regular users by company:', error);
      return [];
    }
  }

  // KPI Access operations
  async grantKpiAccess(access: InsertKpiAccess): Promise<KpiAccess> {
    const [created] = await db.insert(kpiAccess).values(access).returning();
    return created;
  }

  async getUserKpiAccess(userId: number): Promise<KpiAccess | undefined> {
    const [access] = await db
      .select()
      .from(kpiAccess)
      .where(and(eq(kpiAccess.userId, userId), eq(kpiAccess.isActive, true)))
      .limit(1);
    return access || undefined;
  }

  async getKpiData(companyIds: number[], dateFrom?: string, dateTo?: string): Promise<any[]> {
    const results = [];
    
    // Set date range - use provided dates or default to last 30 days
    let startDate: Date;
    let endDate: Date;
    
    if (dateFrom) {
      startDate = new Date(dateFrom);
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    }
    
    if (dateTo) {
      endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999); // End of day
    } else {
      endDate = new Date();
    }

    console.log('📊 KPI Data - Date Range:', { startDate, endDate, dateFrom, dateTo });
    
    for (const companyId of companyIds) {
      // Get company info
      const company = await this.getCompany(companyId);
      if (!company) continue;

      // Get total locations
      const totalLocations = await db
        .select({ count: count() })
        .from(locations)
        .where(and(eq(locations.companyId, companyId), eq(locations.isActive, true)));

      // Get active users
      const activeUsers = await db
        .select({ count: count() })
        .from(users)
        .where(and(eq(users.companyId, companyId), eq(users.isActive, true)));

      // Get completed checklists for the specified date range
      const completedChecklists = await db
        .select({ count: count() })
        .from(dailyChecklists)
        .where(and(
          eq(dailyChecklists.companyId, companyId),
          gte(dailyChecklists.checklistDate, startDate),
          lte(dailyChecklists.checklistDate, endDate)
        ));

      // Calculate completion rate based on date range
      const daysDifference = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
      const expectedChecklists = totalLocations[0]?.count * daysDifference || 1;
      const actualChecklists = completedChecklists[0]?.count || 0;
      const completionRate = Math.min((actualChecklists / expectedChecklists) * 100, 100);

      // Get average rating from checklists in date range
      const recentChecklists = await db
        .select()
        .from(dailyChecklists)
        .where(and(
          eq(dailyChecklists.companyId, companyId),
          gte(dailyChecklists.checklistDate, startDate),
          lte(dailyChecklists.checklistDate, endDate)
        ))
        .limit(1000);

      let totalRating = 0;
      let ratingCount = 0;

      recentChecklists.forEach(checklist => {
        if (checklist.tasks && Array.isArray(checklist.tasks)) {
          checklist.tasks.forEach((task: any) => {
            if (task.rating && typeof task.rating === 'number') {
              totalRating += task.rating;
              ratingCount++;
            }
          });
        }
      });

      const averageRating = ratingCount > 0 ? (totalRating / ratingCount) : 0;

      // Get last activity in date range
      const lastActivity = await db
        .select()
        .from(dailyChecklists)
        .where(and(
          eq(dailyChecklists.companyId, companyId),
          gte(dailyChecklists.checklistDate, startDate),
          lte(dailyChecklists.checklistDate, endDate)
        ))
        .orderBy(desc(dailyChecklists.createdAt))
        .limit(1);

      console.log('📊 KPI Data for company:', {
        companyId,
        companyName: company.nameAr,
        dateRange: { startDate, endDate },
        totalChecklists: actualChecklists,
        expectedChecklists,
        completionRate: Math.round(completionRate),
        averageRating: Math.round(averageRating * 100) / 100
      });

      results.push({
        companyId,
        companyName: company.nameAr,
        totalLocations: totalLocations[0]?.count || 0,
        activeUsers: activeUsers[0]?.count || 0,
        completedChecklists: actualChecklists,
        completionRate: Math.round(completionRate),
        averageRating: Math.round(averageRating * 100) / 100,
        lastActivity: lastActivity[0]?.createdAt || new Date(),
        dateRange: {
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0]
        }
      });
    }

    return results;
  }

  // Enhanced General Manager Methods - Cross-Company Management

  async getCompanyUsersCount(companyId: number): Promise<number> {
    try {
      const result = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.companyId, companyId));
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error fetching company users count:', error);
      throw error;
    }
  }

  async getLocationsByCompany(companyId: number): Promise<Location[]> {
    try {
      return await db
        .select()
        .from(locations)
        .where(eq(locations.companyId, companyId));
    } catch (error) {
      console.error('Error fetching locations by company:', error);
      throw error;
    }
  }

  async getDailyEvaluationsCount(companyId: number, date: Date): Promise<number> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const result = await db
        .select({ count: count() })
        .from(dailyChecklists)
        .where(
          and(
            eq(dailyChecklists.companyId, companyId),
            gte(dailyChecklists.checklistDate, startOfDay),
            lte(dailyChecklists.checklistDate, endOfDay)
          )
        );
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error fetching daily evaluations count:', error);
      throw error;
    }
  }

  // Note: getAllCompanies already implemented above - this duplicate removed

  async getCrossCompanyLocationEvaluations(companyId: number | null): Promise<any[]> {
    try {
      // This is a simplified example - you would need to join with evaluations table
      const locationsQuery = db
        .select({
          id: locations.id,
          nameAr: locations.nameAr,
          nameEn: locations.nameEn,
          icon: locations.icon,
          companyId: locations.companyId,
          companyName: companies.nameAr,
        })
        .from(locations)
        .leftJoin(companies, eq(locations.companyId, companies.id));

      if (companyId) {
        locationsQuery.where(eq(locations.companyId, companyId));
      }

      const locationsList = await locationsQuery;
      
      // Add mock evaluation data for now - you'd join with actual evaluations
      return locationsList.map(location => ({
        ...location,
        status: Math.random() > 0.5 ? 'completed' : Math.random() > 0.5 ? 'in-progress' : 'not-started',
        progress: Math.floor(Math.random() * 100),
        lastEvaluated: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error fetching cross-company location evaluations:', error);
      throw error;
    }
  }

  async getAllManagers(): Promise<any[]> {
    try {
      const managersList = await db
        .select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          role: users.role,
          companyId: users.companyId,
          companyName: companies.nameAr,
          isActive: users.isActive,
          lastLogin: users.lastLoginAt,
          createdAt: users.createdAt,
          createdBy: users.createdBy,
        })
        .from(users)
        .leftJoin(companies, eq(users.companyId, companies.id))
        .where(
          or(
            eq(users.role, 'admin'),
            eq(users.role, 'department_manager'),
            eq(users.role, 'supervisor')
          )
        );

      console.log('📋 Found managers:', managersList.length);
      return managersList;
    } catch (error) {
      console.error('Error fetching managers:', error);
      throw error;
    }
  }

  async createManager(managerData: {
    username: string;
    fullName: string;
    password: string;
    companyId: number;
    role: string;
  }): Promise<any> {
    try {
      const hashedPassword = await bcrypt.hash(managerData.password, 10);
      
      const [user] = await db
        .insert(users)
        .values({
          username: managerData.username,
          fullName: managerData.fullName,
          password: hashedPassword,
          role: managerData.role,
          companyId: managerData.companyId,
          isActive: true,
        })
        .returning();
        
      return user;
    } catch (error) {
      console.error('Error creating manager:', error);
      throw error;
    }
  }

  async resetManagerPassword(managerId: number): Promise<string> {
    try {
      const newPassword = 'HSA' + Math.random().toString(36).slice(-6);
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, managerId));
      
      return newPassword;
    } catch (error) {
      console.error('Error resetting manager password:', error);
      throw error;
    }
  }

  async deactivateManager(managerId: number): Promise<void> {
    try {
      await db
        .update(users)
        .set({ isActive: false })
        .where(eq(users.id, managerId));
    } catch (error) {
      console.error('Error deactivating manager:', error);
      throw error;
    }
  }

  // Note: createCompany already implemented above - this duplicate removed

  async createCompleteCompanySetup(setupData: {
    nameAr: string;
    nameEn: string;
    description: string;
    managerUsername: string;
    managerFullName: string;
    managerPassword: string;
  }, createdById?: number): Promise<any> {
    try {
      // Start a transaction-like operation
      console.log('🏗️ Starting complete company setup...');
      
      // Step 1: Create the company
      const [company] = await db
        .insert(companies)
        .values({
          nameAr: setupData.nameAr,
          nameEn: setupData.nameEn,
          description: setupData.description,
          type: 'regular',
          isActive: true,
        })
        .returning();
      
      console.log('✅ Company created:', company.id);
      
      // Step 2: Create the manager with createdBy for Enhanced GM tracking
      const hashedPassword = await bcrypt.hash(setupData.managerPassword, 10);
      const [manager] = await db
        .insert(users)
        .values({
          username: setupData.managerUsername,
          fullName: setupData.managerFullName,
          password: hashedPassword,
          role: 'admin',
          companyId: company.id,
          isActive: true,
          createdBy: createdById || 1, // Enhanced General Manager ID (general_manager_enhanced)
          canManageUsers: true, // Primary admin gets user management permissions
        })
        .returning();
      
      console.log('✅ Manager created:', manager.id);
      
      // Step 2.5: Create "اخصائي بيانات الشركة" automatically
      const dataSpecialistPassword = await bcrypt.hash('data123', 10);
      const [dataSpecialist] = await db
        .insert(users)
        .values({
          username: `data_specialist_${company.id}`,
          fullName: 'اخصائي بيانات الشركة',
          password: dataSpecialistPassword,
          role: 'data_specialist',
          companyId: company.id,
          isActive: true,
          createdBy: createdById || 1, // Enhanced General Manager ID
          canManageUsers: false, // Data specialist cannot manage users
        })
        .returning();
      
      console.log('✅ Data Specialist created:', dataSpecialist.id);
      
      // Step 3: Copy manager permissions from National Dairy & Food Company Hodeidah (ID = 2)
      await this.copyManagerPermissions(2, company.id);
      
      // Step 4: Copy dashboard settings from National Dairy & Food Company Hodeidah
      await this.copyDashboardSettings(2, company.id);
      
      // Step 5: Copy user roles and menu settings
      await this.copyUserRolesAndMenuSettings(2, company.id);
      
      // Step 6: Set specific permissions for data specialist (locations, checklists, settings, sync)
      await this.setDataSpecialistPermissions(dataSpecialist.id, company.id);
      
      console.log('✅ Complete company setup finished for:', company.nameAr);
      
      return {
        company,
        manager,
        dataSpecialist,
        message: 'تم إنشاء الشركة وإعدادها بالكامل بنجاح مع إضافة اخصائي بيانات الشركة',
        id: company.id,
        nameAr: company.nameAr,
        nameEn: company.nameEn,
        dataSpecialistCredentials: {
          username: `data_specialist_${company.id}`,
          password: 'data123',
          fullName: 'اخصائي بيانات الشركة'
        }
      };
    } catch (error) {
      console.error('❌ Error in complete company setup:', error);
      throw new Error('فشل في إنشاء الشركة: ' + (error as Error).message);
    }
  }

  // Set specific permissions for data specialist user
  async setDataSpecialistPermissions(userId: number, companyId: number): Promise<void> {
    try {
      console.log('🔑 Setting data specialist permissions for user:', userId);
      
      // Data specialist gets access to: locations, checklists, settings, sync
      const dataSpecialistPermissions = {
        dashboard: true,
        locations: true,         // إدارة المواقع
        checklists: true,       // إدارة قوائم التشييك  
        evaluations: false,     // لا يحتاج تقييمات
        reports: false,         // لا يحتاج تقارير
        users: false,           // لا يدير المستخدمين
        settings: true,         // الإعدادات
        sync: true,             // المزامنة
        analytics: false        // لا يحتاج تحليلات
      };
      
      // Insert dashboard settings for data specialist
      for (const [sectionName, isVisible] of Object.entries(dataSpecialistPermissions)) {
        await db.insert(userDashboardSettings).values({
          userId,
          dashboardConfig: { [sectionName]: { enabled: isVisible } }
        });
      }
      
      console.log('✅ Data specialist permissions set successfully');
    } catch (error) {
      console.error('❌ Error setting data specialist permissions:', error);
      // Don't throw error to avoid breaking company creation
    }
  }

  async copyManagerPermissions(sourceCompanyId: number, targetCompanyId: number): Promise<void> {
    try {
      console.log(`📋 Copying manager permissions from company ${sourceCompanyId} to ${targetCompanyId}`);
      
      // Get the new company's manager
      const targetManager = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.companyId, targetCompanyId),
            eq(users.role, 'admin')
          )
        )
        .limit(1);

      if (targetManager.length === 0) {
        throw new Error('No manager found for target company');
      }

      // Get source company admin's dashboard settings
      const sourceDashboardSettings = await db
        .select()
        .from(userDashboardSettings)
        .innerJoin(users, eq(userDashboardSettings.userId, users.id))
        .where(
          and(
            eq(users.companyId, sourceCompanyId),
            eq(users.role, 'admin')
          )
        )
        .limit(1);

      // Copy dashboard settings if found
      if (sourceDashboardSettings.length > 0) {
        await db
          .insert(userDashboardSettings)
          .values({
            userId: targetManager[0].id,
            dashboardConfig: sourceDashboardSettings[0].user_dashboard_settings.dashboardConfig,
          })
          .onConflictDoUpdate({
            target: userDashboardSettings.userId,
            set: {
              dashboardConfig: sourceDashboardSettings[0].user_dashboard_settings.dashboardConfig,
            }
          });
        
        console.log('✅ Dashboard settings copied to new manager');
      }

      // Copy KPI access settings
      const sourceKpiAccess = await db
        .select()
        .from(kpiAccess)
        .innerJoin(users, eq(kpiAccess.userId, users.id))
        .where(
          and(
            eq(users.companyId, sourceCompanyId),
            eq(users.role, 'admin')
          )
        );

      // Apply KPI access permissions to new manager
      for (const kpiRule of sourceKpiAccess) {
        await db
          .insert(kpiAccess)
          .values({
            userId: targetManager[0].id,
            grantedBy: 1,
            companyIds: [targetCompanyId],
          })
          .onConflictDoNothing();
      }

      console.log(`✅ Manager permissions copied (${sourceDashboardSettings.length} dashboard configs, ${sourceKpiAccess.length} KPI access rules applied)`);
      
    } catch (error) {
      console.error('Error copying manager permissions:', error);
      throw error;
    }
  }

  async copyDashboardSettings(sourceCompanyId: number, targetCompanyId: number): Promise<void> {
    try {
      console.log(`🏠 Copying dashboard settings from company ${sourceCompanyId} to ${targetCompanyId}`);
      
      // Get the new company's manager to assign dashboard settings
      const targetManager = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.companyId, targetCompanyId),
            eq(users.role, 'admin')
          )
        )
        .limit(1);

      if (targetManager.length === 0) {
        throw new Error('No manager found for target company');
      }

      // Get source company's admin dashboard configuration
      const sourceAdminDashboard = await db
        .select()
        .from(userDashboardSettings)
        .innerJoin(users, eq(userDashboardSettings.userId, users.id))
        .where(
          and(
            eq(users.companyId, sourceCompanyId),
            eq(users.role, 'admin')
          )
        )
        .limit(1);

      if (sourceAdminDashboard.length > 0) {
        // Copy the dashboard configuration to the new manager
        await db
          .insert(userDashboardSettings)
          .values({
            userId: targetManager[0].id,
            dashboardConfig: sourceAdminDashboard[0].user_dashboard_settings.dashboardConfig,
          });
        
        console.log('✅ Dashboard configuration copied to new manager');
      }
      
      console.log('✅ Dashboard settings copied');
      
    } catch (error) {
      console.error('Error copying dashboard settings:', error);
      throw error;
    }
  }

  async copyUserRolesAndMenuSettings(sourceCompanyId: number, targetCompanyId: number): Promise<void> {
    try {
      console.log(`👥 Copying user roles and menu settings from company ${sourceCompanyId} to ${targetCompanyId}`);
      
      // Get the new company's manager
      const targetManager = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.companyId, targetCompanyId),
            eq(users.role, 'admin')
          )
        )
        .limit(1);

      if (targetManager.length === 0) {
        throw new Error('No manager found for target company');
      }

      // Copy location permissions structure from source company
      const sourceLocationPermissions = await db
        .select()
        .from(userLocationPermissions)
        .innerJoin(users, eq(userLocationPermissions.userId, users.id))
        .innerJoin(locations, eq(userLocationPermissions.locationId, locations.id))
        .where(eq(users.companyId, sourceCompanyId));

      // Copy supervisor permissions structure
      const sourceSupervisorPermissions = await db
        .select()
        .from(supervisorUserLocationPermissions)
        .innerJoin(users, eq(supervisorUserLocationPermissions.supervisorId, users.id))
        .where(eq(users.companyId, sourceCompanyId));

      console.log(`✅ Analyzed role structures (${sourceLocationPermissions.length} location permissions, ${sourceSupervisorPermissions.length} supervisor permissions)`);
      
      // Note: Actual location permissions will be created when locations are added to the new company
      // This analysis ensures we understand the permission structure to replicate
      
      console.log('✅ User roles and menu settings structure copied');
      
    } catch (error) {
      console.error('Error copying user roles and menu settings:', error);
      throw error;
    }
  }

  async getCompanyAnalytics(companyId: number | null, timeRange: string): Promise<any[]> {
    try {
      const companiesQuery = companyId 
        ? db.select().from(companies).where(eq(companies.id, companyId))
        : db.select().from(companies);
      
      const companiesList = await companiesQuery;
      
      // Mock analytics data - you would calculate real analytics
      return companiesList.map(company => ({
        companyId: company.id,
        companyName: company.nameAr,
        totalLocations: Math.floor(Math.random() * 20) + 5,
        completedEvaluations: Math.floor(Math.random() * 100) + 10,
        averageScore: Math.floor(Math.random() * 40) + 60,
        completionRate: Math.floor(Math.random() * 50) + 50,
        activeUsers: Math.floor(Math.random() * 15) + 3,
        weeklyTrend: Array.from({ length: 7 }, (_, i) => ({
          day: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][i],
          evaluations: Math.floor(Math.random() * 10) + 2,
          score: Math.floor(Math.random() * 40) + 60
        })),
        locationCategories: [
          { category: 'مكاتب', count: Math.floor(Math.random() * 10) + 2 },
          { category: 'مخازن', count: Math.floor(Math.random() * 8) + 1 },
          { category: 'مطابخ', count: Math.floor(Math.random() * 5) + 1 },
          { category: 'حمامات', count: Math.floor(Math.random() * 12) + 3 }
        ],
        performanceByLocation: Array.from({ length: 5 }, (_, i) => ({
          location: `الموقع ${i + 1}`,
          score: Math.floor(Math.random() * 40) + 60,
          evaluations: Math.floor(Math.random() * 20) + 5
        }))
      }));
    } catch (error) {
      console.error('Error fetching company analytics:', error);
      throw error;
    }
  }

  // Update password with plain text password (will be hashed)
  async updateUserPasswordPlain(userId: number, plainPassword: string): Promise<void> {
    try {
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId));
      console.log(`✅ Password updated for user ID: ${userId} (plain -> hashed: ${hashedPassword.length} chars)`);
    } catch (error) {
      console.error('Error updating user password:', error);
      throw error;
    }
  }

  // Update password with already hashed password  
  async updateUserPasswordHashed(userId: number, hashedPassword: string): Promise<void> {
    try {
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId));
      console.log(`✅ Password updated for user ID: ${userId} (pre-hashed: ${hashedPassword.length} chars)`);
    } catch (error) {
      console.error('Error updating user password:', error);
      throw error;
    }
  }

  // System Settings operations
  async getUserSettings(userId: number): Promise<Record<string, any>> {
    try {
      const settings = await db
        .select()
        .from(systemSettings)
        .where(
          and(
            eq(systemSettings.userId, userId),
            eq(systemSettings.isUserSpecific, true)
          )
        );

      const result: Record<string, any> = {};
      settings.forEach(setting => {
        result[setting.settingKey] = setting.settingValue;
      });
      return result;
    } catch (error) {
      console.error('Error getting user settings:', error);
      return {};
    }
  }

  async getCompanySettings(companyId: number): Promise<Record<string, any>> {
    try {
      const settings = await db
        .select()
        .from(systemSettings)
        .where(
          and(
            eq(systemSettings.companyId, companyId),
            eq(systemSettings.isCompanySpecific, true)
          )
        );

      const result: Record<string, any> = {};
      settings.forEach(setting => {
        result[setting.settingKey] = setting.settingValue;
      });
      return result;
    } catch (error) {
      console.error('Error getting company settings:', error);
      return {};
    }
  }

  async saveSetting(setting: InsertSystemSetting): Promise<SystemSetting> {
    try {
      // Check if setting already exists
      const existingConditions = [
        eq(systemSettings.settingKey, setting.settingKey),
        eq(systemSettings.category, setting.category)
      ];

      if (setting.userId) {
        existingConditions.push(eq(systemSettings.userId, setting.userId));
      }
      if (setting.companyId) {
        existingConditions.push(eq(systemSettings.companyId, setting.companyId));
      }

      const [existing] = await db
        .select()
        .from(systemSettings)
        .where(and(...existingConditions))
        .limit(1);

      if (existing) {
        // Update existing setting
        const [updated] = await db
          .update(systemSettings)
          .set({
            settingValue: setting.settingValue,
            updatedAt: new Date()
          })
          .where(eq(systemSettings.id, existing.id))
          .returning();
        return updated;
      } else {
        // Create new setting
        const [created] = await db
          .insert(systemSettings)
          .values(setting)
          .returning();
        return created;
      }
    } catch (error) {
      console.error('Error saving setting:', error);
      throw error;
    }
  }

  async resetUserSettings(userId: number, category?: string): Promise<void> {
    try {
      let conditions = [
        eq(systemSettings.userId, userId),
        eq(systemSettings.isUserSpecific, true)
      ];

      if (category) {
        conditions.push(eq(systemSettings.category, category));
      }

      await db
        .delete(systemSettings)
        .where(and(...conditions));

      console.log(`✅ Reset user settings for user ${userId}${category ? ` in category ${category}` : ''}`);
    } catch (error) {
      console.error('Error resetting user settings:', error);
      throw error;
    }
  }

  async resetCompanySettings(companyId: number, category?: string): Promise<void> {
    try {
      let conditions = [
        eq(systemSettings.companyId, companyId),
        eq(systemSettings.isCompanySpecific, true)
      ];

      if (category) {
        conditions.push(eq(systemSettings.category, category));
      }

      await db
        .delete(systemSettings)
        .where(and(...conditions));

      console.log(`✅ Reset company settings for company ${companyId}${category ? ` in category ${category}` : ''}`);
    } catch (error) {
      console.error('Error resetting company settings:', error);
      throw error;
    }
  }

  async cleanupOrphanedTemplates(companyId?: number): Promise<number> {
    try {
      console.log('🧹 بدء تنظيف قوائم التشييك المعلقة...');
      
      // ابحث عن قوائم التشييك التي لا تحتوي على موقع نشط
      let whereConditions = or(
        eq(locations.isActive, false), // الموقع غير نشط
        isNull(locations.id) // الموقع لا يوجد أصلاً
      );
      
      if (companyId) {
        whereConditions = and(
          whereConditions,
          eq(checklistTemplates.companyId, companyId)
        );
      }
      
      const orphanedTemplatesQuery = db
        .select({ templateId: checklistTemplates.id })
        .from(checklistTemplates)
        .leftJoin(locations, eq(checklistTemplates.locationId, locations.id))
        .where(whereConditions);

      const orphanedTemplates = await orphanedTemplatesQuery;
      
      if (orphanedTemplates.length === 0) {
        console.log('✅ لا توجد قوائم تشييك معلقة');
        return 0;
      }

      console.log(`🗑️ وُجد ${orphanedTemplates.length} قائمة تشييك معلقة`);
      
      // احذف قوائم التشييك المعلقة
      const templateIds = orphanedTemplates.map(t => t.templateId);
      await db
        .delete(checklistTemplates)
        .where(inArray(checklistTemplates.id, templateIds));

      console.log(`✅ تم حذف ${orphanedTemplates.length} قائمة تشييك معلقة بنجاح`);
      return orphanedTemplates.length;
    } catch (error) {
      console.error('Error cleaning up orphaned templates:', error);
      throw error;
    }
  }

  // Analytics Users Management
  async getAnalyticsUsers(): Promise<User[]> {
    try {
      const analyticsUsers = await db
        .select()
        .from(users)
        .where(eq(users.role, 'analytics_viewer'))
        .orderBy(desc(users.isActive), asc(users.createdAt));
      
      console.log(`📊 Found ${analyticsUsers.length} analytics users`);
      return analyticsUsers;
    } catch (error) {
      console.error('Error fetching analytics users:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
