import { z } from 'zod';

const runAgentSchema = z.object({
  input: z.string().min(1),
  conversationId: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

/**
 * @param {import('../../../application/AgentRuntime.js').AgentRuntime} runtime
 */
export function createAgentController(runtime) {
  return {
    /**
     * @param {import('express').Request} _req
     * @param {import('express').Response} res
     */
    list(_req, res) {
      res.json({ agents: runtime.listAgents() });
    },

    /**
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     */
    async run(req, res) {
      const body = runAgentSchema.parse(req.body);
      const result = await runtime.runAgent(String(req.params.agentId), body);
      res.json(result);
    }
  };
}
