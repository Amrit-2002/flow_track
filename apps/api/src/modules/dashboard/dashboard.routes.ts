import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

// GET /api/v1/dashboard/stats - Fetch aggregated platform or project analytics
router.get('/stats', requireAuth, dashboardController.getStats);

export const dashboardRouter = router;
export default router;
