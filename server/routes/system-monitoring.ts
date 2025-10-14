import type { Express } from 'express';
import { systemMonitor } from '../middleware/monitoring';
import { healthCheckDatabase, getCacheStats } from '../middleware/database';

/**
 * تسجيل مسارات المراقبة المتقدمة للنظام
 */
export function registerSystemMonitoringRoutes(app: Express) {
  // API للحصول على تقرير صحة النظام
  app.get('/api/system/health', async (req, res) => {
    try {
      const dbHealth = await healthCheckDatabase();
      const systemHealth = systemMonitor.getHealthReport();
      const cacheStats = getCacheStats();

      const overallHealth = {
        database: dbHealth,
        performance: systemHealth.performance,
        security: systemHealth.security,
        cache: cacheStats,
        status: systemHealth.status,
        timestamp: new Date().toISOString()
      };

      // تحديد الحالة العامة
      let overallStatus = 'HEALTHY';
      if (dbHealth.status === 'unhealthy' || systemHealth.status === 'CRITICAL') {
        overallStatus = 'CRITICAL';
      } else if (systemHealth.status === 'WARNING') {
        overallStatus = 'WARNING';
      }

      res.json({
        status: overallStatus,
        health: overallHealth,
        recommendations: generateHealthRecommendations(overallHealth)
      });

    } catch (error) {
      console.error('🔴 System health check failed:', error);
      res.status(500).json({
        status: 'ERROR',
        message: 'فشل في فحص صحة النظام',
        error: (error as Error).message
      });
    }
  });

  // API لإعادة تعيين معايير الأداء
  app.post('/api/system/metrics/reset', (req, res) => {
    try {
      systemMonitor.resetMetrics();
      res.json({
        success: true,
        message: 'تم إعادة تعيين معايير الأداء بنجاح',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل في إعادة تعيين المعايير',
        error: (error as Error).message
      });
    }
  });

  // API للحصول على الأحداث الأمنية الأخيرة
  app.get('/api/system/security/events', (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const severity = req.query.severity as string;
      
      // ملاحظة: هذا يتطلب إضافة وظيفة getSecurityEvents للـ systemMonitor
      // const events = systemMonitor.getSecurityEvents(limit, severity);
      
      // مؤقتاً - نموذج للبيانات
      const mockEvents = [
        {
          timestamp: new Date().toISOString(),
          type: 'LOGIN_ATTEMPT',
          severity: 'LOW',
          details: { success: true, username: 'example' }
        }
      ];

      res.json({
        events: mockEvents,
        total: mockEvents.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        error: 'فشل في جلب الأحداث الأمنية',
        details: (error as Error).message
      });
    }
  });

  // API للإحصائيات المفصلة
  app.get('/api/system/stats/detailed', (req, res) => {
    try {
      const health = systemMonitor.getHealthReport();
      const cacheStats = getCacheStats();
      
      const detailedStats = {
        performance: {
          ...health.performance,
          cacheHitRate: calculateCacheHitRate(),
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage()
        },
        database: {
          connectionStatus: 'connected', // يجب الحصول عليها من فحص حقيقي
          activeConnections: 1, // مؤقت
          queryCount: health.performance.requestCount
        },
        cache: cacheStats,
        security: health.security,
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || 'development'
        }
      };

      res.json(detailedStats);

    } catch (error) {
      res.status(500).json({
        error: 'فشل في جلب الإحصائيات المفصلة',
        details: (error as Error).message
      });
    }
  });
}

/**
 * حساب معدل نجاح الذاكرة المؤقتة
 */
function calculateCacheHitRate(): number {
  // هذا يتطلب تتبع Cache hits/misses في middleware/database.ts
  // مؤقتاً نعيد قيمة تقديرية
  return 0.85; // 85% hit rate
}

/**
 * إنتاج توصيات صحة النظام
 */
function generateHealthRecommendations(health: any): string[] {
  const recommendations: string[] = [];

  if (health.database.responseTime > 1000) {
    recommendations.push('استجابة قاعدة البيانات بطيئة - فحص الفهارس والاستعلامات');
  }

  if (health.performance.averageResponseTime > 2000) {
    recommendations.push('متوسط وقت الاستجابة مرتفع - فحص عمليات الخادم');
  }

  if (health.performance.errorRate > 0.05) {
    recommendations.push('معدل الأخطاء مرتفع - مراجعة سجلات الأخطاء');
  }

  if (health.cache.size > 1000) {
    recommendations.push('حجم الذاكرة المؤقتة كبير - تنظيف دوري مطلوب');
  }

  if (health.security.criticalEvents > 0) {
    recommendations.push('أحداث أمنية حرجة مكتشفة - فحص فوري مطلوب');
  }

  if (recommendations.length === 0) {
    recommendations.push('النظام يعمل بكفاءة عالية - لا توجد مشاكل مكتشفة');
  }

  return recommendations;
}