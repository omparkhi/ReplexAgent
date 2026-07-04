import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';

/**
 * @param {ReturnType<import('../controllers/memoryController.js').createMemoryController>} controller
 */
export function createMemoryRouter(controller) {
  const router = Router();

  router.post('/memory', asyncHandler(controller.saveMemory));
  router.post('/memory/search', asyncHandler(controller.searchMemory));
  router.post('/memory/delete', asyncHandler(controller.deleteMemory));
  router.post('/memory/recent', asyncHandler(controller.getRecent));
  router.post('/memory/count', asyncHandler(controller.countMemory));
  router.post('/memory/bulk', asyncHandler(controller.bulkSaveMemory));

  return router;
}
