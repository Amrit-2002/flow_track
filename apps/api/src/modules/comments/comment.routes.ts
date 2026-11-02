import { Router } from 'express';
import { commentController } from './comment.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';
import { updateCommentSchema } from '@flowtrack/shared';

const router = Router();

router.use(requireAuth);

router.patch('/:id', validateRequest(updateCommentSchema), commentController.update);
router.delete('/:id', commentController.delete);

export const commentRouter = router;
