import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../server/index';
import { db } from '../server/db';
import { storage } from '../server/storage';
import { experiences, customers, bookings, users, outfitters } from '../shared/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

// Test configuration with specific mock outfitter IDs as requested
const OUTFITTER_ID_A = 101;
const OUTFITTER_ID_B = 102;
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Mock users for testing with specific outfitter assignments
const userA = {
  id: 'test-user-a-101',
  email: 'usera@tenant-test.com',
  passwordHash: '$2b$12$test.hash.for.user.a',
  firstName: 'Test',
  lastName: 'UserA',
  role: 'admin',
  outfitterId: OUTFITTER_ID_A
};

const userB = {
  id: 'test-user-b-102',
  email: 'userb@tenant-test.com',
  passwordHash: '$2b$12$test.hash.for.user.b',
  firstName: 'Test',
  lastName: 'UserB',
  role: 'admin',
  outfitterId: OUTFITTER_ID_B
};

// Helper function to create JWT tokens for test users
function createTestToken(user: typeof userA) {
  return jwt.sign({
    userId: user.id,
    email: user.email,
    role: user.role,
    outfitterId: user.outfitterId
  }, JWT_SECRET, { expiresIn: '1h' });
}

describe('Tenant Isolation Comprehensive Test Suite', () => {
  let tokenA: string;
  let tokenB: string;
  let experienceA1Id: number;
  let experienceA2Id: number;
  let experienceBId: number;
  let customerAId: number;
  let bookingA1Id: number;
  let bookingA2Id: number;
  let bookingBId: number;
  
  beforeAll(async () => {
    // Create test outfitters
    await storage.createOutfitter({ 
      id: OUTFITTER_ID_A,
      name: 'Test Outfitter A',
      email: 'outfitter-a@tenant-test.com',
      phone: '1111111111',
      address: 'Test Address A'
    });
    
    await storage.createOutfitter({ 
      id: OUTFITTER_ID_B,
      name: 'Test Outfitter B',
      email: 'outfitter-b@tenant-test.com',
      phone: '2222222222',
      address: 'Test Address B'
    });

    // Create test users
    await storage.createUserWithPassword(userA);
    await storage.createUserWithPassword(userB);

    // Generate JWT tokens for authenticated requests
    tokenA = createTestToken(userA);
    tokenB = createTestToken(userB);
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await db.delete(bookings);
    await db.delete(customers);
    await db.delete(experiences);
    
    // Create test experiences for Outfitter A
    const experienceA1 = await storage.createExperience({
      name: 'Experience A-Kayak Tour',
      description: 'Kayak tour for outfitter A',
      price: 150,
      duration: 180,
      capacity: 8,
      outfitterId: OUTFITTER_ID_A,
      locationId: 1
    });
    experienceA1Id = experienceA1.id;
    
    const experienceA2 = await storage.createExperience({
      name: 'Experience A-Hiking Trip',
      description: 'Hiking trip for outfitter A',
      price: 100,
      duration: 240,
      capacity: 12,
      outfitterId: OUTFITTER_ID_A,
      locationId: 1
    });
    experienceA2Id = experienceA2.id;

    // Create test experience for Outfitter B
    const experienceB = await storage.createExperience({
      name: 'Experience B-Cycling',
      description: 'Cycling tour for outfitter B',
      price: 200,
      duration: 120,
      capacity: 6,
      outfitterId: OUTFITTER_ID_B,
      locationId: 1
    });
    experienceBId = experienceB.id;

    // Create test customer for Outfitter A
    const customerA = await storage.createCustomer({
      firstName: 'Customer A-Jane',
      lastName: 'Doe',
      email: 'jane.doe@tenant-test.com',
      phone: '3333333333',
      outfitterId: OUTFITTER_ID_A
    });
    customerAId = customerA.id;

    // Create customer for Outfitter B for booking
    const customerB = await storage.createCustomer({
      firstName: 'Customer B-John',
      lastName: 'Smith',
      email: 'john.smith@tenant-test.com',
      phone: '4444444444',
      outfitterId: OUTFITTER_ID_B
    });

    // Create test bookings for Outfitter A
    const bookingA1 = await storage.createBooking({
      bookingNumber: 'Booking A-001',
      experienceId: experienceA1Id,
      customerId: customerAId,
      startDate: new Date('2025-07-01'),
      endDate: new Date('2025-07-02'),
      groupSize: 4,
      totalAmount: 600,
      status: 'confirmed',
      outfitterId: OUTFITTER_ID_A
    });
    bookingA1Id = bookingA1.id;

    const bookingA2 = await storage.createBooking({
      bookingNumber: 'Booking A-002',
      experienceId: experienceA2Id,
      customerId: customerAId,
      startDate: new Date('2025-07-03'),
      endDate: new Date('2025-07-04'),
      groupSize: 2,
      totalAmount: 200,
      status: 'pending',
      outfitterId: OUTFITTER_ID_A
    });
    bookingA2Id = bookingA2.id;

    // Create test booking for Outfitter B
    const bookingB = await storage.createBooking({
      bookingNumber: 'Booking B-001',
      experienceId: experienceBId,
      customerId: customerB.id,
      startDate: new Date('2025-07-05'),
      endDate: new Date('2025-07-06'),
      groupSize: 3,
      totalAmount: 600,
      status: 'confirmed',
      outfitterId: OUTFITTER_ID_B
    });
    bookingBId = bookingB.id;
  });

  afterAll(async () => {
    // Clean up all test data
    await db.delete(bookings);
    await db.delete(customers);
    await db.delete(experiences);
    await db.delete(users).where(eq(users.id, userA.id));
    await db.delete(users).where(eq(users.id, userB.id));
    await db.delete(outfitters).where(eq(outfitters.id, OUTFITTER_ID_A));
    await db.delete(outfitters).where(eq(outfitters.id, OUTFITTER_ID_B));
  });

  describe('TEST 1: Experience Listing - Authenticated User A', () => {
    it('should return only experiences belonging to outfitterIdA', async () => {
      const response = await request(app)
        .get('/api/experiences')
        .set('Cookie', `token=${tokenA}`)
        .expect(200);

      // Verify response contains only Outfitter A experiences
      expect(response.body).toHaveLength(2);
      
      const experienceNames = response.body.map(exp => exp.name);
      expect(experienceNames).toContain('Experience A-Kayak Tour');
      expect(experienceNames).toContain('Experience A-Hiking Trip');
      expect(experienceNames).not.toContain('Experience B-Cycling');
      
      // Verify all returned experiences have correct outfitterId
      response.body.forEach(exp => {
        expect(exp.outfitterId).toBe(OUTFITTER_ID_A);
      });
    });
  });

  describe('TEST 2: Experience Listing - Authenticated User B (Cross-Tenant Attempt)', () => {
    it('should return only experiences belonging to outfitterIdB despite query parameter attempt', async () => {
      const response = await request(app)
        .get(`/api/experiences?outfitterId=${OUTFITTER_ID_A}`) // Attempt to access Outfitter A data
        .set('Cookie', `token=${tokenB}`)
        .expect(200);

      // Verify response contains only Outfitter B experiences
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Experience B-Cycling');
      expect(response.body[0].outfitterId).toBe(OUTFITTER_ID_B);
      
      // Verify Outfitter A experiences are not returned
      const experienceNames = response.body.map(exp => exp.name);
      expect(experienceNames).not.toContain('Experience A-Kayak Tour');
      expect(experienceNames).not.toContain('Experience A-Hiking Trip');
    });
  });

  describe('TEST 3: Experience Listing - Unauthenticated User', () => {
    it('should reject unauthenticated requests appropriately', async () => {
      const response = await request(app)
        .get('/api/experiences');

      // Should return 401 Unauthorized for protected endpoint
      expect(response.status).toBe(401);
    });
  });

  describe('TEST 4: Customer Creation - Authenticated User A (OutfitterId Override Attempt)', () => {
    it('should enforce server-side outfitterId assignment despite client override attempt', async () => {
      const newCustomerData = {
        firstName: 'Override',
        lastName: 'Attempt',
        email: 'override@tenant-test.com',
        phone: '5555555555',
        outfitterId: 999 // Attempt to override with invalid ID
      };

      const response = await request(app)
        .post('/api/customers')
        .set('Cookie', `token=${tokenA}`)
        .send(newCustomerData)
        .expect(201);

      // Verify server-side enforcement overrode the client attempt
      expect(response.body.outfitterId).toBe(OUTFITTER_ID_A);
      expect(response.body.outfitterId).not.toBe(999);

      // Verify in database directly
      const dbCustomer = await storage.getCustomer(response.body.id);
      expect(dbCustomer?.outfitterId).toBe(OUTFITTER_ID_A);
      expect(dbCustomer?.outfitterId).not.toBe(999);
    });
  });

  describe('TEST 5: Booking Listing - Authenticated User A', () => {
    it('should return only bookings belonging to outfitterIdA', async () => {
      const response = await request(app)
        .get('/api/bookings')
        .set('Cookie', `token=${tokenA}`)
        .expect(200);

      // Verify response contains only Outfitter A bookings
      expect(response.body).toHaveLength(2);
      
      const bookingNumbers = response.body.map(booking => booking.bookingNumber);
      expect(bookingNumbers).toContain('Booking A-001');
      expect(bookingNumbers).toContain('Booking A-002');
      expect(bookingNumbers).not.toContain('Booking B-001');
      
      // Verify all returned bookings have correct outfitterId
      response.body.forEach(booking => {
        expect(booking.outfitterId).toBe(OUTFITTER_ID_A);
      });
    });
  });

  describe('TEST 6: Booking Listing - Authenticated User B (Cross-Tenant Attempt)', () => {
    it('should return only bookings belonging to outfitterIdB despite query parameter attempt', async () => {
      const response = await request(app)
        .get(`/api/bookings?outfitterId=${OUTFITTER_ID_A}`) // Attempt to access Outfitter A data
        .set('Cookie', `token=${tokenB}`)
        .expect(200);

      // Verify response contains only Outfitter B bookings
      expect(response.body).toHaveLength(1);
      expect(response.body[0].bookingNumber).toBe('Booking B-001');
      expect(response.body[0].outfitterId).toBe(OUTFITTER_ID_B);
      
      // Verify Outfitter A bookings are not returned
      const bookingNumbers = response.body.map(booking => booking.bookingNumber);
      expect(bookingNumbers).not.toContain('Booking A-001');
      expect(bookingNumbers).not.toContain('Booking A-002');
    });
  });
});