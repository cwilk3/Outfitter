import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import apiRoutes from './routes/index';

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
  
  console.log('=== MODULARIZED ROUTES REGISTERED SUCCESSFULLY ===');
  
  // Global error handler
  app.use((err: any, req: Request, res: Response, next: Function) => {
    console.error('Global error handler:', err.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Something went wrong.' 
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}