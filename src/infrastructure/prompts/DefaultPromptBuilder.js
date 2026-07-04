/**
 * Resolves {{variable}} placeholders in a template string.
 * @param {string} template
 * @param {Record<string, unknown>} variables
 * @returns {string}
 */
function renderTemplate(template, variables) {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
    const parts = path.split('.');
    let value = /** @type {unknown} */ (variables);
    for (const part of parts) {
      if (value === null || value === undefined || typeof value !== 'object') {
        return match;
      }
      value = /** @type {Record<string, unknown>} */ (value)[part];
    }
    return value === undefined || value === null ? match : String(value);
  });
}

/**
 * Build a findings summary from the context findings array.
 * @param {import('../../domain/interfaces/context.interface.js').FindingContext[]} findings
 * @param {number} maxItems
 * @returns {string}
 */
function buildFindingsSummary(findings, maxItems) {
  if (!findings?.length) return 'No findings.';
  const items = findings.slice(0, maxItems);
  return items.map((f) => `- [${f.severity.toUpperCase()}] ${f.title}: ${f.description ?? 'No description'}`).join('\n');
}

/**
 * Build a business rules summary.
 * @param {import('../../domain/interfaces/context.interface.js').BusinessRuleContext[]} rules
 * @returns {string}
 */
function buildBusinessRulesSummary(rules) {
  if (!rules?.length) return 'No business rules.';
  return rules
    .filter((r) => r.enabled !== false)
    .map((r) => `- ${r.id}: ${r.description}`)
    .join('\n');
}

/**
 * Build a memory summary from memory data.
 * @param {Record<string, unknown>} memory
 * @param {number} maxItems
 * @returns {string}
 */
function buildMemorySummary(memory, maxItems) {
  if (!memory) return '';

  const records = /** @type {unknown} */ (memory.records ?? memory.memories);
  const recordArray = Array.isArray(records) ? records : [];
  if (!recordArray.length) return 'No relevant memories found.';

  return recordArray
    .slice(0, maxItems)
    .map((r) => {
      if (typeof r !== 'object' || r === null) return `- ${String(r)}`;
      const record = /** @type {Record<string, unknown>} */ (r);
      const type = record.type ?? 'unknown';
      const value = typeof record.value === 'object' ? JSON.stringify(record.value) : String(record.value ?? '');
      const preview = value.length > 200 ? value.slice(0, 200) + '...' : value;
      return `- [${type}] ${preview}`;
    })
    .join('\n');
}

/**
 * Build a RAG documents summary.
 * @param {Record<string, unknown>} rag
 * @param {number} maxItems
 * @returns {string}
 */
function buildRagSummary(rag, maxItems) {
  if (!rag) return '';

  const documents = /** @type {unknown} */ (rag.documents ?? rag.results);
  const docArray = Array.isArray(documents) ? documents : [];
  if (!docArray.length) return 'No documents retrieved.';

  return docArray
    .slice(0, maxItems)
    .map((doc, i) => {
      if (typeof doc !== 'object' || doc === null) return `### Document ${i + 1}\n${String(doc)}`;
      const d = /** @type {Record<string, unknown>} */ (doc);
      const title = d.title ?? d.name ?? `Document ${i + 1}`;
      const content = d.content ?? d.text ?? d.snippet ?? '';
      const preview = String(content).length > 300 ? String(content).slice(0, 300) + '...' : String(content);
      return `### ${title}\n${preview}`;
    })
    .join('\n\n');
}

/**
 * Build a conversation history summary.
 * @param {import('../../domain/interfaces/context.interface.js').ConversationContext} conversation
 * @param {number} maxMessages
 * @returns {string}
 */
function buildConversationSummary(conversation, maxMessages) {
  if (!conversation?.messages?.length) return '';

  const messages = conversation.messages.slice(-maxMessages);
  return messages.map((m) => `${m.role}: ${m.content}`).join('\n');
}

/**
 * Extracts a flat variables object from the AgentContext for template rendering.
 * @param {import('../../domain/interfaces/prompt-builder.interface.js').PromptBuildInput} input
 * @param {Record<string, unknown>} defaults
 * @returns {Record<string, unknown>}
 */
