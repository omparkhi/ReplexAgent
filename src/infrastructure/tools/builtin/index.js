/**
 * A built-in echo tool for testing and demonstration.
 * Returns the input arguments as-is.
 */
export const echoTool = {
  definition: {
    name: 'echo',
    description: 'Echoes back the provided arguments. Useful for testing tool execution.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Message to echo back' },
        data: { description: 'Arbitrary data to echo back' }
      }
    },
    metadata: {
      tags: ['utility', 'test'],
      timeout: 5000
    }
  },

  /**
   * @param {import('../../../domain/interfaces/tool.interface.js').ToolExecutionInput} input
   * @returns {Promise<Record<string, unknown>>}
   */
  async execute(input) {
    return {
      echo: true,
      message: input.args?.message ?? 'No message provided',
      data: input.args?.data ?? null,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * A built-in tool that returns system information.
 */
export const systemInfoTool = {
  definition: {
    name: 'system-info',
    description: 'Returns system information about the agent runtime.',
    schema: {
      type: 'object',
      properties: {
        include: {
          type: 'array',
          items: { type: 'string' },
          description: 'Sections to include: memory, uptime, versions'
        }
      }
    },
    metadata: {
      tags: ['utility', 'diagnostic'],
      timeout: 5000,
      permissions: ['system:read']
    }
  },

  /**
   * @param {import('../../../domain/interfaces/tool.interface.js').ToolExecutionInput} input
   * @returns {Promise<Record<string, unknown>>}
   */
  async execute(input) {
    const include = /** @type {string[]} */ (input.args?.include ?? ['uptime', 'versions']);
    const result = /** @type {Record<string, unknown>} */ ({});

    if (include.includes('uptime')) {
      result.uptime = process.uptime();
    }

    if (include.includes('versions')) {
      result.versions = {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      };
    }

    if (include.includes('memory')) {
      result.memory = process.memoryUsage();
    }

    result.timestamp = new Date().toISOString();
    return result;
  }
};

/**
 * All built-in tools.
 * @returns {import('../../../domain/interfaces/tool.interface.js').Tool[]}
 */
export function getBuiltinTools() {
  return [echoTool, systemInfoTool];
}
