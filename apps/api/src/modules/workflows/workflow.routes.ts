import { Router } from 'express';
import { workflowController } from './workflow.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';
import {
  createStatusSchema,
  createTransitionSchema,
  validateTransitionSchema,
  UserRole,
} from '@flowtrack/shared';

const router = Router();

// Statuses routes
router.get('/statuses', requireAuth, workflowController.getStatuses);
router.get('/statuses/:id', requireAuth, workflowController.getStatusById);
router.post(
  '/statuses',
  requireAuth,
  requireRole(UserRole.ADMIN),
  validateRequest(createStatusSchema),
  workflowController.createStatus
);

// Workflow transitions routes
router.get('/transitions', requireAuth, workflowController.getTransitions);
router.post(
  '/validate',
  requireAuth,
  validateRequest(validateTransitionSchema),
  workflowController.validateTransition
);
router.post(
  '/transitions',
  requireAuth,
  requireRole(UserRole.ADMIN),
  validateRequest(createTransitionSchema),
  workflowController.createTransition
);
router.delete(
  '/transitions/:id',
  requireAuth,
  requireRole(UserRole.ADMIN),
  workflowController.deleteTransition
);

export const workflowRouter = router;
