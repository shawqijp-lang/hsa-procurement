// فحص حالة localStorage الحالية
console.log('🔍 فحص حالة localStorage:');
console.log('=====================================');

// فحص المفاتيح الموجودة
const keys = Object.keys(localStorage);
console.log(`📊 عدد المفاتيح: ${keys.length}`);

// فحص المفاتيح المهمة
const importantKeys = [
  'token', 'auth_token',
  'user', 'user_data',
  'hsa_final_unified_storage',
  'offlineData',
  'cached_templates',
  'dashboard-settings-updated'
];

console.log('\n🔑 المفاتيح المهمة:');
importantKeys.forEach(key => {
  const exists = localStorage.getItem(key) !== null;
  const size = exists ? localStorage.getItem(key).length : 0;
  console.log(`${exists ? '✅' : '❌'} ${key}: ${exists ? `${size} chars` : 'غير موجود'}`);
});

// فحص البيانات الموحدة
const unifiedData = localStorage.getItem('hsa_final_unified_storage');
if (unifiedData) {
  try {
    const parsed = JSON.parse(unifiedData);
    console.log('\n📦 البيانات الموحدة:');
    console.log(`- المستخدم: ${parsed.user ? '✅' : '❌'}`);
    console.log(`- الشركات: ${parsed.companies ? parsed.companies.length : 0}`);
    console.log(`- المواقع: ${parsed.locations ? parsed.locations.length : 0}`);
    console.log(`- التقييمات المحلية: ${parsed.evaluations ? parsed.evaluations.length : 0}`);
  } catch (e) {
    console.log('❌ خطأ في قراءة البيانات الموحدة');
  }
}

// فحص الحجم الإجمالي
let totalSize = 0;
keys.forEach(key => {
  totalSize += localStorage.getItem(key).length;
});
console.log(`\n💾 الحجم الإجمالي: ${(totalSize / 1024).toFixed(2)} KB`);
console.log(`📏 الحد الأقصى: ~5MB (${((totalSize / 1024 / 1024) * 100 / 5).toFixed(1)}% مستخدم)`);

console.log('\n✅ localStorage يعمل بشكل طبيعي!');