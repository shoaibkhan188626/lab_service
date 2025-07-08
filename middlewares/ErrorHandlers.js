import logger from '../config/logger.js';

// Centralized error handler for Lab Service
export default function ErrorHandler(err, req, res) {
  // Log error with Winston for NDHM audit compliance
  logger.error(`${err.message}`, {
    stack: err.stack,
    method: req.method,
    url: req.url,
    userId: req.user?.id || 'anonymous',
    timestamp: new Date().toISOString(),
  });

  // Default error response
  const statusCode = err.statusCode || 500;
  const response = {
    status: 'error',
    message: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
  };

  // Specific error cases
  if (err.name === 'ValidationError') {
    response.statusCode = 400;
    response.message = 'Validation failed';
    response.errors = Object.values(err.errors).map((e) => e.message);
  } else if (err.name === 'MongoServerError' && err.code === 11000) {
    response.statusCode = 409;
    response.message = 'Duplicate key error';
    response.errors = err.keyValue;
  } else if (err.name === 'JsonWebTokenError') {
    response.statusCode = 401;
    response.message = 'Invalid or expired token';
  } else if (err.name === 'RateLimitError') {
    response.statusCode = 429;
    response.message = err.message;
  }

  // Send response
  res.status(statusCode).json(response);
}