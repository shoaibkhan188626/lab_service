import rateLimit from 'express-rate-limit';
import { AppError } from '../utils/errors.js';

export const bookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: new AppError(
    'Too many lab bookings, try again after 15 minutes',
    429
  ),
});

export const getLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: new AppError('Too many requests, try again after 15 minutes', 429),
});
