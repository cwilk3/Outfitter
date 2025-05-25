import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireAuth } from '../emailAuth';
import { addOutfitterContext, AuthenticatedRequest } from '../outfitterContext';
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

// Debug middleware to track all requests to this router
router.use((req, res, next) => {
  console.log(`🔍 [LOCATIONS ROUTER] ${req.method} ${req.path} - Route Hit!`);
  next();
});

// Get all locations (guides can view, filtered by activeOnly)
router.get('/', guideOrAdmin, asyncHandler(async (req: Request, res: Response) => {
  const activeOnly = req.query.activeOnly === 'true';
  const locations = await storage.listLocations(activeOnly);
  
  // Disable caching to ensure fresh data after deletions
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  
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
router.post('/', adminOnly, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  console.log('🚨 [CRITICAL] TENANT ASSIGNMENT ROUTE EXECUTING!');
  console.log('[LOCATION_CREATE] Request body:', JSON.stringify(req.body, null, 2));
  console.log('🔍 [DEBUG] User context:', { 
    userId: req.user?.id, 
    outfitterId: req.user?.outfitterId,
    role: req.user?.role 
  });
  
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
  
  // 🔒 MULTI-TENANT FIX: Inject outfitterId from authenticated user context
  const locationDataWithTenant = {
    ...validatedData,
    outfitterId: req.user?.outfitterId
  };
  
  console.log('🔒 [TENANT_ASSIGNMENT] Creating location with outfitterId:', req.user?.outfitterId);
  console.log('🔒 [TENANT_ASSIGNMENT] Location data being saved:', locationDataWithTenant);
  
  const location = await storage.createLocation(locationDataWithTenant);
  
  console.log('✅ [SUCCESS] Created location:', { 
    id: location.id, 
    name: location.name, 
    outfitterId: location.outfitterId 
  });
  
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

// Delete location (admin only with multi-tenant safeguards)
router.delete('/:id', adminOnly, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const user = req.user;
  
  console.log('🔥 [DELETE] /api/locations/:id route HIT!', {
    locationId: id,
    userId: user?.id,
    userRole: user?.role,
    outfitterId: user?.outfitterId,
    timestamp: new Date().toISOString()
  });
  
  // SAFEGUARD: Verify user authentication and outfitterId
  if (!user?.outfitterId) {
    console.error('🚨 EMERGENCY PROTOCOL: Delete attempt without valid outfitterId', {
      userId: user?.id,
      locationId: id,
      timestamp: new Date().toISOString()
    });
    return res.status(401).json({ message: 'Authentication required - no outfitter context found' });
  }
  
  // SAFEGUARD: Get location to verify ownership before deletion
  const location = await storage.getLocation(id);
  
  if (!location) {
    return res.status(404).json({ message: 'Location not found' });
  }
  
  // SAFEGUARD: Multi-tenant isolation check
  if (location.outfitterId !== user.outfitterId) {
    console.error('🚨 EMERGENCY PROTOCOL: Unauthorized deletion attempt detected', {
      userId: user.id,
      userOutfitterId: user.outfitterId,
      locationId: id,
      locationOutfitterId: location.outfitterId,
      timestamp: new Date().toISOString()
    });
    return res.status(404).json({ message: 'Location not found or unauthorized' });
  }
  
  // SAFEGUARD: Perform deletion only after all checks pass
  await storage.deleteLocation(id);
  
  console.log('✅ Location deleted successfully', {
    userId: user.id,
    outfitterId: user.outfitterId,
    locationId: id,
    locationName: location.name,
    timestamp: new Date().toISOString()
  });
  
  res.status(200).json({ 
    success: true, 
    message: 'Location deleted successfully' 
  });
}));

export default router;