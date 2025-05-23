import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import type { User } from '@shared/schema';

// JWT secret - in production this should be from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';
const JWT_EXPIRES_IN = '7d';

export interface AuthenticatedRequest extends Request {
  user?: User & { outfitterId: number };
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate JWT token
export function generateToken(user: User, outfitterId: number): string {
  return jwt.sign(
    { 
      userId: user.id,
      email: user.email,
      role: user.role,
      outfitterId 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Verify JWT token
export function verifyToken(token: string): any {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token verification successful:', decoded);
    return decoded;
  } catch (error) {
    console.log('Token verification failed:', error.message);
    return null;
  }
}

// Middleware to check authentication
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.token;

    console.log('Auth check - token found:', !!token);

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    console.log('Auth check - decoded token:', decoded);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get user with role info
    const userWithRole = await storage.getUserWithRole(decoded.userId);
    console.log('Auth check - found user:', userWithRole);
    if (!userWithRole) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = userWithRole;
    console.log('Auth check - req.user set to:', req.user);

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

// Login endpoint
export async function loginUser(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user's outfitter
    const userWithRole = await storage.getUserWithRole(user.id);
    if (!userWithRole) {
      return res.status(401).json({ error: 'User role not found' });
    }

    // Generate token
    const token = generateToken(user, userWithRole.outfitterId);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Return user info (without password hash)
    const { passwordHash, ...userResponse } = user;
    res.json({
      user: userResponse,
      token,
      outfitterId: userWithRole.outfitterId
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

// Register endpoint
export async function registerUser(req: Request, res: Response) {
  try {
    const { email, password, firstName, lastName, phone, role = 'admin', companyName } = req.body;

    if (!email || !password || !firstName || !companyName) {
      return res.status(400).json({ 
        error: 'Email, password, first name, and company name are required' 
      });
    }

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const newUser = await storage.createUserWithPassword({
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
      role: role as 'admin' | 'guide'
    });

    // Create outfitter for this user
    const outfitter = await storage.createOutfitter({
      name: companyName,
      email: email,
      isActive: true
    });

    // Link user to outfitter
    await storage.createUserOutfitter({
      userId: newUser.id,
      outfitterId: outfitter.id,
      role: role as 'admin' | 'guide'
    });

    // Generate token
    const token = generateToken(newUser, outfitter.id);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Return user info (without password hash)
    const { passwordHash: _, ...userResponse } = newUser;
    res.status(201).json({
      user: userResponse,
      token,
      outfitterId: outfitter.id
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
}

// Logout endpoint
export function logoutUser(req: Request, res: Response) {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
}

// Get current user endpoint
export async function getCurrentUser(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Return user without password hash
    const { passwordHash, ...userResponse } = req.user;
    res.json(userResponse);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
}