// الحل النهائي الجذري لمشكلة IndexedDB
console.log('🚨 === الحل النهائي لمشكلة قاعدة البيانات ===');

async function ultimateFix() {
  console.log('🔄 بدء الحل النهائي...');
  
  try {
    // الخطوة 1: إغلاق جميع الاتصالات النشطة
    console.log('1️⃣ إغلاق الاتصالات النشطة...');
    
    // الخطوة 2: مسح جميع قواعد البيانات المحتملة
    console.log('2️⃣ مسح جميع قواعد البيانات...');
    const allPossibleDbs = [
      'HSA_WorkEnvironment_Local',
      'HSA_WorkEnvironment', 
      'workEnvironmentDB',
      'HSAWorkEnvironment',
      'work_environment_db',
      'hsa_work_env'
    ];
    
    for (const dbName of allPossibleDbs) {
      try {
        console.log(`🗑️ محاولة حذف: ${dbName}`);
        await new Promise((resolve) => {
          const deleteReq = indexedDB.deleteDatabase(dbName);
          deleteReq.onsuccess = () => {
            console.log(`✅ تم حذف: ${dbName}`);
            resolve();
          };
          deleteReq.onerror = () => {
            console.log(`⚠️ لم يوجد: ${dbName}`);
            resolve();
          };
          deleteReq.onblocked = () => {
            console.log(`🚫 محجوب: ${dbName}`);
            // محاولة إجبار الحذف
            setTimeout(() => resolve(), 2000);
          };
        });
      } catch (e) {
        console.log(`❌ خطأ في ${dbName}:`, e.message);
      }
    }
    
    // الخطوة 3: مسح جميع أنواع التخزين
    console.log('3️⃣ مسح جميع أنواع التخزين...');
    try {
      localStorage.clear();
      console.log('✅ تم مسح localStorage');
    } catch (e) {
      console.log('⚠️ فشل localStorage:', e.message);
    }
    
    try {
      sessionStorage.clear();
      console.log('✅ تم مسح sessionStorage');
    } catch (e) {
      console.log('⚠️ فشل sessionStorage:', e.message);
    }
    
    // الخطوة 4: مسح Cache API إذا كان متاحاً
    console.log('4️⃣ مسح Cache API...');
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
          console.log(`✅ تم مسح cache: ${cacheName}`);
        }
      } catch (e) {
        console.log('⚠️ فشل في مسح Cache:', e.message);
      }
    }
    
    // الخطوة 5: مسح Service Worker إذا كان موجوداً
    console.log('5️⃣ إلغاء تسجيل Service Workers...');
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          console.log('✅ تم إلغاء تسجيل Service Worker');
        }
      } catch (e) {
        console.log('⚠️ فشل Service Worker:', e.message);
      }
    }
    
    console.log('✅ === تم الانتهاء من الحل النهائي ===');
    console.log('🔄 إعادة تحميل الصفحة خلال 3 ثواني...');
    
    // إعادة تحميل قوية
    setTimeout(() => {
      window.location.href = window.location.href + '?fresh=' + Date.now();
    }, 3000);
    
  } catch (error) {
    console.error('❌ فشل الحل النهائي:', error);
    console.log('🔄 محاولة إعادة تحميل عادية...');
    setTimeout(() => {
      window.location.reload(true);
    }, 2000);
  }
}

// تشغيل فوري
ultimateFix();

// إضافة للاستخدام اليدوي
window.ultimateFix = ultimateFix;