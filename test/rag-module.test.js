import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DocumentChunker } from '../src/infrastructure/rag/DocumentChunker.js';
import { NullVectorStore } from '../src/infrastructure/rag/NullVectorStore.js';
import { NullRagProvider } from '../src/infrastructure/rag/NullRagProvider.js';
import { Reranker } from '../src/infrastructure/rag/Reranker.js';
import { KnowledgeSourceManager } from '../src/infrastructure/rag/KnowledgeSourceManager.js';
import { EmbeddingProviderFactory } from '../src/infrastructure/rag/EmbeddingProviderFactory.js';
import { VectorStoreFactory } from '../src/infrastructure/rag/VectorStoreFactory.js';
import { SemanticRagProvider } from '../src/infrastructure/rag/SemanticRagProvider.js';

/** @type {any} */
const logger = { info() {}, warn() {}, error() {}, debug() {} };

/** @param {number} [dimensions] */
const createMockEmbeddingProvider = (dimensions = 128) => ({
  id: 'mock-embedding',
  async embed(/** @type {any} */ input) {
    const texts = Array.isArray(input.text) ? input.text : [input.text];
    return {
      embeddings: texts.map(() => Array.from({ length: dimensions }, () => Math.random())),
      model: 'mock-model',
      dimensions
    };
  },
  getDimensions() { return dimensions; }
});

describe('DocumentChunker', () => {
  it('chunks content with recursive strategy', () => {
    const chunker = new DocumentChunker({ config: { chunkSize: 100, chunkOverlap: 20, strategy: 'recursive' } });
    const chunks = chunker.chunk({
      documentId: 'doc-1',
      content: 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.',
      source: 'audit-report'
    });

    assert.ok(chunks.length > 0);
    chunks.forEach(c => {
      assert.equal(c.documentId, 'doc-1');
      assert.equal(c.source, 'audit-report');
      assert.ok(c.id.length > 0);
      assert.ok(c.content.length > 0);
      assert.equal(typeof c.chunkIndex, 'number');
      assert.equal(typeof c.totalChunks, 'number');
    });
  });

  it('chunks content with fixed strategy', () => {
    const chunker = new DocumentChunker({ config: { chunkSize: 50, chunkOverlap: 10, strategy: 'fixed' } });
    const content = 'A'.repeat(120);
    const chunks = chunker.chunk({ documentId: 'doc-2', content, source: 'seo-knowledge' });

    assert.ok(chunks.length >= 2);
    assert.equal(chunks[0].totalChunks, chunks.length);
  });

  it('chunks content with semantic strategy', () => {
    const chunker = new DocumentChunker({ config: { chunkSize: 100, chunkOverlap: 20, strategy: 'semantic' } });
    const chunks = chunker.chunk({
      documentId: 'doc-3',
      content: 'First paragraph about topic A.\n\nSecond paragraph about topic B.\n\nThird paragraph about topic C.',
      source: 'owasp'
    });

    assert.ok(chunks.length > 0);
    assert.equal(chunks[0].source, 'owasp');
  });

  it('returns empty array for empty content', () => {
    const chunker = new DocumentChunker();
    const chunks = chunker.chunk({ documentId: 'doc-4', content: '', source: 'custom' });
    assert.deepEqual(chunks, []);
  });

  it('returns empty array for whitespace-only content', () => {
    const chunker = new DocumentChunker();
    const chunks = chunker.chunk({ documentId: 'doc-5', content: '   \n\n   ', source: 'custom' });
    assert.deepEqual(chunks, []);
  });

  it('handles single paragraph within chunk size', () => {
    const chunker = new DocumentChunker({ config: { chunkSize: 1000, chunkOverlap: 200, strategy: 'recursive' } });
    const chunks = chunker.chunk({
      documentId: 'doc-6',
      content: 'Short content.',
      source: 'lighthouse-docs'
    });

    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].content, 'Short content.');
  });
});

