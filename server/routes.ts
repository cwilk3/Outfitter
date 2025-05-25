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
        console.log('🚫 [TENANT-BLOCK] Experience access denied', { experienceId, userOutfitterId: outfitterId, experienceOutfitterId: experience?.outfitterId });
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
  
  // Mount all API routes under /api prefix
  app.use('/api', apiRoutes);
  
  console.log('=== MODULARIZED ROUTES REGISTERED SUCCESSFULLY ===');
  
  // Note: 404 and error handlers are added AFTER Vite setup in index.ts
  // This ensures the React frontend is served for non-API routes

  const httpServer = createServer(app);
  return httpServer;
}