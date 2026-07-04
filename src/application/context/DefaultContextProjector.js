import { randomUUID } from 'node:crypto';
import { mergeRecord } from './contextGuards.js';

export class DefaultContextProjector {
  /**
   * @param {import('../../domain/interfaces/context.interface.js').RuntimeContextInput} input
   * @param {import('../../domain/interfaces/context.interface.js').PartialAgentContext[]} fragments
   * @param {import('../../domain/interfaces/context.interface.js').ContextAssemblyMetadata} assembly
   * @returns {Promise<import('../../domain/interfaces/context.interface.js').AgentContext>}
   */
  async project(input, fragments, assembly) {
    /** @type {import('../../domain/interfaces/context.interface.js').AgentContext} */
    const context = {
      requestId: randomUUID(),
      agentId: input.agentId,
      input: input.input,
      conversationId: input.conversationId,
      createdAt: new Date(),
      metadata: {},
      project: {},
      audit: { events: [] },
      website: {},
      findings: [],
      userSettings: { preferences: {} },
      conversation: { id: input.conversationId, messages: [] },
      businessRules: [],
      assembly
    };

    for (const fragment of fragments) {
      context.metadata = mergeRecord(context.metadata, fragment.metadata);
      context.project = { ...context.project, ...fragment.project };
      context.audit = {
        ...context.audit,
        ...fragment.audit,
        events: [...context.audit.events, ...(fragment.audit?.events ?? [])]
      };
      context.website = { ...context.website, ...fragment.website };
      context.findings = [...context.findings, ...(fragment.findings ?? [])];
      context.userSettings = {
        ...context.userSettings,
        ...fragment.userSettings,
        preferences: {
          ...context.userSettings.preferences,
          ...(fragment.userSettings?.preferences ?? {})
        }
      };
      context.conversation = {
        ...context.conversation,
        ...fragment.conversation,
        messages: [...context.conversation.messages, ...(fragment.conversation?.messages ?? [])]
      };
      context.businessRules = [...context.businessRules, ...(fragment.businessRules ?? [])];
    }

    return context;
  }
}
