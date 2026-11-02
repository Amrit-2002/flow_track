import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../shared/prisma';
import { generateAccessToken } from '../auth/auth.utils';
import { UserRole, ProjectMemberRole } from '@flowtrack/shared';

describe('Time Log API Integration Tests', () => {
  const adminToken = generateAccessToken({
    userId: 'admin-1',
    email: 'admin@flowtrack.dev',
    role: UserRole.ADMIN,
    name: 'Admin User',
  });

  const memberToken = generateAccessToken({
    userId: 'user-1',
    email: 'user1@flowtrack.dev',
    role: UserRole.USER,
    name: 'Team Member',
  });

  const otherMemberToken = generateAccessToken({
    userId: 'user-2',
    email: 'user2@flowtrack.dev',
    role: UserRole.USER,
    name: 'Other Member',
  });

  const outsiderToken = generateAccessToken({
    userId: 'outsider-1',
    email: 'outsider@flowtrack.dev',
    role: UserRole.USER,
    name: 'Outsider User',
  });

  const sampleIssue = {
    id: 'issue-1',
    projectId: 'proj-1',
    title: 'Implement OAuth Login',
    reporterId: 'admin-1',
    assigneeId: 'user-1',
  };

  const sampleTimeLog = {
    id: 'tl-1',
    issueId: 'issue-1',
    userId: 'user-1',
    timeSpent: 150, // 2h 30m
    description: 'Implemented Google provider strategy and unit tests',
    logDate: new Date('2026-11-01T00:00:00Z'),
    createdAt: new Date('2026-11-01T14:30:00Z'),
    updatedAt: new Date('2026-11-01T14:30:00Z'),
    user: {
      id: 'user-1',
      name: 'Team Member',
      email: 'user1@flowtrack.dev',
      role: 'USER',
      themePreference: 'light',
      createdAt: new Date('2026-11-01T09:00:00Z'),
    },
  };

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
      if (where.id === 'user-1') {
        return {
          id: 'user-1',
          email: 'user1@flowtrack.dev',
          name: 'Team Member',
          role: 'USER',
          themePreference: 'light',
        } as any;
      }
      if (where.id === 'user-2') {
        return {
          id: 'user-2',
          email: 'user2@flowtrack.dev',
          name: 'Other Member',
          role: 'USER',
          themePreference: 'light',
        } as any;
      }
      return {
        id: 'outsider-1',
        email: 'outsider@flowtrack.dev',
        name: 'Outsider User',
        role: 'USER',
        themePreference: 'light',
      } as any;
    }) as any));
  });

  describe('GET /api/v1/issues/:issueId/time-logs', () => {
    it('returns 401 when unauthorized', async () => {
      const res = await request(app).get('/api/v1/issues/issue-1/time-logs');
      expect(res.status).toBe(401);
    });

    it('returns 404 when issue does not exist', async () => {
      vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/issues/missing-issue/time-logs')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('Issue not found');
    });

    it('returns 403 when user is not a project member', async () => {
      vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue(sampleIssue as any);
      vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/issues/issue-1/time-logs')
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('do not have access');
    });

    it('returns 200 with time logs and calculated totalMinutes when user has access', async () => {
      vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue(sampleIssue as any);
      vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue({
        id: 'pm-1',
        projectId: 'proj-1',
        userId: 'user-1',
        role: ProjectMemberRole.MEMBER,
      } as any);

      vi.spyOn(prisma.timeLog, 'findMany').mockResolvedValue([
        sampleTimeLog as any,
        {
          ...sampleTimeLog,
          id: 'tl-2',
          timeSpent: 90,
          description: 'Refactored token refresh flow',
        } as any,
      ]);

      const res = await request(app)
        .get('/api/v1/issues/issue-1/time-logs')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.timeLogs).toHaveLength(2);
      expect(res.body.data.totalMinutes).toBe(240); // 150 + 90
      expect(res.body.data.timeLogs[0].timeSpent).toBe(150);
      expect(res.body.data.timeLogs[0].user.name).toBe('Team Member');
    });
  });

  describe('POST /api/v1/issues/:issueId/time-logs', () => {
    it('returns 400 when input validation fails (e.g. timeSpent <= 0)', async () => {
      vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue(sampleIssue as any);
      vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue({
        id: 'pm-1',
        projectId: 'proj-1',
        userId: 'user-1',
        role: ProjectMemberRole.MEMBER,
      } as any);

      const res = await request(app)
        .post('/api/v1/issues/issue-1/time-logs')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          timeSpent: -30,
          logDate: '2026-11-01',
        });

      expect(res.status).toBe(400);
    });

    it('returns 400 when date format is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/issues/issue-1/time-logs')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          timeSpent: 60,
          logDate: '01/11/2026', // invalid, must be YYYY-MM-DD
        });

      expect(res.status).toBe(400);
    });

    it('creates time log and audits activity atomically', async () => {
      vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue(sampleIssue as any);
      vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue({
        id: 'pm-1',
        projectId: 'proj-1',
        userId: 'user-1',
        role: ProjectMemberRole.MEMBER,
      } as any);

      const activityCreateSpy = vi.fn().mockResolvedValue({ id: 'act-1' });
      const timeLogCreateSpy = vi.fn().mockResolvedValue(sampleTimeLog);

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const tx = {
          timeLog: {
            create: timeLogCreateSpy,
          },
          activity: {
            create: activityCreateSpy,
          },
        };
        return callback(tx);
      });

      const res = await request(app)
        .post('/api/v1/issues/issue-1/time-logs')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          timeSpent: 150,
          description: 'Implemented Google provider strategy and unit tests',
          logDate: '2026-11-01',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('tl-1');
      expect(res.body.data.timeSpent).toBe(150);
      expect(activityCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            issueId: 'issue-1',
            userId: 'user-1',
            action: 'TIME_LOGGED',
          }),
        })
      );
    });
  });

  describe('DELETE /api/v1/time-logs/:id', () => {
    it('returns 404 when time log does not exist', async () => {
      vi.spyOn(prisma.timeLog, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/v1/time-logs/missing-log')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(404);
    });

    it('returns 403 when non-author non-admin tries to delete', async () => {
      vi.spyOn(prisma.timeLog, 'findUnique').mockResolvedValue({
        ...sampleTimeLog,
        userId: 'user-1', // belongs to user-1
        issue: { projectId: 'proj-1' },
      } as any);

      vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue({
        role: ProjectMemberRole.MEMBER,
      } as any);

      const res = await request(app)
        .delete('/api/v1/time-logs/tl-1')
        .set('Authorization', `Bearer ${otherMemberToken}`); // user-2

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('do not have permission');
    });

    it('allows author to delete own time log and audits action', async () => {
      vi.spyOn(prisma.timeLog, 'findUnique').mockResolvedValue({
        ...sampleTimeLog,
        userId: 'user-1',
        issue: { projectId: 'proj-1' },
      } as any);

      const deleteSpy = vi.fn().mockResolvedValue(sampleTimeLog);
      const activitySpy = vi.fn().mockResolvedValue({ id: 'act-2' });

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const tx = {
          timeLog: { delete: deleteSpy },
          activity: { create: activitySpy },
        };
        return callback(tx);
      });

      const res = await request(app)
        .delete('/api/v1/time-logs/tl-1')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(deleteSpy).toHaveBeenCalledWith({ where: { id: 'tl-1' } });
      expect(activitySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'TIME_LOG_DELETED',
          }),
        })
      );
    });

    it('allows global admin to delete any time log', async () => {
      vi.spyOn(prisma.timeLog, 'findUnique').mockResolvedValue({
        ...sampleTimeLog,
        userId: 'user-1',
        issue: { projectId: 'proj-1' },
      } as any);

      const deleteSpy = vi.fn().mockResolvedValue(sampleTimeLog);
      const activitySpy = vi.fn().mockResolvedValue({ id: 'act-3' });

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const tx = {
          timeLog: { delete: deleteSpy },
          activity: { create: activitySpy },
        };
        return callback(tx);
      });

      const res = await request(app)
        .delete('/api/v1/time-logs/tl-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
