import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// نظام كشف التهديدات المتقدم
interface ThreatSignature {
  pattern: RegExp;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  action: 'LOG' | 'BLOCK' | 'ALERT';
}

// قاعدة بيانات تواقيع التهديدات
const threatSignatures: ThreatSignature[] = [
  {
    pattern: /(\.\.\/)|(\.\.\\)|(%2e%2e%2f)|(%2e%2e\/)|(\.\.\%2f)/i,
    severity: 'HIGH',
    description: 'Path Traversal Attack',
    action: 'BLOCK'
  },
  {
    pattern: /(union\s+select)|(drop\s+table)|(insert\s+into)|(delete\s+from)/i,
    severity: 'CRITICAL',
    description: 'SQL Injection Attempt',
    action: 'BLOCK'
  },
  {
    pattern: /<script[^>]*>.*?<\/script>/i,
    severity: 'HIGH',
    description: 'Cross-Site Scripting (XSS)',
    action: 'BLOCK'
  },
  {
    pattern: /(eval\s*\()|(\bexec\s*\()|(system\s*\()|(passthru\s*\()/i,
    severity: 'CRITICAL',
    description: 'Code Injection Attempt',
    action: 'BLOCK'
  },
  {
    pattern: /(\{|\%7b)(\{|\%7b)/i,
    severity: 'MEDIUM',
    description: 'Template Injection Attempt',
    action: 'LOG'
  }
];

// نظام Rate Limiting المتقدم
const advancedRateLimiting = new Map<string, {
  requests: number[];
  blocked: boolean;
  blockUntil?: number;
}>();

/**
 * نظام كشف التهديدات المتقدم
 */
export async function advancedThreatDetection(req: Request, res: Response, next: NextFunction) {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || '';
  const requestBody = JSON.stringify(req.body || {});
  const requestUrl = req.url;
  const queryString = req.query ? JSON.stringify(req.query) : '';
  
  // دمج جميع البيانات للفحص
  const requestData = `${requestUrl} ${requestBody} ${queryString}`;
  
  // فحص كل تواقيع التهديدات
  for (const signature of threatSignatures) {
    if (signature.pattern.test(requestData)) {
      const threat = {
        timestamp: new Date().toISOString(),
        ip: clientIP,
        userAgent,
        pattern: signature.description,
        severity: signature.severity,
        url: requestUrl,
        data: requestData.slice(0, 200) // أول 200 حرف للسجل
      };
      
      console.error(`🚨 THREAT DETECTED: ${signature.description}`, threat);
      
      // تسجيل التهديد في النظام الأمني
      try {
        const { securityLogger, SecurityEventType, SecurityLevel } = await import('./security-logger');
        await securityLogger.log({
          eventType: signature.description.includes('SQL') ? SecurityEventType.SQL_INJECTION_ATTEMPT :
                    signature.description.includes('XSS') ? SecurityEventType.XSS_ATTEMPT :
                    SecurityEventType.SUSPICIOUS_ACTIVITY,
          level: signature.severity === 'CRITICAL' ? SecurityLevel.CRITICAL :
                 signature.severity === 'HIGH' ? SecurityLevel.HIGH : SecurityLevel.MEDIUM,
          ipAddress: clientIP,
          userAgent,
          endpoint: requestUrl,
          details: threat
        });
      } catch (logError) {
        console.error('Failed to log security event:', logError);
      }
      
      if (signature.action === 'BLOCK') {
        return res.status(403).json({
          error: 'طلب مرفوض لأسباب أمنية',
          code: 'SECURITY_VIOLATION',
          timestamp: new Date().toISOString()
        });
      }
      
      // تسجيل التهديد حتى لو لم يتم حجبه
      // يمكن إرسال تنبيه للإدارة هنا
    }
  }
  
  next();
}

/**
 * نظام Rate Limiting المتقدم مع حماية من DDoS
 */
export async function advancedRateLimit(req: Request, res: Response, next: NextFunction) {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // نافذة زمنية دقيقة واحدة
  const maxRequests = 100; // 100 طلب في الدقيقة
  const blockDuration = 15 * 60 * 1000; // حجب لمدة 15 دقيقة
  
  // الحصول على بيانات العميل
  let clientData = advancedRateLimiting.get(clientIP);
  if (!clientData) {
    clientData = { requests: [], blocked: false };
    advancedRateLimiting.set(clientIP, clientData);
  }
  
  // التحقق من الحجب
  if (clientData.blocked && clientData.blockUntil && now < clientData.blockUntil) {
    const remainingTime = Math.ceil((clientData.blockUntil - now) / 1000);
    return res.status(429).json({
      error: 'تم حجب عنوان IP مؤقتاً',
      retryAfter: remainingTime,
      reason: 'تجاوز حد الطلبات المسموح'
    });
  }
  
  // إزالة الحجب إذا انتهت المدة
  if (clientData.blocked && clientData.blockUntil && now >= clientData.blockUntil) {
    clientData.blocked = false;
    clientData.blockUntil = undefined;
    clientData.requests = [];
  }
  
  // تنظيف الطلبات القديمة
  clientData.requests = clientData.requests.filter(time => now - time < windowMs);
  
  // إضافة الطلب الحالي
  clientData.requests.push(now);
  
  // فحص تجاوز الحد
  if (clientData.requests.length > maxRequests) {
    clientData.blocked = true;
    clientData.blockUntil = now + blockDuration;
    
    console.warn(`⚠️ Rate limit exceeded for IP: ${clientIP}`, {
      requestCount: clientData.requests.length,
      blockDuration: blockDuration / 1000 / 60
    });
    
    // تسجيل تجاوز الحد الأقصى للطلبات
    try {
      const { securityLogger, SecurityEventType, SecurityLevel } = await import('./security-logger');
      await securityLogger.log({
        eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
        level: SecurityLevel.MEDIUM,
        ipAddress: clientIP,
        details: {
          requestCount: clientData.requests.length,
          blockDurationMinutes: blockDuration / 1000 / 60
        }
      });
    } catch (logError) {
      console.error('Failed to log rate limit event:', logError);
    }
    
    return res.status(429).json({
      error: 'تم تجاوز حد الطلبات',
      retryAfter: Math.ceil(blockDuration / 1000),
      reason: 'طلبات مفرطة'
    });
  }
  
  // إضافة معلومات Rate Limit للاستجابة
  res.setHeader('X-RateLimit-Limit', maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', (maxRequests - clientData.requests.length).toString());
  res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
  
  next();
}

/**
 * حماية من هجمات CSRF - مبسطة بدون session
 */
export async function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // تخطي الحماية للطرق الآمنة
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // تخطي الحماية لمسارات محددة (login, public APIs)
  const skipPaths = ['/api/auth/login', '/api/auth/register', '/api/version', '/api/companies/public'];
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  // التحقق من Origin و Referer headers كحماية أساسية
  const origin = req.headers.origin || req.headers.referer;
  const host = req.headers.host;
  
  // في وضع التطوير، نكون أكثر تساهلاً
  if (process.env.NODE_ENV === 'development') {
    if (origin && (origin.includes('localhost') || origin.includes('replit') || origin.includes(host || ''))) {
      return next();
    }
  }
  
  // في الإنتاج، نتحقق من المصدر
  if (origin) {
    const isValidOrigin = origin.includes(host || '') || 
                         origin.includes('.replit.dev') || 
                         origin.includes('.replit.app');
    
    if (isValidOrigin) {
      return next();
    }
  }
  
  // إذا لم يكن هناك origin/referer، نرفض الطلب
  console.warn('🛡️ CSRF protection triggered:', {
    ip: req.ip,
    path: req.path,
    origin,
    host,
    method: req.method
  });
  
  // تسجيل محاولة انتهاك CSRF
  try {
    const { securityLogger, SecurityEventType, SecurityLevel } = await import('./security-logger');
    await securityLogger.log({
      eventType: SecurityEventType.CSRF_VIOLATION,
      level: SecurityLevel.HIGH,
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'],
      endpoint: req.path,
      details: {
        origin,
        host,
        method: req.method
      }
    });
  } catch (logError) {
    console.error('Failed to log CSRF violation:', logError);
  }
  
  return res.status(403).json({
    error: 'طلب مرفوض لأسباب أمنية - مصدر الطلب غير موثوق',
    code: 'CSRF_PROTECTION_FAILED'
  });
}

/**
 * تشفير حساس للبيانات
 */
export function sensitiveDataEncryption() {
  const algorithm = 'aes-256-gcm';
  const key = process.env.ENCRYPTION_KEY 
    ? crypto.scryptSync(process.env.ENCRYPTION_KEY, 'hsa-salt-2025', 32)
    : crypto.randomBytes(32);
  
  return {
    encrypt: (text: string): { encrypted: string; iv: string; tag: string } => {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      cipher.setAAD(Buffer.from('HSA-System-2025'));
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };
    },
    
    decrypt: (encryptedData: { encrypted: string; iv: string; tag: string }): string => {
      const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(encryptedData.iv, 'hex'));
      decipher.setAAD(Buffer.from('HSA-System-2025'));
      decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    }
  };
}

// تنظيف دوري لبيانات Rate Limiting
setInterval(() => {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // ساعة واحدة
  
  Array.from(advancedRateLimiting.entries()).forEach(([ip, data]) => {
    // إزالة البيانات القديمة
    if (!data.blocked && data.requests.length === 0) {
      advancedRateLimiting.delete(ip);
    }
  });
}, 10 * 60 * 1000); // كل 10 دقائق