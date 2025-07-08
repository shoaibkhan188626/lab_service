import client from 'prom-client';
import logger from '../config/logger.js';
import os from 'os';

// Create a registry for better metric management
const register = new client.Registry();

// Add a default label to all metrics
register.setDefaultLabels({
  app: process.env.APP_NAME || 'lab-booking-service',
  version: process.env.APP_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  instance: os.hostname(),
});

// Enable default metrics with custom registry
client.collectDefaultMetrics({ 
  register,
  timeout: 5000,
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // Custom GC buckets
});

// HTTP Request Metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'user_agent_type'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'user_agent_type'],
  registers: [register],
});

const httpRequestSize = new client.Histogram({
  name: 'http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register],
});

const httpResponseSize = new client.Histogram({
  name: 'http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register],
});

// Business Logic Metrics
const labBookingsCreated = new client.Counter({
  name: 'lab_bookings_created_total',
  help: 'Total number of lab bookings created',
  labelNames: ['test_type', 'status', 'user_type'],
  registers: [register],
});

const labBookingsDuration = new client.Histogram({
  name: 'lab_booking_process_duration_seconds',
  help: 'Time taken to process lab bookings',
  labelNames: ['test_type', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

const activeBookings = new client.Gauge({
  name: 'active_bookings_total',
  help: 'Current number of active bookings',
  labelNames: ['test_type'],
  registers: [register],
});

// Database Metrics
const dbQueryDuration = new client.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['operation', 'table', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
  registers: [register],
});

const dbConnectionsActive = new client.Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections',
  registers: [register],
});

// Error Metrics
const errorCounter = new client.Counter({
  name: 'application_errors_total',
  help: 'Total number of application errors',
  labelNames: ['type', 'severity', 'component'],
  registers: [register],
});

// Cache Metrics
const cacheHits = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
  registers: [register],
});

const cacheMisses = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
  registers: [register],
});

// Utility functions
function getUserAgentType(userAgent) {
  if (!userAgent) return 'unknown';
  if (userAgent.includes('Mobile')) return 'mobile';
  if (userAgent.includes('Bot') || userAgent.includes('bot')) return 'bot';
  return 'desktop';
}

function normalizeRoute(path) {
  // Replace IDs and UUIDs with placeholders for better grouping
  return path
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')
    .replace(/\/[0-9a-f]{24}/g, '/:objectId');
}

// Enhanced middleware
export function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  const startTime = Date.now();

  // Track request size
  const requestSize = parseInt(req.get('content-length') || '0', 10);
  
  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    const responseSize = parseInt(res.get('content-length') || '0', 10);
    
    const labels = {
      method: req.method,
      route: normalizeRoute(req.path),
      status_code: res.statusCode.toString(),
      user_agent_type: getUserAgentType(req.get('user-agent')),
    };

    // Record metrics
    httpRequestDuration.observe(labels, duration);
    httpRequestsTotal.inc(labels);
    
    if (requestSize > 0) {
      httpRequestSize.observe(
        { method: req.method, route: normalizeRoute(req.path) },
        requestSize
      );
    }
    
    if (responseSize > 0) {
      httpResponseSize.observe(
        { 
          method: req.method, 
          route: normalizeRoute(req.path), 
          status_code: res.statusCode.toString() 
        },
        responseSize
      );
    }

    // Log slow requests
    if (duration > 1) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        duration: duration,
        statusCode: res.statusCode,
      });
    }
  });

  next();
}

// Database query tracking helper
export function trackDbQuery(operation, table) {
  const start = process.hrtime.bigint();
  
  return {
    end: (status = 'success') => {
      const duration = Number(process.hrtime.bigint() - start) / 1e9;
      dbQueryDuration.observe(
        { operation, table, status },
        duration
      );
    }
  };
}

// Business logic helpers
export function trackBookingCreation(testType, status = 'success', userType = 'user') {
  labBookingsCreated.inc({ test_type: testType, status, user_type: userType });
}

export function trackBookingDuration(testType, status = 'success') {
  const start = Date.now();
  
  return {
    end: () => {
      const duration = (Date.now() - start) / 1000;
      labBookingsDuration.observe(
        { test_type: testType, status },
        duration
      );
    }
  };
}

export function updateActiveBookings(testType, count) {
  activeBookings.set({ test_type: testType }, count);
}

export function trackError(type, severity = 'error', component = 'unknown') {
  errorCounter.inc({ type, severity, component });
}

export function trackCacheHit(cacheType) {
  cacheHits.inc({ cache_type: cacheType });
}

export function trackCacheMiss(cacheType) {
  cacheMisses.inc({ cache_type: cacheType });
}

// Health check metrics
const healthCheckStatus = new client.Gauge({
  name: 'health_check_status',
  help: 'Status of health checks (1 = healthy, 0 = unhealthy)',
  labelNames: ['service'],
  registers: [register],
});

export function updateHealthStatus(service, isHealthy) {
  healthCheckStatus.set({ service }, isHealthy ? 1 : 0);
}

// Metrics endpoint with error handling and caching
let metricsCache = null;
let lastMetricsUpdate = 0;
const METRICS_CACHE_TTL = 5000; // 5 seconds cache

export async function metricsEndpoint(req, res) {
  try {
    const now = Date.now();
    
    // Use cached metrics if available and not expired
    if (metricsCache && (now - lastMetricsUpdate) < METRICS_CACHE_TTL) {
      res.set('Content-Type', register.contentType);
      res.end(metricsCache);
      return;
    }

    // Generate fresh metrics
    const metrics = await register.metrics();
    metricsCache = metrics;
    lastMetricsUpdate = now;

    res.set('Content-Type', register.contentType);
    res.end(metrics);
  } catch (err) {
    logger.error('Error serving metrics', { 
      error: err.message,
      stack: err.stack 
    });
    res.status(500).send('Error serving metrics');
  }
}

// Graceful shutdown - clear intervals
export function shutdown() {
  register.clear();
  metricsCache = null;
  logger.info('Metrics system shutdown complete');
  
}

// Export the register for custom metric registration
export { register };