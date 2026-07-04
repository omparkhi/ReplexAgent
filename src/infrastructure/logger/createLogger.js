import pino from 'pino';

/**
 * @param {{ level: string, nodeEnv: string }} options
 * @returns {import('../../domain/interfaces/logger.interface.js').Logger}
 */
export function createLogger(options) {
  return pino({
    level: options.level,
    base: undefined,
    redact: ['req.headers.authorization']
  });
}
