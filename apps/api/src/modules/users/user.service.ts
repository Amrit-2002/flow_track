import bcrypt from 'bcryptjs';
import {
  UpdateProfileInput,
  ChangePasswordInput,
  ThemePreference,
  UserDTO,
  UserRole,
} from '@flowtrack/shared';
import { prisma } from '../../shared/prisma';
import { NotFoundError, BadRequestError, ConflictError } from '../../shared/errors';

export class UserService {
  private formatUser(user: {
    id: string;
    name: string;
    email: string;
    role: string;
    themePreference: string;
    createdAt: Date;
  }): UserDTO {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      themePreference: user.themePreference as ThemePreference,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async getProfile(userId: string): Promise<UserDTO> {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundError('User profile not found.');
    }

    return this.formatUser(user);
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserDTO> {
    if (input.email) {
      const emailNormalized = input.email.toLowerCase();
      const existing = await prisma.user.findFirst({
        where: {
          email: emailNormalized,
          id: { not: userId },
          deletedAt: null,
        },
      });

      if (existing) {
        throw new ConflictError('A user with this email address already exists.');
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.email && { email: input.email.toLowerCase() }),
      },
    });

    return this.formatUser(updated);
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found.');
    }

    const isMatch = await bcrypt.compare(input.currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestError('Current password does not match.');
    }

    const newHash = await bcrypt.hash(input.newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: newHash },
    });

    // Revoke existing refresh tokens so other sessions are forced to re-login
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });
  }

  async updateTheme(userId: string, theme: ThemePreference): Promise<ThemePreference> {
    await prisma.user.update({
      where: { id: userId },
      data: { themePreference: theme },
    });

    return theme;
  }

  async deleteAccount(userId: string, currentPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found.');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestError('Current password is incorrect.');
    }

    // Exact parity with Laravel ProfileController@destroy:
    // 1. Delete tasks and clients
    await prisma.task.deleteMany({ where: { userId } });
    await prisma.client.deleteMany({ where: { userId } });

    // 2. Revoke refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });

    // 3. Soft-delete user
    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });
  }

  async listUsers(): Promise<UserDTO[]> {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });

    return users.map((u) => this.formatUser(u));
  }
}

export const userService = new UserService();

