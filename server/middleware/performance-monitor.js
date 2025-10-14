import { performance } from 'perf_hooks';

// مراقب استخدام الذاكرة والأداء
export class PerformanceMonitor {
  static startMemoryMonitoring() {
    // مراقبة دورية كل دقيقة
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100;
      const rssMB = Math.round(memUsage.rss / 1024 / 1024 * 100) / 100;
      
      console.log('📊 Memory Status:', {
        heapUsed: `${heapUsedMB} MB`,
        rss: `${rssMB} MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024 * 100) / 100} MB`
      });

      // تحذير عند استخدام ذاكرة مرتفع
      if (heapUsedMB > 300) {
        console.warn('⚠️ HIGH MEMORY USAGE:', `${heapUsedMB} MB`);
      }

      // تحذير حرج
      if (heapUsedMB > 500) {
        console.error('🚨 CRITICAL MEMORY USAGE:', `${heapUsedMB} MB`);
        // يمكن إضافة آلية للتنظيف التلقائي هنا
        global.gc && global.gc();
      }
    }, 60000); // كل دقيقة
  }

  static memoryMiddleware(req, res, next) {
    const startMemory = process.memoryUsage().heapUsed;
    const start = performance.now();

    res.on('finish', () => {
      const end = performance.now();
      const endMemory = process.memoryUsage().heapUsed;
      const memoryDiff = (endMemory - startMemory) / 1024 / 1024;
      const duration = Math.round((end - start) * 100) / 100;

      // تسجيل الطلبات البطيئة أو التي تستهلك ذاكرة كبيرة
      if (duration > 1000 || Math.abs(memoryDiff) > 10) {
        console.log('📈 Request Performance:', {
          method: req.method,
          path: req.path,
          duration: `${duration}ms`,
          memoryDelta: `${Math.round(memoryDiff * 100) / 100} MB`,
          status: res.statusCode
        });
      }
    });

    next();
  }

  static getSystemStats() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
        external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform
    };
  }
}

// مراقب الاستعلامات البطيئة
export function slowQueryMonitor(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    if (duration > 2000) { // أكثر من ثانيتين
      console.warn('🐌 Slow Query Detected:', {
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent')?.substring(0, 50)
      });
    }
  });
  
  next();
}