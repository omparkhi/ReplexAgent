/**
 * @typedef {object} RuntimeConfig
 * @property {string} nodeEnv
 * @property {number} port
 * @property {string} logLevel
 * @property {string} requestBodyLimit
 * @property {'mongodb' | 'in-memory'} memoryProvider
 * @property {string} mongoUri
 * @property {string} mongoDatabase
 * @property {string} mongoMemoryCollection
 * @property {string} llmProvider
 * @property {string} llmApiKey
 * @property {string} llmModel
 * @property {string} [llmBaseUrl]
 * @property {number} llmMaxTokens
 * @property {number} llmTemperature
 * @property {number} llmTimeout
 * @property {number} llmMaxRetries
 * @property {number} [llmRateLimitRpm]
 * @property {string} ragProvider
 * @property {string} embeddingProvider
 * @property {string} embeddingApiKey
 * @property {string} [embeddingBaseUrl]
 * @property {string} [embeddingModel]
 * @property {number} embeddingDimensions
 * @property {string} vectorStoreProvider
 * @property {string} ragCollectionName
 * @property {number} ragDefaultTopK
 * @property {number} ragMinScore
 */

/**
 * @typedef {object} ConfigManager
 * @property {<K extends keyof RuntimeConfig>(key: K) => RuntimeConfig[K]} get
 * @property {() => RuntimeConfig} all
 */

export {};
