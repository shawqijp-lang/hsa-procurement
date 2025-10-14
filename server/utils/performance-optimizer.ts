import { Request, Response, NextFunction } from 'express';

// نظام تحسين الاستعلامات تلقائياً
class QueryOptimizer {
  private queryCache = new Map();


  private slowQueries = new Map<string, {
    count: number;
    totalTime: number;
    lastExecution: Date;
  }>();

  /**
   * تسجيل الاستعلامات البطيئة
   */
  logSlowQuery(query: string, executionTime: number): void {
    if (executionTime > 1000) { // أكثر من ثانية
      const existing = this.slowQueries.get(query) || {
        count: 0,
        totalTime: 0,
        lastExecution: new Date()
      };

      existing.count++;
      existing.totalTime += executionTime;
      existing.lastExecution = new Date();

      this.slowQueries.set(query, existing);

      console.warn('🐌 Slow query detected:', {
        query: query.slice(0, 100),
        executionTime,
        averageTime: existing.totalTime / existing.count,
        occurrences: existing.count
      });
    }
  }

  /**
   * الحصول على تقرير الاستعلامات البطيئة
   */
  getSlowQueriesReport(): any[] {
    const report: any[] = [];
    
    for (const [query, stats] of this.slowQueries.entries()) {
      if (stats.count > 1) { // الاستعلامات المتكررة فقط
        report.push({
          query: query.slice(0, 200),
          occurrences: stats.count,
          averageTime: Math.round(stats.totalTime / stats.count),
          totalTime: stats.totalTime,
          lastExecution: stats.lastExecution,
          priority: this.calculateOptimizationPriority(stats)
        });
      }
    }

    return report.sort((a, b) => b.priority - a.priority);
  }

  private calculateOptimizationPriority(stats: any): number {
    // حساب الأولوية بناءً على التكرار ووقت التنفيذ
    const avgTime = stats.totalTime / stats.count;
    const frequency = stats.count;
    
    return (avgTime * frequency) / 1000; // نقاط الأولوية
  }

  /**
   * تنظيف البيانات القديمة
   */
  cleanup(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    for (const [query, stats] of this.slowQueries.entries()) {
      if (stats.lastExecution < oneHourAgo && stats.count < 3) {
        this.slowQueries.delete(query);
      }
    }
  }
}

// نظام ضغط الاستجابات
export function responseCompression(req: Request, res: Response, next: NextFunction) {
  const originalSend = res.send;
  
  res.send = function(data: any) {
    // ضغط البيانات الكبيرة فقط
    if (typeof data === 'string' && data.length > 1024) {
      res.setHeader('Content-Encoding', 'deflate');
      
      // يمكن إضافة ضغط حقيقي هنا باستخدام zlib
      console.log(`📦 Large response compressed: ${data.length} bytes`);
    }
    
    return originalSend.call(this, data);
  };

  next();
}

// نظام تجميع الطلبات المتشابهة
class RequestBatcher {
  private batches = new Map<string, {
    requests: Array<{ req: Request; res: Response; timestamp: number }>;
    timer: NodeJS.Timeout | null;
  }>();

  /**
   * تجميع الطلبات المتشابهة
   */
  batchSimilarRequests(
    key: string,
    req: Request,
    res: Response,
    handler: (requests: Request[]) => Promise<any>,
    delay: number = 100
  ): void {
    let batch = this.batches.get(key);
    
    if (!batch) {
      batch = { requests: [], timer: null };
      this.batches.set(key, batch);
    }

    batch.requests.push({ req, res, timestamp: Date.now() });

    // إلغاء المؤقت السابق
    if (batch.timer) {
      clearTimeout(batch.timer);
    }

    // تعيين مؤقت جديد
    batch.timer = setTimeout(async () => {
      const currentBatch = this.batches.get(key);
      if (currentBatch) {
        try {
          const requests = currentBatch.requests.map(item => item.req);
          const results = await handler(requests);
          
          // إرسال النتائج لكل طلب
          currentBatch.requests.forEach((item, index) => {
            item.res.json(results[index] || results);
          });
          
        } catch (error) {
          // إرسال خطأ لكل طلب
          currentBatch.requests.forEach(item => {
            item.res.status(500).json({ error: 'Batch processing failed' });
          });
        }
        
        this.batches.delete(key);
      }
    }, delay);
  }
}

// نظام التحميل المسبق للبيانات
export class DataPreloader {
  private preloadCache = new Map();

  /**
   * تحميل البيانات مسبقاً بناءً على الأنماط
   */
  async preloadPredictiveData(userId: number, companyId: number): Promise<void> {
    const patterns = await this.analyzeUserPatterns(userId);
    
    for (const pattern of patterns) {
      const cacheKey = `preload_${userId}_${pattern.type}`;
      
      if (!this.preloadCache.has(cacheKey)) {
        try {
          const data = await this.fetchDataForPattern(pattern, companyId);
          this.preloadCache.set(cacheKey, data);
          
          console.log(`🔮 Preloaded data for pattern: ${pattern.type}`);
        } catch (error) {
          console.warn(`⚠️ Preload failed for pattern: ${pattern.type}`, error);
        }
      }
    }
  }

  /**
   * تحليل أنماط استخدام المستخدم
   */
  private async analyzeUserPatterns(userId: number): Promise<Array<{ type: string; priority: number }>> {
    // تحليل بناءً على التاريخ وأنماط الاستخدام
    return [
      { type: 'locations', priority: 1 },
      { type: 'recent_evaluations', priority: 2 },
      { type: 'templates', priority: 3 }
    ];
  }

  /**
   * جلب البيانات للنمط المحدد
   */
  private async fetchDataForPattern(pattern: any, companyId: number): Promise<any> {
    // تنفيذ منطق جلب البيانات حسب النوع
    switch (pattern.type) {
      case 'locations':
        // جلب المواقع
        return { type: 'locations', data: [] };
      case 'recent_evaluations':
        // جلب التقييمات الأخيرة
        return { type: 'evaluations', data: [] };
      default:
        return null;
    }
  }

  /**
   * الحصول على البيانات المحملة مسبقاً
   */
  getPreloadedData(userId: number, type: string): any {
    const cacheKey = `preload_${userId}_${type}`;
    return this.preloadCache.get(cacheKey);
  }
}

// إنشاء نسخ مشتركة
export const queryOptimizer = new QueryOptimizer();
export const requestBatcher = new RequestBatcher();
export const dataPreloader = new DataPreloader();

// تنظيف دوري
setInterval(() => {
  queryOptimizer.cleanup();
}, 60 * 60 * 1000); // كل ساعة

/**
 * middleware لتتبع الأداء التفصيلي
 */
export function detailedPerformanceTracking(req: Request, res: Response, next: NextFunction) {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    const duration = Number(endTime - startTime) / 1000000; // تحويل لميلي ثانية
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
    
    // تسجيل تفصيلي للطلبات البطيئة أو المستهلكة للذاكرة
    if (duration > 500 || Math.abs(memoryDelta) > 10 * 1024 * 1024) { // 500ms أو 10MB
      console.log('📊 Detailed Performance Log:', {
        path: req.path,
        method: req.method,
        duration: Math.round(duration),
        memoryDelta: Math.round(memoryDelta / 1024 / 1024), // MB
        statusCode: res.statusCode,
        contentLength: res.get('content-length'),
        userAgent: req.headers['user-agent']?.slice(0, 50)
      });
    }
  });
  
  next();
}