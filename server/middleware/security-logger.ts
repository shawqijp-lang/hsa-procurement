import { db } from '../db';
import { sql } from 'drizzle-orm';

// نوع الأحداث الأمنية
export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CSRF_VIOLATION = 'CSRF_VIOLATION',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  FILE_UPLOAD_VIOLATION = 'FILE_UPLOAD_VIOLATION',
  DATA_ACCESS_VIOLATION = 'DATA_ACCESS_VIOLATION'
}

export enum SecurityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

interface SecurityLogEntry {
  eventType: SecurityEventType;
  level: SecurityLevel;
  userId?: number;
  username?: string;
  ipAddress: string;
  userAgent?: string;
  endpoint?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

class SecurityLogger {
  private static instance: SecurityLogger;
  private logBuffer: SecurityLogEntry[] = [];
  private readonly MAX_BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds

  private constructor() {
    // Flush buffer periodically
    setInterval(() => {
      this.flushBuffer();
    }, this.FLUSH_INTERVAL);
  }

  public static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  /**
   * تسجيل حدث أمني
   */
  public async log(entry: Omit<SecurityLogEntry, 'timestamp'>): Promise<void> {
    const logEntry: SecurityLogEntry = {
      ...entry,
      timestamp: new Date()
    };

    // إضافة إلى console للتشخيص الفوري
    this.consoleLog(logEntry);

    // إضافة إلى buffer
    this.logBuffer.push(logEntry);

    // تنظيف buffer إذا امتلأ
    if (this.logBuffer.length >= this.MAX_BUFFER_SIZE) {
      await this.flushBuffer();
    }
  }

  /**
   * طباعة console محسنة للأحداث الأمنية
   */
  private consoleLog(entry: SecurityLogEntry): void {
    const emoji = this.getEmojiForEvent(entry.eventType);
    const timestamp = entry.timestamp.toISOString();
    
    const logMessage = `${emoji} [${entry.level}] ${entry.eventType} - ${timestamp}`;
    const details = {
      user: entry.username || entry.userId || 'Anonymous',
      ip: entry.ipAddress,
      endpoint: entry.endpoint || 'N/A',
      userAgent: entry.userAgent?.substring(0, 50) || 'N/A',
      details: entry.details || {}
    };

    if (entry.level === SecurityLevel.CRITICAL || entry.level === SecurityLevel.HIGH) {
      console.error(logMessage, details);
    } else if (entry.level === SecurityLevel.MEDIUM) {
      console.warn(logMessage, details);
    } else {
      console.info(logMessage, details);
    }
  }

  /**
   * حفظ الأحداث في قاعدة البيانات
   */
  private async flushBuffer(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    try {
      // إنشاء الجدول إذا لم يكن موجود
      await this.ensureSecurityLogTable();

      const entries = [...this.logBuffer];
      this.logBuffer = [];

      // حفظ في قاعدة البيانات
      for (const entry of entries) {
        await db.execute(sql`
          INSERT INTO security_logs 
          (event_type, level, user_id, username, ip_address, user_agent, endpoint, details, created_at)
          VALUES 
          (${entry.eventType}, ${entry.level}, ${entry.userId || null}, ${entry.username || null}, 
           ${entry.ipAddress}, ${entry.userAgent || null}, ${entry.endpoint || null}, 
           ${JSON.stringify(entry.details || {})}, ${entry.timestamp})
        `);
      }

      console.log(`🔐 Security Logger: Flushed ${entries.length} security events to database`);
    } catch (error) {
      console.error('🚨 Security Logger: Failed to flush buffer:', error);
      // إعادة الإدخالات إلى buffer في حالة الفشل
      this.logBuffer.unshift(...this.logBuffer);
    }
  }

