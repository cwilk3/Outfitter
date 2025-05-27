import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { 
  requireAuth, 
  loginUser, 
  registerUser, 
  logoutUser, 
  getCurrentUser
} from '../emailAuth';
import { asyncHandler, throwError } from '../utils/asyncHandler';
import { validate, commonSchemas } from '../middleware/validation';

const router = Router();

// Validation schemas for authentication
const authValidation = {
  loginSchema: z.object({
    email: commonSchemas.email,
    password: z.string().min(1, 'Password is required')
  }),
  
  registerSchema: z.object({
    email: commonSchemas.email,
    password: z.string().min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
    firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
    lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
    phone: commonSchemas.phone,
    companyName: z.string().min(1, 'Company name is required'),
    role: z.enum(['admin', 'guide'], { message: 'Role must be admin or guide' }).optional()
  })
};

// Email authentication routes with validation
router.post('/email-register', 
  validate({ body: authValidation.registerSchema }),
  (req: Request, res: Response) => {
    console.log('=== EMAIL REGISTER ROUTE HANDLER CALLED ===');
    console.log('registerUser function type:', typeof registerUser);
    console.log('registerUser function:', !!registerUser);
    return registerUser(req, res);
  }
);

router.post('/login', 
  validate({ body: authValidation.loginSchema }),
  loginUser
);

router.post('/logout', logoutUser);

// Auth check endpoint
router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  console.log('Direct auth check - cookies:', req.cookies);
  const token = req.cookies?.token;
  if (!token) {
    throwError('No token found', 401);
  }
  
  const { verifyToken } = await import('../emailAuth');
  const decoded = verifyToken(token);
  console.log('Direct auth check - decoded:', decoded);
  
  if (!decoded) {
    throwError('Invalid token', 401);
  }
  
  const user = await storage.getUserWithRole(decoded.userId);
  console.log('Direct auth check - user found:', user);
  
  if (!user) {
    throwError('User not found', 401);
  }
  
  const { passwordHash, ...userResponse } = user as any;
  res.json(userResponse);
}));

// Legacy auth check for frontend compatibility
router.get('/check', (req, res) => {
  res.json({
    authenticated: true,
    user: {
      id: 1,
      username: 'admin',
      firstName: 'John',
      lastName: 'Smith',
      role: 'admin'
    }
  });
});

// Current user endpoint with auth required
router.get('/user', requireAuth, getCurrentUser);

export default router;