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
router.get('/:outfitterId/locations', asyncHandler(async (req: Request, res: Response) => {
  // --- START NEW DIAGNOSTIC LOGGING FOR INVALID ID ---
  console.log('[DEBUG_INVALID_ID] Route Hit: /public/:outfitterId/locations');
  console.log('[DEBUG_INVALID_ID] req.params.outfitterId RAW:', req.params.outfitterId);
  const outfitterId = parseInt(req.params.outfitterId as string);
  console.log('[DEBUG_INVALID_ID] outfitterId after parseInt:', outfitterId);
  console.log('[DEBUG_INVALID_ID] isNaN(outfitterId) result:', isNaN(outfitterId));
  // --- END NEW DIAGNOSTIC LOGGING FOR INVALID ID ---

  // --- ADDED VALIDATION ---
  if (isNaN(outfitterId)) {
    console.log('[DEBUG_INVALID_ID] Validation FAILED: Returning 400.'); // Log if validation fires
    return res.status(400).json({ error: 'Invalid Outfitter ID format.' });
  }
  // --- END ADDED VALIDATION ---

  // Get all active locations for public display, filtered by outfitterId
  console.log('[DEBUG_INVALID_ID] Validation PASSED. Proceeding to storage.listLocations with outfitterId:', outfitterId); // Log if validation passes
  const locations = await storage.listLocations(true, outfitterId);
  res.json(locations);
}));

