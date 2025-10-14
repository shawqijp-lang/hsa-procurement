import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { securityLogger, SecurityEventType, SecurityLevel } from './security-logger';

// مخططات التحقق الشاملة
export const ValidationSchemas = {
  // تحقق من معرفات الأرقام
  numericId: z.coerce.number().int().positive().max(999999999),
  
  // تحقق من النصوص العربية والإنجليزية
  arabicText: z.string()
    .min(1, 'النص مطلوب')
    .max(500, 'النص طويل جداً (الحد الأقصى 500 حرف)')
    .regex(/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\d\w\.\-\,\!\?\:\;\(\)]*$/, 'النص يحتوي على رموز غير مسموحة'),
    
  mixedText: z.string()
    .min(1, 'النص مطلوب')
    .max(1000, 'النص طويل جداً (الحد الأقصى 1000 حرف)')
    .regex(/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\d\w\.\-\,\!\?\:\;\(\)\@\#\%\&]*$/, 'النص يحتوي على رموز خطيرة'),

  // تحقق من كلمات المرور
  password: z.string()
    .min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    .max(128, 'كلمة المرور طويلة جداً')
    .regex(/^[^\<\>\'\"\;\&\|\`]*$/, 'كلمة المرور تحتوي على رموز غير مسموحة'),

  // تحقق من أسماء المستخدمين
  username: z.string()
    .min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل')
    .max(50, 'اسم المستخدم طويل جداً')
    .regex(/^[a-zA-Z0-9\u0600-\u06FF_\-\.]+$/, 'اسم المستخدم يحتوي على رموز غير مسموحة'),

  // تحقق من التواريخ
  dateString: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'تنسيق التاريخ غير صحيح (YYYY-MM-DD)'),

  // تحقق من التقييمات
  rating: z.coerce.number().min(0).max(5),

  // تحقق من الأدوار
  userRole: z.enum(['admin', 'supervisor', 'user', 'hsa_group_admin', 'general_manager', 'data_specialist', 'department_manager']),

  // تحقق من عناوين IP
  ipAddress: z.string()
    .regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/, 'عنوان IP غير صحيح'),

  // تحقق من أنواع الملفات
  fileExtension: z.enum(['xlsx', 'xls', 'csv', 'pdf', 'jpg', 'jpeg', 'png', 'gif']),

  // تحقق من الأوامر SQL الخطيرة
  safeText: z.string()
    .max(5000, 'النص طويل جداً')
    .refine(
      (text) => !containsSQLInjection(text),
      'النص يحتوي على أوامر خطيرة'
    )
    .refine(
      (text) => !containsXSS(text),
      'النص يحتوي على سكريبت خطير'
    ),

  // تحقق من بيانات JSON
  jsonData: z.record(z.unknown()).refine(
    (data) => {
      const jsonString = JSON.stringify(data);
      return !containsSQLInjection(jsonString) && !containsXSS(jsonString);
    },
    'البيانات تحتوي على محتوى خطير'
  )
};

