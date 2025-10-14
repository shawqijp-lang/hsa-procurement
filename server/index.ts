import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import http from "http";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { testDatabaseConnection } from "./db";
import { storage } from "./storage";
import { globalErrorHandler } from "./middleware/global-error-handler";
// Enhanced security-focused server setup

const app = express();

// Enhanced security headers with helmet (Replit-compatible)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "https:", "*.replit.dev", "*.replit.app"],
      imgSrc: ["'self'", "data:", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Needed for Vite in dev
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
    },
  },
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false, // Disable HSTS in development
  crossOriginEmbedderPolicy: false, // Disable for Replit compatibility
  crossOriginOpenerPolicy: false, // Disable for Replit compatibility  
  crossOriginResourcePolicy: false, // Disable for Replit compatibility
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

// Enhanced CORS configuration for external browser compatibility
app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Helper function to check allowed domains
    const isAllowedDomain = (origin: string) => {
      const allowedPatterns = [
        '.replit.dev',
        '.replit.app',
        '.replit.co',
        '.onrender.com',
        'localhost',
        '127.0.0.1',
        '0.0.0.0'
      ];
      
      return allowedPatterns.some(pattern => origin.includes(pattern));
    };
    
    // Development: Allow local and Replit domains + external browser access
    if (process.env.NODE_ENV === 'development') {
      if (isAllowedDomain(origin)) {
        console.log(`✅ CORS allowed origin: ${origin}`);
        return callback(null, true);
      }
    }
    
    // Production: Allow specific domains + Replit deployment domains
    if (process.env.NODE_ENV === 'production') {
      if (isAllowedDomain(origin)) {
        console.log(`✅ CORS allowed production origin: ${origin}`);
        return callback(null, true);
      }
      
      // Also allow FRONTEND_URL if configured
      if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
        return callback(null, true);
      }
    }
    
    // Log blocked requests for debugging
    console.warn(`❌ CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400
}));

// Configure Express to trust proxy for rate limiting
app.set('trust proxy', 1);

// Rate limiting for authentication endpoints (more flexible)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 50 : 20, // More flexible for development
  message: {
    message: "محاولات دخول كثيرة جداً. يرجى المحاولة مرة أخرى لاحقاً",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip certain safe endpoints
  skip: (req) => {
    return req.path.includes('/api/auth/me') || 
           req.path.includes('/api/auth/refresh-permissions') ||
           req.path.includes('/api/version');
  }
});

// General API rate limiting (more generous)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 500 : 200, // More generous for development
  message: {
    message: "طلبات كثيرة جداً. يرجى المحاولة مرة أخرى لاحقاً",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip version checks and safe endpoints
  skip: (req) => {
    return req.path === '/api/version' || 
           req.method === 'HEAD' ||
           req.path.includes('/api/companies/public');
  }
});

// Slow down repeated requests
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 10, // allow 10 requests per windowMs without delay
  delayMs: () => 500, // add 500ms of delay per request after delayAfter
  validate: { delayMs: false } // disable warning
});

// Apply rate limiting (more targeted)
app.use('/api/login', authLimiter);  // Only apply strict limiting to actual login
app.use('/api/register', authLimiter);
app.use('/api', apiLimiter);  // General API limiting
// Apply speed limiter only to potentially abusive endpoints
app.use(['/api/reports', '/api/export'], speedLimiter);

// Secure body parsing with reasonable limits
app.use(express.json({ 
  limit: '5mb', // Reduced from 100mb for security
  type: 'application/json'
}));
app.use(express.urlencoded({ 
  extended: false, 
  limit: '5mb',
  parameterLimit: 100
}));

// Secure file upload middleware with streaming support
import fileUpload from "express-fileupload";
app.use('/api/import*', fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for import files only
  abortOnLimit: true,
  responseOnLimit: "حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت",
  useTempFiles: true, // Use temp files instead of memory
  tempFileDir: './temp-uploads/',
  createParentPath: true,
  parseNested: true,
  limitHandler: (req: any, res: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ File upload limit exceeded for IP:', req.ip);
    }
    res.status(413).json({ message: 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت' });
  }
}));

// Enhanced CSRF Protection
import { csrfProtection } from "./middleware/advanced-security";
app.use(csrfProtection);
log("🛡️ CSRF Protection enabled");

// Secure request logging without sensitive data
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  
  // Security: Only log in development, never log response content
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      if (process.env.NODE_ENV === 'development') {
        log(logLine);
      } else if (res.statusCode >= 400) {
        // Only log errors in production
        log(`Error: ${logLine}`);
      }
    }
  });

  next();
});

(async () => {
  try {
    log("🚀 Starting server initialization...");
    
    // Validate critical environment variables
    const requiredEnvVars = ['DATABASE_URL'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missingEnvVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }
    
    // Log optional environment variables status
    const optionalEnvVars = ['OPENAI_API_KEY', 'JWT_SECRET'];
    optionalEnvVars.forEach(envVar => {
      const isSet = !!process.env[envVar];
      log(`🔑 ${envVar}: ${isSet ? 'Set' : 'Not set'}`);
    });
    
    log("✅ Environment variables validated");
    
    // Test database connection
    log("🔍 Testing database connection...");
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      throw new Error("Failed to connect to database");
    }
    log("✅ Database connection verified");
    
    // Initialize default data
    log("🔧 Initializing default data...");
    
    // تعطيل إنشاء المستخدم الافتراضي للنظامل متعدد الشركات
    // await storage.createDefaultUser();
    
    // Unified environment - no production/development separation
    log("🔧 Unified environment - full functionality enabled");
    
    // تم تعطيل إنشاء المواقع الافتراضية للنظام متعدد الشركات
    log("ℹ️ Default location initialization disabled");
    
    // Initialize routes first
    await registerRoutes(app);
    log("✅ Routes registered successfully");
    
    // Create HTTP server
    const server = http.createServer(app);
    
    // 🔄 Auto-Update: No-cache headers for HTML files
    app.use((req, res, next) => {
      // Prevent caching of HTML files (especially index.html)
      if (req.path.endsWith('.html') || req.path === '/' || !req.path.includes('.')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        console.log(`🚫 [No-Cache] Applied to: ${req.path}`);
      }
      next();
    });
    
    // Serve static files from public directory only (security)
    app.use(express.static(path.join(import.meta.dirname, '../public'), {
      dotfiles: 'deny',
      index: false,
      maxAge: '1d',
      // Block access to sensitive directories and files
      setHeaders: (res, path) => {
        // Prevent access to backup files, temp files, and sensitive data
        if (path.includes('backup') || 
            path.includes('temp-') || 
            path.includes('database-') ||
            path.includes('.db') ||
            path.includes('.sql') ||
            path.includes('maintenance-scripts')) {
          res.status(403).end('Access denied');
          return;
        }
        
        // No caching for HTML files (auto-update system)
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else {
          // Cache other static assets for 1 day
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      }
    }));
    
    // Explicitly block access to sensitive directories
    const blockedPaths = [
      '/database-backups',
      '/temp-uploads', 
      '/maintenance-scripts',
      '/backup',
      '/.env',
      '/server',
      '/node_modules'
    ];
    
    blockedPaths.forEach(blockedPath => {
      app.use(blockedPath, (req, res) => {
        res.status(403).json({ message: 'Access denied' });
      });
    });

    // Use the global error handler
    app.use(globalErrorHandler);

    // Setup serving based on environment for security
    if (process.env.NODE_ENV === "production") {
      log("🔧 Setting up secure production static serving...");
      serveStatic(app);
      log("✅ Production static server ready");
    } else {
      log("🔧 Setting up Vite development server...");
      await setupVite(app, server);
      log("✅ Development Vite server ready");
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '80', 10);
    
    log(`🌐 Starting server on 0.0.0.0:${port}...`);
    
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, (err?: Error) => {
      if (err) {
        log(`❌ Failed to start server: ${err.message}`);
        process.exit(1);
      }
      log(`✅ Server running successfully on 0.0.0.0:${port}`);
      log(`🔗 Environment: ${process.env.NODE_ENV || 'development'}`);
      log(`📊 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      log('🛑 SIGTERM received, shutting down gracefully...');
      server.close(() => {
        log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      log('🛑 SIGINT received, shutting down gracefully...');
      server.close(() => {
        log('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    log(`❌ Server initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('Full error details:', error);
    process.exit(1);
  }
})();
