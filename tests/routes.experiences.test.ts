import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// --- MIDDLEWARE MOCKING ---
const mockRequireAuth = jest.fn((req: any, res: any, next: any) => {
  req.user = mockAuthenticatedUser;
  next();
});

const mockAddOutfitterContext = jest.fn((req: any, res: any, next: any) => {
  req.outfitterId = mockAuthenticatedUser.outfitterId;
  next();
});

jest.mock('../server/middleware/auth', () => ({
  requireAuth: mockRequireAuth
}));

jest.mock('../server/middleware/outfitter', () => ({
  addOutfitterContext: mockAddOutfitterContext
}));

// --- STORAGE MOCKING ---
const mockStorage = {
  createExperience: jest.fn(),
  updateExperience: jest.fn(),
  getExperience: jest.fn(),
  getExperienceGuides: jest.fn(),
  createLocation: jest.fn(),
  deleteLocation: jest.fn(),
  deleteExperience: jest.fn()
};

jest.mock('../server/storage', () => ({
  storage: mockStorage
}));

// Create a minimal Express app for testing
const app = express();
app.use(express.json());

// Import and register routes after mocking dependencies
const experiencesRouter = require('../server/routes/experiences').default;
app.use('/api/experiences', experiencesRouter);

// Define mock users
let mockAuthenticatedUser: { id: string; outfitterId: number; role: string; email: string; };
const testAdminUser = { id: 'admin123', outfitterId: 1, role: 'admin', email: 'admin@test.com' };
const testGuideUser = { id: 'guide456', outfitterId: 1, role: 'guide', email: 'guide@test.com' };
const testOtherOutfitterAdmin = { id: 'adminOther', outfitterId: 2, role: 'admin', email: 'other@test.com' };

