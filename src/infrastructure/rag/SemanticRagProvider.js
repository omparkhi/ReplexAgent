import { DocumentChunker } from './DocumentChunker.js';
import { Reranker } from './Reranker.js';
import { KnowledgeSourceManager } from './KnowledgeSourceManager.js';

/**
 * @typedef {import('../../domain/interfaces/rag.interface.js').RagQuery} RagQuery
 * @typedef {import('../../domain/interfaces/rag.interface.js').RagDocument} RagDocument
 * @typedef {import('../../domain/interfaces/rag.interface.js').RagIngestInput} RagIngestInput
 * @typedef {import('../../domain/interfaces/rag.interface.js').KnowledgeSource} KnowledgeSource
 * @typedef {import('../../domain/interfaces/rag.interface.js').DocumentChunk} DocumentChunk
 * @typedef {import('../../domain/interfaces/rag.interface.js').VectorStore} VectorStore
 * @typedef {import('../../domain/interfaces/embedding.interface.js').EmbeddingProvider} EmbeddingProvider
 */

/**
 * Production-ready RAG provider with semantic search.
 * Pipeline: Chunk → Embed → Store → Retrieve → Rank → Inject
 */
export class SemanticRagProvider {
  /** @type {EmbeddingProvider} */
  #embeddingProvider;

  /** @type {VectorStore} */
  #vectorStore;

  /** @type {import('../../domain/interfaces/logger.interface.js').Logger} */
  #logger;

  /** @type {KnowledgeSourceManager} */
  #knowledgeSourceManager;

  /** @type {Map<KnowledgeSource, DocumentChunker>} */
  #chunkers = new Map();

  /** @type {Reranker} */
  #reranker;

  /** @type {boolean} */
  #initialized = false;

  /** @type {string} */
  id = 'semantic-rag';

  /**
   * @param {object} dependencies
   * @param {EmbeddingProvider} dependencies.embeddingProvider
   * @param {VectorStore} dependencies.vectorStore
   * @param {import('../../domain/interfaces/logger.interface.js').Logger} dependencies.logger
   * @param {number} [dependencies.defaultTopK]
   * @param {number} [dependencies.minScore]
   */
  constructor(dependencies) {
    this.#embeddingProvider = dependencies.embeddingProvider;
    this.#vectorStore = dependencies.vectorStore;
    this.#logger = dependencies.logger;
    this.defaultTopK = dependencies.defaultTopK ?? 5;
    this.minScore = dependencies.minScore ?? 0.3;
    this.#knowledgeSourceManager = new KnowledgeSourceManager();
    this.#reranker = new Reranker();
  }

  /**
   * Initialize the RAG provider.
   */
  async initialize() {
    if (this.#initialized) return;

    await this.#vectorStore.initialize({
      collection: 'rag_vectors',
      dimensions: this.#embeddingProvider.getDimensions(),
      similarityMetric: 'cosine'
    });

