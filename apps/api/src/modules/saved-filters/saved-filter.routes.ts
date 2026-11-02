import { Router } from 'express';
import { savedFilterController } from './saved-filter.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';
import { createSavedFilterSchema } from '@flowtrack/shared';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res, next) => savedFilterController.list(req, res, next));
router.post('/', validateRequest(createSavedFilterSchema), (req, res, next) =>
  savedFilterController.create(req, res, next)
);
router.delete('/:id', (req, res, next) => savedFilterController.delete(req, res, next));

export const savedFilterRouter = router;
export default router;
