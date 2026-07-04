import { NullLlmProvider } from './NullLlmProvider.js';
import { NvidiaNimProvider } from './NvidiaNimProvider.js';

/**
 * Factory for creating LLM providers based on configuration.
 * Follows Adapter Pattern — each provider is an adapter behind the LlmProvider interface.
 */
export class LlmProviderFactory {
  /**
   * @param {object} options
   * @param {import('../../domain/interfaces/logger.interface.js').Logger} options.logger
   */
  constructor(options) {
    this.logger = options.logger;
    /** @type {Map<string, (opts: Record<string, unknown>) => import('../../domain/interfaces/llm-provider.interface.js').LlmProvider>} */
    this.providers = new Map();

    this.register('null', () => new NullLlmProvider());
    this.register('nvidia-nim', (opts) => new NvidiaNimProvider(/** @type {any} */ (opts)));
  }

  /**
   * Register a provider factory function for a given name.
   * @param {string} name
   * @param {(opts: Record<string, unknown>) => import('../../domain/interfaces/llm-provider.interface.js').LlmProvider} factory
   */
  register(name, factory) {
    this.providers.set(name, factory);
  }

  /**
   * Create an LLM provider based on configuration.
   * @param {import('../../domain/interfaces/config.interface.js').RuntimeConfig} config
   * @returns {import('../../domain/interfaces/llm-provider.interface.js').LlmProvider}
   */
  create(config) {
    const providerName = config.llmProvider ?? 'null';
    const factory = this.providers.get(providerName);

    if (!factory) {
      this.logger.warn({ provider: providerName }, 'Unknown LLM provider, falling back to null');
      return new NullLlmProvider();
    }

    if (providerName === 'null') {
      return new NullLlmProvider();
    }

    this.logger.info({
      provider: providerName,
      model: config.llmModel,
      baseUrl: config.llmBaseUrl
    }, 'Creating LLM provider');

    return factory({
      logger: this.logger,
      apiKey: config.llmApiKey,
      baseUrl: config.llmBaseUrl,
      model: config.llmModel,
      timeout: config.llmTimeout,
      maxRetries: config.llmMaxRetries,
      rateLimitRpm: config.llmRateLimitRpm
    });
  }

  /**
   * List registered provider names.
   * @returns {string[]}
   */
  listProviders() {
    return Array.from(this.providers.keys());
  }
}
