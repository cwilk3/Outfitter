import { Router } from 'express';
import authRouter from './auth';
import bookingsRouter from './bookings';
import customersRouter from './customers';
import locationsRouter from './locations';
import experiencesRouter from './experiences';
import guidesRouter from './guides';
import dashboardRouter from './dashboard';
import publicRouter from './public';
import { storage } from '../storage';
import { addOutfitterContext } from '../outfitterContext';
import { requireAuth } from '../emailAuth';
import { asyncHandler } from '../utils/asyncHandler';
import { throwError } from '../utils/asyncHandler';

const router = Router();

// Import admin-only middleware from guides router
const hasRole = (requiredRole: 'admin' | 'guide') => async (req: any, res: any, next: any) => {
  const user = req.user;
  if (!user || user.role !== requiredRole) {
    return res.status(403).json({ error: `Access denied. ${requiredRole} role required.` });
  }
  next();
};
const adminOnly = hasRole('admin');

// PUT /api/experience-guides/:id route (moved from guides router for direct API access)
router.put('/experience-guides/:id', requireAuth, addOutfitterContext, adminOnly, asyncHandler(async (req: any, res: any) => {
  const id = parseInt(req.params.id);
  const user = req.user;
  const outfitterId = user?.outfitterId;

  // Prepare data for validation
  const updateData = {
    isPrimary: req.body.isPrimary === true // Ensure boolean conversion
  };

  if (isNaN(id)) {
    throwError('Invalid assignment ID', 400);
  }

  // Update guide assignment with tenant isolation
  const updatedGuide = await storage.updateGuideAssignment(id, updateData, outfitterId);

  if (!updatedGuide) {
    throwError('Guide assignment not found or update failed', 404);
  }

  res.status(204).end();
}));

// Mount domain-specific routers
router.use('/auth', authRouter);
router.use('/bookings', bookingsRouter);
router.use('/customers', customersRouter);
router.use('/locations', locationsRouter);
router.use('/experiences', experiencesRouter);
router.use('/guides', guidesRouter);
router.use('/dashboard', dashboardRouter);
router.use('/public', publicRouter);


// Settings routes (moved from dashboard to keep them at /api/settings)
router.get('/settings', async (req, res) => {
  // Temporary bypass to prevent UI blocking
  res.json({
    companyName: 'Outfitter Demo',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyLogo: '',
    bookingLink: ''
  });
});

// User-outfitter relationship routes (moved from main routes)
router.get('/user-outfitters', requireAuth, addOutfitterContext, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const userOutfitters = await storage.getUserOutfitters(user.id);
    res.json(userOutfitters);
  } catch (error) {
    console.error('Error fetching user outfitters:', error);
    res.status(500).json({ message: 'Failed to fetch user outfitters' });
  }
});

// Legacy logout route redirect
router.get('/logout', (req, res) => {
  res.redirect('/auth');
});

export default router;