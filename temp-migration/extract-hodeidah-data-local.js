#!/usr/bin/env node

/**
 * سكريبت استخراج بيانات شركة الحديدة فقط - النسخة المحلية
 * يعمل مع قاعدة البيانات المحلية في التطوير
 */

// استيراد مباشر للاتصال بقاعدة البيانات
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function extractHodeidahCompanyData() {
  console.log('🏭 استخراج بيانات شركة الحديدة من قاعدة البيانات الحالية...');
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ مطلوب رابط قاعدة البيانات');
    process.exit(1);
  }
  
  const pool = new Pool({ connectionString: dbUrl });
  
  try {
    // البحث عن شركة الحديدة
    console.log('🔍 البحث عن شركة الحديدة...');
    const hodeidahCompany = await pool.query(
      "SELECT * FROM companies WHERE id = 2"
    );
    
    if (hodeidahCompany.rows.length === 0) {
      console.error('❌ لم يتم العثور على شركة الحديدة');
      process.exit(1);
    }
    
    const company = hodeidahCompany.rows[0];
    console.log(`✅ تم العثور على الشركة: ${company.name_ar} (ID: ${company.id})`);
    
    // استخراج بيانات الشركة والبيانات المرتبطة بها
    console.log('📊 استخراج البيانات المرتبطة...');
    
    // المستخدمين
    const users = await pool.query('SELECT * FROM users WHERE company_id = $1 ORDER BY id', [company.id]);
    console.log(`👥 المستخدمين: ${users.rows.length}`);
    
    // المواقع
    const locations = await pool.query('SELECT * FROM locations WHERE company_id = $1 ORDER BY id', [company.id]);
    console.log(`📍 المواقع: ${locations.rows.length}`);
    
    // القوالب
    const templates = await pool.query('SELECT * FROM checklist_templates WHERE company_id = $1 ORDER BY id', [company.id]);
    console.log(`📋 القوالب: ${templates.rows.length}`);
    
    // التقييمات (من المستخدمين التابعين للشركة)
    const userIds = users.rows.map(u => u.id);
    let checklists = { rows: [] };
    if (userIds.length > 0) {
      checklists = await pool.query(
        'SELECT * FROM daily_checklists WHERE user_id = ANY($1) ORDER BY id', 
        [userIds]
      );
    }
    console.log(`✅ التقييمات: ${checklists.rows.length}`);
    
    // إعدادات لوحة التحكم (تجاهل إذا كان الجدول غير موجود)
    let dashboardSettings = { rows: [] };
    try {
      if (userIds.length > 0) {
        dashboardSettings = await pool.query(
          'SELECT * FROM dashboard_settings WHERE user_id = ANY($1) ORDER BY id', 
          [userIds]
        );
      }
      console.log(`⚙️ الإعدادات: ${dashboardSettings.rows.length}`);
    } catch (error) {
      console.log('⚙️ الإعدادات: 0 (الجدول غير موجود - سيتم تجاهله)');
    }
    
    // إنشاء ملف البيانات
    const hodeidahData = {
      timestamp: new Date().toISOString(),
      source: 'local_development',
      company_focus: 'hodeidah_only',
      original_company_id: company.id,
      data: {
        companies: [company],
        users: users.rows,
        locations: locations.rows,
        checklist_templates: templates.rows,
        daily_checklists: checklists.rows,
        dashboard_settings: dashboardSettings.rows
      }
    };
    
    // حفظ الملف
    const outputPath = join(__dirname, 'hodeidah-company-data.json');
    writeFileSync(outputPath, JSON.stringify(hodeidahData, null, 2), 'utf8');
    
    console.log('\n✅ تم استخراج بيانات شركة الحديدة بنجاح!');
    console.log(`📄 ملف البيانات: ${outputPath}`);
    console.log('\n📊 ملخص البيانات:');
    console.log(`   - الشركة: ${company.name_ar}`);
    console.log(`   - المستخدمين: ${users.rows.length}`);
    console.log(`   - المواقع: ${locations.rows.length}`);
    console.log(`   - القوالب: ${templates.rows.length}`);
    console.log(`   - التقييمات: ${checklists.rows.length}`);
    console.log(`   - الإعدادات: ${dashboardSettings.rows.length}`);
    
    console.log('\n🎯 الخطوة التالية: انسخ ملف hodeidah-company-data.json إلى المشروع الجديد ثم اضغط Deploy');
    
  } catch (error) {
    console.error('❌ خطأ في استخراج البيانات:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// تشغيل الاستخراج
extractHodeidahCompanyData();