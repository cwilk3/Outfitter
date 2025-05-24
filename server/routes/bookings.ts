import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { requireAuth } from '../emailAuth';
import { addOutfitterContext } from '../outfitterContext';
import { asyncHandler, throwError } from '../utils/asyncHandler';
import { insertBookingSchema, insertBookingGuideSchema } from '@shared/schema';

const router = Router();

// Apply auth and outfitter context to all booking routes
router.use(requireAuth, addOutfitterContext);

// Get all bookings for outfitter
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const bookings = await storage.listBookings();
  res.json(bookings);
}));

// Create new booking
router.post('/', asyncHandler(async (req: Request, res: Response) => {
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

// Update booking
router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const validatedData = insertBookingSchema.partial().parse(req.body);
  
  const updatedBooking = await storage.updateBooking(id, validatedData);
  
  if (!updatedBooking) {
    throwError('Booking not found', 404);
  }
  
  res.json(updatedBooking);
}));

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