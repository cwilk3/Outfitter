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
  console.log('Enter registerUser function. req.body:', JSON.stringify(req.body, null, 2));
  console.log('--- START of Registration Handler ---');
  console.log('Initial req.body received:', JSON.stringify(req.body, null, 2));
  
  console.log('REGISTER FUNCTION CALLED');
  
  // Declare variables at function scope level to ensure accessibility
  let newUser: User | null = null;
  let outfitter: any | null = null;
  
  try {
    const { email, password, firstName, lastName, phone, role = 'admin', companyName } = req.body;

    // Debug the actual request body to identify the issue
    console.log('Request body received:', JSON.stringify(req.body, null, 2));
    console.log('Validation check - email:', !!email, 'password:', !!password, 'firstName:', !!firstName, 'companyName:', !!companyName);

    if (!email || !password || !firstName || !companyName) {
      console.log('Validation failed - missing fields:', { email: !email, password: !password, firstName: !firstName, companyName: !companyName });
      return res.status(400).json({ 
        error: 'Email, password, first name, and company name are required' 
      });
    }

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    console.log('=== REGISTRATION DEBUG START ===');
    console.log('Registration data received:', { email, firstName, lastName, phone, role, companyName });

    // Hash password
    console.log('Hashing password...');
    const passwordHash = await hashPassword(password);
    console.log('Password hashed successfully');

    // Create user
    console.log('Creating user with data:', {
      email,
      passwordHash: '[HIDDEN]',
      firstName,
      lastName,
      phone,
      role: role as 'admin' | 'guide'
    });
    
    // --- Start of New Granular Logging --- 
    console.log('[DEBUG] Pre-User Creation: Value of newUser variable before assignment:', newUser);
    newUser = await storage.createUserWithPassword({
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
      role: role as 'admin' | 'guide'
    });
    console.log('[DEBUG] Post-User Creation: Value of newUser variable after assignment:', JSON.stringify(newUser, null, 2));
    console.log('[DEBUG] Post-User Creation: Type of newUser variable:', typeof newUser);

    if (!newUser) {
        console.error('[DEBUG] CRITICAL: newUser is null or undefined immediately after storage.createUserWithPassword attempt!');
        throw new Error('Failed to create user or newUser variable not assigned correctly.');
    }

    console.log('[DEBUG] Pre-Outfitter Creation: Value of outfitter variable before assignment:', outfitter);
    outfitter = await storage.createOutfitter({
      name: companyName,
      email: email,
      isActive: true
    });
    console.log('[DEBUG] Post-Outfitter Creation: Value of outfitter variable after assignment:', JSON.stringify(outfitter, null, 2));
    console.log('[DEBUG] Post-Outfitter Creation: Type of outfitter variable:', typeof outfitter);

    if (!outfitter) {
        console.error('[DEBUG] CRITICAL: outfitter is null or undefined immediately after storage.createOutfitter attempt!');
        throw new Error('Failed to create outfitter or outfitter variable not assigned correctly.');
    }
    
    console.log('[DEBUG] Pre-UserOutfitter Link: newUser value:', JSON.stringify(newUser, null, 2), 'outfitter value:', JSON.stringify(outfitter, null, 2));
    const userOutfitter = await storage.createUserOutfitter({
      userId: newUser.id,
      outfitterId: outfitter.id,
      role: role as 'admin' | 'guide'
    });
    console.log('[DEBUG] Post-UserOutfitter Link: userOutfitter value:', JSON.stringify(userOutfitter, null, 2));
    console.log('✅ Created user-outfitter relationship successfully:', userOutfitter);

    // Check right before the token generation and response area
    console.log('[DEBUG] Approaching token generation. newUser type:', typeof newUser, 'Value:', JSON.stringify(newUser, null, 2));
    console.log('[DEBUG] Approaching token generation. outfitter type:', typeof outfitter, 'Value:', JSON.stringify(outfitter, null, 2));
    // --- End of New Granular Logging --- 

    if (newUser && outfitter) {
        console.log('[DEBUG] newUser and outfitter are valid. Proceeding to generate token and send response.');
        const token = generateToken(newUser, outfitter.id);
        console.log('[DEBUG] Token generated:', token ? '****** (exists)' : 'null or undefined');

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });
        console.log('[DEBUG] Cookie set. Preparing JSON response.');

        console.log('[DEBUG] About to destructure newUser for response. newUser value:', JSON.stringify(newUser, null, 2));
        const { passwordHash: _, ...userResponse } = newUser; 
        console.log('[DEBUG] userResponse after destructuring:', JSON.stringify(userResponse, null, 2));

        res.status(201).json({
            ...userResponse,
            outfitterId: outfitter.id
        });
        console.log('[DEBUG] Success response sent.');
    } else {
        console.error('[DEBUG] CRITICAL LOGIC ERROR: newUser or outfitter is falsy before token/response section, despite earlier checks.', 
          { newUserExists: !!newUser, outfitterExists: !!outfitter }
        );
        return res.status(500).json({ error: 'Internal server error after data creation steps due to missing user/outfitter variables.' });
    }

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
    console.log('getCurrentUser called, req.user:', req.user);
    
    if (!req.user) {
      console.log('No user found in request');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Return user without password hash
    const { passwordHash, ...userResponse } = req.user;
    console.log('Returning user response:', userResponse);
    res.json(userResponse);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
}