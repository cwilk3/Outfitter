import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../emailAuth';
import { addOutfitterContext } from '../outfitterContext';
import { storage } from '../storage';
import { hashPassword } from '../emailAuth';
import { asyncHandler } from '../utils/asyncHandler';
import { withTenantValidation, enforceTenantIsolation, validateTenantParam, TenantAwareRequest } from '../middleware/tenantValidation';
import { enableTenantSecurity } from '../middleware/tenantSecurity';
import { enableComprehensiveTenantSecurity } from '../middleware/tenantSecurityValidator';

const router = Router();

// Zod schemas for user validation
const createUserSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'guide'], { message: 'Role must be admin or guide' }),
});

const updateUserSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
  role: z.enum(['admin', 'guide'], { message: 'Role must be admin or guide' }).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
}).partial();

// Admin-only middleware
const adminOnly = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: "Access denied. Admin role required." });
  }
  next();
};

// Apply complete enterprise-grade tenant security stack to all user routes
router.use(requireAuth, addOutfitterContext, withTenantValidation(), enforceTenantIsolation('users', { allowedRoles: ['admin'] }), ...enableTenantSecurity(), ...enableComprehensiveTenantSecurity());

// GET /api/users - List users for staff management
router.get('/', asyncHandler(async (req: TenantAwareRequest, res: any) => {
  const outfitterId = req.tenantContext!.outfitterId;

  // Parse role filter from query parameters
  let roles: string[] = [];
  if (req.query.role) {
    if (typeof req.query.role === 'string') {
      roles = [req.query.role]; // Single role as string
    } else if (Array.isArray(req.query.role)) {
      roles = req.query.role.map((r: any) => r.toString()); // Ensure array of strings
    }
  }

  // Get users for this outfitter, filtered by role(s)
  const users = await storage.getUsersByOutfitterId(outfitterId, roles);
  
  // Remove password hashes from response
  const sanitizedUsers = users.map(user => {
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });

  res.json(sanitizedUsers);
}));

// POST /api/users - Create a new staff member (admin only)
router.post('/', requireAuth, addOutfitterContext, adminOnly, asyncHandler(async (req: any, res: any) => {
  const user = req.user;
  const outfitterId = user.outfitterId;

  if (!outfitterId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // Zod validation
  const validationResult = createUserSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({ 
      message: 'Invalid request data', 
      errors: validationResult.error.errors 
    });
  }
  const { password, firstName, lastName, email, phone, role } = validationResult.data;

  // Check if user with this email already exists
  const existingUser = await storage.getUserByEmail(email);
  if (existingUser) {
    return res.status(409).json({ error: 'User with this email already exists' });
  }

  // Hash the password
  const passwordHash = await hashPassword(password);

  // Create user with password
  const newUser = await storage.createUserWithPassword({
    email,
    passwordHash,
    firstName,
    lastName,
    phone,
    role
  });

  if (!newUser) {
    return res.status(500).json({ error: 'Failed to create user record.' });
  }

  // Link user to outfitter
  const userOutfitter = await storage.addUserToOutfitter(newUser.id, outfitterId, role);

  if (!userOutfitter) {
    return res.status(500).json({ error: 'Failed to link user to outfitter.' });
  }
  
  // Remove password hash before sending response
  const { passwordHash: _, ...userResponse } = newUser;
  res.status(201).json(userResponse);
}));

// PUT /api/users/:id - Update staff member (admin only)
router.put('/:id', requireAuth, addOutfitterContext, adminOnly, asyncHandler(async (req: any, res: any) => {
  const user = req.user;
  const userId = req.params.id;
  const outfitterId = user.outfitterId;

  if (!user || !outfitterId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Zod validation
  const validationResult = updateUserSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({ 
      message: 'Invalid request data', 
      errors: validationResult.error.errors 
    });
  }

  const updateData: any = validationResult.data;

  // Hash password if provided
  if (updateData.password) {
    updateData.passwordHash = await hashPassword(updateData.password);
    delete updateData.password; // Remove plain password
  }

  // Update user with tenant isolation
  const updatedUser = await storage.updateUser(userId, updateData);

  if (!updatedUser) {
    return res.status(404).json({ error: 'User not found or update failed' });
  }

  // Remove password hash before sending response
  const { passwordHash: _, ...userResponse } = updatedUser;
  res.json({ message: 'User updated successfully', user: userResponse });
}));

// DELETE /api/users/:id - Delete staff member (admin only)
router.delete('/:id', requireAuth, addOutfitterContext, adminOnly, asyncHandler(async (req: any, res: any) => {
  console.log('🔍 [USERS-ROUTER] DELETE /users/:id route hit');
  console.log('🔍 [USERS-ROUTER] req.params.id:', req.params.id);

  const user = req.user;
  const userId = req.params.id;
  const outfitterId = user.outfitterId;

  console.log('🔍 [USERS-ROUTER] Authenticated user:', user.id);
  console.log('🔍 [USERS-ROUTER] Target userId:', userId);
  console.log('🔍 [USERS-ROUTER] outfitterId:', outfitterId);

  if (!user || !outfitterId) {
    console.error('❌ [USERS-ROUTER] Authentication or outfitter context missing for staff deletion.');
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Prevent self-deletion
  if (user.id === userId) {
    console.error('❌ [USERS-ROUTER] User attempted to delete themselves.');
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }

  console.log('🔍 [USERS-ROUTER] Calling storage.deleteUser with:', { userId, outfitterId });

  // Attempt to delete the user using the storage deleteUser method
  const deletionResult = await storage.deleteUser(userId, outfitterId);

  console.log('✅ [USERS-ROUTER] User deletion result:', deletionResult);

  if (!deletionResult) {
    console.error('❌ [USERS-ROUTER] Deletion failed or user not found.');
    return res.status(404).json({ error: 'User not found or deletion failed.' });
  }

  console.log('✅ [USERS-ROUTER] Staff member deleted successfully. Responding with 204.');
  res.status(204).end(); // 204 No Content for successful deletion
}));

export default router;