/**
 * 🎯 Hook موحد للتقييمات - يدعم الأونلاين والأوفلاين
 * واجهة موحدة وبسيطة للتعامل مع التقييمات
 * بنية البيانات موحدة مع النظام الأونلاين الحالي
 */

import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from './useAuth';

interface UseUnifiedEvaluationProps {
  locationId?: number;
  autoSync?: boolean;
  syncIntervalMs?: number;
  currentUser?: any;
}

interface UnifiedEvaluationState {
  isLoading: boolean;
  isSubmitting: boolean;
  isSyncing: boolean;
  isOnline: boolean;
  lastSubmissionId: string | null;
  syncStats: {
    pendingSync: number;
    totalStored: number;
    lastSyncTime: number | null;
  };
  error: string | null;
}

export function useUnifiedEvaluation(props: UseUnifiedEvaluationProps = {}) {
  const { autoSync = true, syncIntervalMs = 10000, currentUser: propCurrentUser } = props;
  const { user: authCurrentUser } = useAuth();
  const currentUser = propCurrentUser || authCurrentUser;
  
  // حالة الـ Hook
  const [state, setState] = useState<UnifiedEvaluationState>({
    isLoading: false,
    isSubmitting: false,
    isSyncing: false,
    isOnline: navigator.onLine,
    lastSubmissionId: null,
    syncStats: {
      pendingSync: 0,
      totalStored: 0,
      lastSyncTime: null
    },
    error: null
  });
  
  /**
   * 📱 تحديث حالة الاتصال
   */
  useEffect(() => {
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  /**
   * 🔄 إعداد المزامنة التلقائية الحقيقية
   */
  useEffect(() => {
    console.log(`🔍 [AutoSync] فحص شروط المزامنة:`, {
      autoSync,
      isOnline: state.isOnline,
      hasCurrentUser: !!currentUser,
      username: currentUser?.username,
      navigatorOnLine: navigator.onLine
    });
    
    if (autoSync && state.isOnline && currentUser) {
      console.log(`🔄 [AutoSync] بدء المزامنة التلقائية للمستخدم: ${currentUser.username}`);
      
      // تشغيل المزامنة فوراً عند العودة أونلاين
      performAutoSync();
      
      // تشغيل المزامنة دورياً
      const syncInterval = setInterval(() => {
        if (navigator.onLine && currentUser) {
          console.log(`⏰ [AutoSync] تشغيل دوري للمزامنة - المستخدم: ${currentUser.username}`);
          performAutoSync();
        }
      }, syncIntervalMs);
      
      return () => {
        console.log(`🔚 [AutoSync] توقف المزامنة للمستخدم: ${currentUser.username}`);
        clearInterval(syncInterval);
      };
    } else if (autoSync && !currentUser) {
      console.log('⏸️ [AutoSync] المستخدم غير متوفر، إيقاف المزامنة التلقائية');
    } else if (autoSync && !state.isOnline) {
      console.log('📡 [AutoSync] لا يوجد اتصال، إيقاف المزامنة التلقائية');
    }
  }, [autoSync, syncIntervalMs, state.isOnline, currentUser]);
  
  /**
   * 🚀 تنفيذ المزامنة التلقائية الفعلية
   */
  const performAutoSync = useCallback(async () => {
    console.log(`🔔 [AutoSync] بدء دورة مزامنة جديدة - المستخدم: ${currentUser?.username || 'غير معروف'}`);
    
    if (!currentUser) {
      console.log('⏸️ [AutoSync] لا يوجد مستخدم محدد، تأجيل المزامنة');
      return;
    }
    
    if (!navigator.onLine || state.isSyncing) {
      console.log('📡 [AutoSync] لا يوجد اتصال أو مزامنة جارية، تأجيل المزامنة');
      return; // تجنب المزامنة المتعددة
    }
    
    try {
      console.log('🟢 [AutoSync] الشروط مستوفية - بدء المزامنة...');
      setState(prev => ({ ...prev, isSyncing: true }));
      console.log('🔄 [AutoSync] بدء عملية المزامنة...');
      
      const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
      const allDataItems = await enhancedIndexedDB.getAllByType('data');
      
      // 🔍 تسجيل تفصيلي لجميع البيانات المحلية
      console.log(`🔍 [AutoSync] فحص ${allDataItems.length} عنصر من IndexedDB...`);
      console.log(`📋 [AutoSync] عينة من المفاتيح الموجودة:`, 
        allDataItems.slice(0, 10).map(item => ({
          id: item.id,
          hasValue: !!item.value,
          synced: item.value?.synced,
          needsSync: item.value?.needsSync,
          isOffline: item.value?.isOffline
        }))
      );
      
      // جلب التقييمات غير المتزامنة - بحث محسن وشامل
      const potentialEvaluations = allDataItems.filter(item => {
        // البحث في كل الأنواع المحتملة للتقييمات المحلية
        const isChecklistType = item.id.startsWith('offline_checklist_');
        const isEvaluationType = item.id.includes('evaluation') || item.id.includes('eval_');
        const hasOfflineData = item.value && (item.value.isOffline || item.value.needsSync);
        const notSynced = item.value && !item.value.synced;
        
        return (isChecklistType || isEvaluationType || hasOfflineData) && notSynced;
      });
      
      console.log(`🔍 [AutoSync] التقييمات المحتملة غير المتزامنة: ${potentialEvaluations.length}`);
      
      // فلترة للتأكد من التقييمات الصالحة فقط
      const unsyncedEvaluations = potentialEvaluations.filter(item => {
        if (!item.value) return false;
        
        // التحقق من وجود بيانات التقييم الأساسية
        const hasLocationId = item.value.locationId || item.value.location_id;
        const hasUserId = item.value.userId || item.value.user_id || item.value.evaluatorId;
        const hasDate = item.value.checklistDate || item.value.evaluationDate || item.value.date;
        
        return hasLocationId && hasUserId && hasDate;
      });
      
      console.log(`🔄 [AutoSync] وُجد ${unsyncedEvaluations.length} تقييم صالح بحاجة للمزامنة`);
      
      // تسجيل تفاصيل التقييمات غير المتزامنة
      if (unsyncedEvaluations.length > 0) {
        console.log(`📝 [AutoSync] تفاصيل التقييمات غير المتزامنة:`, 
          unsyncedEvaluations.map(item => ({
            id: item.id,
            locationId: item.value.locationId || item.value.location_id,
            userId: item.value.userId || item.value.user_id || item.value.evaluatorId,
            date: item.value.checklistDate || item.value.evaluationDate || item.value.date,
            synced: item.value.synced,
            needsSync: item.value.needsSync
          }))
        );
      }
      
      // إضافة تحديث للواجهة بعدد التقييمات غير المتزامنة
      setState(prev => ({ 
        ...prev, 
        syncStats: { 
          ...prev.syncStats, 
          pendingSync: unsyncedEvaluations.length 
        }
      }));
      
      if (unsyncedEvaluations.length === 0) {
        setState(prev => ({ ...prev, isSyncing: false }));
        return;
      }
      
      // مزامنة كل تقييم
      let syncedCount = 0;
      for (const item of unsyncedEvaluations) {
        try {
          console.log(`🚀 [AutoSync] مزامنة التقييم: ${item.id}`);
          
          // 🔄 [DATA_UNIFICATION] تحضير البيانات الموحدة للإرسال للخادم
          const evaluationData: any = { ...item.value };
          
          // ✅ [FIX] إنشاء نسخة منظفة للخادم بدون تعديل البيانات الأصلية
          const {
            _localUserName,
            _localEvaluatorName,
            _localTimestamp,
            isOffline,
            synced,      // مختلف عن isSynced - لا نرسله
            needsSync,
            savedAt,
            source,
            ...cleanServerData
          } = evaluationData;
          
          const serverData = cleanServerData;
          
          // ✅ الاحتفاظ بالحقول الموجودة في الخادم:
          // - offlineId (موجود في الخادم) 
          // - isSynced (موجود في الخادم)
          
          // ✅ [FIX] التأكد من وجود الحقول المطابقة للخادم في serverData (ليس evaluationData!)
          serverData.syncTimestamp = Math.floor(Date.now() / 1000);
          
          // التأكد من وجود الحقول الموحدة
          if (!serverData.completedAt) serverData.completedAt = serverData.evaluationDateTime;
          if (!serverData.createdAt) serverData.createdAt = serverData.evaluationDateTime;
          if (!serverData.categoryComments) serverData.categoryComments = {};
          if (serverData.isEncrypted === undefined) serverData.isEncrypted = false;
          
          // 🔧 إصلاح userId إذا كان مختلف
          if (serverData.userId !== currentUser?.id) {
            console.log(`🔧 [AutoSync] تصحيح userId: ${serverData.userId} -> ${currentUser?.id}`);
            serverData.userId = currentUser?.id!;
          }
          
          // 🔍 تشخيص البيانات المُرسلة
          console.log(`🔍 [AutoSync] تحضير بيانات للمزامنة:`, {
            itemId: item.id,
            serverDataUserId: serverData.userId,
            currentUserId: currentUser?.id,
            userMatches: serverData.userId === currentUser?.id,
            locationId: item.value.locationId,
            currentUsername: currentUser?.username,
            serverData: {
              userId: serverData.userId,
              locationId: serverData.locationId,
              offlineId: serverData.offlineId
            }
          });
          
          // إرسال للخادم
          console.log(`📡 [AutoSync] محاولة إرسال HTTP:`, {
            endpoint: '/api/checklists',
            method: 'POST',
            dataPreview: {
              userId: evaluationData.userId,
              locationId: evaluationData.locationId,
              offlineId: evaluationData.offlineId,
              tasksCount: evaluationData.tasks?.length
            }
          });
          
          const response = await apiRequest('/api/checklists', 'POST', serverData);
          
          console.log(`✅ [AutoSync] استجابة HTTP ناجحة:`, {
            status: 'success',
            itemId: item.id,
            responsePreview: response
          });
          
          // 🔄 [DATA_UNIFICATION] تحديث حالة المزامنة محلياً مع البيانات الموحدة
          const syncedData = {
            ...item.value, // البيانات المحلية الكاملة
            id: response.id, // معرف الخادم
            synced: true,
            isSynced: true,    // ✅ متطابق مع الخادم
            serverId: response.id, // للتوافق مع النظام السابق
            syncTimestamp: Math.floor(Date.now() / 1000),
            syncedAt: Date.now(),
            source: 'server'
          };
          
          await enhancedIndexedDB.setItem(item.id, syncedData, 'data');
          
          syncedCount++;
          console.log(`✅ [AutoSync] تم مزامنة التقييم ${item.id} بنجاح`);
          
        } catch (syncError: any) {
          console.error(`❌ [AutoSync] فشل مزامنة ${item.id}:`, {
            error: syncError,
            errorMessage: syncError?.message,
            httpStatus: syncError?.status || syncError?.response?.status,
            responseText: syncError?.response?.text || syncError?.response?.data,
            itemId: item.id,
            locationId: item.value.locationId,
            userId: item.value.userId,
            currentUserId: currentUser?.id,
            timestamp: new Date().toISOString()
          });
          
          // إضافة معلومات الخطأ للواجهة
          setState(prev => ({ 
            ...prev, 
            error: `فشل المزامنة: ${syncError instanceof Error ? syncError.message : 'خطأ غير معروف'}` 
          }));
        }
      }
      
      console.log(`🎉 [AutoSync] تمت مزامنة ${syncedCount} من ${unsyncedEvaluations.length} تقييم`);
      
      // تحديث الإحصائيات
      updateSyncStats();
      
    } catch (error) {
      console.error('❌ [AutoSync] خطأ في المزامنة التلقائية:', error);
    } finally {
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [state.isSyncing, currentUser]);

  /**
   * 📊 تحديث إحصائيات المزامنة
   */
  const updateSyncStats = useCallback(async () => {
    try {
      // جلب إحصائيات المزامنة من enhancedIndexedDB
      const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
      const allDataItems = await enhancedIndexedDB.getAllByType('data');
      
      const evaluationItems = allDataItems.filter(item => 
        item.id.startsWith('offline_checklist_') || 
        item.id.startsWith('evaluation_') ||
        item.id.startsWith('daily_checklist_') ||
        item.id.startsWith('checklist_') ||
        item.id.startsWith('unified_evaluation_') ||
        item.id.includes('_checklist_') ||
        (item.value && (
          item.value.tasks || 
          item.value.evaluationItems || 
          item.value.locationId || 
          item.value.checklistDate
        ))
      );
      
      const unsyncedItems = evaluationItems.filter(item => !item.value?.synced);
      
      setState(prev => ({
        ...prev,
        syncStats: {
          pendingSync: unsyncedItems.length,
          totalStored: evaluationItems.length,
          lastSyncTime: Date.now()
        },
        hasUnsynced: unsyncedItems.length > 0,
        isSyncing: false
      }));
    } catch (error) {
      console.error('❌ [useUnifiedEvaluation] فشل تحديث الإحصائيات:', error);
    }
  }, []);
  
  /**
   * 📊 تحديث الإحصائيات دورياً
   */
  useEffect(() => {
    updateSyncStats();
    
    const interval = setInterval(updateSyncStats, 5000);
    return () => clearInterval(interval);
  }, [updateSyncStats]);
  
  /**
   * 💾 حفظ تقييم (أونلاين أو أوفلاين)
   */
  const saveEvaluation = useCallback(async (
    locationId: number,
    taskRatings: any[],
    finalNotes?: string
  ): Promise<string> => {
    if (!currentUser) {
      throw new Error('المستخدم غير مسجل الدخول');
    }
    
    setState(prev => ({ ...prev, isSubmitting: true, error: null }));
    
    try {
      // إعداد البيانات بصيغة بسيطة مع إصلاح اسم المستخدم
      const userName = currentUser.fullName || currentUser.username || `مستخدم ${currentUser.id}`;
      const evaluatorName = currentUser.fullName || currentUser.username || `مستخدم ${currentUser.id}`;
      
      // 🕐 إنشاء توقيت دقيق للتقييم
      const now = new Date();
      const evaluationDateTime = now.toISOString();
      const evaluationTime = now.toTimeString().split(' ')[0]; // HH:MM:SS
      const evaluationTimestamp = Math.floor(now.getTime() / 1000); // Unix timestamp بالثواني
      
      // 🔄 [DATA_UNIFICATION] توحيد البيانات لتطابق مخطط الخادم بالكامل
      const evaluationData = {
        // الحقول الأساسية
        locationId,
        userId: currentUser.id,
        companyId: currentUser.companyId || 1,
        
        // البيانات الرئيسية
        tasks: taskRatings,
        categoryComments: {}, // ✅ إضافة - متطابق مع الخادم
        evaluationNotes: finalNotes,
        
        // التواريخ والتوقيت - متطابق مع الخادم
        checklistDate: now.toISOString().split('T')[0],
        completedAt: evaluationDateTime, // ✅ إضافة - متطابق مع الخادم
        createdAt: evaluationDateTime,   // ✅ إضافة - متطابق مع الخادم
        
        // التوقيت المحسن للتقارير
        evaluationTime: evaluationTime,
        evaluationDateTime: evaluationDateTime,
        evaluationTimestamp: evaluationTimestamp,
        
        // حقول المزامنة والتوافق
        syncTimestamp: Math.floor(Date.now() / 1000), // ✅ إصلاح - بالثواني
        isEncrypted: false, // ✅ إضافة - متطابق مع الخادم
        
        // بيانات إضافية محلية (لا تُرسل للخادم)
        _localUserName: userName,
        _localEvaluatorName: evaluatorName,
        _localTimestamp: Date.now()
      };
      
      let submissionId: string;
      
      // 🚀 نظام حفظ ذكي - يحاول الأونلاين ويتراجع للأوفلاين
      console.log('🔍 [UnifiedEval] تفاصيل الحفظ للمستخدم:', {
        username: currentUser?.username,
        userId: currentUser?.id,
        locationId,
        tasksCount: taskRatings?.length,
        isOnline: state.isOnline,
        evaluationData: evaluationData
      });
      
      try {
        if (state.isOnline) {
          console.log('🌐 [UnifiedEval] محاولة الحفظ الأونلاين للمستخدم:', currentUser?.username);
          
          // ✅ [FIX] إنشاء نسخة منظفة للخادم بدون تعديل البيانات الأصلية
          const {
            _localUserName,
            _localEvaluatorName, 
            _localTimestamp,
            ...serverData
          } = evaluationData;
          
          console.log('📤 [DATA_UNIFIED] البيانات المُرسلة للخادم:', {
            fieldsCount: Object.keys(serverData).length,
            hasCompletedAt: !!serverData.completedAt,
            hasCreatedAt: !!serverData.createdAt,
            hasCategoryComments: !!serverData.categoryComments,
            hasIsEncrypted: serverData.isEncrypted !== undefined,
            syncTimestamp: serverData.syncTimestamp
          });
          
          // محاولة الحفظ الأونلاين
          const response = await apiRequest('/api/checklists', 'POST', serverData);
          submissionId = `online_${response.id}`;
          
          // 🔄 [DATA_UNIFICATION] حفظ نسخة محلية للتقارير (متزامنة) - مع البيانات الموحدة
          const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
          const unifiedKey = `evaluation_${response.id}_${Date.now()}`;
          await enhancedIndexedDB.setItem(unifiedKey, {
            ...evaluationData, // البيانات الكاملة مع الحقول المحلية
            id: response.id,   // معرف الخادم
            synced: true,
            isSynced: true,    // ✅ متطابق مع الخادم  
            source: 'server',
            serverSynced: true,
            syncedAt: Date.now()
          }, 'data');
          
          console.log(`✅ [UnifiedEval] تم حفظ النسخة الموحدة: ${unifiedKey}`);
          
          console.log('✅ [UnifiedEval] تم الحفظ الأونلاين للمستخدم:', currentUser?.username, submissionId);
          
        } else {
          throw new Error('غير متصل بالإنترنت');
        }
        
      } catch (onlineError: any) {
        // 📱 التراجع للحفظ الأوفلاين
        console.log('📱 [UnifiedEval] فشل الأونلاين للمستخدم:', currentUser?.username, 'السبب:', onlineError?.message);
        console.log('📱 [UnifiedEval] بدء الحفظ الأوفلاين...');
        
        try {
          const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
          const offlineId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // 🔄 [DATA_UNIFICATION] البيانات المحلية - موحدة مع مخطط الخادم
          const offlineData = {
            ...evaluationData, // البيانات الموحدة الكاملة
            offlineId,
            isOffline: true,
            synced: false,
            isSynced: false,   // ✅ متطابق مع الخادم
            needsSync: true,
            savedAt: Date.now(),
            source: 'local'
          };
          
          await enhancedIndexedDB.setItem(`offline_checklist_${offlineId}`, offlineData, 'data');
          submissionId = offlineId;
          console.log('✅ [UnifiedEval] تم الحفظ الأوفلاين بنجاح للمستخدم:', currentUser?.username, 'معرف:', submissionId);
        } catch (offlineError: any) {
          console.error('❌ [UnifiedEval] فشل الحفظ الأوفلاين للمستخدم:', currentUser?.username, offlineError);
          throw offlineError;
        }
      }
      
      // تحديث الحالة
      setState(prev => ({
        ...prev,
        lastSubmissionId: submissionId,
        isSubmitting: false
      }));
      
      // تحديث الإحصائيات
      await updateSyncStats();
      
      return submissionId;
      
    } catch (error: any) {
      console.error('❌ [UnifiedEval] فشل حفظ التقييم:', error);
      
      setState(prev => ({
        ...prev,
        error: error.message || 'فشل في حفظ التقييم',
        isSubmitting: false
      }));
      
      throw error;
    }
  }, [currentUser, state.isOnline, updateSyncStats]);
  
  /**
   * 🔄 مزامنة فورية
   */
  const syncNow = useCallback(async (): Promise<boolean> => {
    if (!state.isOnline) {
      setState(prev => ({ ...prev, error: 'لا يوجد اتصال بالإنترنت' }));
      return false;
    }
    
    setState(prev => ({ ...prev, isSyncing: true, error: null }));
    
    try {
      // مزامنة فورية بسيطة - البحث عن البيانات غير المتزامنة
      const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
      const allDataItems = await enhancedIndexedDB.getAllByType('data');
      
      let syncedCount = 0;
      
      for (const item of allDataItems) {
        if (item.id.startsWith('offline_checklist_') && item.value && !item.value.synced) {
          try {
            // ✅ [FIX] إنشاء نسخة منظفة للخادم بدون تعديل البيانات الأصلية
            const {
              _localUserName,
              _localEvaluatorName,
              _localTimestamp,
              isOffline,
              synced,      // مختلف عن isSynced - لا نرسله
              needsSync,
              savedAt,
              source,
              ...serverData
            } = item.value;
            
            // ✅ الاحتفاظ بالحقول الموجودة في الخادم:
            // - offlineId (موجود في الخادم)
            // - isSynced (موجود في الخادم)
            
            console.log('📤 [SYNC_UNIFIED] مزامنة البيانات للخادم:', {
              itemId: item.id,
              fieldsCount: Object.keys(serverData).length,
              hasUnifiedFields: !!serverData.completedAt && !!serverData.createdAt
            });
            
            // محاولة مزامنة العنصر
            const response = await apiRequest('/api/checklists', 'POST', serverData);
            
            // 🔄 [DATA_UNIFICATION] تحديث حالة العنصر كمتزامن - مع البيانات الموحدة
            await enhancedIndexedDB.setItem(item.id, {
              ...item.value, // البيانات الأصلية مع الحقول المحلية
              id: response.id, // معرف الخادم
              synced: true,
              isSynced: true,  // ✅ متطابق مع الخادم
              syncedAt: Date.now(),
              source: 'server',
              serverSynced: true
            }, 'data');
            
            // إنشاء نسخة إضافية للتقارير مع معرف الخادم
            const unifiedKey = `evaluation_${response.id}_synced_${Date.now()}`;
            await enhancedIndexedDB.setItem(unifiedKey, {
              ...item.value,
              id: response.id,
              synced: true,
              isSynced: true,
              source: 'server',
              serverSynced: true,
              syncedAt: Date.now(),
              originalOfflineId: item.id
            }, 'data');
            
            console.log(`✅ [UnifiedEval] تم إنشاء نسخة موحدة: ${unifiedKey}`);
            
            syncedCount++;
          } catch (syncError) {
            console.warn(`⚠️ فشل مزامنة ${item.id}:`, syncError);
          }
        }
      }
      
      console.log(`✅ تم مزامنة ${syncedCount} عنصر`);
      const success = syncedCount >= 0;
      
      if (success) {
        console.log('✅ [UnifiedEval] تمت المزامنة الفورية');
      }
      
      await updateSyncStats();
      
      setState(prev => ({ ...prev, isSyncing: false }));
      
      return success;
      
    } catch (error: any) {
      console.error('❌ [UnifiedEval] فشل المزامنة الفورية:', error);
      
      setState(prev => ({
        ...prev,
        error: error.message || 'فشل في المزامنة',
        isSyncing: false
      }));
      
      return false;
    }
  }, [state.isOnline, updateSyncStats]);
  
  /**
   * 📋 جلب التقييمات المحلية فقط
   */
  const getLocalEvaluations = useCallback(async (syncedOnly: boolean = false): Promise<any[]> => {
    try {
      console.log('📱 [UnifiedEval] بدء جلب التقييمات المحلية...');
      
      // جلب التقييمات المحلية من enhancedIndexedDB
      const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
      const allDataItems = await enhancedIndexedDB.getAllByType('data');
      
      console.log(`🔍 [UnifiedEval] تم جلب ${allDataItems.length} عنصر من IndexedDB`);
      
      // فحص مفصل للعناصر المحتملة كتقييمات
      if (allDataItems.length > 0) {
        console.log(`🗂️ [UnifiedEval] فحص ${allDataItems.length} عنصر من IndexedDB للتقييمات`);
        
        // عرض عينة من المفاتيح الموجودة
        const sampleKeys = allDataItems.slice(0, 10).map(item => item.id);
        console.log('🔍 [UnifiedEval] عينة من المفاتيح الموجودة:', sampleKeys);
        
        // فحص المفاتيح المتعلقة بالتقييمات
        const relevantKeys = allDataItems.filter(item => 
          item.id.includes('checklist') || 
          item.id.includes('evaluation') || 
          item.id.includes('offline')
        );
        console.log(`🎯 [UnifiedEval] مفاتيح متعلقة بالتقييمات: ${relevantKeys.length}`);
        
        if (relevantKeys.length > 0) {
          console.log('🔍 [UnifiedEval] تفاصيل المفاتيح المتعلقة بالتقييمات:');
          relevantKeys.slice(0, 5).forEach(item => {
            console.log(`  📋 ${item.id}:`, {
              hasValue: !!item.value,
              timestamp: item.timestamp,
              valuePreview: item.value ? {
                locationId: item.value.locationId,
                userId: item.value.userId,
                tasksCount: (item.value.tasks || item.value.taskRatings || []).length,
                synced: item.value.synced || item.value.isSynced
              } : null
            });
          });
        }
      }
      
      // فحص عناصر IndexedDB للعثور على التقييمات الحقيقية فقط
      const checklistItems = allDataItems.filter(item => {
        // استبعاد جميع البيانات المؤقتة والقوالب
        const excludedKeys = [
          'templates', 'locations_with_templates', 'cached_locations', 
          'dashboard_locations', 'location_', 'app_state', 'companies',
          'dashboard_settings', 'offline_locations'
        ];
        
        if (excludedKeys.some(key => item.id.includes(key))) {
          return false;
        }
        
        // البحث الشامل عن التقييمات الحقيقية فقط
        const isEvaluation = (
          item.id.startsWith('offline_checklist_') || 
          item.id.startsWith('evaluation_') ||
          item.id.startsWith('daily_checklist_') ||
          (item.id.startsWith('checklist_') && !item.id.includes('template')) ||
          item.id.startsWith('unified_evaluation_') ||
          (item.id.includes('_checklist_') && !item.id.includes('template')) ||
          (item.value && item.value.locationId && (
            item.value.tasks || 
            item.value.taskRatings ||
            item.value.evaluationItems ||
            item.value.checklistDate ||
            item.value.evaluationDate
          ))
        );
        
        // تشخيص مفصل لكل عنصر مرشح
        if (isEvaluation) {
          console.log(`  ✅ [UnifiedEval] عثر على تقييم: ${item.id}`, {
            hasValue: !!item.value,
            hasTasks: !!(item.value?.tasks || item.value?.taskRatings),
            hasLocation: !!item.value?.locationId,
            hasUser: !!item.value?.userId,
            hasDate: !!(item.value?.checklistDate || item.value?.evaluationDate),
            synced: item.value?.synced || item.value?.isSynced
          });
        }
        
        return isEvaluation;
      });
      
      console.log(`📋 [UnifiedEval] وُجد ${checklistItems.length} تقييم محلي`);
      
      if (checklistItems.length > 0) {
        console.log(`📄 [UnifiedEval] عينة من IDs:`, checklistItems.slice(0, 3).map(item => item.id));
        console.log(`📄 [UnifiedEval] عينة من البيانات:`, checklistItems.slice(0, 1).map(item => ({
          id: item.id,
          locationId: item.value?.locationId,
          date: item.value?.checklistDate,
          synced: item.value?.synced,
          hasValue: !!item.value,
        })));
        
        
        // إحصائيات التزامن
        const syncedCount = checklistItems.filter(item => item.value?.synced).length;
        const unsyncedCount = checklistItems.filter(item => !item.value?.synced).length;
        console.log(`🔄 [UnifiedEval] إحصائيات التزامن: ${syncedCount} متزامن، ${unsyncedCount} غير متزامن`);
      }
      
      const evaluations = checklistItems
        .filter(item => item.value) // التأكد من وجود value
        .map(item => ({
          ...item.value,
          id: item.id,
          source: 'local'
        }));
      
      console.log(`✅ [UnifiedEval] تم تحويل ${evaluations.length} تقييم محلي`);
      
      
      if (syncedOnly) {
        const syncedEvals = evaluations.filter((evaluation: any) => evaluation.synced);
        console.log(`🔄 [UnifiedEval] تم فلترة ${syncedEvals.length} تقييم متزامن`);
        return syncedEvals;
      }
      
      return evaluations;
      
    } catch (error) {
      console.error('❌ [UnifiedEval] فشل جلب التقييمات المحلية:', error);
      return [];
    }
  }, []);

  /**
   * 🌐 جلب التقييمات من الخادم
   */
  const getServerEvaluations = useCallback(async (): Promise<any[]> => {
    try {
      if (!state.isOnline || !currentUser) {
        console.log('📡 [UnifiedEval] غير متصل أو غير مسجل - تخطي الخادم');
        return [];
      }

      console.log('🌐 [UnifiedEval] جلب التقييمات من الخادم...');
      
      // جلب التقييمات من النظام الحالي (checklists)
      const response = await apiRequest('/api/checklists', 'GET');
      
      if (Array.isArray(response)) {
        // تنسيق البيانات لتتطابق مع البنية الموحدة
        const serverEvaluations = response.map(evaluation => ({
          ...evaluation,
          synced: true,
          source: 'server',
          isOffline: false,
          id: `server_${evaluation.id}`
        }));
        
        console.log(`✅ [UnifiedEval] جُلب ${serverEvaluations.length} تقييم من الخادم`);
        return serverEvaluations;
      }
      
      return [];
      
    } catch (error) {
      console.error('❌ [UnifiedEval] فشل جلب التقييمات من الخادم:', error);
      return [];
    }
  }, [state.isOnline, currentUser]);

  /**
   * 🔄 جلب جميع التقييمات (محلي + خادم)
   */
  const getAllEvaluations = useCallback(async (): Promise<any[]> => {
    try {
      console.log('🔄 [UnifiedEval] جلب جميع التقييمات من كلا المصدرين...');
      
      // جلب البيانات من كلا المصدرين بشكل متوازي
      const [allLocalEvaluations, serverEvaluations] = await Promise.all([
        getLocalEvaluations(false), // جميع البيانات المحلية
        getServerEvaluations()      // جميع البيانات من الخادم
      ]);
      
      // ✅ إظهار جميع التقييمات - لا استبعاد للمتزامنة للاحتفاظ بالسجل الكامل
      const unsyncedLocalEvaluations = allLocalEvaluations.filter(e => !e.synced);
      const syncedLocalEvaluations = allLocalEvaluations.filter(e => e.synced);
      
      console.log(`📊 [UnifiedEval] النتائج: ${unsyncedLocalEvaluations.length} محلي غير متزامن، ${syncedLocalEvaluations.length} محلي متزامن (محفوظ)، ${serverEvaluations.length} خادم`);
      
      // ✅ دمج جميع البيانات: خادم + محلي (متزامن + غير متزامن)
      const allEvaluations = [
        ...serverEvaluations,           // جميع تقييمات الخادم
        ...syncedLocalEvaluations,      // التقييمات المحلية المتزامنة (محفوظة!)
        ...unsyncedLocalEvaluations     // التقييمات المحلية غير المتزامنة
      ];
      
      console.log(`✅ [UnifiedEval] إجمالي التقييمات المدمجة: ${allEvaluations.length} (${serverEvaluations.length} خادم + ${unsyncedLocalEvaluations.length} محلي غير متزامن)`);
      
      // ترتيب حسب التاريخ (الأحدث أولاً)
      return allEvaluations.sort((a, b) => {
        const dateA = new Date(a.checklistDate || a.evaluationDate || 0).getTime();
        const dateB = new Date(b.checklistDate || b.evaluationDate || 0).getTime();
        return dateB - dateA;
      });
      
    } catch (error) {
      console.error('❌ [UnifiedEval] فشل جلب جميع التقييمات:', error);
      return [];
    }
  }, [getLocalEvaluations, getServerEvaluations]);
  
  /**
   * 🧹 تنظيف البيانات القديمة
   */
  const cleanupOldData = useCallback(async (olderThanDays: number = 7): Promise<number> => {
    try {
      // تنظيف البيانات القديمة
      const { enhancedIndexedDB } = await import('@/lib/enhancedIndexedDB');
      const allDataItems = await enhancedIndexedDB.getAllByType('data');
      const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
      
      let cleaned = 0;
      
      for (const item of allDataItems) {
        if ((item.id.startsWith('offline_checklist_') || 
             item.id.startsWith('evaluation_') ||
             item.id.startsWith('daily_checklist_') ||
             item.id.startsWith('checklist_') ||
             item.id.startsWith('unified_evaluation_') ||
             item.id.includes('_checklist_')) 
            && item.timestamp < cutoffTime 
            && item.value?.synced) {
          await enhancedIndexedDB.removeItem(item.id);
          cleaned++;
        }
      }
      
      console.log('🧹 تم تنظيف البيانات القديمة:', cleaned);
      await updateSyncStats();
      return cleaned;
      
    } catch (error) {
      console.error('❌ [UnifiedEval] فشل تنظيف البيانات:', error);
      return 0;
    }
  }, [updateSyncStats]);
  
  /**
   * ❌ مسح الأخطاء
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);
  
  return {
    // الحالة
    ...state,
    
    // الدوال
    saveEvaluation,
    syncNow,
    getLocalEvaluations,
    getServerEvaluations,
    getAllEvaluations,  // ✅ الدالة الجديدة للحصول على جميع التقييمات
    cleanupOldData,
    clearError,
    
    // معلومات إضافية
    hasUnsynced: state.syncStats.pendingSync > 0,
    canSync: state.isOnline && !state.isSyncing,
    isReady: !!currentUser
  };
}

export default useUnifiedEvaluation;