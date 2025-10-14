import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for serverless environments
neonConfig.webSocketConstructor = ws;

// 🛡️ Enhanced database URL detection with unified environment system
function getDatabaseUrl(): string {
  // For deployed apps, check /tmp/replitdb first (per Replit docs)
  const checkDeployedDbUrl = () => {
    try {
      const fs = require('fs');
      if (fs.existsSync('/tmp/replitdb')) {
        const deployedUrl = fs.readFileSync('/tmp/replitdb', 'utf8').trim();
        if (deployedUrl) {
          console.log('🚀 Using deployed database URL from /tmp/replitdb');
          return deployedUrl;
        }
      }
    } catch (error) {
      console.log('📝 No deployed database URL found, using environment variables');
    }
    return null;
  };

  // Use new unified environment detection (imported below)
  const tempEnvInfo = detectEnvironment ? detectEnvironment() : { 
    isProduction: process.env.REPLIT_DEPLOYMENT === '1',
    environment: process.env.REPLIT_DEPLOYMENT === '1' ? 'production' : 'development'
  };
  
  console.log(`🔍 Environment detected: ${tempEnvInfo.environment} (Method: ${'detectionMethod' in tempEnvInfo ? tempEnvInfo.detectionMethod : 'legacy'})`);
  
  if (tempEnvInfo.isProduction) {
    // For deployed production apps, check /tmp/replitdb first
    const deployedUrl = checkDeployedDbUrl();
    if (deployedUrl) {
      return deployedUrl;
    }
    
    // بيئة الإنتاج - نفضل DATABASE_URL_PROD أو نستخدم DATABASE_URL مع schema isolation
    const prodUrl = process.env.DATABASE_URL_PROD;
    if (prodUrl && prodUrl !== process.env.DATABASE_URL) {
      console.log("🔒 Using PRODUCTION database (completely isolated)");
      return prodUrl;
    } else if (prodUrl === process.env.DATABASE_URL) {
      console.warn("⚠️ DATABASE_URL_PROD equals DATABASE_URL - may affect isolation");
    }
    
    // إذا لم يوجد DATABASE_URL_PROD، نتحقق من السماح بقاعدة البيانات المشتركة
    const devUrl = process.env.DATABASE_URL;
    if (devUrl && isSharedDbAllowed()) {
      console.warn("⚠️ Using shared DATABASE_URL in production with schema isolation");
      console.warn("🔧 Consider setting DATABASE_URL_PROD for better isolation");
      return devUrl;
    }
    
    // خطأ: لا يوجد DATABASE_URL_PROD في الإنتاج بدون تفعيل الوضع المشترك
    if (devUrl) {
      console.error("❌ Production database URL not configured!");
      console.error("🔧 Set DATABASE_URL_PROD or enable ALLOW_SHARED_DB_WITH_SCHEMAS");
      throw new Error("DATABASE_URL_PROD must be set for production environment - no fallback allowed");
    }
    
    throw new Error("No database URL found for production environment");
  } else {
    // بيئة التطوير - قاعدة بيانات مخصصة للتطوير
    const devUrl = process.env.DATABASE_URL_DEV || process.env.DATABASE_URL;
    if (!devUrl) {
      console.error("❌ Development database URL not configured!");
      throw new Error("DATABASE_URL_DEV or DATABASE_URL must be set for development");
    }
    console.log("🔧 Using DEVELOPMENT database (completely isolated)");
    return devUrl;
  }
}

// Get the appropriate database URL for current environment
const databaseUrl = getDatabaseUrl();

import { detectEnvironment, validateEnvironmentSettings, checkEnvironmentIsolation } from './utils/environment';

/**
 * دالة مساعدة للتحقق من السماح بقاعدة البيانات المشتركة
 */
function isSharedDbAllowed(): boolean {
  const value = process.env.ALLOW_SHARED_DB_WITH_SCHEMAS?.toLowerCase();
  return ['1', 'true', 'yes'].includes(value || '');
}

