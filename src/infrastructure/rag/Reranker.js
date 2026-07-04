/**
 * @typedef {import('../../domain/interfaces/rag.interface.js').RagDocument} RagDocument
 */

/**
 * Reranks search results by relevance score and diversity.
 */
export class Reranker {
  /** @type {number} */
  #diversityWeight;

  /** @type {number} */
  #recencyWeight;

  /**
   * @param {object} [options]
   * @param {number} [options.diversityWeight] - Weight for source diversity (0-1)
   * @param {number} [options.recencyWeight] - Weight for recency (0-1)
   */
  constructor(options) {
    this.#diversityWeight = options?.diversityWeight ?? 0.2;
    this.#recencyWeight = options?.recencyWeight ?? 0.1;
  }

  /**
   * Rerank documents by combined score.
   * @param {RagDocument[]} documents
   * @param {number} [topK]
   * @returns {RagDocument[]}
   */
  rerank(documents, topK) {
    if (documents.length === 0) return [];

    const scored = documents.map(doc => ({
      doc,
      score: this.#calculateScore(doc, documents)
    }));

    scored.sort((a, b) => b.score - a.score);

    const results = scored.slice(0, topK ?? documents.length);

    return results.map((item, index) => ({
      ...item.doc,
      score: item.score,
      metadata: {
        ...item.doc.metadata,
        rerankPosition: index
      }
    }));
  }

  /**
   * Calculate combined score for a document.
   * @param {RagDocument} doc
   * @param {RagDocument[]} allDocs
   * @returns {number}
   */
  #calculateScore(doc, allDocs) {
    const baseScore = doc.score ?? 0.5;

    const diversityPenalty = this.#calculateDiversityPenalty(doc, allDocs);
    const recencyBonus = this.#calculateRecencyBonus(doc);

    return baseScore * (1 - this.#diversityWeight) + recencyBonus * this.#recencyWeight - diversityPenalty * this.#diversityWeight;
  }

  /**
   * Calculate diversity penalty for similar source types.
   * @param {RagDocument} doc
   * @param {RagDocument[]} allDocs
   * @returns {number}
   */
  #calculateDiversityPenalty(doc, allDocs) {
    const sameSourceCount = allDocs.filter(d =>
      d.source === doc.source && d.id !== doc.id
    ).length;

    return Math.min(sameSourceCount * 0.1, 0.5);
  }

  /**
   * Calculate recency bonus based on metadata timestamp.
   * @param {RagDocument} doc
   * @returns {number}
   */
  #calculateRecencyBonus(doc) {
    const timestamp = doc.metadata?.timestamp ?? doc.metadata?.createdAt;
    if (!timestamp) return 0.5;

    const date = new Date(/** @type {string} */ (timestamp));
    const now = new Date();
    const daysSince = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

    return Math.max(0, 1 - daysSince / 365);
  }
}
