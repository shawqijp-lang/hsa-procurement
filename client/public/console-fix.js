// حل سريع من الكونسول
console.log(`
🚨 === حل سريع لمشكلة قاعدة البيانات ===

لحل المشكلة فوراً، انسخ والصق هذا الأمر في الكونسول:

=== بداية الكود ===
(async () => {
  console.log('🔄 بدء إصلاح قاعدة البيانات...');
  const dbs = ['HSA_WorkEnvironment_Local', 'HSA_WorkEnvironment', 'workEnvironmentDB'];
  for (const db of dbs) {
    try {
      await new Promise(r => {
        const req = indexedDB.deleteDatabase(db);
        req.onsuccess = req.onerror = req.onblocked = () => r();
      });
      console.log('✅ تم مسح:', db);
    } catch(e) { console.log('⚠️ تخطي:', db); }
  }
  localStorage.clear();
  sessionStorage.clear();
  console.log('✅ تم الإصلاح - إعادة تحميل...');
  setTimeout(() => location.reload(), 1000);
})();
=== نهاية الكود ===

أو اكتب في الكونسول: quickFix()
`);

window.quickFix = async () => {
  console.log('🔄 بدء الإصلاح السريع...');
  const dbs = ['HSA_WorkEnvironment_Local', 'HSA_WorkEnvironment', 'workEnvironmentDB'];
  for (const db of dbs) {
    try {
      await new Promise(resolve => {
        const req = indexedDB.deleteDatabase(db);
        req.onsuccess = req.onerror = req.onblocked = () => resolve();
      });
      console.log('✅ تم مسح:', db);
    } catch(e) { 
      console.log('⚠️ تخطي:', db); 
    }
  }
  localStorage.clear();
  sessionStorage.clear();
  console.log('✅ تم الإصلاح - إعادة تحميل...');
  setTimeout(() => location.reload(), 1000);
};