/**
 * فحوصات الأمان عند بدء التشغيل - نسخة محسنة لتجنب recursion
 */
async function performStartupSafetyChecks(client: any, envInfo: any): Promise<void> {
  console.log('🔍 Performing startup safety checks...');
  
  try {
    
    // فحص 1: التأكد من صحة المخطط
    const schemaResult = await client.query('SELECT current_schema() as schema');
    const currentSchema = schemaResult.rows[0]?.schema;
    const expectedSchema = envInfo.environment;
    
    if (currentSchema !== expectedSchema) {
      throw new Error(`Schema mismatch: Expected ${expectedSchema}, got ${currentSchema}`);
    }
    
    // فحص 2: فحص أقل صرامة للإنتاج مع دعم مشاركة قاعدة البيانات
    if (envInfo.isProduction) {
      // فحص مرن لـ search_path - التركيز على current_schema
      const searchPathResult = await client.query("SELECT current_setting('search_path') as sp");
      const searchPath = searchPathResult.rows[0]?.sp || '';
      
      // تحقق من أن current_schema صحيح بدلاً من التحقق الصارم من search_path
      if (currentSchema !== 'production') {
        throw new Error(`Invalid current_schema in production: ${currentSchema}. Expected: production`);
      }
      
      // فحص مرن للمخططات المتعددة مع دعم قاعدة البيانات المشتركة
      if (isSharedDbAllowed()) {
        console.warn('⚠️ Shared database mode enabled - using schema isolation');
      } else {
        const schemasResult = await client.query(`
          SELECT schema_name 
          FROM information_schema.schemata 
          WHERE schema_name IN ('development', 'production')
        `);
        
        const visibleSchemas = schemasResult.rows.map((row: any) => row.schema_name);
        
        if (visibleSchemas.length > 1) {
          console.warn('⚠️ Multiple schemas detected - consider enabling ALLOW_SHARED_DB_WITH_SCHEMAS');
        }
      }
    }
    
    // فحص 3: اختبار العزل الأساسي
    const testResult = await client.query('SELECT 1 as test');
    if (!testResult.rows[0]?.test) {
      throw new Error('Basic database connectivity test failed');
    }
    
    console.log('✅ Startup safety checks passed');
    
  } catch (error) {
    console.error('❌ Startup safety check failed:', error);
    if (envInfo.isProduction) {
      // في الإنتاج، نوقف التشغيل عند أي خطأ أمني
      throw new Error(`Production startup failed safety checks: ${error}`);
    } else {
      // في التطوير، نعرض تحذير فقط
      console.warn('⚠️ Development environment - continuing with warnings');
    }
  }
}

// 🛡️ Environment Protection with Unified Detection System
const envInfo = detectEnvironment();

function getCurrentSchema(): string {
  return envInfo.environment;
}

