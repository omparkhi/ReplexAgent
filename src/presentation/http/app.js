import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { createAgentController } from './controllers/agentController.js';
import { createHealthController } from './controllers/healthController.js';
import { createMemoryController } from './controllers/memoryController.js';
import { createToolController } from './controllers/toolController.js';
import { createErrorHandler } from './middleware/errorHandler.js';
import { createAgentRouter } from './routes/agentRoutes.js';
import { createHealthRouter } from './routes/healthRoutes.js';
import { createMemoryRouter } from './routes/memoryRoutes.js';
import { createToolRouter } from './routes/toolRoutes.js';

/**
 * @param {import('../../infrastructure/di/Container.js').Container} container
 */
export function createApp(container) {
  const app = express();
  const config = /** @type {import('../../domain/interfaces/config.interface.js').ConfigManager} */ (container.resolve('config'));
  const logger = /** @type {import('../../domain/interfaces/logger.interface.js').Logger} */ (container.resolve('logger'));
  const runtime = /** @type {import('../../application/AgentRuntime.js').AgentRuntime} */ (container.resolve('agentRuntime'));
  const memoryEngine = /** @type {import('../../application/memory/MemoryEngine.js').MemoryEngine} */ (container.resolve('memoryStore'));

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: config.get('requestBodyLimit') }));
  app.use(pinoHttp({ logger: /** @type {import('pino').Logger} */ (logger) }));

  app.use('/api', createHealthRouter(createHealthController(config)));
  app.use('/api', createAgentRouter(createAgentController(runtime)));
  app.use('/api', createToolRouter(createToolController(runtime)));
  app.use('/api', createMemoryRouter(createMemoryController(memoryEngine)));
  app.use(createErrorHandler(logger));

  return app;
}
