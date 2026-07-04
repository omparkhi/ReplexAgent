import { AppError } from './AppError.js';

export class ToolPermissionError extends AppError {
  /**
   * @param {string} toolName
   * @param {string[]} required
   * @param {string[]} [granted]
   */
  constructor(toolName, required, granted = []) {
    super(`Tool "${toolName}" requires permissions: ${required.join(', ')}`, {
      statusCode: 403,
      code: 'TOOL_PERMISSION_DENIED',
      details: { toolName, required, granted }
    });
    this.name = 'ToolPermissionError';
  }
}
