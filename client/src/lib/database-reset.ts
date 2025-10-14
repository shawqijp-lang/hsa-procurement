/**
 * 🔧 إصلاح مشكلة قاعدة البيانات - حذف القديمة وإنشاء جديدة
 */

export async function resetIndexedDB(): Promise<boolean> {
  try {
    console.log('🧹 حذف قاعدة البيانات القديمة...');
    
    // حذف قاعدة البيانات القديمة
    await new Promise<void>((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase('HSA_WorkEnvironment_Local');
      
      deleteRequest.onsuccess = () => {
        console.log('✅ تم حذف قاعدة البيانات القديمة بنجاح');
        resolve();
      };
      
      deleteRequest.onerror = () => {
        console.error('❌ فشل في حذف قاعدة البيانات القديمة');
        reject(deleteRequest.error);
      };
    });
    
    // إعادة تهيئة قاعدة البيانات
    const { enhancedIndexedDB } = await import('./advancedLocalDatabase');
    await enhancedIndexedDB.initialize();
    
    console.log('🎉 تم إعادة إنشاء قاعدة البيانات بنجاح!');
    return true;
    
  } catch (error) {
    console.error('❌ فشل في إعادة تعيين قاعدة البيانات:', error);
    return false;
  }
}

/**
 * فحص ما إذا كانت المشكلة موجودة 
 */
export async function checkIndexedDBIssue(): Promise<boolean> {
  try {
    const { enhancedIndexedDB } = await import('./advancedLocalDatabase');
    await enhancedIndexedDB.getAuthData('test');
    return false; // لا توجد مشكلة
  } catch (error) {
    const errorMsg = (error as Error).message;
    return errorMsg.includes('object stores was not found');
  }
}