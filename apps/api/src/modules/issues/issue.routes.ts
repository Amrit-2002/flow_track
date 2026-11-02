import { Router } from 'express';
import { issueController } from './issue.controller.js';
import { commentController } from '../comments/comment.controller.js';
import { attachmentController } from '../attachments/attachment.controller.js';
import { timeLogController } from '../time-logs/time-log.controller.js';
import { activityController } from '../activities/activity.controller.js';
import { upload } from '../attachments/storage.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';
import { transitionIssueSchema, createTimeLogSchema } from '@flowtrack/shared';

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

// Nested comment routes
router.get('/:issueId/comments', commentController.list);
router.post('/:issueId/comments', upload.array('files', 5), commentController.create);

// Nested attachment routes
router.post('/:issueId/attachments', upload.single('file'), attachmentController.upload);

// Nested time log routes
router.get('/:issueId/time-logs', timeLogController.list);
router.post('/:issueId/time-logs', validateRequest(createTimeLogSchema), timeLogController.create);

// Nested activity history routes
router.get('/:id/activities', (req, res, next) => activityController.listForIssue(req, res, next));
router.get('/:issueId/activities', (req, res, next) => activityController.listForIssue(req, res, next));

export const issueRouter = router;
export default router;
