import { createMemoryRecord } from '../../application/memory/MemoryEngine.js';

/**
 * @param {import('../../domain/interfaces/memory.interface.js').MemorySearchQuery | import('../../domain/interfaces/memory.interface.js').GetRecentMemoryInput} query
 * @returns {import('mongodb').Filter<import('../../domain/interfaces/memory.interface.js').MemoryRecord>}
 */
function buildFilter(query) {
  /** @type {import('mongodb').Filter<import('../../domain/interfaces/memory.interface.js').MemoryRecord>} */
  const filter = {};

  if (query.namespace) filter.namespace = query.namespace;
  if (query.agentId) filter.agentId = query.agentId;
  if (query.conversationId) filter.conversationId = query.conversationId;
  if (query.userId) filter.userId = query.userId;

  if (query.type) {
    filter.type = Array.isArray(query.type) ? { $in: query.type } : query.type;
  }

  if ('tags' in query && query.tags?.length) {
    filter.tags = { $all: query.tags };
  }

  if ('text' in query && query.text) {
    filter.$text = { $search: query.text };
  }

  if ('filter' in query && query.filter) {
    for (const [key, value] of Object.entries(query.filter)) {
      filter[key] = value;
    }
  }

  return filter;
}

/**
 * @param {import('../../domain/interfaces/memory.interface.js').MemoryRecord} document
 * @returns {import('../../domain/interfaces/memory.interface.js').MemoryRecord}
 */
function toMemoryRecord(document) {
  const { _id, ...record } = /** @type {import('../../domain/interfaces/memory.interface.js').MemoryRecord & { _id?: unknown }} */ (document);
  return record;
}

export class MongoMemoryRepository {
  /**
   * @param {object} options
   * @param {import('./MongoConnection.js').MongoConnection} options.connection
   * @param {string} options.collectionName
   */
  constructor(options) {
    this.connection = options.connection;
    this.collectionName = options.collectionName;
    /** @type {Promise<void> | null} */
    this.indexPromise = null;
  }

  /**
   * @returns {Promise<import('mongodb').Collection<import('../../domain/interfaces/memory.interface.js').MemoryRecord>>}
   */
  async collection() {
    const db = await this.connection.db();
    const collection = /** @type {import('mongodb').Collection<import('../../domain/interfaces/memory.interface.js').MemoryRecord>} */ (db.collection(this.collectionName));
    if (!this.indexPromise) {
      this.indexPromise = this.ensureIndexes(collection);
    }
    await this.indexPromise;
    return collection;
  }

  /**
   * @param {import('mongodb').Collection<import('../../domain/interfaces/memory.interface.js').MemoryRecord>} collection
   */
  async ensureIndexes(collection) {
    await collection.createIndex({ key: 1 }, { unique: true });
    await collection.createIndex({ type: 1, createdAt: -1 });
    await collection.createIndex({ namespace: 1, createdAt: -1 });
    await collection.createIndex({ agentId: 1, createdAt: -1 });
    await collection.createIndex({ conversationId: 1, createdAt: -1 });
    await collection.createIndex({ userId: 1, createdAt: -1 });
    await collection.createIndex({ tags: 1 });
    await collection.createIndex({ 'vector.externalId': 1 }, { sparse: true });
    await collection.createIndex({ 'vector.indexName': 1 }, { sparse: true });
    await collection.createIndex({
      key: 'text',
      type: 'text',
      tags: 'text',
      'metadata.title': 'text',
      'metadata.summary': 'text'
    });
  }

  /**
   * @param {import('../../domain/interfaces/memory.interface.js').SaveMemoryInput} input
   * @returns {Promise<import('../../domain/interfaces/memory.interface.js').MemoryRecord>}
   */
  async saveMemory(input) {
    const collection = await this.collection();
    const existing = input.key ? await collection.findOne({ key: input.key }) : null;
    const record = createMemoryRecord(input, new Date(), existing?.createdAt);

    await collection.updateOne(
      { key: record.key },
      { $set: record, $setOnInsert: { createdAt: record.createdAt } },
      { upsert: true }
    );

    return record;
  }

