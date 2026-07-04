import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';

/**
 * @param {ReturnType<import('../controllers/toolController.js').createToolController>} controller
 */
export function createToolRouter(controller) {
  const router = Router();
  router.get('/tools', controller.list);
  router.get('/tools/mcp', controller.listMcp);
  router.post('/tools/:toolName/execute', asyncHandler(controller.execute));
  return router;
}