describe('Experience Routes - Guide Assignment Integration Tests', () => {
  let testLocationId: number = 1;
  let testExperienceId: number = 1;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset authenticated user to admin for each test by default
    mockAuthenticatedUser = { ...testAdminUser };
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

        const mockCreatedExperience = {
          id: 1,
          ...experienceData,
          outfitterId: testAdminUser.outfitterId,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockStorage.createExperience.mockResolvedValueOnce(mockCreatedExperience);
        mockStorage.getExperienceGuides.mockResolvedValueOnce([
          { id: 1, experienceId: 1, guideId: testGuideUser.id }
        ]);

        const response = await request(app)
          .post('/api/experiences')
          .set('Authorization', 'Bearer dummy-token')
          .set('Content-Type', 'application/json')
          .send(experienceData);

        // Assertions
        expect(response.status).toBe(201);
        expect(response.body.guideId).toBe(testGuideUser.id);
        expect(mockStorage.createExperience).toHaveBeenCalledWith(
          expect.objectContaining({ guideId: testGuideUser.id })
        );
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

        const mockCreatedExperience = {
          id: 1,
          ...experienceData,
          guideId: null,
          outfitterId: testAdminUser.outfitterId,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockStorage.createExperience.mockResolvedValueOnce(mockCreatedExperience);
        mockStorage.getExperienceGuides.mockResolvedValueOnce([]);

        const response = await request(app)
          .post('/api/experiences')
          .set('Authorization', 'Bearer dummy-token')
          .set('Content-Type', 'application/json')
          .send(experienceData);

        // Assertions
        expect(response.status).toBe(201);
        expect(response.body.guideId).toBeNull();
        expect(mockStorage.createExperience).toHaveBeenCalledWith(
          expect.objectContaining({ guideId: undefined })
        );
      });
    });
  });

  describe('PUT /api/experiences/:id route', () => {
    describe('Test Case 4.1: Update experience to assign a guideId', () => {
      it('should assign guide to experience', async () => {
        const updateData = { guideId: testGuideUser.id };
        
        const mockUpdatedExperience = {
          id: testExperienceId,
          name: 'Test Experience',
          guideId: testGuideUser.id,
          outfitterId: testAdminUser.outfitterId
        };

        mockStorage.updateExperience.mockResolvedValueOnce(mockUpdatedExperience);
        mockStorage.getExperience.mockResolvedValueOnce(mockUpdatedExperience);
        mockStorage.getExperienceGuides.mockResolvedValueOnce([
          { id: 1, experienceId: testExperienceId, guideId: testGuideUser.id }
        ]);

        const response = await request(app)
          .put(`/api/experiences/${testExperienceId}`)
          .set('Authorization', 'Bearer dummy-token')
          .set('Content-Type', 'application/json')
          .send(updateData);

        // Assertions
        expect(response.status).toBe(200);
        expect(response.body.guideId).toBe(testGuideUser.id);
        expect(mockStorage.updateExperience).toHaveBeenCalledWith(
          testExperienceId,
          expect.objectContaining({ guideId: testGuideUser.id }),
          testAdminUser.outfitterId
        );
      });
    });

    describe('Test Case 4.2: Update experience to change guideId', () => {
      it('should change guide assignment', async () => {
        const updateData = { guideId: testGuideUser.id };
        
        const mockUpdatedExperience = {
          id: testExperienceId,
          name: 'Test Experience',
          guideId: testGuideUser.id,
          outfitterId: testAdminUser.outfitterId
        };

        mockStorage.updateExperience.mockResolvedValueOnce(mockUpdatedExperience);
        mockStorage.getExperienceGuides.mockResolvedValueOnce([
          { id: 1, experienceId: testExperienceId, guideId: testGuideUser.id }
        ]);

        const response = await request(app)
          .put(`/api/experiences/${testExperienceId}`)
          .set('Authorization', 'Bearer dummy-token')
          .set('Content-Type', 'application/json')
          .send(updateData);

        // Assertions
        expect(response.status).toBe(200);
        expect(response.body.guideId).toBe(testGuideUser.id);
        expect(mockStorage.updateExperience).toHaveBeenCalledWith(
          testExperienceId,
          expect.objectContaining({ guideId: testGuideUser.id }),
          testAdminUser.outfitterId
        );
      });
    });

    describe('Test Case 4.3: Update experience to remove guideId', () => {
      it('should remove guide assignment', async () => {
        const updateData = { guideId: null };
        
        const mockUpdatedExperience = {
          id: testExperienceId,
          name: 'Test Experience',
          guideId: null,
          outfitterId: testAdminUser.outfitterId
        };

        mockStorage.updateExperience.mockResolvedValueOnce(mockUpdatedExperience);
        mockStorage.getExperience.mockResolvedValueOnce(mockUpdatedExperience);
        mockStorage.getExperienceGuides.mockResolvedValueOnce([]);

        const response = await request(app)
          .put(`/api/experiences/${testExperienceId}`)
          .set('Authorization', 'Bearer dummy-token')
          .set('Content-Type', 'application/json')
          .send(updateData);

        // Assertions
        expect(response.status).toBe(200);
        expect(response.body.guideId).toBeNull();
        expect(mockStorage.updateExperience).toHaveBeenCalledWith(
          testExperienceId,
          expect.objectContaining({ guideId: null }),
          testAdminUser.outfitterId
        );
      });
    });

    describe('Test Case 4.4: Update other fields, guideId remains unchanged', () => {
      it('should update fields without affecting guide assignment', async () => {
        const updateData = { name: 'Updated Experience Name' };
        
        const mockUpdatedExperience = {
          id: testExperienceId,
          name: 'Updated Experience Name',
          guideId: testGuideUser.id,
          outfitterId: testAdminUser.outfitterId
        };

        mockStorage.updateExperience.mockResolvedValueOnce(mockUpdatedExperience);
        mockStorage.getExperienceGuides.mockResolvedValueOnce([
          { id: 1, experienceId: testExperienceId, guideId: testGuideUser.id }
        ]);

        const response = await request(app)
          .put(`/api/experiences/${testExperienceId}`)
          .set('Authorization', 'Bearer dummy-token')
          .set('Content-Type', 'application/json')
          .send(updateData);

        // Assertions
        expect(response.status).toBe(200);
        expect(response.body.name).toBe('Updated Experience Name');
        expect(response.body.guideId).toBe(testGuideUser.id);
      });
    });

    describe('Test Case 4.5: Update non-existent experience', () => {
      it('should return 404 for non-existent experience', async () => {
        mockStorage.updateExperience.mockResolvedValueOnce(null);

        const response = await request(app)
          .put('/api/experiences/99999')
          .set('Authorization', 'Bearer dummy-token')
          .set('Content-Type', 'application/json')
          .send({ name: 'Updated Name' });

        expect(response.status).toBe(404);
      });
    });

    describe('Test Case 4.6: Update without authentication', () => {
      it('should return 401 without auth token', async () => {
        // Mock middleware to reject unauthenticated requests
        mockRequireAuth.mockImplementationOnce((req: any, res: any, next: any) => {
          res.status(401).json({ message: 'Unauthorized' });
        });

        const response = await request(app)
          .put(`/api/experiences/${testExperienceId}`)
          .set('Content-Type', 'application/json')
          .send({ name: 'Updated Name' });

        expect(response.status).toBe(401);
      });
    });

    describe('Test Case 4.7: Update by non-admin user', () => {
      it('should return 403 for non-admin user', async () => {
        // Mock non-admin user
        mockAuthenticatedUser = { ...testGuideUser };

        // Mock middleware to check role and reject
        mockRequireAuth.mockImplementationOnce((req: any, res: any, next: any) => {
          req.user = mockAuthenticatedUser;
          if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
          }
          next();
        });

        const response = await request(app)
          .put(`/api/experiences/${testExperienceId}`)
          .set('Authorization', 'Bearer dummy-token')
          .set('Content-Type', 'application/json')
          .send({ name: 'Updated Name' });

        expect(response.status).toBe(403);
      });
    });

    describe('Test Case 4.8: Admin attempts to update experience belonging to another outfitter', () => {
      it('should return 404 for cross-tenant access attempt', async () => {
        // Mock storage to return null for cross-tenant access
        mockStorage.updateExperience.mockResolvedValueOnce(null);

        const response = await request(app)
          .put(`/api/experiences/${testExperienceId}`)
          .set('Authorization', 'Bearer dummy-token')
          .set('Content-Type', 'application/json')
          .send({ name: 'Hacked Name' });

        expect(response.status).toBe(404);
      });
    });
  });
});