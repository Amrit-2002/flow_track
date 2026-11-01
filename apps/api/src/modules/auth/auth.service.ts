import bcrypt from 'bcryptjs';
import { RegisterInput, LoginInput, UserDTO, UserRole, ThemePreference } from '@flowtrack/shared';
import { prisma } from '../../shared/prisma';
import { ConflictError, UnauthorizedError } from '../../shared/errors';
import {
  generateAccessToken,
  generateRefreshTokenString,
  hashToken,
  calculateRefreshTokenExpiry,
} from './auth.utils';

export interface AuthResult {
  user: UserDTO;
  accessToken: string;
  refreshTokenString: string;
}

export class AuthService {
  private formatUserDto(user: {
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

  async register(
    input: RegisterInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResult> {
    // 1. Check for existing active user
    const existing = await prisma.user.findFirst({
      where: {
        email: input.email.toLowerCase(),
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictError('A user with this email address already exists.');
    }

    // 2. Hash password (10 salt rounds)
    const passwordHash = await bcrypt.hash(input.password, 10);

    // 3. Create user record
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        password: passwordHash,
        role: input.role || UserRole.USER,
      },
    });

    // 4. Create durable refresh token
    const rawRefreshToken = generateRefreshTokenString();
    const tokenHash = hashToken(rawRefreshToken);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: calculateRefreshTokenExpiry(),
        ipAddress,
        userAgent,
      },
    });

    // 5. Generate short-lived JWT access token
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      name: user.name,
    });

    return {
      user: this.formatUserDto(user),
      accessToken,
      refreshTokenString: rawRefreshToken,
    };
  }

  async login(
    input: LoginInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResult> {
    // 1. Retrieve active user
    const user = await prisma.user.findFirst({
      where: {
        email: input.email.toLowerCase(),
        deletedAt: null,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    // 2. Verify password hash
    const isPasswordValid = await bcrypt.compare(input.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    // 3. Generate refresh token
    const rawRefreshToken = generateRefreshTokenString();
    const tokenHash = hashToken(rawRefreshToken);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: calculateRefreshTokenExpiry(),
        ipAddress,
        userAgent,
      },
    });

    // 4. Generate access token
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      name: user.name,
    });

    return {
      user: this.formatUserDto(user),
      accessToken,
      refreshTokenString: rawRefreshToken,
    };
  }

  async refresh(
    rawRefreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResult> {
    if (!rawRefreshToken) {
      throw new UnauthorizedError('Refresh token is required.');
    }

    const currentHash = hashToken(rawRefreshToken);

    // Find the token record in database
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash: currentHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedError('Invalid refresh token.');
    }

    // Reuse detection: If token was already revoked, a compromised token is being reused
    if (tokenRecord.revokedAt) {
      // Invalidate all tokens for this user session as a safety measure
      await prisma.refreshToken.updateMany({
        where: { userId: tokenRecord.userId },
        data: { revokedAt: new Date() },
      });

      throw new UnauthorizedError(
        'Token reuse detected. All sessions have been revoked for your security. Please log in again.'
      );
    }

    // Expiration check
    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token has expired. Please log in again.');
    }

    // Check user active status
    if (tokenRecord.user.deletedAt) {
      throw new UnauthorizedError('User account has been deactivated.');
    }

    // Rotate: Revoke current token
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    // Issue new refresh token
    const newRawRefreshToken = generateRefreshTokenString();
    const newTokenHash = hashToken(newRawRefreshToken);

    await prisma.refreshToken.create({
      data: {
        userId: tokenRecord.userId,
        tokenHash: newTokenHash,
        expiresAt: calculateRefreshTokenExpiry(),
        ipAddress,
        userAgent,
      },
    });

    // Issue new access token
    const accessToken = generateAccessToken({
      userId: tokenRecord.user.id,
      email: tokenRecord.user.email,
      role: tokenRecord.user.role as UserRole,
      name: tokenRecord.user.name,
    });

    return {
      user: this.formatUserDto(tokenRecord.user),
      accessToken,
      refreshTokenString: newRawRefreshToken,
    };
  }

  async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) return;

    const tokenHash = hashToken(rawRefreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

export const authService = new AuthService();
