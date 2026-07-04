import { z } from 'zod';

const memoryTypeSchema = z.enum([
  'conversation_history',
  'agent_response',
  'report',
  'previous_audit',
  'previous_recommendation',
  'preference'
]);

const vectorReferenceSchema = z.object({
  provider: z.string().optional(),
  indexName: z.string().optional(),
  externalId: z.string().optional(),
  dimensions: z.number().int().positive().optional(),
  metadata: z.record(z.unknown()).optional()
}).optional();

const saveMemorySchema = z.object({
  key: z.string().min(1).optional(),
  type: memoryTypeSchema,
  value: z.unknown(),
  namespace: z.string().optional(),
  agentId: z.string().optional(),
  conversationId: z.string().optional(),
  userId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
  vector: vectorReferenceSchema
});

const searchMemorySchema = z.object({
  text: z.string().optional(),
  type: z.union([memoryTypeSchema, z.array(memoryTypeSchema)]).optional(),
  namespace: z.string().optional(),
  agentId: z.string().optional(),
  conversationId: z.string().optional(),
  userId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  filter: z.record(z.unknown()).optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt']).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional()
});

const deleteMemorySchema = z.object({
  key: z.string().min(1).optional(),
  query: searchMemorySchema.optional()
}).refine((value) => value.key || value.query, {
  message: 'Either key or query is required'
});

const getRecentSchema = z.object({
  type: z.union([memoryTypeSchema, z.array(memoryTypeSchema)]).optional(),
  namespace: z.string().optional(),
  agentId: z.string().optional(),
  conversationId: z.string().optional(),
  userId: z.string().optional(),
  limit: z.number().int().positive().max(100).optional()
});

const countMemorySchema = z.object({
  text: z.string().optional(),
  type: z.union([memoryTypeSchema, z.array(memoryTypeSchema)]).optional(),
  namespace: z.string().optional(),
  agentId: z.string().optional(),
  conversationId: z.string().optional(),
  userId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  filter: z.record(z.unknown()).optional()
});

const bulkSaveMemorySchema = z.object({
  records: z.array(saveMemorySchema).min(1).max(100)
});

/**
 * @param {import('../../../application/memory/MemoryEngine.js').MemoryEngine} memoryEngine
 */
export function createMemoryController(memoryEngine) {
  return {
    /**
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     */
    async saveMemory(req, res) {
      const body = /** @type {import('../../../domain/interfaces/memory.interface.js').SaveMemoryInput} */ (saveMemorySchema.parse(req.body));
      const memory = await memoryEngine.saveMemory(body);
      res.status(201).json({ memory });
    },

    /**
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     */
    async searchMemory(req, res) {
      const body = searchMemorySchema.parse(req.body);
      const memories = await memoryEngine.searchMemory(body);
      res.json({ memories });
    },

    /**
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     */
    async deleteMemory(req, res) {
      const body = deleteMemorySchema.parse(req.body);
      const result = await memoryEngine.deleteMemory(body);
      res.json(result);
    },

    /**
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     */
    async getRecent(req, res) {
      const body = getRecentSchema.parse(req.body);
      const memories = await memoryEngine.getRecent(body);
      res.json({ memories });
    },

    /**
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     */
    async countMemory(req, res) {
      const body = countMemorySchema.parse(req.body ?? {});
      const stats = await memoryEngine.countMemory(body);
      res.json({ stats });
    },

    /**
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     */
    async bulkSaveMemory(req, res) {
      const body = bulkSaveMemorySchema.parse(req.body);
      const input = /** @type {import('../../../domain/interfaces/memory.interface.js').BulkSaveMemoryInput} */ ({ records: body.records });
      const result = await memoryEngine.bulkSaveMemory(input);
      res.status(201).json(result);
    }
  };
}