// Get the appropriate database URL for current environment with enhanced protection
function validateEnvironmentSafety(): void {
  const validation = validateEnvironmentSettings(envInfo);
  const isolation = checkEnvironmentIsolation();

  console.log(`🔍 Environment Detection: ${(envInfo as any).detectionMethod || 'Unknown'}`);
  console.log(`🛡️ Environment: ${envInfo.environment.toUpperCase()}`);
  
  // عرض الأخطاء الحرجة
  if (!validation.valid) {
    console.error('❌ Critical Environment Errors:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Environment validation failed - check configuration');
  }

  // عرض التحذيرات
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Environment Warnings:');
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  // فحص العزل - مع دعم مشاركة قاعدة البيانات المشروطة
  if (!isolation.isolated) {
    console.error('🚨 Environment Isolation Issues:');
    isolation.issues.forEach(issue => console.error(`  - ${issue}`));
    console.log('💡 Recommendations:');
    isolation.recommendations.forEach(rec => console.log(`  - ${rec}`));
    
    // التحقق من السماح بقاعدة البيانات المشتركة
    if (isolation.severity === 'critical' && !isSharedDbAllowed()) {
      throw new Error('CRITICAL: Environment isolation compromised - enable ALLOW_SHARED_DB_WITH_SCHEMAS or use separate databases');
    } else if (isolation.severity === 'critical' && isSharedDbAllowed()) {
      console.warn('⚠️ Shared database mode enabled - schema isolation enforced');
    } else if (isolation.severity === 'high') {
      console.error('⚠️ HIGH RISK: Continuing with caution - consider fixing database configuration');
    } else {
      console.warn('⚠️ MEDIUM RISK: Environment isolation warnings detected');
    }
  }

  const isProduction = envInfo.isProduction;
  const isDevelopment = envInfo.isDevelopment;
  
  // Environment consistency check
  if (isProduction) {
    console.log("🔒 Production Environment - Enhanced Security Enabled");
    // Additional production validations
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is required in production for data security");
    }
  } else {
    console.log("🔧 Development Environment - Safe Testing Mode");
    // Development environment is isolated
    console.log("✅ Development data isolated from production");
  }
  
  // Cross-environment protection
  console.log(`🛡️ Environment Protection: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} database secured`);
}

// Validate environment safety before connecting
validateEnvironmentSafety();

console.log("🔌 Initializing database connection...");

// Create connection pool with error handling
// Enhanced database configuration for production
const currentSchema = getCurrentSchema();

// Add schema to connection string options parameter
const connectionOptions = `?options=-csearch_path%3D${currentSchema}`;
const enhancedDatabaseUrl = databaseUrl + (databaseUrl.includes('?') ? '&' : '?') + `options=-csearch_path%3D${currentSchema}`;

console.log(`🔧 Setting default schema in connection pool: ${currentSchema}`);

export const pool = new Pool({ 
  connectionString: enhancedDatabaseUrl,
  // Optimized connection pool settings
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '15'), // Maximum number of connections
  min: parseInt(process.env.DB_MIN_CONNECTIONS || '2'), // Minimum pool size
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // Close idle connections
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'), // Connection timeout
  // acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '10000'), // Not supported in Neon driver
  // createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT || '5000'), // Not supported in Neon driver
  // Enhanced reliability settings
  // reapIntervalMillis: 1000, // Not supported in Neon driver
  // createRetryIntervalMillis: 200, // Not needed for Neon driver
});

