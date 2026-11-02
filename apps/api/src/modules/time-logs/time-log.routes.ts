import { Router } from 'express';
import { timeLogController } from './time-log.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.delete('/:id', timeLogController.delete);

export const timeLogRouter = router;
export default router;
