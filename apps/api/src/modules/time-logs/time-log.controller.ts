import { Request, Response, NextFunction } from 'express';
import { timeLogService } from './time-log.service.js';
import { createTimeLogSchema } from '@flowtrack/shared';

export class TimeLogController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { issueId } = req.params;
      const data = await timeLogService.listTimeLogs(
        { id: user.id, role: user.role },
        issueId
      );

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { issueId } = req.params;
      const validated = createTimeLogSchema.parse(req.body);

      const log = await timeLogService.createTimeLog(
        { id: user.id, role: user.role },
        issueId,
        validated
      );

      res.status(201).json({
        success: true,
        data: log,
        message: 'Time logged successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;

      await timeLogService.deleteTimeLog(
        { id: user.id, role: user.role },
        id
      );

      res.status(200).json({
        success: true,
        message: 'Time log deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const timeLogController = new TimeLogController();
