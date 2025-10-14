import { Router } from 'express';
import { pool } from '../db';
import { getEnvironmentReport } from '../utils/environment';
import { dbProxy, safeQuery } from '../utils/dbProxy';
// استيراد authenticateToken من routes.ts حيث أنها معرفة هناك
import jwt from 'jsonwebtoken';

// دالة التوثيق المحلية للـ debug endpoints
function authenticateDebugToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
}

const router = Router();

/**
 * Middleware للحماية الأمنية في الإنتاج
 */
function protectDebugEndpoint(req: any, res: any, next: any) {
  const envReport = getEnvironmentReport();
  
  // في الإنتاج: رفض الوصول تماماً
  if (envReport.environment.isProduction) {
    return res.status(404).json({ 
      error: 'Endpoint not available in production' 
    });
  }
  
  // في التطوير: يتطلب مصادقة admin
  return authenticateDebugToken(req, res, () => {
    // التحقق من صلاحية admin بعد المصادقة الناجحة
    if (req.user?.role !== 'admin') {
      console.log('🚫 Debug endpoint - Insufficient privileges:', req.user?.role);
      return res.status(403).json({ 
        error: 'Admin privileges required for debug endpoints' 
      });
    }
    
    console.log('✅ Debug endpoint - Access granted to admin');
    next();
  });
}

/**
 * GET /api/debug/db - فحص العزل وحالة قاعدة البيانات
 * يوفر معلومات مفصلة عن العزل بين البيئات
 * محمي: admin فقط في التطوير، محظور في الإنتاج
 */
