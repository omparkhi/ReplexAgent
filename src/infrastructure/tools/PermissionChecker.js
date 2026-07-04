import { ToolPermissionError } from '../../domain/errors/ToolPermissionError.js';

/**
 * Checks tool permissions based on caller context.
 */
export class PermissionChecker {
  /**
   * @param {object} [options]
   * @param {import('../../domain/interfaces/logger.interface.js').Logger} [options.logger]
   */
  constructor(options = {}) {
    this.logger = options.logger;
  }

  /**
   * Check if the caller has permission to execute the tool.
   * @param {import('../../domain/interfaces/tool.interface.js').Tool} tool
   * @param {import('../../domain/interfaces/tool.interface.js').ToolPermissionContext} [context]
   * @throws {ToolPermissionError}
   */
  check(tool, context) {
    const required = tool.definition.metadata?.permissions;
    if (!required?.length) return;

    const granted = context?.permissions ?? [];

    for (const permission of required) {
      if (!granted.includes(permission)) {
        this.logger?.warn(
          { tool: tool.definition.name, required, granted, agentId: context?.agentId },
          'Tool permission denied'
        );
        throw new ToolPermissionError(tool.definition.name, required, granted);
      }
    }
  }
}
