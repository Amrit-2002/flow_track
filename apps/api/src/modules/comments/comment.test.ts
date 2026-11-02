import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../shared/prisma';
import { generateAccessToken } from '../auth/auth.utils';
import { UserRole, ProjectMemberRole } from '@flowtrack/shared';

describe('Comment & Attachment API Integration Tests', () => {
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
    title: 'Payment Gateway Integration',
    reporterId: 'admin-1',
    assigneeId: 'user-1',
  };

  const sampleComment = {
    id: 'comment-1',
    issueId: 'issue-1',
    userId: 'user-1',
    content: 'Stripe webhook signature validation has been implemented and tested.',
    createdAt: new Date('2026-11-01T12:00:00Z'),
    updatedAt: new Date('2026-11-01T12:00:00Z'),
    user: {
      id: 'user-1',
      name: 'Team Member',
      email: 'user1@flowtrack.dev',
      role: 'USER',
      themePreference: 'light',
      createdAt: new Date('2026-11-01T09:00:00Z'),
    },
    attachments: [
      {
        id: 'att-1',
        fileName: 'webhook_test.png',
        fileKey: '12345-webhook_test.png',
        fileUrl: '/uploads/12345-webhook_test.png',
        mimeType: 'image/png',
        fileSize: 45000,
        userId: 'user-1',
        createdAt: new Date('2026-11-01T12:00:00Z'),
      },
    ],
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

  describe('GET /api/v1/issues/:issueId/comments', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/v1/issues/issue-1/comments');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 403 when user is not a project member', async () => {
      vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue(sampleIssue as any);
      vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/issues/issue-1/comments')
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('returns 200 with comments and attachment lists for project members', async () => {
      vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue(sampleIssue as any);
      vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue({
        id: 'pm-1',
        projectId: 'proj-1',
        userId: 'user-1',
        role: ProjectMemberRole.MEMBER,
      } as any);

      vi.spyOn(prisma.comment, 'findMany').mockResolvedValue([sampleComment] as any);

      const res = await request(app)
        .get('/api/v1/issues/issue-1/comments')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].content).toContain('Stripe webhook');
      expect(res.body.data[0].user.name).toBe('Team Member');
      expect(res.body.data[0].attachments).toHaveLength(1);
      expect(res.body.data[0].attachments[0].fileName).toBe('webhook_test.png');
    });
  });

  describe('POST /api/v1/issues/:issueId/comments', () => {
    it('returns 400 when comment content is empty', async () => {
      vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue(sampleIssue as any);
      vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue({
        id: 'pm-1',
        projectId: 'proj-1',
        userId: 'user-1',
        role: ProjectMemberRole.MEMBER,
      } as any);

      const res = await request(app)
        .post('/api/v1/issues/issue-1/comments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ content: '   ' });

      expect(res.status).toBe(400);
    });

    it('creates comment, creates notifications, and records activity', async () => {
      vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue(sampleIssue as any);
      vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue({
        id: 'pm-1',
        projectId: 'proj-1',
        userId: 'user-1',
        role: ProjectMemberRole.MEMBER,
      } as any);

      const createdComment = {
        ...sampleComment,
        content: 'New feedback on PR #42',
        attachments: [],
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const tx = {
          comment: {
            create: vi.fn().mockResolvedValue(createdComment),
          },
          attachment: {
            create: vi.fn(),
          },
          activity: {
            create: vi.fn().mockResolvedValue({ id: 'act-1' }),
          },
          notification: {
            create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
          },
        };
        return callback(tx);
      });

      const res = await request(app)
        .post('/api/v1/issues/issue-1/comments')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ content: 'New feedback on PR #42' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('New feedback on PR #42');
    });
  });

  describe('PATCH /api/v1/comments/:id', () => {
    it('returns 403 when non-author tries to edit comment', async () => {
      vi.spyOn(prisma.comment, 'findUnique').mockResolvedValue(sampleComment as any);

      const res = await request(app)
        .patch('/api/v1/comments/comment-1')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ content: 'Malicious edit' });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('only edit your own comments');
    });

    it('returns 200 when author updates comment', async () => {
      vi.spyOn(prisma.comment, 'findUnique').mockResolvedValue(sampleComment as any);
      vi.spyOn(prisma.comment, 'update').mockResolvedValue({
        ...sampleComment,
        content: 'Updated comment text',
      } as any);

      const res = await request(app)
        .patch('/api/v1/comments/comment-1')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ content: 'Updated comment text' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('Updated comment text');
    });
  });

  describe('DELETE /api/v1/comments/:id', () => {
    it('returns 403 when non-author tries to delete comment', async () => {
      vi.spyOn(prisma.comment, 'findUnique').mockResolvedValue({
        ...sampleComment,
        issue: { projectId: 'proj-1' },
      } as any);
      vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/v1/comments/comment-1')
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 200 when author deletes comment', async () => {
      vi.spyOn(prisma.comment, 'findUnique').mockResolvedValue({
        ...sampleComment,
        issue: { projectId: 'proj-1' },
      } as any);
      vi.spyOn(prisma.comment, 'delete').mockResolvedValue(sampleComment as any);

      const res = await request(app)
        .delete('/api/v1/comments/comment-1')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('deleted successfully');
    });
  });

  describe('Direct Attachment Endpoints', () => {
    it('returns 400 when no file is uploaded', async () => {
      vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue(sampleIssue as any);

      const res = await request(app)
        .post('/api/v1/issues/issue-1/attachments')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(400);
    });

    it('returns 201 when uploading valid attachment file', async () => {
      vi.spyOn(prisma.issue, 'findUnique').mockResolvedValue(sampleIssue as any);
      vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue({
        id: 'pm-1',
        projectId: 'proj-1',
        userId: 'user-1',
        role: ProjectMemberRole.MEMBER,
      } as any);

      vi.spyOn(prisma, '$transaction').mockResolvedValue([
        {
          id: 'att-2',
          fileName: 'test-log.txt',
          fileKey: '12345-test-log.txt',
          fileUrl: '/uploads/12345-test-log.txt',
          mimeType: 'text/plain',
          fileSize: 120,
          userId: 'user-1',
          createdAt: new Date(),
        },
        { id: 'act-2' },
      ] as any);

      const res = await request(app)
        .post('/api/v1/issues/issue-1/attachments')
        .set('Authorization', `Bearer ${memberToken}`)
        .attach('file', Buffer.from('Log output sample contents'), 'test-log.txt');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fileName).toBe('test-log.txt');
    });

    it('returns 403 when non-uploader/non-admin attempts to delete attachment', async () => {
      vi.spyOn(prisma.attachment, 'findUnique').mockResolvedValue({
        id: 'att-2',
        userId: 'user-1',
        fileKey: 'key-1',
        issue: { projectId: 'proj-1' },
      } as any);

      vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue({
        id: 'pm-outsider',
        role: ProjectMemberRole.MEMBER,
      } as any);

      const res = await request(app)
        .delete('/api/v1/attachments/att-2')
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 200 when uploader deletes attachment', async () => {
      vi.spyOn(prisma.attachment, 'findUnique').mockResolvedValue({
        id: 'att-2',
        userId: 'user-1',
        fileKey: 'key-1',
        issue: { projectId: 'proj-1' },
      } as any);

      vi.spyOn(prisma.attachment, 'delete').mockResolvedValue({ id: 'att-2' } as any);

      const res = await request(app)
        .delete('/api/v1/attachments/att-2')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('deleted successfully');
    });
  });
});
