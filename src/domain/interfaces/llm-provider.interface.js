/**
 * @typedef {object} LlmMessage
 * @property {'system' | 'user' | 'assistant' | 'tool'} role
 * @property {string} content
 * @property {string} [name]
 */

/**
 * @typedef {object} LlmCompletionInput
 * @property {LlmMessage[]} messages
 * @property {LlmCompletionOptions} [options]
 * @property {AbortSignal} [signal]
 */

/**
 * @typedef {object} LlmCompletionOptions
 * @property {number} [temperature] - Sampling temperature (0-2)
 * @property {number} [maxTokens] - Maximum tokens to generate
 * @property {number} [topP] - Nucleus sampling parameter
 * @property {boolean} [jsonMode] - Force JSON output format
 * @property {string[]} [stop] - Stop sequences
 * @property {Record<string, unknown>} [providerOptions] - Provider-specific options
 */

/**
 * @typedef {object} LlmCompletionResult
 * @property {string} content
 * @property {LlmUsage} [usage]
 * @property {LlmResultMetadata} metadata
 */

/**
 * @typedef {object} LlmUsage
 * @property {number} [promptTokens]
 * @property {number} [completionTokens]
 * @property {number} [totalTokens]
 */

/**
 * @typedef {object} LlmResultMetadata
 * @property {string} provider - Provider identifier
 * @property {string} [model] - Model used
 * @property {number} [durationMs] - Request duration
 * @property {boolean} [placeholder] - Whether this is a placeholder response
 * @property {Record<string, unknown>} [raw] - Raw provider response
 */

/**
 * @typedef {object} LlmStreamChunk
 * @property {string} delta - Incremental content
 * @property {boolean} done - Whether generation is complete
 * @property {LlmUsage} [usage] - Usage stats (only on final chunk)
 */

/**
 * @typedef {object} LlmStreamInput
 * @property {LlmMessage[]} messages
 * @property {LlmCompletionOptions} [options]
 * @property {AbortSignal} [signal]
 */

/**
 * @typedef {object} LlmProviderConfig
 * @property {string} apiKey - API key for authentication
 * @property {string} [baseUrl] - Base URL for API calls
 * @property {string} [model] - Model identifier
 * @property {number} [timeout] - Request timeout in ms (default: 60000)
 * @property {number} [maxRetries] - Max retry attempts (default: 3)
 * @property {number} [rateLimitRpm] - Rate limit: requests per minute
 */

/**
 * @typedef {object} LlmProvider
 * @property {string} id - Unique provider identifier
 * @property {(input: LlmCompletionInput) => Promise<LlmCompletionResult>} complete - Generate completion
 * @property {(input: LlmStreamInput) => AsyncGenerator<LlmStreamChunk>} [stream] - Stream completion
 */

export {};
