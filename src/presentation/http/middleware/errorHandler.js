import { ZodError } from 'zod';
import { AppError } from '../../../domain/errors/AppError.js';

/**
 * @param {import('../../../domain/interfaces/logger.interface.js').Logger} logger
 */
export function createErrorHandler(logger) {
  /**
   * @param {unknown} error
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} _next
   */
  return function errorHandler(error, req, res, _next) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.flatten()
        }
      });
      return;
    }

    if (error instanceof AppError) {
      logger.warn({ error, path: req.path }, error.message);
      res.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      });
      return;
    }

    logger.error({ error, path: req.path }, 'Unhandled error');
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error'
      }
    });
  };
}
