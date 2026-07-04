import { randomUUID } from 'node:crypto';

/**
 * @typedef {import('../../domain/interfaces/rag.interface.js').DocumentChunk} DocumentChunk
 * @typedef {import('../../domain/interfaces/rag.interface.js').ChunkingConfig} ChunkingConfig
 * @typedef {import('../../domain/interfaces/rag.interface.js').KnowledgeSource} KnowledgeSource
 */

const DEFAULT_CONFIG = {
  chunkSize: 1000,
  chunkOverlap: 200,
  strategy: 'recursive'
};

const DEFAULT_SEPARATORS = ['\n\n', '\n', '. ', '! ', '? ', '; ', ', ', ' ', ''];

export class DocumentChunker {
  /**
   * @param {object} [options]
   * @param {Partial<ChunkingConfig>} [options.config]
   */
  constructor(options) {
    this.config = { ...DEFAULT_CONFIG, ...options?.config };
  }

  /**
   * Chunk a document into smaller pieces.
   * @param {object} input
   * @param {string} input.documentId - Document identifier
   * @param {string} input.content - Full document content
   * @param {KnowledgeSource} input.source - Knowledge source type
   * @param {Record<string, unknown>} [input.metadata] - Additional metadata
   * @returns {DocumentChunk[]}
   */
  chunk(input) {
    const { documentId, content, source, metadata } = input;

    if (!content || content.trim().length === 0) {
      return [];
    }

    let rawChunks;

    switch (this.config.strategy) {
      case 'fixed':
        rawChunks = this.#fixedChunking(content);
        break;
      case 'semantic':
        rawChunks = this.#semanticChunking(content);
        break;
      case 'recursive':
      default:
        rawChunks = this.#recursiveChunking(content, this.config.separators ?? DEFAULT_SEPARATORS);
        break;
    }

    return rawChunks.map((chunkContent, index) => ({
      id: randomUUID(),
      content: chunkContent.trim(),
      documentId,
      source,
      chunkIndex: index,
      totalChunks: rawChunks.length,
      metadata: {
        ...metadata,
        chunkSize: chunkContent.length,
        strategy: this.config.strategy
      }
    })).filter(chunk => chunk.content.length > 0);
  }

  /**
   * Fixed-size chunking with overlap.
   * @param {string} content
   * @returns {string[]}
   */
  #fixedChunking(content) {
    const chunks = [];
    const { chunkSize, chunkOverlap } = this.config;
    let start = 0;

    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length);
      chunks.push(content.slice(start, end));
      start = end - chunkOverlap;
      if (start + chunkOverlap >= content.length) break;
    }

    return chunks;
  }

  /**
   * Recursive chunking by separators.
   * @param {string} content
   * @param {string[]} separators
   * @returns {string[]}
   */
  #recursiveChunking(content, separators) {
    if (content.length <= this.config.chunkSize) {
      return [content];
    }

    const separator = separators[0] ?? '';
    const remainingSeparators = separators.slice(1);

    if (!separator) {
      return this.#fixedChunking(content);
    }

    const parts = content.split(separator);
    const chunks = [];
    let currentChunk = '';

    for (const part of parts) {
      const testChunk = currentChunk ? currentChunk + separator + part : part;

      if (testChunk.length <= this.config.chunkSize) {
        currentChunk = testChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }

        if (part.length > this.config.chunkSize && remainingSeparators.length > 0) {
          const subChunks = this.#recursiveChunking(part, remainingSeparators);
          chunks.push(...subChunks);
          currentChunk = '';
        } else {
          currentChunk = part;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return this.#applyOverlap(chunks);
  }

  /**
   * Semantic chunking (paragraph-based with size limits).
   * @param {string} content
   * @returns {string[]}
   */
  #semanticChunking(content) {
    const paragraphs = content.split(/\n\s*\n/);
    const chunks = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if (paragraph.trim().length === 0) continue;

      if (currentChunk.length + paragraph.length + 2 <= this.config.chunkSize) {
        currentChunk = currentChunk ? currentChunk + '\n\n' + paragraph : paragraph;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }

        if (paragraph.length > this.config.chunkSize) {
          const subChunks = this.#recursiveChunking(paragraph, DEFAULT_SEPARATORS);
          chunks.push(...subChunks);
          currentChunk = '';
        } else {
          currentChunk = paragraph;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Apply overlap between consecutive chunks.
   * @param {string[]} chunks
   * @returns {string[]}
   */
  #applyOverlap(chunks) {
    if (this.config.chunkOverlap <= 0 || chunks.length <= 1) {
      return chunks;
    }

    const overlapped = [chunks[0]];

    for (let i = 1; i < chunks.length; i++) {
      const prevChunk = chunks[i - 1];
      const overlapText = prevChunk.slice(-this.config.chunkOverlap);
      overlapped.push(overlapText + chunks[i]);
    }

    return overlapped;
  }
}
