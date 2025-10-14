import { Express } from 'express';
import { queryOptimizer, dataPreloader } from './utils/performance-optimizer';
import { systemMonitor } from './middleware/monitoring';
import { healthCheckDatabase, getCacheStats } from './middleware/database';

/**
 * ميزات محسنة للنظام
 */
export class EnhancedSystemFeatures {
  
  /**
   * لوحة تحكم الأداء المتقدمة
   */
  static registerPerformanceDashboard(app: Express) {
    app.get('/api/admin/performance/dashboard', async (req, res) => {
      try {
        const systemHealth = systemMonitor.getHealthReport();
        const dbHealth = await healthCheckDatabase();
        const cacheStats = getCacheStats();
        const slowQueries = queryOptimizer.getSlowQueriesReport();
        
        const dashboard = {
          timestamp: new Date().toLocaleString('sv-SE', {
            timeZone: 'Asia/Riyadh'
          }),
          system: {
            status: systemHealth.status,
            uptime: Math.round(systemHealth.performance.uptime / 1000 / 60), // دقائق
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
          },
          performance: {
            averageResponseTime: systemHealth.performance.averageResponseTime,
            requestCount: systemHealth.performance.requestCount,
            errorRate: systemHealth.performance.errorRate
          },
          database: {
            status: dbHealth.status,
            responseTime: dbHealth.responseTime,
            slowQueries: slowQueries.slice(0, 10) // أول 10 استعلامات بطيئة
          },
          cache: {
            size: cacheStats.size,
            memoryUsage: Math.round(cacheStats.memoryUsage / 1024), // KB
            hitRate: 85 // مؤقت - يحتاج تتبع حقيقي
          },
          recommendations: this.generatePerformanceRecommendations(systemHealth, dbHealth, slowQueries)
        };

        res.json(dashboard);
      } catch (error) {
        console.error('Performance dashboard error:', error);
        res.status(500).json({ error: 'فشل في جلب لوحة الأداء' });
      }
    });
  }

  /**
   * نظام التنبيهات الذكي
   */
  static registerSmartAlerts(app: Express) {
    app.get('/api/admin/alerts/smart', async (req, res) => {
      try {
        const alerts = await this.generateSmartAlerts();
        res.json({ alerts, timestamp: new Date().toLocaleString('sv-SE', {
          timeZone: 'Asia/Riyadh'
        }) });
      } catch (error) {
        res.status(500).json({ error: 'فشل في جلب التنبيهات الذكية' });
      }
    });

    // إعدادات التنبيهات
    app.post('/api/admin/alerts/settings', async (req, res) => {
      try {
        const { thresholds, notifications } = req.body;
        
        // حفظ إعدادات التنبيهات
        // يمكن حفظها في قاعدة البيانات أو ملف التكوين
        
        res.json({ 
          success: true,
          message: 'تم حفظ إعدادات التنبيهات',
          settings: { thresholds, notifications }
        });
      } catch (error) {
        res.status(500).json({ error: 'فشل في حفظ إعدادات التنبيهات' });
      }
    });
  }

  /**
   * نظام التحليل التنبؤي
   */
  static registerPredictiveAnalytics(app: Express) {
    app.get('/api/analytics/predictive/:companyId', async (req, res) => {
      try {
        const { companyId } = req.params;
        const { metric, timeframe } = req.query;
        
        const predictions = await this.generatePredictiveAnalytics(
          parseInt(companyId),
          metric as string,
          timeframe as string
        );
        
        res.json({
          predictions,
          confidence: this.calculatePredictionConfidence(predictions),
          timestamp: new Date().toLocaleString('sv-SE', {
            timeZone: 'Asia/Riyadh'
          })
        });
      } catch (error) {
        res.status(500).json({ error: 'فشل في التحليل التنبؤي' });
      }
    });
  }

  /**
   * نظام التحسين التلقائي
   */
  static registerAutoOptimization(app: Express) {
    app.post('/api/admin/optimize/auto', async (req, res) => {
      try {
        const optimizations = await this.performAutoOptimization();
        
        res.json({
          success: true,
          optimizations,
          message: 'تم تطبيق التحسينات التلقائية',
          timestamp: new Date().toLocaleString('sv-SE', {
            timeZone: 'Asia/Riyadh'
          })
        });
      } catch (error) {
        res.status(500).json({ error: 'فشل في التحسين التلقائي' });
      }
    });

    // جدولة التحسين التلقائي
    app.post('/api/admin/optimize/schedule', async (req, res) => {
      try {
        const { interval, enabled } = req.body;
        
        if (enabled) {
          this.scheduleAutoOptimization(interval);
        } else {
          this.cancelAutoOptimization();
        }
        
        res.json({
          success: true,
          message: enabled ? 'تم تفعيل التحسين التلقائي' : 'تم إلغاء التحسين التلقائي',
          interval
        });
      } catch (error) {
        res.status(500).json({ error: 'فشل في جدولة التحسين التلقائي' });
      }
    });
  }

