/**
 * Stores and retrieves prompt templates by agent ID.
 * Supports registration, override, and lookup.
 */
export class TemplateRegistry {
  constructor() {
    /** @type {Map<string, import('../../domain/interfaces/prompt-builder.interface.js').PromptTemplate>} */
    this.templates = new Map();
  }

  /**
   * @param {import('../../domain/interfaces/prompt-builder.interface.js').PromptTemplate} template
   */
  register(template) {
    if (!template.agentId) {
      throw new Error('Template must have an agentId');
    }
    if (!template.sections?.length) {
      throw new Error(`Template for agent "${template.agentId}" must have at least one section`);
    }
    this.templates.set(template.agentId, template);
  }

  /**
   * @param {string} agentId
   * @returns {import('../../domain/interfaces/prompt-builder.interface.js').PromptTemplate | undefined}
   */
  get(agentId) {
    return this.templates.get(agentId);
  }

  /**
   * Override an existing template or register a new one.
   * @param {string} agentId
   * @param {import('../../domain/interfaces/prompt-builder.interface.js').PromptTemplate} template
   */
  override(agentId, template) {
    this.templates.set(agentId, { ...template, agentId });
  }

  /**
   * @param {string} agentId
   * @returns {boolean}
   */
  has(agentId) {
    return this.templates.has(agentId);
  }

  /**
   * @returns {string[]} All registered agent IDs
   */
  listAgentIds() {
    return Array.from(this.templates.keys());
  }
}
