import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';

/**
 * @param {ReturnType<import('../controllers/healthController.js').createHealthController>} controller
 */
export function createHealthRouter(controller) {
  const router = Router();
  router.get('/health', controller.check);
  return router;
}
