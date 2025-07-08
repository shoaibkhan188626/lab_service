import winston from 'winston';
import path from 'path';
import fs from 'fs';
import DailyRotateFile from 'winston-daily-rotate-file';
import { format } from 'winston';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for structured logging
const structuredFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
  format.json()
);

// Enhanced console format with colors and better readability
const consoleFormat = format.combine(
  format.timestamp({ format: 'HH:mm:ss' }),
  format.colorize({ all: true }),
  format.align(),
  format.printf((info) => {
    const { timestamp, level, message, metadata, stack } = info;
    let output = `${timestamp} ${level}: ${message}`;

    if (metadata && Object.keys(metadata).length > 0) {
      output += `\n  📋 ${JSON.stringify(metadata, null, 2)}`;
    }

    if (stack) {
      output += `\n  🔍 Stack: ${stack}`;
    }

    return output;
  })
);

// Production format with correlation IDs and structured data
const productionFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
  format.json(),
  format.printf((info) => {
    const logEntry = {
      timestamp: info.timestamp,
      level: info.level,
      message: info.message,
      service: process.env.SERVICE_NAME || 'lab-booking-service',
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid,
      hostname: require('os').hostname(),
      ...info.metadata,
    };

    if (info.stack) {
      logEntry.stack = info.stack;
    }

    return JSON.stringify(logEntry);
  })
);

// Create custom log levels
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6,
    audit: 7,
    security: 8,
    performance: 9,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    verbose: 'cyan',
    debug: 'blue',
    silly: 'grey',
    audit: 'bold yellow',
    security: 'bold red',
    performance: 'bold cyan',
  },
};

winston.addColors(customLevels.colors);

// Create transports array
const transports = [];

// File transport for errors with rotation
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: productionFormat,
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true,
    handleExceptions: true,
    handleRejections: true,
  })
);

// Combined logs with rotation
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    format: productionFormat,
    maxSize: '20m',
    maxFiles: '30d',
    zippedArchive: true,
  })
);

// HTTP access logs
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'access-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'http',
    format: productionFormat,
    maxSize: '50m',
    maxFiles: '14d',
    zippedArchive: true,
  })
);

// Audit logs for sensitive operations
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'audit-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'audit',
    format: productionFormat,
    maxSize: '10m',
    maxFiles: '90d',
    zippedArchive: true,
  })
);

// Security logs
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'security-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'security',
    format: productionFormat,
    maxSize: '10m',
    maxFiles: '90d',
    zippedArchive: true,
  })
);

// Performance logs
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'performance-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'performance',
    format: productionFormat,
    maxSize: '30m',
    maxFiles: '7d',
    zippedArchive: true,
  })
);

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      handleExceptions: true,
      handleRejections: true,
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: customLevels.levels,
  format: structuredFormat,
  transports,
  exitOnError: false,

  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: productionFormat,
    }),
  ],

  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: productionFormat,
    }),
  ],
});

// Context middleware for request correlation
let currentContext = {};

export function withContext(context) {
  return {
    ...logger,
    info: (message, meta = {}) =>
      logger.info(message, { ...currentContext, ...context, ...meta }),
    error: (message, meta = {}) =>
      logger.error(message, { ...currentContext, ...context, ...meta }),
    warn: (message, meta = {}) =>
      logger.warn(message, { ...currentContext, ...context, ...meta }),
    debug: (message, meta = {}) =>
      logger.debug(message, { ...currentContext, ...context, ...meta }),
    http: (message, meta = {}) =>
      logger.http(message, { ...currentContext, ...context, ...meta }),
    verbose: (message, meta = {}) =>
      logger.verbose(message, { ...currentContext, ...context, ...meta }),
    silly: (message, meta = {}) =>
      logger.silly(message, { ...currentContext, ...context, ...meta }),
    audit: (message, meta = {}) =>
      logger.audit(message, { ...currentContext, ...context, ...meta }),
    security: (message, meta = {}) =>
      logger.security(message, { ...currentContext, ...context, ...meta }),
    performance: (message, meta = {}) =>
      logger.performance(message, { ...currentContext, ...context, ...meta }),
  };
}

// Structured logging helpers
export const logHelpers = {
  // Request logging
  logRequest: (req, res, responseTime) => {
    logger.http('HTTP Request', {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      statusCode: res.statusCode,
      responseTime,
      contentLength: res.get('content-length'),
      correlationId: req.headers['x-correlation-id'],
    });
  },

  // Error logging with context
  logError: (error, context = {}) => {
    logger.error('Application Error', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
      },
      ...context,
    });
  },

  // Database operation logging
  logDbOperation: (operation, table, duration, status = 'success') => {
    logger.performance('Database Operation', {
      operation,
      table,
      duration,
      status,
      timestamp: new Date().toISOString(),
    });
  },

  // Business logic logging
  logBookingEvent: (event, bookingId, userId, testType, metadata = {}) => {
    logger.audit('Booking Event', {
      event,
      bookingId,
      userId,
      testType,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  },

  // Security event logging
  logSecurityEvent: (event, userId, ip, userAgent, severity = 'medium') => {
    logger.security('Security Event', {
      event,
      userId,
      ip,
      userAgent,
      severity,
      timestamp: new Date().toISOString(),
    });
  },

  // Performance monitoring
  logPerformance: (operation, duration, metadata = {}) => {
    const level = duration > 1000 ? 'warn' : 'performance';
    logger[level]('Performance Metric', {
      operation,
      duration,
      slow: duration > 1000,
      ...metadata,
    });
  },

  // Cache operations
  logCacheOperation: (operation, key, hit, duration) => {
    logger.debug('Cache Operation', {
      operation,
      key,
      hit,
      duration,
      timestamp: new Date().toISOString(),
    });
  },

  // External API calls
  logExternalApiCall: (service, endpoint, method, statusCode, duration) => {
    logger.info('External API Call', {
      service,
      endpoint,
      method,
      statusCode,
      duration,
      timestamp: new Date().toISOString(),
    });
  },
};

// Middleware for Express request logging
export function requestLoggingMiddleware(req, res, next) {
  const start = Date.now();

  // Generate correlation ID if not present
  if (!req.headers['x-correlation-id']) {
    req.headers['x-correlation-id'] =
      `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Set context for this request
  currentContext = {
    correlationId: req.headers['x-correlation-id'],
    requestId: req.headers['x-request-id'],
    userId: req.user?.id,
    sessionId: req.session?.id,
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    logHelpers.logRequest(req, res, duration);

    // Log slow requests
    if (duration > 1000) {
      logHelpers.logPerformance('http_request', duration, {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
      });
    }
  });

  next();
}

// Graceful shutdown
export function shutdown() {
  logger.info('Shutting down logger...');
  logger.end();
}

// Stream for Morgan HTTP logging
export const stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Log levels for different environments
export const logLevels = {
  development: 'debug',
  staging: 'info',
  production: 'warn',
  test: 'error',
};

// Health check for logging system
export function healthCheck() {
  try {
    logger.info('Logger health check');
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

export default logger;