    this.#initialized = true;
    this.#logger.info({
      embeddingProvider: this.#embeddingProvider.id,
      vectorStore: this.#vectorStore.id,
      dimensions: this.#embeddingProvider.getDimensions()
    }, 'SemanticRAG provider initialized');
  }

  /**
   * Get or create a chunker for a knowledge source.
   * @param {KnowledgeSource} source
   * @returns {DocumentChunker}
   */
  #getChunker(source) {
    if (!this.#chunkers.has(source)) {
      const config = this.#knowledgeSourceManager.getChunkingConfig(source);
      this.#chunkers.set(source, new DocumentChunker({
        config: {
          chunkSize: config.chunkSize,
          chunkOverlap: config.chunkOverlap,
          strategy: 'recursive'
        }
      }));
    }
    return /** @type {DocumentChunker} */ (this.#chunkers.get(source));
  }

  /**
   * Ingest a document into the RAG system.
   * Pipeline: Chunk → Embed → Store
   * @param {RagIngestInput} input
   * @returns {Promise<{chunkCount: number}>}
   */
  async ingest(input) {
    await this.initialize();

    const validation = this.#knowledgeSourceManager.validateInput(input);
    if (!validation.valid) {
      throw new Error(`Invalid ingest input: ${validation.errors.join(', ')}`);
    }

    this.#logger.debug({
      documentId: input.id,
      source: input.source,
      contentLength: input.content.length
    }, 'Ingesting document');

    const chunker = this.#getChunker(input.source);
    const chunks = chunker.chunk({
      documentId: input.id,
      content: input.content,
      source: input.source,
      metadata: input.metadata
    });

    if (chunks.length === 0) {
      this.#logger.warn({ documentId: input.id }, 'Document produced no chunks');
      return { chunkCount: 0 };
    }

    const texts = chunks.map(c => c.content);
    const embeddingResult = await this.#embeddingProvider.embed({ text: texts });

    const upserts = chunks.map((chunk, index) => ({
      id: chunk.id,
      vector: embeddingResult.embeddings[index],
      metadata: {
        content: chunk.content,
        documentId: chunk.documentId,
        source: chunk.source,
        chunkIndex: chunk.chunkIndex,
        totalChunks: chunk.totalChunks,
        ...chunk.metadata,
        ingestedAt: new Date().toISOString()
      }
    }));

    await this.#vectorStore.upsert(upserts);

    this.#logger.info({
      documentId: input.id,
      source: input.source,
      chunkCount: chunks.length
    }, 'Document ingested successfully');

    return { chunkCount: chunks.length };
  }

  /**
   * Semantic search for relevant documents.
   * Pipeline: Embed → Retrieve → Rank → Inject
   * @param {RagQuery} query
   * @returns {Promise<RagDocument[]>}
   */
  async retrieve(query) {
    await this.initialize();

    this.#logger.debug({
      query: query.query.slice(0, 100),
      sources: query.sources,
      limit: query.limit
    }, 'Executing RAG retrieval');

    const embeddingResult = await this.#embeddingProvider.embed({
      text: query.query
    });

    const queryVector = embeddingResult.embeddings[0];
    if (!queryVector || queryVector.length === 0) {
      this.#logger.warn('Empty query embedding, returning empty results');
      return [];
    }

    const filter = this.#buildFilter(query);

    const vectorResults = await this.#vectorStore.query({
      vector: queryVector,
      topK: (query.limit ?? this.defaultTopK) * 3,
      filter
    });

    const documents = vectorResults
      .filter(result => result.score >= (query.minScore ?? this.minScore))
      .map(result => ({
        id: result.id,
        content: String(result.metadata?.content ?? ''),
        source: /** @type {KnowledgeSource} */ (String(result.metadata?.source ?? 'custom')),
        documentId: String(result.metadata?.documentId),
        score: result.score,
        metadata: {
          chunkIndex: result.metadata?.chunkIndex,
          totalChunks: result.metadata?.totalChunks,
          ingestedAt: result.metadata?.ingestedAt
        }
      }))
      .filter(doc => doc.content.length > 0);

    const reranked = this.#reranker.rerank(documents, query.limit ?? this.defaultTopK);

    this.#logger.info({
      query: query.query.slice(0, 50),
      resultCount: reranked.length,
      topScore: reranked[0]?.score
    }, 'RAG retrieval completed');

    return reranked;
  }

  /**
   * Build vector store filter from query.
   * @param {RagQuery} query
   * @returns {Record<string, unknown>}
   */
  #buildFilter(query) {
    const filter = { ...query.filter };

    if (query.sources && query.sources.length > 0) {
      if (query.sources.length === 1) {
        filter.source = query.sources[0];
      } else {
        filter.source = { $in: query.sources };
      }
    }

    return filter;
  }

  /**
   * Count documents by knowledge source.
   * @param {KnowledgeSource} source
   * @returns {Promise<number>}
   */
  async countBySource(source) {
    await this.initialize();
    return this.#vectorStore.deleteMany({ source }).then(() => 0).catch(() => 0);
  }

  /**
   * Delete all documents from a knowledge source.
   * @param {KnowledgeSource} source
   * @returns {Promise<void>}
   */
  async deleteBySource(source) {
    await this.initialize();
    const deleted = await this.#vectorStore.deleteMany({ source });
    this.#logger.info({ source, deletedCount: deleted }, 'Deleted documents by source');
  }
}
