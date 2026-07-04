/**
 * @typedef {object} AgentRunInput
 * @property {string} input
 * @property {Record<string, unknown>} [metadata]
 * @property {string} [conversationId]
 * @property {AbortSignal} [signal]
 */

/**
 * @typedef {object} AgentRunResult
 * @property {string} output
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * @typedef {object} Agent
 * @property {string} id
 * @property {string} name
 * @property {(input: AgentRunInput) => Promise<AgentRunResult>} run
 */

export {};
