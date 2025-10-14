import type { Express } from 'express';
import { db } from '../db';
import { companies, locations, dailyChecklists, users, checklistTemplates } from '@shared/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import * as ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// نظام النسخ الاحتياطي للشركات
export function registerCompanyBackupRoutes(app: Express) {
  
  // إنشاء نسخة احتياطية لشركة محددة
  app.post('/api/admin/companies/:companyId/backup', async (req, res) => {
    try {
      const { companyId } = req.params;
      const { 
        backupType = 'full', 
        includeEvaluations = true,
        includeUsers = true,
        dateRange = null
      } = req.body;

      console.log(`📦 بدء إنشاء نسخة احتياطية للشركة: ${companyId}`);

      // التحقق من وجود الشركة
      const [company] = await db.select().from(companies).where(eq(companies.id, parseInt(companyId)));
      if (!company) {
        return res.status(404).json({ error: 'الشركة غير موجودة' });
      }

      // جمع بيانات الشركة
      const backupData: any = {
        metadata: {
          companyId: company.id,
          companyName: company.nameAr,
          backupType,
          createdAt: new Date().toISOString(),
          version: '1.0.0'
        },
        company: company
      };

      // جمع المواقع
      const companyLocations = await db.select()
        .from(locations)
        .where(eq(locations.companyId, parseInt(companyId)));
      
      backupData.locations = companyLocations;
      console.log(`📍 تم جمع ${companyLocations.length} موقع`);

      // جمع القوالب
      const companyTemplates = await db.select()
        .from(checklistTemplates)
        .where(eq(checklistTemplates.companyId, parseInt(companyId)));
      
      backupData.templates = companyTemplates;
      console.log(`📋 تم جمع ${companyTemplates.length} قالب`);

      // جمع المستخدمين (إذا طُلب)
      if (includeUsers) {
        const companyUsers = await db.select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          role: users.role,
          isActive: users.isActive,
          companyId: users.companyId,
          createdAt: users.createdAt,
          lastLoginAt: users.lastLoginAt
        }).from(users)
        .where(eq(users.companyId, parseInt(companyId)));
        
        backupData.users = companyUsers;
        console.log(`👥 تم جمع ${companyUsers.length} مستخدم`);
      }

      // جمع التقييمات (إذا طُلب ومع نطاق التاريخ)
      if (includeEvaluations) {
        let evaluationsQuery = db.select()
          .from(dailyChecklists)
          .where(eq(dailyChecklists.companyId, parseInt(companyId)));

        if (dateRange && dateRange.startDate && dateRange.endDate) {
          evaluationsQuery = evaluationsQuery.where(
            and(
              gte(dailyChecklists.createdAt, new Date(dateRange.startDate)),
              lte(dailyChecklists.createdAt, new Date(dateRange.endDate))
            )
          );
        }

        const companyEvaluations = await evaluationsQuery;
        backupData.evaluations = companyEvaluations;
        console.log(`📊 تم جمع ${companyEvaluations.length} تقييم`);
      }

      // حساب إحصائيات النسخة الاحتياطية
      const stats = {
        totalLocations: backupData.locations?.length || 0,
        totalTemplates: backupData.templates?.length || 0,
        totalUsers: backupData.users?.length || 0,
        totalEvaluations: backupData.evaluations?.length || 0,
        backupSize: JSON.stringify(backupData).length
      };

      // حفظ سجل النسخة الاحتياطية في قاعدة البيانات
      // (يمكن إضافة جدول backup_logs لاحقاً)

      res.json({
        success: true,
        backupId: `backup_${companyId}_${Date.now()}`,
        stats,
        downloadUrl: `/api/admin/companies/${companyId}/backup/download`,
        message: 'تم إنشاء النسخة الاحتياطية بنجاح'
      });

    } catch (error) {
      console.error('❌ خطأ في إنشاء النسخة الاحتياطية:', error);
      res.status(500).json({ 
        error: 'فشل في إنشاء النسخة الاحتياطية',
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      });
    }
  });

  // تحميل النسخة الاحتياطية كملف Excel
  app.get('/api/admin/companies/:companyId/backup/download', async (req, res) => {
    try {
      const { companyId } = req.params;
      const { format: downloadFormat = 'excel' } = req.query;

      // الحصول على بيانات الشركة
      const [company] = await db.select().from(companies).where(eq(companies.id, parseInt(companyId)));
      if (!company) {
        return res.status(404).json({ error: 'الشركة غير موجودة' });
      }

      if (downloadFormat === 'excel') {
        // إنشاء ملف Excel
        const workbook = new ExcelJS.Workbook();
        
        // معلومات الشركة
        const companySheet = workbook.addWorksheet('معلومات الشركة');
        companySheet.addRow(['اسم الشركة (عربي)', company.nameAr]);
        companySheet.addRow(['اسم الشركة (إنجليزي)', company.nameEn]);
        companySheet.addRow(['تاريخ الإنشاء', format(new Date(company.createdAt), 'yyyy-MM-dd HH:mm:ss', { locale: ar })]);
        companySheet.addRow(['تاريخ النسخة الاحتياطية', format(new Date(), 'yyyy-MM-dd HH:mm:ss', { locale: ar })]);

        // المواقع
        const locationsData = await db.select().from(locations).where(eq(locations.companyId, parseInt(companyId)));
        const locationsSheet = workbook.addWorksheet('المواقع');
        locationsSheet.addRow(['المعرف', 'الاسم العربي', 'الاسم الإنجليزي', 'الأيقونة', 'تاريخ الإنشاء']);
        locationsData.forEach(location => {
          locationsSheet.addRow([
            location.id,
            location.nameAr,
            location.nameEn,
            location.icon,
            location.createdAt ? format(new Date(location.createdAt), 'yyyy-MM-dd HH:mm:ss', { locale: ar }) : 'غير محدد'
          ]);
        });

        // المستخدمين
        const usersData = await db.select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
          lastLoginAt: users.lastLoginAt
        }).from(users).where(eq(users.companyId, parseInt(companyId)));
        
        const usersSheet = workbook.addWorksheet('المستخدمين');
        usersSheet.addRow(['المعرف', 'اسم المستخدم', 'الاسم الكامل', 'الدور', 'نشط', 'تاريخ الإنشاء', 'آخر دخول']);
        usersData.forEach(user => {
          usersSheet.addRow([
            user.id,
            user.username,
            user.fullName,
            user.role,
            user.isActive ? 'نعم' : 'لا',
            user.createdAt ? format(new Date(user.createdAt), 'yyyy-MM-dd HH:mm:ss', { locale: ar }) : 'غير محدد',
            user.lastLoginAt ? format(new Date(user.lastLoginAt), 'yyyy-MM-dd HH:mm:ss', { locale: ar }) : 'لم يسجل دخول'
          ]);
        });

        // القوالب
        const templatesData = await db.select().from(checklistTemplates).where(eq(checklistTemplates.companyId, parseInt(companyId)));
        const templatesSheet = workbook.addWorksheet('القوالب');
        templatesSheet.addRow(['المعرف', 'الاسم', 'الفئة', 'عدد المهام', 'تاريخ الإنشاء']);
        templatesData.forEach(template => {
          templatesSheet.addRow([
            template.id,
            template.name,
            template.category,
            template.tasks ? JSON.parse(template.tasks).length : 0,
            template.createdAt ? format(new Date(template.createdAt), 'yyyy-MM-dd HH:mm:ss', { locale: ar }) : 'غير محدد'
          ]);
        });

        // التقييمات (عينة من آخر 1000 تقييم)
        const evaluationsData = await db.select()
          .from(dailyChecklists)
          .where(eq(dailyChecklists.companyId, parseInt(companyId)))
          .limit(1000);
          
        const evaluationsSheet = workbook.addWorksheet('التقييمات');
        evaluationsSheet.addRow(['المعرف', 'الموقع', 'المستخدم', 'النتيجة الإجمالية', 'تاريخ الإنشاء']);
        evaluationsData.forEach(evaluation => {
          evaluationsSheet.addRow([
            evaluation.id,
            evaluation.locationId,
            evaluation.userId,
            'تقييم يومي',
            evaluation.createdAt ? format(new Date(evaluation.createdAt), 'yyyy-MM-dd HH:mm:ss', { locale: ar }) : 'غير محدد'
          ]);
        });

        // تنسيق الملف
        const fileName = `backup_${company.nameAr}_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`;
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        
        await workbook.xlsx.write(res);
        res.end();

      } else {
        // تحميل JSON
        const backupData = {
          company,
          locations: await db.select().from(locations).where(eq(locations.companyId, parseInt(companyId))),
          users: await db.select().from(users).where(eq(users.companyId, parseInt(companyId))),
          templates: await db.select().from(checklistTemplates).where(eq(checklistTemplates.companyId, parseInt(companyId))),
          evaluations: await db.select().from(dailyChecklists).where(eq(dailyChecklists.companyId, parseInt(companyId))).limit(1000)
        };

        const fileName = `backup_${company.nameAr}_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.json(backupData);
      }

    } catch (error) {
      console.error('❌ خطأ في تحميل النسخة الاحتياطية:', error);
      res.status(500).json({ 
        error: 'فشل في تحميل النسخة الاحتياطية',
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      });
    }
  });

  // الحصول على سجل النسخ الاحتياطية للشركة
  app.get('/api/admin/companies/:companyId/backup/history', async (req, res) => {
    try {
      const { companyId } = req.params;

      // للآن نرجع بيانات افتراضية - يمكن تطويرها لاحقاً بجدول backup_logs
      const mockHistory = [
        {
          id: 1,
          backupDate: new Date().toISOString(),
          backupType: 'full',
          status: 'completed',
          fileSize: '2.5 MB',
          recordsCount: {
            locations: 10,
            users: 25,
            evaluations: 1250,
            templates: 15
          }
        }
      ];

      res.json({
        companyId: parseInt(companyId),
        history: mockHistory,
        totalBackups: mockHistory.length
      });

    } catch (error) {
      console.error('❌ خطأ في استرجاع سجل النسخ الاحتياطية:', error);
      res.status(500).json({ 
        error: 'فشل في استرجاع سجل النسخ الاحتياطية',
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      });
    }
  });

  // إحصائيات شاملة لجميع الشركات (لمدير بيئة العمل)
  app.get('/api/admin/backup/overview', async (req, res) => {
    try {
      // جمع إحصائيات لجميع الشركات
      const allCompanies = await db.select().from(companies);
      
      const overview = await Promise.all(
        allCompanies.map(async (company) => {
          const [
            locationsCount,
            usersCount,
            evaluationsCount,
            templatesCount
          ] = await Promise.all([
            db.select().from(locations).where(eq(locations.companyId, company.id)),
            db.select().from(users).where(eq(users.companyId, company.id)),
            db.select().from(dailyChecklists).where(eq(dailyChecklists.companyId, company.id)),
            db.select().from(checklistTemplates).where(eq(checklistTemplates.companyId, company.id))
          ]);

          return {
            companyId: company.id,
            companyName: company.nameAr,
            statistics: {
              locations: locationsCount.length,
              users: usersCount.length,
              evaluations: evaluationsCount.length,
              templates: templatesCount.length
            },
            lastBackup: null, // يمكن تطويرها لاحقاً
            estimatedBackupSize: Math.round(
              (locationsCount.length * 0.5 + 
               usersCount.length * 0.3 + 
               evaluationsCount.length * 0.1 + 
               templatesCount.length * 0.2) * 1024
            ) + ' KB'
          };
        })
      );

      res.json({
        totalCompanies: allCompanies.length,
        overview,
        globalStats: {
          totalLocations: overview.reduce((sum, c) => sum + c.statistics.locations, 0),
          totalUsers: overview.reduce((sum, c) => sum + c.statistics.users, 0),
          totalEvaluations: overview.reduce((sum, c) => sum + c.statistics.evaluations, 0),
          totalTemplates: overview.reduce((sum, c) => sum + c.statistics.templates, 0)
        }
      });

    } catch (error) {
      console.error('❌ خطأ في استرجاع نظرة عامة للنسخ الاحتياطية:', error);
      res.status(500).json({ 
        error: 'فشل في استرجاع نظرة عامة للنسخ الاحتياطية',
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      });
    }
  });

  console.log('✅ تم تسجيل مسارات النسخ الاحتياطي للشركات');
}