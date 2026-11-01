import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../shared/prisma';
import { generateAccessToken } from '../auth/auth.utils';
import { UserRole, ProjectMemberRole } from '@flowtrack/shared';

describe('Project Management API Integration Tests', () => {
  const adminToken = generateAccessToken({
    userId: 'admin-1',
    email: 'admin@flowtrack.dev',
    role: UserRole.ADMIN,
    name: 'Admin User',
  });

  const managerToken = generateAccessToken({
    userId: 'manager-1',
    email: 'manager@flowtrack.dev',
    role: UserRole.MANAGER,
    name: 'Manager User',
  });

  const userToken = generateAccessToken({
    userId: 'user-1',
    email: 'user@flowtrack.dev',
    role: UserRole.USER,
    name: 'Standard User',
  });

  beforeEach(() => {
    vi.restoreAllMocks();

    // Default mock for requireAuth finding the user in DB
    vi.spyOn(prisma.user, 'findFirst').mockImplementation(((async ({ where }: any) => {
      if (where.id === 'admin-1') {
        return { id: 'admin-1', email: 'admin@flowtrack.dev', name: 'Admin User', role: 'ADMIN', themePreference: 'dark' } as any;
      }
      if (where.id === 'manager-1') {
        return { id: 'manager-1', email: 'manager@flowtrack.dev', name: 'Manager User', role: 'MANAGER', themePreference: 'light' } as any;
      }
      return { id: 'user-1', email: 'user@flowtrack.dev', name: 'Standard User', role: 'USER', themePreference: 'light' } as any;
    }) as any));
  });

  describe('GET /api/v1/projects', () => {
    it('returns paginated list of projects', async () => {
      vi.spyOn(prisma.project, 'findMany').mockResolvedValue([
        {
          id: 'proj-1',
          name: 'Ecommerce Platform',
          key: 'ECOM',
          description: 'Online store',
          isArchived: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { issues: 5, members: 3 },
        } as any,
      ]);
      vi.spyOn(prisma.project, 'count').mockResolvedValue(1);

      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].key).toBe('ECOM');
      expect(response.body.meta).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe('POST /api/v1/projects', () => {
    it('allows Manager to create a project and assigns creator as project ADMIN', async () => {
      vi.spyOn(prisma.project, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma, '$transaction').mockImplementation((async (callback: any) => {
        return callback({
          project: {
            create: vi.fn().mockResolvedValue({
              id: 'proj-new',
              name: 'CRM System',
              key: 'CRM',
              description: 'Customer CRM',
              isArchived: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          },
          projectMember: {
            create: vi.fn().mockResolvedValue({}),
          },
        });
      }) as any);

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'CRM System',
          key: 'CRM',
          description: 'Customer CRM',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.key).toBe('CRM');
    });

    it('denies standard User from creating a project (403 Forbidden)', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Unauthorized Project',
          key: 'UNAUTH',
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects duplicate project key with 409 Conflict', async () => {
      vi.spyOn(prisma.project, 'findUnique').mockResolvedValue({
        id: 'existing-id',
        key: 'CRM',
      } as any);

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'CRM Duplicate',
          key: 'CRM',
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });
  });

  describe('Project Membership Management', () => {
    it('allows project ADMIN to add a new member', async () => {
      // Mock project admin check
      vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue({
        role: ProjectMemberRole.ADMIN,
      } as any);

      vi.spyOn(prisma.projectMember, 'upsert').mockResolvedValue({
        id: 'member-1',
        projectId: 'proj-1',
        userId: 'user-2',
        role: ProjectMemberRole.MEMBER,
        createdAt: new Date(),
        user: {
          id: 'user-2',
          name: 'Bob Contributor',
          email: 'bob@example.com',
          role: 'USER',
          themePreference: 'light',
          createdAt: new Date(),
        },
      } as any);

      const response = await request(app)
        .post('/api/v1/projects/proj-1/members')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          userId: '00000000-0000-0000-0000-000000000002',
          role: 'MEMBER',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe('MEMBER');
    });

    it('prevents non-admin project member from managing members (403)', async () => {
      // User is only a regular MEMBER on the project
      vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue({
        role: ProjectMemberRole.MEMBER,
      } as any);

      const response = await request(app)
        .post('/api/v1/projects/proj-1/members')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId: '00000000-0000-0000-0000-000000000002',
          role: 'MEMBER',
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('prevents removing the last remaining project administrator', async () => {
      // User is project admin
      vi.spyOn(prisma.projectMember, 'findUnique').mockImplementation(((async ({ where }: any) => {
        if (where.projectId_userId) {
          return { role: ProjectMemberRole.ADMIN } as any;
        }
        return null;
      }) as any));

      // Count of admins is only 1
      vi.spyOn(prisma.projectMember, 'count').mockResolvedValue(1);

      const response = await request(app)
        .delete('/api/v1/projects/proj-1/members/admin-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Cannot remove the only project administrator');
    });
  });
});
