import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../app';
import { prisma } from '../../shared/prisma';
import { generateAccessToken } from './auth.utils';
import { UserRole } from '@flowtrack/shared';

describe('Auth Module Integration Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('creates a new user and returns 201 with access token & refresh cookie', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.user, 'create').mockResolvedValue({
        id: 'user-123',
        name: 'Alice Developer',
        email: 'alice@example.com',
        password: 'hashed-password',
        role: 'USER',
        themePreference: 'light',
        emailVerifiedAt: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.spyOn(prisma.refreshToken, 'create').mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Alice Developer',
          email: 'alice@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('alice@example.com');
      expect(response.body.data.accessToken).toBeDefined();

      // Verify cookie is set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('refreshToken=');
      expect(cookies[0]).toContain('HttpOnly');
    });

    it('rejects registration with weak password (missing symbol/uppercase)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Alice Developer',
          email: 'alice@example.com',
          password: 'simple',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 409 conflict when email is already registered', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue({
        id: 'existing-id',
        email: 'alice@example.com',
      } as any);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Alice Developer',
          email: 'alice@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('authenticates user with valid credentials and sets refresh cookie', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue({
        id: 'user-123',
        name: 'Alice Developer',
        email: 'alice@example.com',
        password: hashedPassword,
        role: 'USER',
        themePreference: 'light',
        emailVerifiedAt: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.spyOn(prisma.refreshToken, 'create').mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.name).toBe('Alice Developer');
    });

    it('rejects login with wrong password returning 401', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword123!', 10);
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue({
        id: 'user-123',
        email: 'alice@example.com',
        password: hashedPassword,
      } as any);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('rotates refresh token and returns new access token', async () => {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);

      vi.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue({
        id: 'token-1',
        tokenHash: 'hash-abc',
        userId: 'user-123',
        expiresAt: expiry,
        revokedAt: null,
        user: {
          id: 'user-123',
          name: 'Alice Developer',
          email: 'alice@example.com',
          role: 'USER',
          themePreference: 'light',
          deletedAt: null,
          createdAt: new Date(),
        },
      } as any);

      vi.spyOn(prisma.refreshToken, 'update').mockResolvedValue({} as any);
      vi.spyOn(prisma.refreshToken, 'create').mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['refreshToken=valid-raw-refresh-token']);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('detects replay attack when revoked token is used and revokes all sessions', async () => {
      vi.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue({
        id: 'token-compromised',
        tokenHash: 'hash-compromised',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: new Date(Date.now() - 50000), // Already revoked!
        user: { id: 'user-123' },
      } as any);

      const updateManySpy = vi.spyOn(prisma.refreshToken, 'updateMany').mockResolvedValue({ count: 5 });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['refreshToken=compromised-token']);

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Token reuse detected');
      expect(updateManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
        })
      );
    });
  });

  describe('Protected Routes & Authorization', () => {
    it('GET /api/v1/users/me returns 401 when no token is provided', async () => {
      const response = await request(app).get('/api/v1/users/me');
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('GET /api/v1/users/me returns 200 with profile when valid Bearer token provided', async () => {
      const validToken = generateAccessToken({
        userId: 'user-123',
        email: 'alice@example.com',
        role: UserRole.USER,
        name: 'Alice Developer',
      });

      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue({
        id: 'user-123',
        name: 'Alice Developer',
        email: 'alice@example.com',
        role: 'USER',
        themePreference: 'light',
        createdAt: new Date(),
        deletedAt: null,
      } as any);

      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('alice@example.com');
      expect(response.body.data.role).toBe('USER');
    });
  });
});
