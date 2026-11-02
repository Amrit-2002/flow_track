import path from 'path';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env } from './config/env';
import { logger } from './shared/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { authRouter } from './modules/auth/auth.routes';
import { userRouter } from './modules/users/user.routes';
import { projectRouter } from './modules/projects/project.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { issueRouter } from './modules/issues/issue.routes';
import { clientRouter } from './modules/clients/client.routes';
import { taskRouter } from './modules/tasks/task.routes';
import { workflowRouter } from './modules/workflows/workflow.routes';
import { commentRouter } from './modules/comments/comment.routes';
import { attachmentRouter } from './modules/attachments/attachment.routes';
import { timeLogRouter } from './modules/time-logs/time-log.routes';
import { prisma } from './shared/prisma';
import { requireAuth } from './middleware/auth';

export function createApp(): Express {
  const app = express();

  // Trust proxy for secure cookies on Render / reverse proxies
  app.set('trust proxy', 1);

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // Cross-Origin Resource Sharing
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Structured HTTP logging
  if (env.NODE_ENV !== 'test') {
    app.use(
      pinoHttp({
        logger,
        autoLogging: {
          ignore: (req) => req.url === '/health',
        },
      })
    );
  }

  // Health check endpoint (for Render / load balancers)
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'flowtrack-api',
      environment: env.NODE_ENV,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  // Base API v1 probe
  app.get('/api/v1', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'FlowTrack REST API v1 is operational',
      version: '1.0.0',
    });
  });

  // Domain API Routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', userRouter);
  app.use('/api/v1/projects', projectRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/issues', issueRouter);
  app.use('/api/v1/clients', clientRouter);
  app.use('/api/v1/tasks', taskRouter);
  app.use('/api/v1/workflows', workflowRouter);
  app.use('/api/v1/comments', commentRouter);
  app.use('/api/v1/attachments', attachmentRouter);
  app.use('/api/v1/time-logs', timeLogRouter);

  // Serve static uploaded files
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  // Workflow Statuses endpoint (backward compatibility alias)
  app.get('/api/v1/statuses', requireAuth, async (_req: Request, res: Response, next) => {
    try {
      const statuses = await prisma.status.findMany({ orderBy: { order: 'asc' } });
      res.status(200).json({ success: true, data: statuses });
    } catch (err) {
      next(err);
    }
  });

  // 404 handler for undefined routes
  app.use(notFoundHandler);

  // Centralized error handling
  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
