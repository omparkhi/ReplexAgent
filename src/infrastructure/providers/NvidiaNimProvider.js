import { BaseLlmProvider } from './BaseLlmProvider.js';

const DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'moonshotai/kimi-k2.6';

/**
 * NVIDIA NIM LLM provider adapter.
 * Supports Kimi K2 and other models available via NVIDIA NIM API.
 * Uses OpenAI-compatible chat completions endpoint.
 */
export class NvidiaNimProvider extends BaseLlmProvider {
  /**
   * @param {object} options
   * @param {import('../../domain/interfaces/logger.interface.js').Logger} options.logger
   * @param {string} options.apiKey
   * @param {string} [options.baseUrl]
   * @param {string} [options.model]
   * @param {number} [options.timeout]
   * @param {number} [options.maxRetries]
   * @param {number} [options.rateLimitRpm]
   */
  constructor(options) {
    super({
      id: 'nvidia-nim',
      logger: options.logger,
      apiKey: options.apiKey,
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
      model: options.model ?? DEFAULT_MODEL,
      timeout: options.timeout,
      maxRetries: options.maxRetries,
      rateLimitRpm: options.rateLimitRpm
    });
  }

  /**
   * Make the NVIDIA NIM API call.
   * @param {import('../../domain/interfaces/llm-provider.interface.js').LlmCompletionInput} input
   * @returns {Promise<import('../../domain/interfaces/llm-provider.interface.js').LlmCompletionResult>}
   */
  async callApi(input) {
    const options = this.buildDefaultOptions(input.options);
    const messages = input.messages.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.name ? { name: m.name } : {})
    }));

    const payload = {
      model: options.model,
      messages,
      max_tokens: options.max_tokens,
      temperature: options.temperature,
      top_p: options.top_p,
      stream: false,
      ...(options.response_format ? { response_format: options.response_format } : {}),
      ...(options.stop ? { stop: options.stop } : {})
    };

    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: input.signal
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      throw new Error(`NVIDIA NIM API error ${response.status}: ${errorBody}`);
    }

    const data = /** @type {Record<string, unknown>} */ (await response.json());

    const choice = /** @type {Record<string, unknown>} */ (
      Array.isArray(data.choices) ? data.choices[0] : null
    );
    const message = /** @type {Record<string, unknown>} */ (choice?.message ?? {});
    const content = typeof message.content === 'string' ? message.content : '';

    const usage = /** @type {Record<string, unknown> | undefined} */ (data.usage);
    const parsedUsage = usage ? {
      promptTokens: Number(usage.prompt_tokens ?? 0),
      completionTokens: Number(usage.completion_tokens ?? 0),
      totalTokens: Number(usage.total_tokens ?? 0)
    } : undefined;

    return {
      content,
      usage: parsedUsage,
      metadata: {
        provider: this.id,
        model: this.model,
        raw: {
          id: data.id,
          model: data.model,
          finishReason: choice?.finish_reason
        }
      }
    };
  }

  /**
   * Stream a completion via NVIDIA NIM SSE API.
   * @param {import('../../domain/interfaces/llm-provider.interface.js').LlmStreamInput} input
   * @returns {AsyncGenerator<import('../../domain/interfaces/llm-provider.interface.js').LlmStreamChunk>}
   */
  async *stream(input) {
    const options = this.buildDefaultOptions(input.options);
    const messages = input.messages.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.name ? { name: m.name } : {})
    }));

    const payload = {
      model: options.model,
      messages,
      max_tokens: options.max_tokens,
      temperature: options.temperature,
      top_p: options.top_p,
      stream: true,
      ...(options.response_format ? { response_format: options.response_format } : {}),
      ...(options.stop ? { stop: options.stop } : {})
    };

    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream'
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: input.signal
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      throw new Error(`NVIDIA NIM API error ${response.status}: ${errorBody}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            yield { delta: '', done: true };
            return;
          }

          try {
            const parsed = /** @type {Record<string, unknown>} */ (JSON.parse(data));
            const choices = /** @type {Record<string, unknown>[]} */ (parsed.choices ?? []);
            const choice = choices[0];
            const delta = /** @type {Record<string, unknown>} */ (choice?.delta ?? {});
            const content = typeof delta.content === 'string' ? delta.content : '';

            if (content) {
              yield { delta: content, done: false };
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
