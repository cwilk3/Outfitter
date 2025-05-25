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
  
  console.log('=== MODULARIZED ROUTES REGISTERED SUCCESSFULLY ===');
  
  // Note: 404 and error handlers are added AFTER Vite setup in index.ts
  // This ensures the React frontend is served for non-API routes

  const httpServer = createServer(app);
  return httpServer;
}