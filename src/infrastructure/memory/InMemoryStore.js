import { createMemoryRecord } from '../../application/memory/MemoryEngine.js';

/**
 * @param {import('../../domain/interfaces/memory.interface.js').MemoryRecord} record
 * @param {import('../../domain/interfaces/memory.interface.js').MemorySearchQuery} query
 * @returns {boolean}
 */
function matchesQuery(record, query) {
  if (query.namespace && record.namespace !== query.namespace) return false;
  if (query.agentId && record.agentId !== query.agentId) return false;
  if (query.conversationId && record.conversationId !== query.conversationId) return false;
  if (query.userId && record.userId !== query.userId) return false;

  if (query.type) {
    const types = Array.isArray(query.type) ? query.type : [query.type];
    if (!types.includes(record.type)) return false;
  }

  if (query.tags?.length) {
    if (!query.tags.every((tag) => record.tags.includes(tag))) return false;
  }

  if (query.text) {
    const haystack = JSON.stringify({ value: record.value, metadata: record.metadata }).toLowerCase();
    if (!haystack.includes(query.text.toLowerCase())) return false;
  }

  if (query.filter) {
    for (const [key, value] of Object.entries(query.filter)) {
      if (key === 'key' && record.key !== value) return false;
      if (key.startsWith('metadata.') && record.metadata[key.slice('metadata.'.length)] !== value) return false;
    }
  }

  return true;
}

export class InMemoryStore {
  constructor() {
    /** @type {Map<string, import('../../domain/interfaces/memory.interface.js').MemoryRecord>} */
    this.records = new Map();
  }

  /**
   * @param {import('../../domain/interfaces/memory.interface.js').SaveMemoryInput} input
   * @returns {Promise<import('../../domain/interfaces/memory.interface.js').MemoryRecord>}
   */
  async saveMemory(input) {
    const existing = input.key ? this.records.get(input.key) : undefined;
    const record = createMemoryRecord(input, new Date(), existing?.createdAt);
    this.records.set(record.key, record);
    return record;
  }

  /**
   * @param {import('../../domain/interfaces/memory.interface.js').MemorySearchQuery} query
   * @returns {Promise<import('../../domain/interfaces/memory.interface.js').MemoryRecord[]>}
   */
  async searchMemory(query) {
    const direction = query.sortDirection === 'asc' ? 1 : -1;
    const sortBy = query.sortBy ?? 'createdAt';
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 25;

    return Array.from(this.records.values())
      .filter((record) => matchesQuery(record, query))
      .sort((a, b) => direction * (a[sortBy].getTime() - b[sortBy].getTime()))
      .slice(offset, offset + limit);
  }

  /**
   * @param {import('../../domain/interfaces/memory.interface.js').DeleteMemoryInput} input
   * @returns {Promise<import('../../domain/interfaces/memory.interface.js').MemoryDeleteResult>}
   */
  async deleteMemory(input) {
    if (input.key) {
      const deleted = this.records.delete(input.key);
      return { deletedCount: deleted ? 1 : 0 };
    }

    const matches = await this.searchMemory(input.query ?? {});
    for (const record of matches) {
      this.records.delete(record.key);
    }

    return { deletedCount: matches.length };
  }

  /**
   * @param {import('../../domain/interfaces/memory.interface.js').GetRecentMemoryInput} input
   */
  async getRecent(input) {
    return this.searchMemory({ ...input, sortBy: 'createdAt', sortDirection: 'desc' });
  }

  /**
   * @param {Partial<import('../../domain/interfaces/memory.interface.js').SaveMemoryInput> & { key: string, value: unknown }} record
   */
  async save(record) {
    await this.saveMemory({ ...record, type: record.type ?? 'agent_response' });
  }

  /**
   * @param {string} key
   */
  async get(key) {
    return this.records.get(key) ?? null;
  }

  /**
   * @param {import('../../domain/interfaces/memory.interface.js').MemorySearchQuery} query
   */
  async search(query) {
    return this.searchMemory(query);
  }

  /**
   * @param {string} key
   */
  async delete(key) {
    await this.deleteMemory({ key });
  }

  /**
   * @param {import('../../domain/interfaces/memory.interface.js').MemorySearchQuery} [query]
   * @returns {Promise<import('../../domain/interfaces/memory.interface.js').MemoryCountStats>}
   */
  async countMemory(query) {
    const records = query
      ? (await this.searchMemory({ ...query, limit: Number.MAX_SAFE_INTEGER }))
      : Array.from(this.records.values());

    const byType = /** @type {Record<string, number>} */ ({});
    const byNamespace = /** @type {Record<string, number>} */ ({});

    for (const record of records) {
      byType[record.type] = (byType[record.type] ?? 0) + 1;
      if (record.namespace) {
        byNamespace[record.namespace] = (byNamespace[record.namespace] ?? 0) + 1;
      }
    }

    return {
      total: records.length,
      byType: /** @type {import('../../domain/interfaces/memory.interface.js').MemoryCountStats['byType']} */ (byType),
      byNamespace
    };
  }

  /**
   * @param {import('../../domain/interfaces/memory.interface.js').BulkSaveMemoryInput} input
   * @returns {Promise<import('../../domain/interfaces/memory.interface.js').BulkSaveMemoryResult>}
   */
  async bulkSaveMemory(input) {
    const saved = await Promise.all(
      input.records.map((record) => this.saveMemory(record))
    );
    return { saved, count: saved.length };
  }
}
