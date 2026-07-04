/**
 * @typedef {object} EmbeddingInput
 * @property {string | string[]} text - Text(s) to embed
 */

/**
 * @typedef {object} EmbeddingResult
 * @property {number[][]} embeddings - Array of embedding vectors
 * @property {string} model - Model used for embedding
 * @property {number} dimensions - Dimensionality of embeddings
 * @property {number} [usage] - Token usage count
 */

/**
 * @typedef {object} EmbeddingProvider
 * @property {string} id - Provider identifier
 * @property {(input: EmbeddingInput) => Promise<EmbeddingResult>} embed - Generate embeddings
 * @property {() => number} getDimensions - Get embedding dimensions
 */

/**
 * @typedef {object} EmbeddingProviderConfig
 * @property {string} apiKey - API key
 * @property {string} [baseUrl] - Base URL for API calls
 * @property {string} [model] - Model identifier
 * @property {number} [dimensions] - Expected embedding dimensions
 * @property {number} [timeout] - Request timeout in ms
 * @property {number} [maxRetries] - Max retry attempts
 * @property {number} [batchSize] - Max texts per batch request
 */

export {};
