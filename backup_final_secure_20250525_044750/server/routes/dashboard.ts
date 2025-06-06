import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireAuth } from '../emailAuth';
import { addOutfitterContext } from '../outfitterContext';
import { asyncHandler } from '../utils/asyncHandler';
import { insertSettingsSchema } from '@shared/schema';

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

// Apply auth and outfitter context to all dashboard routes
router.use(requireAuth, addOutfitterContext);

// Dashboard statistics
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const stats = await storage.getDashboardStats();
  res.json(stats);
}));

// Upcoming bookings
router.get('/upcoming-bookings', asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
  const upcomingBookings = await storage.getUpcomingBookings(limit);
  res.json(upcomingBookings);
}));

// Settings routes
router.get('/settings', asyncHandler(async (req: Request, res: Response) => {
  // Temporary bypass to prevent UI blocking - will restore proper storage after authentication implementation
  res.json({
    companyName: 'Outfitter Demo',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyLogo: '',
    bookingLink: ''
  });
}));

router.post('/settings', adminOnly, asyncHandler(async (req: Request, res: Response) => {
  // 🚨 EMERGENCY SECURITY PATCH
  // 🔒 TEMPORARY DISABLE: This route is disabled due to a critical tenant isolation vulnerability
  // 🧼 Do NOT remove until full fix is implemented and regression tested
  console.error('[EMERGENCY DISABLE] Route temporarily disabled');
  return res.status(403).json({
    error: 'This route is temporarily disabled for security reasons.',
    route: req.originalUrl,
  });
  console.error('[EMERGENCY ERROR] Code after disable block should NOT run!');
}));

export default router;