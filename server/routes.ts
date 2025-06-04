import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import apiRoutes from './routes/index';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { z } from 'zod';

// Import User type from shared schema
import type { User } from "@shared/schema";

// Authentication request interface 
interface AuthenticatedRequest extends Request {
  user?: User & { outfitterId: number };
}

// Define a Zod schema for incoming user creation payload (UserFormValues)
const createUserSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'guide'], { message: 'Role must be admin or guide' }),
});

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('=== REGISTERING MODULARIZED ROUTES ===');
  
  // PRIORITY FIX: Register experience-addons route using exact pattern that works for DELETE
  app.get('/api/experience-addons/:experienceId', async (req: AuthenticatedRequest, res: Response) => {
    console.log('🔥 [PRIORITY EXPERIENCE-ADDONS] Route hit - bypassing Vite!', { experienceId: req.params.experienceId });
    
    try {
      // Set headers to ensure JSON response
      res.setHeader('Content-Type', 'application/json');
      
      // Import dependencies dynamically to avoid circular imports
      const { requireAuth } = await import('./emailAuth');
      const { addOutfitterContext } = await import('./outfitterContext');
      const { storage } = await import('./storage');
      
      // Manual authentication check
      const authResult = await new Promise<{ user?: any; error?: string }>((resolve) => {
        requireAuth(req as any, res, (error?: any) => {
          if (error) {
            resolve({ error: error.message || 'Authentication failed' });
          } else {
            resolve({ user: (req as any).user });
          }
        });
      });

      if (authResult.error || !authResult.user) {
        console.log('🚫 [AUTH-FAIL] Authentication failed');
        return res.status(401).json({ error: "Authentication required" });
      }

      // Add outfitter context
      await new Promise<void>((resolve) => {
        addOutfitterContext(req as any, res, () => resolve());
      });

      const experienceId = parseInt(req.params.experienceId);
      const user = (req as any).user;
      const outfitterId = user?.outfitterId;

      console.log('🔒 [DEBUG] Auth successful', { experienceId, outfitterId, userId: user?.id });

      if (!outfitterId) {
        console.log('🚫 [AUTH-FAIL] No outfitterId found');
        return res.status(401).json({ error: "Authentication required" });
      }

      // 🔒 TENANT ISOLATION: Verify experience belongs to user's outfitter
      const experience = await storage.getExperience(experienceId);
      console.log('🔍 [DEBUG] Experience lookup', { experience: !!experience, experienceOutfitterId: experience?.outfitterId });
      
      if (!experience || experience.outfitterId !== outfitterId) {

        return res.status(404).json({ error: "Experience not found" });
      }

      console.log('✅ [TENANT-VERIFIED] Fetching experience addons', { experienceId, outfitterId });
      const addons = await storage.getExperienceAddons(experienceId);
      console.log('📋 [SUCCESS] Addons fetched', { count: addons?.length });
      
      return res.json(addons || []);
    } catch (error) {
      console.error('❌ [ERROR] Experience-addons route failed:', error);
      return res.status(500).json({ error: "Failed to fetch experience addons" });
    }
  });
  
  // PRIORITY FIX: Register DELETE route before modular routes to bypass Vite interference
  app.delete('/api/locations/:id', async (req: AuthenticatedRequest, res: Response) => {
    console.log('🔥 [PRIORITY DELETE] Route hit - bypassing Vite!', { locationId: req.params.id });
    
    // Import dependencies dynamically to avoid circular imports
    const { requireAuth } = await import('./emailAuth');
    const { storage } = await import('./storage');
    
    // Manual authentication check
    const authResult = await new Promise<{ user?: any; error?: string }>((resolve) => {
      requireAuth(req as any, res, (error?: any) => {
        if (error) {
          resolve({ error: error.message || 'Authentication failed' });
        } else {
          resolve({ user: (req as any).user });
        }
      });
    });
    
    if (authResult.error || !authResult.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const user = authResult.user;
    const id = parseInt(req.params.id);
    
    // Admin check
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    // Get location and verify ownership
    const location = await storage.getLocation(id);
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }
    
    if (location.outfitterId !== user.outfitterId) {
      console.error('🚨 EMERGENCY PROTOCOL: Unauthorized deletion attempt', {
        userId: user.id,
        userOutfitterId: user.outfitterId,
        locationOutfitterId: location.outfitterId
      });
      return res.status(404).json({ message: 'Location not found or unauthorized' });
    }
    
    // Delete location
    await storage.deleteLocation(id);
    
    console.log('✅ Location deleted successfully via priority route', {
      userId: user.id,
      locationId: id,
      locationName: location.name
    });
    
    res.status(200).json({ success: true, message: 'Location deleted successfully' });
  });

  // Add users endpoint for staff management
  app.get('/api/users', async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Import dependencies
      const { requireAuth } = await import('./emailAuth');
      const { addOutfitterContext } = await import('./outfitterContext');
      const { storage } = await import('./storage');
      
      // Manual authentication check
      const authResult = await new Promise<{ user?: any; error?: string }>((resolve) => {
        requireAuth(req as any, res, (error?: any) => {
          if (error) {
            resolve({ error: error.message || 'Authentication failed' });
          } else {
            resolve({ user: (req as any).user });
          }
        });
      });

      if (authResult.error || !authResult.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Add outfitter context
      await new Promise<void>((resolve) => {
        addOutfitterContext(req as any, res, () => resolve());
      });

      const user = authResult.user;
      const outfitterId = user.outfitterId;

      if (!outfitterId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Extract role(s) flexibly: allow 'role=guide' or 'role=admin,guide'
      let roles: string[] | undefined;
      if (typeof req.query.role === 'string' && req.query.role) {
        roles = req.query.role.split(',').map(r => r.trim()); // Split by comma and trim
      } else if (Array.isArray(req.query.role)) {
        roles = req.query.role.map(r => r.toString()); // Ensure array of strings
      }

      // Get users for this outfitter, filtered by role(s)
      const users = await storage.getUsersByOutfitterId(outfitterId, roles);
      
      // Remove password hashes from response
      const sanitizedUsers = users.map(user => {
        const { passwordHash, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      res.json(sanitizedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // POST /api/users - Create a new staff member (admin only)
  app.post('/api/users', async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Dynamic imports for middleware and storage (as per existing server/routes.ts pattern)
      const { requireAuth } = await import('./emailAuth');
      const { addOutfitterContext } = await import('./outfitterContext');
      const { storage } = await import('./storage');
      const { hashPassword } = await import('./emailAuth');

      // Manual authentication check (as per existing server/routes.ts pattern)
      const authResult = await new Promise<{ user?: any; error?: string }>((resolve) => {
        requireAuth(req as any, res, (error?: any) => {
          if (error) resolve({ error: error.message || 'Authentication failed' });
          else resolve({ user: (req as any).user });
        });
      });

      if (authResult.error || !authResult.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Add outfitter context (as per existing server/routes.ts pattern)
      await new Promise<void>((resolve) => {
        addOutfitterContext(req as any, res, () => resolve());
      });

      const user = authResult.user;
      const outfitterId = user.outfitterId;

      // Admin role check (as per existing server/routes.ts pattern)
      if (user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admin role required." });
      }

      if (!outfitterId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // --- ZOD VALIDATION ---
      const validationResult = createUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Invalid request data', 
          errors: validationResult.error.errors 
        });
      }
      const { password, firstName, lastName, email, phone, role } = validationResult.data;
      // --- END ZOD VALIDATION ---

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
        passwordHash, // createUserWithPassword expects passwordHash, not raw password
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
      
    } catch (error) {
      res.status(500).json({ error: 'Internal server error during staff creation.' });
    }
  });
  
  // Mount all API routes under /api prefix
  app.use('/api', apiRoutes);
  
  console.log('=== MODULARIZED ROUTES REGISTERED SUCCESSFULLY ===');
  
  // Note: 404 and error handlers are added AFTER Vite setup in index.ts
  // This ensures the React frontend is served for non-API routes

  const httpServer = createServer(app);
  return httpServer;
}