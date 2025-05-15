import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { nanoid } from "nanoid";
// Import authentication middleware but we'll use a custom version for development
import { setupAuth } from "./replitAuth";
import { 
  insertUserSchema, 
  insertExperienceSchema, 
  insertCustomerSchema, 
  insertBookingSchema, 
  insertBookingGuideSchema, 
  insertDocumentSchema, 
  insertPaymentSchema, 
  insertSettingsSchema,
  insertActivitySchema,
  insertLocationSchema,
  insertExperienceLocationSchema,
  insertExperienceAddonSchema
} from "@shared/schema";

// Development authentication middleware
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  // Always allow access in development
  return next();
};

// Define middleware for role checking based on Replit Auth
const hasRole = (role: string) => (req: Request, res: Response, next: Function) => {
  // For development: always bypass role checking
  return next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware - commented out for development
  // await setupAuth(app);
  
  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    // In development mode, bypass authentication
    if (process.env.NODE_ENV !== 'production' && !process.env.REPLIT_DOMAINS) {
      // Return a dummy admin user for development
      return res.json({
        id: "dev-admin",
        email: "admin@example.com",
        firstName: "Admin",
        lastName: "User",
        profileImageUrl: null,
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // User routes
  app.get('/api/users', isAuthenticated, async (req, res) => {
    try {
      const role = req.query.role as string | undefined;
      const users = await storage.listUsers(role);
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.get('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id;
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  app.post('/api/users', isAuthenticated, hasRole('admin'), async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      
      // Log activity
      await storage.createActivity({
        userId: 1, // Should be the authenticated user's ID
        action: 'Created new user',
        details: { userId: user.id, email: user.email }
      });
      
      res.status(201).json(user);
    } catch (error) {
      console.error('Error creating user:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Failed to create user' });
    }
  });

  app.patch('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Allowing partial updates
      const validatedData = insertUserSchema.partial().parse(req.body);
      
      const updatedUser = await storage.updateUser(id, validatedData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Log activity
      await storage.createActivity({
        userId: 1, // Should be the authenticated user's ID
        action: 'Updated user',
        details: { userId: updatedUser.id, email: updatedUser.email }
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Failed to update user' });
    }
  });

  // Location routes
  app.get('/api/locations', isAuthenticated, async (req, res) => {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      const locations = await storage.listLocations(activeOnly);
      res.json(locations);
    } catch (error) {
      console.error('Error fetching locations:', error);
      res.status(500).json({ message: 'Failed to fetch locations' });
    }
  });
  
  app.get('/api/locations/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const location = await storage.getLocation(id);
      
      if (!location) {
        return res.status(404).json({ message: 'Location not found' });
      }
      
      res.json(location);
    } catch (error) {
      console.error('Error fetching location:', error);
      res.status(500).json({ message: 'Failed to fetch location' });
    }
  });
  
  app.post('/api/locations', isAuthenticated, hasRole('admin'), async (req, res) => {
    try {
      const validatedData = insertLocationSchema.parse(req.body);
      const location = await storage.createLocation(validatedData);
      
      // Log activity
      await storage.createActivity({
        userId: req.user?.claims?.sub || '0',
        action: 'Created new location',
        details: { locationId: location.id, name: location.name }
      });
      
      res.status(201).json(location);
    } catch (error) {
      console.error('Error creating location:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Failed to create location' });
    }
  });
  
  app.patch('/api/locations/:id', isAuthenticated, hasRole('admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Allowing partial updates
      const validatedData = insertLocationSchema.partial().parse(req.body);
      
      const updatedLocation = await storage.updateLocation(id, validatedData);
      
      if (!updatedLocation) {
        return res.status(404).json({ message: 'Location not found' });
      }
      
      // Log activity
      await storage.createActivity({
        userId: req.user?.claims?.sub || '0', 
        action: 'Updated location',
        details: { locationId: updatedLocation.id, name: updatedLocation.name }
      });
      
      res.json(updatedLocation);
    } catch (error) {
      console.error('Error updating location:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Failed to update location' });
    }
  });
  
  app.delete('/api/locations/:id', isAuthenticated, hasRole('admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const location = await storage.getLocation(id);
      
      if (!location) {
        return res.status(404).json({ message: 'Location not found' });
      }
      
      // Check if there are experiences tied to this location
      const experiences = await storage.listExperiences(id);
      if (experiences.length > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete location with linked experiences. Please remove or reassign experiences first.' 
        });
      }
      
      await storage.deleteLocation(id);
      
      // Log activity
      await storage.createActivity({
        userId: req.user?.claims?.sub || '0',
        action: 'Deleted location',
        details: { locationId: id, name: location.name }
      });
      
      res.status(200).json({ message: 'Location deleted successfully' });
    } catch (error) {
      console.error('Error deleting location:', error);
      res.status(500).json({ message: 'Failed to delete location' });
    }
  });

  // Experience routes (only accessible by admin)
  app.get('/api/experiences', isAuthenticated, async (req, res) => {
    try {
      const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;
      const experiences = await storage.listExperiences(locationId);
      res.json(experiences);
    } catch (error) {
      console.error('Error fetching experiences:', error);
      res.status(500).json({ message: 'Failed to fetch experiences' });
    }
  });

  app.get('/api/experiences/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const experience = await storage.getExperience(id);
      
      if (!experience) {
        return res.status(404).json({ message: 'Experience not found' });
      }
      
      res.json(experience);
    } catch (error) {
      console.error('Error fetching experience:', error);
      res.status(500).json({ message: 'Failed to fetch experience' });
    }
  });

  app.post('/api/experiences', isAuthenticated, hasRole('admin'), async (req, res) => {
    try {
      const validatedData = insertExperienceSchema.parse(req.body);
      const experience = await storage.createExperience(validatedData);
      
      // Log activity
      await storage.createActivity({
        userId: 1, // Should be the authenticated user's ID
        action: 'Created new experience',
        details: { experienceId: experience.id, name: experience.name }
      });
      
      res.status(201).json(experience);
    } catch (error) {
      console.error('Error creating experience:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Failed to create experience' });
    }
  });

  app.patch('/api/experiences/:id', isAuthenticated, hasRole('admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Allowing partial updates
      const validatedData = insertExperienceSchema.partial().parse(req.body);
      
      const updatedExperience = await storage.updateExperience(id, validatedData);
      
      if (!updatedExperience) {
        return res.status(404).json({ message: 'Experience not found' });
      }
      
      // Log activity
      await storage.createActivity({
        userId: req.user?.claims?.sub || '0', // Get authenticated user ID from Replit Auth
        action: 'Updated experience',
        details: { experienceId: updatedExperience.id, name: updatedExperience.name }
      });
      
      res.json(updatedExperience);
    } catch (error) {
      console.error('Error updating experience:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Failed to update experience' });
    }
  });
  
  app.delete('/api/experiences/:id', isAuthenticated, hasRole('admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const experience = await storage.getExperience(id);
      
      if (!experience) {
        return res.status(404).json({ message: 'Experience not found' });
      }
      
      await storage.deleteExperience(id);
      
      // Log activity
      await storage.createActivity({
        userId: req.user?.claims?.sub || '0', // Get authenticated user ID from Replit Auth
        action: 'Deleted experience',
        details: { experienceId: id, name: experience.name }
      });
      
      res.status(200).json({ message: 'Experience deleted successfully' });
    } catch (error) {
      console.error('Error deleting experience:', error);
      res.status(500).json({ message: 'Failed to delete experience' });
    }
  });

  // Experience Location routes
  app.get('/api/experiences/:id/locations', isAuthenticated, async (req, res) => {
    try {
      const experienceId = parseInt(req.params.id);
      const locations = await storage.getExperienceLocations(experienceId);
      res.json(locations);
    } catch (error) {
      console.error('Error fetching experience locations:', error);
      res.status(500).json({ message: 'Failed to fetch experience locations' });
    }
  });

  app.post('/api/experience-locations', isAuthenticated, hasRole('admin'), async (req, res) => {
    try {
      const validatedData = insertExperienceLocationSchema.parse(req.body);
      const experienceLocation = await storage.addExperienceLocation(validatedData);
      
      // Log activity
      await storage.createActivity({
        userId: req.user?.claims?.sub || '0',
        action: 'Associated location with experience',
        details: { 
          experienceId: experienceLocation.experienceId, 
          locationId: experienceLocation.locationId 
        }
      });
      
      res.status(201).json(experienceLocation);
    } catch (error) {
      console.error('Error creating experience-location association:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Failed to associate location with experience' });
    }
  });

  app.delete('/api/experience-locations/:experienceId/:locationId', isAuthenticated, hasRole('admin'), async (req, res) => {
    try {
      const experienceId = parseInt(req.params.experienceId);
      const locationId = parseInt(req.params.locationId);
      
      await storage.removeExperienceLocation(experienceId, locationId);
      
      // Log activity
      await storage.createActivity({
        userId: req.user?.claims?.sub || '0',
        action: 'Removed location from experience',
        details: { experienceId, locationId }
      });
      
      res.status(200).json({ message: 'Location removed from experience successfully' });
    } catch (error) {
      console.error('Error removing location from experience:', error);
      res.status(500).json({ message: 'Failed to remove location from experience' });
    }
  });

  // Customer routes
  app.get('/api/customers', isAuthenticated, async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const customers = await storage.listCustomers(search);
      res.json(customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ message: 'Failed to fetch customers' });
    }
  });

  app.get('/api/customers/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomer(id);
      
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      
      res.json(customer);
    } catch (error) {
      console.error('Error fetching customer:', error);
      res.status(500).json({ message: 'Failed to fetch customer' });
    }
  });

  app.post('/api/customers', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(validatedData);
      
      // Log activity
      await storage.createActivity({
        userId: 1, // Should be the authenticated user's ID
        action: 'Created new customer',
        details: { customerId: customer.id, name: `${customer.firstName} ${customer.lastName}` }
      });
      
      res.status(201).json(customer);
    } catch (error) {
      console.error('Error creating customer:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Failed to create customer' });
    }
  });

  app.patch('/api/customers/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Allowing partial updates
      const validatedData = insertCustomerSchema.partial().parse(req.body);
      
      const updatedCustomer = await storage.updateCustomer(id, validatedData);
      
      if (!updatedCustomer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      
      // Log activity
      await storage.createActivity({
        userId: 1, // Should be the authenticated user's ID
        action: 'Updated customer',
        details: { customerId: updatedCustomer.id, name: `${updatedCustomer.firstName} ${updatedCustomer.lastName}` }
      });
      
      res.json(updatedCustomer);
    } catch (error) {
      console.error('Error updating customer:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Failed to update customer' });
    }
  });

  // Booking routes
  app.get('/api/bookings', isAuthenticated, async (req, res) => {
    try {
      const filters: any = {};
      
      if (req.query.status) {
        filters.status = req.query.status;
      }
      
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }
      
      const bookings = await storage.listBookings(Object.keys(filters).length > 0 ? filters : undefined);
      res.json(bookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      res.status(500).json({ message: 'Failed to fetch bookings' });
    }
  });

  app.get('/api/bookings/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const booking = await storage.getBooking(id);
      
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      res.json(booking);
    } catch (error) {
      console.error('Error fetching booking:', error);
      res.status(500).json({ message: 'Failed to fetch booking' });
    }
  });

  app.post('/api/bookings', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertBookingSchema.parse(req.body);
      const booking = await storage.createBooking(validatedData);
      
      // Log activity
      await storage.createActivity({
        userId: 1, // Should be the authenticated user's ID
        action: 'Created new booking',
        details: { bookingId: booking.id, bookingNumber: booking.bookingNumber }
      });
      
      res.status(201).json(booking);
    } catch (error) {
      console.error('Error creating booking:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Failed to create booking' });
    }
  });

  app.patch('/api/bookings/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Allowing partial updates
      const validatedData = insertBookingSchema.partial().parse(req.body);
      
      const updatedBooking = await storage.updateBooking(id, validatedData);
      
      if (!updatedBooking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      // Log activity
      await storage.createActivity({
        userId: 1, // Should be the authenticated user's ID
        action: 'Updated booking',
        details: { bookingId: updatedBooking.id, bookingNumber: updatedBooking.bookingNumber }
      });
      
      res.json(updatedBooking);
    } catch (error) {
      console.error('Error updating booking:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Failed to update booking' });
    }
  });

  // Booking Guides routes
  app.get('/api/bookings/:bookingId/guides', isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      const guides = await storage.listBookingGuides(bookingId);
      res.json(guides);
    } catch (error) {
      console.error('Error fetching booking guides:', error);
      res.status(500).json({ message: 'Failed to fetch booking guides' });
    }
  });

  app.post('/api/bookings/:bookingId/guides', isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      const validatedData = insertBookingGuideSchema.parse({
        ...req.body,
        bookingId
      });
      
      const bookingGuide = await storage.assignGuideToBooking(validatedData);
      
      // Log activity
      await storage.createActivity({
        userId: 1, // Should be the authenticated user's ID
        action: 'Assigned guide to booking',
        details: { bookingId: bookingGuide.bookingId, guideId: bookingGuide.guideId }
      });
      
      res.status(201).json(bookingGuide);
    } catch (error) {
      console.error('Error assigning guide to booking:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Failed to assign guide to booking' });
    }
  });

  app.delete('/api/bookings/:bookingId/guides/:guideId', isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      const guideId = parseInt(req.params.guideId);
      
      await storage.removeGuideFromBooking(bookingId, guideId);
      
      // Log activity
      await storage.createActivity({
        userId: 1, // Should be the authenticated user's ID
        action: 'Removed guide from booking',
        details: { bookingId, guideId }
      });
      
      res.status(204).end();
    } catch (error) {
      console.error('Error removing guide from booking:', error);
      res.status(500).json({ message: 'Failed to remove guide from booking' });
    }
  });

  // Document routes
  app.get('/api/documents', isAuthenticated, async (req, res) => {
    try {
      const filter: any = {};
      
      if (req.query.bookingId) {
        filter.bookingId = parseInt(req.query.bookingId as string);
      }
      
      if (req.query.customerId) {
        filter.customerId = parseInt(req.query.customerId as string);
      }
      
      if (req.query.guideId) {
        filter.guideId = parseInt(req.query.guideId as string);
      }
      
      const documents = await storage.listDocuments(Object.keys(filter).length > 0 ? filter : undefined);
      res.json(documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ message: 'Failed to fetch documents' });
    }
  });

  app.get('/api/documents/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      res.json(document);
    } catch (error) {
      console.error('Error fetching document:', error);
      res.status(500).json({ message: 'Failed to fetch document' });
    }
  });

  app.post('/api/documents', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument(validatedData);
      
      // Log activity
      await storage.createActivity({
        userId: 1, // Should be the authenticated user's ID
        action: 'Uploaded document',
        details: { documentId: document.id, name: document.name }
      });
      
      res.status(201).json(document);
    } catch (error) {
      console.error('Error creating document:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Failed to create document' });
    }
  });

  app.patch('/api/documents/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Allowing partial updates
      const validatedData = insertDocumentSchema.partial().parse(req.body);
      
      const updatedDocument = await storage.updateDocument(id, validatedData);
      
      if (!updatedDocument) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      // Log activity
      await storage.createActivity({
        userId: 1, // Should be the authenticated user's ID
        action: 'Updated document',
        details: { documentId: updatedDocument.id, name: updatedDocument.name }
      });
      
      res.json(updatedDocument);
    } catch (error) {
      console.error('Error updating document:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Failed to update document' });
    }
  });

  app.delete('/api/documents/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      await storage.deleteDocument(id);
      
      // Log activity
      await storage.createActivity({
        userId: 1, // Should be the authenticated user's ID
        action: 'Deleted document',
        details: { documentId: id, name: document.name }
      });
      
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({ message: 'Failed to delete document' });
    }
  });

  // Payment routes (accessible only by admins)
  app.get('/api/payments', isAuthenticated, hasRole('admin'), async (req, res) => {
    try {
      const bookingId = req.query.bookingId ? parseInt(req.query.bookingId as string) : undefined;
      const payments = await storage.listPayments(bookingId);
      res.json(payments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      res.status(500).json({ message: 'Failed to fetch payments' });
    }
  });

  app.get('/api/payments/:id', isAuthenticated, hasRole('admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const payment = await storage.getPayment(id);
      
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }
      
      res.json(payment);
    } catch (error) {
      console.error('Error fetching payment:', error);
      res.status(500).json({ message: 'Failed to fetch payment' });
    }
  });

  app.post('/api/payments', isAuthenticated, hasRole('admin'), async (req, res) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validatedData);
      
      // Log activity
      await storage.createActivity({
        userId: 1, // Should be the authenticated user's ID
        action: 'Created payment',
        details: { paymentId: payment.id, amount: payment.amount, bookingId: payment.bookingId }
      });
      
      res.status(201).json(payment);
    } catch (error) {
      console.error('Error creating payment:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Failed to create payment' });
    }
  });

  app.patch('/api/payments/:id', isAuthenticated, hasRole('admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Allowing partial updates
      const validatedData = insertPaymentSchema.partial().parse(req.body);
      
      const updatedPayment = await storage.updatePayment(id, validatedData);
      
      if (!updatedPayment) {
        return res.status(404).json({ message: 'Payment not found' });
      }
      
      // Log activity
      await storage.createActivity({
        userId: 1, // Should be the authenticated user's ID
        action: 'Updated payment',
        details: { paymentId: updatedPayment.id, status: updatedPayment.status }
      });
      
      res.json(updatedPayment);
    } catch (error) {
      console.error('Error updating payment:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Failed to update payment' });
    }
  });

  // Settings routes (most operations only accessible by admins)
  app.get('/api/settings', isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getSettings();
      
      // If no settings found, return empty object instead of 404
      if (!settings) {
        return res.json({});
      }
      
      res.json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ message: 'Failed to fetch settings' });
    }
  });

  app.post('/api/settings', isAuthenticated, hasRole('admin'), async (req, res) => {
    try {
      const validatedData = insertSettingsSchema.parse(req.body);
      const settings = await storage.updateSettings(validatedData);
      
      // Log activity
      await storage.createActivity({
        userId: 1, // Should be the authenticated user's ID
        action: 'Updated settings',
        details: { settingsId: settings.id }
      });
      
      res.json(settings);
    } catch (error) {
      console.error('Error updating settings:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Failed to update settings' });
    }
  });

  // Activity routes
  app.get('/api/activities', isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const activities = await storage.listActivities(limit);
      res.json(activities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      res.status(500).json({ message: 'Failed to fetch activities' });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
  });

  app.get('/api/dashboard/upcoming-bookings', isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const upcomingBookings = await storage.getUpcomingBookings(limit);
      res.json(upcomingBookings);
    } catch (error) {
      console.error('Error fetching upcoming bookings:', error);
      res.status(500).json({ message: 'Failed to fetch upcoming bookings' });
    }
  });

  // QuickBooks mock integration endpoints
  app.post('/api/quickbooks/generate-invoice', isAuthenticated, hasRole('admin'), async (req, res) => {
    try {
      const { bookingId } = req.body;
      
      if (!bookingId) {
        return res.status(400).json({ message: 'Booking ID is required' });
      }
      
      const booking = await storage.getBooking(parseInt(bookingId));
      
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      // In a real implementation, this would call the QuickBooks API
      // For now, we'll just update the booking to simulate the process
      
      const mockQbInvoiceId = `qb-${Date.now()}`;
      
      // Create a mock payment record with the QB invoice ID
      const payment = await storage.createPayment({
        bookingId: booking.id,
        amount: booking.totalAmount,
        status: 'pending',
        paymentMethod: 'quickbooks',
        qbInvoiceId: mockQbInvoiceId
      });
      
      // Log activity
      await storage.createActivity({
        userId: 1, // Should be the authenticated user's ID
        action: 'Generated QuickBooks invoice',
        details: { bookingId: booking.id, invoiceId: mockQbInvoiceId }
      });
      
      res.json({
        success: true,
        invoiceId: mockQbInvoiceId,
        paymentId: payment.id
      });
    } catch (error) {
      console.error('Error generating QuickBooks invoice:', error);
      res.status(500).json({ message: 'Failed to generate QuickBooks invoice' });
    }
  });

  // Auth check for frontend
  app.get('/api/auth/check', (req, res) => {
    // For now, all requests are authenticated as admin
    res.json({
      authenticated: true,
      user: {
        id: 1,
        username: 'admin',
        firstName: 'John',
        lastName: 'Smith',
        role: 'admin'
      }
    });
  });

  // Public Experience and Booking Routes (no authentication required)
  // Public API for listing experiences
  app.get('/api/public/experiences', async (req, res) => {
    try {
      const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;
      const category = req.query.category as string | undefined;
      const experiences = await storage.listPublicExperiences(locationId, category);
      res.json(experiences);
    } catch (error) {
      console.error('Error fetching public experiences:', error);
      res.status(500).json({ message: 'Failed to fetch experiences' });
    }
  });

  // Get public locations for filtering
  app.get('/api/public/locations', async (req, res) => {
    try {
      // Only active locations should be visible to the public
      const locations = await storage.listLocations(true);
      res.json(locations);
    } catch (error) {
      console.error('Error fetching public locations:', error);
      res.status(500).json({ message: 'Failed to fetch locations' });
    }
  });

  // Get specific experience details
  app.get('/api/public/experiences/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const experience = await storage.getPublicExperience(id);
      
      if (!experience) {
        return res.status(404).json({ message: 'Experience not found' });
      }
      
      // Get associated locations
      const locations = await storage.getExperienceLocations(id);
      
      // Get add-ons for this experience
      const addons = await storage.getExperienceAddons(id);
      
      res.json({
        ...experience,
        locations,
        addons
      });
    } catch (error) {
      console.error('Error fetching public experience:', error);
      res.status(500).json({ message: 'Failed to fetch experience' });
    }
  });

  // Public booking creation route
  app.post('/api/public/bookings', async (req, res) => {
    try {
      // Get the booking data
      const bookingData = req.body;
      
      // Validate the booking data
      const validatedData = insertBookingSchema.parse({
        ...bookingData,
        bookingNumber: `B-${new Date().getFullYear()}-${nanoid(6)}`, // Generate a booking number
        status: 'pending'
      });
      
      // Create the booking
      const booking = await storage.createBooking(validatedData);
      
      res.status(201).json(booking);
    } catch (error) {
      console.error('Error creating public booking:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Failed to create booking' });
    }
  });

  // Stripe payment intent creation endpoint
  app.post('/api/create-payment-intent', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ 
          message: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.' 
        });
      }

      const { amount, bookingId } = req.body;
      
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          bookingId: bookingId.toString()
        }
      });
      
      res.json({ 
        clientSecret: paymentIntent.client_secret 
      });
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Webhook endpoint to handle Stripe events
  app.post('/api/webhook', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ 
          message: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.' 
        });
      }

      const sig = req.headers['stripe-signature'] as string;
      let event;
      
      // Verify webhook signature
      if (process.env.STRIPE_WEBHOOK_SECRET) {
        try {
          event = stripe.webhooks.constructEvent(
            req.body, 
            sig, 
            process.env.STRIPE_WEBHOOK_SECRET
          );
        } catch (err: any) {
          return res.status(400).json({ message: `Webhook Error: ${err.message}` });
        }
      } else {
        // For development without signature verification
        event = req.body;
      }
      
      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          // Update booking status
          if (paymentIntent.metadata && paymentIntent.metadata.bookingId) {
            const bookingId = parseInt(paymentIntent.metadata.bookingId);
            
            // Check if this is a partial payment (deposit) or full payment
            const booking = await storage.getBooking(bookingId);
            if (!booking) break;
            
            // Calculate the amount paid
            const amountPaid = paymentIntent.amount / 100; // Convert cents to dollars
            
            // Update booking payment status based on amount paid
            await storage.updateBooking(bookingId, {
              status: amountPaid >= booking.totalAmount ? 'paid' : 'deposit_paid',
              paymentStatus: 'completed',
              paidAmount: amountPaid
            });
            
            // Create payment record
            await storage.createPayment({
              bookingId,
              amount: amountPaid,
              status: 'completed',
              paymentMethod: 'stripe',
              transactionId: paymentIntent.id
            });
          }
          break;
        case 'payment_intent.payment_failed':
          const failedPaymentIntent = event.data.object;
          // Update booking payment status to failed
          if (failedPaymentIntent.metadata && failedPaymentIntent.metadata.bookingId) {
            const bookingId = parseInt(failedPaymentIntent.metadata.bookingId);
            await storage.updateBooking(bookingId, {
              paymentStatus: 'failed'
            });
          }
          break;
        default:
          // Unexpected event type
          console.log(`Unhandled event type ${event.type}`);
      }
      
      // Return a 200 response to acknowledge receipt of the event
      res.json({ received: true });
    } catch (error: any) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // SendGrid email confirmation endpoint
  app.post('/api/send-email', async (req, res) => {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        return res.status(500).json({ 
          message: 'SendGrid is not configured. Please set SENDGRID_API_KEY environment variable.' 
        });
      }

      const { to, subject, text, html, bookingId } = req.body;
      
      // Send booking confirmation email using SendGrid
      // Import sendgrid here to prevent errors if API key isn't set
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      const msg = {
        to,
        from: 'bookings@outfitter.com', // Change to your verified sender
        subject,
        text,
        html,
      };
      
      await sgMail.send(msg);
      
      // Update booking to reflect that email was sent
      if (bookingId) {
        await storage.updateBooking(parseInt(bookingId), {
          emailSent: true
        });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error sending email:', error);
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
