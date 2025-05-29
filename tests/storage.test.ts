import { describe, it, expect, beforeEach, afterEach, jest, beforeAll, afterAll } from '@jest/globals';
import { DatabaseStorage } from '../server/storage';

describe('DatabaseStorage - Experience Guide Assignment Tests', () => {
  let storage: DatabaseStorage;

  beforeAll(() => {
    // Setup storage instance
    storage = new DatabaseStorage();
  });

  beforeEach(() => {
    // Reset any mocks
    jest.clearAllMocks();
  });

  describe('createExperience function', () => {
    describe('Test Case 1.1: When guideId is provided', () => {
      it('should create experience and guide assignment', async () => {
        const experienceData = {
          name: 'Test Experience',
          description: 'Test Description',
          duration: 3,
          price: '500.00',
          capacity: 8,
          locationId: 1,
          outfitterId: 1,
          guideId: 'guide-123'
        };

        // Action
        const result = await storage.createExperience(experienceData);

        // Assertions
        expect(result).toBeDefined();
        expect(result.name).toBe(experienceData.name);
        expect(result.description).toBe(experienceData.description);
        expect(result.guideId).toBe(experienceData.guideId);

        // Clean up
        if (result.id) {
          await storage.deleteExperience(result.id);
        }
      });
    });

    describe('Test Case 1.2: When guideId is NOT provided', () => {
      it('should create experience without guide assignment', async () => {
        const experienceData = {
          name: 'Test Experience No Guide',
          description: 'Test Description',
          duration: 3,
          price: '500.00',
          capacity: 8,
          locationId: 1,
          outfitterId: 1
          // No guideId
        };

        // Action
        const result = await storage.createExperience(experienceData);

        // Assertions
        expect(result).toBeDefined();
        expect(result.name).toBe(experienceData.name);
        expect(result.guideId).toBeNull();

        // Verify no guide assignments
        const guideAssignments = await storage.getExperienceGuides(result.id);
        expect(guideAssignments).toHaveLength(0);

        // Clean up
        if (result.id) {
          await storage.deleteExperience(result.id);
        }
      });
    });
  });

  describe('updateExperience function', () => {
    let testExperienceId: number;
    const testOutfitterId = 1;

    beforeEach(async () => {
      // Create a test experience for each updateExperience test
      const experience = await storage.createExperience({
        name: 'Test Experience for Update',
        description: 'Test Description',
        duration: 3,
        price: '500.00',
        capacity: 8,
        locationId: 1,
        outfitterId: testOutfitterId
      });
      testExperienceId = experience.id;
    });

    afterEach(async () => {
      // Cleanup after each test
      if (testExperienceId) {
        await storage.deleteExperience(testExperienceId);
      }
    });

    describe('Test Case 2.1: Update experience details only (no change to guideId)', () => {
      it('should update experience without affecting guide assignments', async () => {
        const updateData = { name: 'Updated Name', description: 'Updated Description' };
        
        const result = await storage.updateExperience(testExperienceId, updateData, testOutfitterId);

        expect(result).toBeDefined();
        expect(result?.name).toBe('Updated Name');
        expect(result?.description).toBe('Updated Description');
      });
    });

    describe('Test Case 2.2: Assign a guideId to an experience that previously had none', () => {
      it('should assign new guide to experience', async () => {
        const updateData = { guideId: 'new-guide-456' };

        const result = await storage.updateExperience(testExperienceId, updateData, testOutfitterId);

        expect(result).toBeDefined();
        expect(result?.guideId).toBe('new-guide-456');

        // Verify guide assignment was created
        const guideAssignments = await storage.getExperienceGuides(testExperienceId);
        expect(guideAssignments).toHaveLength(1);
        expect(guideAssignments[0].guideId).toBe('new-guide-456');
      });
    });

    describe('Test Case 2.3: Change guideId on an experience', () => {
      it('should change guide assignment', async () => {
        // First assign a guide
        await storage.updateExperience(testExperienceId, { guideId: 'old-guide' }, testOutfitterId);

        // Then change it
        const updateData = { guideId: 'new-guide-789' };
        const result = await storage.updateExperience(testExperienceId, updateData, testOutfitterId);

        expect(result).toBeDefined();
        expect(result?.guideId).toBe('new-guide-789');

        // Verify guide assignment changed
        const guideAssignments = await storage.getExperienceGuides(testExperienceId);
        expect(guideAssignments).toHaveLength(1);
        expect(guideAssignments[0].guideId).toBe('new-guide-789');
      });
    });

    describe('Test Case 2.4: Remove/unassign guideId (set to null)', () => {
      it('should remove guide assignment', async () => {
        // First assign a guide
        await storage.updateExperience(testExperienceId, { guideId: 'test-guide' }, testOutfitterId);

        // Then remove it
        const updateData = { guideId: null };
        const result = await storage.updateExperience(testExperienceId, updateData, testOutfitterId);

        expect(result).toBeDefined();
        expect(result?.guideId).toBeNull();

        // Verify guide assignment was removed
        const guideAssignments = await storage.getExperienceGuides(testExperienceId);
        expect(guideAssignments).toHaveLength(0);
      });
    });

    describe('Test Case 2.5: Attempt to update an experience belonging to a different outfitterId', () => {
      it('should return null when outfitterId does not match', async () => {
        const result = await storage.updateExperience(testExperienceId, { name: 'Test' }, 999);

        expect(result).toBeNull();
      });
    });

    describe('Test Case 2.6: Attempt to update a non-existent experience', () => {
      it('should return null when experience does not exist', async () => {
        const result = await storage.updateExperience(99999, { name: 'Test' }, testOutfitterId);

        expect(result).toBeNull();
      });
    });
  });
});