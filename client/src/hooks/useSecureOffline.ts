import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { enhancedIndexedDB } from '@/lib/enhancedIndexedDB';

interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
  companyId: number;
}

interface Company {
  id: number;
  nameAr: string;
  nameEn?: string;
}

interface LocationData {
  id: number;
  nameAr: string;
  nameEn: string;
  icon: string;
  completedTasks: number;
  totalTasks: number;
  status: string;
  progress: string;
  lastUpdated: string | null;
}

interface ChecklistTemplate {
  id: number;
  locationId: number;
  categoryAr: string;
  categoryEn: string;
  taskAr: string;
  taskEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  orderIndex: number;
  isActive: boolean;
  subPoints?: Array<{ ar: string; en?: string }>;
  subTasks?: Array<{ ar: string; en?: string }>;
  multiTasks?: Array<{ ar: string; en?: string }>;
}

interface OfflineEvaluation {
  // البنية الموحدة 100% مع قاعدة البيانات - المعرفات موحدة
  id: number; // معرف رقمي موحد مع الخادم
  locationId: number; // متطابق
  userId: number; // متطابق  
  companyId: number; // متطابق
  checklistDate: string; // نص متطابق مع الخادم
  tasks: Array<{
    templateId: number;
    completed: boolean;
    rating: number;
    notes?: string;
    itemComment?: string;
    subTaskRatings?: Array<{ subTaskId: number; rating: number }>;
  }>; // متطابق
  evaluationNotes?: string; // متطابق
  completedAt?: string; // نص متطابق مع الخادم
  createdAt?: string; // نص متطابق مع الخادم
  // حقول المزامنة المحلية
  timestamp: number; // وقت الحفظ المحلي -> syncTimestamp
  synced: boolean; // حالة المزامنة -> isSynced  
  encrypted: boolean; // حالة التشفير -> isEncrypted
  // معرف مؤقت للتقييمات غير المتزامنة
  tempId?: string; // معرف مؤقت قبل المزامنة
}

interface SecureOfflineData {
  user: User | null;
  companies: Company[];
  locations: LocationData[];
  templates: { [locationId: number]: ChecklistTemplate[] };
  evaluations: OfflineEvaluation[];
  lastSync: number;
  dataVersion: string;
  encryptionKey: string;
}

// Simple encryption for sensitive data
class SimpleEncryption {
  private static key = 'HSA_SECURE_2025';

  static encrypt(data: string): string {
    try {
      // Simple XOR encryption with safe base64 encoding for Arabic text
      const encrypted = data.split('').map((char, index) => 
        String.fromCharCode(char.charCodeAt(0) ^ this.key.charCodeAt(index % this.key.length))
      ).join('');
      
      // استخدام طريقة آمنة للترميز تدعم النص العربي
      try {
        const encoder = new TextEncoder();
        const uint8Array = encoder.encode(encrypted);
        const base64String = Array.from(uint8Array, (byte) => 
          String.fromCharCode(byte)
        ).join('');
        return btoa(base64String);
      } catch (arabicError) {
        // احتياطي: تجنب btoa مع النص العربي
        console.warn('⚠️ استخدام الترميز الاحتياطي للنص العربي');
        return encodeURIComponent(encrypted);
      }
    } catch (error) {
      console.error('Encryption failed:', error);
      return data;
    }
  }

  static decrypt(encryptedData: string): string {
    try {
      let decoded: string;
      
      // التحقق من نوع الترميز
      if (encryptedData.includes('%')) {
        // ترميز احتياطي لنص عربي
        decoded = decodeURIComponent(encryptedData);
      } else {
        // ترميز Base64 عادي
        try {
          const base64Decoded = window.atob(encryptedData);
          const decoder = new TextDecoder();
          const uint8Array = new Uint8Array(
            Array.from(base64Decoded, char => char.charCodeAt(0))
          );
          decoded = decoder.decode(uint8Array);
        } catch (arabicError) {
          // احتياطي مباشر
          decoded = window.atob(encryptedData);
        }
      }
      
      const decrypted = decoded.split('').map((char, index) => 
        String.fromCharCode(char.charCodeAt(0) ^ this.key.charCodeAt(index % this.key.length))
      ).join('');
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      return encryptedData;
    }
  }
}

