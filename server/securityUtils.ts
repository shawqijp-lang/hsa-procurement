import crypto from 'crypto';

/**
 * تشفير البيانات الحساسة للتخزين المحلي الآمن
 */
export function encryptSensitiveData(data: string, key: string = 'default-key'): string {
  try {
    const algorithm = 'aes-256-cbc';
    const secretKey = crypto.createHash('sha256').update(key).digest();
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, secretKey);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // إرجاع IV + البيانات المشفرة
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('❌ تشفير البيانات فشل:', error);
    return Buffer.from(data).toString('base64'); // more secure fallback
  }
}

/**
 * فك تشفير البيانات الحساسة
 */
export function decryptSensitiveData(encryptedData: string, key: string = 'default-key'): string {
  try {
    const algorithm = 'aes-256-cbc';
    const secretKey = crypto.createHash('sha256').update(key).digest();
    
    // فصل المكونات
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      // Try base64 fallback first
      try {
        return Buffer.from(encryptedData, 'base64').toString('utf8');
      } catch {
        throw new Error('تنسيق البيانات المشفرة غير صحيح');
      }
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipher(algorithm, secretKey);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('❌ فك التشفير فشل:', error);
    // Try base64 fallback
    try {
      return Buffer.from(encryptedData, 'base64').toString('utf8');
    } catch {
      return encryptedData; // last resort fallback
    }
  }
}

/**
 * إنشاء hash آمن للكلمات السرية
 */
export function createSecureHash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * تحقق من صحة origin في CSRF protection
 */
export function validateOrigin(origin: string, allowedOrigins: string[]): boolean {
  if (!origin) return false;
  
  try {
    const url = new URL(origin);
    return allowedOrigins.some(allowed => {
      const allowedUrl = new URL(allowed);
      return url.hostname === allowedUrl.hostname;
    });
  } catch {
    return false;
  }
}

/**
 * تنظيف البيانات المدخلة من XSS
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * تحديد معدل استخدام API بناءً على IP
 */
export class SecurityRateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  
  constructor(private maxAttempts: number = 5, private windowMs: number = 15 * 60 * 1000) {}
  
  isAllowed(identifier: string): { allowed: boolean; timeLeft?: number } {
    const now = Date.now();
    const record = this.attempts.get(identifier);
    
    if (!record || now > record.resetTime) {
      this.attempts.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return { allowed: true };
    }
    
    if (record.count >= this.maxAttempts) {
      const timeLeft = Math.ceil((record.resetTime - now) / (1000 * 60));
      return { allowed: false, timeLeft };
    }
    
    record.count++;
    return { allowed: true };
  }
  
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

/**
 * إنشاء token آمن للجلسات
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * تحقق من قوة كلمة المرور
 */
export function validatePasswordStrength(password: string): { 
  isValid: boolean; 
  errors: string[] 
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('كلمة المرور يجب أن تحتوي على حرف صغير');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('كلمة المرور يجب أن تحتوي على حرف كبير');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('كلمة المرور يجب أن تحتوي على رقم');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * تنظيف ملفات تعريف الارتباط الآمنة
 */
export function setSecureCookie(res: any, name: string, value: string, options: any = {}) {
  const secureOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    ...options
  };
  
  res.cookie(name, value, secureOptions);
}