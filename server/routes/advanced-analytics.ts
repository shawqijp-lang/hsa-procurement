/**
 * 🚀 مسارات التحليل المتقدم للبيانات
 * تطبق أحدث التقنيات العالمية في تحليل البيانات والذكاء الاصطناعي
 */

import { Router } from 'express';
// استيراد دالة التوثيق المباشرة من ملف routes.ts
import jwt from 'jsonwebtoken';

// دالة التوثيق المحلية
async function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
}
import { advancedAnalyticsService } from '../services/advancedAnalyticsService';
import { format } from 'date-fns';

const router = Router();

/**
 * 🔮 التحليل التنبؤي المتقدم
 * يستخدم خوارزميات التعلم الآلي للتنبؤ بالاتجاهات المستقبلية
 */
router.post('/predictive-analysis', authenticateToken, async (req: any, res) => {
  try {
    const { startDate, endDate, companyId } = req.body;
    const user = req.user;
    
    console.log('🔮 [Predictive Analytics] طلب تحليل تنبؤي من المستخدم:', user.username);
    
    // التحقق من الصلاحيات - فقط للمديرين والمشرفين
    if (!['admin', 'supervisor', 'enhanced_general_manager', 'admin_affairs_manager'].includes(user.role)) {
      return res.status(403).json({ 
        message: 'غير مصرح بالوصول للتحليل التنبؤي المتقدم' 
      });
    }
    
    // تطبيق قيود الشركة
    const effectiveCompanyId = user.role === 'enhanced_general_manager' ? companyId : user.companyId;
    
    const result = await advancedAnalyticsService.generatePredictiveAnalytics(
      startDate || format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      endDate || format(new Date(), 'yyyy-MM-dd'),
      effectiveCompanyId
    );
    
    console.log('✅ [Predictive Analytics] تم إنتاج التحليل التنبؤي بنجاح');
    
    res.json({
      success: true,
      data: result,
      generated_at: new Date().toISOString(),
      generated_by: user.username,
      analysis_type: 'predictive_analytics'
    });
    
  } catch (error: any) {
    console.error('❌ [Predictive Analytics] خطأ في التحليل التنبؤي:', error);
    res.status(500).json({
      message: 'فشل في إنتاج التحليل التنبؤي',
      error: error.message
    });
  }
});

/**
 * 🏆 تحليل الأداء المقارن (Benchmarking)
 * يقارن أداء الشركات والمواقع مع أفضل الممارسات
 */
router.post('/benchmark-analysis', authenticateToken, async (req: any, res) => {
  try {
    const { startDate, endDate } = req.body;
    const user = req.user;
    
    console.log('🏆 [Benchmark Analysis] طلب تحليل مقارن من المستخدم:', user.username);
    
    // التحقق من الصلاحيات - فقط للمديرين العامين ومديري الشؤون الإدارية
    if (!['enhanced_general_manager', 'admin_affairs_manager', 'hsa_group_admin'].includes(user.role)) {
      return res.status(403).json({ 
        message: 'غير مصرح بالوصول لتحليل الأداء المقارن' 
      });
    }
    
    const result = await advancedAnalyticsService.generateBenchmarkAnalysis(
      startDate || format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      endDate || format(new Date(), 'yyyy-MM-dd')
    );
    
    console.log('✅ [Benchmark Analysis] تم إنتاج التحليل المقارن بنجاح');
    
    res.json({
      success: true,
      data: result,
      generated_at: new Date().toISOString(),
      generated_by: user.username,
      analysis_type: 'benchmark_analysis'
    });
    
  } catch (error: any) {
    console.error('❌ [Benchmark Analysis] خطأ في التحليل المقارن:', error);
    res.status(500).json({
      message: 'فشل في إنتاج التحليل المقارن',
      error: error.message
    });
  }
});

/**
 * 🤖 التحليل الذكي المدعوم بالذكاء الاصطناعي
 * يستخدم نماذج OpenAI المتقدمة لتحليل البيانات
 */
router.post('/ai-insights', authenticateToken, async (req: any, res) => {
  try {
    const { startDate, endDate, companyId } = req.body;
    const user = req.user;
    
    console.log('🤖 [AI Insights] طلب تحليل ذكي من المستخدم:', user.username);
    
    // التحقق من الصلاحيات
    if (!['admin', 'supervisor', 'enhanced_general_manager', 'admin_affairs_manager'].includes(user.role)) {
      return res.status(403).json({ 
        message: 'غير مصرح بالوصول للتحليل الذكي المتقدم' 
      });
    }
    
    // جلب البيانات
    const data = await (advancedAnalyticsService as any).fetchComprehensiveData(
      startDate || format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      endDate || format(new Date(), 'yyyy-MM-dd'),
      user.role === 'enhanced_general_manager' ? companyId : user.companyId
    );
    
    // تطبيق التحليل الذكي
    const result = await advancedAnalyticsService.generateAIInsights(data);
    
    console.log('✅ [AI Insights] تم إنتاج التحليل الذكي بنجاح');
    
    res.json({
      success: true,
      data: result,
      generated_at: new Date().toISOString(),
      generated_by: user.username,
      analysis_type: 'ai_insights'
    });
    
  } catch (error: any) {
    console.error('❌ [AI Insights] خطأ في التحليل الذكي:', error);
    res.status(500).json({
      message: 'فشل في إنتاج التحليل الذكي',
      error: error.message
    });
  }
});

