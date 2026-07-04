import { AgentRuntime } from '../../application/AgentRuntime.js';
import { ContextEngine } from '../../application/context/ContextEngine.js';
import { DefaultContextProjector } from '../../application/context/DefaultContextProjector.js';
import { MemoryEngine } from '../../application/memory/MemoryEngine.js';
import { ReasoningEngine } from '../../application/reasoning/ReasoningEngine.js';
import { ReasoningValidator } from '../../application/reasoning/ReasoningValidator.js';
import { registerDefaultModules } from '../../application/registerDefaults.js';
import { ConfigManager } from '../../config/configManager.js';
import { createDefaultContextCollectors } from '../context/collectors/createDefaultContextCollectors.js';
import { createLogger } from '../logger/createLogger.js';
import { InMemoryStore } from '../memory/InMemoryStore.js';
import { MongoConnection } from '../memory/MongoConnection.js';
import { MongoMemoryRepository } from '../memory/MongoMemoryRepository.js';
import { LlmProviderFactory } from '../providers/LlmProviderFactory.js';
import { DefaultPromptBuilder } from '../prompts/DefaultPromptBuilder.js';
import { TemplateLoader } from '../prompts/TemplateLoader.js';
import { TemplateRegistry } from '../prompts/TemplateRegistry.js';
import { NullRagProvider } from '../rag/NullRagProvider.js';
import { SemanticRagProvider } from '../rag/SemanticRagProvider.js';
import { EmbeddingProviderFactory } from '../rag/EmbeddingProviderFactory.js';
import { VectorStoreFactory } from '../rag/VectorStoreFactory.js';
import { AgentRegistry } from '../registries/AgentRegistry.js';
import { ToolRegistry } from '../registries/ToolRegistry.js';
import { Container } from './Container.js';

/**
 * @returns {Container}
 */
export function createContainer() {
  const container = new Container();

  container.registerSingleton('config', () => new ConfigManager());
  container.registerSingleton('logger', () => {
    const config = /** @type {import('../../domain/interfaces/config.interface.js').ConfigManager} */ (container.resolve('config'));
    return createLogger({
      level: config.get('logLevel'),
      nodeEnv: config.get('nodeEnv')
    });
  });

  container.registerSingleton('agentRegistry', () => new AgentRegistry());
  container.registerSingleton('toolRegistry', () => new ToolRegistry({
    logger: container.resolve('logger')
  }));
  container.registerSingleton('llmProviderFactory', () => new LlmProviderFactory({
    logger: container.resolve('logger')
  }));
  container.registerSingleton('llmProvider', () => {
    const factory = /** @type {import('../providers/LlmProviderFactory.js').LlmProviderFactory} */ (container.resolve('llmProviderFactory'));
    const config = /** @type {import('../../domain/interfaces/config.interface.js').ConfigManager} */ (container.resolve('config'));
    return factory.create(config.all());
  });
  container.registerSingleton('mongoConnection', () => {
    const config = /** @type {import('../../domain/interfaces/config.interface.js').ConfigManager} */ (container.resolve('config'));
    return new MongoConnection({
      uri: config.get('mongoUri'),
      databaseName: config.get('mongoDatabase'),
      logger: container.resolve('logger')
    });
  });
  container.registerSingleton('memoryRepository', () => {
    const config = /** @type {import('../../domain/interfaces/config.interface.js').ConfigManager} */ (container.resolve('config'));
    if (config.get('memoryProvider') === 'in-memory') {
      return new InMemoryStore();
    }

    return new MongoMemoryRepository({
      connection: container.resolve('mongoConnection'),
      collectionName: config.get('mongoMemoryCollection')
    });
  });
  container.registerSingleton('memoryStore', () => new MemoryEngine({
    repository: container.resolve('memoryRepository'),
    logger: container.resolve('logger')
  }));
  container.registerSingleton('contextCollectors', () => createDefaultContextCollectors());
  container.registerSingleton('contextProjector', () => new DefaultContextProjector());
  container.registerSingleton('contextProvider', () => new ContextEngine({
    collectors: container.resolve('contextCollectors'),
    projector: container.resolve('contextProjector'),
    logger: container.resolve('logger')
  }));
  container.registerSingleton('templateRegistry', () => {
    const logger = container.resolve('logger');
    const registry = new TemplateRegistry();
    const loader = new TemplateLoader({ logger });

    loader.loadAll().then((templates) => {
      for (const template of templates) {
        registry.register(template);
      }
    }).catch((error) => {
      logger.error({ error }, 'Failed to load prompt templates');
    });

    return registry;
  });
  container.registerSingleton('promptBuilder', () => {
    const registry = /** @type {import('../prompts/TemplateRegistry.js').TemplateRegistry} */ (container.resolve('templateRegistry'));
    return new DefaultPromptBuilder({
      templateRegistry: registry,
      logger: container.resolve('logger')
    });
  });
  container.registerSingleton('embeddingProviderFactory', () => new EmbeddingProviderFactory({
    logger: container.resolve('logger')
  }));
  container.registerSingleton('embeddingProvider', () => {
    const factory = /** @type {import('../rag/EmbeddingProviderFactory.js').EmbeddingProviderFactory} */ (container.resolve('embeddingProviderFactory'));
    const config = /** @type {import('../../domain/interfaces/config.interface.js').ConfigManager} */ (container.resolve('config'));
    return factory.create(config.all());
  });
  container.registerSingleton('vectorStoreFactory', () => new VectorStoreFactory({
    logger: container.resolve('logger')
  }));
  container.registerSingleton('vectorStore', () => {
    const factory = /** @type {import('../rag/VectorStoreFactory.js').VectorStoreFactory} */ (container.resolve('vectorStoreFactory'));
    const config = /** @type {import('../../domain/interfaces/config.interface.js').ConfigManager} */ (container.resolve('config'));
    return factory.create({
      ...config.all(),
      mongoConnection: container.resolve('mongoConnection')
    });
  });
  container.registerSingleton('ragProvider', () => {
    const config = /** @type {import('../../domain/interfaces/config.interface.js').ConfigManager} */ (container.resolve('config'));
    if (config.get('ragProvider') === 'null') {
      return new NullRagProvider();
    }
    return new SemanticRagProvider({
      embeddingProvider: container.resolve('embeddingProvider'),
      vectorStore: container.resolve('vectorStore'),
      logger: container.resolve('logger'),
      defaultTopK: config.get('ragDefaultTopK'),
      minScore: config.get('ragMinScore')
    });
  });
  container.registerSingleton('reasoningValidator', () => new ReasoningValidator());
  container.registerSingleton('reasoningEngine', () => new ReasoningEngine({
    llmProvider: container.resolve('llmProvider'),
    logger: container.resolve('logger'),
    validator: container.resolve('reasoningValidator'),
    defaultMaxSteps: 5,
    defaultConfidenceThreshold: 0.3
  }));
  container.registerSingleton('agentRuntime', () => new AgentRuntime({
    agentRegistry: container.resolve('agentRegistry'),
    toolRegistry: container.resolve('toolRegistry'),
    logger: container.resolve('logger')
  }));

  registerDefaultModules(container);

  return container;
}
