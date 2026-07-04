import { randomUUID } from 'node:crypto';
import { ValidationError } from '../../domain/errors/ValidationError.js';

const allowedTypes = new Set([
  'conversation_history',
  'agent_response',
  'report',
  'previous_audit',
  'previous_recommendation',
  'preference'
]);

/**
 * @param {unknown} value
 * @returns {Record<string, unknown>}
 */
function asRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? /** @type {Record<string, unknown>} */ (value) : {};
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function asStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

/**
 * @param {unknown} value
 * @returns {import('../../domain/interfaces/memory.interface.js').MemoryType}
 */
export function normalizeMemoryType(value) {
  return typeof value === 'string' && allowedTypes.has(value)
    ? /** @type {import('../../domain/interfaces/memory.interface.js').MemoryType} */ (value)
    : 'agent_response';
}

/**
 * @param {import('../../domain/interfaces/memory.interface.js').SaveMemoryInput} input
 * @param {Date} now
 * @param {Date} [createdAt]
 * @returns {import('../../domain/interfaces/memory.interface.js').MemoryRecord}
 */
export function createMemoryRecord(input, now, createdAt = now) {
  return {
    key: input.key ?? randomUUID(),
    type: normalizeMemoryType(input.type),
    value: input.value,
    namespace: input.namespace,
    agentId: input.agentId,
    conversationId: input.conversationId,
    userId: input.userId,
    tags: asStringArray(input.tags),
    metadata: asRecord(input.metadata),
    vector: input.vector,
    createdAt,
    updatedAt: now
  };
}

export class MemoryEngine {
  /**
   * @param {object} dependencies
   * @param {import('../../domain/interfaces/memory.interface.js').MemoryRepository & { countMemory?: (query?: import('../../domain/interfaces/memory.interface.js').MemorySearchQuery) => Promise<import('../../domain/interfaces/memory.interface.js').MemoryCountStats>, bulkSaveMemory?: (input: import('../../domain/interfaces/memory.interface.js').BulkSaveMemoryInput) => Promise<import('../../domain/interfaces/memory.interface.js').BulkSaveMemoryResult>}} dependencies.repository
   * @param {import('../../domain/interfaces/logger.interface.js').Logger} dependencies.logger
   */
  constructor(dependencies) {
    this.repository = dependencies.repository;
    this.logger = dependencies.logger;
  }

  /**
   * @param {import('../../domain/interfaces/memory.interface.js').SaveMemoryInput} input
   * @returns {Promise<import('../../domain/interfaces/memory.interface.js').MemoryRecord>}
   */
  async saveMemory(input) {
    if (!input.type) {
      throw new ValidationError('Memory type is required');
    }
    if (input.value === undefined || input.value === null) {
      throw new ValidationError('Memory value is required');
    }

    const record = await this.repository.saveMemory(input);
    this.logger.info({ key: record.key, type: record.type }, 'Memory saved');
    return record;
  }

  /**
   * @param {import('../../domain/interfaces/memory.interface.js').MemorySearchQuery} query
   * @returns {Promise<import('../../domain/interfaces/memory.interface.js').MemoryRecord[]>}
   */
  async searchMemory(query) {
    return this.repository.searchMemory(query);
  }

  /**
   * @param {import('../../domain/interfaces/memory.interface.js').DeleteMemoryInput} input
   * @returns {Promise<import('../../domain/interfaces/memory.interface.js').MemoryDeleteResult>}
   */
  async deleteMemory(input) {
    if (!input.key && !input.query) {
      throw new ValidationError('Either key or query is required for delete');
    }

    const result = await this.repository.deleteMemory(input);
    this.logger.info({ deletedCount: result.deletedCount }, 'Memory deleted');
    return result;
  }

  /**
   * @param {import('../../domain/interfaces/memory.interface.js').GetRecentMemoryInput} input
   * @returns {Promise<import('../../domain/interfaces/memory.interface.js').MemoryRecord[]>}
   */
  async getRecent(input) {
    return this.repository.getRecent(input);
  }

  /**
   * @param {import('../../domain/interfaces/memory.interface.js').MemorySearchQuery} [query]
   * @returns {Promise<import('../../domain/interfaces/memory.interface.js').MemoryCountStats>}
   */
  async countMemory(query) {
    if (this.repository.countMemory) {
      return this.repository.countMemory(query);
    }

    const records = await this.repository.searchMemory({ ...query, limit: Number.MAX_SAFE_INTEGER });
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
    if (!input.records?.length) {
      throw new ValidationError('At least one record is required for bulk save');
    }

    if (this.repository.bulkSaveMemory) {
      return this.repository.bulkSaveMemory(input);
    }

    const saved = await Promise.all(input.records.map((record) => this.saveMemory(record)));
    return { saved, count: saved.length };
  }

  /**
   * Compatibility alias for the existing runtime memory boundary.
   * @param {Partial<import('../../domain/interfaces/memory.interface.js').SaveMemoryInput> & { key: string, value: unknown }} record
   */
  async save(record) {
    await this.saveMemory({
      ...record,
      type: normalizeMemoryType(record.type)
    });
  }

  /**
   * @param {string} key
   * @returns {Promise<import('../../domain/interfaces/memory.interface.js').MemoryRecord | null>}
   */
  async get(key) {
    const results = await this.searchMemory({ filter: { key }, limit: 1 });
    return results[0] ?? null;
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
}
