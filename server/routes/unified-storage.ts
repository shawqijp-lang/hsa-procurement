/**
 * 🌐 مسارات API للنظام الموحد لتخزين البيانات
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { unifiedStorage } from '../unified-storage-system';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';

const router = Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key-2025";

// Middleware للتحقق من التوكن
async function authenticateToken(req: any, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const user = await storage.getUser(payload.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
}

/**
 * 🔍 فحص تكامل البيانات
 */
router.get('/integrity-check', authenticateToken, async (req: any, res) => {
  try {
    const currentUser = req.user;
    const companyId = currentUser.role === 'general_manager' ? undefined : currentUser.companyId;
    
    console.log(`🔍 فحص التكامل للشركة: ${companyId || 'جميع الشركات'}`);
    
    const report = await unifiedStorage.performIntegrityCheck(companyId);
    
    res.json({
      success: true,
      report,
      recommendations: generateRecommendations(report),
      timestamp: new Date().toLocaleString('sv-SE', {
        timeZone: 'Asia/Riyadh'
      })
    });

  } catch (error) {
    console.error('❌ خطأ في فحص التكامل:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في فحص تكامل البيانات',
      error: (error as Error).message
    });
  }
});

/**
 * 🔧 إصلاح وتوحيد البيانات
 */
router.post('/unify-repair', authenticateToken, async (req: any, res) => {
  try {
    const currentUser = req.user;
    const companyId = currentUser.role === 'general_manager' ? undefined : currentUser.companyId;
    
    console.log(`🔧 بدء التوحيد والإصلاح للشركة: ${companyId || 'جميع الشركات'}`);
    
    const report = await unifiedStorage.unifyAndRepairAllData(companyId);
    
    res.json({
      success: true,
      message: `تم إصلاح ${report.fixedIssues} مشكلة بنجاح`,
      beforeReport: {
        totalIssues: report.totalIssues,
        locationMismatches: report.locationMismatches,
        templateMismatches: report.templateMismatches,
        evaluationMismatches: report.evaluationMismatches,
        missingRelations: report.missingRelations,
        duplicateData: report.duplicateData
      },
      afterReport: report,
      fixedIssues: report.fixedIssues,
      timestamp: new Date().toLocaleString('sv-SE', {
        timeZone: 'Asia/Riyadh'
      })
    });

  } catch (error) {
    console.error('❌ خطأ في التوحيد والإصلاح:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في توحيد وإصلاح البيانات',
      error: (error as Error).message
    });
  }
});

/**
 * 📊 إحصائيات النظام الموحد
 */
router.get('/stats', authenticateToken, async (req: any, res) => {
  try {
    const currentUser = req.user;
    const companyId = currentUser.role === 'general_manager' ? undefined : currentUser.companyId;
    
    const stats = await unifiedStorage.getUnifiedSystemStats(companyId);
    
    res.json({
      success: true,
      stats,
      recommendations: generateHealthRecommendations(stats.summary.healthScore),
      timestamp: new Date().toLocaleString('sv-SE', {
        timeZone: 'Asia/Riyadh'
      })
    });

  } catch (error) {
    console.error('❌ خطأ في جلب الإحصائيات:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب إحصائيات النظام',
      error: (error as Error).message
    });
  }
});

/**
 * 🔄 إعادة بناء التقارير بالبيانات المصححة
 */
router.post('/rebuild-reports', authenticateToken, async (req: any, res) => {
  try {
    const currentUser = req.user;
    const { reportType = 'all', startDate, endDate, locationId, userId } = req.body;
    
    // أولاً نتأكد من تكامل البيانات
    const companyId = currentUser.role === 'general_manager' ? undefined : currentUser.companyId;
    const integrityReport = await unifiedStorage.performIntegrityCheck(companyId);
    
    if (integrityReport.totalIssues > 0) {
      return res.json({
        success: false,
        message: `تم العثور على ${integrityReport.totalIssues} مشكلة في البيانات. يرجى إصلاحها أولاً`,
        integrityIssues: integrityReport,
        suggestFix: true
      });
    }

    // إذا كانت البيانات سليمة، نبني التقارير
    res.json({
      success: true,
      message: 'البيانات سليمة ومتطابقة - التقارير جاهزة',
      integrityReport,
      reportsReady: true,
      availableReports: [
        { type: 'brief', name: 'التقرير المختصر', endpoint: '/api/excel-reports/evaluations' },
        { type: 'detailed', name: 'التقرير التفصيلي', endpoint: '/api/excel-reports/location-details' }
      ],
      timestamp: new Date().toLocaleString('sv-SE', {
        timeZone: 'Asia/Riyadh'
      })
    });

  } catch (error) {
    console.error('❌ خطأ في إعادة بناء التقارير:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إعادة بناء التقارير',
      error: (error as Error).message
    });
  }
});

