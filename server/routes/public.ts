import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { asyncHandler } from '../utils/asyncHandler';
import { insertCustomerSchema, insertBookingSchema } from '@shared/schema';
import { nanoid } from 'nanoid';

const router = Router();

// Public routes - no authentication required

// GET public locations
router.get('/locations', asyncHandler(async (req: Request, res: Response) => {
  // Get all active locations for public display
  const locations = await storage.listLocations(true);
  res.json(locations);
}));

// GET public experiences
router.get('/experiences', asyncHandler(async (req: Request, res: Response) => {
  const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;
  
  // Get all active experiences, filtered by locationId if provided
  let experiences = await storage.listExperiences();
  
  // Filter by locationId if provided
  if (locationId) {
    experiences = experiences.filter(exp => exp.locationId === locationId);
  }
  
  // Get all active locations
  const locations = await storage.listLocations(true); 
  
  // Enrich experiences with their location info and add-ons
  const enrichedExperiences = await Promise.all(experiences.map(async (experience) => {
    // Find the associated location for this experience
    const associatedLocation = locations.find(location => 
      location.id === experience.locationId
    );
    
    // Get add-ons for this experience
    const addons = await storage.getExperienceAddons(experience.id);
    
    return {
      ...experience,
      location: associatedLocation,
      addons: addons || []
    };
  }));
  
  res.json(enrichedExperiences);
}));

// GET public bookings for availability tracking
router.get('/bookings', asyncHandler(async (req: Request, res: Response) => {
  const experienceId = req.query.experienceId ? parseInt(req.query.experienceId as string) : undefined;
  
  if (!experienceId) {
    return res.status(400).json({ message: 'Experience ID is required' });
  }
  
  // Fetch bookings for this experience
  const bookings = await storage.listBookings({ 
    status: undefined,
    startDate: undefined,
    endDate: undefined
  });
  
  // Filter the bookings for this experience ID after fetching
  const experienceBookings = bookings.filter(booking => 
    booking.experienceId === experienceId
  );
  
  // Get only active bookings for availability tracking
  const activeBookings = experienceBookings.filter(booking => 
    ['confirmed', 'deposit_paid', 'paid', 'completed'].includes(booking.status)
  );
  
  // Transform bookings to a format suitable for availability checking
  const bookingsForAvailability = activeBookings.map(booking => ({
    startDate: booking.startDate,
    endDate: booking.endDate,
    bookedCount: 1 // For now, assume 1 booking = 1 person
  }));
  
  res.json(bookingsForAvailability);
}));

// POST endpoint for creating public bookings
router.post('/bookings', asyncHandler(async (req: Request, res: Response) => {
  console.log('[PUBLIC_BOOKING] Received booking request at /api/public/bookings');
  console.log('[PUBLIC_BOOKING] Request body:', JSON.stringify(req.body, null, 2));
  
  const { 
    experienceId, 
    customerDetails,
    bookingDetails,
    guests,  // Add guests field extraction
    selectedAddons = []
  } = req.body;
  
  // Validate required fields
  if (!experienceId || !customerDetails || !bookingDetails) {
    return res.status(400).json({ 
      message: 'Missing required fields: experienceId, customerDetails, and bookingDetails are required' 
    });
  }

  // Extract and validate guest count (handle both guests and groupSize fields)
  const groupSize = guests || bookingDetails.groupSize || bookingDetails.guests || 1;

  // Validate guest count is positive integer
  if (!Number.isInteger(groupSize) || groupSize < 1) {
    return res.status(400).json({ 
      message: 'Guest count must be a positive integer (minimum 1)' 
    });
  }
  
  // Check if experience exists
  const experience = await storage.getExperience(experienceId);
  if (!experience) {
    return res.status(404).json({ message: 'Experience not found' });
  }

  // Extract totalAmount from bookingDetails or payment object
  const rawTotalAmount = bookingDetails.totalAmount ?? req.body.payment?.totalAmount ?? null;
  const parsedTotalAmount = rawTotalAmount ? Number(rawTotalAmount) : null;

  // Convert experience price from decimal string to number
  const experiencePrice = Number(experience.price);

  // Logging for debug
  console.log(`Experience price: ${experiencePrice}, Group size: ${groupSize}, Parsed total amount: ${parsedTotalAmount}`);

  // Calculate totalAmount with fallback and validation
  const totalAmount = (parsedTotalAmount && parsedTotalAmount > 0) 
    ? parsedTotalAmount 
    : experiencePrice * groupSize;
  
  // Create or find customer
  const customerData = insertCustomerSchema.parse({
    ...customerDetails,
    outfitterId: experience.outfitterId
  });
  
  // Check if customer already exists (we'll need to add this method to storage)
  const customer = await storage.createCustomer(customerData);
  
  // Create booking
  const bookingData = insertBookingSchema.parse({
    bookingNumber: `PUB-${nanoid(8)}`,
    experienceId,
    customerId: customer.id,
    startDate: new Date(bookingDetails.startDate),
    endDate: new Date(bookingDetails.endDate),
    status: 'pending' as const,
    totalAmount: totalAmount,
    groupSize: groupSize,
    notes: bookingDetails.notes || '',
    outfitterId: experience.outfitterId
  });
  
  const booking = await storage.createBooking(bookingData);
  
  // Get guides assigned to this experience and link them to the booking
  const guides = await storage.getExperienceGuides(booking.experienceId);
  if (guides && guides.length > 0) {
    console.log(`Assigning ${guides.length} guides to public booking ${booking.id}`);
    
    for (const guide of guides) {
      try {
        await storage.assignGuideToBooking({
          bookingId: booking.id,
          guideId: guide.guideId
        });
        console.log(`Assigned guide ${guide.guideId} to public booking ${booking.id}`);
      } catch (guideError) {
        console.error(`Error assigning guide ${guide.guideId} to public booking:`, guideError);
        // Continue with other guides if one fails
      }
    }
  }
  
  // Return success with booking details
  res.status(201).json({ 
    success: true, 
    message: 'Booking created successfully',
    booking: {
      ...booking,
      customer
    }
  });
  
  // Simulate sending email notification
  console.log(`Email notification would be sent to ${customer.email} for booking ${booking.bookingNumber}`);
}));

export default router;