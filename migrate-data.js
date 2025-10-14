/**
 * أداة تحويل البيانات القديمة - تشغيل مباشر
 * تحويل المهام الفرعية من النص المجمع إلى بيانات منفصلة
 */
const { execSync } = require('child_process');

console.log('🔄 بدء تحويل البيانات القديمة...');

try {
  // استدعاء API endpoint مباشرة
  const result = execSync(`curl -X POST http://localhost:5000/api/admin/migrate-evaluation-data \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_TOKEN_HERE" \
    -s`, 
    { encoding: 'utf8' }
  );
  
  console.log('📊 نتائج التحويل:');
  console.log(JSON.parse(result));
  
} catch (error) {
  console.error('❌ خطأ في تحويل البيانات:', error.message);
}

console.log('\n📌 **ملخص الإصلاح:**');
console.log('✅ التقييمات الجديدة: ستظهر بالشكل المحدث');
console.log('🔄 التقييمات القديمة: تحتاج تشغيل أداة التحويل');
console.log('💾 تعليقات الفئات: ستُحفظ في التقييمات الجديدة');
console.log('📈 التقرير التفصيلي: أعمدة منفصلة لكل مهمة فرعية');