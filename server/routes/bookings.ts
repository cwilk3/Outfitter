import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireAuth } from '../emailAuth';
import { addOutfitterContext } from '../outfitterContext';
import { asyncHandler, throwError } from '../utils/asyncHandler';
import { insertBookingSchema, insertBookingGuideSchema } from '@shared/schema';
import { validate, commonSchemas, businessRules } from '../middleware/validation';

const router = Router();

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

// Apply auth and outfitter context to all booking routes
router.use(requireAuth, addOutfitterContext);

// Get all bookings for outfitter with validation
router.get('/', 
  validate({ query: bookingValidation.listQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const bookings = await storage.listBookings();
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
    const updatedBooking = await storage.updateBooking(id, req.body);
    
    if (!updatedBooking) {
      throwError('Booking not found', 404);
    }
    
    res.json(updatedBooking);
  })
);

// Booking Guides routes
router.get('/:bookingId/guides', asyncHandler(async (req: Request, res: Response) => {
  const bookingId = parseInt(req.params.bookingId);
  
  if (isNaN(bookingId)) {
    throwError('Invalid booking ID', 400);
  }
  
  const guides = await storage.listBookingGuides(bookingId);
  res.json(guides);
}));

router.post('/:bookingId/guides', asyncHandler(async (req: Request, res: Response) => {
  const bookingId = parseInt(req.params.bookingId);
  
  if (isNaN(bookingId)) {
    throwError('Invalid booking ID', 400);
  }
  
  const validatedData = insertBookingGuideSchema.parse({
    ...req.body,
    bookingId
  });
  
  const bookingGuide = await storage.assignGuideToBooking(validatedData);
  res.status(201).json(bookingGuide);
}));

router.delete('/:bookingId/guides/:guideId', asyncHandler(async (req: Request, res: Response) => {
  const bookingId = parseInt(req.params.bookingId);
  const guideId = parseInt(req.params.guideId);
  
  if (isNaN(bookingId) || isNaN(guideId)) {
    throwError('Invalid booking or guide ID', 400);
  }
  
  await storage.removeGuideFromBooking(bookingId, guideId);
  res.status(204).end();
}));

export default router;