/**
 * 📊 تحليل البيانات الضخمة
 * يطبق تقنيات تحليل البيانات الضخمة لاستخراج أنماط معقدة
 */
router.post('/big-data-analysis', authenticateToken, async (req: any, res) => {
  try {
    const { startDate, endDate } = req.body;
    const user = req.user;
    
    console.log('📊 [Big Data Analysis] طلب تحليل البيانات الضخمة من المستخدم:', user.username);
    
    // التحقق من الصلاحيات - فقط للمديرين العامين
    if (!['enhanced_general_manager', 'hsa_group_admin'].includes(user.role)) {
      return res.status(403).json({ 
        message: 'غير مصرح بالوصول لتحليل البيانات الضخمة' 
      });
    }
    
    const result = await advancedAnalyticsService.performBigDataAnalytics(
      startDate || format(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // 3 أشهر افتراضياً
      endDate || format(new Date(), 'yyyy-MM-dd')
    );
    
    console.log('✅ [Big Data Analysis] تم إنتاج تحليل البيانات الضخمة بنجاح');
    
    res.json({
      success: true,
      data: result,
      generated_at: new Date().toISOString(),
      generated_by: user.username,
      analysis_type: 'big_data_analysis'
    });
    
  } catch (error: any) {
    console.error('❌ [Big Data Analysis] خطأ في تحليل البيانات الضخمة:', error);
    res.status(500).json({
      message: 'فشل في تحليل البيانات الضخمة',
      error: error.message
    });
  }
});

/**
 * ⚡ تحليل الأداء في الوقت الفعلي
 * يوفر تحليلاً مستمراً للأداء مع تحديثات فورية
 */
router.get('/real-time-analytics', authenticateToken, async (req: any, res) => {
  try {
    const user = req.user;
    
    console.log('⚡ [Real-time Analytics] طلب تحليل فوري من المستخدم:', user.username);
    
    // التحقق من الصلاحيات
    if (!['admin', 'supervisor', 'enhanced_general_manager', 'admin_affairs_manager'].includes(user.role)) {
      return res.status(403).json({ 
        message: 'غير مصرح بالوصول للتحليل الفوري' 
      });
    }
    
    const result = await advancedAnalyticsService.generateRealTimeAnalytics();
    
    console.log('✅ [Real-time Analytics] تم إنتاج التحليل الفوري بنجاح');
    
    res.json({
      success: true,
      data: result,
      generated_at: new Date().toISOString(),
      generated_by: user.username,
      analysis_type: 'real_time_analytics'
    });
    
  } catch (error: any) {
    console.error('❌ [Real-time Analytics] خطأ في التحليل الفوري:', error);
    res.status(500).json({
      message: 'فشل في التحليل الفوري',
      error: error.message
    });
  }
});

/**
 * 📈 تقرير تحليلي شامل متقدم
 * يجمع جميع أنواع التحليلات في تقرير واحد شامل
 */
router.post('/comprehensive-analysis', authenticateToken, async (req: any, res) => {
  try {
    const { startDate, endDate, companyId, includeAI = true, includePredictive = true } = req.body;
    const user = req.user;
    
    console.log('📈 [Comprehensive Analysis] طلب تحليل شامل من المستخدم:', user.username);
    
    // التحقق من الصلاحيات
    if (!['admin', 'supervisor', 'enhanced_general_manager', 'admin_affairs_manager'].includes(user.role)) {
      return res.status(403).json({ 
        message: 'غير مصرح بالوصول للتحليل الشامل' 
      });
    }
    
    const dateStart = startDate || format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    const dateEnd = endDate || format(new Date(), 'yyyy-MM-dd');
    const effectiveCompanyId = user.role === 'enhanced_general_manager' ? companyId : user.companyId;
    
    console.log('🔄 [Comprehensive Analysis] بدء التحليل الشامل...');
    
    // تشغيل التحليلات المختلفة بشكل متوازي
    const promises: Promise<any>[] = [];
    
    // التحليل التنبؤي
    if (includePredictive) {
      promises.push(
        advancedAnalyticsService.generatePredictiveAnalytics(dateStart, dateEnd, effectiveCompanyId)
          .catch(error => ({ error: 'فشل في التحليل التنبؤي: ' + error.message, type: 'predictive' }))
      );
    }
    
    // التحليل الذكي
    if (includeAI) {
      promises.push(
        (async () => {
          const data = await (advancedAnalyticsService as any).fetchComprehensiveData(dateStart, dateEnd, effectiveCompanyId);
          return await advancedAnalyticsService.generateAIInsights(data);
        })().catch(error => ({ error: 'فشل في التحليل الذكي: ' + error.message, type: 'ai' }))
      );
    }
    
    // التحليل المقارن (فقط للمديرين العامين)
    if (['enhanced_general_manager', 'admin_affairs_manager', 'hsa_group_admin'].includes(user.role)) {
      promises.push(
        advancedAnalyticsService.generateBenchmarkAnalysis(dateStart, dateEnd)
          .catch(error => ({ error: 'فشل في التحليل المقارن: ' + error.message, type: 'benchmark' }))
      );
    }
    
    // التحليل الفوري
    promises.push(
      advancedAnalyticsService.generateRealTimeAnalytics()
        .catch(error => ({ error: 'فشل في التحليل الفوري: ' + error.message, type: 'realtime' }))
    );
    
    const results = await Promise.all(promises);
    
    // تجميع النتائج
    const comprehensiveAnalysis = {
      summary: {
        period: { startDate: dateStart, endDate: dateEnd },
        generated_at: new Date().toISOString(),
        generated_by: user.username,
        analysis_types: []
      },
      predictive: null,
      ai_insights: null,
      benchmark: null,
      real_time: null,
      errors: []
    };
    
    // معالجة النتائج
    results.forEach((result, index) => {
      if (result.error) {
        (comprehensiveAnalysis.errors as any[]).push(result);
      } else {
        if (includePredictive && index === 0) {
          comprehensiveAnalysis.predictive = result;
          (comprehensiveAnalysis.summary.analysis_types as string[]).push('predictive');
        } else if (includeAI && ((includePredictive && index === 1) || (!includePredictive && index === 0))) {
          comprehensiveAnalysis.ai_insights = result;
          (comprehensiveAnalysis.summary.analysis_types as string[]).push('ai_insights');
        } else if (['enhanced_general_manager', 'admin_affairs_manager', 'hsa_group_admin'].includes(user.role)) {
          if (comprehensiveAnalysis.benchmark === null) {
            comprehensiveAnalysis.benchmark = result;
            (comprehensiveAnalysis.summary.analysis_types as string[]).push('benchmark');
          } else if (comprehensiveAnalysis.real_time === null) {
            comprehensiveAnalysis.real_time = result;
            (comprehensiveAnalysis.summary.analysis_types as string[]).push('real_time');
          }
        } else {
          comprehensiveAnalysis.real_time = result;
          (comprehensiveAnalysis.summary.analysis_types as string[]).push('real_time');
        }
      }
    });
    
    console.log('✅ [Comprehensive Analysis] تم إنتاج التحليل الشامل بنجاح');
    
    res.json({
      success: true,
      data: comprehensiveAnalysis,
      analysis_type: 'comprehensive_analysis'
    });
    
  } catch (error: any) {
    console.error('❌ [Comprehensive Analysis] خطأ في التحليل الشامل:', error);
    res.status(500).json({
      message: 'فشل في إنتاج التحليل الشامل',
      error: error.message
    });
  }
});

/**
 * 📋 قائمة أنواع التحليلات المتاحة
 * يعرض جميع أنواع التحليلات المتاحة للمستخدم حسب صلاحياته
 */
router.get('/available-analytics', authenticateToken, async (req: any, res) => {
  try {
    const user = req.user;
    
    const analytics = {
      predictive: ['admin', 'supervisor', 'enhanced_general_manager', 'admin_affairs_manager'].includes(user.role),
      ai_insights: ['admin', 'supervisor', 'enhanced_general_manager', 'admin_affairs_manager'].includes(user.role),
      benchmark: ['enhanced_general_manager', 'admin_affairs_manager', 'hsa_group_admin'].includes(user.role),
      big_data: ['enhanced_general_manager', 'hsa_group_admin'].includes(user.role),
      real_time: ['admin', 'supervisor', 'enhanced_general_manager', 'admin_affairs_manager'].includes(user.role),
      comprehensive: ['admin', 'supervisor', 'enhanced_general_manager', 'admin_affairs_manager'].includes(user.role)
    };
    
    res.json({
      success: true,
      data: analytics,
      user_role: user.role
    });
    
  } catch (error: any) {
    console.error('❌ خطأ في جلب التحليلات المتاحة:', error);
    res.status(500).json({
      message: 'فشل في جلب التحليلات المتاحة',
      error: error.message
    });
  }
});

export { router as advancedAnalyticsRouter };
export const registerAdvancedAnalyticsRoutes = (app: any) => {
  app.use('/api/advanced-analytics', router);
  console.log('✅ تم تسجيل مسارات التحليل المتقدم بنجاح');
};