function extractVariables(input, defaults) {
  const ctx = input.context;
  const memory = input.memory ?? {};
  const rag = input.rag ?? {};
  const metadata = input.metadata ?? {};

  const maxFindings = /** @type {number} */ (defaults.maxFindings ?? 10);
  const maxConversation = /** @type {number} */ (defaults.maxConversationMessages ?? 20);
  const maxRag = /** @type {number} */ (defaults.maxRagDocuments ?? 5);
  const maxMemory = /** @type {number} */ (defaults.maxMemoryItems ?? 5);

  return {
    ...defaults,
    input: ctx.input,
    requestId: ctx.requestId,
    agentId: ctx.agentId,
    conversationId: ctx.conversationId,
    createdAt: ctx.createdAt?.toISOString?.() ?? String(ctx.createdAt),

    project: ctx.project,
    hasProject: Boolean(ctx.project?.name),

    website: ctx.website,
    hasWebsite: Boolean(ctx.website?.url),

    findings: ctx.findings,
    hasFindings: Boolean(ctx.findings?.length),
    findingsSummary: buildFindingsSummary(ctx.findings ?? [], maxFindings),
    findingsCount: ctx.findings?.length ?? 0,

    businessRules: ctx.businessRules,
    hasBusinessRules: Boolean(ctx.businessRules?.filter((r) => r.enabled !== false).length),
    businessRulesSummary: buildBusinessRulesSummary(ctx.businessRules ?? []),

    audit: ctx.audit,
    hasAudit: Boolean(ctx.audit?.sessionId),
    auditEventCount: ctx.audit?.events?.length ?? 0,

    userSettings: ctx.userSettings,
    hasUserSettings: Boolean(ctx.userSettings?.locale || ctx.userSettings?.timezone),

    conversation: ctx.conversation,
    hasConversation: Boolean(ctx.conversation?.messages?.length),
    conversationSummary: buildConversationSummary(ctx.conversation, maxConversation),
    conversationMessageCount: ctx.conversation?.messages?.length ?? 0,

    memory,
    hasMemory: Boolean(memory && (
      (Array.isArray(memory.records) && memory.records.length) ||
      (Array.isArray(memory.memories) && memory.memories.length)
    )),
    memorySummary: buildMemorySummary(memory, maxMemory),

    rag,
    hasRag: Boolean(rag && (
      (Array.isArray(rag.documents) && rag.documents.length) ||
      (Array.isArray(rag.results) && rag.results.length)
    )),
    ragSummary: buildRagSummary(rag, maxRag),

    metadata
  };
}

export class DefaultPromptBuilder {
  /**
   * @param {object} dependencies
   * @param {import('../../domain/interfaces/prompt-builder.interface.js').TemplateRegistry} dependencies.templateRegistry
   * @param {import('../../domain/interfaces/logger.interface.js').Logger} dependencies.logger
   */
  constructor(dependencies) {
    this.templateRegistry = dependencies.templateRegistry;
    this.logger = dependencies.logger;
  }

  /**
   * @param {import('../../domain/interfaces/prompt-builder.interface.js').PromptBuildInput} input
   * @returns {Promise<import('../../domain/interfaces/llm-provider.interface.js').LlmMessage[]>}
   */
  async build(input) {
    const agentId = input.context.agentId;
    const template = this.templateRegistry.get(agentId);

    if (!template) {
      this.logger?.warn({ agentId }, 'No template found, using fallback');
      return this.buildFallback(input);
    }

    const variables = extractVariables(input, template.defaults ?? {});

    const messages = template.sections
      .filter((section) => {
        if (!section.condition) return true;
        return Boolean(variables[section.condition]);
      })
      .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))
      .map((section) => ({
        role: section.role,
        content: renderTemplate(section.template, variables)
      }));

    return messages;
  }

  /**
   * Fallback when no template is registered.
   * @param {import('../../domain/interfaces/prompt-builder.interface.js').PromptBuildInput} input
   * @returns {Promise<import('../../domain/interfaces/llm-provider.interface.js').LlmMessage[]>}
   */
  async buildFallback(input) {
    return [
      { role: 'system', content: 'You are an AI assistant operating within a structured agent runtime.' },
      { role: 'user', content: input.context.input }
    ];
  }
}

