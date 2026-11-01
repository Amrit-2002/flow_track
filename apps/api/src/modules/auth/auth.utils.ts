import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { UserRole } from '@flowtrack/shared';
import { env } from '../../config/env';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

export function generateRefreshTokenString(): string {
  return crypto.randomBytes(40).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function calculateRefreshTokenExpiry(): Date {
  // Default 7 days
  const now = new Date();
  now.setDate(now.getDate() + 7);
  return now;
}

