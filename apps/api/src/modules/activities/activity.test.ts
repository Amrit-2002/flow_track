import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../shared/prisma';
import { generateAccessToken } from '../auth/auth.utils';
import { UserRole, ProjectMemberRole } from '@flowtrack/shared';

describe('Activity History API Integration Tests', () => {
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

  const outsiderToken = generateAccessToken({
    userId: 'outsider-1',
    email: 'outsider@flowtrack.dev',
    role: UserRole.USER,
    name: 'Outsider User',
  });

  const sampleProject = {
    id: 'proj-1',
    name: 'Core Platform',
    key: 'CORE',
  };

  const sampleIssue = {
    id: 'issue-1',
    projectId: 'proj-1',
    title: 'Implement Multi-factor Auth',
  };

  const sampleActivities = [
    {
      id: 'act-1',
      issueId: 'issue-1',
      userId: 'user-1',
      action: 'STATUS_CHANGED',
      oldValue: 'To Do',
      newValue: 'In Progress',
      createdAt: new Date('2026-11-02T10:00:00Z'),
      user: {
        id: 'user-1',
        name: 'Team Member',
      },
    },
    {
      id: 'act-2',
      issueId: 'issue-1',
      userId: 'admin-1',
      action: 'CREATED',
      oldValue: null,
      newValue: 'Implement Multi-factor Auth',
      createdAt: new Date('2026-11-02T09:00:00Z'),
      user: {
        id: 'admin-1',
        name: 'Admin User',
      },
    },
  ];

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
      return {
        id: 'outsider-1',
        email: 'outsider@flowtrack.dev',
        name: 'Outsider User',
        role: 'USER',
        themePreference: 'light',
      } as any;
    }) as any));
  });

  describe('GET /api/v1/issues/:id/activities', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/v1/issues/issue-1/activities');
      expect(res.status).toBe(401);
    });

    it('returns 404 when issue is not found', async () => {
      vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/issues/missing-issue/activities')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('Issue not found');
    });

    it('returns 403 when user is not a member of the project', async () => {
      vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue(sampleIssue as any);
      vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/issues/issue-1/activities')
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('do not have access');
    });

    it('returns 200 with chronological issue activities for project members', async () => {
      vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue(sampleIssue as any);
      vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue({
        id: 'pm-1',
        projectId: 'proj-1',
        userId: 'user-1',
        role: ProjectMemberRole.MEMBER,
      } as any);
      vi.spyOn(prisma.activity, 'findMany').mockResolvedValue(sampleActivities as any);

      const res = await request(app)
        .get('/api/v1/issues/issue-1/activities')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].action).toBe('STATUS_CHANGED');
      expect(res.body.data[0].user.name).toBe('Team Member');
    });
  });

  describe('GET /api/v1/projects/:id/activities', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/v1/projects/proj-1/activities');
      expect(res.status).toBe(401);
    });

    it('returns 404 when project is not found', async () => {
      vi.spyOn(prisma.project, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/projects/missing-proj/activities')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('Project not found');
    });

    it('returns 403 when user does not belong to project', async () => {
      vi.spyOn(prisma.project, 'findUnique').mockResolvedValue(sampleProject as any);
      vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/projects/proj-1/activities')
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('do not have access');
    });

    it('returns 200 with project activities feed for members and admins', async () => {
      vi.spyOn(prisma.project, 'findUnique').mockResolvedValue(sampleProject as any);
      vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue({
        id: 'pm-1',
        projectId: 'proj-1',
        userId: 'user-1',
        role: ProjectMemberRole.MEMBER,
      } as any);
      vi.spyOn(prisma.activity, 'findMany').mockResolvedValue(sampleActivities as any);

      const res = await request(app)
        .get('/api/v1/projects/proj-1/activities')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[1].action).toBe('CREATED');
    });
  });
});

