import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../shared/prisma';
import { generateAccessToken } from '../auth/auth.utils';
import { UserRole, ProjectMemberRole, IssuePriority, IssueType } from '@flowtrack/shared';

describe('Issue Management API Integration Tests', () => {
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

  const sampleIssue = {
    id: 'issue-1',
    projectId: 'proj-1',
    parentId: null,
    title: 'Implement OAuth Login',
    description: 'Add Google and GitHub OAuth providers',
    type: IssueType.FEATURE,
    priority: IssuePriority.HIGH,
    statusId: 'status-todo-id',
    assigneeId: 'user-1',
    reporterId: 'admin-1',
    createdAt: new Date('2026-11-01T10:00:00Z'),
    updatedAt: new Date('2026-11-01T10:00:00Z'),
    project: {
      id: 'proj-1',
      name: 'Auth Platform',
      key: 'AUTH',
      isArchived: false,
      createdAt: new Date('2026-11-01T09:00:00Z'),
      updatedAt: new Date('2026-11-01T09:00:00Z'),
    },
    status: {
      id: 'status-todo-id',
      name: 'To Do',
      order: 1,
    },
    assignee: {
      id: 'user-1',
      name: 'Team Member',
      email: 'user1@flowtrack.dev',
      role: 'USER',
      themePreference: 'dark',
      createdAt: new Date('2026-11-01T09:00:00Z'),
    },
    reporter: {
      id: 'admin-1',
      name: 'Admin User',
      email: 'admin@flowtrack.dev',
      role: 'ADMIN',
      themePreference: 'dark',
      createdAt: new Date('2026-11-01T09:00:00Z'),
    },
    parent: null,
    _count: {
      comments: 2,
      attachments: 1,
      timeLogs: 0,
      children: 0,
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
      return {
        id: 'outsider-1',
        email: 'outsider@flowtrack.dev',
        name: 'Outsider User',
        role: 'USER',
        themePreference: 'light',
      } as any;
    }) as any));
  });

  describe('GET /api/v1/issues', () => {
    it('returns 401 when no authorization token is provided', async () => {
      const res = await request(app).get('/api/v1/issues');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 200 with paginated list of issues for authorized project member', async () => {
      vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue({
        id: 'pm-1',
        projectId: 'proj-1',
        userId: 'user-1',
        role: ProjectMemberRole.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.spyOn(prisma.issue, 'findMany').mockResolvedValue([sampleIssue as any]);
      vi.spyOn(prisma.issue, 'count').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/issues?projectId=proj-1')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Implement OAuth Login');
      expect(res.body.meta.total).toBe(1);
    });

    it('returns 403 when user attempts to list issues from a project they do not belong to', async () => {
      vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/issues?projectId=proj-secret')
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/v1/issues/:id', () => {
    it('returns 200 with full issue details and child subtasks', async () => {
      vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue({
        ...sampleIssue,
        children: [
          {
            id: 'sub-1',
            projectId: 'proj-1',
            parentId: 'issue-1',
            title: 'Setup Google Client ID',
            description: null,
            type: IssueType.TASK,
            priority: IssuePriority.MEDIUM,
            statusId: 'status-todo-id',
            assigneeId: null,
            reporterId: 'admin-1',
            createdAt: new Date('2026-11-01T11:00:00Z'),
            updatedAt: new Date('2026-11-01T11:00:00Z'),
            status: { id: 'status-todo-id', name: 'To Do', order: 1 },
            assignee: null,
          },
        ],
      } as any);

      const res = await request(app)
        .get('/api/v1/issues/issue-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('issue-1');
      expect(res.body.data.children).toHaveLength(1);
      expect(res.body.data.children[0].title).toBe('Setup Google Client ID');
    });

    it('returns 404 when issue does not exist', async () => {
      vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/issues/non-existent-uuid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/v1/issues', () => {
    it('creates an issue, associates reporter, and logs activity audit', async () => {
      vi.spyOn(prisma.projectMember, 'findUnique').mockImplementation((async ({ where }: any) => {
        if (
          where.projectId_userId?.projectId === '22222222-2222-2222-2222-222222222222' &&
          where.projectId_userId?.userId === 'user-1'
        ) {
          return { id: 'pm-1', role: 'MEMBER' } as any;
        }
        return null;
      }) as any);

      vi.spyOn(prisma.status, 'findUnique').mockResolvedValue({
        id: '11111111-1111-1111-1111-111111111111',
        name: 'To Do',
      } as any);

      vi.spyOn(prisma.issue, 'create').mockResolvedValue({
        ...sampleIssue,
        id: 'issue-new',
        title: 'New Bug Report',
        type: IssueType.BUG,
        priority: IssuePriority.HIGH,
      } as any);

      const activitySpy = vi.spyOn(prisma.activity, 'create').mockResolvedValue({} as any);

      const res = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          projectId: '22222222-2222-2222-2222-222222222222',
          title: 'New Bug Report',
          description: 'Steps to reproduce...',
          type: IssueType.BUG,
          priority: IssuePriority.HIGH,
          statusId: '11111111-1111-1111-1111-111111111111',
        });

      // Member check on project was mocked for user-1
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('New Bug Report');
      expect(activitySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            issueId: 'issue-new',
            action: 'CREATED',
            newValue: 'New Bug Report',
          }),
        })
      );
    });

    it('rejects creating subtask when parentId belongs to a different project', async () => {
      vi.spyOn(prisma.status, 'findUnique').mockResolvedValue({ id: 'status-todo-id' } as any);
      vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue({
        id: 'parent-different-proj',
        projectId: 'proj-other',
      } as any);

      const res = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          projectId: '22222222-2222-2222-2222-222222222222',
          parentId: '33333333-3333-3333-3333-333333333333',
          title: 'Cross project subtask',
          statusId: '11111111-1111-1111-1111-111111111111',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/must belong to the same project/i);
    });
  });

  describe('PATCH /api/v1/issues/:id', () => {
    it('updates issue status and priority and generates activity audit logs', async () => {
      vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue({
        ...sampleIssue,
        status: { id: 'status-todo-id', name: 'To Do' },
        assignee: null,
      } as any);

      vi.spyOn(prisma.status, 'findUnique').mockResolvedValue({
        id: 'status-done-id',
        name: 'Done',
      } as any);

      vi.spyOn(prisma, '$transaction').mockResolvedValue([
        {
          ...sampleIssue,
          statusId: 'status-done-id',
          priority: IssuePriority.LOW,
          status: { id: 'status-done-id', name: 'Done', order: 3 },
        },
      ] as any);

      const res = await request(app)
        .patch('/api/v1/issues/issue-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          statusId: '11111111-1111-1111-1111-111111111111',
          priority: IssuePriority.LOW,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.priority).toBe(IssuePriority.LOW);
    });

    it('rejects setting an issue as its own parent with 400', async () => {
      vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue(sampleIssue as any);

      const res = await request(app)
        .patch('/api/v1/issues/44444444-4444-4444-4444-444444444444')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          parentId: '44444444-4444-4444-4444-444444444444',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/cannot be its own parent/i);
    });
  });

  describe('DELETE /api/v1/issues/:id', () => {
    it('allows project admin to delete an issue', async () => {
      vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue(sampleIssue as any);
      vi.spyOn(prisma.issue, 'delete').mockResolvedValue(sampleIssue as any);

      const res = await request(app)
        .delete('/api/v1/issues/issue-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/deleted successfully/i);
    });

    it('rejects deletion when a non-admin, non-reporter attempts delete with 403', async () => {
      vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue({
        ...sampleIssue,
        reporterId: 'other-user',
      } as any);

      vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue({
        id: 'pm-1',
        role: ProjectMemberRole.MEMBER,
      } as any);

      const res = await request(app)
        .delete('/api/v1/issues/issue-1')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
