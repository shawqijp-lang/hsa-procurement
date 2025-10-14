#!/usr/bin/env node

/**
 * سكريبت استعادة بيانات شركة الحديدة إلى نظام التطوير الحالي
 * ينسخ البيانات مباشرة من الملف المستخرج إلى قاعدة البيانات
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

neonConfig.webSocketConstructor = ws;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function restoreHodeidahToDevelopment() {
  console.log('🔄 استعادة بيانات شركة الحديدة إلى نظام التطوير...');
  
  const dataPath = join(__dirname, 'hodeidah-company-data.json');
  
  if (!existsSync(dataPath)) {
    console.error('❌ ملف hodeidah-company-data.json غير موجود');
    process.exit(1);
  }
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ مطلوب رابط قاعدة البيانات');
    process.exit(1);
  }
  
  const pool = new Pool({ connectionString: dbUrl });
  
  try {
    const hodeidahData = JSON.parse(readFileSync(dataPath, 'utf8'));
    console.log(`📅 استعادة البيانات من: ${hodeidahData.timestamp}`);

    const data = hodeidahData.data;
    
    // حذف البيانات الموجودة لشركة الحديدة (ID = 2) بالترتيب الصحيح
    console.log('🧹 حذف البيانات الموجودة لشركة الحديدة...');
    
    // حذف التقييمات أولاً
    await pool.query('DELETE FROM daily_checklists WHERE user_id IN (SELECT id FROM users WHERE company_id = 2)');
    
    // حذف إعدادات لوحة التحكم للمستخدمين
    try {
      await pool.query('DELETE FROM user_dashboard_settings WHERE user_id IN (SELECT id FROM users WHERE company_id = 2)');
    } catch (error) {
      console.log('   ⚠️ تجاهل: جدول user_dashboard_settings غير موجود');
    }
    
    // حذف صلاحيات المواقع للمستخدمين
    try {
      await pool.query('DELETE FROM user_location_permissions WHERE location_id IN (SELECT id FROM locations WHERE company_id = 2)');
    } catch (error) {
      console.log('   ⚠️ تجاهل: جدول user_location_permissions غير موجود');
    }
    
    // حذف محاولات تسجيل الدخول
    try {
      await pool.query('DELETE FROM login_attempts WHERE identifier IN (SELECT username FROM users WHERE company_id = 2)');
    } catch (error) {
      console.log('   ⚠️ تجاهل: جدول login_attempts غير موجود');
    }
    
    // حذف القوالب
    await pool.query('DELETE FROM checklist_templates WHERE company_id = 2');
    
    // حذف المواقع
    await pool.query('DELETE FROM locations WHERE company_id = 2');
    
    // حذف المستخدمين
    await pool.query('DELETE FROM users WHERE company_id = 2');
    
    console.log('✅ تم حذف البيانات القديمة');
    
    // استعادة المستخدمين
    console.log(`👥 استعادة ${data.users.length} مستخدم...`);
    const userIdMap = new Map();
    
    for (const user of data.users) {
      const result = await pool.query(
        'INSERT INTO users (username, password, role, company_id, full_name, is_active, last_login_at, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
        [user.username, user.password, user.role, user.company_id, user.full_name, user.is_active, user.last_login_at, user.created_at]
      );
      userIdMap.set(user.id, result.rows[0].id);
      console.log(`   ✓ ${user.username} (${user.role})`);
    }

    // استعادة المواقع
    console.log(`📍 استعادة ${data.locations.length} موقع...`);
    const locationIdMap = new Map();
    
    for (const location of data.locations) {
      const result = await pool.query(
        'INSERT INTO locations (name_ar, name_en, icon, company_id, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [location.name_ar, location.name_en, location.icon, location.company_id, location.created_at]
      );
      locationIdMap.set(location.id, result.rows[0].id);
      console.log(`   ✓ ${location.name_ar}`);
    }

    // استعادة القوالب
    console.log(`📋 استعادة ${data.checklist_templates.length} قالب...`);
    
    for (const template of data.checklist_templates) {
      const newLocationId = template.location_id ? locationIdMap.get(template.location_id) : null;
      await pool.query(
        'INSERT INTO checklist_templates (location_id, category_ar, category_en, task_ar, task_en, description_ar, description_en, "order", is_active, sub_points, sub_tasks, multi_tasks, order_index, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)',
        [newLocationId, template.category_ar, template.category_en, template.task_ar, template.task_en, template.description_ar, template.description_en, template.order, template.is_active, JSON.stringify(template.sub_points), JSON.stringify(template.sub_tasks), JSON.stringify(template.multi_tasks), template.order_index, template.company_id]
      );
    }

    // استعادة التقييمات (تحويل البنية القديمة إلى الجديدة)
    console.log(`✅ استعادة ${data.daily_checklists.length} تقييم...`);
    
    for (const checklist of data.daily_checklists) {
      const newUserId = userIdMap.get(checklist.user_id);
      const newLocationId = locationIdMap.get(checklist.location_id);
      
      if (newUserId && newLocationId && checklist.date) {    
        // تحويل responses إلى تنسيق tasks الجديد
        const tasks = checklist.responses || {};
        
        await pool.query(
          'INSERT INTO daily_checklists (user_id, location_id, checklist_date, tasks, completed_at, created_at, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [newUserId, newLocationId, checklist.date, JSON.stringify(tasks), checklist.date, checklist.created_at, 2]
        );
      }
    }

    console.log('\n🎉 تم استعادة جميع بيانات شركة الحديدة بنجاح!');
    console.log('📊 تم استعادة:');
    console.log(`   ✓ ${data.users.length} مستخدم`);
    console.log(`   ✓ ${data.locations.length} موقع`);
    console.log(`   ✓ ${data.checklist_templates.length} قالب`);
    console.log(`   ✓ ${data.daily_checklists.length} تقييم`);
    
    // عرض تفاصيل المواقع المستعادة
    console.log('\n📍 المواقع المستعادة:');
    for (const location of data.locations) {
      console.log(`   • ${location.name_ar}`);
    }
    
  } catch (error) {
    console.error('❌ خطأ في استعادة البيانات:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// تشغيل الاستعادة
restoreHodeidahToDevelopment();