  /**
   * @param {import('../../domain/interfaces/memory.interface.js').MemorySearchQuery} query
   * @returns {Promise<import('../../domain/interfaces/memory.interface.js').MemoryRecord[]>}
   */
  async searchMemory(query) {
    const collection = await this.collection();
    const sortBy = query.sortBy ?? 'createdAt';
    const direction = query.sortDirection === 'asc' ? 1 : -1;
    const cursor = collection
      .find(buildFilter(query))
      .sort({ [sortBy]: direction })
      .skip(query.offset ?? 0)
      .limit(query.limit ?? 25);

    return (await cursor.toArray()).map(toMemoryRecord);
  }

  /**
   * @param {import('../../domain/interfaces/memory.interface.js').DeleteMemoryInput} input
   * @returns {Promise<import('../../domain/interfaces/memory.interface.js').MemoryDeleteResult>}
   */
  async deleteMemory(input) {
    const collection = await this.collection();
    const result = input.key
      ? await collection.deleteOne({ key: input.key })
      : await collection.deleteMany(buildFilter(input.query ?? {}));

    return { deletedCount: result.deletedCount };
  }

  /**
   * @param {import('../../domain/interfaces/memory.interface.js').GetRecentMemoryInput} input
   * @returns {Promise<import('../../domain/interfaces/memory.interface.js').MemoryRecord[]>}
   */
  async getRecent(input) {
    const collection = await this.collection();
    return (await collection
      .find(buildFilter(input))
      .sort({ createdAt: -1 })
      .limit(input.limit ?? 25)
      .toArray()).map(toMemoryRecord);
  }

  /**
   * @param {import('../../domain/interfaces/memory.interface.js').MemorySearchQuery} [query]
   * @returns {Promise<import('../../domain/interfaces/memory.interface.js').MemoryCountStats>}
   */
  async countMemory(query) {
    const collection = await this.collection();
    const filter = query ? buildFilter(query) : {};

    const total = await collection.countDocuments(filter);

    const byTypePipeline = [
      { $match: filter },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ];
    const byTypeResult = await collection.aggregate(byTypePipeline).toArray();
    const byType = /** @type {Record<string, number>} */ ({});
    for (const doc of byTypeResult) {
      byType[doc._id] = doc.count;
    }

    const byNamespacePipeline = [
      { $match: { ...filter, namespace: { $exists: true, $ne: null } } },
      { $group: { _id: '$namespace', count: { $sum: 1 } } }
    ];
    const byNamespaceResult = await collection.aggregate(byNamespacePipeline).toArray();
    const byNamespace = /** @type {Record<string, number>} */ ({});
    for (const doc of byNamespaceResult) {
      byNamespace[doc._id] = doc.count;
    }

    return {
      total,
      byType: /** @type {import('../../domain/interfaces/memory.interface.js').MemoryCountStats['byType']} */ (byType),
      byNamespace
    };
  }

  /**
   * @param {import('../../domain/interfaces/memory.interface.js').BulkSaveMemoryInput} input
   * @returns {Promise<import('../../domain/interfaces/memory.interface.js').BulkSaveMemoryResult>}
   */
  async bulkSaveMemory(input) {
    const collection = await this.collection();
    const now = new Date();

    const operations = await Promise.all(
      input.records.map(async (recordInput) => {
        const existing = recordInput.key ? await collection.findOne({ key: recordInput.key }) : null;
        const record = createMemoryRecord(recordInput, now, existing?.createdAt);
        return { record, filter: { key: record.key } };
      })
    );

    const bulkOps = operations.map(({ record, filter }) => ({
      updateOne: {
        filter,
        update: { $set: record, $setOnInsert: { createdAt: record.createdAt } },
        upsert: true
      }
    }));

    if (bulkOps.length > 0) {
      await collection.bulkWrite(bulkOps, { ordered: false });
    }

    const saved = operations.map(({ record }) => record);
    return { saved, count: saved.length };
  }
}

