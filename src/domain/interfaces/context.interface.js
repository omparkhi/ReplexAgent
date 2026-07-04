/**
 * @typedef {object} ProjectContext
 * @property {string} [id]
 * @property {string} [name]
 * @property {string} [rootPath]
 * @property {string} [repositoryUrl]
 * @property {string} [branch]
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * @typedef {object} AuditContext
 * @property {string} [sessionId]
 * @property {string} [actorId]
 * @property {string[]} [permissions]
 * @property {Record<string, unknown>[]} events
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * @typedef {object} WebsiteContext
 * @property {string} [url]
 * @property {string} [title]
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * @typedef {object} FindingContext
 * @property {string} id
 * @property {string} title
 * @property {'info' | 'low' | 'medium' | 'high' | 'critical'} severity
 * @property {string} [description]
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * @typedef {object} UserSettingsContext
 * @property {string} [locale]
 * @property {string} [timezone]
 * @property {Record<string, unknown>} preferences
 */

/**
 * @typedef {object} ConversationMessage
 * @property {'system' | 'user' | 'assistant' | 'tool'} role
 * @property {string} content
 * @property {string} [name]
 * @property {Date | string} [createdAt]
 */

/**
 * @typedef {object} ConversationContext
 * @property {string} [id]
 * @property {ConversationMessage[]} messages
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * @typedef {object} BusinessRuleContext
 * @property {string} id
 * @property {string} description
 * @property {boolean} [enabled]
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * @typedef {object} PartialAgentContext
 * @property {Record<string, unknown>} [metadata]
 * @property {ProjectContext} [project]
 * @property {AuditContext} [audit]
 * @property {WebsiteContext} [website]
 * @property {FindingContext[]} [findings]
 * @property {UserSettingsContext} [userSettings]
 * @property {ConversationContext} [conversation]
 * @property {BusinessRuleContext[]} [businessRules]
 */

/**
 * @typedef {Record<string, unknown> & PartialAgentContext} ContextMetadata
 */

/**
 * @typedef {object} RuntimeContextInput
 * @property {string} agentId
 * @property {string} input
 * @property {string} [conversationId]
 * @property {ContextMetadata} [metadata]
 */

/**
 * @typedef {object} ContextAssemblySourceStatus
 * @property {string} name
 * @property {'collected' | 'skipped' | 'failed'} status
 * @property {number} durationMs
 * @property {string} [reason]
 */

/**
 * @typedef {object} ContextAssemblyMetadata
 * @property {string} version
 * @property {Date} collectedAt
 * @property {ContextAssemblySourceStatus[]} sources
 */

/**
 * Structured context object assembled for an agent run.
 * @typedef {object} AgentContext
 * @property {string} requestId
 * @property {string} agentId
 * @property {string} input
 * @property {string} [conversationId]
 * @property {Date} createdAt
 * @property {Record<string, unknown>} metadata
 * @property {ProjectContext} project
 * @property {AuditContext} audit
 * @property {WebsiteContext} website
 * @property {FindingContext[]} findings
 * @property {UserSettingsContext} userSettings
 * @property {ConversationContext} conversation
 * @property {BusinessRuleContext[]} businessRules
 * @property {ContextAssemblyMetadata} assembly
 */

/**
 * @typedef {object} ContextCollectorResult
 * @property {PartialAgentContext} context
 * @property {string} [reason]
 */

/**
 * @typedef {object} ContextCollector
 * @property {string} name
 * @property {(input: RuntimeContextInput) => Promise<ContextCollectorResult>} collect
 */

/**
 * @typedef {object} ContextProjector
 * @property {(input: RuntimeContextInput, fragments: PartialAgentContext[], assembly: ContextAssemblyMetadata) => Promise<AgentContext>} project
 */

/**
 * @typedef {object} ContextProvider
 * @property {(input: RuntimeContextInput) => Promise<AgentContext>} create
 */

export {};
