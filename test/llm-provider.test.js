import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NullLlmProvider } from '../src/infrastructure/providers/NullLlmProvider.js';
import { BaseLlmProvider } from '../src/infrastructure/providers/BaseLlmProvider.js';
import { LlmProviderFactory } from '../src/infrastructure/providers/LlmProviderFactory.js';

const logger = {
  info() {},
  warn() {},
  error() {},
  debug() {}
};

describe('NullLlmProvider', () => {
  it('echoes back the last user message', async () => {
    const provider = new NullLlmProvider();
    const result = await provider.complete({
      messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hello' }
      ]
    });

    assert.equal(result.content, 'Hello');
    assert.equal(result.metadata.provider, 'null');
    assert.equal(result.metadata.placeholder, true);
  });

  it('returns empty string when no user message', async () => {
    const provider = new NullLlmProvider();
    const result = await provider.complete({
      messages: [{ role: 'system', content: 'System only' }]
    });

    assert.equal(result.content, '');
  });

  it('has id property', () => {
    const provider = new NullLlmProvider();
    assert.equal(provider.id, 'null');
  });
});

describe('BaseLlmProvider', () => {
  class TestProvider extends BaseLlmProvider {
    /** @param {any} options */
    constructor(options) {
      super({ id: 'test', ...options });
      this.callCount = 0;
    }

    /** @param {any} input */
    async callApi(input) {
      this.callCount++;
      return {
        content: `Response to: ${input.messages.at(-1)?.content}`,
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        metadata: { provider: 'test' }
      };
    }
  }

  class FailingProvider extends BaseLlmProvider {
    /** @param {any} options */
    constructor(options, failCount = 2) {
      super({ id: 'failing', ...options });
      this.failCount = failCount;
      this.attempts = 0;
    }

    async callApi() {
      this.attempts++;
      if (this.attempts <= this.failCount) {
        throw new Error('Temporary failure');
      }
      return {
        content: 'Success after retries',
        metadata: { provider: 'failing' }
      };
    }
  }

  class TimeoutProvider extends BaseLlmProvider {
    /** @param {any} options */
    constructor(options) {
      super({ id: 'timeout', ...options });
    }

    async callApi() {
      return new Promise((resolve) => setTimeout(() => resolve({
        content: 'late',
        metadata: { provider: 'timeout' }
      }), 5000));
    }
  }

  it('executes callApi and returns result with metadata', async () => {
    const provider = new TestProvider({ logger, apiKey: 'test-key' });
    const result = await provider.complete({
      messages: [{ role: 'user', content: 'test' }]
    });

    assert.equal(result.content, 'Response to: test');
    assert.equal(result.metadata.provider, 'test');
    assert.equal(result.metadata.model, undefined);
    assert.ok(result.metadata.durationMs !== undefined && result.metadata.durationMs >= 0);
    assert.equal(result.usage?.totalTokens, 15);
  });

  it('retries on failure', async () => {
    const provider = new FailingProvider({ logger, apiKey: 'test-key', maxRetries: 2 }, 2);
    const result = await provider.complete({
      messages: [{ role: 'user', content: 'test' }]
    });

    assert.equal(result.content, 'Success after retries');
    assert.equal(provider.attempts, 3);
  });

  it('throws after all retries exhausted', async () => {
    const provider = new FailingProvider({ logger, apiKey: 'test-key', maxRetries: 1 }, 5);

    await assert.rejects(
      () => provider.complete({ messages: [{ role: 'user', content: 'test' }] }),
      /failed after 2 attempts/
    );
  });

  it('times out when request exceeds timeout', async () => {
    const provider = new TimeoutProvider({ logger, apiKey: 'test-key', timeout: 50 });

    await assert.rejects(
      () => provider.complete({ messages: [{ role: 'user', content: 'test' }] }),
      /timed out/
    );
  });

  it('identifies retryable errors', () => {
    const provider = new TestProvider({ logger, apiKey: 'test-key' });

    assert.equal(provider.isRetryableError(new Error('timeout exceeded')), true);
    assert.equal(provider.isRetryableError(new Error('rate limit exceeded')), true);
    assert.equal(provider.isRetryableError(new Error('HTTP 429')), true);
    assert.equal(provider.isRetryableError(new Error('HTTP 503')), true);
    assert.equal(provider.isRetryableError(new Error('ECONNRESET')), true);
    assert.equal(provider.isRetryableError(new Error('invalid request')), false);
  });

  it('calculates exponential backoff delay', () => {
    const provider = new TestProvider({ logger, apiKey: 'test-key' });

    const delay1 = provider.calculateRetryDelay(1);
    const delay2 = provider.calculateRetryDelay(2);
    const delay3 = provider.calculateRetryDelay(3);

    assert.ok(delay1 >= 900 && delay1 <= 1100);
    assert.ok(delay2 >= 1800 && delay2 <= 2200);
    assert.ok(delay3 >= 3600 && delay3 <= 4400);
  });

  it('builds default options', () => {
    const provider = new TestProvider({ logger, apiKey: 'test-key', model: 'test-model' });

    const opts = provider.buildDefaultOptions({ maxTokens: 100, temperature: 0.5 });
    assert.equal(opts.model, 'test-model');
    assert.equal(opts.max_tokens, 100);
    assert.equal(opts.temperature, 0.5);
  });

  it('includes response_format for jsonMode', () => {
    const provider = new TestProvider({ logger, apiKey: 'test-key' });
    const opts = provider.buildDefaultOptions({ jsonMode: true });
    assert.deepEqual(opts.response_format, { type: 'json_object' });
  });
});

