import { AppError } from './AppError.js';

export class ValidationError extends AppError {
  /**
   * @param {string} message
   * @param {{ details?: unknown, cause?: unknown }} [options]
   */
  constructor(message, options = {}) {
    super(message, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: options.details,
      cause: options.cause
    });
    this.name = 'ValidationError';
  }
}