/**
 * 📋 تحديث التقرير التفصيلي بالبيانات المطابقة
 */
router.post('/fix-report-data', authenticateToken, async (req: any, res) => {
  try {
    const currentUser = req.user;
    const companyId = currentUser.role === 'general_manager' ? undefined : currentUser.companyId;
    
    console.log('🔧 بدء إصلاح بيانات التقارير...');
    
    // تنفيذ الإصلاح الشامل
    const repairReport = await unifiedStorage.unifyAndRepairAllData(companyId);
    
    res.json({
      success: true,
      message: 'تم إصلاح وتوحيد بيانات التقارير بنجاح',
      fixedIssues: repairReport.fixedIssues,
      summary: {
        beforeFix: repairReport.totalIssues,
        afterFix: repairReport.totalIssues - repairReport.fixedIssues,
        improvementPercentage: repairReport.totalIssues > 0 
          ? Math.round((repairReport.fixedIssues / repairReport.totalIssues) * 100) 
          : 100
      },
      nextSteps: [
        'تحميل التقرير التفصيلي من صفحة التقارير',
        'التحقق من تطابق أسماء المواقع والمهام',
        'مراجعة التقييمات والتعليقات'
      ],
      timestamp: new Date().toLocaleString('sv-SE', {
        timeZone: 'Asia/Riyadh'
      })
    });

  } catch (error) {
    console.error('❌ خطأ في إصلاح بيانات التقارير:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إصلاح بيانات التقارير',
      error: (error as Error).message
    });
  }
});

/**
 * 🎯 توليد توصيات بناءً على تقرير التكامل
 */
function generateRecommendations(report: any): string[] {
  const recommendations: string[] = [];
  
  if (report.locationMismatches > 0) {
    recommendations.push(`إصلاح ${report.locationMismatches} موقع يحتوي على بيانات ناقصة`);
  }
  
  if (report.templateMismatches > 0) {
    recommendations.push(`تحديث ${report.templateMismatches} قالب مهام غير مكتمل`);
  }
  
  if (report.evaluationMismatches > 0) {
    recommendations.push(`إصلاح ${report.evaluationMismatches} تقييم يحتوي على بيانات غير صحيحة`);
  }
  
  if (report.missingRelations > 0) {
    recommendations.push(`حل ${report.missingRelations} علاقة مفقودة بين الجداول`);
  }
  
  if (report.duplicateData > 0) {
    recommendations.push(`إزالة ${report.duplicateData} سجل مكرر`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('البيانات متسقة وجاهزة للاستخدام في التقارير');
  } else {
    recommendations.push('استخدم إصلاح البيانات التلقائي لحل جميع المشاكل');
  }
  
  return recommendations;
}

/**
 * 💡 توصيات الصحة العامة للنظام
 */
function generateHealthRecommendations(healthScore: number): string[] {
  if (healthScore >= 90) {
    return ['النظام في حالة ممتازة', 'اجرِ فحص دوري شهري للحفاظ على الجودة'];
  } else if (healthScore >= 70) {
    return ['النظام في حالة جيدة', 'راجع البيانات المفقودة أو المكررة', 'قم بتشغيل الإصلاح التلقائي'];
  } else if (healthScore >= 50) {
    return ['النظام يحتاج للصيانة', 'شغّل الإصلاح الشامل فوراً', 'راجع العلاقات المفقودة'];
  } else {
    return ['النظام في حالة سيئة', 'الإصلاح الفوري مطلوب', 'تواصل مع الدعم الفني إذا استمرت المشاكل'];
  }
}

export default router;