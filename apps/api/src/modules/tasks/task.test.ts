import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../shared/prisma';
import { generateAccessToken } from '../auth/auth.utils';
import { UserRole, TaskDevStatus } from '@flowtrack/shared';

describe('Legacy Task Tracker API Integration Tests', () => {
  const adminToken = generateAccessToken({
    userId: 'admin-1',
    email: 'admin@flowtrack.dev',
    role: UserRole.ADMIN,
    name: 'Admin User',
  });

  const userToken = generateAccessToken({
    userId: 'user-1',
    email: 'user1@flowtrack.dev',
    role: UserRole.USER,
    name: 'Standard User',
  });

  const sampleTask = {
    id: 'task-1',
    userId: 'user-1',
    client: 'Acme Corp',
    taskBugName: 'Fix cart discount computation',
    owner: 'John Doe',
    priority: 'High',
    startDate: new Date('2026-11-01T00:00:00Z'),
    endDate: new Date('2026-11-05T00:00:00Z'),
    devStatus: TaskDevStatus.IN_PROGRESS,
    unitTestStatus: TaskDevStatus.NEW,
    stagingStatus: TaskDevStatus.NA,
    prodStatus: TaskDevStatus.NA,
    comment: 'Pending review',
    deletedAt: null,
    createdAt: new Date('2026-11-01T10:00:00Z'),
    updatedAt: new Date('2026-11-01T10:00:00Z'),
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
      return {
        id: 'user-1',
        email: 'user1@flowtrack.dev',
        name: 'Standard User',
        role: 'USER',
        themePreference: 'light',
      } as any;
    }) as any));
  });

  describe('GET /api/v1/tasks', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/v1/tasks');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 200 with paginated tasks scoped to user', async () => {
      vi.spyOn(prisma.task, 'findMany').mockResolvedValue([sampleTask as any]);
      vi.spyOn(prisma.task, 'count').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].taskBugName).toBe('Fix cart discount computation');
      expect(res.body.data[0].devStatus).toBe(TaskDevStatus.IN_PROGRESS);
    });
  });

  describe('POST /api/v1/tasks', () => {
    it('creates a task with valid multi-status workflow fields', async () => {
      vi.spyOn(prisma.task, 'create').mockResolvedValue({
        ...sampleTask,
        id: 'task-new',
        taskBugName: 'Implement Stripe Checkout',
      } as any);

      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          client: 'Acme Corp',
          taskBugName: 'Implement Stripe Checkout',
          owner: 'John Doe',
          priority: 'High',
          startDate: '2026-11-01',
          endDate: '2026-11-05',
          devStatus: TaskDevStatus.NEW,
          unitTestStatus: TaskDevStatus.NA,
          stagingStatus: TaskDevStatus.NA,
          prodStatus: TaskDevStatus.NA,
          comment: 'Ready to start',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.taskBugName).toBe('Implement Stripe Checkout');
    });

    it('rejects task creation when endDate is before startDate with 400', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          client: 'Acme Corp',
          taskBugName: 'Invalid dates',
          owner: 'John Doe',
          priority: 'Medium',
          startDate: '2026-11-10',
          endDate: '2026-11-05',
          devStatus: TaskDevStatus.NEW,
          unitTestStatus: TaskDevStatus.NA,
          stagingStatus: TaskDevStatus.NA,
          prodStatus: TaskDevStatus.NA,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/tasks/:id', () => {
    it('updates task devStatus and unitTestStatus', async () => {
      vi.spyOn(prisma.task, 'findFirst').mockResolvedValue(sampleTask as any);
      vi.spyOn(prisma.task, 'update').mockResolvedValue({
        ...sampleTask,
        devStatus: TaskDevStatus.COMPLETED,
        unitTestStatus: TaskDevStatus.IN_PROGRESS,
      } as any);

      const res = await request(app)
        .patch('/api/v1/tasks/task-1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          devStatus: TaskDevStatus.COMPLETED,
          unitTestStatus: TaskDevStatus.IN_PROGRESS,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.devStatus).toBe(TaskDevStatus.COMPLETED);
      expect(res.body.data.unitTestStatus).toBe(TaskDevStatus.IN_PROGRESS);
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('soft deletes task by setting deletedAt', async () => {
      vi.spyOn(prisma.task, 'findFirst').mockResolvedValue(sampleTask as any);
      const updateSpy = vi.spyOn(prisma.task, 'update').mockResolvedValue({} as any);

      const res = await request(app)
        .delete('/api/v1/tasks/task-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'task-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });
  });
});
