/**
 * 📊 API routes للنظام الموحد للتقييمات الجديد
 * يدير حفظ ومزامنة وجلب التقييمات من النظام الموحد
 */

import express from 'express';
import { db } from './db';
import { unifiedEvaluations } from '../shared/unifiedEvaluationSchema';
import { eq, and, gte, lte, desc, inArray } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { storage } from './storage';

const router = express.Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
  return 'fallback-secret-for-development-only';
})();

interface JWTPayload {
  userId: number;
  id: number;
  role: string;
  username: string;
  companyId?: number;
}

// دالة المصادقة
async function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (process.env.NODE_ENV === 'development') {
    console.log('🔐 Auth middleware - Token present:', !!token);
  }

  if (!token) {
    console.log('❌ Auth middleware - No token provided');
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload & { companyId?: number };
    if (process.env.NODE_ENV === 'development') {
      console.log('🔓 Auth middleware - User decoded:', { 
        id: decoded.id, 
        userId: decoded.userId, 
        companyId: decoded.companyId 
      });
    }
    
    // Try both 'id' and 'userId' fields for backward compatibility
    const userId = decoded.id || decoded.userId;
    if (!userId) {
      console.log('❌ Auth middleware - No user ID in token');
      return res.status(403).json({ message: 'Invalid token format' });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      console.log('❌ Auth middleware - User not found:', userId);
      return res.status(401).json({ message: 'User not found' });
    }
    
    if (!user.isActive) {
      console.log('❌ Auth middleware - User is inactive:', userId);
      return res.status(401).json({ message: 'User account is disabled' });
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Auth middleware - User authenticated:', { 
        id: user.id, 
        role: user.role, 
        username: user.username,
        companyId: user.companyId 
      });
    }
    
    req.user = user;
    req.userCompanyId = user.companyId; // Set company context
    next();
  } catch (error) {
    console.log('❌ Auth middleware - Token verification failed:', error);
    return res.status(403).json({ message: 'Invalid token' });
  }
}

/**
 * 📊 GET: جلب جميع التقييمات الموحدة (للمطور)
 */
router.get('/api/unified-evaluations/all', authenticateToken, async (req: any, res) => {
  try {
    console.log('📊 [UnifiedAPI] طلب جلب جميع التقييمات الموحدة');
    
    const allEvaluations = await db
      .select()
      .from(unifiedEvaluations)
      .orderBy(desc(unifiedEvaluations.createdAt))
      .limit(50); // حد أقصى 50 تقييم
    
    console.log(`✅ [UnifiedAPI] تم جلب ${allEvaluations.length} تقييم موحد`);
    
    res.json(allEvaluations);
  } catch (error) {
    console.error('❌ [UnifiedAPI] خطأ في جلب التقييمات الموحدة:', error);
    res.status(500).json({ 
      success: false,
      message: 'فشل في جلب التقييمات الموحدة',
      error: (error as Error).message 
    });
  }
});

/**
 * 📤 حفظ تقييم جديد في النظام الموحد
 */
