import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { asyncHandler } from '../utils/asyncHandler';
import { insertCustomerSchema, insertBookingSchema } from '@shared/schema';
import { nanoid } from 'nanoid';

const router = Router();

// Route version identifier
console.log("[ROUTE CHECK] Using PUBLIC booking route v2 - ENHANCED with debug logging and fixes");

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
  try {
    console.log("[ROUTE DEBUG] Booking request received - route version 2 ENHANCED");
    console.log('\n🔵 ========== PUBLIC BOOKING REQUEST START ==========');
    console.log('[PUBLIC_BOOKING] Received booking request at /api/public/bookings');
    console.log('[PUBLIC_BOOKING] Full Request Body:', JSON.stringify(req.body, null, 2));
  
  const { 
    experienceId, 
    customerDetails,
    bookingDetails,
    guests,  // Add guests field extraction
    payment,
    selectedAddons = []
  } = req.body;
  
  console.log('\n📋 [DEBUG] Extracted Fields:');
  console.log(`   experienceId: ${experienceId}`);
  console.log(`   customerDetails: ${JSON.stringify(customerDetails)}`);
  console.log(`   bookingDetails: ${JSON.stringify(bookingDetails)}`);
  console.log(`   guests (top-level): ${guests}`);
  console.log(`   payment: ${JSON.stringify(payment)}`);
  console.log(`   selectedAddons: ${JSON.stringify(selectedAddons)}`);
  
  // Validate required fields
  if (!experienceId || !customerDetails || !bookingDetails) {
    console.log('❌ [ERROR] Missing required fields validation failed');
    return res.status(400).json({ 
      message: 'Missing required fields: experienceId, customerDetails, and bookingDetails are required' 
    });
  }

  // Extract and validate guest count (handle both guests and groupSize fields)
  const guestFromTopLevel = guests;
  const guestFromBookingDetails = bookingDetails.guests;
  const groupSizeFromBookingDetails = bookingDetails.groupSize;
  const finalGroupSize = guestFromTopLevel || guestFromBookingDetails || groupSizeFromBookingDetails || 1;

  console.log('\n👥 [DEBUG] Guest Count Extraction:');
  console.log(`   guests (top-level): ${guestFromTopLevel}`);
  console.log(`   bookingDetails.guests: ${guestFromBookingDetails}`);
  console.log(`   bookingDetails.groupSize: ${groupSizeFromBookingDetails}`);
  console.log(`   Final groupSize: ${finalGroupSize}`);

  // Validate guest count is positive integer
  if (!Number.isInteger(finalGroupSize) || finalGroupSize < 1) {
    console.log('❌ [ERROR] Guest count validation failed');
    return res.status(400).json({ 
      message: 'Guest count must be a positive integer (minimum 1)' 
    });
  }
  
  // Check if experience exists
  const experience = await storage.getExperience(experienceId);
  if (!experience) {
    console.log('❌ [ERROR] Experience not found');
    return res.status(404).json({ message: 'Experience not found' });
  }

  console.log('\n🎯 [DEBUG] Experience Details:');
  console.log(`   Experience ID: ${experience.id}`);
  console.log(`   Experience Name: ${experience.name}`);
  console.log(`   Experience Price (raw): ${experience.price}`);
  console.log(`   Experience Price Type: ${typeof experience.price}`);

  // Extract totalAmount from bookingDetails or payment object
  const totalFromBookingDetails = bookingDetails.totalAmount;
  const totalFromPayment = req.body.payment?.totalAmount;
  const rawTotalAmount = totalFromBookingDetails ?? totalFromPayment ?? null;
  const parsedTotalAmount = rawTotalAmount ? Number(rawTotalAmount) : null;

  // Convert experience price from decimal string to number
  const experiencePrice = Number(experience.price);
  const calculatedFallbackTotal = experiencePrice * finalGroupSize;

  console.log('\n💰 [DEBUG] Total Amount Calculation:');
  console.log(`   bookingDetails.totalAmount: ${totalFromBookingDetails}`);
  console.log(`   payment.totalAmount: ${totalFromPayment}`);
  console.log(`   rawTotalAmount: ${rawTotalAmount}`);
  console.log(`   parsedTotalAmount: ${parsedTotalAmount}`);
  console.log(`   Experience Price (converted): ${experiencePrice}`);
  console.log(`   Calculated Fallback (${experiencePrice} × ${finalGroupSize}): ${calculatedFallbackTotal}`);

  // Calculate totalAmount with fallback and validation
  const finalTotalAmount = (parsedTotalAmount && parsedTotalAmount > 0) 
    ? parsedTotalAmount 
    : calculatedFallbackTotal;

  console.log(`   Final Total Amount Used: ${finalTotalAmount}`);
  console.log(`   Total Source: ${(parsedTotalAmount && parsedTotalAmount > 0) ? 'PROVIDED' : 'CALCULATED'}`);

  const groupSize = finalGroupSize;
  const totalAmount = finalTotalAmount;
  
  // Create or find customer
  let customerData;
  try {
    console.log('📝 About to validate customer data:', customerDetails);
    console.log('📝 Experience for customer validation:', { id: experience.id, outfitterId: experience.outfitterId });
    customerData = insertCustomerSchema.parse({
      ...customerDetails,
      outfitterId: experience.outfitterId
    });
    console.log('✅ Customer data validated successfully');
  } catch (error) {
    console.error('❌ [CRITICAL ERROR] Crash during customer data validation:', error);
    console.error('❌ [DEBUG VALUES] customerDetails:', customerDetails);
    console.error('❌ [DEBUG VALUES] experience:', experience);
    return res.status(400).json({
      message: 'Failed to construct customer data',
      error: error instanceof Error ? error.message : String(error)
    });
  }

  const customer = await storage.createCustomer(customerData);
  
  console.log('\n📝 [DEBUG] Creating Booking Data:');
  const bookingNumber = `PUB-${nanoid(8)}`;
  console.log(`   Generated Booking Number: ${bookingNumber}`);
  
  // Type checking and conversion for totalAmount
  console.log('📝 Preparing booking data with totalAmount:', totalAmount, 'type:', typeof totalAmount);
  const totalAmountStr = String(totalAmount);
  console.log('📝 Converted totalAmount to string:', totalAmountStr, 'type:', typeof totalAmountStr);

  let bookingData: any;
  try {
    console.log('🔍 [EXECUTION CHECK] About to log booking object before validation');
    
    console.log('\n🔍 [DEBUG] Booking object before validation:', {
      bookingNumber,
      experienceId,
      customerId: customer.id,
      startDate: new Date(bookingDetails.startDate),
      endDate: new Date(bookingDetails.endDate),
      status: 'pending',
      totalAmount: totalAmountStr,
      totalAmountType: typeof totalAmountStr,
      groupSize,
      groupSizeType: typeof groupSize,
      notes: bookingDetails.notes || '',
      outfitterId: experience.outfitterId
    });

    console.log('📝 About to validate booking data with insertBookingSchema');
    // Create booking
    bookingData = insertBookingSchema.parse({
      bookingNumber: bookingNumber,
      experienceId,
      customerId: customer.id,
      startDate: new Date(bookingDetails.startDate),
      endDate: new Date(bookingDetails.endDate),
      status: 'pending' as const,
      totalAmount: totalAmountStr,
      groupSize: groupSize,
      notes: bookingDetails.notes || '',
      outfitterId: experience.outfitterId
    });
    console.log('✅ Booking data validated successfully');
  } catch (error) {
    console.error('❌ [CRITICAL ERROR] Crash during booking data construction or validation:', error);
    console.error('❌ [DEBUG VALUES] customer:', customer);
    console.error('❌ [DEBUG VALUES] experience:', experience);
    console.error('❌ [DEBUG VALUES] totalAmount:', totalAmount, typeof totalAmount);
    console.error('❌ [DEBUG VALUES] totalAmountStr:', totalAmountStr, typeof totalAmountStr);
    console.error('❌ [DEBUG VALUES] groupSize:', groupSize, typeof groupSize);
    return res.status(400).json({
      message: 'Failed to construct booking data',
      error: error instanceof Error ? error.message : String(error)
    });
  }
  
  console.log('   Final Booking Data for Database:');
  console.log(`     bookingNumber: ${bookingData.bookingNumber}`);
  console.log(`     experienceId: ${bookingData.experienceId}`);
  console.log(`     customerId: ${bookingData.customerId}`);
  console.log(`     startDate: ${bookingData.startDate}`);
  console.log(`     endDate: ${bookingData.endDate}`);
  console.log(`     status: ${bookingData.status}`);
  console.log(`     totalAmount: ${bookingData.totalAmount}`);
  console.log(`     groupSize: ${bookingData.groupSize}`);
  console.log(`     outfitterId: ${bookingData.outfitterId}`);
  
  const booking = await storage.createBooking(bookingData);
  
  console.log('\n✅ [SUCCESS] Booking Created in Database:');
  console.log(`   Database Booking ID: ${booking.id}`);
  console.log(`   Database Booking Number: ${booking.bookingNumber}`);
  console.log(`   Database Total Amount: ${booking.totalAmount}`);
  console.log(`   Database Group Size: ${booking.groupSize}`);
  
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
  console.log('🔵 ========== PUBLIC BOOKING REQUEST END ==========\n');
  
  } catch (err) {
    console.error('🔥 Uncaught route error:', err);
    return res.status(500).json({ 
      message: 'Internal Server Error', 
      error: err instanceof Error ? err.message : String(err) 
    });
  }
}));

export default router;