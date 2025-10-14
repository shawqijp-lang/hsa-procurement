#!/usr/bin/env node

/**
 * سكريبت استخراج بيانات شركة الحديدة فقط
 * يستخرج جميع البيانات المتعلقة بشركة الألبان والأغذية الوطنية الحديدة
 */

import { Pool } from '@neondatabase/serverless';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function extractHodeidahCompanyData() {
  console.log('🏭 استخراج بيانات شركة الحديدة فقط...');
  
  const productionDbUrl = process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!productionDbUrl) {
    console.error('❌ مطلوب رابط قاعدة بيانات الإنتاج');
    console.log('💡 تشغيل الأمر:');
    console.log('   PRODUCTION_DATABASE_URL=your_db_url node extract-hodeidah-company-only.js');
    process.exit(1);
  }
  
  const pool = new Pool({ connectionString: productionDbUrl });
  
  try {
    // البحث عن شركة الحديدة
    console.log('🔍 البحث عن شركة الحديدة...');
    const hodeidahCompany = await pool.query(
      "SELECT * FROM companies WHERE name_ar LIKE '%الحديدة%' OR name_ar LIKE '%الألبان والأغذية الوطنية الحديدة%'"
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
    
    // إعدادات لوحة التحكم
    let dashboardSettings = { rows: [] };
    if (userIds.length > 0) {
      dashboardSettings = await pool.query(
        'SELECT * FROM dashboard_settings WHERE user_id = ANY($1) ORDER BY id', 
        [userIds]
      );
    }
    console.log(`⚙️ الإعدادات: ${dashboardSettings.rows.length}`);
    
    // إنشاء ملف البيانات
    const hodeidahData = {
      timestamp: new Date().toISOString(),
      source: 'production',
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
    
    // إنشاء سكريبت SQL للاستيراد
    await generateHodeidahImportScript(hodeidahData);
    
  } catch (error) {
    console.error('❌ خطأ في استخراج البيانات:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function generateHodeidahImportScript(hodeidahData) {
  console.log('\n🔧 إنشاء سكريبت الاستيراد المخصص...');
  
  let sqlScript = `-- سكريبت استيراد بيانات شركة الحديدة فقط
-- تم الاستخراج في: ${hodeidahData.timestamp}
-- الشركة الأصلية: ${hodeidahData.data.companies[0].name_ar}

-- إنشاء الشركة
INSERT INTO companies (name_ar, name_en, manager_name, created_at, updated_at) 
VALUES ('${hodeidahData.data.companies[0].name_ar}', 
        '${hodeidahData.data.companies[0].name_en || ''}', 
        '${hodeidahData.data.companies[0].manager_name || ''}', 
        '${hodeidahData.data.companies[0].created_at}', 
        '${hodeidahData.data.companies[0].updated_at}');

-- الحصول على ID الشركة الجديدة
DO $$
DECLARE
    new_company_id INTEGER;
BEGIN
    SELECT id INTO new_company_id FROM companies WHERE name_ar = '${hodeidahData.data.companies[0].name_ar}';
    
`;

  // إضافة المستخدمين
  if (hodeidahData.data.users.length > 0) {
    sqlScript += `    -- إنشاء المستخدمين\n`;
    for (const user of hodeidahData.data.users) {
      sqlScript += `    INSERT INTO users (username, password_hash, role, company_id, full_name, created_at, updated_at) 
    VALUES ('${user.username}', '${user.password_hash}', '${user.role}', new_company_id, '${user.full_name || ''}', '${user.created_at}', '${user.updated_at}');\n`;
    }
    sqlScript += '\n';
  }

  // إضافة المواقع
  if (hodeidahData.data.locations.length > 0) {
    sqlScript += `    -- إنشاء المواقع\n`;
    for (const location of hodeidahData.data.locations) {
      const name_ar = location.name_ar ? location.name_ar.replace(/'/g, "''") : '';
      const name_en = location.name_en ? location.name_en.replace(/'/g, "''") : '';
      sqlScript += `    INSERT INTO locations (name_ar, name_en, icon, company_id, created_at, updated_at) 
    VALUES ('${name_ar}', '${name_en}', '${location.icon}', new_company_id, '${location.created_at}', '${location.updated_at}');\n`;
    }
    sqlScript += '\n';
  }

  sqlScript += `END $$;

-- ملاحظة: لإكمال استيراد القوالب والتقييمات، ستحتاج لربطها بالمواقع والمستخدمين الجدد
-- يُنصح باستخدام النظام التلقائي في الخادم لهذا الغرض
`;

  const scriptPath = join(__dirname, 'import-hodeidah-only.sql');
  writeFileSync(scriptPath, sqlScript, 'utf8');
  
  console.log(`✅ تم إنشاء سكريبت الاستيراد: ${scriptPath}`);
}

// تشغيل الاستخراج
extractHodeidahCompanyData();