import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireAuth } from '../emailAuth';
import { addOutfitterContext } from '../outfitterContext';
import { asyncHandler } from '../utils/asyncHandler';
import { insertLocationSchema } from '@shared/schema';

const router = Router();

// Role-based permission middleware
const hasRole = (requiredRole: 'admin' | 'guide') => async (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  
  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (requiredRole === 'guide' && (user.role === 'admin' || user.role === 'guide')) {
    return next();
  }
  
  if (requiredRole === 'admin' && user.role === 'admin') {
    return next();
  }
  
  return res.status(403).json({ message: 'Insufficient permissions' });
};

const guideOrAdmin = hasRole('guide');
const adminOnly = hasRole('admin');

// Apply auth and outfitter context to all location routes
router.use(requireAuth, addOutfitterContext);

// Get all locations (guides can view, filtered by activeOnly)
router.get('/', guideOrAdmin, asyncHandler(async (req: Request, res: Response) => {
  const activeOnly = req.query.activeOnly === 'true';
  const locations = await storage.listLocations(activeOnly);
  res.json(locations);
}));

// Get location by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const location = await storage.getLocation(id);
  
  if (!location) {
    return res.status(404).json({ message: 'Location not found' });
  }
  
  res.json(location);
}));

// Create new location (admin only)
router.post('/', adminOnly, asyncHandler(async (req: Request, res: Response) => {
  console.log('[LOCATION_CREATE] Request body:', JSON.stringify(req.body, null, 2));
  
  // Check if images is an array
  if (req.body.images && !Array.isArray(req.body.images)) {
    console.log('[LOCATION_CREATE] Images is not an array, converting:', req.body.images);
    // Try to parse it if it's a string
    try {
      req.body.images = JSON.parse(req.body.images);
    } catch (e) {
      console.log('[LOCATION_CREATE] Failed to parse images:', e);
      req.body.images = [];
    }
  }
  
  const validatedData = insertLocationSchema.parse(req.body);
  const location = await storage.createLocation(validatedData);
  res.status(201).json(location);
}));

// Update location (admin only)
router.patch('/:id', adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const validatedData = insertLocationSchema.partial().parse(req.body);
  
  const updatedLocation = await storage.updateLocation(id, validatedData);
  
  if (!updatedLocation) {
    return res.status(404).json({ message: 'Location not found' });
  }
  
  res.json(updatedLocation);
}));

export default router;