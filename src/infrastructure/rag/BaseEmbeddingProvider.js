/**
 * @typedef {import('../../domain/interfaces/embedding.interface.js').EmbeddingInput} EmbeddingInput
 * @typedef {import('../../domain/interfaces/embedding.interface.js').EmbeddingResult} EmbeddingResult
 * @typedef {import('../../domain/interfaces/embedding.interface.js').EmbeddingProviderConfig} EmbeddingProviderConfig
 */

export class BaseEmbeddingProvider {
  /** @type {string} */
  id;

  /** @type {string} */
  #apiKey;

  /** @type {string} */
  #baseUrl;

  /** @type {string} */
  #model;

  /** @type {number} */
  #dimensions;

  /** @type {number} */
  #timeout;

  /** @type {number} */
  #maxRetries;

  /** @type {number} */
  #batchSize;

  /** @type {import('../../domain/interfaces/logger.interface.js').Logger} */
  #logger;

  /** @type {number[]} */
  #requestTimestamps = [];

  /**
   * @param {object} options
   * @param {string} options.id - Provider identifier
   * @param {EmbeddingProviderConfig} options.config
   * @param {import('../../domain/interfaces/logger.interface.js').Logger} options.logger
   */
  constructor(options) {
    this.id = options.id;
    this.#apiKey = options.config.apiKey;
    this.#baseUrl = options.config.baseUrl ?? '';
    this.#model = options.config.model ?? '';
    this.#dimensions = options.config.dimensions ?? 1536;
    this.#timeout = options.config.timeout ?? 30000;
    this.#maxRetries = options.config.maxRetries ?? 3;
    this.#batchSize = options.config.batchSize ?? 20;
    this.#logger = options.logger;
  }

  /** @returns {string} */
  get apiKey() { return this.#apiKey; }

  /** @returns {string} */
  get baseUrl() { return this.#baseUrl; }

  /** @returns {string} */
  get model() { return this.#model; }

  /** @returns {number} */
  get dimensions() { return this.#dimensions; }

  /** @returns {number} */
  get timeout() { return this.#timeout; }

  /** @returns {number} */
  get maxRetries() { return this.#maxRetries; }

  /** @returns {number} */
  get batchSize() { return this.#batchSize; }

  /** @returns {import('../../domain/interfaces/logger.interface.js').Logger} */
  get logger() { return this.#logger; }

  /**
   * Generate embeddings for text(s).
   * @param {EmbeddingInput} input
   * @returns {Promise<EmbeddingResult>}
   */
  async embed(input) {
    const texts = Array.isArray(input.text) ? input.text : [input.text];
    const allEmbeddings = [];

    for (let i = 0; i < texts.length; i += this.#batchSize) {
      const batch = texts.slice(i, i + this.#batchSize);
      const batchResult = await this.#embedWithRetry(batch);
      allEmbeddings.push(...batchResult.embeddings);
    }

    return {
      embeddings: allEmbeddings,
      model: this.#model,
      dimensions: this.#dimensions
    };
  }

  /**
   * Get embedding dimensions.
   * @returns {number}
   */
  getDimensions() {
    return this.#dimensions;
  }

  /**
   * Call the embedding API (to be implemented by subclasses).
   * @param {string[]} texts
   * @param {AbortSignal} [signal]
   * @returns {Promise<{embeddings: number[][], usage?: number}>}
   */
  async callApi(texts, signal) {
    throw new Error('Subclasses must implement callApi()');
  }

  /**
   * Embed with retry logic.
   * @param {string[]} texts
   * @returns {Promise<{embeddings: number[][], usage?: number}>}
   */
  async #embedWithRetry(texts) {
    let lastError;

    for (let attempt = 1; attempt <= this.#maxRetries; attempt++) {
      try {
        await this.#rateLimit();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.#timeout);

        try {
          const result = await this.callApi(texts, controller.signal);
          clearTimeout(timeoutId);
          return result;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error) {
        lastError = error;
        const err = /** @type {Error} */ (error);

        if (!this.#isRetryable(err) || attempt === this.#maxRetries) {
          throw err;
        }

        const delay = this.#calculateRetryDelay(attempt);
        this.#logger.warn({ attempt, delay, error: err.message }, 'Embedding request failed, retrying');
        await new Promise(r => setTimeout(r, delay));
      }
    }

    throw lastError;
  }

  /**
   * Rate limiting via sliding window.
   */
  async #rateLimit() {
    const now = Date.now();
    this.#requestTimestamps = this.#requestTimestamps.filter(t => now - t < 60000);

    if (this.#requestTimestamps.length >= 60) {
      const oldest = this.#requestTimestamps[0];
      const waitTime = 60000 - (now - oldest) + 100;
      await new Promise(r => setTimeout(r, waitTime));
    }

    this.#requestTimestamps.push(Date.now());
  }

  /**
   * Check if error is retryable.
   * @param {Error} error
   * @returns {boolean}
   */
  #isRetryable(error) {
    const msg = error.message.toLowerCase();
    return msg.includes('timeout') ||
      msg.includes('rate limit') ||
      msg.includes('429') ||
      msg.includes('503') ||
      msg.includes('econnreset');
  }

  /**
   * Calculate exponential backoff delay.
   * @param {number} attempt
   * @returns {number}
   */
  #calculateRetryDelay(attempt) {
    return Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  }
}
