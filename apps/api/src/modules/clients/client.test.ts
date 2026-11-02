import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../shared/prisma';
import { generateAccessToken } from '../auth/auth.utils';
import { UserRole } from '@flowtrack/shared';

describe('Client Management API Integration Tests', () => {
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

  const sampleClient = {
    id: 'client-1',
    name: 'Acme Corp',
    userId: 'user-1',
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

  describe('GET /api/v1/clients', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(app).get('/api/v1/clients');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 200 with list of active clients scoped to user', async () => {
      vi.spyOn(prisma.client, 'findMany').mockResolvedValue([sampleClient as any]);

      const res = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Acme Corp');
    });
  });

  describe('POST /api/v1/clients', () => {
    it('creates a client with valid name', async () => {
      vi.spyOn(prisma.client, 'create').mockResolvedValue({
        ...sampleClient,
        id: 'client-new',
        name: 'Stark Industries',
      } as any);

      const res = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Stark Industries' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Stark Industries');
    });

    it('rejects empty client name with 400', async () => {
      const res = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/clients/:id', () => {
    it('updates client name', async () => {
      vi.spyOn(prisma.client, 'findFirst').mockResolvedValue(sampleClient as any);
      vi.spyOn(prisma.client, 'update').mockResolvedValue({
        ...sampleClient,
        name: 'Acme International',
      } as any);

      const res = await request(app)
        .patch('/api/v1/clients/client-1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Acme International' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Acme International');
    });
  });

  describe('DELETE /api/v1/clients/:id', () => {
    it('soft deletes client by setting deletedAt', async () => {
      vi.spyOn(prisma.client, 'findFirst').mockResolvedValue(sampleClient as any);
      const updateSpy = vi.spyOn(prisma.client, 'update').mockResolvedValue({} as any);

      const res = await request(app)
        .delete('/api/v1/clients/client-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'client-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });
  });
});

