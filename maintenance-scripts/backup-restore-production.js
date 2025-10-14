#!/usr/bin/env node

/**
 * سكريبت نسخ احتياطي واستعادة شامل للإنتاج
 * يحفظ جميع البيانات ويستعيدها مع تصحيح IDs تلقائياً
 */

import { Pool } from '@neondatabase/serverless';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// دالة النسخ الاحتياطي
export async function createBackup() {
  console.log('🔄 بدء النسخ الاحتياطي الشامل...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // استخراج جميع البيانات مع العلاقات
    console.log('📊 استخراج بيانات الشركات...');
    const companies = await pool.query('SELECT * FROM companies ORDER BY id');
    
    console.log('👥 استخراج بيانات المستخدمين...');
    const users = await pool.query('SELECT * FROM users ORDER BY id');
    
    console.log('📍 استخراج بيانات المواقع...');
    const locations = await pool.query('SELECT * FROM locations ORDER BY id');
    
    console.log('📋 استخراج قوالب التشييك...');
    const templates = await pool.query('SELECT * FROM checklist_templates ORDER BY id');
    
    console.log('✅ استخراج التقييمات...');
    const checklists = await pool.query('SELECT * FROM daily_checklists ORDER BY id');
    
    console.log('⚙️ استخراج إعدادات لوحة التحكم...');
    const dashboardSettings = await pool.query('SELECT * FROM dashboard_settings ORDER BY id');

    // إنشاء ملف النسخ الاحتياطي
    const backupData = {
      timestamp: new Date().toISOString(),
      companies: companies.rows,
      users: users.rows,
      locations: locations.rows,
      templates: templates.rows,
      checklists: checklists.rows,
      dashboardSettings: dashboardSettings.rows
    };

    const backupPath = join(__dirname, 'full-system-backup.json');
    writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');

    console.log('✅ تم إنشاء النسخ الاحتياطي بنجاح!');
    console.log(`📄 ملف النسخ الاحتياطي: ${backupPath}`);
    console.log(`📊 الإحصائيات:`);
    console.log(`   - الشركات: ${companies.rows.length}`);
    console.log(`   - المستخدمين: ${users.rows.length}`);
    console.log(`   - المواقع: ${locations.rows.length}`);
    console.log(`   - القوالب: ${templates.rows.length}`);
    console.log(`   - التقييمات: ${checklists.rows.length}`);
    console.log(`   - الإعدادات: ${dashboardSettings.rows.length}`);

    return backupPath;
    
  } catch (error) {
    console.error('❌ خطأ في النسخ الاحتياطي:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// دالة الاستعادة مع تصحيح IDs
export async function restoreFromBackup(pool) {
  console.log('🔄 بدء استعادة البيانات من النسخ الاحتياطي...');
  
  try {
    const backupPath = join(__dirname, 'full-system-backup.json');
    
    if (!existsSync(backupPath)) {
      console.log('ℹ️ لا يوجد ملف نسخ احتياطي، استخدام الإعداد الأساسي...');
      return false;
    }

    const backupData = JSON.parse(readFileSync(backupPath, 'utf8'));
    console.log(`📅 استعادة البيانات من: ${backupData.timestamp}`);

    // تنظيف البيانات الموجودة
    console.log('🧹 تنظيف البيانات الموجودة...');
    await pool.query('TRUNCATE TABLE dashboard_settings, daily_checklists, checklist_templates, locations, users, companies RESTART IDENTITY CASCADE');

    // خرائط تحويل IDs (من القديم للجديد)
    const companyIdMap = new Map();
    const userIdMap = new Map();
    const locationIdMap = new Map();
    const templateIdMap = new Map();

    // استعادة الشركات
    console.log('📊 استعادة الشركات...');
    let newCompanyId = 1;
    for (const company of backupData.companies) {
      const result = await pool.query(
        'INSERT INTO companies (name_ar, name_en, manager_name, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [company.name_ar, company.name_en, company.manager_name, company.created_at, company.updated_at]
      );
      companyIdMap.set(company.id, result.rows[0].id);
      newCompanyId++;
    }

    // استعادة المستخدمين
    console.log('👥 استعادة المستخدمين...');
    for (const user of backupData.users) {
      const newCompanyId = companyIdMap.get(user.company_id);
      const result = await pool.query(
        'INSERT INTO users (username, password_hash, role, company_id, full_name, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [user.username, user.password_hash, user.role, newCompanyId, user.full_name, user.created_at, user.updated_at]
      );
      userIdMap.set(user.id, result.rows[0].id);
    }

    // استعادة المواقع
    console.log('📍 استعادة المواقع...');
    for (const location of backupData.locations) {
      const newCompanyId = companyIdMap.get(location.company_id);
      const result = await pool.query(
        'INSERT INTO locations (name_ar, name_en, icon, company_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [location.name_ar, location.name_en, location.icon, newCompanyId, location.created_at, location.updated_at]
      );
      locationIdMap.set(location.id, result.rows[0].id);
    }

    // استعادة القوالب
    console.log('📋 استعادة القوالب...');
    for (const template of backupData.templates) {
      const newCompanyId = companyIdMap.get(template.company_id);
      const newLocationId = template.location_id ? locationIdMap.get(template.location_id) : null;
      const result = await pool.query(
        'INSERT INTO checklist_templates (name_ar, name_en, items, company_id, location_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [template.name_ar, template.name_en, JSON.stringify(template.items), newCompanyId, newLocationId, template.created_at, template.updated_at]
      );
      templateIdMap.set(template.id, result.rows[0].id);
    }

    // استعادة التقييمات
    console.log('✅ استعادة التقييمات...');
    for (const checklist of backupData.checklists) {
      const newUserId = userIdMap.get(checklist.user_id);
      const newLocationId = locationIdMap.get(checklist.location_id);
      const newTemplateId = templateIdMap.get(checklist.template_id);
      
      await pool.query(
        'INSERT INTO daily_checklists (user_id, location_id, template_id, date, responses, score, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [newUserId, newLocationId, newTemplateId, checklist.date, JSON.stringify(checklist.responses), checklist.score, checklist.created_at, checklist.updated_at]
      );
    }

    // استعادة إعدادات لوحة التحكم
    console.log('⚙️ استعادة إعدادات لوحة التحكم...');
    for (const settings of backupData.dashboardSettings) {
      const newUserId = userIdMap.get(settings.user_id);
      await pool.query(
        'INSERT INTO dashboard_settings (user_id, settings, created_at, updated_at) VALUES ($1, $2, $3, $4)',
        [newUserId, JSON.stringify(settings.settings), settings.created_at, settings.updated_at]
      );
    }

    console.log('✅ تم استعادة جميع البيانات بنجاح!');
    console.log('📊 تم استعادة:');
    console.log(`   - ${backupData.companies.length} شركات`);
    console.log(`   - ${backupData.users.length} مستخدمين`);
    console.log(`   - ${backupData.locations.length} موقع`);
    console.log(`   - ${backupData.templates.length} قالب`);
    console.log(`   - ${backupData.checklists.length} تقييم`);
    console.log(`   - ${backupData.dashboardSettings.length} إعداد`);

    return true;
    
  } catch (error) {
    console.error('❌ خطأ في استعادة البيانات:', error);
    throw error;
  }
}

// تشغيل النسخ الاحتياطي إذا تم استدعاء السكريبت مباشرة
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'backup') {
    createBackup();
  } else {
    console.log('الاستخدام: node backup-restore-production.js backup');
  }
}