router.post('/api/unified-evaluations', authenticateToken, async (req: any, res) => {
  try {
    const currentUser = req.user;
    
    if (!currentUser || !currentUser.id) {
      console.log('❌ [UnifiedAPI] صلاحيات غير كافية');
      return res.status(401).json({ 
        success: false,
        message: 'غير مسموح - يجب تسجيل الدخول أولاً'
      });
    }

    const evaluationData = req.body;
    
    console.log('📊 [UnifiedAPI] استلام تقييم جديد:', {
      evaluationId: evaluationData.evaluationId,
      locationName: evaluationData.locationNameAr,
      evaluatorId: evaluationData.evaluatorId,
      itemsCount: evaluationData.evaluationItems?.length || 0
    });

    // التحقق من عدم وجود التقييم مسبقاً
    const existingEvaluation = await db
      .select()
      .from(unifiedEvaluations)
      .where(eq(unifiedEvaluations.evaluationId, evaluationData.evaluationId))
      .limit(1);

    if (existingEvaluation.length > 0) {
      console.log('⚠️ [UnifiedAPI] التقييم موجود مسبقاً:', evaluationData.evaluationId);
      return res.json({
        success: true,
        message: 'التقييم موجود مسبقاً',
        evaluationId: evaluationData.evaluationId
      });
    }

    // تحضير البيانات للحفظ مع إضافة companyId من المستخدم المسجل
    const newEvaluation = {
      evaluationId: evaluationData.evaluationId,
      locationId: evaluationData.locationId,
      locationNameAr: evaluationData.locationNameAr,
      locationNameEn: evaluationData.locationNameEn,
      evaluatorId: evaluationData.evaluatorId,
      evaluatorName: evaluationData.evaluatorName,
      companyId: evaluationData.companyId || currentUser.companyId, // استخدام companyId من المستخدم المسجل
      companyNameAr: evaluationData.companyNameAr,
      companyNameEn: evaluationData.companyNameEn,
      evaluationTimestamp: new Date(evaluationData.evaluationTimestamp),
      evaluationDate: evaluationData.evaluationDate,
      evaluationTime: evaluationData.evaluationTime,
      evaluationItems: evaluationData.evaluationItems,
      generalNotes: evaluationData.generalNotes,
      overallRating: evaluationData.overallRating,
      isSynced: true, // متزامن في الخادم
      syncTimestamp: new Date(),
      source: evaluationData.source || 'offline'
    };

    // حفظ في قاعدة البيانات
    const result = await db
      .insert(unifiedEvaluations)
      .values(newEvaluation)
      .returning({ id: unifiedEvaluations.id });

    console.log('✅ [UnifiedAPI] تم حفظ التقييم بنجاح:', {
      id: result[0].id,
      evaluationId: evaluationData.evaluationId,
      locationName: evaluationData.locationNameAr
    });

    res.json({
      success: true,
      message: 'تم حفظ التقييم بنجاح',
      evaluationId: evaluationData.evaluationId,
      id: result[0].id
    });

  } catch (error) {
    console.error('❌ [UnifiedAPI] خطأ في حفظ التقييم:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم أثناء حفظ التقييم'
    });
  }
});

/**
 * 📋 جلب التقييمات من النظام الموحد (للتقارير)
 */
router.get('/api/unified-evaluations', authenticateToken, async (req: any, res) => {
  try {
    const currentUser = req.user;
    
    if (!currentUser || !currentUser.id) {
      return res.status(401).json({ 
        success: false,
        message: 'غير مسموح - يجب تسجيل الدخول أولاً'
      });
    }

    const {
      startDate,
      endDate,
      locationIds,
      evaluatorIds,
      companyId
    } = req.query;

    console.log('📋 [UnifiedAPI] جلب التقييمات الموحدة:', {
      startDate,
      endDate,
      locationIds: locationIds ? locationIds.split(',') : [],
      evaluatorIds: evaluatorIds ? evaluatorIds.split(',') : [],
      companyId: companyId || currentUser.companyId
    });

    // إنشاء شروط التصفية
    const conditions: any[] = [];
    
    // تصفية الشركة (أمان)
    if (currentUser.role !== 'super_admin' && currentUser.role !== 'general_manager') {
      conditions.push(eq(unifiedEvaluations.companyId, currentUser.companyId));
    } else if (companyId) {
      conditions.push(eq(unifiedEvaluations.companyId, parseInt(companyId as string)));
    }

    // تصفية التاريخ
    if (startDate) {
      conditions.push(gte(unifiedEvaluations.evaluationDate, startDate as string));
    }
    if (endDate) {
      conditions.push(lte(unifiedEvaluations.evaluationDate, endDate as string));
    }

    // تصفية المواقع
    if (locationIds) {
      const locationIdArray = (locationIds as string).split(',').map(id => parseInt(id));
      conditions.push(inArray(unifiedEvaluations.locationId, locationIdArray));
    }

    // تصفية المُقيمين
    if (evaluatorIds) {
      const evaluatorIdArray = (evaluatorIds as string).split(',').map(id => parseInt(id));
      conditions.push(inArray(unifiedEvaluations.evaluatorId, evaluatorIdArray));
    }

    // جلب البيانات
    const evaluations = await db
      .select()
      .from(unifiedEvaluations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(unifiedEvaluations.evaluationTimestamp));

    console.log(`✅ [UnifiedAPI] تم جلب ${evaluations.length} تقييم موحد`);

    res.json({
      success: true,
      evaluations,
      count: evaluations.length
    });

  } catch (error) {
    console.error('❌ [UnifiedAPI] خطأ في جلب التقييمات:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم أثناء جلب التقييمات'
    });
  }
});

