import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';

/**
 * @param {ReturnType<import('../controllers/agentController.js').createAgentController>} controller
 */
export function createAgentRouter(controller) {
  const router = Router();
  router.get('/agents', controller.list);
  router.post('/agents/:agentId/runs', asyncHandler(controller.run));
  return router;
}
