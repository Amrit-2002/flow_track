import { prisma } from '../../shared/prisma.js';
import { NotFoundError } from '../../shared/errors.js';
import { NotificationDTO, NotificationsListResponseDTO } from '@flowtrack/shared';

export class NotificationService {
  /**
   * Get paginated notifications for the current user and total unread count
   */
  async getUserNotifications(
    userId: string,
    options?: { page?: number; limit?: number; unreadOnly?: boolean }
  ): Promise<NotificationsListResponseDTO> {
    const limit = Math.min(options?.limit || 50, 100);
    const unreadOnly = options?.unreadOnly === true;

    const where = {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({
        where: {
          userId,
          readAt: null,
        },
      }),
    ]);

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data as Record<string, unknown> | null,
        readAt: n.readAt ? n.readAt.toISOString() : null,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<NotificationDTO> {
    const existing = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!existing || existing.userId !== userId) {
      throw new NotFoundError('Notification not found');
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      type: updated.type,
      title: updated.title,
      message: updated.message,
      data: updated.data as Record<string, unknown> | null,
      readAt: updated.readAt ? updated.readAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  /**
   * Mark all unread notifications for a user as read
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  /**
   * Delete a notification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const existing = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!existing || existing.userId !== userId) {
      throw new NotFoundError('Notification not found');
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });
  }
}

export const notificationService = new NotificationService();

