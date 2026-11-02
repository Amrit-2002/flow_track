import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../shared/logger.js';
import { prisma } from '../shared/prisma.js';
import { verifyAccessToken, JwtPayload } from '../modules/auth/auth.utils.js';
import { UserRole } from '@flowtrack/shared';

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authenticate socket handshake using JWT access token
  io.use(async (socket: Socket, next) => {
    try {
      const authHeader =
        (socket.handshake.auth?.token as string | undefined) ||
        (socket.handshake.headers?.authorization as string | undefined);

      if (!authHeader) {
        return next(new Error('Authentication error: Token required'));
      }

      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      const payload = verifyAccessToken(token);

      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as JwtPayload;

    if (user?.userId) {
      // Automatically join personal notification room
      socket.join(`user:${user.userId}`);
      logger.info({ socketId: socket.id, userId: user.userId }, 'Socket client authenticated & joined user room');
    }

    // Room subscription for project collaboration
    socket.on('join:project', async (projectId: string) => {
      if (typeof projectId !== 'string' || !user) return;

      try {
        if (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) {
          socket.join(`project:${projectId}`);
          socket.emit('project:joined', { projectId });
          logger.debug({ socketId: socket.id, projectId, userId: user.userId }, 'Admin/Manager joined project room');
          return;
        }

        const member = await prisma.projectMember.findUnique({
          where: {
            projectId_userId: {
              projectId,
              userId: user.userId,
            },
          },
        });

        if (member) {
          socket.join(`project:${projectId}`);
          socket.emit('project:joined', { projectId });
          logger.debug({ socketId: socket.id, projectId, userId: user.userId }, 'Member joined project room');
        } else {
          socket.emit('error', { message: 'Access denied: not a member of this project' });
        }
      } catch (err) {
        logger.error({ err, projectId }, 'Failed to join project room');
      }
    });

    socket.on('leave:project', (projectId: string) => {
      if (typeof projectId === 'string') {
        socket.leave(`project:${projectId}`);
        socket.emit('project:left', { projectId });
        logger.debug({ socketId: socket.id, projectId }, 'Client left project room');
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, 'Socket client disconnected');
    });
  });

  logger.info('🔌 Authenticated Socket.IO server initialized');
  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * Emit an event to all clients currently connected to a project's room
 */
export function emitToProject(projectId: string, event: string, payload: unknown): void {
  if (io) {
    io.to(`project:${projectId}`).emit(event, payload);
  }
}

/**
 * Emit an event directly to a specific user's notification room
 */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  if (io) {
    io.to(`user:${userId}`).emit(event, payload);
  }
}

/**
 * Broadcast an event to all connected clients
 */
export function emitToAll(event: string, payload: unknown): void {
  if (io) {
    io.emit(event, payload);
  }
}
