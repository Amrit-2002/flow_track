import { Router } from 'express';
import { attachmentController } from './attachment.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

// Downloading public or static attachment files
router.get('/:id/download', attachmentController.download);

// Protected routes
router.use(requireAuth);
router.delete('/:id', attachmentController.delete);

export const attachmentRouter = router;
