import { Request, Response, NextFunction } from 'express';
import {
  updateProfileSchema,
  changePasswordSchema,
  updateThemeSchema,
} from '@flowtrack/shared';
import { userService } from './user.service';
import { BadRequestError } from '../../shared/errors';

export class UserController {
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getProfile(req.user!.id);
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateProfileSchema.parse(req.body);
      const user = await userService.updateProfile(req.user!.id, validated);
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = changePasswordSchema.parse(req.body);
      await userService.changePassword(req.user!.id, validated);
      res.status(200).json({
        success: true,
        message: 'Password changed successfully. Other active sessions revoked.',
      });
    } catch (err) {
      next(err);
    }
  }

  async updateTheme(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateThemeSchema.parse(req.body);
      const theme = await userService.updateTheme(req.user!.id, validated.theme);
      res.status(200).json({
        success: true,
        message: 'Theme preference saved',
        data: { theme },
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { password } = req.body;
      if (!password || typeof password !== 'string') {
        throw new BadRequestError('Password confirmation is required to delete account.');
      }

      await userService.deleteAccount(req.user!.id, password);
      res.status(200).json({
        success: true,
        message: 'Account successfully deactivated.',
      });
    } catch (err) {
      next(err);
    }
  }

  async listUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await userService.listUsers();
      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();

