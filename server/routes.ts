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
  
  // Mount all API routes under /api prefix
  app.use('/api', apiRoutes);
  
  // EMERGENCY WORKAROUND: Direct DELETE route registration to bypass Vite interference
  app.delete('/api/locations/:id', async (req: AuthenticatedRequest, res: Response) => {
    console.log('🔥 [EMERGENCY DELETE] Direct route hit!', { locationId: req.params.id });
    
    try {
      const id = parseInt(req.params.id);
      const token = req.cookies.token;
      
      if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Get user from token manually
      const jwt = await import('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      const storage = (await import('./storage')).storage;
      const user = await storage.getUser(decoded.userId);
      
      if (!user || user.role !== 'admin' || !user.outfitterId) {
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
      
      console.log('✅ Location deleted successfully via emergency route', {
        userId: user.id,
        locationId: id,
        locationName: location.name
      });
      
      res.status(200).json({ success: true, message: 'Location deleted successfully' });
    } catch (error) {
      console.error('❌ Emergency delete route error:', error);
      res.status(500).json({ message: 'Failed to delete location' });
    }
  });
  
  console.log('=== MODULARIZED ROUTES REGISTERED SUCCESSFULLY ===');
  
  // Note: 404 and error handlers are added AFTER Vite setup in index.ts
  // This ensures the React frontend is served for non-API routes

  const httpServer = createServer(app);
  return httpServer;
}