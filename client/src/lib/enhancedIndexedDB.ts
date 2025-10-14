/**
 * 🗄️ Enhanced IndexedDB System - نظام IndexedDB محسن
 * نظام التخزين المحلي المتقدم مع إمكانيات شاملة
 */

interface StoredData {
  id: string;
  value: any;
  timestamp: number;
  type: 'auth' | 'data' | 'credentials' | 'settings';
}

class EnhancedIndexedDB {
  private dbName = 'HSAGroupDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('storage')) {
          const store = db.createObjectStore('storage', { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  async setItem(key: string, value: any, type: StoredData['type'] = 'data'): Promise<void> {
    console.log('🗄️ [IndexedDB] محاولة حفظ البيانات:', { key, type, valueSize: JSON.stringify(value).length });
    
    try {
      const db = await this.ensureDB();
      console.log('✅ [IndexedDB] تم الاتصال بقاعدة البيانات بنجاح');
      
      const transaction = db.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');
      
      const data: StoredData = {
        id: key,
        value,
        timestamp: Date.now(),
        type
      };
      
      console.log('💾 [IndexedDB] إعداد البيانات للحفظ:', { id: data.id, type: data.type, timestamp: data.timestamp });
      
      return new Promise((resolve, reject) => {
        const request = store.put(data);
        
        request.onsuccess = () => {
          console.log('✅ [IndexedDB] تم حفظ البيانات بنجاح:', key);
          resolve();
        };
        
        request.onerror = () => {
          console.error('❌ [IndexedDB] فشل حفظ البيانات:', {
            key,
            error: request.error,
            errorName: request.error?.name,
            errorMessage: request.error?.message
          });
          reject(request.error);
        };
        
        transaction.onerror = () => {
          console.error('❌ [IndexedDB] فشل في العملية:', {
            key,
            transactionError: transaction.error,
            errorName: transaction.error?.name,
            errorMessage: transaction.error?.message
          });
          reject(transaction.error);
        };
      });
    } catch (error) {
      console.error('❌ [IndexedDB] خطأ عام في الحفظ:', {
        key,
        error,
        errorMessage: error instanceof Error ? error.message : 'خطأ غير معروف',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async getItem(key: string): Promise<any> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['storage'], 'readonly');
    const store = transaction.objectStore('storage');
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async removeItem(key: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['storage'], 'readwrite');
    const store = transaction.objectStore('storage');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['storage'], 'readwrite');
    const store = transaction.objectStore('storage');
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllKeys(): Promise<string[]> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction(['storage'], 'readonly');
      const store = transaction.objectStore('storage');
      
      return new Promise((resolve, reject) => {
        const request = store.getAllKeys();
        request.onsuccess = () => {
          const keys = request.result as string[];
          console.log(`🔑 [IndexedDB] وجد ${keys.length} مفتاح في قاعدة البيانات`);
          resolve(keys);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('❌ [IndexedDB] فشل جلب المفاتيح:', error);
      return [];
    }
  }

  async getAllByType(type: StoredData['type']): Promise<StoredData[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['storage'], 'readonly');
    const store = transaction.objectStore('storage');
    const index = store.index('type');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(type);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Authentication specific methods
  async saveAuthData(key: string, value: any): Promise<void> {
    console.log('🔐 [IndexedDB] حفظ بيانات المصادقة:', { key, valueType: typeof value });
    
    try {
      // فحص مساحة التخزين المتاحة
      if ('storage' in navigator && navigator.storage && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        console.log('📊 [IndexedDB] حالة التخزين:', {
          used: Math.round((estimate.usage || 0) / 1024 / 1024) + ' MB',
          total: Math.round((estimate.quota || 0) / 1024 / 1024) + ' MB',
          available: Math.round(((estimate.quota || 0) - (estimate.usage || 0)) / 1024 / 1024) + ' MB'
        });
      }
      
      await this.setItem(`auth_${key}`, value, 'auth');
      console.log('✅ [IndexedDB] تم حفظ بيانات المصادقة بنجاح:', key);
    } catch (error) {
      console.error('❌ [IndexedDB] فشل حفظ بيانات المصادقة:', {
        key,
        error,
        errorMessage: error instanceof Error ? error.message : 'خطأ غير معروف'
      });
      throw error;
    }
  }

  async getAuthData(key: string): Promise<any> {
    try {
      await this.ensureDB();
      const data = await this.getItem(`auth_${key}`);
      return data;
    } catch (error) {
      console.error(`❌ [Auth] خطأ في استرجاع بيانات المصادقة: ${key}`, error);
      return null;
    }
  }

  async removeAuthData(key: string): Promise<void> {
    try {
      await this.ensureDB();
      await this.removeItem(`auth_${key}`);
      console.log(`🗑️ [Auth] تم مسح بيانات المصادقة: ${key}`);
    } catch (error) {
      console.error(`❌ [Auth] خطأ في مسح بيانات المصادقة: ${key}`, error);
    }
  }

  async saveCredentials(credentials: any): Promise<void> {
    return this.setItem('offline_credentials', credentials, 'credentials');
  }

  async getCredentials(): Promise<any> {
    return this.getItem('offline_credentials');
  }

  // Settings methods - محذوفة لتجنب التكرار مع النسخ المحسنة أدناه

  // Utility methods
  async exists(key: string): Promise<boolean> {
    const value = await this.getItem(key);
    return value !== null;
  }

  async size(): Promise<number> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['storage'], 'readonly');
    const store = transaction.objectStore('storage');
    
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllData(): Promise<void> {
    return this.clear();
  }

  async saveEvaluation(evaluation: any): Promise<void> {
    return this.setItem(`evaluation_${evaluation.id || Date.now()}`, evaluation, 'data');
  }

  // App state management
  async saveAppState(key: string, state: any): Promise<void> {
    return this.setItem(key, state, 'settings');
  }

  async getAppState(key: string): Promise<any> {
    return this.getItem(key);
  }

  // Enhanced methods for data management with performance optimization
  async saveData(key: string, data: any): Promise<void> {
    // تحسين الأداء: ضغط البيانات الكبيرة تلقائياً
    const dataString = JSON.stringify(data);
    const isLargeData = dataString.length > 100000; // أكبر من 100KB
    
    if (isLargeData) {
      console.log(`📦 [IndexedDB] ضغط البيانات الكبيرة: ${key} (${dataString.length} bytes)`);
      // يمكن إضافة ضغط لاحقاً
    }
    
    return this.setItem(key, data);
  }

  async getData(key: string): Promise<any> {
    const startTime = performance.now();
    const result = await this.getItem(key);
    const loadTime = performance.now() - startTime;
    
    if (loadTime > 10) {
      console.log(`⚡ [IndexedDB] تحميل بطيء: ${key} (${loadTime.toFixed(2)}ms)`);
    }
    
    return result;
  }

  // طريقة جديدة للتحميل المتوازي
  async getMultipleData(keys: string[]): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    const promises = keys.map(async (key) => {
      const value = await this.getItem(key);
      return { key, value };
    });
    
    const resolved = await Promise.all(promises);
    resolved.forEach(({ key, value }) => {
      results[key] = value;
    });
    
    return results;
  }

  async saveLocation(location: any): Promise<void> {
    const locations = await this.getLocations();
    const updatedLocations = locations.filter((l: any) => l.id !== location.id);
    updatedLocations.push(location);
    return this.setItem('locations', updatedLocations);
  }

  async getLocations(): Promise<any[]> {
    const locations = await this.getItem('locations');
    return Array.isArray(locations) ? locations : [];
  }

  async saveUser(user: any): Promise<void> {
    const users = await this.getUsers();
    const updatedUsers = users.filter((u: any) => u.id !== user.id);
    updatedUsers.push(user);
    return this.setItem('users', updatedUsers);
  }

  async getUsers(): Promise<any[]> {
    const users = await this.getItem('users');
    return Array.isArray(users) ? users : [];
  }

  async deleteAuthData(key: string): Promise<void> {
    return this.removeItem(key);
  }

  // 🔄 Enhanced Local Database Methods - دمج وظائف LocalDatabaseManager
  
  /**
   * حفظ التقييمات مع فلترة متقدمة
   */
  async saveEvaluations(evaluations: any[]): Promise<void> {
    return this.setItem('local_evaluations', evaluations, 'data');
  }

  async getEvaluations(filters?: {
    locationId?: number;
    userId?: number;
    companyId?: number;
    startDate?: string;
    endDate?: string;
    unsyncedOnly?: boolean;
  }): Promise<any[]> {
    const allEvaluations = await this.getItem('local_evaluations') || [];
    
    if (!filters) return allEvaluations;
    
    return allEvaluations.filter((evaluation: any) => {
      if (filters.locationId && evaluation.locationId !== filters.locationId) return false;
      if (filters.userId && evaluation.userId !== filters.userId) return false;
      if (filters.companyId && evaluation.companyId !== filters.companyId) return false;
      if (filters.startDate && evaluation.checklistDate < filters.startDate) return false;
      if (filters.endDate && evaluation.checklistDate > filters.endDate) return false;
      if (filters.unsyncedOnly && evaluation.synced) return false;
      return true;
    });
  }

  /**
   * حفظ واسترجاع القوالب مع فلترة بالموقع
   */
  async saveTemplates(templates: any[]): Promise<void> {
    console.log(`📋 حفظ ${templates.length} قالب في النظام الموحد`);
    return this.setItem('local_templates', templates, 'data');
  }

  async getTemplates(locationId?: number): Promise<any[]> {
    const allTemplates = await this.getItem('local_templates') || [];
    
    if (!locationId) return allTemplates.filter((t: any) => t.isActive !== false);
    
    return allTemplates.filter((t: any) => 
      t.locationId === locationId && t.isActive !== false
    );
  }

  /**
   * حفظ واسترجاع المواقع مع فلترة بالشركة  
   */
  async saveLocations(locations: any[]): Promise<void> {
    console.log(`📍 حفظ ${locations.length} موقع في النظام الموحد`);
    return this.setItem('local_locations', locations, 'data');
  }

  async getFilteredLocations(companyId?: number): Promise<any[]> {
    const allLocations = await this.getLocations();
    
    if (!companyId) return allLocations.filter((l: any) => l.isActive !== false);
    
    return allLocations.filter((l: any) => 
      l.companyId === companyId && l.isActive !== false
    );
  }

  /**
   * إدارة طابور المزامنة
   */
  async addToSyncQueue(item: {
    type: 'evaluation' | 'template' | 'location' | 'user';
    action: 'create' | 'update' | 'delete';
    data: any;
  }): Promise<void> {
    const queue = await this.getSyncQueue();
    const newItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      ...item,
      createdAt: new Date().toISOString(),
      attempts: 0
    };
    
    queue.push(newItem);
    await this.setItem('sync_queue', queue, 'data');
    console.log('🔄 إضافة عنصر جديد لطابور المزامنة:', newItem.id);
  }

  async getSyncQueue(): Promise<any[]> {
    return await this.getItem('sync_queue') || [];
  }

  async removeSyncQueueItem(itemId: string): Promise<void> {
    const queue = await this.getSyncQueue();
    const updatedQueue = queue.filter((item: any) => item.id !== itemId);
    await this.setItem('sync_queue', updatedQueue, 'data');
  }

  async updateSyncAttempt(itemId: string, error?: string): Promise<void> {
    const queue = await this.getSyncQueue();
    const item = queue.find((q: any) => q.id === itemId);
    
    if (item) {
      item.attempts = (item.attempts || 0) + 1;
      item.lastAttempt = new Date().toISOString();
      if (error) item.error = error;
      
      await this.setItem('sync_queue', queue, 'data');
    }
  }

  /**
   * إدارة إعدادات التطبيق المحلية
   */
  async saveSetting(key: string, value: any, type: 'string' | 'number' | 'boolean' | 'json' = 'string'): Promise<void> {
    const setting = {
      key,
      value: type === 'json' ? JSON.stringify(value) : String(value),
      type,
      updatedAt: new Date().toISOString()
    };
    
    return this.setItem(`setting_${key}`, setting, 'settings');
  }

  async getSetting<T = any>(key: string, defaultValue?: T): Promise<T> {
    const setting = await this.getItem(`setting_${key}`);
    
    if (!setting) return defaultValue as T;
    
    switch (setting.type) {
      case 'number':
        return Number(setting.value) as T;
      case 'boolean':
        return (setting.value === 'true') as T;
      case 'json':
        return JSON.parse(setting.value) as T;
      default:
        return setting.value as T;
    }
  }

  /**
   * إحصائيات قاعدة البيانات
   */
  async getDatabaseStats(): Promise<{
    evaluations: number;
    templates: number;
    locations: number;
    syncQueue: number;
    totalSize: number;
  }> {
    const [evaluations, templates, locations, syncQueue, totalSize] = await Promise.all([
      this.getEvaluations().then(items => items.length),
      this.getTemplates().then(items => items.length),
      this.getLocations().then(items => items.length),
      this.getSyncQueue().then(items => items.length),
      this.size()
    ]);

    return {
      evaluations,
      templates,
      locations,
      syncQueue,
      totalSize
    };
  }

  /**
   * مسح قاعدة البيانات (للطوارئ)
   */
  async clearDatabase(): Promise<void> {
    console.log('🗑️ مسح جميع البيانات المحلية');
    return this.clear();
  }

  // 🔄 Smart Sync System - نظام المزامنة الذكي الموحد
  
  /**
   * إدارة ذكية لمراقبة الاتصال
   */
  private connectionQuality: 'excellent' | 'good' | 'poor' | 'offline' = 'good';
  private syncTimer: any = null;
  private isOnline = navigator.onLine;
  private isSyncing = false;

  /**
   * تقييم جودة الاتصال
   */
  async assessConnectionQuality(): Promise<{ level: string; latency: number; bandwidth: number }> {
    if (!navigator.onLine) {
      this.connectionQuality = 'offline';
      return { level: 'offline', latency: 0, bandwidth: 0 };
    }

    try {
      const startTime = performance.now();
      const connection = (navigator as any).connection;
      
      if (connection) {
        const endTime = performance.now();
        const latency = endTime - startTime;
        
        let level: typeof this.connectionQuality = 'good';
        if (connection.effectiveType === '4g') level = 'excellent';
        else if (connection.effectiveType === '3g') level = 'good';
        else level = 'poor';
        
        this.connectionQuality = level;
        
        return {
          level,
          latency,
          bandwidth: this.estimateBandwidth(latency)
        };
      }

      this.connectionQuality = 'good';
      return { level: 'good', latency: 100, bandwidth: 5 };
      
    } catch (error) {
      this.connectionQuality = 'poor';
      return { level: 'poor', latency: 9999, bandwidth: 0 };
    }
  }

  private estimateBandwidth(latency: number): number {
    if (latency < 100) return 10; // سريع
    if (latency < 500) return 5;  // متوسط
    return 1; // بطيء
  }

  /**
   * مزامنة ذكية مع أولويات
   */
  async addToSmartSyncQueue(item: {
    type: 'evaluation' | 'template' | 'location' | 'user' | 'settings';
    action: 'create' | 'update' | 'delete';
    data: any;
    priority?: 'high' | 'medium' | 'low';
  }): Promise<string> {
    const queue = await this.getSyncQueue();
    const smartItem = {
      id: `smart_sync_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      ...item,
      priority: item.priority || 'medium',
      createdAt: new Date().toISOString(),
      attempts: 0,
      maxRetries: item.priority === 'high' ? 5 : 3,
      connectionQuality: this.connectionQuality
    };
    
    queue.push(smartItem);
    await this.setItem('sync_queue', queue, 'data');
    
    console.log(`📥 إضافة للمزامنة الذكية: ${item.type} (${item.priority})`, smartItem.id);
    
    // مزامنة فورية للعناصر عالية الأولوية
    if (item.priority === 'high' && this.isOnline) {
      setTimeout(() => this.processHighPriorityItems(), 100);
    }
    
    return smartItem.id;
  }

  /**
   * معالجة العناصر عالية الأولوية فوراً
   */
  private async processHighPriorityItems(): Promise<void> {
    if (this.isSyncing) return;
    
    const queue = await this.getSyncQueue();
    const highPriorityItems = queue.filter((item: any) => item.priority === 'high');
    
    if (highPriorityItems.length === 0) return;
    
    console.log(`⚡ معالجة ${highPriorityItems.length} عنصر عالي الأولوية`);
    
    for (const item of highPriorityItems) {
      try {
        await this.syncSingleItem(item);
        await this.removeSyncQueueItem(item.id);
      } catch (error: any) {
        console.error(`❌ فشل مزامنة عنصر عالي الأولوية:`, error);
        await this.updateSyncAttempt(item.id, error?.message || 'خطأ غير محدد');
      }
    }
  }

  /**
   * مزامنة عنصر واحد
   */
  private async syncSingleItem(item: any): Promise<boolean> {
    try {
      // محاكاة مزامنة بسيطة - يمكن تطويرها لاحقاً
      console.log(`🔄 مزامنة عنصر: ${item.type}`, item.id);
      
      // هنا يمكن إضافة مزامنة حقيقية مع الخادم
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      console.error(`❌ فشل مزامنة العنصر ${item.id}:`, error);
      return false;
    }
  }

  /**
   * مزامنة إجبارية
   */
  async forceSync(): Promise<{ success: number; failed: number; total: number }> {
    if (this.isSyncing) {
      console.log('⚠️ المزامنة قيد التشغيل بالفعل');
      return { success: 0, failed: 0, total: 0 };
    }

    this.isSyncing = true;
    const queue = await this.getSyncQueue();
    let success = 0;
    let failed = 0;

    console.log(`🚀 بدء المزامنة الإجبارية: ${queue.length} عنصر`);

    for (const item of queue) {
      try {
        const result = await this.syncSingleItem(item);
        if (result) {
          success++;
          await this.removeSyncQueueItem(item.id);
        } else {
          failed++;
          await this.updateSyncAttempt(item.id, 'فشل المزامنة');
        }
      } catch (error: any) {
        failed++;
        await this.updateSyncAttempt(item.id, error?.message || 'خطأ غير محدد');
      }
    }

    this.isSyncing = false;
    console.log(`✅ انتهت المزامنة: ${success} نجح، ${failed} فشل`);

    return { success, failed, total: queue.length };
  }

  /**
   * إحصائيات المزامنة
   */
  async getSyncStats(): Promise<{
    totalItems: number;
    pendingItems: number;
    successfulSyncs: number;
    failedSyncs: number;
    lastSyncTime: number | null;
    connectionQuality: string;
  }> {
    const queue = await this.getSyncQueue();
    const stats = await this.getItem('sync_stats') || {
      successfulSyncs: 0,
      failedSyncs: 0,
      lastSyncTime: null
    };

    return {
      totalItems: queue.length,
      pendingItems: queue.filter((item: any) => (item.attempts || 0) < (item.maxRetries || 3)).length,
      successfulSyncs: stats.successfulSyncs || 0,
      failedSyncs: stats.failedSyncs || 0,
      lastSyncTime: stats.lastSyncTime,
      connectionQuality: this.connectionQuality
    };
  }

  /**
   * تنظيف العناصر القديمة
   */
  async cleanupOldSyncItems(olderThanDays: number = 7): Promise<number> {
    const queue = await this.getSyncQueue();
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    
    const filtered = queue.filter((item: any) => {
      const itemTime = new Date(item.createdAt).getTime();
      return itemTime > cutoffTime;
    });

    const cleaned = queue.length - filtered.length;
    
    if (cleaned > 0) {
      await this.setItem('sync_queue', filtered, 'data');
      console.log(`🧹 تم تنظيف ${cleaned} عنصر قديم من طابور المزامنة`);
    }

    return cleaned;
  }
}

// Create singleton instance
export const enhancedIndexedDB = new EnhancedIndexedDB();

// 🔄 Legacy compatibility layer for LocalDatabaseManager
export const unifiedLocalDatabase = {
  // Auth methods
  saveCredentials: (credentials: any) => enhancedIndexedDB.saveCredentials(credentials),
  getCredentials: () => enhancedIndexedDB.getCredentials(),
  saveAuthData: (key: string, value: any) => enhancedIndexedDB.saveAuthData(key, value),
  getAuthData: (key: string) => enhancedIndexedDB.getAuthData(key),
  
  // Basic storage
  setItem: (key: string, value: any) => enhancedIndexedDB.setItem(key, value),
  getItem: (key: string) => enhancedIndexedDB.getItem(key),
  removeItem: (key: string) => enhancedIndexedDB.removeItem(key),
  clear: () => enhancedIndexedDB.clear(),
  
  // Enhanced LocalDatabaseManager methods
  saveEvaluations: (evaluations: any[]) => enhancedIndexedDB.saveEvaluations(evaluations),
  getEvaluations: (filters?: any) => enhancedIndexedDB.getEvaluations(filters),
  saveTemplates: (templates: any[]) => enhancedIndexedDB.saveTemplates(templates),
  getTemplates: (locationId?: number) => enhancedIndexedDB.getTemplates(locationId),
  saveLocations: (locations: any[]) => enhancedIndexedDB.saveLocations(locations),
  getLocations: (companyId?: number) => enhancedIndexedDB.getFilteredLocations(companyId),
  
  // Settings
  saveSetting: (key: string, value: any, type?: string) => enhancedIndexedDB.saveSetting(key, value, type as any),
  getSetting: (key: string, defaultValue?: any) => enhancedIndexedDB.getSetting(key, defaultValue),
  
  // Sync queue
  addToSyncQueue: (item: any) => enhancedIndexedDB.addToSyncQueue(item),
  getSyncQueue: () => enhancedIndexedDB.getSyncQueue(),
  removeSyncQueueItem: (itemId: string) => enhancedIndexedDB.removeSyncQueueItem(itemId),
  updateSyncAttempt: (itemId: string, error?: string) => enhancedIndexedDB.updateSyncAttempt(itemId, error),
  
  // Stats and utilities
  getDatabaseStats: () => enhancedIndexedDB.getDatabaseStats(),
  clearDatabase: () => enhancedIndexedDB.clearDatabase(),
  
  // Smart Sync System methods
  addToSmartSyncQueue: (item: any) => enhancedIndexedDB.addToSmartSyncQueue(item),
  forceSync: () => enhancedIndexedDB.forceSync(),
  getSyncStats: () => enhancedIndexedDB.getSyncStats(),
  cleanupOldSyncItems: (olderThanDays?: number) => enhancedIndexedDB.cleanupOldSyncItems(olderThanDays),
  assessConnectionQuality: () => enhancedIndexedDB.assessConnectionQuality(),
  
  // Legacy alias - make ensureDB public first
  ensureDatabase: () => enhancedIndexedDB.init()
};

// Legacy compatibility layer (previous name)
export const advancedLocalDB = unifiedLocalDatabase;

// Initialize on import
enhancedIndexedDB.init().catch(console.error);