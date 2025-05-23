import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { users, refreshTokens } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secure-jwt-secret-key-change-in-production';
const JWT_EXPIRES_IN = '15m'; // Short-lived access tokens
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'guide';
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

// Password hashing utilities
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// JWT token utilities
export const generateAccessToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const generateRefreshToken = (): string => {
  return crypto.randomBytes(64).toString('hex');
};

export const verifyAccessToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
};

// Store refresh token in database
export const storeRefreshToken = async (
  userId: string,
  refreshToken: string,
  deviceInfo?: string,
  ipAddress?: string
): Promise<void> => {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN);
  
  await db.insert(refreshTokens).values({
    token: refreshToken,
    userId,
    expiresAt,
    deviceInfo,
    ipAddress,
  });
};

// Verify and get refresh token from database
export const verifyRefreshToken = async (token: string) => {
  const [refreshToken] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.token, token),
        eq(refreshTokens.isRevoked, false)
      )
    );

  if (!refreshToken) {
    return null;
  }

  // Check if token is expired
  if (new Date() > refreshToken.expiresAt) {
    // Clean up expired token
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.id, refreshToken.id));
    return null;
  }

  return refreshToken;
};

// Revoke refresh token
export const revokeRefreshToken = async (token: string): Promise<void> => {
  await db
    .update(refreshTokens)
    .set({ isRevoked: true })
    .where(eq(refreshTokens.token, token));
};

// Revoke all refresh tokens for a user (useful for logout all devices)
export const revokeAllUserTokens = async (userId: string): Promise<void> => {
  await db
    .update(refreshTokens)
    .set({ isRevoked: true })
    .where(eq(refreshTokens.userId, userId));
};

// Clean up expired tokens (should be run periodically)
export const cleanupExpiredTokens = async (): Promise<void> => {
  await db
    .update(refreshTokens)
    .set({ isRevoked: true })
    .where(eq(refreshTokens.isRevoked, false));
};

// Authentication middleware
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ message: 'Access token required' });
    return;
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({ message: 'Invalid or expired access token' });
    return;
  }

  // Verify user still exists and is active
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.userId));

  if (!user) {
    res.status(401).json({ message: 'User not found' });
    return;
  }

  req.user = payload;
  next();
};

// Role-based authorization middleware
export const requireRole = (allowedRoles: ('admin' | 'guide')[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

// Generate secure random token for email verification/password reset
export const generateSecureToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Utility to get device info from request
export const getDeviceInfo = (req: Request): string => {
  const userAgent = req.headers['user-agent'] || 'Unknown';
  return userAgent.substring(0, 255); // Limit length for database
};

// Utility to get IP address from request
export const getIpAddress = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' 
    ? forwarded.split(',')[0] 
    : req.connection.remoteAddress || req.socket.remoteAddress || 'Unknown';
  
  return ip.substring(0, 45); // Limit length for database (IPv6 max length)
};