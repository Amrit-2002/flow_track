import { Router } from 'express';
import { issueController } from './issue.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';
import { transitionIssueSchema } from '@flowtrack/shared';

const router = Router();

// All issue routes require authentication
router.use(requireAuth);

router.get('/', issueController.list);
router.post('/', issueController.create);
router.get('/:id', issueController.getById);
router.patch('/:id', issueController.update);
router.patch('/:id/status', validateRequest(transitionIssueSchema), issueController.transition);
router.post('/:id/transition', validateRequest(transitionIssueSchema), issueController.transition);
router.delete('/:id', issueController.delete);

export const issueRouter = router;
export default router;