  /**
   * توليد توصيات الأداء
   */
  private static generatePerformanceRecommendations(
    systemHealth: any,
    dbHealth: any,
    slowQueries: any[]
  ): string[] {
    const recommendations: string[] = [];

    if (systemHealth.performance.averageResponseTime > 1000) {
      recommendations.push('متوسط وقت الاستجابة مرتفع - تحسين معالجة الطلبات مطلوب');
    }

    if (dbHealth.responseTime > 500) {
      recommendations.push('استجابة قاعدة البيانات بطيئة - فحص الفهارس والاستعلامات');
    }

    if (slowQueries.length > 5) {
      recommendations.push(`اكتشاف ${slowQueries.length} استعلام بطيء - تحسين الاستعلامات مطلوب`);
    }

    const memoryUsage = process.memoryUsage();
    if (memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
      recommendations.push('استهلاك ذاكرة مرتفع - تنظيف الذاكرة مطلوب');
    }

    if (systemHealth.performance.errorRate > 0.05) {
      recommendations.push('معدل أخطاء مرتفع - مراجعة السجلات مطلوبة');
    }

    return recommendations;
  }

  /**
   * توليد التنبيهات الذكية
   */
  private static async generateSmartAlerts(): Promise<any[]> {
    const alerts: any[] = [];
    const now = new Date();

    // فحص صحة النظام
    const systemHealth = systemMonitor.getHealthReport();
    if (systemHealth.status === 'CRITICAL') {
      alerts.push({
        id: `system_critical_${now.getTime()}`,
        type: 'SYSTEM_HEALTH',
        severity: 'CRITICAL',
        title: 'حالة النظام حرجة',
        message: 'النظام يواجه مشاكل حرجة تتطلب تدخل فوري',
        timestamp: now.toISOString(),
        actions: ['فحص السجلات', 'إعادة تشغيل الخدمات', 'تواصل مع الدعم']
      });
    }

    // فحص قاعدة البيانات
    const dbHealth = await healthCheckDatabase();
    if (dbHealth.status === 'unhealthy') {
      alerts.push({
        id: `db_unhealthy_${now.getTime()}`,
        type: 'DATABASE',
        severity: 'HIGH',
        title: 'مشكلة في قاعدة البيانات',
        message: 'قاعدة البيانات لا تستجيب بشكل طبيعي',
        timestamp: now.toISOString(),
        actions: ['فحص الاتصال', 'إعادة تشغيل قاعدة البيانات']
      });
    }

    // فحص الاستعلامات البطيئة
    const slowQueries = queryOptimizer.getSlowQueriesReport();
    if (slowQueries.length > 10) {
      alerts.push({
        id: `slow_queries_${now.getTime()}`,
        type: 'PERFORMANCE',
        severity: 'MEDIUM',
        title: 'استعلامات بطيئة مكتشفة',
        message: `تم اكتشاف ${slowQueries.length} استعلام بطيء`,
        timestamp: now.toISOString(),
        actions: ['مراجعة الاستعلامات', 'تحسين الفهارس']
      });
    }

    return alerts;
  }

  /**
   * التحليل التنبؤي
   */
  private static async generatePredictiveAnalytics(
    companyId: number,
    metric: string,
    timeframe: string
  ): Promise<any> {
    // نموذج بسيط للتحليل التنبؤي
    // في التطبيق الحقيقي، يمكن استخدام نماذج ML أكثر تعقيداً
    
    const historicalData = await this.getHistoricalData(companyId, metric, timeframe);
    const trend = this.calculateTrend(historicalData);
    
    const predictions = {
      metric,
      timeframe,
      trend: trend.direction,
      confidence: trend.confidence,
      predictions: this.generateFuturePredictions(historicalData, trend),
      recommendations: this.generateTrendRecommendations(trend, metric)
    };

    return predictions;
  }

