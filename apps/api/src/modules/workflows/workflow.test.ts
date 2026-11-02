import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../shared/prisma';
import { generateAccessToken } from '../auth/auth.utils';
import { UserRole, ProjectMemberRole } from '@flowtrack/shared';

describe('Workflow & Transition Validation Engine Tests', () => {
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

  const todoStatus = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'To Do',
    order: 1,
    createdAt: new Date('2026-11-01T10:00:00Z'),
    updatedAt: new Date('2026-11-01T10:00:00Z'),
  };

  const inProgressStatus = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'In Progress',
    order: 2,
    createdAt: new Date('2026-11-01T10:00:00Z'),
    updatedAt: new Date('2026-11-01T10:00:00Z'),
  };

  const doneStatus = {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Done',
    order: 3,
    createdAt: new Date('2026-11-01T10:00:00Z'),
    updatedAt: new Date('2026-11-01T10:00:00Z'),
  };

  const sampleTransitions = [
    {
      id: 'trans-1',
      fromStatusId: todoStatus.id,
      toStatusId: inProgressStatus.id,
      createdAt: new Date('2026-11-01T10:00:00Z'),
      fromStatus: todoStatus,
      toStatus: inProgressStatus,
    },
    {
      id: 'trans-2',
      fromStatusId: inProgressStatus.id,
      toStatusId: doneStatus.id,
      createdAt: new Date('2026-11-01T10:00:00Z'),
      fromStatus: inProgressStatus,
      toStatus: doneStatus,
    },
    {
      id: 'trans-3',
      fromStatusId: inProgressStatus.id,
      toStatusId: todoStatus.id,
      createdAt: new Date('2026-11-01T10:00:00Z'),
      fromStatus: inProgressStatus,
      toStatus: todoStatus,
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

  describe('GET /api/v1/workflows/statuses', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(app).get('/api/v1/workflows/statuses');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 200 with all statuses ordered by order', async () => {
      vi.spyOn(prisma.status, 'findMany').mockResolvedValue([
        todoStatus,
        inProgressStatus,
        doneStatus,
      ] as any);

      const res = await request(app)
        .get('/api/v1/workflows/statuses')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data[0].name).toBe('To Do');
      expect(res.body.data[1].name).toBe('In Progress');
      expect(res.body.data[2].name).toBe('Done');
    });
  });

  describe('GET /api/v1/workflows/transitions', () => {
    it('returns 200 with all workflow transitions matrix', async () => {
      vi.spyOn(prisma.workflowTransition, 'findMany').mockResolvedValue(sampleTransitions as any);

      const res = await request(app)
        .get('/api/v1/workflows/transitions')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data[0].fromStatus.name).toBe('To Do');
      expect(res.body.data[0].toStatus.name).toBe('In Progress');
    });
  });

  describe('POST /api/v1/workflows/validate', () => {
    it('returns 200 with allowed=true when transition exists in workflow matrix', async () => {
      vi.spyOn(prisma.status, 'findUnique').mockImplementation(((async ({ where }: any) => {
        if (where.id === todoStatus.id) return todoStatus;
        if (where.id === inProgressStatus.id) return inProgressStatus;
        return null;
      }) as any));

      vi.spyOn(prisma.workflowTransition, 'findUnique').mockResolvedValue(sampleTransitions[0] as any);

      const res = await request(app)
        .post('/api/v1/workflows/validate')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          fromStatusId: todoStatus.id,
          toStatusId: inProgressStatus.id,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.allowed).toBe(true);
      expect(res.body.data.fromStatusName).toBe('To Do');
      expect(res.body.data.toStatusName).toBe('In Progress');
    });

    it('returns 422 with INVALID_WORKFLOW_TRANSITION when transition is not permitted', async () => {
      vi.spyOn(prisma.status, 'findUnique').mockImplementation(((async ({ where }: any) => {
        if (where.id === todoStatus.id) return todoStatus;
        if (where.id === doneStatus.id) return doneStatus;
        return null;
      }) as any));

      // Disallowed: To Do -> Done directly
      vi.spyOn(prisma.workflowTransition, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/workflows/validate')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          fromStatusId: todoStatus.id,
          toStatusId: doneStatus.id,
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_WORKFLOW_TRANSITION');
      expect(res.body.error.message).toContain('not permitted by workflow rules');
    });
  });

  describe('PATCH /api/v1/issues/:id/status (Issue Transition API)', () => {
    const sampleIssue = {
      id: 'issue-101',
      projectId: 'proj-1',
      title: 'Setup Redis Sentinel',
      statusId: todoStatus.id,
      reporterId: 'admin-1',
      assigneeId: 'user-1',
      status: todoStatus,
      assignee: { id: 'user-1', name: 'Team Member', email: 'user1@flowtrack.dev', role: 'USER' },
      project: { id: 'proj-1', name: 'Platform', key: 'PLAT', isArchived: false, createdAt: new Date() },
    };

    it('returns 403 when non-member tries to transition issue status', async () => {
      vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue(sampleIssue as any);
      vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/v1/issues/issue-101/status')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ statusId: inProgressStatus.id });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 422 when attempting illegal transition (To Do -> Done)', async () => {
      vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue(sampleIssue as any);
      vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue({
        id: 'pm-1',
        projectId: 'proj-1',
        userId: 'user-1',
        role: ProjectMemberRole.MEMBER,
      } as any);

      vi.spyOn(prisma.status, 'findUnique').mockImplementation(((async ({ where }: any) => {
        if (where.id === todoStatus.id) return todoStatus;
        if (where.id === doneStatus.id) return doneStatus;
        return null;
      }) as any));

      vi.spyOn(prisma.workflowTransition, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/v1/issues/issue-101/status')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ statusId: doneStatus.id });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_WORKFLOW_TRANSITION');
    });

    it('returns 200, updates issue, and records Activity when transition is permitted', async () => {
      vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue(sampleIssue as any);
      vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue({
        id: 'pm-1',
        projectId: 'proj-1',
        userId: 'user-1',
        role: ProjectMemberRole.MEMBER,
      } as any);

      vi.spyOn(prisma.status, 'findUnique').mockImplementation(((async ({ where }: any) => {
        if (where.id === todoStatus.id) return todoStatus;
        if (where.id === inProgressStatus.id) return inProgressStatus;
        return null;
      }) as any));

      vi.spyOn(prisma.workflowTransition, 'findUnique').mockResolvedValue(sampleTransitions[0] as any);

      const updatedIssue = {
        ...sampleIssue,
        statusId: inProgressStatus.id,
        status: inProgressStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
        reporter: { id: 'admin-1', name: 'Admin', email: 'admin@flowtrack.dev', role: 'ADMIN' },
      };

      vi.spyOn(prisma, '$transaction').mockResolvedValue([updatedIssue, { id: 'act-1' }] as any);

      const res = await request(app)
        .patch('/api/v1/issues/issue-101/status')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ statusId: inProgressStatus.id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.statusId).toBe(inProgressStatus.id);
      expect(res.body.data.status.name).toBe('In Progress');
    });
  });

  describe('Admin Workflow Administration', () => {
    it('rejects non-admin from creating transitions with 403', async () => {
      const res = await request(app)
        .post('/api/v1/workflows/transitions')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          fromStatusId: todoStatus.id,
          toStatusId: doneStatus.id,
        });

      expect(res.status).toBe(403);
    });

    it('rejects self-transitions with 400', async () => {
      const res = await request(app)
        .post('/api/v1/workflows/transitions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fromStatusId: todoStatus.id,
          toStatusId: todoStatus.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('transition from a status to itself');
    });

    it('allows Admin to create transition and returns 201', async () => {
      vi.spyOn(prisma.status, 'findUnique').mockImplementation(((async ({ where }: any) => {
        if (where.id === todoStatus.id) return todoStatus;
        if (where.id === doneStatus.id) return doneStatus;
        return null;
      }) as any));

      vi.spyOn(prisma.workflowTransition, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma.workflowTransition, 'create').mockResolvedValue({
        id: 'new-trans-1',
        fromStatusId: todoStatus.id,
        toStatusId: doneStatus.id,
        fromStatus: todoStatus,
        toStatus: doneStatus,
      } as any);

      const res = await request(app)
        .post('/api/v1/workflows/transitions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fromStatusId: todoStatus.id,
          toStatusId: doneStatus.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fromStatus.name).toBe('To Do');
      expect(res.body.data.toStatus.name).toBe('Done');
    });

    it('allows Admin to delete transition and returns 200', async () => {
      vi.spyOn(prisma.workflowTransition, 'findUnique').mockResolvedValue(sampleTransitions[0] as any);
      vi.spyOn(prisma.workflowTransition, 'delete').mockResolvedValue(sampleTransitions[0] as any);

      const res = await request(app)
        .delete('/api/v1/workflows/transitions/trans-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('deleted successfully');
    });
  });
});