/**
 * 📊 إحصائيات النظام الموحد
 */
router.get('/api/unified-evaluations/stats', authenticateToken, async (req: any, res) => {
  try {
    const currentUser = req.user;
    
    if (!currentUser || !currentUser.id) {
      return res.status(401).json({ 
        success: false,
        message: 'غير مسموح - يجب تسجيل الدخول أولاً'
      });
    }

    console.log('📊 [UnifiedAPI] جلب إحصائيات النظام الموحد');

    // شروط الأمان للشركة
    const companyCondition = currentUser.role !== 'super_admin' && currentUser.role !== 'general_manager'
      ? eq(unifiedEvaluations.companyId, currentUser.companyId)
      : undefined;

    // جلب جميع التقييمات للشركة
    const evaluations = await db
      .select()
      .from(unifiedEvaluations)
      .where(companyCondition);

    // حساب الإحصائيات
    const totalEvaluations = evaluations.length;
    const syncedEvaluations = evaluations.filter(evaluation => evaluation.isSynced).length;
    const unsyncedEvaluations = totalEvaluations - syncedEvaluations;
    
    // إحصائيات المصدر
    const offlineEvaluations = evaluations.filter(evaluation => evaluation.source === 'offline').length;
    const onlineEvaluations = totalEvaluations - offlineEvaluations;

    // المواقع الأكثر تقييماً
    const locationStats = evaluations.reduce((acc: any, evaluation) => {
      const locationName = evaluation.locationNameAr;
      acc[locationName] = (acc[locationName] || 0) + 1;
      return acc;
    }, {});

    console.log('✅ [UnifiedAPI] إحصائيات النظام الموحد:', {
      totalEvaluations,
      syncedEvaluations,
      unsyncedEvaluations,
      offlineEvaluations,
      onlineEvaluations
    });

    res.json({
      success: true,
      stats: {
        totalEvaluations,
        syncedEvaluations,
        unsyncedEvaluations,
        offlineEvaluations,
        onlineEvaluations,
        locationStats
      }
    });

  } catch (error) {
    console.error('❌ [UnifiedAPI] خطأ في جلب الإحصائيات:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم أثناء جلب الإحصائيات'
    });
  }
});

/**
 * 🔄 مزامنة يدوية للتقييمات من العميل
 */
router.post('/api/unified-evaluations/sync', authenticateToken, async (req: any, res) => {
  try {
    console.log('🔄 [UnifiedSync] طلب مزامنة يدوية من العميل');
    
    // استجابة فورية للعميل - المزامنة يجب أن تحدث من العميل للخادم
    res.status(200).json({ 
      status: 'success',
      message: 'نقطة المزامنة جاهزة - يجب أن يرسل العميل البيانات',
      timestamp: new Date().toISOString(),
      note: 'هذا endpoint لاستقبال بيانات المزامنة من العميل'
    });

  } catch (error) {
    console.error('❌ [UnifiedSync] خطأ في نقطة المزامنة:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'فشل في طلب المزامنة' 
    });
  }
});

/**
 * 🏥 فحص صحة النظام
 */
router.get('/api/health', async (req: any, res) => {
  try {
    res.json({
      success: true,
      message: 'النظام يعمل بشكل طبيعي',
      timestamp: new Date().toISOString(),
      server: 'unified-evaluation-system'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في فحص صحة النظام'
    });
  }
});

export default router;