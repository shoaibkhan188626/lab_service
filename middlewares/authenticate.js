import jwt from 'jsonwebtoken';
import logger from '../config/logger.js';
import { AppError } from '../utils/error.js';

export default function authenticate(roles = []) {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new AppError('No token provided', 401);
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: decoded.id, role: decoded.role };

      // Role-based access control
      if (roles.length && !roles.includes(decoded.role)) {
        throw new AppError(
          `Access denied. Required roles: ${roles.join(', ')}`,
          403
        );
      }

      logger.info('Authenticated user', {
        userId: decoded.id,
        role: decoded.role,
        path: req.path,
      });
      next();
    } catch (err) {
      logger.error('Authentication error', {
        error: err.message,
        path: req.path,
      });
      next(err);
    }
  };
}
