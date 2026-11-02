import { Request, Response, NextFunction } from 'express';
import { notificationService } from './notification.service.js';

export class NotificationController {
  async listNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const unreadOnly = req.query.unreadOnly === 'true';

      const result = await notificationService.getUserNotifications(req.user!.id, {
        page,
        limit,
        unreadOnly,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const notification = await notificationService.markAsRead(req.user!.id, id);

      res.status(200).json({
        success: true,
        data: notification,
      });
    } catch (err) {
      next(err);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await notificationService.markAllAsRead(req.user!.id);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await notificationService.deleteNotification(req.user!.id, id);

      res.status(200).json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationController = new NotificationController();

