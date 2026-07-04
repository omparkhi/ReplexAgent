/**
 * @typedef {import('../../domain/interfaces/rag.interface.js').KnowledgeSource} KnowledgeSource
 * @typedef {import('../../domain/interfaces/rag.interface.js').RagIngestInput} RagIngestInput
 */

/**
 * Metadata and configuration for knowledge sources.
 */
const KNOWLEDGE_SOURCE_CONFIG = {
  'audit-report': {
    name: 'Audit Reports',
    description: 'Security and accessibility audit findings',
    priority: 10,
    chunkSize: 1200,
    chunkOverlap: 300
  },
  'seo-knowledge': {
    name: 'SEO Knowledge',
    description: 'Search engine optimization best practices',
    priority: 20,
    chunkSize: 1000,
    chunkOverlap: 200
  },
  'accessibility-docs': {
    name: 'Accessibility Documentation',
    description: 'WCAG guidelines and accessibility standards',
    priority: 30,
    chunkSize: 1000,
    chunkOverlap: 200
  },
  'owasp': {
    name: 'OWASP',
    description: 'Open Web Application Security Project guidelines',
    priority: 15,
    chunkSize: 1200,
    chunkOverlap: 300
  },
  'lighthouse-docs': {
    name: 'Google Lighthouse',
    description: 'Lighthouse performance and audit documentation',
    priority: 25,
    chunkSize: 1000,
    chunkOverlap: 200
  },
  'schema-org': {
    name: 'Schema.org',
    description: 'Structured data vocabulary and schemas',
    priority: 35,
    chunkSize: 800,
    chunkOverlap: 150
  },
  'custom': {
    name: 'Custom',
    description: 'User-provided knowledge',
    priority: 50,
    chunkSize: 1000,
    chunkOverlap: 200
  }
};

/**
 * Manages knowledge source metadata and configuration.
 */
export class KnowledgeSourceManager {
  /** @type {Map<KnowledgeSource, {name: string, description: string, priority: number, chunkSize: number, chunkOverlap: number}>} */
  #sources;

  constructor() {
    this.#sources = new Map(/** @type {[KnowledgeSource, any][]} */ (Object.entries(KNOWLEDGE_SOURCE_CONFIG)));
  }

  /**
   * Get configuration for a knowledge source.
   * @param {KnowledgeSource} source
   * @returns {typeof KNOWLEDGE_SOURCE_CONFIG[KnowledgeSource] | undefined}
   */
  getConfig(source) {
    return this.#sources.get(source);
  }

  /**
   * Get all registered source types.
   * @returns {KnowledgeSource[]}
   */
  listSources() {
    return [...this.#sources.keys()];
  }

  /**
   * Get chunking config for a source.
   * @param {KnowledgeSource} source
   * @returns {{chunkSize: number, chunkOverlap: number}}
   */
  getChunkingConfig(source) {
    const config = this.#sources.get(source);
    return {
      chunkSize: config?.chunkSize ?? 1000,
      chunkOverlap: config?.chunkOverlap ?? 200
    };
  }

  /**
   * Validate a document for ingestion.
   * @param {RagIngestInput} input
   * @returns {{valid: boolean, errors: string[]}}
   */
  validateInput(input) {
    const errors = [];

    if (!input.id || input.id.trim().length === 0) {
      errors.push('Document ID is required');
    }

    if (!input.content || input.content.trim().length === 0) {
      errors.push('Document content is required');
    }

    if (!input.source) {
      errors.push('Knowledge source is required');
    } else if (!this.#sources.has(input.source)) {
      errors.push(`Unknown knowledge source: ${input.source}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get source statistics description.
   * @param {KnowledgeSource} source
   * @returns {string}
   */
  describe(source) {
    const config = this.#sources.get(source);
    if (!config) return `Unknown source: ${source}`;
    return `${config.name}: ${config.description}`;
  }
}
