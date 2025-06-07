import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireAuth, AuthenticatedRequest } from '../emailAuth';
import { addOutfitterContext } from '../outfitterContext';
import { asyncHandler, throwError } from '../utils/asyncHandler';
import { insertBookingSchema, insertBookingGuideSchema, bookings, bookingGuides } from '@shared/schema';
import { validate, commonSchemas, businessRules } from '../middleware/validation';
import { withTenantValidation, enforceTenantIsolation, validateTenantParam, TenantAwareRequest } from '../middleware/tenantValidation';
import { enableTenantSecurity, verifyResourceOwnership } from '../middleware/tenantSecurity';
import { db } from '../db';
import { eq, and, exists } from 'drizzle-orm';

const router = Router();

// Route version identifier
console.log("[ROUTE CHECK] Using AUTHENTICATED booking route v1 - REQUIRES AUTH");

// Validation schemas for bookings
const bookingValidation = {
  // Query validation for list bookings
  listQuery: z.object({
    page: z.string().regex(/^\d+$/, 'Page must be a positive integer').transform(Number).optional(),
    limit: z.string().regex(/^\d+$/, 'Limit must be a positive integer').transform(Number).optional(),
    status: z.enum(['pending', 'confirmed', 'completed', 'cancelled'], { 
      message: 'Status must be pending, confirmed, completed, or cancelled' 
    }).optional(),
    startDate: z.string().datetime('Invalid start date format').optional(),
    endDate: z.string().datetime('Invalid end date format').optional()
  }).refine(data => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  }, { message: 'Start date must be before end date' }),

  // Parameter validation for booking ID
  bookingIdParam: z.object({
    id: z.string().regex(/^\d+$/, 'Booking ID must be a positive integer').transform(Number)
  }),

  // Booking guide parameters
  bookingGuideParams: z.object({
    bookingId: z.string().regex(/^\d+$/, 'Booking ID must be a positive integer').transform(Number),
    guideId: z.string().regex(/^\d+$/, 'Guide ID must be a positive integer').transform(Number).optional()
  }),

  // Enhanced booking creation with business rules
  createBooking: insertBookingSchema.extend({
    startDate: businessRules.futureDate,
    groupSize: z.number().int().min(1, 'Group size must be at least 1').max(50, 'Group size cannot exceed 50'),
    totalAmount: businessRules.price
  }),

  // Update booking validation (partial)
  updateBooking: insertBookingSchema.partial().refine(data => {
    return Object.keys(data).length > 0;
  }, { message: 'At least one field must be provided for update' })
};

// Apply auth, outfitter context, tenant validation, and advanced security to all booking routes
router.use(requireAuth, addOutfitterContext, withTenantValidation(), enforceTenantIsolation('bookings'), ...enableTenantSecurity());

// Get all bookings for outfitter with validation
router.get('/', 
  validate({ query: bookingValidation.listQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const bookings = await storage.listBookings((req as any).outfitterId);
    res.json(bookings);
  })
);

// Create new booking with validation
router.post('/', 
  validate({ body: bookingValidation.createBooking }),
  asyncHandler(async (req: Request, res: Response) => {
  const validatedData = insertBookingSchema.parse(req.body);
  const booking = await storage.createBooking(validatedData);
  
  // Get guides assigned to this experience and link them to the booking
  const guides = await storage.getExperienceGuides(booking.experienceId);
  if (guides && guides.length > 0) {
    console.log(`Assigning ${guides.length} guides to booking ${booking.id}`);
    
    for (const guide of guides) {
      try {
        await storage.assignGuideToBooking({
          bookingId: booking.id,
          guideId: guide.guideId
        });
        console.log(`Assigned guide ${guide.guideId} to booking ${booking.id}`);
      } catch (guideError) {
        console.error(`Error assigning guide ${guide.guideId} to booking:`, guideError);
        // Continue with other guides if one fails
      }
    }
  }
  
  res.status(201).json(booking);
}));

// Update booking with validation
router.patch('/:id', 
  validate({ 
    params: bookingValidation.bookingIdParam,
    body: bookingValidation.updateBooking 
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updatedBooking = await storage.updateBooking(parseInt(id), req.body);
    
    if (!updatedBooking) {
      throwError('Booking not found', 404);
    }
    
    res.json(updatedBooking);
  })
);

// Booking Guides routes with validation
router.get('/:bookingId/guides', 
  validate({ params: z.object({ bookingId: z.string().regex(/^\d+$/).transform(Number) }) }),
  asyncHandler(async (req: Request, res: Response) => {
    const { bookingId } = req.params;
    const guides = await storage.listBookingGuides(parseInt(bookingId));
    res.json(guides);
  })
);

router.post('/:bookingId/guides', 
  validate({ 
    params: z.object({ bookingId: z.string().regex(/^\d+$/).transform(Number) }),
    body: insertBookingGuideSchema.omit({ bookingId: true })
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { bookingId } = req.params;
    const validatedData = { ...req.body, bookingId };
    
    const bookingGuide = await storage.assignGuideToBooking(validatedData);
    res.status(201).json(bookingGuide);
  })
);

router.delete('/:bookingId/guides/:guideId', 
  requireAuth,
  validate({ params: bookingValidation.bookingGuideParams }),
  asyncHandler(async (req: Request, res: Response) => {
    console.log('[TENANT-SECURE] Starting guide removal with tenant isolation');
    
    const { bookingId, guideId } = req.params;
    const user = (req as any).user;
    const outfitterId = user?.outfitterId;

    if (!outfitterId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // 🔒 TENANT ISOLATION: Verify booking belongs to user's outfitter BEFORE any operations
    const booking = await storage.getBookingWithTenant(parseInt(bookingId), outfitterId);
    
    if (!booking) {
      return res.status(404).json({
        error: "Booking not found or not authorized",
      });
    }

    console.log(`[TENANT-VERIFIED] Access granted - Outfitter ${outfitterId} removing guide ${guideId} from booking ${bookingId}`);

    // ✅ SAFE OPERATION: Now proceed with guide removal
    await storage.removeGuideFromBooking(parseInt(bookingId), guideId);

    console.log(`[TENANT-SUCCESS] Guide ${guideId} successfully removed from booking ${bookingId} for outfitter ${outfitterId}`);
    return res.status(204).send();
  })
);

export default router;