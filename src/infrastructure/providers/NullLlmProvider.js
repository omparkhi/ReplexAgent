export class NullLlmProvider {
  constructor() {
    this.id = 'null';
  }

  /**
   * @param {import('../../domain/interfaces/llm-provider.interface.js').LlmCompletionInput} input
   * @returns {Promise<import('../../domain/interfaces/llm-provider.interface.js').LlmCompletionResult>}
   */
  async complete(input) {
    const lastUserMessage = [...input.messages].reverse().find((message) => message.role === 'user');

    return {
      content: lastUserMessage?.content ?? '',
      metadata: {
        provider: this.id,
        placeholder: true
      }
    };
  }
}
