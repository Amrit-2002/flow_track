import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../shared/prisma';
import { generateAccessToken } from '../auth/auth.utils';
import { UserRole } from '@flowtrack/shared';

describe('Saved Filters API Integration Tests', () => {
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
    name: 'Team Member',
  });

  const otherUserToken = generateAccessToken({
    userId: 'user-2',
    email: 'user2@flowtrack.dev',
    role: UserRole.USER,
    name: 'Other Member',
  });

  const sampleFilter = {
    id: 'filter-1',
    userId: 'user-1',
    name: 'Critical Bugs',
    filterData: { priority: 'HIGH', type: 'BUG' },
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

  describe('GET /api/v1/saved-filters', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/v1/saved-filters');
      expect(res.status).toBe(401);
    });

    it('returns 200 with list of user-scoped saved filters', async () => {
      vi.spyOn(prisma.savedFilter, 'findMany').mockResolvedValue([sampleFilter as any]);

      const res = await request(app)
        .get('/api/v1/saved-filters')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Critical Bugs');
      expect(res.body.data[0].filterData).toEqual({ priority: 'HIGH', type: 'BUG' });
    });
  });

  describe('POST /api/v1/saved-filters', () => {
    it('returns 400 when filter name is missing or empty', async () => {
      const res = await request(app)
        .post('/api/v1/saved-filters')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: '   ',
          filterData: { priority: 'HIGH' },
        });

      expect(res.status).toBe(400);
    });

    it('creates a new saved filter and returns 201 with created record', async () => {
      vi.spyOn(prisma.savedFilter, 'create').mockResolvedValue(sampleFilter as any);

      const res = await request(app)
        .post('/api/v1/saved-filters')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Critical Bugs',
          filterData: { priority: 'HIGH', type: 'BUG' },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('filter-1');
      expect(res.body.data.name).toBe('Critical Bugs');
    });
  });

  describe('DELETE /api/v1/saved-filters/:id', () => {
    it('returns 404 when filter does not exist', async () => {
      vi.spyOn(prisma.savedFilter, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/v1/saved-filters/missing-filter')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('Saved filter not found');
    });

    it('returns 403 when user attempts to delete someone elses saved filter', async () => {
      vi.spyOn(prisma.savedFilter, 'findUnique').mockResolvedValue(sampleFilter as any); // owned by user-1

      const res = await request(app)
        .delete('/api/v1/saved-filters/filter-1')
        .set('Authorization', `Bearer ${otherUserToken}`); // user-2

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('do not have permission');
    });

    it('allows owner to delete their saved filter', async () => {
      vi.spyOn(prisma.savedFilter, 'findUnique').mockResolvedValue(sampleFilter as any);
      const deleteSpy = vi.spyOn(prisma.savedFilter, 'delete').mockResolvedValue(sampleFilter as any);

      const res = await request(app)
        .delete('/api/v1/saved-filters/filter-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(deleteSpy).toHaveBeenCalledWith({ where: { id: 'filter-1' } });
    });

    it('allows global admin to delete any saved filter', async () => {
      vi.spyOn(prisma.savedFilter, 'findUnique').mockResolvedValue(sampleFilter as any);
      const deleteSpy = vi.spyOn(prisma.savedFilter, 'delete').mockResolvedValue(sampleFilter as any);

      const res = await request(app)
        .delete('/api/v1/saved-filters/filter-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(deleteSpy).toHaveBeenCalledWith({ where: { id: 'filter-1' } });
    });
  });
});

