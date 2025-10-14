import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const neonConnectionString = process.argv[2];
if (!neonConnectionString) {
  console.error('❌ الرجاء تمرير Neon connection string كمعامل');
  console.error('مثال: tsx migration-scripts/import-sql-to-neon.ts "postgresql://..."');
  process.exit(1);
}

const sqlFile = process.argv[3] || 'production_export.sql';

console.log('🚀 بدء استيراد البيانات إلى Neon...\n');
console.log(`📁 قراءة الملف: ${sqlFile}`);

try {
  // قراءة ملف SQL
  const sqlContent = readFileSync(sqlFile, 'utf-8');
  
  console.log(`✅ تم قراءة الملف بنجاح (${(sqlContent.length / 1024).toFixed(2)} KB)\n`);
  
  // الاتصال بـ Neon
  const sql = neon(neonConnectionString);
  
  console.log('🔗 الاتصال بـ Neon...');
  
  // تقسيم SQL إلى أوامر منفصلة
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`📊 عدد الأوامر: ${statements.length}\n`);
  console.log('⏳ جاري التنفيذ...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  // تنفيذ كل أمر على حدة
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    try {
      await sql(statement);
      successCount++;
      
      // عرض التقدم كل 10 أوامر
      if ((i + 1) % 10 === 0 || (i + 1) === statements.length) {
        console.log(`  ✓ تم تنفيذ ${i + 1}/${statements.length} أمر`);
      }
    } catch (error: any) {
      // تجاهل أخطاء "already exists" و "does not exist"
      if (
        error.message?.includes('already exists') ||
        error.message?.includes('does not exist') ||
        error.message?.includes('duplicate key')
      ) {
        successCount++;
      } else {
        errorCount++;
        console.error(`  ⚠️  خطأ في الأمر ${i + 1}:`, error.message?.substring(0, 100));
      }
    }
  }
  
  console.log('\n🎉 اكتمل الاستيراد!\n');
  console.log('📊 النتائج:');
  console.log(`   ✅ نجح: ${successCount}`);
  console.log(`   ⚠️  أخطاء: ${errorCount}`);
  
  if (errorCount === 0) {
    console.log('\n✨ تم نقل جميع البيانات بنجاح!\n');
  } else {
    console.log('\n⚠️  بعض الأوامر فشلت، لكن معظم البيانات تم نقلها.\n');
  }
  
} catch (error) {
  console.error('❌ خطأ أثناء الاستيراد:', error);
  process.exit(1);
}
