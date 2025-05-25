import type { Request, Response, NextFunction } from "express";

// Simple middleware to add outfitter context to requests
// This works with both dev and Replit authentication
export interface AuthenticatedRequest extends Request {
  user?: any;
  outfitterId?: number;
}

export function addOutfitterContext(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // For now, default to outfitter ID 1 (the default outfitter we created)
  // This will be enhanced when we implement full Replit authentication
  if (req.user) {
    req.outfitterId = 1; // Default outfitter for all authenticated users
  }
  
  next();
}

// Helper function to get outfitter ID from request
export function getOutfitterId(req: AuthenticatedRequest): number {
  return req.outfitterId || 1; // Default to 1 if not set
}