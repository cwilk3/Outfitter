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

const router = Router();

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
router.get('/user-outfitters', async (req, res) => {
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