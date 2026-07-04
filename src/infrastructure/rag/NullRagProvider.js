export class NullRagProvider {
  /** @type {string} */
  id = 'null';

  /**
   * @param {import('../../domain/interfaces/rag.interface.js').RagQuery} _query
   * @returns {Promise<import('../../domain/interfaces/rag.interface.js').RagDocument[]>}
   */
  async retrieve(_query) {
    return [];
  }

  /**
   * @param {import('../../domain/interfaces/rag.interface.js').RagIngestInput} _input
   * @returns {Promise<{chunkCount: number}>}
   */
  async ingest(_input) {
    return { chunkCount: 0 };
  }

  /**
   * @param {import('../../domain/interfaces/rag.interface.js').KnowledgeSource} _source
   * @returns {Promise<number>}
   */
  async countBySource(_source) {
    return 0;
  }

  /**
   * @param {import('../../domain/interfaces/rag.interface.js').KnowledgeSource} _source
   * @returns {Promise<void>}
   */
  async deleteBySource(_source) {}
}
