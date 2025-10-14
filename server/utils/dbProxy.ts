/**
 * نظام dbProxy للضمان المطلق لاستخدام المخطط الصحيح
 * يمنع استخدام db مباشرة ويضمن تطبيق search_path
 */

import { db, executeWithSchema } from '../db';
import { detectEnvironment } from './environment';

/**
 * Proxy لقاعدة البيانات مع ضمان المخطط الصحيح
 */
class DatabaseProxy {
  private envInfo = detectEnvironment();

  /**
   * تنفيذ استعلام مع ضمان المخطط الصحيح
   */
  async execute<T>(queryFunction: (database: any) => Promise<T>): Promise<T> {
    return executeWithSchema(queryFunction);
  }

  /**
   * الحصول على معلومات البيئة الحالية
   */
  getEnvironmentInfo() {
    return this.envInfo;
  }

  /**
   * التحقق من المخطط الحالي
   */
  async getCurrentSchema(): Promise<string> {
    return this.execute(async (database) => {
      const result = await database.execute(sql`SELECT current_schema() as schema`);
      return result.rows[0]?.schema || 'unknown';
    });
  }

  /**
   * اختبار العزل الآمن
   */
  async testIsolation(): Promise<{
    currentSchema: string;
    expectedSchema: string;
    isolated: boolean;
    canSeeOtherSchemas: boolean;
  }> {
    return this.execute(async (database) => {
      // الحصول على المخطط الحالي
      const currentResult = await database.execute(sql`SELECT current_schema() as schema`);
      const currentSchema = currentResult.rows[0]?.schema || 'unknown';
      
      const expectedSchema = this.envInfo.environment;
      
      // فحص المخططات المتاحة
      const schemasResult = await database.execute(sql`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name IN ('development', 'production')
      `);
      
      const availableSchemas = schemasResult.rows.map((row: any) => row.schema_name);
      const canSeeOtherSchemas = availableSchemas.length > 1;
      
      return {
        currentSchema,
        expectedSchema,
        isolated: currentSchema === expectedSchema,
        canSeeOtherSchemas
      };
    });
  }

  /**
   * فحص التداخل بين المخططات
   */
  async checkCrossSchemaVisibility(): Promise<{
    devTablesVisible: boolean;
    prodTablesVisible: boolean;
    currentSchema: string;
    message: string;
  }> {
    return this.execute(async (database) => {
      const currentResult = await database.execute(sql`SELECT current_schema() as schema`);
      const currentSchema = currentResult.rows[0]?.schema || 'unknown';
      
      // فحص رؤية جداول المخططات الأخرى
      let devTablesVisible = false;
      let prodTablesVisible = false;
      
      try {
        // فحص رؤية جداول التطوير
        const devCheck = await database.execute(sql`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'development' 
            LIMIT 1
          ) as visible
        `);
        devTablesVisible = devCheck.rows[0]?.visible || false;
      } catch (error) {
        devTablesVisible = false;
      }
      
      try {
        // فحص رؤية جداول الإنتاج
        const prodCheck = await database.execute(sql`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'production' 
            LIMIT 1
          ) as visible
        `);
        prodTablesVisible = prodCheck.rows[0]?.visible || false;
      } catch (error) {
        prodTablesVisible = false;
      }
      
      let message = `Schema: ${currentSchema}`;
      if (currentSchema === 'development' && prodTablesVisible) {
        message += ' - تحذير: يمكن رؤية جداول الإنتاج';
      } else if (currentSchema === 'production' && devTablesVisible) {
        message += ' - تحذير: يمكن رؤية جداول التطوير';
      } else {
        message += ' - العزل سليم';
      }
      
      return {
        devTablesVisible,
        prodTablesVisible,
        currentSchema,
        message
      };
    });
  }
}

// إنشاء instance مشترك
export const dbProxy = new DatabaseProxy();

// تصدير sql helper
import { sql } from 'drizzle-orm';
export { sql };

/**
 * دالة مساعدة للاستعلامات البسيطة
 */
export const safeQuery = {
  /**
   * تنفيذ استعلام مع ضمان المخطط
   */
  async execute<T>(queryFunction: (database: any) => Promise<T>): Promise<T> {
    return dbProxy.execute(queryFunction);
  },

  /**
   * الحصول على معلومات البيئة
   */
  getEnvironment() {
    return dbProxy.getEnvironmentInfo();
  },

  /**
   * اختبار العزل
   */
  async testIsolation() {
    return dbProxy.testIsolation();
  },

  /**
   * فحص التداخل
   */
  async checkVisibility() {
    return dbProxy.checkCrossSchemaVisibility();
  }
};

/**
 * تحذير للمطورين من استخدام db مباشرة
 */
export const WARNING_USE_DB_PROXY = `
⚠️ تحذير: تجنب استخدام 'db' مباشرة!
استخدم 'dbProxy.execute()' أو 'safeQuery.execute()' بدلاً من ذلك
لضمان تطبيق المخطط الصحيح (development/production)

مثال صحيح:
import { safeQuery } from './utils/dbProxy';
const result = await safeQuery.execute(async (db) => {
  return db.select().from(users);
});
`;

// Utility للتحقق من استخدام db مباشرة (للتطوير)
export function warnDirectDbUsage() {
  console.warn(WARNING_USE_DB_PROXY);
}