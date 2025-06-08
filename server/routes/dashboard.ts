import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireAuth } from '../emailAuth';
import { addOutfitterContext } from '../outfitterContext';
import { asyncHandler } from '../utils/asyncHandler';
import { insertSettingsSchema } from '@shared/schema';
import { withTenantValidation, enforceTenantIsolation, TenantAwareRequest } from '../middleware/tenantValidation';
import { enableTenantSecurity } from '../middleware/tenantSecurity';
import { enableComprehensiveTenantSecurity } from '../middleware/tenantSecurityValidator';
import { tenantCache, cacheKeys } from '../cache/tenantCache';
import { createTenantRateLimit } from '../middleware/tenantRateLimit';

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

const adminOnly = hasRole('admin');

// Apply complete enterprise-grade tenant security stack with enhanced rate limiting to all dashboard routes
router.use(requireAuth, addOutfitterContext, withTenantValidation(), enforceTenantIsolation('dashboard'), createTenantRateLimit('api'), ...enableTenantSecurity(), ...enableComprehensiveTenantSecurity());

// Dashboard statistics with caching
router.get('/stats', asyncHandler(async (req: TenantAwareRequest, res: Response) => {
  const outfitterId = req.tenantContext!.outfitterId;
  
  // Check cache first
  const cachedStats = await tenantCache.get(cacheKeys.DASHBOARD_STATS, outfitterId);
  if (cachedStats) {
    return res.json(cachedStats);
  }

  const stats = await storage.getDashboardStatsByOutfitter(outfitterId);
  
  // Cache for 2 minutes (dashboard data changes frequently)
  await tenantCache.set(cacheKeys.DASHBOARD_STATS, stats, outfitterId, undefined, 2 * 60 * 1000);
  
  res.json(stats);
}));

// Upcoming bookings with caching
router.get('/upcoming-bookings', asyncHandler(async (req: TenantAwareRequest, res: Response) => {
  const outfitterId = req.tenantContext!.outfitterId;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
  
  // Check cache first
  const cacheParams = { limit };
  const cachedBookings = await tenantCache.get(cacheKeys.UPCOMING_BOOKINGS, outfitterId, cacheParams);
  if (cachedBookings) {
    return res.json(cachedBookings);
  }

  const upcomingBookings = await storage.getUpcomingBookings(limit, outfitterId);
  
  // Cache for 5 minutes (booking data changes less frequently)
  await tenantCache.set(cacheKeys.UPCOMING_BOOKINGS, upcomingBookings, outfitterId, cacheParams, 5 * 60 * 1000);
  
  res.json(upcomingBookings);
}));

// Settings routes
router.get('/settings', asyncHandler(async (req: Request, res: Response) => {
  const outfitterId = (req as any).user?.outfitterId;
  
  if (!outfitterId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const settings = await storage.getSettingsByOutfitter(outfitterId);
  
  if (settings) {
    res.json(settings);
  } else {
    // Return empty settings for new outfitters
    res.json({
      companyName: '',
      companyAddress: '',
      companyPhone: '',
      companyEmail: '',
      companyLogo: '',
      bookingLink: ''
    });
  }
}));

router.post('/settings', adminOnly, asyncHandler(async (req: Request, res: Response) => {
  console.log('[TENANT-SECURE] Starting settings update with tenant isolation');
  
  const user = (req as any).user;
  const outfitterId = user?.outfitterId;

  if (!outfitterId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // 🔒 TENANT ISOLATION: Parse and validate request data
  const validatedData = insertSettingsSchema.parse(req.body);
  
  console.log(`[TENANT-VERIFIED] Settings update for outfitter ${outfitterId}`);

  // ✅ SAFE OPERATION: Update settings for authenticated outfitter
  const settings = await storage.updateSettingsByOutfitter(validatedData, outfitterId);

  console.log(`[TENANT-SUCCESS] Settings updated successfully for outfitter ${outfitterId}`);
  return res.json(settings);
}));

export default router;