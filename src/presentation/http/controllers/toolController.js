import { z } from 'zod';

const executeToolSchema = z.object({
  args: z.record(z.unknown()).optional(),
  context: z.record(z.unknown()).optional()
});

const listToolsSchema = z.object({
  tags: z.array(z.string()).optional(),
  permission: z.string().optional()
}).optional();

/**
 * @param {import('../../../application/AgentRuntime.js').AgentRuntime} runtime
 */
export function createToolController(runtime) {
  return {
    /**
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     */
    list(req, res) {
      const filters = listToolsSchema.parse(req.query);
      res.json({ tools: runtime.listTools(filters) });
    },

    /**
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     */
    async execute(req, res) {
      const body = executeToolSchema.parse(req.body);
      const result = await runtime.executeTool({
        name: String(req.params.toolName),
        args: body.args,
        context: body.context
      });

      res.json(result);
    },

    /**
     * @param {import('express').Request} _req
     * @param {import('express').Response} res
     */
    listMcp(_req, res) {
      res.json({ tools: runtime.listToolsMcp() });
    }
  };
}
