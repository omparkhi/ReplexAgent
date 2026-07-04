import { BaseEmbeddingProvider } from './BaseEmbeddingProvider.js';

/**
 * NVIDIA NIM embedding provider.
 */
export class NvidiaNimEmbeddingProvider extends BaseEmbeddingProvider {
  /**
   * @param {object} options
   * @param {import('../../domain/interfaces/embedding.interface.js').EmbeddingProviderConfig} options.config
   * @param {import('../../domain/interfaces/logger.interface.js').Logger} options.logger
   */
  constructor(options) {
    super({
      id: 'nvidia-nim',
      config: {
        apiKey: options.config.apiKey,
        baseUrl: options.config.baseUrl ?? 'https://integrate.api.nvidia.com/v1',
        model: options.config.model ?? 'nvidia/nv-embedqa-e5-v5',
        dimensions: options.config.dimensions ?? 1024,
        timeout: options.config.timeout ?? 30000,
        maxRetries: options.config.maxRetries ?? 3,
        batchSize: options.config.batchSize ?? 20
      },
      logger: options.logger
    });
  }

  /**
   * @param {string[]} texts
   * @param {AbortSignal} [signal]
   * @returns {Promise<{embeddings: number[][], usage?: number}>}
   */
  async callApi(texts, signal) {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
        input_type: 'query',
        encoding_format: 'float'
      }),
      signal
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`NVIDIA NIM embedding failed (${response.status}): ${errorBody}`);
    }

    /** @type {any} */
    const data = await response.json();

    const embeddings = data.data
      .sort((/** @type {any} */ a, /** @type {any} */ b) => a.index - b.index)
      .map((/** @type {any} */ item) => item.embedding);

    return {
      embeddings,
      usage: data.usage?.total_tokens
    };
  }
}
