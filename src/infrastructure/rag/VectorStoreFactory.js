import { MongoAtlasVectorStore } from './MongoAtlasVectorStore.js';
import { NullVectorStore } from './NullVectorStore.js';

/**
 * Factory for creating vector store providers (Adapter Pattern).
 */
export class VectorStoreFactory {
  /** @type {Map<string, (options: any) => import('../../domain/interfaces/rag.interface.js').VectorStore>} */
  #stores = new Map();

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
    this.#stores.set('mongo-atlas', (options) => {
      return new MongoAtlasVectorStore(options);
    });

    this.#stores.set('null', () => {
      return new NullVectorStore();
    });
  }

  /**
   * Register a custom vector store.
   * @param {string} name
   * @param {(options: any) => import('../../domain/interfaces/rag.interface.js').VectorStore} factory
   */
  register(name, factory) {
    this.#stores.set(name, factory);
  }

  /**
   * Create a vector store from config.
   * @param {object} config
   * @param {string} config.vectorStoreProvider
   * @param {import('../memory/MongoConnection.js').MongoConnection} [config.mongoConnection]
   * @param {string} [config.ragCollectionName]
   * @returns {import('../../domain/interfaces/rag.interface.js').VectorStore}
   */
  create(config) {
    const providerName = config.vectorStoreProvider ?? 'null';
    const factory = this.#stores.get(providerName);

    if (!factory) {
      this.#logger.warn({ provider: providerName }, 'Unknown vector store provider, falling back to null');
      return new NullVectorStore();
    }

    return factory({
      connection: config.mongoConnection,
      collectionName: config.ragCollectionName ?? 'rag_vectors',
      logger: this.#logger
    });
  }

  /**
   * List registered providers.
   * @returns {string[]}
   */
  listProviders() {
    return [...this.#stores.keys()];
  }
}
