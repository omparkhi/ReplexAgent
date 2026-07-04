import { NotFoundError } from '../../domain/errors/NotFoundError.js';
import { ToolValidator } from '../tools/ToolValidator.js';
import { ToolExecutor } from '../tools/ToolExecutor.js';
import { PermissionChecker } from '../tools/PermissionChecker.js';

export class ToolRegistry {
  /**
   * @param {object} [options]
   * @param {import('../../domain/interfaces/logger.interface.js').Logger} [options.logger]
   * @param {import('../../domain/interfaces/tool.interface.js').ToolRegistryConfig} [options.config]
   */
  constructor(options = {}) {
    this.logger = options.logger;
    this.config = {
      validateOnRegister: options.config?.validateOnRegister ?? true,
      enablePermissions: options.config?.enablePermissions ?? true,
      defaultTimeout: options.config?.defaultTimeout ?? 30000,
      defaultMaxAttempts: options.config?.defaultMaxAttempts ?? 0
    };

    /** @type {Map<string, import('../../domain/interfaces/tool.interface.js').Tool>} */
    this.tools = new Map();

    this.validator = new ToolValidator();
    this.executor = new ToolExecutor({
      logger: this.logger ?? { info() {}, warn() {}, error() {}, debug() {} },
      defaultTimeout: this.config.defaultTimeout,
      defaultMaxAttempts: this.config.defaultMaxAttempts
    });
    this.permissionChecker = new PermissionChecker({ logger: this.logger });
  }

  /**
   * Register a tool with optional validation.
   * @param {import('../../domain/interfaces/tool.interface.js').Tool} tool
   * @throws {import('../../domain/errors/ToolValidationError.js').ToolValidationError}
   */
  register(tool) {
    if (this.config.validateOnRegister) {
      this.validator.validateDefinition(tool);
    }

    const name = tool.definition.name;
    if (this.tools.has(name)) {
      this.logger?.warn({ tool: name }, 'Overwriting existing tool registration');
    }

    this.tools.set(name, tool);
    this.logger?.info({ tool: name, permissions: tool.definition.metadata?.permissions }, 'Tool registered');
  }

  /**
   * Unregister a tool by name.
   * @param {string} name
   * @returns {boolean}
   */
  unregister(name) {
    const deleted = this.tools.delete(name);
    if (deleted) {
      this.logger?.info({ tool: name }, 'Tool unregistered');
    }
    return deleted;
  }

  /**
   * Get a tool by name.
   * @param {string} name
   * @returns {import('../../domain/interfaces/tool.interface.js').Tool}
   * @throws {NotFoundError}
   */
  get(name) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new NotFoundError(`Tool not found: ${name}`);
    }
    return tool;
  }

  /**
   * Check if a tool is registered.
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this.tools.has(name);
  }

  /**
   * List all tool definitions.
   * @param {object} [filters]
   * @param {string[]} [filters.tags] - Filter by tags (any match)
   * @param {string} [filters.permission] - Filter by required permission
   * @returns {import('../../domain/interfaces/tool.interface.js').ToolDefinition[]}
   */
  list(filters) {
    let tools = Array.from(this.tools.values());

    if (filters?.tags && filters.tags.length > 0) {
      const filterTags = filters.tags;
      tools = tools.filter((t) => {
        const toolTags = t.definition.metadata?.tags;
        return Array.isArray(toolTags) && filterTags.some((tag) => toolTags.includes(tag));
      });
    }

    if (filters?.permission) {
      const perm = filters.permission;
      tools = tools.filter((t) => {
        const perms = t.definition.metadata?.permissions;
        return Array.isArray(perms) && perms.includes(perm);
      });
    }

    return tools.map((t) => t.definition);
  }

  /**
   * Execute a tool with full validation, permission check, timeout, and retry.
   * @param {import('../../domain/interfaces/tool.interface.js').ToolExecutionInput} input
   * @param {import('../../domain/interfaces/tool.interface.js').ToolPermissionContext} [permContext]
   * @returns {Promise<import('../../domain/interfaces/tool.interface.js').ToolExecutionResult>}
   */
  async execute(input, permContext) {
    const tool = this.get(input.name);

    if (this.config.enablePermissions) {
      this.permissionChecker.check(tool, permContext);
    }

    this.validator.validateInput(tool, input.args);

    return this.executor.execute(tool, input);
  }

  /**
   * Convert a tool to MCP-compatible format.
   * @param {string} name
   * @returns {import('../../domain/interfaces/tool.interface.js').McpToolDefinition | undefined}
   */
  toMcp(name) {
    const tool = this.tools.get(name);
    if (!tool) return undefined;

    return {
      name: tool.definition.name,
      description: tool.definition.description,
      inputSchema: tool.definition.schema
    };
  }

  /**
   * List all tools in MCP-compatible format.
   * @returns {import('../../domain/interfaces/tool.interface.js').McpToolDefinition[]}
   */
  listMcp() {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.definition.name,
      description: tool.definition.description,
      inputSchema: tool.definition.schema
    }));
  }

  /**
   * Get the count of registered tools.
   * @returns {number}
   */
  get size() {
    return this.tools.size;
  }
}
