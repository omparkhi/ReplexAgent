/**
 * Base LLM provider with retry, timeout, logging, and rate limiting.
 * Subclasses implement the provider-specific API call.
 */
export class BaseLlmProvider {
  /**
   * @param {object} options
   * @param {string} options.id - Provider identifier
   * @param {import('../../domain/interfaces/logger.interface.js').Logger} options.logger
   * @param {string} options.apiKey
   * @param {string} [options.baseUrl]
   * @param {string} [options.model]
   * @param {number} [options.timeout]
   * @param {number} [options.maxRetries]
   * @param {number} [options.rateLimitRpm]
   */
  constructor(options) {
    this.id = options.id;
    this.logger = options.logger;
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl;
    this.model = options.model;
    this.timeout = options.timeout ?? 60000;
    this.maxRetries = options.maxRetries ?? 3;
    this.rateLimitRpm = options.rateLimitRpm;

    /** @type {number[]} */
    this.requestTimestamps = [];
  }

  /**
   * Generate a completion.
   * @param {import('../../domain/interfaces/llm-provider.interface.js').LlmCompletionInput} input
   * @returns {Promise<import('../../domain/interfaces/llm-provider.interface.js').LlmCompletionResult>}
   */
  async complete(input) {
    await this.checkRateLimit();
    const startTime = Date.now();

    let lastError = /** @type {Error | undefined} */ (undefined);
    const attempts = this.maxRetries + 1;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const result = /** @type {import('../../domain/interfaces/llm-provider.interface.js').LlmCompletionResult} */ (
          await this.executeWithTimeout(
            () => this.callApi(input),
            this.timeout
          )
        );

        this.recordRequest();
        const durationMs = Date.now() - startTime;

        this.logger.info({
          provider: this.id,
          model: this.model,
          durationMs,
          attempt,
          tokens: result.usage
        }, 'LLM completion succeeded');

        return {
          content: result.content,
          usage: result.usage,
          metadata: {
            ...result.metadata,
            provider: this.id,
            model: this.model,
            durationMs
          }
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        this.logger.warn({
          provider: this.id,
          attempt,
          error: lastError.message,
          retryable: this.isRetryableError(lastError)
        }, 'LLM completion failed');

        if (attempt < attempts && this.isRetryableError(lastError)) {
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay, input.signal);
        }
      }
    }

    const durationMs = Date.now() - startTime;
    throw new Error(`LLM provider "${this.id}" failed after ${attempts} attempts: ${lastError?.message}`);
  }

  /**
   * Subclasses implement this to make the actual API call.
   * @param {import('../../domain/interfaces/llm-provider.interface.js').LlmCompletionInput} input
   * @returns {Promise<import('../../domain/interfaces/llm-provider.interface.js').LlmCompletionResult>}
   */
  async callApi(input) {
    throw new Error('Subclasses must implement callApi()');
  }

  /**
   * Execute a function with an AbortSignal-based timeout.
   * @param {() => Promise<unknown>} fn
   * @param {number} timeoutMs
   * @returns {Promise<unknown>}
   */
  executeWithTimeout(fn, timeoutMs) {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        controller.abort();
        reject(new Error(`Request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      Promise.resolve(fn())
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Check if an error is retryable.
   * @param {Error} error
   * @returns {boolean}
   */
  isRetryableError(error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('503') ||
      message.includes('502') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('network')
    );
  }

  /**
   * Calculate retry delay with exponential backoff.
   * @param {number} attempt
   * @returns {number}
   */
  calculateRetryDelay(attempt) {
    const baseDelay = 1000;
    const maxDelay = 30000;
    const delay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = delay * 0.1 * Math.random();
    return Math.min(delay + jitter, maxDelay);
  }

  /**
   * Check rate limit before making a request.
   */
  async checkRateLimit() {
    if (!this.rateLimitRpm) return;

    const now = Date.now();
    const windowMs = 60000;

    this.requestTimestamps = this.requestTimestamps.filter((t) => now - t < windowMs);

    if (this.requestTimestamps.length >= this.rateLimitRpm) {
      const oldestInWindow = this.requestTimestamps[0];
      const waitMs = windowMs - (now - oldestInWindow) + 100;

      this.logger.warn({
        provider: this.id,
        rateLimitRpm: this.rateLimitRpm,
        waitMs
      }, 'Rate limit reached, waiting');

      await this.sleep(waitMs);
    }
  }

  /**
   * Record a request timestamp for rate limiting.
   */
  recordRequest() {
    if (this.rateLimitRpm) {
      this.requestTimestamps.push(Date.now());
    }
  }

  /**
   * Sleep with abort support.
   * @param {number} ms
   * @param {AbortSignal} [signal]
   * @returns {Promise<void>}
   */
  sleep(ms, signal) {
    if (ms <= 0) return Promise.resolve();

    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }

      const timer = setTimeout(() => resolve(undefined), ms);

      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
      }
    });
  }

  /**
   * Build default options from provider config.
   * @param {import('../../domain/interfaces/llm-provider.interface.js').LlmCompletionOptions} [overrides]
   * @returns {Record<string, unknown>}
   */
  buildDefaultOptions(overrides) {
    return {
      model: this.model,
      max_tokens: overrides?.maxTokens ?? 4096,
      temperature: overrides?.temperature ?? 0.7,
      top_p: overrides?.topP ?? 1.0,
      ...(overrides?.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      ...(overrides?.stop ? { stop: overrides.stop } : {}),
      ...overrides?.providerOptions
    };
  }
}
