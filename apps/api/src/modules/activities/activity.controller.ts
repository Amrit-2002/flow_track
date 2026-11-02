import { Request, Response, NextFunction } from 'express';
import { activityService } from './activity.service.js';

export class ActivityController {
  async listForIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id || req.params.issueId;
      const data = await activityService.getIssueActivities(
        { id: user.id, role: user.role },
        id
      );

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async listForProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;
      const data = await activityService.getProjectActivities(
        { id: user.id, role: user.role },
        id
      );

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const activityController = new ActivityController();
