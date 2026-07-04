/**
 * MongoDB Atlas Vector Search implementation.
 */
export class MongoAtlasVectorStore {
  /** @type {import('../memory/MongoConnection.js').MongoConnection} */
  #connection;

  /** @type {string} */
  #collectionName;

  /** @type {import('../../domain/interfaces/logger.interface.js').Logger} */
  #logger;

  /** @type {import('mongodb').Collection | null} */
  #collection = null;

  /** @type {boolean} */
  #initialized = false;

  /** @type {string} */
  id = 'mongo-atlas';

  /**
   * @param {object} options
   * @param {import('../memory/MongoConnection.js').MongoConnection} options.connection
   * @param {string} [options.collectionName]
   * @param {import('../../domain/interfaces/logger.interface.js').Logger} options.logger
   */
  constructor(options) {
    this.#connection = options.connection;
    this.#collectionName = options.collectionName ?? 'rag_vectors';
    this.#logger = options.logger;
  }

  /**
   * @returns {Promise<import('mongodb').Collection>}
   */
  async #getCollection() {
    if (!this.#collection) {
      const db = await this.#connection.db();
      this.#collection = db.collection(this.#collectionName);
    }
    return this.#collection;
  }

  /**
   * Initialize collection with vector search index.
   * @param {import('../../domain/interfaces/rag.interface.js').VectorStoreConfig} config
   */
  async initialize(config) {
    if (this.#initialized) return;

    const collection = await this.#getCollection();

    await collection.createIndex(
      { embedding: 1 },
      { name: 'vector_index' }
    ).catch(() => {});

    await collection.createIndex(
      { source: 1, documentId: 1 },
      { name: 'metadata_index' }
    ).catch(() => {});

    this.#initialized = true;
    this.#logger.info({ collection: this.#collectionName }, 'MongoDB Atlas vector store initialized');
  }

  /**
   * Upsert vectors.
   * @param {import('../../domain/interfaces/rag.interface.js').VectorStoreUpsertInput[]} input
   */
  async upsert(input) {
    const collection = await this.#getCollection();

    /** @type {any[]} */
    const operations = input.map(item => ({
      updateOne: {
        filter: { _id: item.id },
        update: {
          $set: {
            _id: item.id,
            embedding: item.vector,
            metadata: item.metadata ?? {},
            updatedAt: new Date()
          }
        },
        upsert: true
      }
    }));

    await collection.bulkWrite(/** @type {any} */ (operations), { ordered: false });
  }

  /**
   * Query similar vectors.
   * @param {import('../../domain/interfaces/rag.interface.js').VectorStoreQueryInput} input
   * @returns {Promise<import('../../domain/interfaces/rag.interface.js').VectorStoreResult[]>}
   */
  async query(input) {
    const collection = await this.#getCollection();

    /** @type {any[]} */
    const pipeline = [
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: input.vector,
          numCandidates: input.topK * 10,
          limit: input.topK
        }
      },
      {
        $project: {
          _id: 1,
          score: { $meta: 'vectorSearchScore' },
          metadata: 1
        }
      }
    ];

    if (input.filter && Object.keys(input.filter).length > 0) {
      pipeline.splice(1, 0, {
        $match: Object.fromEntries(
          Object.entries(input.filter).map(([k, v]) => [`metadata.${k}`, v])
        )
      });
    }

    const results = await collection.aggregate(pipeline).toArray();

    return results.map((/** @type {any} */ doc) => ({
      id: doc._id,
      score: doc.score,
      metadata: doc.metadata
    }));
  }

  /**
   * Delete a vector by ID.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const collection = await this.#getCollection();
    const result = await collection.deleteOne(/** @type {any} */ ({ _id: id }));
    return result.deletedCount > 0;
  }

  /**
   * Delete by filter.
   * @param {Record<string, unknown>} filter
   * @returns {Promise<number>}
   */
  async deleteMany(filter) {
    const collection = await this.#getCollection();

    const query = Object.fromEntries(
      Object.entries(filter).map(([k, v]) => [`metadata.${k}`, v])
    );

    const result = await collection.deleteMany(/** @type {any} */ (query));
    return result.deletedCount;
  }

  /**
   * Count vectors in collection.
   * @returns {Promise<number>}
   */
  async count() {
    const collection = await this.#getCollection();
    return collection.countDocuments();
  }
}
