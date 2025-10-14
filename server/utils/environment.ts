/**
 * نظام موحد لكشف البيئة وضمان العزل الكامل
 * يحل مشكلة عدم الاتساق بين REPLIT_DEPLOYMENT و NODE_ENV
 */

export interface EnvironmentInfo {
  isProduction: boolean;
  isDevelopment: boolean;
  environment: 'production' | 'development';
  detectionMethod: string;
  signals: {
    REPLIT_DEPLOYMENT: string | undefined;
    NODE_ENV: string | undefined;
    APP_ENV: string | undefined;
  };
}

/**
 * كشف البيئة الموحد والمعزز
 * الأولوية: APP_ENV > REPLIT_DEPLOYMENT > NODE_ENV
 */
export function detectEnvironment(): EnvironmentInfo {
  const signals = {
    APP_ENV: process.env.APP_ENV,
    REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT,
    NODE_ENV: process.env.NODE_ENV
  };

  let isProduction = false;
  let detectionMethod = '';

  // الأولوية الأولى: APP_ENV (override صريح)
  if (signals.APP_ENV) {
    isProduction = signals.APP_ENV === 'production';
    detectionMethod = `APP_ENV=${signals.APP_ENV}`;
  }
  // الأولوية الثانية: REPLIT_DEPLOYMENT (الكشف الأساسي)
  else if (signals.REPLIT_DEPLOYMENT !== undefined) {
    isProduction = signals.REPLIT_DEPLOYMENT === '1';
    detectionMethod = `REPLIT_DEPLOYMENT=${signals.REPLIT_DEPLOYMENT}`;
  }
  // الأولوية الثالثة: NODE_ENV (احتياطي)
  else {
    isProduction = signals.NODE_ENV === 'production';
    detectionMethod = `NODE_ENV=${signals.NODE_ENV || 'undefined'}`;
  }

  return {
    isProduction,
    isDevelopment: !isProduction,
    environment: isProduction ? 'production' : 'development',
    detectionMethod,
    signals
  };
}

/**
 * التحقق من صحة إعدادات البيئة
 */
export function validateEnvironmentSettings(envInfo: EnvironmentInfo): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (envInfo.isProduction) {
    // متطلبات الإنتاج
    if (!process.env.JWT_SECRET) {
      errors.push('JWT_SECRET مطلوب في بيئة الإنتاج');
    }
    if (!process.env.DATABASE_URL_PROD) {
      const allowShared = ['1', 'true', 'yes'].includes(process.env.ALLOW_SHARED_DB_WITH_SCHEMAS?.toLowerCase() || '');
      
      if (allowShared && process.env.DATABASE_URL) {
        warnings.push('DATABASE_URL_PROD غير محدد - يتم استخدام DATABASE_URL مع عزل المخططات');
      } else {
        errors.push('DATABASE_URL_PROD مطلوب في بيئة الإنتاج');
      }
    }
    
    // تحذير إذا كان DATABASE_URL_PROD يساوي DATABASE_URL
    if (process.env.DATABASE_URL_PROD === process.env.DATABASE_URL) {
      warnings.push('DATABASE_URL_PROD يساوي DATABASE_URL - قد يؤثر على العزل');
    }
  } else {
    // متطلبات التطوير
    if (!process.env.DATABASE_URL_DEV && !process.env.DATABASE_URL) {
      errors.push('DATABASE_URL_DEV أو DATABASE_URL مطلوب في بيئة التطوير');
    }
    
    // تحذير إذا كان هناك تداخل في قواعد البيانات
    if (process.env.DATABASE_URL_DEV === process.env.DATABASE_URL_PROD) {
      warnings.push('DATABASE_URL_DEV يساوي DATABASE_URL_PROD - خطر تداخل البيانات');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * الحصول على معلومات مفصلة عن البيئة الحالية
 */
export function getEnvironmentReport(): {
  environment: EnvironmentInfo;
  validation: ReturnType<typeof validateEnvironmentSettings>;
  databaseInfo: {
    currentUrl: string | null;
    maskedUrl: string | null;
    schema: string;
  };
} {
  const environment = detectEnvironment();
  const validation = validateEnvironmentSettings(environment);
  
  // الحصول على URL قاعدة البيانات الحالية
  let currentUrl: string | null = null;
  if (environment.isProduction) {
    currentUrl = process.env.DATABASE_URL_PROD || process.env.DATABASE_URL || null;
  } else {
    currentUrl = process.env.DATABASE_URL_DEV || process.env.DATABASE_URL || null;
  }

  // إخفاء كلمة المرور في URL
  const maskedUrl = currentUrl ? maskDatabaseUrl(currentUrl) : null;
  
  return {
    environment,
    validation,
    databaseInfo: {
      currentUrl,
      maskedUrl,
      schema: environment.environment
    }
  };
}

/**
 * إخفاء كلمة المرور في URL قاعدة البيانات
 */
function maskDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return 'Invalid URL';
  }
}

