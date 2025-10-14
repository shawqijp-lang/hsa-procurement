/**
 * نظام تخزين مبسط جداً في ذاكرة الهاتف
 * فقط دالتين: حفظ + استرجاع
 */

let db: IDBDatabase | null = null;
const DB_NAME = 'PhoneStorage';
const DB_VERSION = 1;
const STORE_NAME = 'locations';

// تهيئة قاعدة البيانات المبسطة
async function initDB(): Promise<void> {
  if (db) return;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };
    
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
  });
}

// حفظ البيانات مع حماية هوية المستخدم
export async function saveToPhone(key: string, data: any, userId?: number): Promise<void> {
  try {
    await initDB();
    if (!db) throw new Error('قاعدة البيانات غير متاحة');
    
    // 🔐 [SECURITY_FIX] إضافة معرف المستخدم للبيانات المحفوظة
    const secureData = {
      _userId: userId, // معرف المستخدم لضمان الأمان
      _timestamp: Date.now(), // طابع زمني
      _data: data // البيانات الفعلية
    };
    
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(secureData, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    console.log(`📱 [SECURE] تم حفظ البيانات بأمان: ${key} للمستخدم: ${userId}`);
  } catch (error) {
    console.warn(`⚠️ فشل حفظ البيانات:`, error);
    throw error;
  }
}

// استرجاع البيانات مع التحقق من هوية المستخدم
export async function getFromPhone(key: string, currentUserId?: number): Promise<any> {
  try {
    await initDB();
    if (!db) return null;
    
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        
        if (result) {
          // 🔐 [SECURITY_CHECK] التحقق من هوية المستخدم
          if (result._userId !== undefined && currentUserId !== undefined) {
            if (result._userId !== currentUserId) {
              console.warn(`🚨 [SECURITY] رفض الوصول - مستخدم مختلف:`, {
                key,
                storedUserId: result._userId,
                currentUserId,
                action: 'blocked_access'
              });
              resolve(null);
              return;
            }
          }
          
          console.log(`📱 [SECURE] تم استرجاع البيانات بأمان: ${key} للمستخدم: ${currentUserId}`);
          // إرجاع البيانات الفعلية فقط (بدون metadata الأمان)
          resolve(result._data || result);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn(`⚠️ فشل استرجاع البيانات:`, error);
    return null;
  }
}

// مسح البيانات (اختياري)
export async function clearPhone(): Promise<void> {
  try {
    await initDB();
    if (!db) return;
    
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    console.log('📱 تم مسح جميع البيانات');
  } catch (error) {
    console.warn('⚠️ فشل مسح البيانات:', error);
  }
}