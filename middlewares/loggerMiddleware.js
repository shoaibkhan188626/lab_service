import logger from '../config/logger.js';

export default function loggerMiddleware(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request processed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      userId: req.user?.id || 'anonymous',
    });
  });
  next();
}
