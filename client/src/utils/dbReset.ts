// مساعد لإعادة تعيين قاعدة البيانات
export const resetIndexedDB = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // قائمة قواعد البيانات المحتملة
    const dbNames = ['HSA_WorkEnvironment_Local', 'HSA_WorkEnvironment', 'workEnvironmentDB', 'HSAGroupDB', 'HSA_Local_DB'];
    
    let completed = 0;
    const total = dbNames.length;
    
    dbNames.forEach(dbName => {
      const deleteRequest = indexedDB.deleteDatabase(dbName);
      
      deleteRequest.onsuccess = () => {
        console.log(`✅ تم حذف قاعدة البيانات: ${dbName}`);
        completed++;
        if (completed === total) {
          console.log('🔄 تم حذف جميع قواعد البيانات - جاهز للإعادة الإنشاء');
          resolve();
        }
      };
      
      deleteRequest.onerror = () => {
        console.log(`⚠️ لم يتم العثور على قاعدة البيانات: ${dbName}`);
        completed++;
        if (completed === total) {
          resolve();
        }
      };
      
      deleteRequest.onblocked = () => {
        console.log(`🚫 قاعدة البيانات محجوبة: ${dbName}`);
        completed++;
        if (completed === total) {
          resolve();
        }
      };
    });
  });
};