router.get('/db', protectDebugEndpoint, async (req, res) => {
  try {
    console.log('🔍 Debug endpoint - Database isolation check requested');

    // الحصول على تقرير البيئة الشامل
    const envReport = getEnvironmentReport();
    
    // فحص المخطط الحالي من قاعدة البيانات
    const client = await pool.connect();
    let dbInfo;
    
    try {
      const schemaResult = await client.query('SELECT current_schema() as schema, current_database() as database');
      const userResult = await client.query('SELECT current_user as role');
      const settingsResult = await client.query('SHOW search_path');
      
      dbInfo = {
        currentSchema: schemaResult.rows[0]?.schema,
        currentDatabase: schemaResult.rows[0]?.database,
        currentRole: userResult.rows[0]?.role,
        searchPath: settingsResult.rows[0]?.search_path
      };
    } finally {
      client.release();
    }

    // فحص العزل التطبيقي باستخدام النظام الجديد
    const isolationTest = await performEnhancedIsolationTest();

    const response = {
      timestamp: new Date().toISOString(),
      environment: envReport.environment,
      validation: envReport.validation,
      database: {
        ...envReport.databaseInfo,
        runtime: dbInfo
      },
      isolation: {
        test: isolationTest,
        signals: envReport.environment.signals
      },
      security: {
        configurationValid: envReport.validation.valid,
        isolationSecure: isolationTest.secure,
        overallSecurity: envReport.validation.valid && isolationTest.secure ? 'SECURE' : 'RISK_DETECTED'
      }
    };

    console.log(`🔍 Debug endpoint - Environment: ${envReport.environment.environment}, Security: ${response.security.overallSecurity}`);
    
    res.json(response);

  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({
      error: 'Failed to check database isolation',
      message: 'خطأ في فحص عزل قاعدة البيانات',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * فحص العزل المحسن باستخدام dbProxy
 */
async function performEnhancedIsolationTest(): Promise<{
  secure: boolean;
  tests: Array<{ name: string; passed: boolean; details?: string; }>;
}> {
  const tests: Array<{ name: string; passed: boolean; details?: string; }> = [];
  
  try {
    // اختبار 1: فحص العزل باستخدام dbProxy
    const proxyTest = await safeQuery.testIsolation();
    tests.push({
      name: 'DbProxy Schema Isolation',
      passed: proxyTest.isolated,
      details: `Expected: ${proxyTest.expectedSchema}, Actual: ${proxyTest.currentSchema}`
    });

    // اختبار 2: فحص التداخل بين المخططات
    const visibilityTest = await safeQuery.checkVisibility();
    const isSecure = visibilityTest.currentSchema === 'development' 
      ? !visibilityTest.prodTablesVisible 
      : !visibilityTest.devTablesVisible;
    
    tests.push({
      name: 'Cross-Schema Isolation',
      passed: isSecure,
      details: visibilityTest.message
    });

    // اختبار 3: فحص كتابة آمنة
    try {
      await safeQuery.execute(async (db) => {
        await db.execute(sql`BEGIN`);
        await db.execute(sql`
          CREATE TEMP TABLE isolation_test_${Date.now()} (
            id SERIAL PRIMARY KEY,
            test_data VARCHAR(50)
          )
        `);
        await db.execute(sql`ROLLBACK`);
        return true;
      });
      
      tests.push({
        name: 'Safe Write Test',
        passed: true,
        details: 'Temporary table creation/rollback successful via dbProxy'
      });
    } catch (error) {
      tests.push({
        name: 'Safe Write Test',
        passed: false,
        details: `Write test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

  } catch (error) {
    tests.push({
      name: 'Database Connection',
      passed: false,
      details: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  return {
    secure: tests.every(test => test.passed),
    tests
  };
}

/**
 * فحص العزل بكتابة واقرأ آمنة (القديم)
 */
async function performIsolationTest(): Promise<{
  secure: boolean;
  tests: Array<{ name: string; passed: boolean; details?: string; }>;
}> {
  const tests: Array<{ name: string; passed: boolean; details?: string; }> = [];
  
  try {
    const client = await pool.connect();
    
    try {
      // اختبار 1: التحقق من المخطط الصحيح
      const schemaResult = await client.query('SELECT current_schema() as schema');
      const currentSchema = schemaResult.rows[0]?.schema;
      const expectedSchema = process.env.REPLIT_DEPLOYMENT === '1' ? 'production' : 'development';
      
      tests.push({
        name: 'Schema Isolation',
        passed: currentSchema === expectedSchema,
        details: `Expected: ${expectedSchema}, Actual: ${currentSchema}`
      });

      // اختبار 2: محاولة كتابة آمنة في مخطط مؤقت (ثم حذف)
      try {
        await client.query('BEGIN');
        await client.query(`
          CREATE TEMP TABLE isolation_test_${Date.now()} (
            id SERIAL PRIMARY KEY,
            test_data VARCHAR(50)
          )
        `);
        await client.query('ROLLBACK'); // تراجع فوري
        
        tests.push({
          name: 'Safe Write Test',
          passed: true,
          details: 'Temporary table creation/rollback successful'
        });
      } catch (error) {
        tests.push({
          name: 'Safe Write Test',
          passed: false,
          details: `Write test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }

      // اختبار 3: التحقق من عدم وجود جداول الإنتاج في التطوير (والعكس)
      if (currentSchema === 'development') {
        const prodCheck = await client.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'production' 
            AND table_name = 'users'
          ) as prod_tables_exist
        `);
        
        tests.push({
          name: 'Production Data Isolation',
          passed: !prodCheck.rows[0]?.prod_tables_exist,
          details: `Production tables visible from dev: ${prodCheck.rows[0]?.prod_tables_exist}`
        });
      }

    } finally {
      client.release();
    }

  } catch (error) {
    tests.push({
      name: 'Database Connection',
      passed: false,
      details: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  return {
    secure: tests.every(test => test.passed),
    tests
  };
}

/**
 * POST /api/debug/verify-isolation - فحص شامل للعزل
 * محمي: admin فقط في التطوير، محظور في الإنتاج
 */
router.post('/verify-isolation', protectDebugEndpoint, async (req, res) => {
  try {
    console.log('🔍 Comprehensive isolation verification requested');
    
    const envReport = getEnvironmentReport();
    const isolationTest = await performIsolationTest();
    
    // فحوصات إضافية
    const verificationResults = {
      environment: {
        detected: envReport.environment.environment,
        method: envReport.environment.detectionMethod,
        valid: envReport.validation.valid
      },
      database: {
        schema: envReport.databaseInfo.schema,
        url: envReport.databaseInfo.maskedUrl,
        isolated: isolationTest.secure
      },
      security: {
        configErrors: envReport.validation.errors,
        configWarnings: envReport.validation.warnings,
        isolationTests: isolationTest.tests
      },
      overall: {
        safe: envReport.validation.valid && isolationTest.secure,
        recommendation: envReport.validation.valid && isolationTest.secure 
          ? 'System is properly isolated and secure' 
          : 'ATTENTION: Configuration issues detected - review security settings'
      }
    };

    console.log(`🔍 Isolation verification - Result: ${verificationResults.overall.safe ? 'SECURE' : 'ISSUES_DETECTED'}`);
    
    res.json(verificationResults);

  } catch (error) {
    console.error('❌ Isolation verification error:', error);
    res.status(500).json({
      error: 'Failed to verify isolation',
      message: 'خطأ في التحقق من العزل',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;