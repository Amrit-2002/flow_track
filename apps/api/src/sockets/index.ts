import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../shared/logger';

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

  io.on('connection', (socket: Socket) => {
    logger.info({ socketId: socket.id }, 'Socket client connected');

    // Room subscription for project collaboration
    socket.on('join:project', (projectId: string) => {
      if (typeof projectId === 'string') {
        socket.join(`project:${projectId}`);
        logger.debug({ socketId: socket.id, projectId }, 'Client joined project room');
      }
    });

    socket.on('leave:project', (projectId: string) => {
      if (typeof projectId === 'string') {
        socket.leave(`project:${projectId}`);
        logger.debug({ socketId: socket.id, projectId }, 'Client left project room');
      }
    });

    // Room subscription for user-specific real-time notifications
    socket.on('join:user', (userId: string) => {
      if (typeof userId === 'string') {
        socket.join(`user:${userId}`);
        logger.debug({ socketId: socket.id, userId }, 'Client joined user notification room');
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, 'Socket client disconnected');
    });
  });

  logger.info('🔌 Socket.IO server initialized');
  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}

