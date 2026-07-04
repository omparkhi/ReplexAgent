import { asArray, asOptionalString, asRecord } from '../../../application/context/contextGuards.js';

const roles = new Set(['system', 'user', 'assistant', 'tool']);

export class ConversationContextCollector {
  constructor() {
    this.name = 'conversation';
  }

  /**
   * @param {import('../../../domain/interfaces/context.interface.js').RuntimeContextInput} input
   * @returns {Promise<import('../../../domain/interfaces/context.interface.js').ContextCollectorResult>}
   */
  async collect(input) {
    const source = asRecord(input.metadata?.conversation);
    const messages = asArray(source.messages)
      .filter(asRecord)
      .filter((message) => typeof message.content === 'string')
      .map((message) => ({
        role: typeof message.role === 'string' && roles.has(message.role) ? message.role : 'user',
        content: String(message.content),
        name: asOptionalString(message.name),
        createdAt: typeof message.createdAt === 'string' || message.createdAt instanceof Date ? message.createdAt : undefined
      }));

    /** @type {import('../../../domain/interfaces/context.interface.js').ConversationContext} */
    const conversation = {
      id: asOptionalString(source.id) ?? input.conversationId,
      messages,
      metadata: asRecord(source.metadata)
    };

    return Object.keys(source).length > 0 || Boolean(input.conversationId)
      ? { context: { conversation } }
      : { context: {}, reason: 'No conversation context provided' };
  }
}
