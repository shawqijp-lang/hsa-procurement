/**
 * 🚨 فحص سريع لأنظمة التخزين المحلي - HSA System
 */

console.log('🔍 بدء الفحص السريع لأنظمة التخزين المحلي...');

// قائمة بكل الأنظمة المحتملة ومفاتيحها
const storageSystems = {
  'useAuth.ts': ['auth_token', 'user_data', 'isAuthenticated'],
  'useSecureOffline.ts': ['secureOfflineAuth', 'offlineData', 'syncQueue', 'offlineKey'],
  'useSimpleAuth.ts': ['simpleAuth', 'simpleUser', 'simpleAuthKey'],
  'useStorageUnification.ts': ['unifiedStorage', 'migrationStatus', 'storageUnificationKey'],
  'useUnifiedOffline.ts': ['unified_offline_auth_token', 'unified_offline_user', 'unified_offline_data'],
  'FinalUnifiedStorage': ['hsa_final_unified_storage', 'hsa_final_migration_log'],
  'Emergency Systems': ['hsa_emergency_unified_storage', 'hsa_emergency_unification_complete', 'hsa_unification_lock']
};

console.log('📊 فحص localStorage...');
console.log('إجمالي مفاتيح localStorage:', localStorage.length);

let activeSystems = 0;
let totalDataFound = 0;
const foundSystems = [];

// فحص كل نظام
Object.entries(storageSystems).forEach(([systemName, keys]) => {
  let systemHasData = false;
  const foundKeys = [];
  
  keys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value !== null) {
      systemHasData = true;
      foundKeys.push(key);
      totalDataFound++;
    }
  });
  
  if (systemHasData) {
    activeSystems++;
    foundSystems.push({
      name: systemName,
      keys: foundKeys,
      keyCount: foundKeys.length
    });
  }
  
  console.log(`${systemHasData ? '🟢' : '🔴'} ${systemName}: ${systemHasData ? foundKeys.length + ' مفاتيح' : 'لا يوجد بيانات'}`);
});

console.log('\n📋 ملخص النتائج:');
console.log('إجمالي الأنظمة المفحوصة:', Object.keys(storageSystems).length);
console.log('الأنظمة النشطة (تحتوي على بيانات):', activeSystems);
console.log('إجمالي المفاتيح الموجودة:', totalDataFound);

// تقييم الحالة
let status = '';
let statusColor = '';
if (activeSystems === 0) {
  status = '❌ لا يوجد أي نظام نشط - مشكلة حرجة';
  statusColor = 'red';
} else if (activeSystems === 1) {
  status = '✅ نظام واحد فقط نشط - حالة مثالية';
  statusColor = 'green';
} else {
  status = `⚠️ يوجد ${activeSystems} أنظمة نشطة - تضارب متعدد`;
  statusColor = 'yellow';
}

console.log('\n🎯 التقييم النهائي:');
console.log(status);

if (foundSystems.length > 0) {
  console.log('\n📊 الأنظمة النشطة بالتفصيل:');
  foundSystems.forEach((system, index) => {
    console.log(`${index + 1}. ${system.name}:`);
    system.keys.forEach(key => {
      const value = localStorage.getItem(key);
      const valuePreview = value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'null';
      console.log(`   - ${key}: ${valuePreview}`);
    });
  });
}

console.log('\n💡 التوصيات:');
if (activeSystems === 0) {
  console.log('1. تنفيذ النظام النهائي الموحد فوراً');
  console.log('2. استعادة البيانات من النسخ الاحتياطية');
} else if (activeSystems === 1) {
  const activeSystem = foundSystems[0];
  if (activeSystem.name === 'FinalUnifiedStorage') {
    console.log('1. النظام في حالة مثالية - لا حاجة لإجراءات');
  } else {
    console.log('1. ترحيل للنظام النهائي الموحد');
    console.log('2. حذف النظام القديم المتبقي');
  }
} else {
  console.log('1. 🚨 تنفيذ التوحيد الفوري - يوجد تضارب متعدد');
  console.log('2. تنظيف كل الأنظمة القديمة');
  console.log('3. تفعيل النظام النهائي الموحد فقط');
}

console.log('\n🔗 للمزيد من التفاصيل، اذهب إلى: /storage-inspection');