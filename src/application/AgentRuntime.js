export class AgentRuntime {
  /**
   * @param {object} dependencies
   * @param {import('../infrastructure/registries/AgentRegistry.js').AgentRegistry} dependencies.agentRegistry
   * @param {import('../infrastructure/registries/ToolRegistry.js').ToolRegistry} dependencies.toolRegistry
   * @param {import('../domain/interfaces/logger.interface.js').Logger} dependencies.logger
   */
  constructor(dependencies) {
    this.agentRegistry = dependencies.agentRegistry;
    this.toolRegistry = dependencies.toolRegistry;
    this.logger = dependencies.logger;
  }

  /**
   * @param {string} agentId
   * @param {import('../domain/interfaces/agent.interface.js').AgentRunInput} input
   * @returns {Promise<import('../domain/interfaces/agent.interface.js').AgentRunResult>}
   */
  async runAgent(agentId, input) {
    const agent = this.agentRegistry.get(agentId);
    this.logger.info({ agentId }, 'Starting agent run');
    return agent.run(input);
  }

  /**
   * Execute a tool with full validation, permission check, timeout, and retry.
   * @param {import('../domain/interfaces/tool.interface.js').ToolExecutionInput} input
   * @param {import('../domain/interfaces/tool.interface.js').ToolPermissionContext} [permContext]
   * @returns {Promise<import('../domain/interfaces/tool.interface.js').ToolExecutionResult>}
   */
  async executeTool(input, permContext) {
    this.logger.info({ tool: input.name }, 'Executing tool');
    return this.toolRegistry.execute(input, permContext);
  }

  /**
   * @returns {{ id: string, name: string }[]}
   */
  listAgents() {
    return this.agentRegistry.list();
  }

  /**
   * List tool definitions with optional filters.
   * @param {object} [filters]
   * @param {string[]} [filters.tags]
   * @param {string} [filters.permission]
   * @returns {import('../domain/interfaces/tool.interface.js').ToolDefinition[]}
   */
  listTools(filters) {
    return this.toolRegistry.list(filters);
  }

  /**
   * List tools in MCP-compatible format.
   * @returns {import('../domain/interfaces/tool.interface.js').McpToolDefinition[]}
   */
  listToolsMcp() {
    return this.toolRegistry.listMcp();
  }
}
