import { ToolTimeoutError } from '../../domain/errors/ToolTimeoutError.js';

/**
 * Executes tools with timeout, retry, and result normalization.
 */
export class ToolExecutor {
  /**
   * @param {object} options
   * @param {import('../../domain/interfaces/logger.interface.js').Logger} options.logger
   * @param {number} [options.defaultTimeout]
   * @param {number} [options.defaultMaxAttempts]
   */
  constructor(options) {
    this.logger = options.logger;
    this.defaultTimeout = options.defaultTimeout ?? 30000;
    this.defaultMaxAttempts = options.defaultMaxAttempts ?? 0;
  }

  /**
   * Execute a tool with timeout, retry, and result normalization.
   * @param {import('../../domain/interfaces/tool.interface.js').Tool} tool
   * @param {import('../../domain/interfaces/tool.interface.js').ToolExecutionInput} input
   * @returns {Promise<import('../../domain/interfaces/tool.interface.js').ToolExecutionResult>}
   */
  async execute(tool, input) {
    const timeout = tool.definition.metadata?.timeout ?? this.defaultTimeout;
    const retryConfig = tool.definition.metadata?.retry;
    const maxAttempts = (retryConfig?.maxAttempts ?? this.defaultMaxAttempts) + 1;

    let lastError = /** @type {Error | undefined} */ (undefined);
    const startTime = Date.now();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const data = await this.executeWithTimeout(tool, input, timeout);
        const durationMs = Date.now() - startTime;

        this.logger.info(
          { tool: tool.definition.name, attempt, durationMs },
          'Tool execution succeeded'
        );

        return {
          data,
          metadata: {
            success: true,
            durationMs,
            attempt
          }
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof ToolTimeoutError) {
          this.logger.warn(
            { tool: tool.definition.name, attempt, timeout },
            'Tool execution timed out'
          );
        } else {
          this.logger.warn(
            { tool: tool.definition.name, attempt, error: lastError.message },
            'Tool execution failed'
          );
        }

        if (attempt < maxAttempts) {
          const delay = this.calculateDelay(retryConfig, attempt);
          await this.sleep(delay, input.signal);
        }
      }
    }

    const durationMs = Date.now() - startTime;
    return {
      data: null,
      metadata: {
        success: false,
        durationMs,
        attempt: maxAttempts,
        error: lastError?.message ?? 'Unknown error'
      }
    };
  }

  /**
   * Execute a tool with an AbortSignal-based timeout.
   * @param {import('../../domain/interfaces/tool.interface.js').Tool} tool
   * @param {import('../../domain/interfaces/tool.interface.js').ToolExecutionInput} input
   * @param {number} timeoutMs
   * @returns {Promise<unknown>}
   */
  executeWithTimeout(tool, input, timeoutMs) {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        controller.abort();
        reject(new ToolTimeoutError(tool.definition.name, timeoutMs));
      }, timeoutMs);

      // Chain with caller's signal if provided
      if (input.signal) {
        if (input.signal.aborted) {
          clearTimeout(timer);
          controller.abort();
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }
        input.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          controller.abort();
          reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
      }

      tool.execute({ ...input, signal: controller.signal })
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
   * Calculate delay for retry attempt.
   * @param {import('../../domain/interfaces/tool.interface.js').ToolRetryConfig} [config]
   * @param {number} [attempt]
   * @returns {number}
   */
  calculateDelay(config, attempt = 1) {
    if (!config) return 0;

    const baseDelay = config.delayMs ?? 1000;
    const maxDelay = config.maxDelayMs ?? 10000;
    const useExponential = config.exponentialBackoff !== false;

    if (!useExponential) return Math.min(baseDelay, maxDelay);

    const delay = baseDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, maxDelay);
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
}
