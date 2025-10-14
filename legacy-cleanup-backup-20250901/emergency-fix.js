// إصلاح طارئ لمشكلة IndexedDB
console.log('🚨 بدء الإصلاح الطارئ لقاعدة البيانات...');

async function emergencyDatabaseFix() {
  try {
    // مسح جميع قواعد البيانات المحتملة
    const databases = ['HSA_WorkEnvironment_Local', 'HSA_WorkEnvironment', 'workEnvironmentDB'];
    
    for (const dbName of databases) {
      try {
        await new Promise((resolve, reject) => {
          console.log(`🗑️ محاولة مسح: ${dbName}`);
          const deleteReq = indexedDB.deleteDatabase(dbName);
          
          deleteReq.onsuccess = () => {
            console.log(`✅ تم مسح: ${dbName}`);
            resolve(true);
          };
          
          deleteReq.onerror = () => {
            console.log(`⚠️ لم يتم العثور على: ${dbName}`);
            resolve(false);
          };
          
          deleteReq.onblocked = () => {
            console.log(`🚫 محجوب: ${dbName}`);
            resolve(false);
          };
          
          // timeout بعد 5 ثواني
          setTimeout(() => {
            console.log(`⏰ انتهت المهلة الزمنية: ${dbName}`);
            resolve(false);
          }, 5000);
        });
      } catch (error) {
        console.log(`❌ خطأ في مسح ${dbName}:`, error);
      }
    }
    
    // مسح localStorage أيضاً
    try {
      localStorage.clear();
      console.log('🧹 تم مسح localStorage');
    } catch (e) {
      console.log('⚠️ فشل في مسح localStorage:', e);
    }
    
    // مسح sessionStorage
    try {
      sessionStorage.clear();
      console.log('🧹 تم مسح sessionStorage');
    } catch (e) {
      console.log('⚠️ فشل في مسح sessionStorage:', e);
    }
    
    console.log('✅ تم الانتهاء من الإصلاح الطارئ');
    console.log('🔄 إعادة تحميل الصفحة خلال 3 ثواني...');
    
    setTimeout(() => {
      window.location.reload();
    }, 3000);
    
  } catch (error) {
    console.error('❌ فشل الإصلاح الطارئ:', error);
  }
}

// تشغيل الإصلاح
emergencyDatabaseFix();

// إضافة دالة للاستخدام اليدوي
window.emergencyFix = emergencyDatabaseFix;