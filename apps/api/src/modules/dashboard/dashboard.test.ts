import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../shared/prisma';
import { generateAccessToken } from '../auth/auth.utils';
import { UserRole, IssueType } from '@flowtrack/shared';

describe('Dashboard Analytics API Integration Tests', () => {
  const adminToken = generateAccessToken({
    userId: 'admin-1',
    email: 'admin@flowtrack.dev',
    role: UserRole.ADMIN,
    name: 'Admin User',
  });

  const userToken = generateAccessToken({
    userId: 'user-1',
    email: 'user@flowtrack.dev',
    role: UserRole.USER,
    name: 'Standard User',
  });

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(prisma.user, 'findFirst').mockImplementation(((async ({ where }: any) => {
      if (where.id === 'admin-1') {
        return {
          id: 'admin-1',
          email: 'admin@flowtrack.dev',
          name: 'Admin User',
          role: 'ADMIN',
          themePreference: 'dark',
        } as any;
      }
      return {
        id: 'user-1',
        email: 'user@flowtrack.dev',
        name: 'Standard User',
        role: 'USER',
        themePreference: 'light',
      } as any;
    }) as any));
  });

  describe('GET /api/v1/dashboard/stats', () => {
    it('returns 401 Unauthorized when no authentication token is provided', async () => {
      const res = await request(app).get('/api/v1/dashboard/stats');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 200 with complete aggregated dashboard statistics for an Admin', async () => {
      vi.spyOn(prisma.status, 'findMany').mockResolvedValue([
        { id: 'stat-1', name: 'To Do', order: 1 } as any,
        { id: 'stat-2', name: 'In Progress', order: 2 } as any,
        { id: 'stat-3', name: 'Done', order: 3 } as any,
      ]);

      vi.spyOn(prisma.issue, 'count').mockResolvedValue(15);

      vi.spyOn(prisma.issue, 'groupBy').mockImplementation(((args: any) => {
        if (args.by.includes('statusId')) {
          return Promise.resolve([
            { statusId: 'stat-1', _count: { id: 5 } },
            { statusId: 'stat-2', _count: { id: 8 } },
            { statusId: 'stat-3', _count: { id: 2 } },
          ]);
        }
        if (args.by.includes('type')) {
          return Promise.resolve([
            { type: IssueType.BUG, _count: { id: 6 } },
            { type: IssueType.FEATURE, _count: { id: 9 } },
          ]);
        }
        if (args.by.includes('assigneeId')) {
          return Promise.resolve([
            { assigneeId: 'user-1', _count: { id: 7 } },
          ]);
        }
        return Promise.resolve([]);
      }) as any);

      vi.spyOn(prisma.user, 'findMany').mockResolvedValue([
        { id: 'user-1', name: 'Developer User' } as any,
      ]);

      vi.spyOn(prisma.timeLog, 'aggregate').mockResolvedValue({
        _sum: { timeSpent: 360 },
      } as any);

      vi.spyOn(prisma.timeLog, 'groupBy').mockResolvedValue([
        { userId: 'user-1', _count: { id: 4 } },
      ] as any);

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'user-1',
        name: 'Developer User',
      } as any);

      vi.spyOn(prisma.activity, 'findMany').mockResolvedValue([
        {
          id: 'act-1',
          issueId: 'iss-1',
          userId: 'user-1',
          action: 'STATUS_CHANGED',
          oldValue: 'To Do',
          newValue: 'In Progress',
          createdAt: new Date('2026-11-01T12:00:00Z'),
          user: { id: 'user-1', name: 'Developer User' },
        } as any,
      ]);

      const res = await request(app)
        .get('/api/v1/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalIssues).toBe(15);
      expect(res.body.data.issuesByStatus).toHaveLength(3);
      expect(res.body.data.issuesByType).toHaveLength(2);
      expect(res.body.data.issuesByUser[0]).toEqual({
        userId: 'user-1',
        userName: 'Developer User',
        count: 7,
      });
      expect(res.body.data.totalTimeMinutes).toBe(360);
      expect(res.body.data.avgTimePerIssueMinutes).toBe(24); // 360 / 15
      // Bottleneck should be In Progress (count 8) since Done is filtered out
      expect(res.body.data.bottleneckStatus.statusName).toBe('In Progress');
      expect(res.body.data.mostActiveUser).toEqual({
        userId: 'user-1',
        userName: 'Developer User',
        timeLogsCount: 4,
      });
      expect(res.body.data.recentActivities).toHaveLength(1);
    });

    it('returns 404 if requested projectId does not exist', async () => {
      vi.spyOn(prisma.project, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/dashboard/stats?projectId=non-existent-proj')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 403 when a standard user attempts to view a project dashboard they are not a member of', async () => {
      vi.spyOn(prisma.project, 'findUnique').mockResolvedValue({
        id: 'proj-secret',
        name: 'Secret Project',
        members: [{ userId: 'other-user', role: 'MEMBER' }],
      } as any);

      const res = await request(app)
        .get('/api/v1/dashboard/stats?projectId=proj-secret')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('scopes statistics to authorized project when projectId is valid', async () => {
      vi.spyOn(prisma.project, 'findUnique').mockResolvedValue({
        id: 'proj-1',
        name: 'Allowed Project',
        members: [{ userId: 'user-1', role: 'MEMBER' }],
      } as any);

      vi.spyOn(prisma.status, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.issue, 'count').mockResolvedValue(3);
      vi.spyOn(prisma.issue, 'groupBy').mockResolvedValue([]);
      vi.spyOn(prisma.timeLog, 'aggregate').mockResolvedValue({ _sum: { timeSpent: 60 } } as any);
      vi.spyOn(prisma.timeLog, 'groupBy').mockResolvedValue([]);
      vi.spyOn(prisma.activity, 'findMany').mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/dashboard/stats?projectId=proj-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalIssues).toBe(3);
      expect(res.body.data.totalTimeMinutes).toBe(60);
      expect(res.body.data.avgTimePerIssueMinutes).toBe(20);
    });
  });
});
