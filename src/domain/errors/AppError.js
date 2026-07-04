export class AppError extends Error {
  /**
   * @param {string} message
   * @param {{ statusCode?: number, code?: string, details?: unknown, cause?: unknown }} [options]
   */
  constructor(message, options = {}) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? 'APP_ERROR';
    this.details = options.details;
    this.isOperational = true;
  }
}
