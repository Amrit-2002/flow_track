import { Router } from 'express';
import { issueController } from './issue.controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

// All issue routes require authentication
router.use(requireAuth);

router.get('/', issueController.list);
router.post('/', issueController.create);
router.get('/:id', issueController.getById);
router.patch('/:id', issueController.update);
router.delete('/:id', issueController.delete);

export const issueRouter = router;
export default router;