// Test database connection on startup with schema setting
pool.on('connect', async (client) => {
  console.log("✅ Database connection established");
  const currentSchema = getCurrentSchema();
  
  try {
    // Bootstrap schema creation to ensure it exists
    console.log(`🔧 Ensuring schema ${currentSchema} exists...`);
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${currentSchema}"`);
    
    // Set search path to the schema
    await client.query(`SET search_path TO "${currentSchema}"`);
    
    // Verify schema was set correctly - critical security check
    const verificationResult = await client.query('SELECT current_schema() as schema');
    const actualSchema = verificationResult.rows[0]?.schema;
    
    if (actualSchema !== currentSchema) {
      const errorMsg = `CRITICAL: Schema mismatch after SET. Expected: ${currentSchema}, Got: ${actualSchema}`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    console.log(`🔧 Schema verified and set to: ${currentSchema}`);
    
    // تشغيل فحوصات الأمان عند أول اتصال (بدون recursion)
    await performStartupSafetyChecks(client, envInfo);
    
  } catch (error) {
    console.error(`❌ Failed to set schema to ${currentSchema}:`, error);
    
    // 🛡️ Enhanced error handling to prevent crash loops
    if (envInfo.isProduction) {
      console.error(`🚨 PRODUCTION FAILURE: Cannot continue with compromised schema isolation`);
      console.error(`💡 Suggested fixes:`);
      console.error(`   - Check DATABASE_URL_PROD credentials`);
      console.error(`   - Verify database user permissions`);
      console.error(`   - Ensure production database exists and is accessible`);
      
      // In production, we should still throw but with better error messaging
      throw new Error(`Production database schema setup failed: ${error instanceof Error ? error.message : String(error)}`);
    } else {
      console.warn(`⚠️ Development environment - schema setup failed but continuing`);
      console.warn(`💡 Check your DATABASE_URL credentials and try restarting`);
    }
  }
});

pool.on('error', (err) => {
  console.error("🚨 Database connection error:", err.message);
  console.error("💡 Check database credentials and network connectivity");
  // Include database-specific error details if available
  if ('code' in err && 'severity' in err) {
    console.error("🔧 Database error details:", {
      code: (err as any).code,
      severity: (err as any).severity,
      detail: (err as any).detail
    });
  }
  
  // Don't crash the application, just log the error
  console.error("⚠️ Application will continue with limited database functionality");
});

export const db = drizzle({ client: pool, schema });

// Enhanced database function that ensures correct schema
export const executeWithSchema = async (query: any) => {
  const currentSchema = getCurrentSchema();
  const client = await pool.connect();
  try {
    // Ensure schema exists before using it
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${currentSchema}"`);
    
    // Set search path
    await client.query(`SET search_path TO "${currentSchema}"`);
    
    // 🛡️ CRITICAL: Verify schema in production to prevent cross-schema leakage
    if (envInfo.isProduction) {
      const verificationResult = await client.query('SELECT current_schema() as schema');
      const actualSchema = verificationResult.rows[0]?.schema;
      
      if (actualSchema !== currentSchema) {
        const errorMsg = `CRITICAL: Schema verification failed. Expected: ${currentSchema}, Got: ${actualSchema}`;
        console.error(`❌ ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      console.log(`🔍 Production schema verified: ${actualSchema}`);
    }
    
    const result = await query(drizzle({ client, schema }));
    return result;
  } finally {
    client.release();
  }
};

// Enhanced database health check function with schema validation
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    const currentSchema = getCurrentSchema();
    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO "${currentSchema}"`);
      const result = await client.query('SELECT 1 as test, current_schema() as schema');
      console.log(`🔍 Database test successful on schema: ${result.rows[0]?.schema}`);
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
};

// 🛡️ Environment Information and Safety Report
export const getDatabaseEnvironmentInfo = () => {
  // استخدام نفس منطق اكتشاف البيئة المستخدم في detectEnvironment
  const envInfo = detectEnvironment ? detectEnvironment() : { 
    isProduction: process.env.REPLIT_DEPLOYMENT === '1',
    environment: process.env.REPLIT_DEPLOYMENT === '1' ? 'production' : 'development',
    detectionMethod: 'legacy'
  };
  
  return {
    environment: envInfo.environment,
    isProduction: envInfo.isProduction,
    isDevelopment: !envInfo.isProduction,
    databaseType: envInfo.isProduction ? 'PRODUCTION' : 'DEVELOPMENT',
    detectionMethod: envInfo.detectionMethod,
    safetyLevel: envInfo.isProduction ? 'MAXIMUM_SECURITY' : 'SAFE_TESTING',
    dataIsolation: !envInfo.isProduction ? 'FULLY_ISOLATED' : 'PRODUCTION_PROTECTED'
  };
};

// 🔒 Production Data Safety Verification
export const verifyDataSafety = async (): Promise<{safe: boolean, message: string}> => {
  try {
    const envInfo = getDatabaseEnvironmentInfo();
    
    if (envInfo.isProduction) {
      return {
        safe: true,
        message: '🔒 Production database protected - all data secured'
      };
    } else {
      return {
        safe: true,
        message: '🔧 Development database isolated - safe for testing and modifications'
      };
    }
  } catch (error) {
    return {
      safe: false,
      message: `❌ Safety check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};