/**
 * @typedef {'conversation_history' | 'agent_response' | 'report' | 'previous_audit' | 'previous_recommendation' | 'preference'} MemoryType
 */

/**
 * Placeholder metadata for future vector database integrations. Embeddings are not generated here.
 * @typedef {object} VectorReference
 * @property {string} [provider]
 * @property {string} [indexName]
 * @property {string} [externalId]
 * @property {number} [dimensions]
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * @typedef {object} MemoryRecord
 * @property {string} key
 * @property {MemoryType} type
 * @property {unknown} value
 * @property {string} [namespace]
 * @property {string} [agentId]
 * @property {string} [conversationId]
 * @property {string} [userId]
 * @property {string[]} tags
 * @property {Record<string, unknown>} metadata
 * @property {VectorReference} [vector]
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {object} SaveMemoryInput
 * @property {string} [key]
 * @property {MemoryType} type
 * @property {unknown} value
 * @property {string} [namespace]
 * @property {string} [agentId]
 * @property {string} [conversationId]
 * @property {string} [userId]
 * @property {string[]} [tags]
 * @property {Record<string, unknown>} [metadata]
 * @property {VectorReference} [vector]
 */

/**
 * @typedef {object} MemorySearchQuery
 * @property {string} [text]
 * @property {MemoryType | MemoryType[]} [type]
 * @property {string} [namespace]
 * @property {string} [agentId]
 * @property {string} [conversationId]
 * @property {string} [userId]
 * @property {string[]} [tags]
 * @property {Record<string, unknown>} [filter]
 * @property {number} [limit]
 * @property {number} [offset]
 * @property {'createdAt' | 'updatedAt'} [sortBy]
 * @property {'asc' | 'desc'} [sortDirection]
 */

/**
 * @typedef {object} DeleteMemoryInput
 * @property {string} [key]
 * @property {MemorySearchQuery} [query]
 */

/**
 * @typedef {object} GetRecentMemoryInput
 * @property {MemoryType | MemoryType[]} [type]
 * @property {string} [namespace]
 * @property {string} [agentId]
 * @property {string} [conversationId]
 * @property {string} [userId]
 * @property {number} [limit]
 */

/**
 * @typedef {object} MemoryDeleteResult
 * @property {number} deletedCount
 */

/**
 * @typedef {MemorySearchQuery} MemoryQuery
 */

/**
 * @typedef {object} MemoryRepository
 * @property {(input: SaveMemoryInput) => Promise<MemoryRecord>} saveMemory
 * @property {(query: MemorySearchQuery) => Promise<MemoryRecord[]>} searchMemory
 * @property {(input: DeleteMemoryInput) => Promise<MemoryDeleteResult>} deleteMemory
 * @property {(input: GetRecentMemoryInput) => Promise<MemoryRecord[]>} getRecent
 */

/**
 * @typedef {object} MemoryCountStats
 * @property {number} total
 * @property {Record<MemoryType, number>} byType
 * @property {Record<string, number>} byNamespace
 */

/**
 * @typedef {object} BulkSaveMemoryInput
 * @property {SaveMemoryInput[]} records
 */

/**
 * @typedef {object} BulkSaveMemoryResult
 * @property {MemoryRecord[]} saved
 * @property {number} count
 */

/**
 * @typedef {MemoryRepository & {
 *   save: (record: Partial<SaveMemoryInput> & { key: string, value: unknown }) => Promise<void>,
 *   get: (key: string) => Promise<MemoryRecord | null>,
 *   search: (query: MemorySearchQuery) => Promise<MemoryRecord[]>,
 *   delete: (key: string) => Promise<void>
 * }} MemoryStore
 */

/**
 * @typedef {object} MemoryRepositoryExtended
 * @property {(input: SaveMemoryInput) => Promise<MemoryRecord>} saveMemory
 * @property {(query: MemorySearchQuery) => Promise<MemoryRecord[]>} searchMemory
 * @property {(input: DeleteMemoryInput) => Promise<MemoryDeleteResult>} deleteMemory
 * @property {(input: GetRecentMemoryInput) => Promise<MemoryRecord[]>} getRecent
 * @property {(query?: MemorySearchQuery) => Promise<MemoryCountStats>} countMemory
 * @property {(input: BulkSaveMemoryInput) => Promise<BulkSaveMemoryResult>} bulkSaveMemory
 */

export {};
