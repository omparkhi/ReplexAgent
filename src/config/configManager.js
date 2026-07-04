import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().default('info'),
  REQUEST_BODY_LIMIT: z.string().default('1mb'),
  MEMORY_PROVIDER: z.enum(['mongodb', 'in-memory']).optional(),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017'),
  MONGODB_DATABASE: z.string().default('replex_agent_runtime'),
  MONGODB_MEMORY_COLLECTION: z.string().default('agent_memories'),
  LLM_PROVIDER: z.string().default('null'),
  LLM_API_KEY: z.string().default(''),
  LLM_MODEL: z.string().default(''),
  LLM_BASE_URL: z.string().optional(),
  LLM_MAX_TOKENS: z.coerce.number().int().positive().default(4096),
  LLM_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),
  LLM_TIMEOUT: z.coerce.number().int().positive().default(60000),
  LLM_MAX_RETRIES: z.coerce.number().int().nonnegative().default(3),
  LLM_RATE_LIMIT_RPM: z.coerce.number().int().positive().optional(),
  RAG_PROVIDER: z.string().default('null'),
  EMBEDDING_PROVIDER: z.string().default('null'),
  EMBEDDING_API_KEY: z.string().default(''),
  EMBEDDING_BASE_URL: z.string().optional(),
  EMBEDDING_MODEL: z.string().optional(),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1536),
  VECTOR_STORE_PROVIDER: z.string().default('null'),
  RAG_COLLECTION_NAME: z.string().default('rag_vectors'),
  RAG_DEFAULT_TOP_K: z.coerce.number().int().positive().default(5),
  RAG_MIN_SCORE: z.coerce.number().min(0).max(1).default(0.3)
});

export class ConfigManager {
  constructor() {
    const parsed = envSchema.parse(process.env);

    this.config = Object.freeze({
      nodeEnv: parsed.NODE_ENV,
      port: parsed.PORT,
      logLevel: parsed.LOG_LEVEL,
      requestBodyLimit: parsed.REQUEST_BODY_LIMIT,
      memoryProvider: parsed.MEMORY_PROVIDER ?? (parsed.NODE_ENV === 'test' ? 'in-memory' : 'mongodb'),
      mongoUri: parsed.MONGODB_URI,
      mongoDatabase: parsed.MONGODB_DATABASE,
      mongoMemoryCollection: parsed.MONGODB_MEMORY_COLLECTION,
      llmProvider: parsed.LLM_PROVIDER,
      llmApiKey: parsed.LLM_API_KEY,
      llmModel: parsed.LLM_MODEL,
      llmBaseUrl: parsed.LLM_BASE_URL,
      llmMaxTokens: parsed.LLM_MAX_TOKENS,
      llmTemperature: parsed.LLM_TEMPERATURE,
      llmTimeout: parsed.LLM_TIMEOUT,
      llmMaxRetries: parsed.LLM_MAX_RETRIES,
      llmRateLimitRpm: parsed.LLM_RATE_LIMIT_RPM,
      ragProvider: parsed.RAG_PROVIDER,
      embeddingProvider: parsed.EMBEDDING_PROVIDER,
      embeddingApiKey: parsed.EMBEDDING_API_KEY,
      embeddingBaseUrl: parsed.EMBEDDING_BASE_URL,
      embeddingModel: parsed.EMBEDDING_MODEL,
      embeddingDimensions: parsed.EMBEDDING_DIMENSIONS,
      vectorStoreProvider: parsed.VECTOR_STORE_PROVIDER,
      ragCollectionName: parsed.RAG_COLLECTION_NAME,
      ragDefaultTopK: parsed.RAG_DEFAULT_TOP_K,
      ragMinScore: parsed.RAG_MIN_SCORE
    });
  }

  /**
   * @template {keyof import('../domain/interfaces/config.interface.js').RuntimeConfig} K
   * @param {K} key
   * @returns {import('../domain/interfaces/config.interface.js').RuntimeConfig[K]}
   */
  get(key) {
    return this.config[key];
  }

  /**
   * @returns {import('../domain/interfaces/config.interface.js').RuntimeConfig}
   */
  all() {
    return this.config;
  }
}
