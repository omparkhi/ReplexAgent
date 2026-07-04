import { AppError } from './AppError.js';

export class NotFoundError extends AppError {
  /**
   * @param {string} message
   * @param {{ details?: unknown, cause?: unknown }} [options]
   */
  constructor(message, options = {}) {
    super(message, {
      statusCode: 404,
      code: 'NOT_FOUND',
      details: options.details,
      cause: options.cause
    });
    this.name = 'NotFoundError';
  }
}
