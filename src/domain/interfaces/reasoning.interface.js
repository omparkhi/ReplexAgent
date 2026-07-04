/**
 * @typedef {'deductive' | 'inductive' | 'abductive' | 'analogical' | 'critical'} ReasoningStrategy
 */

/**
 * @typedef {object} ReasoningInput
 * @property {string} query - The question or problem to reason about
 * @property {Record<string, unknown>} [context] - Structured context data (AgentContext)
 * @property {Record<string, unknown>[]} [memory] - Relevant memory records
 * @property {Record<string, unknown>[]} [toolResults] - Results from tool executions
 * @property {Record<string, unknown>} [metadata] - Additional metadata
 * @property {ReasoningStrategy} [strategy] - Preferred reasoning strategy
 * @property {number} [maxSteps] - Maximum reasoning steps (default: 5)
 */

/**
 * @typedef {object} ReasoningStep
 * @property {string} id - Step identifier
 * @property {string} thought - Internal reasoning thought
 * @property {Record<string, unknown>} [evidence] - Evidence supporting this step
 * @property {string} [source] - Source of evidence (context, memory, tool, inference)
 * @property {number} confidence - Confidence in this step (0-1)
 */

/**
 * @typedef {object} ReasoningEvidence
 * @property {string} claim - The evidence claim
 * @property {string} source - Where the evidence came from
 * @property {'context' | 'memory' | 'tool' | 'inference' | 'external'} sourceType
 * @property {number} reliability - Reliability score (0-1)
 */

/**
 * @typedef {object} ReasoningOutput
 * @property {string} answer - The final answer (structured, not raw text)
 * @property {number} confidence - Overall confidence score (0-1)
 * @property {ReasoningEvidence[]} evidence - Supporting evidence
 * @property {string[]} sources - List of source identifiers
 * @property {string[]} recommendations - Actionable recommendations
 * @property {string[]} uncertainties - Acknowledged uncertainties
 * @property {Record<string, unknown>} [metadata] - Additional output metadata
 */

/**
 * @typedef {object} ReasoningResult
 * @property {boolean} success - Whether reasoning completed successfully
 * @property {ReasoningOutput} output - The structured reasoning output
 * @property {ReasoningStep[]} steps - Internal reasoning steps (hidden from user)
 * @property {number} durationMs - Total reasoning duration
 * @property {string} strategy - Strategy used
 * @property {Record<string, unknown>} [metadata] - Additional result metadata
 */

/**
 * @typedef {object} ReasoningStrategyHandler
 * @property {string} name - Strategy name
 * @property {(input: ReasoningInput, steps: ReasoningStep[]) => Promise<ReasoningOutput>} reason
 */

/**
 * @typedef {object} ReasoningEngine
 * @property {(input: ReasoningInput) => Promise<ReasoningResult>} reason
 */

export {};