// GET public experiences
router.get('/:outfitterId/experiences', asyncHandler(async (req: Request, res: Response) => {
  // --- START NEW DIAGNOSTIC LOGGING FOR INVALID ID ---
  console.log('[DEBUG_INVALID_ID] Route Hit: /public/:outfitterId/experiences');
  console.log('[DEBUG_INVALID_ID] req.params.outfitterId RAW:', req.params.outfitterId);
  const outfitterId = parseInt(req.params.outfitterId as string);
  console.log('[DEBUG_INVALID_ID] outfitterId after parseInt:', outfitterId);
  console.log('[DEBUG_INVALID_ID] isNaN(outfitterId) result:', isNaN(outfitterId));
  // --- END NEW DIAGNOSTIC LOGGING FOR INVALID ID ---

  // --- ADDED VALIDATION ---
  if (isNaN(outfitterId)) {
    console.log('[DEBUG_INVALID_ID] Validation FAILED: Returning 400.'); // Log if validation fires
    return res.status(400).json({ error: 'Invalid Outfitter ID format.' });
  }
  // --- END ADDED VALIDATION ---

  console.log('[DEBUG_INVALID_ID] Validation PASSED. Proceeding to storage.listExperiences with outfitterId:', outfitterId); // Log if validation passes
  const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;
  
  // Get all active experiences, filtered by outfitterId and locationId if provided
  let experiences = await storage.listExperiences(locationId, outfitterId);
  
  // Get all active locations for this outfitter
  const locations = await storage.listLocations(true, outfitterId); 
  
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
router.get('/:outfitterId/bookings', asyncHandler(async (req: Request, res: Response) => {
  // --- START NEW DIAGNOSTIC LOGGING FOR INVALID ID ---
  console.log('[DEBUG_INVALID_ID] Route Hit: /public/:outfitterId/bookings');
  console.log('[DEBUG_INVALID_ID] req.params.outfitterId RAW:', req.params.outfitterId);
  const outfitterId = parseInt(req.params.outfitterId as string);
  console.log('[DEBUG_INVALID_ID] outfitterId after parseInt:', outfitterId);
  console.log('[DEBUG_INVALID_ID] isNaN(outfitterId) result:', isNaN(outfitterId));
  // --- END NEW DIAGNOSTIC LOGGING FOR INVALID ID ---

  // --- ADDED VALIDATION ---
  if (isNaN(outfitterId)) {
    console.log('[DEBUG_INVALID_ID] Validation FAILED: Returning 400.'); // Log if validation fires
    return res.status(400).json({ error: 'Invalid Outfitter ID format.' });
  }
  // --- END ADDED VALIDATION ---

  console.log('[DEBUG_INVALID_ID] Validation PASSED. Proceeding to storage.listBookings with outfitterId:', outfitterId); // Log if validation passes
  const experienceId = req.query.experienceId ? parseInt(req.query.experienceId as string) : undefined;
  
  if (!experienceId) {
    return res.status(400).json({ message: 'Experience ID is required' });
  }
  
  // Fetch bookings for this outfitter
  const bookings = await storage.listBookings(outfitterId, { 
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

// GET public availability (v2) - Enhanced with accurate capacity checking
router.get('/:outfitterId/v2/availability', asyncHandler(async (req: Request, res: Response) => {
  const outfitterId = parseInt(req.params.outfitterId as string);
  const experienceId = req.query.experienceId ? parseInt(req.query.experienceId as string) : undefined;
  const requestedGroupSize = req.query.requestedGroupSize ? parseInt(req.query.requestedGroupSize as string) : 1;
  
  if (!experienceId) {
    return res.status(400).json({ message: 'Experience ID is required' });
  }
  
  if (!Number.isInteger(requestedGroupSize) || requestedGroupSize < 1) {
    return res.status(400).json({ 
      message: 'Requested group size must be a positive integer (minimum 1)' 
    });
  }
  
  // Step 2.2: Fetch Experience Details
  const experience = await storage.getExperience(experienceId);
  if (!experience) {
    return res.status(404).json({ message: 'Experience not found' });
  }
  
  // Validate experience has required fields for availability calculation
  if (!experience.capacity || !experience.duration) {
    return res.status(400).json({ 
      message: 'Experience must have capacity and duration defined for availability checking' 
    });
  }
  
  // Step 3.1: Handle availableDates Field
  if (!experience.availableDates || !Array.isArray(experience.availableDates) || experience.availableDates.length === 0) {
    // No available dates defined - experience is unavailable
    return res.json({
      experienceId,
      requestedGroupSize,
      experienceCapacity: experience.capacity,
      experienceDuration: experience.duration,
      availableSlots: [],
      totalSlotsChecked: 0,
      availableSlotsCount: 0,
      message: 'Experience has no available dates defined'
    });
  }
  
  // Parse date strings from availableDates into Date objects
  const parsedAvailableDates = [];
  for (const dateString of experience.availableDates) {
    try {
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        parsedAvailableDates.push(parsedDate);
      }
    } catch (error) {
      // Skip invalid date strings
      console.warn(`Invalid date string in availableDates: ${dateString}`);
    }
  }
  
  if (parsedAvailableDates.length === 0) {
    // No valid dates found after parsing
    return res.json({
      experienceId,
      requestedGroupSize,
      experienceCapacity: experience.capacity,
      experienceDuration: experience.duration,
      availableSlots: [],
      totalSlotsChecked: 0,
      availableSlotsCount: 0,
      message: 'Experience has no valid available dates'
    });
  }
  
  // Step 3.2: Calculate Effective Season Boundaries
  const effectiveSeasonStartDate = new Date(Math.min(...parsedAvailableDates.map(d => d.getTime())));
  const effectiveSeasonEndDate = new Date(Math.max(...parsedAvailableDates.map(d => d.getTime())));
  
  // Normalize dates
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  effectiveSeasonStartDate.setHours(0, 0, 0, 0); // Start of season start day
  effectiveSeasonEndDate.setHours(23, 59, 59, 999); // End of season end day
  
  // Step 3.3: Determine Loop Start and End Dates for Slot Generation
  const loopStartDate = new Date(Math.max(today.getTime(), effectiveSeasonStartDate.getTime()));
  const loopEndDate = new Date(effectiveSeasonEndDate);
  
  if (loopStartDate > loopEndDate) {
    // Season has already ended or no valid period
    return res.json({
      experienceId,
      requestedGroupSize,
      experienceCapacity: experience.capacity,
      experienceDuration: experience.duration,
      availableSlots: [],
      totalSlotsChecked: 0,
      availableSlotsCount: 0,
      message: 'Experience season has ended or is not yet available'
    });
  }
  
  // Step 3.4: Update Slot Generation Loop
  const slots = [];
  const currentSlotStart = new Date(loopStartDate);
  
  // Generate slots within the derived season boundaries
  while (currentSlotStart <= loopEndDate) {
    const slotEnd = new Date(currentSlotStart);
    slotEnd.setDate(currentSlotStart.getDate() + experience.duration);
    
    // Ensure the entire slot duration fits within the season
    // Check if the last day of the slot is within the season
    const lastDayOfSlot = new Date(currentSlotStart);
    lastDayOfSlot.setDate(currentSlotStart.getDate() + experience.duration - 1);
    lastDayOfSlot.setHours(23, 59, 59, 999);
    
    if (lastDayOfSlot <= loopEndDate) {
      slots.push({
        startDate: new Date(currentSlotStart),
        endDate: new Date(slotEnd)
      });
    } else {
      // Slot would extend beyond season end, stop generating
      break;
    }
    
    // Move to next day
    currentSlotStart.setDate(currentSlotStart.getDate() + 1);
  }
  
  // Step 2.4: Get Occupancy for Each Slot
  const slotOccupancy = await storage.getOccupancyForExperienceSlots(experienceId, slots);
  
  // Step 2.5: Determine Available Slots
  const availableSlots = slotOccupancy
    .map(({ slot, occupiedCount }) => {
      const remainingCapacity = experience.capacity - occupiedCount;
      return {
        ...slot,
        occupiedCount,
        remainingCapacity,
        isAvailable: requestedGroupSize <= remainingCapacity
      };
    })
    .filter(slot => slot.isAvailable)
    .map(slot => ({
      startDate: slot.startDate,
      endDate: slot.endDate
    }));
  
  // Step 2.6: Prepare and Send Response
  res.json({
    experienceId,
    requestedGroupSize,
    experienceCapacity: experience.capacity,
    experienceDuration: experience.duration,
    availableSlots,
    totalSlotsChecked: slots.length,
    availableSlotsCount: availableSlots.length
  });
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
  
  console.log('🔍 [CRITICAL] About to start customer creation section');
  console.log('🔍 [CRITICAL] Values before customer creation - groupSize:', groupSize, 'totalAmount:', totalAmount);
  
  // Create or find customer
  let customerData;
  try {
    console.log('📝 About to validate customer data:', customerDetails);
    console.log('📝 Experience for customer validation:', { id: experience.id, outfitterId: experience.outfitterId });
    
    // Log the exact customer data object before validation
    console.log('🛠️ Customer data to validate:', { ...customerDetails, outfitterId: experience.outfitterId });
    
    // Whitelist fields explicitly to prevent contamination from other request fields
    const safeCustomerDetails = {
      firstName: customerDetails.firstName,
      lastName: customerDetails.lastName,
      email: customerDetails.email,
      phone: customerDetails.phone,
      address: customerDetails.address || '',
      city: customerDetails.city || '',
      state: customerDetails.state || '',
      zip: customerDetails.zip || '',
      notes: customerDetails.notes || '',
      outfitterId: experience.outfitterId,
    };
    
    console.log('🛡️ Safe customer data (whitelisted):', safeCustomerDetails);
    console.log('🧭 [DEBUG] About to run insertCustomerSchema.parse in public.ts');
    customerData = insertCustomerSchema.parse(safeCustomerDetails);
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

  let customer;
  try {
    console.log('🧭 [DEBUG] About to run storage.createCustomer in public.ts');
    customer = await storage.createCustomer(customerData);
    console.log('✅ Customer created successfully');
  } catch (error) {
    console.error('❌ [CRITICAL ERROR] Crash during customer creation:', error);
    return res.status(500).json({ 
      message: 'Failed to create customer', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
  
  console.log('\n📝 [DEBUG] Creating Booking Data:');
  const bookingNumber = `PUB-${nanoid(8)}`;
  console.log(`   Generated Booking Number: ${bookingNumber}`);
  console.log('🚨 [EXECUTION CHECK] Continuing after booking number generation...');
  
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
    console.log('🧭 [DEBUG] About to run insertBookingSchema.parse in public.ts');
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