/**
 * Null vector store for testing.
 */
export class NullVectorStore {
  /** @type {string} */
  id = 'null';

  /** @type {Map<string, {vector: number[], metadata: Record<string, unknown>}>} */
  #store = new Map();

  /**
   * @param {import('../../domain/interfaces/rag.interface.js').VectorStoreConfig} _config
   */
  async initialize(_config) {}

  /**
   * @param {import('../../domain/interfaces/rag.interface.js').VectorStoreUpsertInput[]} input
   */
  async upsert(input) {
    for (const item of input) {
      this.#store.set(item.id, {
        vector: item.vector,
        metadata: item.metadata ?? {}
      });
    }
  }

  /**
   * @param {import('../../domain/interfaces/rag.interface.js').VectorStoreQueryInput} input
   * @returns {Promise<import('../../domain/interfaces/rag.interface.js').VectorStoreResult[]>}
   */
  async query(input) {
    /** @type {import('../../domain/interfaces/rag.interface.js').VectorStoreResult[]} */
    const results = [];

    for (const [id, entry] of this.#store) {
      const score = this.#cosineSimilarity(input.vector, entry.vector);
      results.push({ id, score, metadata: entry.metadata });
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, input.topK);
  }

  /**
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    return this.#store.delete(id);
  }

  /**
   * @param {Record<string, unknown>} filter
   * @returns {Promise<number>}
   */
  async deleteMany(filter) {
    let count = 0;
    for (const [id, entry] of this.#store) {
      if (this.#matchesFilter(entry.metadata, filter)) {
        this.#store.delete(id);
        count++;
      }
    }
    return count;
  }

  /**
   * @returns {Promise<number>}
   */
  async count() {
    return this.#store.size;
  }

  /**
   * @param {number[]} a
   * @param {number[]} b
   * @returns {number}
   */
  #cosineSimilarity(a, b) {
    if (a.length === 0 || b.length === 0) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return normA === 0 || normB === 0 ? 0 : dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * @param {Record<string, unknown>} metadata
   * @param {Record<string, unknown>} filter
   * @returns {boolean}
   */
  #matchesFilter(metadata, filter) {
    for (const [key, value] of Object.entries(filter)) {
      if (metadata[key] !== value) return false;
    }
    return true;
  }
}