  /**
   * إنشاء جدول السجلات الأمنية
   */
  private async ensureSecurityLogTable(): Promise<void> {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS security_logs (
          id SERIAL PRIMARY KEY,
          event_type VARCHAR(50) NOT NULL,
          level VARCHAR(20) NOT NULL,
          user_id INTEGER,
          username VARCHAR(255),
          ip_address VARCHAR(45) NOT NULL,
          user_agent TEXT,
          endpoint VARCHAR(500),
          details JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // إنشاء فهارس للبحث السريع
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type);
        CREATE INDEX IF NOT EXISTS idx_security_logs_level ON security_logs(level);
        CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_security_logs_ip_address ON security_logs(ip_address);
      `);
    } catch (error) {
      console.error('🚨 Security Logger: Failed to create table:', error);
    }
  }

  /**
   * الحصول على emoji مناسب للحدث
   */
  private getEmojiForEvent(eventType: SecurityEventType): string {
    const emojiMap = {
      [SecurityEventType.LOGIN_SUCCESS]: '✅',
      [SecurityEventType.LOGIN_FAILURE]: '❌',
      [SecurityEventType.PASSWORD_CHANGE]: '🔑',
      [SecurityEventType.UNAUTHORIZED_ACCESS]: '🚫',
      [SecurityEventType.SUSPICIOUS_ACTIVITY]: '👀',
      [SecurityEventType.RATE_LIMIT_EXCEEDED]: '⏱️',
      [SecurityEventType.CSRF_VIOLATION]: '🛡️',
      [SecurityEventType.XSS_ATTEMPT]: '💉',
      [SecurityEventType.SQL_INJECTION_ATTEMPT]: '🗃️',
      [SecurityEventType.FILE_UPLOAD_VIOLATION]: '📁',
      [SecurityEventType.DATA_ACCESS_VIOLATION]: '🔒'
    };
    return emojiMap[eventType] || '🔐';
  }

  /**
   * الحصول على إحصائيات الأمان
   */
  public async getSecurityStats(hours = 24): Promise<any> {
    try {
      const result = await db.execute(sql`
        SELECT 
          event_type,
          level,
          COUNT(*) as count,
          COUNT(DISTINCT ip_address) as unique_ips,
          COUNT(DISTINCT user_id) as unique_users
        FROM security_logs 
        WHERE created_at >= NOW() - INTERVAL '${hours} hours'
        GROUP BY event_type, level
        ORDER BY count DESC
      `);

      return result;
    } catch (error) {
      console.error('🚨 Security Logger: Failed to get stats:', error);
      return [];
    }
  }

  /**
   * البحث في السجلات الأمنية
   */
  public async searchLogs(filters: {
    eventType?: SecurityEventType;
    level?: SecurityLevel;
    userId?: number;
    ipAddress?: string;
    hours?: number;
    limit?: number;
  }): Promise<any> {
    try {
      let query = `SELECT * FROM security_logs WHERE created_at >= NOW() - INTERVAL '${filters.hours || 24} hours'`;
      
      if (filters.eventType) query += ` AND event_type = '${filters.eventType}'`;
      if (filters.level) query += ` AND level = '${filters.level}'`;
      if (filters.userId) query += ` AND user_id = ${filters.userId}`;
      if (filters.ipAddress) query += ` AND ip_address = '${filters.ipAddress}'`;
      
      query += ` ORDER BY created_at DESC LIMIT ${filters.limit || 100}`;

      const result = await db.execute(sql.raw(query));
      return result;
    } catch (error) {
      console.error('🚨 Security Logger: Failed to search logs:', error);
      return [];
    }
  }
}

// تصدير instance واحد
export const securityLogger = SecurityLogger.getInstance();

// Helper functions لسهولة الاستخدام
export const logSecurityEvent = {
  loginSuccess: (userId: number, username: string, ipAddress: string, userAgent?: string) =>
    securityLogger.log({
      eventType: SecurityEventType.LOGIN_SUCCESS,
      level: SecurityLevel.LOW,
      userId,
      username,
      ipAddress,
      userAgent
    }),

  loginFailure: (username: string, ipAddress: string, reason: string, userAgent?: string) =>
    securityLogger.log({
      eventType: SecurityEventType.LOGIN_FAILURE,
      level: SecurityLevel.MEDIUM,
      username,
      ipAddress,
      userAgent,
      details: { reason }
    }),

  unauthorizedAccess: (userId: number, username: string, endpoint: string, ipAddress: string, userAgent?: string) =>
    securityLogger.log({
      eventType: SecurityEventType.UNAUTHORIZED_ACCESS,
      level: SecurityLevel.HIGH,
      userId,
      username,
      endpoint,
      ipAddress,
      userAgent
    }),

  suspiciousActivity: (details: Record<string, any>, ipAddress: string, userId?: number, userAgent?: string) =>
    securityLogger.log({
      eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
      level: SecurityLevel.HIGH,
      userId,
      ipAddress,
      userAgent,
      details
    }),

  criticalThreat: (eventType: SecurityEventType, details: Record<string, any>, ipAddress: string, endpoint?: string, userId?: number) =>
    securityLogger.log({
      eventType,
      level: SecurityLevel.CRITICAL,
      userId,
      ipAddress,
      endpoint,
      details
    })
};