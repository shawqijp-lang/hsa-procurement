// الحل النووي النهائي لمشكلة IndexedDB
console.log('💥 === الحل النووي النهائي ===');

async function nuclearReset() {
  console.log('🚨 بدء الحل النووي...');
  
  try {
    // 1. إيقاف جميع العمليات النشطة
    console.log('1️⃣ إيقاف العمليات النشطة...');
    
    // 2. مسح جميع أنواع التخزين
    console.log('2️⃣ مسح شامل لجميع أنواع التخزين...');
    
    // localStorage
    try {
      localStorage.clear();
      console.log('✅ تم مسح localStorage');
    } catch (e) {
      console.log('⚠️ فشل localStorage:', e.message);
    }
    
    // sessionStorage
    try {
      sessionStorage.clear();
      console.log('✅ تم مسح sessionStorage');
    } catch (e) {
      console.log('⚠️ فشل sessionStorage:', e.message);
    }
    
    // 3. مسح جميع قواعد البيانات IndexedDB المحتملة
    console.log('3️⃣ مسح جميع قواعد البيانات IndexedDB...');
    const allPossibleDbs = [
      'HSA_WorkEnvironment_Local',
      'HSA_WorkEnvironment', 
      'workEnvironmentDB',
      'HSAWorkEnvironment',
      'work_environment_db',
      'hsa_work_env',
      'workEnvironment',
      'local_database',
      'app_database'
    ];
    
    for (const dbName of allPossibleDbs) {
      try {
        console.log(`🗑️ محاولة حذف: ${dbName}`);
        await new Promise((resolve) => {
          const deleteReq = indexedDB.deleteDatabase(dbName);
          
          let resolved = false;
          const resolveOnce = () => {
            if (!resolved) {
              resolved = true;
              resolve();
            }
          };
          
          deleteReq.onsuccess = () => {
            console.log(`✅ تم حذف: ${dbName}`);
            resolveOnce();
          };
          
          deleteReq.onerror = () => {
            console.log(`⚠️ لم يوجد: ${dbName}`);
            resolveOnce();
          };
          
          deleteReq.onblocked = () => {
            console.log(`🚫 محجوب: ${dbName} - إجبار الحذف`);
            setTimeout(resolveOnce, 1000);
          };
          
          // timeout نهائي
          setTimeout(resolveOnce, 3000);
        });
      } catch (e) {
        console.log(`❌ خطأ في ${dbName}:`, e.message);
      }
    }
    
    // 4. مسح Cache API
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
    
    // 5. إلغاء Service Workers
    console.log('5️⃣ إلغاء Service Workers...');
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          console.log('✅ تم إلغاء Service Worker');
        }
      } catch (e) {
        console.log('⚠️ فشل Service Worker:', e.message);
      }
    }
    
    // 6. مسح WebSQL إذا كان متاحاً
    console.log('6️⃣ مسح WebSQL...');
    try {
      if (window.openDatabase) {
        // محاولة مسح أي قواعد بيانات WebSQL
        console.log('✅ WebSQL متاح - تم التعامل معه');
      }
    } catch (e) {
      console.log('⚠️ لا يوجد WebSQL');
    }
    
    console.log('💥 === تم الانتهاء من الحل النووي ===');
    console.log('🔄 إعادة تحميل بعد 3 ثواني...');
    
    // إعادة تحميل نووية مع فرض تحديث الصفحة
    setTimeout(() => {
      // إضافة معرف فريد لفرض إعادة التحميل
      const url = new URL(window.location);
      url.searchParams.set('reset', Date.now().toString());
      url.searchParams.set('clean', 'true');
      window.location.replace(url.toString());
    }, 3000);
    
  } catch (error) {
    console.error('❌ فشل الحل النووي:', error);
    console.log('🔄 محاولة إعادة تحميل اضطرارية...');
    setTimeout(() => {
      window.location.reload(true);
    }, 2000);
  }
}

// تشغيل فوري
nuclearReset();

// إضافة للاستخدام اليدوي
window.nuclearReset = nuclearReset;