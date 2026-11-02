import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../shared/prisma';
import { generateAccessToken } from '../auth/auth.utils';
import { UserRole } from '@flowtrack/shared';

describe('Notification API Integration Tests', () => {
  const userToken = generateAccessToken({
    userId: 'user-1',
    email: 'user1@flowtrack.dev',
    role: UserRole.USER,
    name: 'Team Member',
  });

  const otherUserToken = generateAccessToken({
    userId: 'user-2',
    email: 'user2@flowtrack.dev',
    role: UserRole.USER,
    name: 'Other Member',
  });

  const sampleNotification = {
    id: 'notif-1',
    userId: 'user-1',
    type: 'ISSUE_COMMENTED',
    title: 'New comment on Stripe Integration',
    message: 'Alice commented: "Added unit tests"',
    data: { issueId: 'issue-1', projectId: 'proj-1' },
    readAt: null,
    createdAt: new Date('2026-11-01T12:00:00Z'),
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(prisma.user, 'findFirst').mockImplementation(((async ({ where }: any) => {
      if (where.id === 'user-1') {
        return {
          id: 'user-1',
          email: 'user1@flowtrack.dev',
          name: 'Team Member',
          role: 'USER',
          themePreference: 'light',
        } as any;
      }
      return {
        id: 'user-2',
        email: 'user2@flowtrack.dev',
        name: 'Other Member',
        role: 'USER',
        themePreference: 'light',
      } as any;
    }) as any));
  });

  describe('GET /api/v1/notifications', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/v1/notifications');
      expect(res.status).toBe(401);
    });

    it('returns 200 with list of notifications and unreadCount', async () => {
      vi.spyOn(prisma.notification, 'findMany').mockResolvedValue([sampleNotification as any]);
      vi.spyOn(prisma.notification, 'count').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications).toHaveLength(1);
      expect(res.body.data.notifications[0].title).toBe('New comment on Stripe Integration');
      expect(res.body.data.unreadCount).toBe(1);
    });
  });

  describe('PATCH /api/v1/notifications/:id/read', () => {
    it('returns 404 when notification belongs to another user', async () => {
      vi.spyOn(prisma.notification, 'findUnique').mockResolvedValue(sampleNotification as any);

      const res = await request(app)
        .patch('/api/v1/notifications/notif-1/read')
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('Notification not found');
    });

    it('marks notification as read and returns 200', async () => {
      vi.spyOn(prisma.notification, 'findUnique').mockResolvedValue(sampleNotification as any);
      vi.spyOn(prisma.notification, 'update').mockResolvedValue({
        ...sampleNotification,
        readAt: new Date('2026-11-01T12:05:00Z'),
      } as any);

      const res = await request(app)
        .patch('/api/v1/notifications/notif-1/read')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.readAt).toBe('2026-11-01T12:05:00.000Z');
    });
  });

  describe('POST /api/v1/notifications/read-all', () => {
    it('marks all user notifications as read and returns count', async () => {
      vi.spyOn(prisma.notification, 'updateMany').mockResolvedValue({ count: 5 });

      const res = await request(app)
        .post('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(5);
    });
  });

  describe('DELETE /api/v1/notifications/:id', () => {
    it('deletes user notification and returns 200', async () => {
      vi.spyOn(prisma.notification, 'findUnique').mockResolvedValue(sampleNotification as any);
      vi.spyOn(prisma.notification, 'delete').mockResolvedValue(sampleNotification as any);

      const res = await request(app)
        .delete('/api/v1/notifications/notif-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Notification deleted successfully');
    });
  });
});