describe('NullVectorStore', () => {
  /** @type {any} */
  let store;

  beforeEach(() => {
    store = new NullVectorStore();
  });

  it('has null id', () => {
    assert.equal(store.id, 'null');
  });

  it('stores and retrieves vectors', async () => {
    await store.upsert([
      { id: 'v1', vector: [1, 0, 0], metadata: { source: 'test' } },
      { id: 'v2', vector: [0, 1, 0], metadata: { source: 'test' } }
    ]);

    const results = await store.query({ vector: [1, 0, 0], topK: 2 });
    assert.equal(results.length, 2);
    assert.equal(results[0].id, 'v1');
    assert.ok(results[0].score > results[1].score);
  });

  it('deletes vectors by ID', async () => {
    await store.upsert([{ id: 'v1', vector: [1, 0] }]);
    const deleted = await store.delete('v1');
    assert.equal(deleted, true);
    const count = await store.count();
    assert.equal(count, 0);
  });

  it('deletes vectors by filter', async () => {
    await store.upsert([
      { id: 'v1', vector: [1, 0], metadata: { source: 'owasp' } },
      { id: 'v2', vector: [0, 1], metadata: { source: 'seo' } }
    ]);
    const deleted = await store.deleteMany({ source: 'owasp' });
    assert.equal(deleted, 1);
    const count = await store.count();
    assert.equal(count, 1);
  });

  it('counts vectors', async () => {
    await store.upsert([{ id: 'v1', vector: [1] }, { id: 'v2', vector: [2] }]);
    const count = await store.count();
    assert.equal(count, 2);
  });
});

describe('Reranker', () => {
  it('reranks documents by score', () => {
    const reranker = new Reranker();
    /** @type {any[]} */
    const docs = [
      { id: '1', content: 'a', source: 'owasp', score: 0.5 },
      { id: '2', content: 'b', source: 'seo-knowledge', score: 0.9 },
      { id: '3', content: 'c', source: 'owasp', score: 0.7 }
    ];

    const result = reranker.rerank(docs);
    assert.equal(result[0]?.id, '2');
    assert.ok((result[0]?.score ?? 0) >= (result[1]?.score ?? 0));
  });

  it('limits results to topK', () => {
    const reranker = new Reranker();
    /** @type {any[]} */
    const docs = [
      { id: '1', content: 'a', source: 'owasp', score: 0.5 },
      { id: '2', content: 'b', source: 'seo-knowledge', score: 0.9 },
      { id: '3', content: 'c', source: 'owasp', score: 0.7 }
    ];

    const result = reranker.rerank(docs, 2);
    assert.equal(result.length, 2);
  });

  it('handles empty documents', () => {
    const reranker = new Reranker();
    const result = reranker.rerank([]);
    assert.deepEqual(result, []);
  });
});

