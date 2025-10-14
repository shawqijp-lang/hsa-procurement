import { Request, Response, NextFunction } from 'express';

// تتبع معايير الأداء
interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  lastReset: Date;
}

// تتبع الأحداث الأمنية
interface SecurityEvent {
  timestamp: Date;
  type: 'LOGIN_ATTEMPT' | 'FAILED_AUTH' | 'SUSPICIOUS_ACTIVITY' | 'RATE_LIMIT_HIT';
  details: any;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ipAddress?: string;
  userAgent?: string;
}

class SystemMonitor {
  private metrics: PerformanceMetrics = {
    requestCount: 0,
    averageResponseTime: 0,
    errorRate: 0,
    lastReset: new Date()
  };

  private securityEvents: SecurityEvent[] = [];
  private requestTimes: number[] = [];

  // تسجيل الأحداث الأمنية
  logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date()
    };

    this.securityEvents.push(securityEvent);

    // الاحتفاظ بآخر 1000 حدث فقط
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }

    // تنبيه للأحداث الحرجة - بدون تسريب بيانات حساسة
    if (event.severity === 'CRITICAL') {
      // تنظيف البيانات الحساسة من السجلات
      const safeDetails = this.redactSensitiveData(event.details);
      
      if (process.env.NODE_ENV === 'development') {
        console.error('🚨 حدث أمني حرج:', {
          type: event.type,
          details: safeDetails,
          ip: event.ipAddress,
          timestamp: securityEvent.timestamp
        });
      }
    }
  }

  // تحديث معايير الأداء
  updateMetrics(responseTime: number, isError: boolean = false): void {
    this.metrics.requestCount++;
    this.requestTimes.push(responseTime);

    // الاحتفاظ بآخر 100 طلب للحساب
    if (this.requestTimes.length > 100) {
      this.requestTimes = this.requestTimes.slice(-100);
    }

    // حساب متوسط وقت الاستجابة
    this.metrics.averageResponseTime = 
      this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length;

    // حساب معدل الأخطاء
    if (isError) {
      this.metrics.errorRate = 
        (this.metrics.errorRate * (this.metrics.requestCount - 1) + 1) / this.metrics.requestCount;
    }
  }

  // الحصول على التقرير الصحي
  getHealthReport(): any {
    const now = new Date();
    const recentEvents = this.securityEvents.filter(
      event => now.getTime() - event.timestamp.getTime() < 60 * 60 * 1000 // آخر ساعة
    );

    return {
      performance: {
        ...this.metrics,
        uptime: now.getTime() - this.metrics.lastReset.getTime()
      },
      security: {
        recentEventsCount: recentEvents.length,
        criticalEvents: recentEvents.filter(e => e.severity === 'CRITICAL').length,
        highEvents: recentEvents.filter(e => e.severity === 'HIGH').length
      },
      status: this.getOverallStatus()
    };
  }

  private getOverallStatus(): 'HEALTHY' | 'WARNING' | 'CRITICAL' {
    if (this.metrics.errorRate > 0.1 || this.metrics.averageResponseTime > 2000) {
      return 'CRITICAL';
    }
    if (this.metrics.errorRate > 0.05 || this.metrics.averageResponseTime > 1000) {
      return 'WARNING';
    }
    return 'HEALTHY';
  }

  // إعادة تعيين المعايير
  resetMetrics(): void {
    this.metrics = {
      requestCount: 0,
      averageResponseTime: 0,
      errorRate: 0,
      lastReset: new Date()
    };
    this.requestTimes = [];
  }

  // تنظيف البيانات الحساسة من السجلات
  private redactSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveKeys = [
      'password', 'token', 'authorization', 'cookie', 'session',
      'jwt', 'secret', 'key', 'auth', 'credential', 'bearer'
    ];

    const redacted = { ...data };
    
    for (const key in redacted) {
      const keyLower = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => keyLower.includes(sensitive))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof redacted[key] === 'object') {
        redacted[key] = this.redactSensitiveData(redacted[key]);
      }
    }

    return redacted;
  }
}

// نسخة واحدة للنظام كله
export const systemMonitor = new SystemMonitor();

// Middleware لتتبع الأداء
export const performanceTracker = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // تسجيل الطلب
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    const isError = res.statusCode >= 400;

    systemMonitor.updateMetrics(responseTime, isError);

    // تنبيه للطلبات البطيئة
    if (responseTime > 1000) {
      console.warn(`⚠️ Slow request: ${req.method} ${req.path} took ${responseTime}ms`);
    }

    return originalSend.call(this, data);
  };

  next();
};

// Middleware لمراقبة الأمان
export const securityMonitor = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  // فحص الأنماط المشبوهة
  if (req.path.includes('admin') || req.path.includes('config')) {
    systemMonitor.logSecurityEvent({
      type: 'SUSPICIOUS_ACTIVITY',
      severity: 'MEDIUM',
      details: { path: req.path, method: req.method },
      ipAddress: clientIP,
      userAgent
    });
  }

  // فحص User-Agent المشبوه
  if (!userAgent || userAgent.includes('bot') || userAgent.includes('crawler')) {
    systemMonitor.logSecurityEvent({
      type: 'SUSPICIOUS_ACTIVITY',
      severity: 'LOW',
      details: { reason: 'Suspicious User-Agent', userAgent },
      ipAddress: clientIP,
      userAgent
    });
  }

  next();
};

// إصدار تقرير دوري
setInterval(() => {
  const report = systemMonitor.getHealthReport();
  if (report.status !== 'HEALTHY') {
    console.warn('📊 System Health Warning:', report);
  }
}, 5 * 60 * 1000); // كل 5 دقائق