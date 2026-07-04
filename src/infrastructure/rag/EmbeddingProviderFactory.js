import { OpenAiEmbeddingProvider } from './OpenAiEmbeddingProvider.js';
import { NvidiaNimEmbeddingProvider } from './NvidiaNimEmbeddingProvider.js';

/**
 * Factory for creating embedding providers (Adapter Pattern).
 */
export class EmbeddingProviderFactory {
  /** @type {Map<string, (config: any, logger: any) => import('../../domain/interfaces/embedding.interface.js').EmbeddingProvider>} */
  #providers = new Map();

  /** @type {import('../../domain/interfaces/logger.interface.js').Logger} */
  #logger;

  /**
   * @param {object} options
   * @param {import('../../domain/interfaces/logger.interface.js').Logger} options.logger
   */
  constructor(options) {
    this.#logger = options.logger;
    this.#registerDefaults();
  }

  #registerDefaults() {
    this.#providers.set('openai', (config, logger) => {
      return new OpenAiEmbeddingProvider({ config, logger });
    });

    this.#providers.set('nvidia-nim', (config, logger) => {
      return new NvidiaNimEmbeddingProvider({ config, logger });
    });
  }

  /**
   * Register a custom embedding provider.
   * @param {string} name
   * @param {(config: any, logger: any) => import('../../domain/interfaces/embedding.interface.js').EmbeddingProvider} factory
   */
  register(name, factory) {
    this.#providers.set(name, factory);
  }

  /**
   * Create an embedding provider from config.
   * @param {object} config
   * @param {string} config.embeddingProvider
   * @param {string} [config.embeddingApiKey]
   * @param {string} [config.embeddingBaseUrl]
   * @param {string} [config.embeddingModel]
   * @param {number} [config.embeddingDimensions]
   * @returns {import('../../domain/interfaces/embedding.interface.js').EmbeddingProvider}
   */
  create(config) {
    const providerName = config.embeddingProvider ?? 'null';
    const factory = this.#providers.get(providerName);

    if (!factory) {
      this.#logger.warn({ provider: providerName }, 'Unknown embedding provider, falling back to null');
      return this.#createNull();
    }

    return factory({
      apiKey: config.embeddingApiKey ?? '',
      baseUrl: config.embeddingBaseUrl,
      model: config.embeddingModel,
      dimensions: config.embeddingDimensions,
      timeout: 30000,
      maxRetries: 3,
      batchSize: 20
    }, this.#logger);
  }

  /**
   * List registered providers.
   * @returns {string[]}
   */
  listProviders() {
    return [...this.#providers.keys()];
  }

  /**
   * Create a null embedding provider.
   * @returns {import('../../domain/interfaces/embedding.interface.js').EmbeddingProvider}
   */
  #createNull() {
    return {
      id: 'null',
      async embed(input) {
        const texts = Array.isArray(input.text) ? input.text : [input.text];
        return {
          embeddings: texts.map(() => []),
          model: 'null',
          dimensions: 0
        };
      },
      getDimensions() {
        return 0;
      }
    };
  }
}
