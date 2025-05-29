import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { storage } from '../server/storage';

// Test data
const testOutfitterId = 1;
const testAdminUser = {
  id: 'test-admin-123',
  email: 'admin@test.com',
  role: 'admin',
  outfitterId: testOutfitterId
};

const testGuideUser = {
  id: 'test-guide-456',
  email: 'guide@test.com',
  role: 'guide',
  outfitterId: testOutfitterId
};

// Mock authentication middleware to bypass actual auth
const mockAuthToken = 'test-auth-token';
let mockAuthenticatedUser = testAdminUser;

// Helper function to create auth headers
const authHeaders = (token: string = mockAuthToken) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
});

// Create test Express app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Mock authentication middleware
  app.use('/api/experiences', (req: any, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Mock authenticated user
    req.user = mockAuthenticatedUser;
    req.outfitterId = mockAuthenticatedUser.outfitterId;
    next();
  });

  // Simplified experiences routes for testing
  app.post('/api/experiences', async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      const experienceData = {
        ...req.body,
        outfitterId: req.outfitterId
      };
      
      const experience = await storage.createExperience(experienceData);
      res.status(201).json(experience);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put('/api/experiences/:id', async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      const experienceId = parseInt(req.params.id);
      const experience = await storage.updateExperience(experienceId, req.body, req.outfitterId);
      
      if (!experience) {
        return res.status(404).json({ message: 'Experience not found' });
      }
      
      res.json(experience);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return app;
};

describe('Experience Routes - Guide Assignment Integration Tests', () => {
  let testLocationId: number;
  let testExperienceId: number;
  let app: express.Application;

  beforeAll(async () => {
    // Setup test location for experiences
    const location = await storage.createLocation({
      name: 'Test Location',
      city: 'Test City',
      state: 'Test State',
      outfitterId: testOutfitterId
    });
    testLocationId = location.id;
  });

  beforeEach(() => {
    // Reset authenticated user to admin for each test
    mockAuthenticatedUser = testAdminUser;
    // Create fresh app instance for each test
    app = createTestApp();
  });

  afterEach(async () => {
    // Cleanup created experiences
    if (testExperienceId) {
      try {
        await storage.deleteExperience(testExperienceId);
      } catch (error) {
        // Experience might not exist, ignore cleanup errors
      }
    }
  });

  afterAll(async () => {
    // Cleanup test location
    if (testLocationId) {
      await storage.deleteLocation(testLocationId);
    }
  });

  describe('POST /api/experiences route', () => {
    describe('Test Case 3.1: Create experience with guideId', () => {
      it('should create experience with guide assignment', async () => {
        const experienceData = {
          name: 'Test Experience with Guide',
          description: 'Test Description',
          duration: 3,
          price: '500.00',
          capacity: 8,
          locationId: testLocationId,
          guideId: testGuideUser.id
        };

        const response = await request(app)
          .post('/api/experiences')
          .set(authHeaders())
          .send(experienceData);

        // Assertions
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.guideId).toBe(testGuideUser.id);
        expect(response.body.name).toBe(experienceData.name);

        testExperienceId = response.body.id;

        // Verify in database that experience_guides entry exists
        const guideAssignments = await storage.getExperienceGuides(testExperienceId);
        expect(guideAssignments).toHaveLength(1);
        expect(guideAssignments[0].guideId).toBe(testGuideUser.id);
        expect(guideAssignments[0].experienceId).toBe(testExperienceId);
      });
    });

    describe('Test Case 3.2: Create experience without guideId', () => {
      it('should create experience without guide assignment', async () => {
        const experienceData = {
          name: 'Test Experience without Guide',
          description: 'Test Description',
          duration: 3,
          price: '500.00',
          capacity: 8,
          locationId: testLocationId
          // No guideId
        };

        const response = await request(app)
          .post('/api/experiences')
          .set(authHeaders())
          .send(experienceData);

        // Assertions
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.guideId).toBeNull();
        expect(response.body.name).toBe(experienceData.name);

        testExperienceId = response.body.id;

        // Verify in database that no experience_guides entry exists
        const guideAssignments = await storage.getExperienceGuides(testExperienceId);
        expect(guideAssignments).toHaveLength(0);
      });
    });
  });

  describe('PUT /api/experiences/:id route', () => {
    beforeEach(async () => {
      // Create a test experience for each PUT test
      const experience = await storage.createExperience({
        name: 'Test Experience for Update',
        description: 'Test Description',
        duration: 3,
        price: '500.00',
        capacity: 8,
        locationId: testLocationId,
        outfitterId: testOutfitterId
      });
      testExperienceId = experience.id;
    });

    describe('Test Case 4.1: Update experience to assign a guideId', () => {
      it('should assign guide to experience', async () => {
        const updateData = { guideId: testGuideUser.id };

        const response = await request(app)
          .put(`/api/experiences/${testExperienceId}`)
          .set(authHeaders())
          .send(updateData);

        // Assertions
        expect(response.status).toBe(200);
        expect(response.body.guideId).toBe(testGuideUser.id);

        // Verify in database
        const updatedExperience = await storage.getExperience(testExperienceId);
        expect(updatedExperience?.guideId).toBe(testGuideUser.id);

        const guideAssignments = await storage.getExperienceGuides(testExperienceId);
        expect(guideAssignments).toHaveLength(1);
        expect(guideAssignments[0].guideId).toBe(testGuideUser.id);
      });
    });

    describe('Test Case 4.2: Update experience to change guideId', () => {
      it('should change guide assignment', async () => {
        // First assign a guide
        await storage.updateExperience(testExperienceId, { guideId: 'old-guide' }, testOutfitterId);

        const updateData = { guideId: testGuideUser.id };

        const response = await request(app)
          .put(`/api/experiences/${testExperienceId}`)
          .set(authHeaders())
          .send(updateData);

        // Assertions
        expect(response.status).toBe(200);
        expect(response.body.guideId).toBe(testGuideUser.id);

        // Verify in database that guide changed
        const guideAssignments = await storage.getExperienceGuides(testExperienceId);
        expect(guideAssignments).toHaveLength(1);
        expect(guideAssignments[0].guideId).toBe(testGuideUser.id);
      });
    });

    describe('Test Case 4.3: Update experience to remove guideId', () => {
      it('should remove guide assignment', async () => {
        // First assign a guide
        await storage.updateExperience(testExperienceId, { guideId: testGuideUser.id }, testOutfitterId);

        const updateData = { guideId: null };

        const response = await request(app)
          .put(`/api/experiences/${testExperienceId}`)
          .set(authHeaders())
          .send(updateData);

        // Assertions
        expect(response.status).toBe(200);
        expect(response.body.guideId).toBeNull();

        // Verify in database that guide assignment is removed
        const updatedExperience = await storage.getExperience(testExperienceId);
        expect(updatedExperience?.guideId).toBeNull();

        const guideAssignments = await storage.getExperienceGuides(testExperienceId);
        expect(guideAssignments).toHaveLength(0);
      });
    });

    describe('Test Case 4.4: Update other fields, guideId remains unchanged', () => {
      it('should update fields without affecting guide assignment', async () => {
        // First assign a guide
        await storage.updateExperience(testExperienceId, { guideId: testGuideUser.id }, testOutfitterId);

        const updateData = { name: 'Updated Experience Name' };

        const response = await request(app)
          .put(`/api/experiences/${testExperienceId}`)
          .set(authHeaders())
          .send(updateData);

        // Assertions
        expect(response.status).toBe(200);
        expect(response.body.name).toBe('Updated Experience Name');
        expect(response.body.guideId).toBe(testGuideUser.id);

        // Verify guide assignment remains unchanged
        const guideAssignments = await storage.getExperienceGuides(testExperienceId);
        expect(guideAssignments).toHaveLength(1);
        expect(guideAssignments[0].guideId).toBe(testGuideUser.id);
      });
    });

    describe('Test Case 4.5: Update non-existent experience', () => {
      it('should return 404 for non-existent experience', async () => {
        const response = await request(app)
          .put('/api/experiences/99999')
          .set(authHeaders())
          .send({ name: 'Updated Name' });

        expect(response.status).toBe(404);
      });
    });

    describe('Test Case 4.6: Update without authentication', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .put(`/api/experiences/${testExperienceId}`)
          .send({ name: 'Updated Name' });

        expect(response.status).toBe(401);
      });
    });

    describe('Test Case 4.7: Update by non-admin user', () => {
      it('should return 403 for non-admin user', async () => {
        // Mock non-admin user
        mockAuthenticatedUser = testGuideUser;

        const response = await request(app)
          .put(`/api/experiences/${testExperienceId}`)
          .set(authHeaders())
          .send({ name: 'Updated Name' });

        expect(response.status).toBe(403);
      });
    });

    describe('Test Case 4.8: Admin attempts to update experience belonging to another outfitter', () => {
      it('should return 404 for cross-tenant access attempt', async () => {
        // Create experience for different outfitter
        const otherOutfitterExperience = await storage.createExperience({
          name: 'Other Outfitter Experience',
          description: 'Test Description',
          duration: 3,
          price: '500.00',
          capacity: 8,
          locationId: testLocationId,
          outfitterId: 999 // Different outfitter
        });

        const response = await request(app)
          .put(`/api/experiences/${otherOutfitterExperience.id}`)
          .set(authHeaders())
          .send({ name: 'Hacked Name' });

        expect(response.status).toBe(404);

        // Cleanup
        await storage.deleteExperience(otherOutfitterExperience.id);
      });
    });
  });
});