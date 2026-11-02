import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { notificationController } from './notification.controller.js';

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

notificationRouter.get('/', (req, res, next) =>
  notificationController.listNotifications(req, res, next)
);

notificationRouter.post('/read-all', (req, res, next) =>
  notificationController.markAllAsRead(req, res, next)
);

notificationRouter.patch('/:id/read', (req, res, next) =>
  notificationController.markAsRead(req, res, next)
);

notificationRouter.delete('/:id', (req, res, next) =>
  notificationController.deleteNotification(req, res, next)
);
