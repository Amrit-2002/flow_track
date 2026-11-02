import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import http from 'http';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { AddressInfo } from 'net';
import { initSocketServer, emitToProject, emitToUser, getSocketServer } from './index';
import { generateAccessToken } from '../modules/auth/auth.utils';
import { prisma } from '../shared/prisma';
import { UserRole, ProjectMemberRole } from '@flowtrack/shared';

describe('Socket.IO Authenticated Real-Time Infrastructure', () => {
  let server: http.Server;
  let port: number;
  let clientSocket: ClientSocketType | null = null;

  const validToken = generateAccessToken({
    userId: 'user-1',
    email: 'user1@flowtrack.dev',
    role: UserRole.USER,
    name: 'Team Member',
  });

  const adminToken = generateAccessToken({
    userId: 'admin-1',
    email: 'admin@flowtrack.dev',
    role: UserRole.ADMIN,
    name: 'Admin User',
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    server = http.createServer();
    initSocketServer(server);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        port = (server.address() as AddressInfo).port;
        resolve();
      });
    });
  });

  afterEach(async () => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
      clientSocket = null;
    }

    const ioServer = getSocketServer();
    if (ioServer) {
      await ioServer.close();
    }

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('rejects connection when token is missing', async () => {
    await new Promise<void>((resolve) => {
      clientSocket = ClientSocket(`http://127.0.0.1:${port}`, {
        transports: ['websocket'],
        autoConnect: true,
      });

      clientSocket.on('connect_error', (err) => {
        expect(err.message).toContain('Authentication error: Token required');
        resolve();
      });
    });
  });

  it('rejects connection when token is invalid', async () => {
    await new Promise<void>((resolve) => {
      clientSocket = ClientSocket(`http://127.0.0.1:${port}`, {
        transports: ['websocket'],
        auth: { token: 'invalid.jwt.token' },
        autoConnect: true,
      });

      clientSocket.on('connect_error', (err) => {
        expect(err.message).toContain('Authentication error: Invalid or expired token');
        resolve();
      });
    });
  });

  it('authenticates connection with valid token and auto-joins user room', async () => {
    await new Promise<void>((resolve) => {
      clientSocket = ClientSocket(`http://127.0.0.1:${port}`, {
        transports: ['websocket'],
        auth: { token: validToken },
        autoConnect: true,
      });

      clientSocket.on('connect', () => {
        expect(clientSocket?.connected).toBe(true);

        // Verify emitToUser reaches this client
        clientSocket?.on('notification:test', (data) => {
          expect(data).toEqual({ message: 'Hello user-1' });
          resolve();
        });

        emitToUser('user-1', 'notification:test', { message: 'Hello user-1' });
      });
    });
  });

  it('allows project room subscription for project members and receives project broadcasts', async () => {
    vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue({
      id: 'pm-1',
      projectId: 'proj-1',
      userId: 'user-1',
      role: ProjectMemberRole.MEMBER,
    } as any);

    await new Promise<void>((resolve) => {
      clientSocket = ClientSocket(`http://127.0.0.1:${port}`, {
        transports: ['websocket'],
        auth: { token: validToken },
        autoConnect: true,
      });

      clientSocket.on('connect', () => {
        clientSocket?.emit('join:project', 'proj-1');
      });

      clientSocket.on('project:joined', (data) => {
        expect(data.projectId).toBe('proj-1');

        clientSocket?.on('issue:status_changed', (payload) => {
          expect(payload).toEqual({ issueId: 'issue-101', status: 'IN_PROGRESS' });
          resolve();
        });

        emitToProject('proj-1', 'issue:status_changed', {
          issueId: 'issue-101',
          status: 'IN_PROGRESS',
        });
      });
    });
  });

  it('allows admin to join any project room without explicit membership', async () => {
    await new Promise<void>((resolve) => {
      clientSocket = ClientSocket(`http://127.0.0.1:${port}`, {
        transports: ['websocket'],
        auth: { token: adminToken },
        autoConnect: true,
      });

      clientSocket.on('connect', () => {
        clientSocket?.emit('join:project', 'proj-arbitrary');
      });

      clientSocket.on('project:joined', (data) => {
        expect(data.projectId).toBe('proj-arbitrary');
        resolve();
      });
    });
  });

  it('blocks non-members from joining project room', async () => {
    vi.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue(null);

    await new Promise<void>((resolve) => {
      clientSocket = ClientSocket(`http://127.0.0.1:${port}`, {
        transports: ['websocket'],
        auth: { token: validToken },
        autoConnect: true,
      });

      clientSocket.on('connect', () => {
        clientSocket?.emit('join:project', 'proj-secret');
      });

      clientSocket.on('error', (err) => {
        expect(err.message).toContain('Access denied');
        resolve();
      });
    });
  });
});