// ⚠️ DEPRECATED: تم دمج هذا النظام في useAuth الموحد نهائياً
// 🚫 لا تستخدم هذا النظام - استخدم useAuth الموحد بدلاً منه
// هذا الملف سيتم إزالته لاحقاً
export const useSecureOffline = () => {
  // إرجاع نسخة بسيطة لتجنب كسر الكود الموجود
  return {
    isOffline: !navigator.onLine,
    offlineData: { user: null, companies: [], locations: [], evaluations: [] },
    saveAuthData: () => Promise.resolve(),
    verifyOfflineAuth: () => Promise.resolve(false),
    hasOfflineData: false,
    saveCompaniesData: () => {},
    saveLocationsData: () => {},
    getPendingCount: () => 0,
    triggerManualSync: () => Promise.resolve()
  };
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineData, setOfflineData] = useState<SecureOfflineData>({
    user: null,
    companies: [],
    locations: [],
    templates: {},
    evaluations: [],
    lastSync: 0,
    dataVersion: '1.0.0',
    encryptionKey: ''
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  const { toast } = useToast();

  // Network status monitoring with enhanced connection quality detection
  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout | null = null;
    let connectionQualityTimer: NodeJS.Timeout | null = null;

    const checkConnectionQuality = async (): Promise<'excellent' | 'good' | 'poor' | 'offline'> => {
      if (!navigator.onLine) return 'offline';

      // فحص جودة الاتصال بدون تخزين مؤقت
      const now = Date.now();

      const startTime = Date.now();
      try {
        // فحص بدون تخزين
        
        const response = await fetch('/api/version?_t=' + now, { 
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000)
        });
        
        const responseTime = Date.now() - startTime;
        
        if (response.ok) {
          if (responseTime < 500) return 'excellent';
          else if (responseTime < 2000) return 'good';
          else return 'poor';
        }
        return 'poor';
      } catch (error) {
        // في حالة الخطأ، لا تعيد المحاولة فوراً
        console.log('⚠️ فحص جودة الاتصال فشل - توقف مؤقت');
        return 'offline';
      }
    };

    const handleOnlineWithDelay = async () => {
      console.log('🌐 اكتشاف عودة الاتصال - التحقق من جودة الاتصال...');
      setIsOffline(false);
      
      // انتظار لضمان استقرار الاتصال
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const quality = await checkConnectionQuality();
      console.log(`📊 جودة الاتصال: ${quality}`);
      
      if (quality !== 'offline' && quality !== 'poor') {
        console.log('🔄 جودة اتصال مناسبة - بدء المزامنة التلقائية المحسنة');
        enhancedAutoSync(quality);
      } else if (quality === 'poor') {
        console.log('⚠️ جودة اتصال ضعيفة - مزامنة محدودة');
        // مزامنة محدودة للاتصال الضعيف
        enhancedAutoSync('poor');
      } else {
        console.log('❌ فشل في التحقق من جودة الاتصال - إعادة المحاولة لاحقاً');
        reconnectTimer = setTimeout(() => handleOnlineWithDelay(), 5000);
      }
    };
    
    const handleOffline = () => {
      console.log('📱 فقدان الاتصال - تفعيل الوضع المحلي المحسن');
      setIsOffline(true);
      
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      
      // حفظ فوري للبيانات المحلية عند فقدان الاتصال
      saveSecureData('lastSync', Date.now()).then(() => {
        console.log('💾 تم حفظ حالة المزامنة قبل فقدان الاتصال');
      }).catch((error) => {
        console.error('❌ فشل في حفظ حالة المزامنة:', error);
      });
    };

    window.addEventListener('online', handleOnlineWithDelay);
    window.addEventListener('offline', handleOffline);

    // Load cached data on mount
    loadOfflineData();

    // مراقبة ذكية للاتصال - فقط عند الحاجة الفعلية
    const startConnectionMonitoring = () => {
      // إلغاء المراقبة الدورية - سنعتمد على الأحداث فقط
      console.log('🎯 تفعيل المراقبة الذكية للاتصال - بدون تكرار غير مبرر');
      
      // فحص دوري جداً محدود - كل 5 دقائق فقط وفقط عند وجود بيانات معلقة
      connectionQualityTimer = setInterval(async () => {
        if (navigator.onLine && !isOffline && getPendingCount() > 0) {
          console.log('⏰ فحص دوري نادر - هناك بيانات معلقة للمزامنة');
          const quality = await checkConnectionQuality();
          
          if (quality === 'excellent') {
            console.log('🚀 جودة ممتازة - مزامنة البيانات المعلقة');
            enhancedAutoSync('excellent');
          }
        }
      }, 300000); // 5 دقائق كاملة
    };

    startConnectionMonitoring();

    return () => {
      window.removeEventListener('online', handleOnlineWithDelay);
      window.removeEventListener('offline', handleOffline);
      
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (connectionQualityTimer) clearInterval(connectionQualityTimer);
    };
  }, [isOffline]);

  // نظام تخزين موحد - بدون أي احتياطيات
  const saveSecureData = async (key: string, data: any): Promise<void> => {
    try {
      const encrypted = SimpleEncryption.encrypt(JSON.stringify(data));
      
      // نظام تخزين موحد - بدون احتياطي
      await enhancedIndexedDB.saveAuthData(`secure_${key}`, encrypted);
      console.log(`✅ حفظ آمن للبيانات: ${key}`);
    } catch (error) {
      console.error(`❌ فشل الحفظ الآمن للبيانات: ${key}`, error);
      throw new Error(`فشل في حفظ البيانات: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    }
  };

  // ❌ محذوف - استخدم loadSecureDataAsync بدلاً منه
  // const loadSecureData = DEPRECATED
  
  // Load secure data async version for new usage patterns
  const loadSecureDataAsync = async <T>(key: string, defaultValue: T): Promise<T> => {
    try {
      let encrypted: string | null = null;
      
      // تحميل هادئ من النظام الموحد
      try {
        encrypted = await enhancedIndexedDB.getAuthData(`secure_${key}`);
        if (encrypted) {
          console.log(`🔓 تحميل آمن للبيانات: ${key}`);
        }
      } catch (dbError) {
        // فشل صامت - طبيعي عند عدم وجود بيانات
        encrypted = null;
      }
      
      // إرجاع القيمة الافتراضية بهدوء عند عدم وجود البيانات
      if (!encrypted) {
        return defaultValue;
      }
      
      const decrypted = SimpleEncryption.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error(`❌ فشل تحميل البيانات الآمنة: ${key}`, error);
      return defaultValue;
    }
  };

  // Save authentication credentials
  const saveAuthData = async (username: string, password: string, userData: User, token: string): Promise<void> => {
    try {
      // Hash password for security
      const hashedPassword = await hashPassword(password + username + 'HSA2025');
      
      const authData = {
        username,
        hashedPassword,
        userData,
        token,
        timestamp: Date.now()
      };

      await saveSecureData('auth', authData);
      
      // Update offline data
      setOfflineData(prev => ({ ...prev, user: userData }));
      
      console.log('🔐 بيانات المصادقة محفوظة بأمان');
    } catch (error) {
      console.error('❌ فشل حفظ بيانات المصادقة:', error);
    }
  };

  // Verify offline credentials
  const verifyOfflineAuth = async (username: string, password: string): Promise<{ success: boolean; userData?: User; token?: string }> => {
    try {
      const authData = await loadSecureDataAsync('auth', null) as any;
      if (!authData || !authData.username || !authData.hashedPassword) return { success: false };

      const hashedPassword = await hashPassword(password + username + 'HSA2025');
      
      if (authData.username === username && authData.hashedPassword === hashedPassword) {
        console.log('✅ مصادقة محلية ناجحة');
        return { 
          success: true, 
          userData: authData.userData, 
          token: authData.token 
        };
      }
      
      return { success: false };
    } catch (error) {
      console.error('❌ فشل التحقق من المصادقة المحلية:', error);
      return { success: false };
    }
  };

  // Simple password hashing
  const hashPassword = async (input: string): Promise<string> => {
    if (window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } else {
      // Fallback for older browsers
      return window.btoa(input);
    }
  };

  // Save companies data
  const saveCompaniesData = (companies: Company[]): void => {
    saveSecureData('companies', companies);
    setOfflineData(prev => ({ ...prev, companies }));
    console.log(`🏢 حفظ ${companies.length} شركة`);
  };

  // Save locations data
  const saveLocationsData = (locations: LocationData[]): void => {
    saveSecureData('locations', locations);
    setOfflineData(prev => ({ ...prev, locations }));
    console.log(`📍 حفظ ${locations.length} موقع`);
  };

  // Save templates for a specific location
  const saveTemplatesData = async (locationId: number, templates: ChecklistTemplate[]): Promise<void> => {
    const currentTemplates = await loadSecureDataAsync('templates', {});
    const updatedTemplates = { ...currentTemplates, [locationId]: templates };
    
    saveSecureData('templates', updatedTemplates);
    setOfflineData(prev => ({ ...prev, templates: updatedTemplates }));
    console.log(`📋 حفظ ${templates.length} قالب للموقع ${locationId}`);
  };

  // ❌ تم إلغاء saveEvaluationOffline - لن نستخدم localStorage أبداً
  const saveEvaluationOffline = (): number => {
    console.error('❌ [DEPRECATED] saveEvaluationOffline محظور - استخدم النظام الموحد فقط');
    toast({
      title: "❌ نظام الحفظ القديم محظور",
      description: "يجب استخدام النظام الموحد فقط. يرجى إعادة المحاولة.",
      variant: "destructive",
      duration: 5000,
    });
    return 0;
  };

  // Load all offline data - DEPRECATED - استخدم initOfflineData بدلاً منه
  const loadOfflineData = async (): Promise<void> => {
    try {
      const authData = await loadSecureDataAsync('auth', null) as any;
      const companies = await loadSecureDataAsync('companies', []) as Company[];
      const locations = await loadSecureDataAsync('locations', []) as LocationData[];
      const templates = await loadSecureDataAsync('templates', {}) as { [locationId: number]: ChecklistTemplate[] };
      const evaluations = await loadSecureDataAsync('evaluations', []) as OfflineEvaluation[];

      setOfflineData({
        user: authData?.userData || null,
        companies,
        locations,
        templates,
        evaluations,
        lastSync: await loadSecureDataAsync('lastSync', 0) as number,
        dataVersion: '1.0.0',
        encryptionKey: 'HSA2025'
      });

      console.log('📂 تم تحميل البيانات:', {
        user: !!authData?.userData,
        companies: companies.length,
        locations: locations.length,
        evaluations: evaluations.length
      });
    } catch (error) {
      console.error('❌ فشل تحميل البيانات:', error);
    }
  };

  // Enhanced auto-sync with connection quality awareness
  const enhancedAutoSync = async (connectionQuality: 'excellent' | 'good' | 'poor' = 'good'): Promise<void> => {
    if (isOffline || isSyncing) return;
    
    setIsSyncing(true);
    setSyncErrors([]);
    
    try {
      const unsyncedEvaluations = offlineData.evaluations.filter(evaluation => !evaluation.synced);
      
      if (unsyncedEvaluations.length === 0) {
        console.log('✅ لا توجد تقييمات للمزامنة');
        return;
      }

      console.log(`🔄 بدء المزامنة المحسنة: ${unsyncedEvaluations.length} تقييم - جودة الاتصال: ${connectionQuality}`);
      
      // تحديد استراتيجية المزامنة حسب جودة الاتصال
      const syncStrategy = getSyncStrategy(connectionQuality);
      let syncedCount = 0;
      let failedCount = 0;
      
      // معالجة التقييمات في مجموعات بناءً على جودة الاتصال
      for (let i = 0; i < unsyncedEvaluations.length; i += syncStrategy.batchSize) {
        const batch = unsyncedEvaluations.slice(i, i + syncStrategy.batchSize);
        
        // معالجة متوازية محدودة للدفعة
        const batchPromises = batch.map(async (syncEvaluation, index) => {
          // تأخير متدرج لتجنب إرهاق الخادم
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, syncStrategy.requestDelay * index));
          }
          
          try {
            const success = await syncSingleEvaluation(syncEvaluation, syncStrategy.timeout);
            if (success) {
              syncedCount++;
              console.log(`✅ مزامنة ناجحة [${syncedCount}/${unsyncedEvaluations.length}]: ${syncEvaluation.id}`);
            } else {
              failedCount++;
              console.error(`❌ فشل مزامنة [${failedCount}]: ${syncEvaluation.id}`);
            }
            return success;
          } catch (error) {
            failedCount++;
            console.error(`❌ خطأ في مزامنة [${failedCount}]: ${syncEvaluation.id}`, error);
            setSyncErrors(prev => [...prev, `خطأ في مزامنة التقييم: ${syncEvaluation.id}`]);
            return false;
          }
        });

        await Promise.allSettled(batchPromises);
        
        // تأخير بين الدفعات حسب جودة الاتصال
        if (i + syncStrategy.batchSize < unsyncedEvaluations.length) {
          await new Promise(resolve => setTimeout(resolve, syncStrategy.batchDelay));
        }
      }
      
      // تحديث البيانات المحفوظة
      saveSecureData('evaluations', offlineData.evaluations);
      saveSecureData('lastSync', Date.now());
      
      const resultMessage = `تمت المزامنة: ${syncedCount} نجح، ${failedCount} فشل من أصل ${unsyncedEvaluations.length}`;
      console.log(`✅ ${resultMessage}`);
      
      // عرض إشعار للمستخدم في حالة وجود أخطاء فقط
      if (failedCount > 0 && syncedCount === 0) {
        toast({
          title: "فشل في المزامنة",
          description: `فشلت مزامنة ${failedCount} تقييم. سيتم إعادة المحاولة تلقائياً`,
          variant: "destructive",
          duration: 5000
        });
      } else if (failedCount > 0) {
        toast({
          title: "مزامنة جزئية",
          description: `نجح ${syncedCount} وفشل ${failedCount} تقييم`,
          variant: "destructive",
          duration: 4000
        });
      }
      
    } catch (error) {
      console.error('❌ فشل المزامنة التلقائية المحسنة:', error);
      setSyncErrors(prev => [...prev, 'فشل المزامنة التلقائية المحسنة']);
      
      toast({
        title: "خطأ في المزامنة",
        description: "حدث خطأ غير متوقع. سيتم إعادة المحاولة تلقائياً",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // تحديد استراتيجية المزامنة حسب جودة الاتصال
  const getSyncStrategy = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return { 
          batchSize: 5, 
          requestDelay: 100, 
          batchDelay: 500, 
          timeout: 10000,
          maxConcurrent: 3 
        };
      case 'good':
        return { 
          batchSize: 3, 
          requestDelay: 300, 
          batchDelay: 1000, 
          timeout: 15000,
          maxConcurrent: 2 
        };
      case 'poor':
        return { 
          batchSize: 1, 
          requestDelay: 1000, 
          batchDelay: 3000, 
          timeout: 30000,
          maxConcurrent: 1 
        };
      default:
        return { 
          batchSize: 2, 
          requestDelay: 500, 
          batchDelay: 1500, 
          timeout: 20000,
          maxConcurrent: 2 
        };
    }
  };

  // مزامنة تقييم واحد مع معالجة محسنة للأخطاء
  const syncSingleEvaluation = async (syncEvaluation: any, timeout: number = 15000): Promise<boolean> => {
    try {
      // تحويل التقييم المحلي لصيغة الخادم مع المعرفات الموحدة
      const serverEvaluation = {
        // استخدام tempId كمرجع للتقييم المحلي
        offlineId: syncEvaluation.tempId || `temp_${syncEvaluation.id}`,
        locationId: syncEvaluation.locationId,
        // تحويل التاريخ من نص محلي إلى تنسيق ISO للخادم
        checklistDate: syncEvaluation.checklistDate,
        tasks: syncEvaluation.tasks.map((task: any) => ({
          templateId: task.templateId,
          completed: task.completed,
          rating: task.rating,
          itemComment: task.itemComment || '',
          notes: task.notes || ''
        })),
        evaluationNotes: syncEvaluation.evaluationNotes || '',
        completedAt: syncEvaluation.completedAt,
        // تمرير بيانات المزامنة
        syncTimestamp: syncEvaluation.timestamp,
        isEncrypted: syncEvaluation.encrypted,
        companyId: syncEvaluation.companyId
      };
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      try {
        const response = await fetch('/api/checklists', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await loadSecureDataAsync('authToken', '')}`,
            'X-Sync-Attempt': 'auto',
            'X-Connection-Quality': 'monitored'
          },
          body: JSON.stringify(serverEvaluation),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          // وضع علامة المزامنة الناجحة
          syncEvaluation.synced = true;
          syncEvaluation.syncedAt = Date.now();
          return true;
        } else {
          const errorText = await response.text().catch(() => 'خطأ غير معروف');
          console.error(`❌ فشل مزامنة التقييم: ${syncEvaluation.id} - ${response.status}: ${errorText}`);
          setSyncErrors(prev => [...prev, `فشل مزامنة التقييم: ${syncEvaluation.id} (${response.status})`]);
          return false;
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`⏰ انتهت مهلة مزامنة التقييم: ${syncEvaluation.id}`);
        setSyncErrors(prev => [...prev, `انتهت مهلة مزامنة التقييم: ${syncEvaluation.id}`]);
      } else {
        console.error(`❌ خطأ في مزامنة التقييم: ${syncEvaluation.id}`, error);
        setSyncErrors(prev => [...prev, `خطأ في مزامنة التقييم: ${syncEvaluation.id}`]);
      }
      return false;
    }
  };

  // استبدال autoSync القديم بالجديد للتوافق مع الخلف
  const autoSync = () => enhancedAutoSync('good');

  // Clear all offline data - نظام موحد فقط
  const clearOfflineData = async (): Promise<void> => {
    const keysToRemove = ['auth', 'companies', 'locations', 'templates', 'evaluations', 'lastSync'];
    
    // مسح البيانات من النظام الموحد فقط
    for (const key of keysToRemove) {
      try {
        await enhancedIndexedDB.removeItem(`secure_${key}`);
        console.log(`🗑️ مسح آمن من IndexedDB: ${key}`);
      } catch (error) {
        console.error(`❌ فشل مسح البيانات الآمنة: ${key}`, error);
      }
    }
    
    setOfflineData({
      user: null,
      companies: [],
      locations: [],
      templates: {},
      evaluations: [],
      lastSync: 0,
      dataVersion: '1.0.0',
      encryptionKey: ''
    });
    
    console.log('🗑️ تم مسح جميع البيانات الآمنة');
  };

  // Get pending evaluations count
  const getPendingCount = (): number => {
    return offlineData.evaluations.filter(evaluation => !evaluation.synced).length;
  };

  // Manual sync trigger with enhanced capabilities
  const triggerManualSync = async (): Promise<boolean> => {
    if (isOffline) {
      toast({
        title: "لا يوجد اتصال بالإنترنت",
        description: "تحقق من الاتصال بالإنترنت وحاول مرة أخرى",
        variant: "destructive"
      });
      return false;
    }

    const pendingCount = getPendingCount();
    if (pendingCount === 0) {
      toast({
        title: "لا توجد بيانات للمزامنة",
        description: "جميع التقييمات محدثة ومرسلة للخادم"
      });
      return true;
    }

    try {
      console.log(`🔄 بدء المزامنة اليدوية لـ ${pendingCount} تقييم`);
      
      // استخدام المزامنة المحسنة مع جودة اتصال جيدة افتراضياً للمزامنة اليدوية
      await enhancedAutoSync('good');
      
      toast({
        title: "تمت المزامنة",
        description: `تم مزامنة ${pendingCount} تقييم بنجاح`,
        duration: 3000
      });
      
      return true;
    } catch (error) {
      console.error('❌ فشل في المزامنة اليدوية:', error);
      toast({
        title: "فشل في المزامنة",
        description: "حدث خطأ أثناء المزامنة. حاول مرة أخرى",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    isOffline,
    offlineData,
    isSyncing,
    syncErrors,
    
    // Authentication
    saveAuthData,
    verifyOfflineAuth,
    
    // Data management
    saveCompaniesData,
    saveLocationsData,
    saveTemplatesData,
    saveEvaluationOffline,
    
    // Sync operations
    triggerManualSync,
    autoSync,
    loadOfflineData,
    clearOfflineData,
    
    // Utilities
    getPendingCount,
    hasOfflineData: offlineData.user !== null
  };
};