import { Request, Response, NextFunction } from 'express';
import { db } from '../db';

// Cache للاستعلامات المتكررة
const queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// تنظيف Cache دوري
setInterval(() => {
  const now = Date.now();
  Array.from(queryCache.entries()).forEach(([key, value]) => {
    if (now - value.timestamp > value.ttl) {
      queryCache.delete(key);
    }
  });
}, 60 * 1000); // كل دقيقة

// دالة للتحقق من صحة الاتصال بقاعدة البيانات
export async function healthCheckDatabase(): Promise<{ 
  status: 'healthy' | 'unhealthy'; 
  responseTime: number; 
  error?: string 
}> {
  const startTime = Date.now();
  
  try {
    // استعلام بسيط للتحقق من الاتصال
    await db.execute('SELECT 1');
    
    const responseTime = Date.now() - startTime;
    return { 
      status: responseTime < 1000 ? 'healthy' : 'unhealthy', 
      responseTime 
    };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      responseTime: Date.now() - startTime,
      error: (error as Error).message 
    };
  }
}

// Middleware للتحقق من صحة قاعدة البيانات
export const databaseHealthCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const health = await healthCheckDatabase();
    
    if (health.status === 'unhealthy') {
      console.error('🔴 Database health check failed:', health);
      return res.status(503).json({ 
        message: 'خدمة قاعدة البيانات غير متاحة مؤقتاً',
        error: 'DATABASE_UNAVAILABLE'
      });
    }
    
    // إضافة معلومات الصحة للطلب
    (req as any).dbHealth = health;
    next();
  } catch (error) {
    console.error('🔴 Database middleware error:', error);
    res.status(503).json({ 
      message: 'خطأ في الاتصال بقاعدة البيانات',
      error: 'DATABASE_ERROR'
    });
  }
};

// دالة Cache ذكية للاستعلامات
export function cacheQuery<T>(
  key: string, 
  queryFn: () => Promise<T>, 
  ttl: number = 5 * 60 * 1000 // 5 دقائق افتراضي
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      // التحقق من وجود Cache
      const cached = queryCache.get(key);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        console.log(`📋 Cache hit for: ${key}`);
        resolve(cached.data);
        return;
      }

      // تنفيذ الاستعلام
      console.log(`🔄 Cache miss for: ${key}, executing query`);
      const data = await queryFn();
      
      // حفظ في Cache
      queryCache.set(key, {
        data,
        timestamp: Date.now(),
        ttl
      });

      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
}

// تنظيف Cache لمفتاح معين أو نمط
export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    queryCache.clear();
    console.log('🧹 All cache cleared');
    return;
  }

  Array.from(queryCache.keys()).forEach((key) => {
    if (key.includes(pattern)) {
      queryCache.delete(key);
    }
  });
  console.log(`🧹 Cache cleared for pattern: ${pattern}`);
}

// معلومات Cache للمراقبة
export function getCacheStats(): {
  size: number;
  keys: string[];
  memoryUsage: number;
} {
  return {
    size: queryCache.size,
    keys: Array.from(queryCache.keys()),
    memoryUsage: JSON.stringify(Array.from(queryCache.values())).length
  };
}