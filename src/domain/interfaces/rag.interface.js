/**
 * @typedef {'audit-report' | 'seo-knowledge' | 'accessibility-docs' | 'owasp' | 'lighthouse-docs' | 'schema-org' | 'custom'} KnowledgeSource
 */

/**
 * @typedef {object} DocumentChunk
 * @property {string} id - Unique chunk identifier
 * @property {string} content - Chunk text content
 * @property {string} documentId - Parent document identifier
 * @property {KnowledgeSource} source - Knowledge source type
 * @property {number} chunkIndex - Index of this chunk in the document
 * @property {number} totalChunks - Total chunks in the document
 * @property {Record<string, unknown>} metadata - Additional metadata
 * @property {number[]} [embedding] - Vector embedding (populated after embedding)
 */

/**
 * @typedef {object} ChunkingConfig
 * @property {number} chunkSize - Maximum characters per chunk (default: 1000)
 * @property {number} chunkOverlap - Overlap between chunks in characters (default: 200)
 * @property {'recursive' | 'fixed' | 'semantic'} strategy - Chunking strategy
 * @property {string[]} [separators] - Custom separators for recursive chunking
 */

/**
 * @typedef {object} EmbeddedChunk
 * @property {string} id - Chunk identifier
 * @property {string} content - Chunk text content
 * @property {string} documentId - Parent document identifier
 * @property {KnowledgeSource} source - Knowledge source type
 * @property {number} chunkIndex - Index in document
 * @property {number} totalChunks - Total chunks in document
 * @property {number[]} embedding - Vector embedding
 * @property {Record<string, unknown>} metadata - Additional metadata
 */

/**
 * @typedef {object} VectorStoreConfig
 * @property {string} collection - Collection/index name
 * @property {number} dimensions - Embedding dimensions
 * @property {string} [similarityMetric] - Cosine, dotProduct, or euclidean (default: cosine)
 */

/**
 * @typedef {object} VectorStoreUpsertInput
 * @property {string} id - Document/chunk ID
 * @property {number[]} vector - Embedding vector
 * @property {Record<string, unknown>} [metadata] - Associated metadata
 */

/**
 * @typedef {object} VectorStoreQueryInput
 * @property {number[]} vector - Query embedding vector
 * @property {number} topK - Number of results to return
 * @property {Record<string, unknown>} [filter] - Metadata filter
 * @property {string} [includeMetadata] - Include metadata in results
 */

/**
 * @typedef {object} VectorStoreResult
 * @property {string} id - Matched document/chunk ID
 * @property {number} score - Similarity score
 * @property {Record<string, unknown>} [metadata] - Associated metadata
 */

/**
 * @typedef {object} VectorStore
 * @property {string} id - Provider identifier
 * @property {(config: VectorStoreConfig) => Promise<void>} initialize - Initialize collection/index
 * @property {(input: VectorStoreUpsertInput[]) => Promise<void>} upsert - Insert or update vectors
 * @property {(input: VectorStoreQueryInput) => Promise<VectorStoreResult[]>} query - Similarity search
 * @property {(id: string) => Promise<boolean>} delete - Delete a vector by ID
 * @property {(filter: Record<string, unknown>) => Promise<number>} deleteMany - Delete by filter
 * @property {() => Promise<number>} count - Count vectors in collection
 */

/**
 * @typedef {object} RagQuery
 * @property {string} query - Search query text
 * @property {KnowledgeSource[]} [sources] - Filter by knowledge sources
 * @property {Record<string, unknown>} [filter] - Additional metadata filters
 * @property {number} [limit] - Max results (default: 5)
 * @property {number} [minScore] - Minimum similarity score threshold
 */

/**
 * @typedef {object} RagDocument
 * @property {string} id - Document/chunk identifier
 * @property {string} content - Chunk text content
 * @property {KnowledgeSource} source - Knowledge source type
 * @property {string} [documentId] - Parent document ID
 * @property {number} [score] - Similarity score
 * @property {Record<string, unknown>} [metadata] - Additional metadata
 */

/**
 * @typedef {object} RagIngestInput
 * @property {string} id - Document identifier
 * @property {string} content - Full document content
 * @property {KnowledgeSource} source - Knowledge source type
 * @property {Record<string, unknown>} [metadata] - Additional metadata
 */

/**
 * @typedef {object} RagProvider
 * @property {(query: RagQuery) => Promise<RagDocument[]>} retrieve - Semantic search
 * @property {(input: RagIngestInput) => Promise<{chunkCount: number}>} ingest - Ingest a document
 * @property {(source: KnowledgeSource) => Promise<number>} countBySource - Count docs by source
 * @property {(source: KnowledgeSource) => Promise<void>} deleteBySource - Delete all docs from source
 */

export {};