describe('KnowledgeSourceManager', () => {
  /** @type {any} */
  let manager;

  beforeEach(() => {
    manager = new KnowledgeSourceManager();
  });

  it('lists all knowledge sources', () => {
    const sources = manager.listSources();
    assert.ok(sources.includes('audit-report'));
    assert.ok(sources.includes('seo-knowledge'));
    assert.ok(sources.includes('accessibility-docs'));
    assert.ok(sources.includes('owasp'));
    assert.ok(sources.includes('lighthouse-docs'));
    assert.ok(sources.includes('schema-org'));
    assert.ok(sources.includes('custom'));
  });

  it('returns config for valid source', () => {
    const config = manager.getConfig('owasp');
    assert.ok(config);
    assert.equal(config.name, 'OWASP');
  });

  it('returns chunking config for source', () => {
    const config = manager.getChunkingConfig('audit-report');
    assert.equal(config.chunkSize, 1200);
    assert.equal(config.chunkOverlap, 300);
  });

  it('validates correct input', () => {
    const result = manager.validateInput({
      id: 'doc-1',
      content: 'Test content',
      source: 'owasp'
    });
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it('rejects input without ID', () => {
    const result = manager.validateInput({ content: 'Test', source: 'owasp' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((/** @type {any} */ e) => e.includes('ID')));
  });

  it('rejects input without content', () => {
    const result = manager.validateInput({ id: 'doc-1', source: 'owasp' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((/** @type {any} */ e) => e.includes('content')));
  });

  it('rejects input with unknown source', () => {
    const result = manager.validateInput({ id: 'doc-1', content: 'Test', source: 'unknown' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((/** @type {any} */ e) => e.includes('Unknown')));
  });
});

describe('EmbeddingProviderFactory', () => {
  it('creates null provider by default', () => {
    const factory = new EmbeddingProviderFactory({ logger });
    const provider = factory.create({ embeddingProvider: 'null' });
    assert.equal(provider.id, 'null');
  });

  it('lists registered providers', () => {
    const factory = new EmbeddingProviderFactory({ logger });
    const providers = factory.listProviders();
    assert.ok(providers.includes('openai'));
    assert.ok(providers.includes('nvidia-nim'));
  });

  it('falls back to null for unknown provider', () => {
    const factory = new EmbeddingProviderFactory({ logger });
    const provider = factory.create({ embeddingProvider: 'unknown' });
    assert.equal(provider.id, 'null');
  });
});

describe('VectorStoreFactory', () => {
  it('creates null store by default', () => {
    const factory = new VectorStoreFactory({ logger });
    const store = factory.create({ vectorStoreProvider: 'null' });
    assert.equal(store.id, 'null');
  });

  it('lists registered providers', () => {
    const factory = new VectorStoreFactory({ logger });
    const providers = factory.listProviders();
    assert.ok(providers.includes('mongo-atlas'));
    assert.ok(providers.includes('null'));
  });
});

describe('NullRagProvider', () => {
  /** @type {any} */
  let provider;

  beforeEach(() => {
    provider = new NullRagProvider();
  });

  it('has null id', () => {
    assert.equal(provider.id, 'null');
  });

  it('returns empty array from retrieve', async () => {
    const result = await provider.retrieve({ query: 'test' });
    assert.deepEqual(result, []);
  });

  it('returns zero from ingest', async () => {
    const result = await provider.ingest({ id: '1', content: 'test', source: 'custom' });
    assert.equal(result.chunkCount, 0);
  });

  it('returns zero from countBySource', async () => {
    const result = await provider.countBySource('owasp');
    assert.equal(result, 0);
  });

  it('does not throw from deleteBySource', async () => {
    await provider.deleteBySource('owasp');
  });
});

describe('SemanticRagProvider', () => {
  it('initializes successfully', async () => {
    const provider = new SemanticRagProvider({
      embeddingProvider: createMockEmbeddingProvider(),
      vectorStore: new NullVectorStore(),
      logger
    });

    await provider.initialize();
    assert.equal(provider.id, 'semantic-rag');
  });

  it('ingests document and chunks it', async () => {
    const provider = new SemanticRagProvider({
      embeddingProvider: createMockEmbeddingProvider(),
      vectorStore: new NullVectorStore(),
      logger
    });

    const result = await provider.ingest({
      id: 'doc-1',
      content: 'This is a test document with some content that should be chunked.',
      source: 'owasp',
      metadata: { version: '1.0' }
    });

    assert.ok(result.chunkCount > 0);
  });

  it('retrieves relevant documents', async () => {
    const provider = new SemanticRagProvider({
      embeddingProvider: createMockEmbeddingProvider(),
      vectorStore: new NullVectorStore(),
      logger
    });

    await provider.ingest({
      id: 'doc-1',
      content: 'OWASP Top 10 security vulnerabilities include injection, broken authentication, and cross-site scripting.',
      source: 'owasp'
    });

    const results = await provider.retrieve({
      query: 'What are security vulnerabilities?',
      limit: 5
    });

    assert.ok(Array.isArray(results));
  });

  it('validates ingest input', async () => {
    const provider = new SemanticRagProvider({
      embeddingProvider: createMockEmbeddingProvider(),
      vectorStore: new NullVectorStore(),
      logger
    });

    await assert.rejects(
      () => provider.ingest({ id: '', content: 'test', source: 'owasp' }),
      /Document ID is required/
    );
  });

  it('filters results by source', async () => {
    const provider = new SemanticRagProvider({
      embeddingProvider: createMockEmbeddingProvider(),
      vectorStore: new NullVectorStore(),
      logger
    });

    await provider.ingest({
      id: 'doc-1',
      content: 'OWASP content here.',
      source: 'owasp'
    });

    const results = await provider.retrieve({
      query: 'security',
      sources: ['owasp'],
      limit: 5
    });

    assert.ok(Array.isArray(results));
  });
});
