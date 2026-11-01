import { Request, Response, NextFunction } from 'express';
import { UserRole, ThemePreference } from '@flowtrack/shared';
import { UnauthorizedError, ForbiddenError } from '../shared/errors';
import { verifyAccessToken } from '../modules/auth/auth.utils';
import { prisma } from '../shared/prisma';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  themePreference: ThemePreference;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token required.');
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findFirst({
      where: {
        id: payload.userId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        themePreference: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Account not found or has been deactivated.');
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      themePreference: user.themePreference as ThemePreference,
    };

    next();
  } catch (err) {
    if (err instanceof Error && err.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Access token expired. Please refresh your token.'));
      return;
    }
    if (err instanceof Error && err.name === 'JsonWebTokenError') {
      next(new UnauthorizedError('Invalid access token.'));
      return;
    }
    next(err);
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required.'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(
        new ForbiddenError(
          `Permission denied. Required role: [${allowedRoles.join(', ')}], current role: ${req.user.role}`
        )
      );
      return;
    }

    next();
  };
}

