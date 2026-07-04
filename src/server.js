import { createContainer } from './infrastructure/di/createContainer.js';
import { createApp } from './presentation/http/app.js';

const container = createContainer();
const config = /** @type {import('./domain/interfaces/config.interface.js').ConfigManager} */ (container.resolve('config'));
const logger = /** @type {import('./domain/interfaces/logger.interface.js').Logger} */ (container.resolve('logger'));

const app = createApp(container);
const server = app.listen(config.get('port'), () => {
  logger.info({ port: config.get('port') }, 'Agent runtime listening');
});

/**
 * @param {NodeJS.Signals} signal
 */
const shutdown = async (signal) => {
  logger.info({ signal }, 'Shutting down agent runtime');

  try {
    server.close(() => {
      logger.info('HTTP server closed');
    });

    try {
      const mongoConnection = /** @type {import('./infrastructure/memory/MongoConnection.js').MongoConnection} */ (container.resolve('mongoConnection'));
      await mongoConnection.close();
      logger.info('MongoDB connection closed');
    } catch {
      // mongoConnection not registered (in-memory mode), skip
    }

    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Shutdown failed');
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
