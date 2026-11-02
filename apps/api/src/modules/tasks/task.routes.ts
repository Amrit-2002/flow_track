import { Router } from 'express';
import { taskController } from './task.controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', taskController.list);
router.post('/', taskController.create);
router.get('/:id', taskController.getById);
router.patch('/:id', taskController.update);
router.delete('/:id', taskController.delete);

export const taskRouter = router;
export default router;

