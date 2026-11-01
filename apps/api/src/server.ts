import http from 'http';
import { app } from './app';
import { env } from './config/env';
import { logger } from './shared/logger';
import { prisma } from './shared/prisma';
import { initSocketServer } from './sockets';

const server = http.createServer(app);

// Initialize real-time Socket.IO server
initSocketServer(server);

// Listen on 0.0.0.0 for Render / container compatibility
server.listen(env.PORT, '0.0.0.0', () => {
  logger.info(`🚀 FlowTrack API server running at http://0.0.0.0:${env.PORT}`);
  logger.info(`🌍 Environment: ${env.NODE_ENV}`);
});

// Graceful shutdown handling
async function shutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);

  server.close(async () => {
    logger.info('HTTP server closed.');

    try {
      await prisma.$disconnect();
      logger.info('Prisma disconnected.');
      process.exit(0);
    } catch (err) {
      logger.error(err, 'Error during shutdown');
      process.exit(1);
    }
  });

  // Force close after 10 seconds if hanging
  setTimeout(() => {
    logger.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