describe('LlmProviderFactory', () => {
  it('creates null provider by default', () => {
    const factory = new LlmProviderFactory({ logger });
    const provider = factory.create({
      nodeEnv: 'test',
      port: 3000,
      logLevel: 'info',
      requestBodyLimit: '1mb',
      memoryProvider: 'in-memory',
      mongoUri: '',
      mongoDatabase: '',
      mongoMemoryCollection: '',
      llmProvider: 'null',
      llmApiKey: '',
      llmModel: '',
      llmMaxTokens: 4096,
      llmTemperature: 0.7,
      llmTimeout: 60000,
      llmMaxRetries: 3,
      ragProvider: 'null',
      embeddingProvider: 'null',
      embeddingApiKey: '',
      embeddingDimensions: 1536,
      vectorStoreProvider: 'null',
      ragCollectionName: 'rag_vectors',
      ragDefaultTopK: 5,
      ragMinScore: 0.3
    });

    assert.equal(provider.id, 'null');
  });

  it('creates nvidia-nim provider when configured', () => {
    const factory = new LlmProviderFactory({ logger });
    const provider = factory.create({
      nodeEnv: 'test',
      port: 3000,
      logLevel: 'info',
      requestBodyLimit: '1mb',
      memoryProvider: 'in-memory',
      mongoUri: '',
      mongoDatabase: '',
      mongoMemoryCollection: '',
      llmProvider: 'nvidia-nim',
      llmApiKey: 'test-key',
      llmModel: 'moonshotai/kimi-k2.6',
      llmBaseUrl: 'https://integrate.api.nvidia.com/v1',
      llmMaxTokens: 4096,
      llmTemperature: 0.7,
      llmTimeout: 60000,
      llmMaxRetries: 3,
      ragProvider: 'null',
      embeddingProvider: 'null',
      embeddingApiKey: '',
      embeddingDimensions: 1536,
      vectorStoreProvider: 'null',
      ragCollectionName: 'rag_vectors',
      ragDefaultTopK: 5,
      ragMinScore: 0.3
    });

    assert.equal(provider.id, 'nvidia-nim');
  });

  it('falls back to null for unknown provider', () => {
    const factory = new LlmProviderFactory({ logger });
    const provider = factory.create({
      nodeEnv: 'test',
      port: 3000,
      logLevel: 'info',
      requestBodyLimit: '1mb',
      memoryProvider: 'in-memory',
      mongoUri: '',
      mongoDatabase: '',
      mongoMemoryCollection: '',
      llmProvider: 'unknown-provider',
      llmApiKey: '',
      llmModel: '',
      llmMaxTokens: 4096,
      llmTemperature: 0.7,
      llmTimeout: 60000,
      llmMaxRetries: 3,
      ragProvider: 'null',
      embeddingProvider: 'null',
      embeddingApiKey: '',
      embeddingDimensions: 1536,
      vectorStoreProvider: 'null',
      ragCollectionName: 'rag_vectors',
      ragDefaultTopK: 5,
      ragMinScore: 0.3
    });

    assert.equal(provider.id, 'null');
  });

  it('lists registered providers', () => {
    const factory = new LlmProviderFactory({ logger });
    const providers = factory.listProviders();
    assert.ok(providers.includes('null'));
    assert.ok(providers.includes('nvidia-nim'));
  });

  it('allows custom provider registration', () => {
    const factory = new LlmProviderFactory({ logger });
    factory.register('custom', () => ({ id: 'custom', complete: async () => ({ content: '', metadata: { provider: 'custom' } }) }));

    const providers = factory.listProviders();
    assert.ok(providers.includes('custom'));
  });
});
