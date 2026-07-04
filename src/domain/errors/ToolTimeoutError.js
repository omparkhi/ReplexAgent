import { AppError } from './AppError.js';

export class ToolTimeoutError extends AppError {
  /**
   * @param {string} toolName
   * @param {number} timeoutMs
   */
  constructor(toolName, timeoutMs) {
    super(`Tool "${toolName}" timed out after ${timeoutMs}ms`, {
      statusCode: 504,
      code: 'TOOL_TIMEOUT',
      details: { toolName, timeoutMs }
    });
    this.name = 'ToolTimeoutError';
  }
}
