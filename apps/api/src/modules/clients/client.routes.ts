import { Router } from 'express';
import { clientController } from './client.controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', clientController.list);
router.post('/', clientController.create);
router.get('/:id', clientController.getById);
router.patch('/:id', clientController.update);
router.delete('/:id', clientController.delete);

export const clientRouter = router;
export default router;
