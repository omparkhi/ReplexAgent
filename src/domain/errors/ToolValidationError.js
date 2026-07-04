import { AppError } from './AppError.js';

export class ToolValidationError extends AppError {
  /**
   * @param {string} message
   * @param {{ toolName?: string, details?: unknown, cause?: unknown }} [options]
   */
  constructor(message, options = {}) {
    super(message, {
      statusCode: 400,
      code: 'TOOL_VALIDATION_ERROR',
      details: options.details,
      cause: options.cause
    });
    this.name = 'ToolValidationError';
    this.toolName = options.toolName;
  }
}
