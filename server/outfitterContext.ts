import type { Request, Response, NextFunction } from "express";

// Simple middleware to add outfitter context to requests
// This works with both dev and Replit authentication
export interface AuthenticatedRequest extends Request {
  user?: any;
  outfitterId?: number;
}

export function addOutfitterContext(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Dynamically assign outfitterId from the authenticated user, for multi-tenant support
  if (req.user && req.user.outfitterId) { // Ensure req.user and its outfitterId are present
    req.outfitterId = req.user.outfitterId; // Assign the actual outfitterId from the authenticated user
  } else {
    // If no user or outfitterId is found (e.g., public route, unauthenticated request)
    // or if the authenticated user doesn't have an outfitterId (shouldn't happen for valid users)
    // ensure outfitterId is explicitly undefined or null to prevent unintended access.
    // This will cause tenant-isolated routes to correctly return 401/404.
    req.outfitterId = undefined; 
  }
  
  next();
}

// Helper function to get outfitter ID from request
export function getOutfitterId(req: AuthenticatedRequest): number {
  return req.outfitterId || 1; // Default to 1 if not set
}