import { Request, Response, NextFunction } from 'express';

// Interface for structured errors
interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

// Create a structured error
export function createError(message: string, statusCode: number = 500, isOperational: boolean = true): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = isOperational;
  return error;
}

// Redact sensitive information from error details
function redactErrorData(error: any): any {
  if (!error || typeof error !== 'object') {
    return error;
  }

  const sensitiveKeys = [
    'password', 'token', 'authorization', 'cookie', 'session',
    'jwt', 'secret', 'key', 'auth', 'credential', 'bearer', 'DATABASE_URL'
  ];

  const redacted = { ...error };
  
  for (const key in redacted) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactErrorData(redacted[key]);
    }
  }

  return redacted;
}

// Log errors securely
function logError(error: AppError, req: Request): void {
  const errorInfo = {
    message: error.message,
    statusCode: error.statusCode,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    userId: (req as any).user?.id || null
  };

  // Redact sensitive data
  const safeErrorInfo = redactErrorData(errorInfo);

  // Log based on environment
  if (process.env.NODE_ENV === 'development') {
    console.error('🚨 Application Error:', safeErrorInfo);
  } else {
    // In production, only log essential information
    console.error('🚨 Error:', {
      message: error.message,
      statusCode: error.statusCode,
      url: req.url,
      method: req.method,
      userId: (req as any).user?.id || null,
      timestamp: safeErrorInfo.timestamp
    });
  }
}

// Send error response to client
function sendErrorResponse(error: AppError, res: Response): void {
  const statusCode = error.statusCode || 500;
  const isOperational = error.isOperational !== false;

  // Production vs Development responses
  if (process.env.NODE_ENV === 'production') {
    if (isOperational) {
      // Operational errors: safe to expose to client
      res.status(statusCode).json({
        success: false,
        message: error.message,
        code: statusCode
      });
    } else {
      // Programming errors: don't leak details
      res.status(500).json({
        success: false,
        message: 'حدث خطأ في الخادم',
        code: 500
      });
    }
  } else {
    // Development: provide full error details
    res.status(statusCode).json({
      success: false,
      message: error.message,
      code: statusCode,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}

// Global error handler middleware
export const globalErrorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error securely
  logError(error, req);

  // Send appropriate response
  sendErrorResponse(error, res);
};

// Catch-all for unhandled promise rejections
process.on('unhandledRejection', (reason: Error | any, promise: Promise<any>) => {
  console.error('🚨 Unhandled Promise Rejection:', {
    reason: reason?.message || reason,
    timestamp: new Date().toISOString()
  });
  
  // Don't exit in production, just log
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Catch-all for uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('🚨 Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  // Graceful shutdown
  process.exit(1);
});