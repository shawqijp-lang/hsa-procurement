#!/usr/bin/env node

/**
 * سكريبت استخراج البيانات من الإنتاج الحالي
 * يتصل بقاعدة بيانات الإنتاج ويستخرج جميع البيانات المضافة
 */

import { Pool } from '@neondatabase/serverless';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function extractProductionData() {
  console.log('🌐 الاتصال بقاعدة بيانات الإنتاج...');
  
  // استخدم رابط قاعدة بيانات الإنتاج
  const productionDbUrl = process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!productionDbUrl) {
    console.error('❌ مطلوب رابط قاعدة بيانات الإنتاج');
    console.log('💡 قم بتشغيل الأمر مع متغير البيئة:');
    console.log('   PRODUCTION_DATABASE_URL=your_production_db_url node extract-production-data.js');
    process.exit(1);
  }
  
  const pool = new Pool({ connectionString: productionDbUrl });
  
  try {
    console.log('📊 استخراج جميع البيانات من الإنتاج...');
    
    // استخراج البيانات من جميع الجداول
    const tables = [
      'companies',
      'users', 
      'locations',
      'checklist_templates',
      'daily_checklists',
      'dashboard_settings'
    ];
    
    const extractedData = {
      timestamp: new Date().toISOString(),
      source: 'production',
      data: {}
    };
    
    for (const table of tables) {
      try {
        console.log(`📋 استخراج بيانات ${table}...`);
        const result = await pool.query(`SELECT * FROM ${table} ORDER BY id`);
        extractedData.data[table] = result.rows;
        console.log(`   ✅ تم استخراج ${result.rows.length} سجل من ${table}`);
      } catch (error) {
        console.log(`   ⚠️ تخطي ${table}: ${error.message}`);
        extractedData.data[table] = [];
      }
    }
    
    // حفظ البيانات
    const outputPath = join(__dirname, 'production-data-extracted.json');
    writeFileSync(outputPath, JSON.stringify(extractedData, null, 2), 'utf8');
    
    console.log('\n✅ تم استخراج البيانات بنجاح!');
    console.log(`📄 ملف البيانات: ${outputPath}`);
    console.log('\n📊 ملخص البيانات المستخرجة:');
    
    let totalRecords = 0;
    for (const [table, records] of Object.entries(extractedData.data)) {
      console.log(`   - ${table}: ${records.length} سجل`);
      totalRecords += records.length;
    }
    
    console.log(`📈 إجمالي السجلات: ${totalRecords}`);
    
    // إنشاء سكريبت SQL للاستيراد
    await generateImportScript(extractedData);
    
  } catch (error) {
    console.error('❌ خطأ في استخراج البيانات:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function generateImportScript(extractedData) {
  console.log('\n🔧 إنشاء سكريبت الاستيراد...');
  
  let sqlScript = `-- سكريبت استيراد بيانات الإنتاج
-- تم الاستخراج في: ${extractedData.timestamp}
-- المصدر: ${extractedData.source}

-- تنظيف البيانات الموجودة
TRUNCATE TABLE dashboard_settings, daily_checklists, checklist_templates, locations, users, companies RESTART IDENTITY CASCADE;

`;

  // ترتيب الجداول حسب التبعيات
  const tableOrder = ['companies', 'users', 'locations', 'checklist_templates', 'daily_checklists', 'dashboard_settings'];
  
  for (const table of tableOrder) {
    const records = extractedData.data[table] || [];
    if (records.length === 0) continue;
    
    sqlScript += `-- استيراد ${table}\n`;
    
    for (const record of records) {
      const columns = Object.keys(record).join(', ');
      const values = Object.values(record).map(value => {
        if (value === null) return 'NULL';
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
        if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        return value;
      }).join(', ');
      
      sqlScript += `INSERT INTO ${table} (${columns}) VALUES (${values});\n`;
    }
    sqlScript += '\n';
  }
  
  // إعادة تعيين sequences
  sqlScript += `-- إعادة تعيين sequences\n`;
  for (const table of tableOrder) {
    sqlScript += `SELECT setval('${table}_id_seq', (SELECT COALESCE(MAX(id), 1) FROM ${table}));\n`;
  }
  
  const scriptPath = join(__dirname, 'import-production-data.sql');
  writeFileSync(scriptPath, sqlScript, 'utf8');
  
  console.log(`✅ تم إنشاء سكريبت الاستيراد: ${scriptPath}`);
}

// تشغيل الاستخراج
extractProductionData();