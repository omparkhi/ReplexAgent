/**
 * @typedef {import('./llm-provider.interface.js').LlmMessage} LlmMessage
 * @typedef {import('./context.interface.js').AgentContext} AgentContext
 */

/**
 * @typedef {object} PromptSection
 * @property {string} id - Unique section identifier
 * @property {'system' | 'user' | 'assistant' | 'tool'} role - LLM message role
 * @property {string} template - Template string with {{variable}} placeholders
 * @property {string} [condition] - Variable name that must be truthy for section to include
 * @property {number} [priority] - Lower numbers render first (default: 100)
 */

/**
 * @typedef {object} PromptTemplate
 * @property {string} agentId - Agent this template belongs to
 * @property {string} version - Semantic version for template evolution
 * @property {string} [description] - Human-readable template purpose
 * @property {PromptSection[]} sections - Ordered sections to compose into messages
 * @property {Record<string, unknown>} [defaults] - Default variable values
 */

/**
 * @typedef {object} ReasoningContext
 * @property {string} [answer]
 * @property {number} [confidence]
 * @property {Record<string, unknown>[]} [evidence]
 * @property {string[]} [recommendations]
 */

/**
 * @typedef {object} PromptBuildInput
 * @property {AgentContext} context
 * @property {Record<string, unknown>} [memory]
 * @property {Record<string, unknown>} [rag]
 * @property {ReasoningContext} [reasoning]
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * @typedef {object} PromptBuilder
 * @property {(input: PromptBuildInput) => Promise<LlmMessage[]>} build
 */

/**
 * @typedef {object} TemplateRegistry
 * @property {(template: PromptTemplate) => void} register
 * @property {(agentId: string) => PromptTemplate | undefined} get
 * @property {(agentId: string, template: PromptTemplate) => void} override
 */

export {};
