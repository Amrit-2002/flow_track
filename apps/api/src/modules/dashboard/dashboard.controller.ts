import { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service';

export class DashboardController {
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;

      const stats = await dashboardService.getStats(
        { id: user.id, role: user.role },
        projectId
      );

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
