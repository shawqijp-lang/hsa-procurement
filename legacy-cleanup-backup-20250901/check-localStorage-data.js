// فحص البيانات الموجودة في localStorage
console.log('🔍 فحص البيانات في localStorage...');

// فحص التقييمات المحفوظة في secure_evaluations
const secureEvaluations = localStorage.getItem('secure_evaluations');
if (secureEvaluations) {
  console.log('📊 عثر على بيانات في secure_evaluations');
  console.log('الحجم:', secureEvaluations.length, 'حرف');
  
  try {
    // محاولة فك التشفير إذا كانت مشفرة
    const decrypted = window.atob(secureEvaluations);
    console.log('📝 البيانات بعد فك التشفير:', decrypted.substring(0, 200) + '...');
  } catch (error) {
    console.log('❌ البيانات ليست مشفرة أو فك التشفير فشل');
    console.log('📝 البيانات الخام:', secureEvaluations.substring(0, 200) + '...');
  }
} else {
  console.log('❌ لا توجد بيانات في secure_evaluations');
}

// فحص باقي المفاتيح ذات الصلة
const relevantKeys = [
  'offline_evaluations',
  'offlineData', 
  'syncQueue',
  'secureOfflineAuth',
  'hsa_final_unified_storage'
];

relevantKeys.forEach(key => {
  const data = localStorage.getItem(key);
  if (data) {
    console.log(`✅ عثر على بيانات في ${key}:`, data.length, 'حرف');
  } else {
    console.log(`❌ لا توجد بيانات في ${key}`);
  }
});

console.log('🏁 انتهى فحص localStorage');