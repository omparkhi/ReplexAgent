/**
 * @typedef {object} ToolDefinition
 * @property {string} name - Unique tool identifier (kebab-case recommended)
 * @property {string} description - Human-readable tool purpose
 * @property {Record<string, unknown>} [schema] - JSON Schema for input validation
 * @property {ToolMetadata} [metadata] - Runtime metadata and configuration
 */

/**
 * @typedef {object} ToolMetadata
 * @property {number} [timeout] - Execution timeout in milliseconds (default: 30000)
 * @property {ToolRetryConfig} [retry] - Retry configuration
 * @property {string[]} [permissions] - Required permissions to execute this tool
 * @property {string[]} [tags] - Categorization tags for discovery
 * @property {Record<string, unknown>} [custom] - Arbitrary metadata for extensions
 */

/**
 * @typedef {object} ToolRetryConfig
 * @property {number} [maxAttempts] - Maximum retry attempts (default: 0, no retry)
 * @property {number} [delayMs] - Base delay between retries in ms (default: 1000)
 * @property {number} [maxDelayMs] - Maximum delay cap in ms (default: 10000)
 * @property {boolean} [exponentialBackoff] - Use exponential backoff (default: true)
 */

/**
 * @typedef {object} ToolExecutionInput
 * @property {string} name
 * @property {Record<string, unknown>} [args]
 * @property {Record<string, unknown>} [context]
 * @property {AbortSignal} [signal]
 */

/**
 * @typedef {object} ToolExecutionResult
 * @property {unknown} data - Tool output data
 * @property {ToolResultMetadata} metadata - Execution metadata
 */

/**
 * @typedef {object} ToolResultMetadata
 * @property {boolean} success - Whether execution succeeded
 * @property {number} durationMs - Execution duration in milliseconds
 * @property {number} [attempt] - Which attempt succeeded (1-based)
 * @property {string} [error] - Error message if failed
 * @property {Record<string, unknown>} [details] - Additional result details
 */

/**
 * @typedef {object} Tool
 * @property {ToolDefinition} definition
 * @property {(input: ToolExecutionInput) => Promise<unknown>} execute
 */

/**
 * @typedef {object} ToolPermissionContext
 * @property {string[]} [permissions] - Permissions held by the caller
 * @property {string} [agentId] - Agent requesting execution
 * @property {string} [userId] - User requesting execution
 * @property {Record<string, unknown>} [metadata] - Additional context for permission decisions
 */

/**
 * @typedef {object} ToolRegistryConfig
 * @property {boolean} [validateOnRegister] - Validate tools on registration (default: true)
 * @property {boolean} [enablePermissions] - Enable permission checking (default: true)
 * @property {number} [defaultTimeout] - Default timeout for tools without explicit timeout (default: 30000)
 * @property {number} [defaultMaxAttempts] - Default max retry attempts (default: 0)
 */

/**
 * MCP-compatible tool format for future integration.
 * @typedef {object} McpToolDefinition
 * @property {string} name
 * @property {string} description
 * @property {Record<string, unknown>} [inputSchema]
 */

export {};
