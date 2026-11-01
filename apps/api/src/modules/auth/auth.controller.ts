import { Request, Response, NextFunction } from 'express';
import { registerSchema, loginSchema } from '@flowtrack/shared';
import { authService } from './auth.service';
import { env } from '../../config/env';

const REFRESH_COOKIE_NAME = 'refreshToken';

const getCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: (env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/v1/auth',
});

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await authService.register(
        validated,
        req.ip,
        req.headers['user-agent']
      );

      res.cookie(REFRESH_COOKIE_NAME, result.refreshTokenString, getCookieOptions());

      res.status(201).json({
        success: true,
        message: 'Account registered successfully',
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await authService.login(
        validated,
        req.ip,
        req.headers['user-agent']
      );

      res.cookie(REFRESH_COOKIE_NAME, result.refreshTokenString, getCookieOptions());

      res.status(200).json({
        success: true,
        message: 'Signed in successfully',
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawToken = req.cookies[REFRESH_COOKIE_NAME];
      const result = await authService.refresh(
        rawToken,
        req.ip,
        req.headers['user-agent']
      );

      res.cookie(REFRESH_COOKIE_NAME, result.refreshTokenString, getCookieOptions());

      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawToken = req.cookies[REFRESH_COOKIE_NAME];
      await authService.logout(rawToken);

      res.clearCookie(REFRESH_COOKIE_NAME, {
        ...getCookieOptions(),
        maxAge: 0,
      });

      res.status(200).json({
        success: true,
        message: 'Signed out successfully',
      });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
