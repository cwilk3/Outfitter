import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import apiRoutes from './routes/index';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Import User type from shared schema
import type { User } from "@shared/schema";

// Authentication request interface 
interface AuthenticatedRequest extends Request {
  user?: User & { outfitterId: number };
}

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
    console.log('--- DIAGNOSTIC: POST /api/users Route ---');
    console.log('🔍 [STAFF-CREATE] POST /api/users route hit');
    console.log('🔍 [STAFF-CREATE] Complete req.body:', JSON.stringify(req.body, null, 2));

    try {
      // Import dependencies dynamically
      const { requireAuth } = await import('./emailAuth');
      const { addOutfitterContext } = await import('./outfitterContext');
      const { storage } = await import('./storage');
      const { hashPassword } = await import('./emailAuth');

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
        console.error('❌ [STAFF-CREATE] Authentication failed');
        return res.status(401).json({ error: "Authentication required" });
      }

      // Add outfitter context
      await new Promise<void>((resolve) => {
        addOutfitterContext(req as any, res, () => resolve());
      });

      const user = authResult.user;
      const outfitterId = user.outfitterId;

      // Admin role check
      if (user.role !== 'admin') {
        console.error('❌ [STAFF-CREATE] Access denied - admin role required');
        return res.status(403).json({ error: "Access denied. Admin role required." });
      }

      if (!outfitterId) {
        console.error('❌ [STAFF-CREATE] Authentication or outfitter context missing for staff creation.');
        return res.status(401).json({ error: "Authentication required" });
      }

      // Validate request body fields
      const { username, password, firstName, lastName, email, phone, role } = req.body;
      
      if (!username || username.length < 3) {
        console.error('❌ [STAFF-CREATE] Invalid username:', username);
        return res.status(400).json({ 
          message: 'Invalid request data', 
          errors: [{ path: ['username'], message: 'Username must be at least 3 characters' }]
        });
      }

      if (!password || password.length < 6) {
        console.error('❌ [STAFF-CREATE] Invalid password length');
        return res.status(400).json({ 
          message: 'Invalid request data', 
          errors: [{ path: ['password'], message: 'Password must be at least 6 characters' }]
        });
      }

      if (!firstName || firstName.length < 2) {
        console.error('❌ [STAFF-CREATE] Invalid firstName:', firstName);
        return res.status(400).json({ 
          message: 'Invalid request data', 
          errors: [{ path: ['firstName'], message: 'First name is required' }]
        });
      }

      if (!lastName || lastName.length < 2) {
        console.error('❌ [STAFF-CREATE] Invalid lastName:', lastName);
        return res.status(400).json({ 
          message: 'Invalid request data', 
          errors: [{ path: ['lastName'], message: 'Last name is required' }]
        });
      }

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        console.error('❌ [STAFF-CREATE] Invalid email:', email);
        return res.status(400).json({ 
          message: 'Invalid request data', 
          errors: [{ path: ['email'], message: 'Invalid email address' }]
        });
      }

      if (!role || !['admin', 'guide'].includes(role)) {
        console.error('❌ [STAFF-CREATE] Invalid role:', role);
        return res.status(400).json({ 
          message: 'Invalid request data', 
          errors: [{ path: ['role'], message: 'Role must be admin or guide' }]
        });
      }

      // Check if user with this email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        console.warn('⚠️ [STAFF-CREATE] Attempted to create staff member with existing email:', email);
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      // Hash the password
      const passwordHash = await hashPassword(password);

      // Create user with password
      console.log('🔍 [STAFF-CREATE] Calling storage.createUserWithPassword with:', { email, firstName, lastName, phone, role });
      const newUser = await storage.createUserWithPassword({
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        role
      });
      console.log('✅ [STAFF-CREATE] User created in database:', newUser?.id);

      if (!newUser) {
        console.error('❌ [STAFF-CREATE] storage.createUserWithPassword returned null/undefined.');
        return res.status(500).json({ error: 'Failed to create user record.' });
      }

      // Link user to outfitter
      console.log('🔍 [STAFF-CREATE] Calling storage.addUserToOutfitter with:', { userId: newUser.id, outfitterId, role });
      const userOutfitter = await storage.addUserToOutfitter(newUser.id, outfitterId, role);
      console.log('✅ [STAFF-CREATE] User-outfitter relationship created:', userOutfitter?.id);

      if (!userOutfitter) {
        console.error('❌ [STAFF-CREATE] storage.addUserToOutfitter failed for user:', newUser.id);
        return res.status(500).json({ error: 'Failed to link user to outfitter.' });
      }
      
      // Remove password hash before sending response
      const { passwordHash: _, ...userResponse } = newUser;
      console.log('✅ [STAFF-CREATE] Staff member created successfully. Responding with 201.');
      res.status(201).json(userResponse);
      
    } catch (error) {
      console.error('❌ [STAFF-CREATE] Error during staff member creation:', error);
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