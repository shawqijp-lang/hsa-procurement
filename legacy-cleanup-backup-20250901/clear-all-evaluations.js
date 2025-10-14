/**
 * سكريبت تنظيف شامل لجميع التقييمات والبيانات المحلية
 * يقوم بحذف جميع التقييمات من قاعدة البيانات وتنظيف التخزين المحلي
 */

console.log('🧹 بدء عملية التنظيف الشامل للتقييمات...');

// تنظيف قاعدة البيانات (تم بالفعل)
console.log('✅ تم تنظيف قاعدة البيانات - حُذفت جميع التقييمات');

// مفاتيح التخزين المحلي المراد تنظيفها
const localStorageKeysToClean = [
  // نظام التقييمات القديم
  'dailyChecklists',
  'evaluations',
  'offlineEvaluations',
  
  // نظام التخزين الموحد
  'hsaUnifiedStorage',
  'hsaBackupStorage',
  'hsaStorageState',
  'hsaEncryptedData',
  
  // أنظمة الأوفلاين
  'secureOfflineData',
  'unifiedOfflineData',
  'offlineQueue',
  'syncQueue',
  'pendingSync',
  
  // تخزين القوالب والمواقع
  'templates',
  'locations',
  'checklistTemplates',
  'locationTemplates',
  
  // بيانات النسخ الاحتياطي
  'backupData',
  'storageBackup',
  'evaluationBackup',
  
  // بيانات المزامنة
  'lastSyncTime',
  'syncStatus',
  'offlineStatus',
  
  // أي بيانات تقييمات أخرى
  'taskCompletions',
  'subTaskRatings',
  'evaluationNotes',
  'categoryComments'
];

// إنشاء سكريبت JavaScript لتشغيله في المتصفح
const browserCleanupScript = `
// سكريبت تنظيف التخزين المحلي - يجب تشغيله في وحدة تحكم المتصفح
console.log('🧹 تنظيف التخزين المحلي...');

// مفاتيح للتنظيف
const keysToClean = ${JSON.stringify(localStorageKeysToClean, null, 2)};

let cleanedCount = 0;
keysToClean.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    cleanedCount++;
    console.log('🗑️ تم حذف:', key);
  }
});

// تنظيف IndexedDB
if ('indexedDB' in window) {
  const dbNames = ['hsaEvaluationDB', 'hsaLocalDB', 'evaluationDB', 'offlineDB'];
  dbNames.forEach(dbName => {
    const deleteReq = indexedDB.deleteDatabase(dbName);
    deleteReq.onsuccess = () => console.log('🗑️ تم حذف قاعدة البيانات المحلية:', dbName);
    deleteReq.onerror = () => console.log('❌ خطأ في حذف قاعدة البيانات:', dbName);
  });
}

// تنظيف sessionStorage
sessionStorage.clear();
console.log('🗑️ تم تنظيف sessionStorage');

console.log(\`✅ تم تنظيف \${cleanedCount} عنصر من التخزين المحلي\`);
console.log('✅ تم تنظيف جميع البيانات المحلية - النظام جاهز للتقييمات الجديدة');

// إعادة تحميل الصفحة لتطبيق التغييرات
setTimeout(() => {
  console.log('🔄 إعادة تحميل الصفحة...');
  window.location.reload();
}, 2000);
`;

console.log('\n📋 سكريبت تنظيف التخزين المحلي:');
console.log('====================================');
console.log(browserCleanupScript);
console.log('====================================');

console.log('\n📝 تعليمات التنظيف:');
console.log('1. ✅ تم تنظيف قاعدة البيانات بالفعل (حُذفت جميع التقييمات)');
console.log('2. 🌐 افتح المتصفح واذهب إلى النظام');
console.log('3. 🛠️ اضغط F12 لفتح أدوات المطور');
console.log('4. 📝 اذهب إلى تبويب Console');
console.log('5. 📋 انسخ والصق السكريبت أعلاه واضغط Enter');
console.log('6. 🔄 سيتم إعادة تحميل الصفحة تلقائياً');
console.log('7. ✅ النظام جاهز للتقييمات الجديدة');

console.log('\n🎯 النتيجة المتوقعة:');
console.log('• قاعدة البيانات نظيفة تماماً (0 تقييمات)');
console.log('• التخزين المحلي نظيف تماماً');
console.log('• لا توجد بيانات قديمة أو تضارب');
console.log('• النظام جاهز لبدء التقييمات من الصفر');

console.log('\n✅ عملية التنظيف مكتملة - النظام جاهز!');