// كشف محاولات SQL Injection
function containsSQLInjection(text: string): boolean {
  const sqlPatterns = [
    /(\bunion\b.*\bselect\b)|(\bselect\b.*\bunion\b)/i,
    /(\bdrop\b.*\btable\b)|(\btable\b.*\bdrop\b)/i,
    /(\bdelete\b.*\bfrom\b)|(\bfrom\b.*\bdelete\b)/i,
    /(\binsert\b.*\binto\b)|(\binto\b.*\binsert\b)/i,
    /(\bupdate\b.*\bset\b)|(\bset\b.*\bupdate\b)/i,
    /(\bexec\b.*\bxp_)/i,
    /(\bor\b.*1\s*=\s*1)|(\band\b.*1\s*=\s*1)/i,
    /(\bor\b.*\btrue\b)|(\band\b.*\bfalse\b)/i,
    /(;|\-\-|\#|\/\*|\*\/)/,
    /(\bchar\b.*\b\+\b)|(\bconcat\b.*\()/i,
    /(\bhaving\b.*\bcount\b)|(\bgroup\b.*\bby\b)/i
  ];
  
  return sqlPatterns.some(pattern => pattern.test(text));
}

// كشف محاولات XSS
function containsXSS(text: string): boolean {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>.*?<\/embed>/gi,
    /<link[^>]*>/gi,
    /<meta[^>]*>/gi,
    /on\w+\s*=/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    /expression\s*\(/gi,
    /<.*[\s]*javascript:/gi,
    /<.*[\s]*vbscript:/gi,
    /<.*[\s]*on\w+.*=/gi
  ];
  
  return xssPatterns.some(pattern => pattern.test(text));
}

// Middleware للتحقق من المدخلات
export function validateInput(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // التحقق من body
      if (req.body && Object.keys(req.body).length > 0) {
        req.body = schema.parse(req.body);
      }
      
      // التحقق من query parameters
      if (req.query && Object.keys(req.query).length > 0) {
        // تحويل query params إلى النوع المناسب
        const querySchema = z.record(z.union([z.string(), z.array(z.string())]));
        req.query = querySchema.parse(req.query);
      }

      // التحقق من params
      if (req.params && Object.keys(req.params).length > 0) {
        const paramsSchema = z.record(z.string());
        req.params = paramsSchema.parse(req.params);
      }

      next();
    } catch (error) {
      const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'];
      
      if (error instanceof ZodError) {
        // تسجيل محاولة إدخال بيانات خاطئة
        await securityLogger.log({
          eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
          level: SecurityLevel.MEDIUM,
          ipAddress: clientIP,
          userAgent,
          endpoint: req.path,
          details: {
            validationErrors: error.errors,
            receivedData: req.body,
            queryParams: req.query
          }
        });

        // إرجاع رسالة خطأ مفهومة
        const errorMessages = error.errors.map(err => {
          const field = err.path.join('.');
          return `${field}: ${err.message}`;
        });

        return res.status(400).json({
          success: false,
          message: 'بيانات الإدخال غير صحيحة',
          errors: errorMessages
        });
      }

      // خطأ غير متوقع
      console.error('🚨 Validation middleware error:', error);
      await securityLogger.log({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        level: SecurityLevel.HIGH,
        ipAddress: clientIP,
        userAgent,
        endpoint: req.path,
        details: {
          error: error instanceof Error ? error.message : 'Unknown validation error',
          receivedData: req.body
        }
      });

      return res.status(500).json({
        success: false,
        message: 'خطأ في التحقق من البيانات'
      });
    }
  };
}

// مخططات محددة للعمليات الشائعة
export const CommonValidationSchemas = {
  login: z.object({
    username: ValidationSchemas.username,
    password: ValidationSchemas.password,
    companyId: ValidationSchemas.numericId.optional()
  }),

  createUser: z.object({
    username: ValidationSchemas.username,
    password: ValidationSchemas.password,
    fullName: ValidationSchemas.mixedText,
    role: ValidationSchemas.userRole,
    companyId: ValidationSchemas.numericId
  }),

  updatePassword: z.object({
    currentPassword: ValidationSchemas.password,
    newPassword: ValidationSchemas.password
  }),

  createLocation: z.object({
    nameAr: ValidationSchemas.arabicText,
    nameEn: ValidationSchemas.mixedText.optional(),
    descriptionAr: ValidationSchemas.arabicText.optional(),
    icon: z.string().max(50).optional(),
    companyId: ValidationSchemas.numericId
  }),

  createChecklist: z.object({
    locationId: ValidationSchemas.numericId,
    tasks: z.array(z.object({
      taskAr: ValidationSchemas.arabicText,
      categoryAr: ValidationSchemas.arabicText,
      rating: ValidationSchemas.rating,
      comment: ValidationSchemas.safeText.optional()
    })),
    checklistDate: ValidationSchemas.dateString
  }),

  evaluationFilter: z.object({
    startDate: ValidationSchemas.dateString.optional(),
    endDate: ValidationSchemas.dateString.optional(),
    locationId: ValidationSchemas.numericId.optional(),
    userId: ValidationSchemas.numericId.optional(),
    companyId: ValidationSchemas.numericId.optional()
  })
};

// Helper function للتحقق السريع
export function isValidInput<T>(data: unknown, schema: ZodSchema<T>): data is T {
  try {
    schema.parse(data);
    return true;
  } catch {
    return false;
  }
}

// Helper function للتنظيف الأمني للنصوص
export function sanitizeText(text: string): string {
  return text
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

export default {
  validateInput,
  ValidationSchemas,
  CommonValidationSchemas,
  isValidInput,
  sanitizeText
};