/**
 * فحص العزل بين البيئات مع حماية معززة
 */
export function checkEnvironmentIsolation(): {
  isolated: boolean;
  issues: string[];
  recommendations: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

  const devUrl = process.env.DATABASE_URL_DEV || process.env.DATABASE_URL;
  const prodUrl = process.env.DATABASE_URL_PROD;
  const baseUrl = process.env.DATABASE_URL;

  // فحص إعدادات البيئة
  const envInfo = detectEnvironment();

  // في بيئة التطوير، نحن نستخدم schemas منفصلة على نفس قاعدة البيانات
  if (envInfo.isDevelopment) {
    // في التطوير، العزل بالمخططات مقبول
    if (devUrl && prodUrl && devUrl === prodUrl) {
      // نفس قاعدة البيانات ولكن schemas منفصلة - هذا مقبول
      issues.push('ℹ️ معلومات: نفس قاعدة البيانات مع schemas منفصلة (development/production)');
      recommendations.push('العزل بالمخططات نشط - تأكد من ضبط search_path صحيحاً');
      maxSeverity = 'low'; // لا نعتبر هذا مشكلة في التطوير
    }
    
    // هذا مقبول في التطوير
    return {
      isolated: true,
      issues,
      recommendations,
      severity: maxSeverity
    };
  }

  // فحص خطير: في الإنتاج، نفس قاعدة البيانات مع التطوير
  if (envInfo.isProduction && devUrl && prodUrl && devUrl === prodUrl) {
    const allowShared = ['1', 'true', 'yes'].includes(process.env.ALLOW_SHARED_DB_WITH_SCHEMAS?.toLowerCase() || '');
    
    if (allowShared) {
      issues.push('ℹ️ الإنتاج والتطوير يتشاركان قاعدة البيانات؛ تم تفعيل العزل الصارم بالمخططات');
      recommendations.push('تأكد من فرض search_path إلى "production" وتعطيل الوصول العام');
      if (maxSeverity === 'low') maxSeverity = 'medium';
    } else {
      issues.push('🚨 خطر حرج: الإنتاج يستخدم نفس قاعدة البيانات مع التطوير');
      recommendations.push('استخدم قاعدة بيانات منفصلة للإنتاج أو فعّل ALLOW_SHARED_DB_WITH_SCHEMAS مع فحوصات صارمة');
      maxSeverity = 'critical';
    }
  }

  // فحص متوسط: عدم وجود DATABASE_URL_PROD في الإنتاج
  if (envInfo.isProduction && !prodUrl) {
    issues.push('⚠️ خطر متوسط: DATABASE_URL_PROD غير محدد في بيئة الإنتاج');
    recommendations.push('اضبط DATABASE_URL_PROD للإنتاج لضمان العزل');
    if (maxSeverity === 'low') maxSeverity = 'medium';
  }

  // فحص متوسط: الاعتماد على DATABASE_URL العام
  if (envInfo.isProduction && prodUrl === baseUrl) {
    issues.push('⚠️ خطر متوسط: الإنتاج يستخدم DATABASE_URL العام بدلاً من DATABASE_URL_PROD');
    recommendations.push('استخدم DATABASE_URL_PROD مخصص للإنتاج');
    if (maxSeverity === 'low') maxSeverity = 'medium';
  }

  // فحص إضافي: فحص تشابه المضيفين (hosts)
  if (devUrl && prodUrl && devUrl !== prodUrl) {
    try {
      const devHost = new URL(devUrl).hostname;
      const prodHost = new URL(prodUrl).hostname;
      
      if (devHost === prodHost) {
        issues.push('⚠️ تحذير: نفس المضيف مستخدم للتطوير والإنتاج (قد يكون طبيعياً مع schemas منفصلة)');
        recommendations.push('تأكد من استخدام schemas منفصلة إذا كان نفس المضيف');
        if (maxSeverity === 'low') maxSeverity = 'medium';
      }
    } catch (error) {
      issues.push('🔍 لا يمكن فحص URLs - تأكد من صحة التنسيق');
      recommendations.push('تحقق من صحة DATABASE_URL_DEV و DATABASE_URL_PROD');
      if (maxSeverity === 'low') maxSeverity = 'medium';
    }
  }

  // فحص عالي: عدم وجود URL للتطوير
  if (envInfo.isDevelopment && !devUrl) {
    issues.push('❌ خطر عالي: لا يوجد DATABASE_URL للتطوير');
    recommendations.push('اضبط DATABASE_URL_DEV أو DATABASE_URL للتطوير');
    if (maxSeverity !== 'critical') maxSeverity = 'high';
  }

  return {
    isolated: issues.length === 0,
    issues,
    recommendations,
    severity: maxSeverity
  };
}