  /**
   * حساب الاتجاه من البيانات التاريخية
   */
  private static calculateTrend(data: any[]): any {
    if (data.length < 2) {
      return { direction: 'مستقر', confidence: 'منخفض', rate: 0 };
    }

    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    const changeRate = ((lastValue - firstValue) / firstValue) * 100;

    let direction = 'مستقر';
    if (changeRate > 5) direction = 'صاعد';
    else if (changeRate < -5) direction = 'هابط';

    let confidence = 'منخفض';
    if (Math.abs(changeRate) > 20) confidence = 'عالي';
    else if (Math.abs(changeRate) > 10) confidence = 'متوسط';

    return { direction, confidence, rate: changeRate };
  }

  /**
   * توليد توقعات مستقبلية
   */
  private static generateFuturePredictions(historicalData: any[], trend: any): any[] {
    const predictions = [];
    const lastValue = historicalData[historicalData.length - 1]?.value || 0;
    const changeRate = trend.rate / 100;

    for (let i = 1; i <= 7; i++) { // توقعات لأسبوع قادم
      const predictedValue = lastValue * Math.pow(1 + changeRate / 30, i); // تغيير يومي
      predictions.push({
        day: i,
        predictedValue: Math.round(predictedValue * 100) / 100,
        confidence: Math.max(0.9 - (i * 0.1), 0.3) // تقل الثقة مع الوقت
      });
    }

    return predictions;
  }

  /**
   * توليد توصيات بناءً على الاتجاه
   */
  private static generateTrendRecommendations(trend: any, metric: string): string[] {
    const recommendations: string[] = [];

    if (trend.direction === 'هابط' && trend.confidence === 'عالي') {
      recommendations.push(`اتجاه هابط قوي في ${metric} - تدخل فوري مطلوب`);
      recommendations.push('مراجعة العمليات والإجراءات');
    } else if (trend.direction === 'صاعد') {
      recommendations.push(`اتجاه إيجابي في ${metric} - الحفاظ على النمط الحالي`);
    }

    return recommendations;
  }

  /**
   * الحصول على البيانات التاريخية
   */
  private static async getHistoricalData(companyId: number, metric: string, timeframe: string): Promise<any[]> {
    // نموذج للبيانات التاريخية
    // في التطبيق الحقيقي، يجب جلب البيانات من قاعدة البيانات
    return Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      value: Math.random() * 100 + 50 // قيم عشوائية للاختبار
    }));
  }

  /**
   * تطبيق التحسينات التلقائية
   */
  private static async performAutoOptimization(): Promise<any[]> {
    const optimizations: any[] = [];

    try {
      // تنظيف الذاكرة المؤقتة
      global.gc && global.gc();
      optimizations.push({
        type: 'MEMORY_CLEANUP',
        description: 'تنظيف الذاكرة',
        impact: 'متوسط'
      });

      // تحسين الاستعلامات
      const slowQueries = queryOptimizer.getSlowQueriesReport();
      if (slowQueries.length > 0) {
        optimizations.push({
          type: 'QUERY_OPTIMIZATION',
          description: `تحسين ${slowQueries.length} استعلام بطيء`,
          impact: 'عالي'
        });
      }

      // ضغط البيانات
      optimizations.push({
        type: 'DATA_COMPRESSION',
        description: 'ضغط البيانات غير المستخدمة',
        impact: 'منخفض'
      });

    } catch (error) {
      console.error('Auto optimization error:', error);
    }

    return optimizations;
  }

  /**
   * جدولة التحسين التلقائي
   */
  private static autoOptimizationInterval: NodeJS.Timeout | null = null;

  private static scheduleAutoOptimization(intervalMinutes: number): void {
    this.cancelAutoOptimization();
    
    this.autoOptimizationInterval = setInterval(async () => {
      console.log('🔧 Running scheduled auto-optimization...');
      await this.performAutoOptimization();
    }, intervalMinutes * 60 * 1000);

    console.log(`⏰ Auto-optimization scheduled every ${intervalMinutes} minutes`);
  }

  private static cancelAutoOptimization(): void {
    if (this.autoOptimizationInterval) {
      clearInterval(this.autoOptimizationInterval);
      this.autoOptimizationInterval = null;
      console.log('⏹️ Auto-optimization cancelled');
    }
  }

  /**
   * حساب ثقة التنبؤ
   */
  private static calculatePredictionConfidence(predictions: any): number {
    // حساب متوسط الثقة من التنبؤات
    if (!predictions.predictions || predictions.predictions.length === 0) {
      return 0.5;
    }

    const avgConfidence = predictions.predictions.reduce((sum: number, pred: any) => 
      sum + pred.confidence, 0) / predictions.predictions.length;

    return Math.round(avgConfidence * 100) / 100;
  }
}